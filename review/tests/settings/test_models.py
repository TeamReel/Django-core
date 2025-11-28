"""
Model tests for Settings & Feature Flags system.

Tests database models, constraints, validation, and relationships.
"""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model

from src.settings.models import FeatureFlag, Setting, ScopeType, SettingType

User = get_user_model()


class TestFeatureFlagModel:
    """Test FeatureFlag model constraints and behavior."""

    def test_unique_constraint_same_scope(self, test_user, test_organisation, test_project):
        """Test unique constraint prevents duplicate keys in same scope."""
        # Create initial flag
        FeatureFlag.objects.create(
            key="test_flag", scope_type=ScopeType.GLOBAL, created_by=test_user
        )

        # Attempt to create duplicate should fail
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                FeatureFlag.objects.create(
                    key="test_flag", scope_type=ScopeType.GLOBAL, created_by=test_user
                )

    def test_unique_constraint_different_scopes(self, test_user, test_organisation, test_project):
        """Test same key allowed in different scopes."""
        # Global scope
        FeatureFlag.objects.create(
            key="multi_scope_flag", scope_type=ScopeType.GLOBAL, created_by=test_user
        )

        # Organisation scope (should succeed)
        FeatureFlag.objects.create(
            key="multi_scope_flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=test_organisation,
            created_by=test_user,
        )

        # Project scope (should succeed)
        FeatureFlag.objects.create(
            key="multi_scope_flag",
            scope_type=ScopeType.PROJECT,
            organisation=test_organisation,
            project=test_project,
            created_by=test_user,
        )

        assert FeatureFlag.objects.filter(key="multi_scope_flag").count() == 3

    def test_check_constraint_organisation_scope(self, test_user, test_organisation):
        """Test organisation scope requires organisation field."""
        # Valid organisation scope
        flag = FeatureFlag.objects.create(
            key="org_flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=test_organisation,
            created_by=test_user,
        )
        assert flag.organisation == test_organisation

    def test_check_constraint_project_scope(self, test_user, test_organisation, test_project):
        """Test project scope requires both organisation and project fields."""
        # Valid project scope
        flag = FeatureFlag.objects.create(
            key="project_flag",
            scope_type=ScopeType.PROJECT,
            organisation=test_organisation,
            project=test_project,
            created_by=test_user,
        )
        assert flag.organisation == test_organisation
        assert flag.project == test_project

    def test_default_values(self, test_user):
        """Test model default values."""
        flag = FeatureFlag.objects.create(
            key="default_test", scope_type=ScopeType.GLOBAL, created_by=test_user
        )

        assert flag.enabled is False  # Deny-by-default
        assert flag.description == ""
        assert flag.created_at is not None
        assert flag.updated_at is not None

    def test_string_representation(self, test_user):
        """Test model string representation."""
        flag = FeatureFlag.objects.create(
            key="repr_test", scope_type=ScopeType.GLOBAL, created_by=test_user
        )

        expected = f"FeatureFlag(key='repr_test', scope=GLOBAL, enabled=False)"
        assert str(flag) == expected

    def test_created_updated_timestamps(self, test_user):
        """Test automatic timestamp management."""
        flag = FeatureFlag.objects.create(
            key="timestamp_test", scope_type=ScopeType.GLOBAL, created_by=test_user
        )

        created_at = flag.created_at
        updated_at = flag.updated_at

        # Update the flag
        flag.enabled = True
        flag.save()

        # created_at should not change, updated_at should change
        flag.refresh_from_db()
        assert flag.created_at == created_at
        assert flag.updated_at > updated_at


class TestSettingModel:
    """Test Setting model constraints and behavior."""

    def test_unique_constraint_same_scope(self, test_user):
        """Test unique constraint prevents duplicate keys in same scope."""
        # Create initial setting
        Setting.objects.create(
            key="test_setting",
            value="value1",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=test_user,
        )

        # Attempt to create duplicate should fail
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                Setting.objects.create(
                    key="test_setting",
                    value="value2",
                    value_type=SettingType.STRING,
                    scope_type=ScopeType.GLOBAL,
                    created_by=test_user,
                )

    def test_different_value_types(self, test_user):
        """Test all supported value types."""
        # String
        string_setting = Setting.objects.create(
            key="string_test",
            value="test_value",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=test_user,
        )
        assert string_setting.value == "test_value"

        # Integer
        int_setting = Setting.objects.create(
            key="int_test",
            value="42",
            value_type=SettingType.INTEGER,
            scope_type=ScopeType.GLOBAL,
            created_by=test_user,
        )
        assert int_setting.value == "42"

        # Boolean
        bool_setting = Setting.objects.create(
            key="bool_test",
            value="true",
            value_type=SettingType.BOOLEAN,
            scope_type=ScopeType.GLOBAL,
            created_by=test_user,
        )
        assert bool_setting.value == "true"

        # JSON
        json_setting = Setting.objects.create(
            key="json_test",
            value='{"key": "value"}',
            value_type=SettingType.JSON,
            scope_type=ScopeType.GLOBAL,
            created_by=test_user,
        )
        assert json_setting.value == '{"key": "value"}'

    def test_default_value_field(self, test_user):
        """Test default_value field behavior."""
        setting = Setting.objects.create(
            key="default_test",
            value="current",
            default_value="fallback",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=test_user,
        )

        assert setting.value == "current"
        assert setting.default_value == "fallback"

    def test_relationship_integrity(self, test_user, test_organisation, test_project):
        """Test foreign key relationships work correctly."""
        setting = Setting.objects.create(
            key="relationship_test",
            value="test",
            value_type=SettingType.STRING,
            scope_type=ScopeType.PROJECT,
            organisation=test_organisation,
            project=test_project,
            created_by=test_user,
        )

        # Test relationships are properly set
        assert setting.organisation == test_organisation
        assert setting.project == test_project
        assert setting.created_by == test_user

        # Test reverse relationships
        assert setting in test_organisation.settings.all()
        assert setting in test_project.settings.all()

    def test_cascade_deletion(self, test_user, test_organisation, test_project):
        """Test cascade behavior when related objects are deleted."""
        setting = Setting.objects.create(
            key="cascade_test",
            value="test",
            value_type=SettingType.STRING,
            scope_type=ScopeType.PROJECT,
            organisation=test_organisation,
            project=test_project,
            created_by=test_user,
        )

        setting_id = setting.id

        # Delete project should cascade to setting
        test_project.delete()

        assert not Setting.objects.filter(id=setting_id).exists()


class TestScopeTypeChoices:
    """Test ScopeType enumeration."""

    def test_all_scope_types_available(self):
        """Test all expected scope types are available."""
        assert ScopeType.GLOBAL == "GLOBAL"
        assert ScopeType.ORGANISATION == "ORGANISATION"
        assert ScopeType.PROJECT == "PROJECT"

        # Test choices structure
        choices = dict(ScopeType.choices)
        assert "GLOBAL" in choices
        assert "ORGANISATION" in choices
        assert "PROJECT" in choices


class TestSettingTypeChoices:
    """Test SettingType enumeration."""

    def test_all_setting_types_available(self):
        """Test all expected setting types are available."""
        assert SettingType.STRING == "STRING"
        assert SettingType.INTEGER == "INTEGER"
        assert SettingType.BOOLEAN == "BOOLEAN"
        assert SettingType.JSON == "JSON"

        # Test choices structure
        choices = dict(SettingType.choices)
        assert "STRING" in choices
        assert "INTEGER" in choices
        assert "BOOLEAN" in choices
        assert "JSON" in choices
