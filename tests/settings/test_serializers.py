"""
Serializer tests for Settings & Feature Flags system.

Tests Django REST Framework serializers validation and data handling.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from organisations.models import Organisation
from projects.models import Project

from src.settings.models import FeatureFlag, ScopeType, Setting, SettingType
from src.settings.serializers import (
    FeatureFlagResolveSerializer,
    FeatureFlagSerializer,
    SettingResolveSerializer,
    SettingSerializer,
)

User = get_user_model()


class TestFeatureFlagSerializer(TestCase):
    """Test FeatureFlag serializer functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_global_flag_serialization(self):
        """Test serializing global feature flag."""
        flag = FeatureFlag.objects.create(
            key="global_flag",
            description="A global flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        self.assertEqual(data["key"], "global_flag")
        self.assertEqual(data["description"], "A global flag")
        self.assertEqual(data["scope_type"], ScopeType.GLOBAL.value)
        self.assertTrue(data["enabled"])
        self.assertIsNone(data["organisation"])
        self.assertIsNone(data["project"])

    def test_organisation_flag_serialization(self):
        """Test serializing organisation-scoped flag."""
        flag = FeatureFlag.objects.create(
            key="org_flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            enabled=False,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        self.assertEqual(data["scope_type"], ScopeType.ORGANISATION.value)
        self.assertEqual(data["organisation"], self.organisation.id)
        self.assertIsNone(data["project"])
        self.assertFalse(data["enabled"])

    def test_project_flag_serialization(self):
        """Test serializing project-scoped flag."""
        flag = FeatureFlag.objects.create(
            key="project_flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            enabled=True,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        self.assertEqual(data["scope_type"], ScopeType.PROJECT.value)
        self.assertEqual(data["organisation"], self.organisation.id)
        self.assertEqual(data["project"], self.project.id)

    def test_valid_flag_deserialization(self):
        """Test deserializing valid flag data."""
        data = {
            "key": "new_flag",
            "description": "A new flag",
            "scope_type": ScopeType.GLOBAL.value,
            "enabled": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        flag = serializer.save(created_by=self.user)
        self.assertEqual(flag.key, "new_flag")
        self.assertEqual(flag.scope_type, ScopeType.GLOBAL)
        self.assertTrue(flag.enabled)

    def test_key_validation_invalid_characters(self):
        """Test flag key validation rejects invalid characters."""
        data = {
            "key": "invalid-key!",
            "scope_type": ScopeType.GLOBAL.value,
            "enabled": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("key", serializer.errors)

    def test_key_validation_too_short(self):
        """Test flag key validation rejects too short keys."""
        data = {
            "key": "a",  # Less than 2 characters
            "scope_type": ScopeType.GLOBAL.value,
            "enabled": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("key", serializer.errors)

    def test_valid_key_with_underscores(self):
        """Test flag key validation accepts underscores."""
        data = {
            "key": "valid_key_123",
            "scope_type": ScopeType.GLOBAL.value,
            "enabled": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_scope_validation_organisation_missing(self):
        """Test validation when organisation scope missing organisation."""
        data = {
            "key": "org_flag",
            "scope_type": ScopeType.ORGANISATION.value,
            "enabled": True,
            # Missing organisation field
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_scope_validation_project_missing_project(self):
        """Test validation when project scope missing project."""
        data = {
            "key": "project_flag",
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            "enabled": True,
            # Missing project field
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_scope_validation_global_with_organisation_fails(self):
        """Test global scope with organisation fails validation."""
        data = {
            "key": "global_flag",
            "scope_type": ScopeType.GLOBAL.value,
            "organisation": self.organisation.id,  # Should not have org
            "enabled": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_read_only_fields_not_updated(self):
        """Test read-only fields are not updated."""
        flag = FeatureFlag.objects.create(
            key="readonly_flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.user,
        )
        original_created_at = flag.created_at

        data = {
            "description": "Updated Description",
            "created_at": "2020-01-01T00:00:00Z",  # Try to update read-only field
        }

        serializer = FeatureFlagSerializer(flag, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        updated_flag = serializer.save()
        self.assertEqual(updated_flag.description, "Updated Description")
        self.assertEqual(updated_flag.created_at, original_created_at)  # Unchanged


class TestSettingSerializer(TestCase):
    """Test Setting serializer functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_string_setting_serialization(self):
        """Test serializing string setting."""
        setting = Setting.objects.create(
            key="string_setting",
            value="current_value",
            value_type=SettingType.STRING,
            default_value="default_value",
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["key"], "string_setting")
        self.assertEqual(data["value_type"], SettingType.STRING.value)
        self.assertEqual(data["value"], "current_value")
        self.assertEqual(data["default_value"], "default_value")

    def test_integer_setting_serialization(self):
        """Test serializing integer setting."""
        setting = Setting.objects.create(
            key="int_setting",
            value=42,
            value_type=SettingType.INTEGER,
            default_value=0,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["value_type"], SettingType.INTEGER.value)
        self.assertEqual(data["value"], 42)
        self.assertEqual(data["default_value"], 0)

    def test_boolean_setting_serialization(self):
        """Test serializing boolean setting."""
        setting = Setting.objects.create(
            key="bool_setting",
            value=True,
            value_type=SettingType.BOOLEAN,
            default_value=False,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["value_type"], SettingType.BOOLEAN.value)
        self.assertTrue(data["value"])
        self.assertFalse(data["default_value"])

    def test_json_setting_serialization(self):
        """Test serializing JSON setting."""
        json_value = {"config": {"timeout": 30, "retries": 3}}
        setting = Setting.objects.create(
            key="json_setting",
            value=json_value,
            value_type=SettingType.JSON,
            default_value={"default": True},
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["value_type"], SettingType.JSON.value)
        self.assertEqual(data["value"], json_value)

    def test_valid_setting_deserialization(self):
        """Test deserializing valid setting data."""
        data = {
            "key": "new_setting",
            "value": "test",
            "value_type": SettingType.STRING.value,
            "default_value": "default",
            "scope_type": ScopeType.GLOBAL.value,
        }

        serializer = SettingSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        setting = serializer.save(created_by=self.user)
        self.assertEqual(setting.key, "new_setting")
        self.assertEqual(setting.value, "test")
        self.assertEqual(setting.default_value, "default")

    def test_key_validation_invalid_characters(self):
        """Test setting key validation rejects invalid characters."""
        data = {
            "key": "invalid-key!",
            "value": "test",
            "value_type": SettingType.STRING.value,
            "default_value": "default",
            "scope_type": ScopeType.GLOBAL.value,
        }

        serializer = SettingSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("key", serializer.errors)

    def test_default_value_required(self):
        """Test default_value is required."""
        data = {
            "key": "test_setting",
            "value": "test",
            "value_type": SettingType.STRING.value,
            "scope_type": ScopeType.GLOBAL.value,
            # Missing default_value
        }

        serializer = SettingSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("default_value", serializer.errors)

    def test_scope_validation_organisation_missing(self):
        """Test validation when organisation scope missing organisation."""
        data = {
            "key": "org_setting",
            "value": "test",
            "value_type": SettingType.STRING.value,
            "default_value": "default",
            "scope_type": ScopeType.ORGANISATION.value,
            # Missing organisation
        }

        serializer = SettingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_scope_validation_project_requires_project(self):
        """Test project scope requires project."""
        data = {
            "key": "project_setting",
            "value": "test",
            "value_type": SettingType.STRING.value,
            "default_value": "default",
            "scope_type": ScopeType.PROJECT.value,
            "organisation": self.organisation.id,
            # Missing project
        }

        serializer = SettingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_organisation_scoped_setting_serialization(self):
        """Test serializing organisation-scoped setting."""
        setting = Setting.objects.create(
            key="org_setting",
            value="org_value",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["scope_type"], ScopeType.ORGANISATION.value)
        self.assertEqual(data["organisation"], self.organisation.id)

    def test_project_scoped_setting_serialization(self):
        """Test serializing project-scoped setting."""
        setting = Setting.objects.create(
            key="project_setting",
            value="project_value",
            value_type=SettingType.STRING,
            default_value="default",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["scope_type"], ScopeType.PROJECT.value)
        self.assertEqual(data["organisation"], self.organisation.id)
        self.assertEqual(data["project"], self.project.id)


class TestFeatureFlagResolveSerializer(TestCase):
    """Test FeatureFlagResolveSerializer."""

    def test_serialization(self):
        """Test resolve serializer data structure."""
        data = {
            "key": "test_flag",
            "value": True,
            "scope_used": "global",
            "scope_id": None,
        }

        serializer = FeatureFlagResolveSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.data["key"], "test_flag")
        self.assertTrue(serializer.data["value"])

    def test_with_scope_id(self):
        """Test resolve serializer with scope_id."""
        data = {
            "key": "org_flag",
            "value": False,
            "scope_used": "organisation",
            "scope_id": "123",
        }

        serializer = FeatureFlagResolveSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.data["scope_id"], "123")


class TestSettingResolveSerializer(TestCase):
    """Test SettingResolveSerializer."""

    def test_serialization(self):
        """Test resolve serializer data structure."""
        data = {
            "key": "test_setting",
            "value": {"some": "json"},
            "scope_used": "global",
            "scope_id": None,
        }

        serializer = SettingResolveSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.data["key"], "test_setting")
        self.assertEqual(serializer.data["value"], {"some": "json"})

    def test_with_string_value(self):
        """Test resolve serializer with string value."""
        data = {
            "key": "string_setting",
            "value": "test_value",
            "scope_used": "project",
            "scope_id": "456",
        }

        serializer = SettingResolveSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.data["value"], "test_value")
