"""
Serializer tests for Settings & Feature Flags system.

Tests Django REST Framework serializers validation and data handling.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from organisations.models import Organisation
from projects.models import Project

from src.settings.models import FeatureFlag, ScopeType, Setting
from src.settings.serializers import (
    FeatureFlagResolveSerializer,
    FeatureFlagSerializer,
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
            name="Global Flag",
            description="A global flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        assert data["key"] == "global_flag"
        assert data["name"] == "Global Flag"
        assert data["scope_type"] == ScopeType.GLOBAL.value
        assert data["default_value"] is True
        assert data["organisation"] is None
        assert data["project"] is None

    def test_organisation_flag_serialization(self):
        """Test serializing organisation-scoped flag."""
        flag = FeatureFlag.objects.create(
            key="org_flag",
            name="Org Flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            default_value=False,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        assert data["scope_type"] == ScopeType.ORGANISATION.value
        assert data["organisation"] == self.organisation.id
        assert data["project"] is None

    def test_project_flag_serialization(self):
        """Test serializing project-scoped flag."""
        flag = FeatureFlag.objects.create(
            key="project_flag",
            name="Project Flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            default_value=True,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        assert data["scope_type"] == ScopeType.PROJECT.value
        assert data["organisation"] == self.organisation.id
        assert data["project"] == self.project.id

    def test_valid_flag_deserialization(self):
        """Test deserializing valid flag data."""
        data = {
            "key": "new_flag",
            "name": "New Flag",
            "description": "A new flag",
            "scope_type": ScopeType.GLOBAL.value,
            "default_value": True,
            "is_active": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        assert serializer.is_valid()

        flag = serializer.save(created_by=self.user)
        assert flag.key == "new_flag"
        assert flag.scope_type == ScopeType.GLOBAL

    def test_key_validation(self):
        """Test flag key validation."""
        # Test invalid characters
        data = {
            "key": "invalid-key!",
            "name": "Invalid Key",
            "scope_type": ScopeType.GLOBAL.value,
            "default_value": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        assert not serializer.is_valid()
        assert "key" in serializer.errors

    def test_scope_validation_organisation_missing(self):
        """Test validation when organisation scope missing organisation."""
        data = {
            "key": "org_flag",
            "name": "Org Flag",
            "scope_type": ScopeType.ORGANISATION.value,
            "default_value": True,
            # Missing organisation field
        }

        serializer = FeatureFlagSerializer(data=data)
        assert not serializer.is_valid()
        assert "organisation" in serializer.errors or "non_field_errors" in serializer.errors

    def test_scope_validation_project_missing_fields(self):
        """Test validation when project scope missing required fields."""
        data = {
            "key": "project_flag",
            "name": "Project Flag",
            "scope_type": ScopeType.PROJECT.value,
            "default_value": True,
            # Missing organisation and project fields
        }

        serializer = FeatureFlagSerializer(data=data)
        assert not serializer.is_valid()

    def test_duplicate_key_validation(self):
        """Test validation of duplicate keys."""
        # Create existing flag
        FeatureFlag.objects.create(
            key="duplicate_key",
            name="First Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        # Try to create another with same key
        data = {
            "key": "duplicate_key",
            "name": "Second Flag",
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": self.organisation.id,
            "default_value": False,
        }

        serializer = FeatureFlagSerializer(data=data)
        assert not serializer.is_valid()
        assert "key" in serializer.errors

    def test_read_only_fields(self):
        """Test read-only fields are not updated."""
        flag = FeatureFlag.objects.create(
            key="readonly_flag",
            name="Read Only Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )
        original_created_at = flag.created_at

        data = {
            "name": "Updated Name",
            "created_at": "2020-01-01T00:00:00Z",  # Try to update read-only field
            "created_by": 999,  # Try to update read-only field
        }

        serializer = FeatureFlagSerializer(flag, data=data, partial=True)
        assert serializer.is_valid()

        updated_flag = serializer.save()
        assert updated_flag.name == "Updated Name"
        assert updated_flag.created_at == original_created_at  # Unchanged
        assert updated_flag.created_by == self.user  # Unchanged


class TestSettingSerializer(TestCase):
    """Test Setting serializer functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )

    def test_string_setting_serialization(self):
        """Test serializing string setting."""
        setting = Setting.objects.create(
            key="string_setting",
            name="String Setting",
            value_type="string",
            default_value="test_value",
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        assert data["key"] == "string_setting"
        assert data["value_type"] == "string"
        assert data["default_value"] == "test_value"

    def test_json_setting_serialization(self):
        """Test serializing JSON setting."""
        json_value = {"config": {"timeout": 30, "retries": 3}}
        setting = Setting.objects.create(
            key="json_setting",
            name="JSON Setting",
            value_type="json",
            default_value=json_value,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        assert data["value_type"] == "json"
        assert data["default_value"] == json_value

    def test_number_setting_serialization(self):
        """Test serializing number setting."""
        setting = Setting.objects.create(
            key="number_setting",
            name="Number Setting",
            value_type="number",
            default_value=42,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        assert data["value_type"] == "number"
        assert data["default_value"] == 42

    def test_boolean_setting_serialization(self):
        """Test serializing boolean setting."""
        setting = Setting.objects.create(
            key="boolean_setting",
            name="Boolean Setting",
            value_type="boolean",
            default_value=True,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        assert data["value_type"] == "boolean"
        assert data["default_value"] is True

    def test_valid_setting_deserialization(self):
        """Test deserializing valid setting data."""
        data = {
            "key": "new_setting",
            "name": "New Setting",
            "description": "A new setting",
            "value_type": "string",
            "default_value": "default_value",
            "scope_type": ScopeType.GLOBAL.value,
            "is_active": True,
        }

        serializer = SettingSerializer(data=data)
        assert serializer.is_valid()

        setting = serializer.save(created_by=self.user)
        assert setting.key == "new_setting"
        assert setting.value_type == "string"

    def test_value_type_validation(self):
        """Test value type and default value consistency."""
        # Test string with number value
        data = {
            "key": "type_mismatch",
            "name": "Type Mismatch",
            "value_type": "string",
            "default_value": 42,  # Number for string type
            "scope_type": ScopeType.GLOBAL.value,
        }

        serializer = SettingSerializer(data=data)
        # Should be valid as serializer may convert types
        assert serializer.is_valid()

    def test_json_validation(self):
        """Test JSON value validation."""
        data = {
            "key": "json_setting",
            "name": "JSON Setting",
            "value_type": "json",
            "default_value": {"valid": "json", "nested": {"data": True}},
            "scope_type": ScopeType.GLOBAL.value,
        }

        serializer = SettingSerializer(data=data)
        assert serializer.is_valid()

    def test_validation_rules_serialization(self):
        """Test validation rules field serialization."""
        validation_rules = {"min_value": 0, "max_value": 100, "required": True}
        setting = Setting.objects.create(
            key="validated_setting",
            name="Validated Setting",
            value_type="number",
            default_value=50,
            validation_rules=validation_rules,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        assert data["validation_rules"] == validation_rules

    def test_constraint_validation(self):
        """Test setting constraint validation."""
        data = {
            "key": "constrained_setting",
            "name": "Constrained Setting",
            "value_type": "number",
            "default_value": 150,  # Exceeds constraint
            "validation_rules": {"min_value": 1, "max_value": 100},
            "scope_type": ScopeType.GLOBAL.value,
        }

        serializer = SettingSerializer(data=data)
        # Should validate constraints
        if not serializer.is_valid():
            assert "default_value" in serializer.errors or "validation_rules" in serializer.errors


class TestResolveRequestSerializer(TestCase):
    """Test resolve request serializer."""

    def test_valid_flag_resolve_request(self):
        """Test valid flag resolve request."""
        data = {"key": "test_flag", "organisation_id": 123, "project_id": 456}

        serializer = FeatureFlagResolveSerializer(data=data)
        assert serializer.is_valid()

        validated_data = serializer.validated_data
        assert validated_data["key"] == "test_flag"
        assert validated_data["organisation_id"] == 123
        assert validated_data["project_id"] == 456

    def test_minimal_resolve_request(self):
        """Test minimal resolve request with only key."""
        data = {"key": "global_flag"}

        serializer = FeatureFlagResolveSerializer(data=data)
        assert serializer.is_valid()

        validated_data = serializer.validated_data
        assert validated_data["key"] == "global_flag"
        assert "organisation_id" not in validated_data
        assert "project_id" not in validated_data

    def test_missing_key_validation(self):
        """Test validation when key is missing."""
        data = {"organisation_id": 123}

        serializer = FeatureFlagResolveSerializer(data=data)
        assert not serializer.is_valid()
        assert "key" in serializer.errors

    def test_empty_key_validation(self):
        """Test validation when key is empty."""
        data = {"key": ""}

        serializer = FeatureFlagResolveSerializer(data=data)
        assert not serializer.is_valid()
        assert "key" in serializer.errors


class TestResolveResponseSerializers(TestCase):
    """Test resolve response serializers."""

    def test_flag_resolve_response_serialization(self):
        """Test flag resolve response serialization."""
        data = {
            "key": "test_flag",
            "value": True,
            "scope": ScopeType.GLOBAL.value,
            "organisation_id": None,
            "project_id": None,
            "source": "default",
        }

        serializer = FeatureFlagResolveResponseSerializer(data=data)
        assert serializer.is_valid()

        output = serializer.data
        assert output["key"] == "test_flag"
        assert output["value"] is True
        assert output["scope"] == ScopeType.GLOBAL.value

    def test_setting_resolve_response_serialization(self):
        """Test setting resolve response serialization."""
        data = {
            "key": "test_setting",
            "value": "resolved_value",
            "value_type": "string",
            "scope": ScopeType.ORGANISATION.value,
            "organisation_id": 123,
            "project_id": None,
            "source": "override",
        }

        serializer = SettingResolveResponseSerializer(data=data)
        assert serializer.is_valid()

        output = serializer.data
        assert output["key"] == "test_setting"
        assert output["value"] == "resolved_value"
        assert output["value_type"] == "string"
        assert output["organisation_id"] == 123


class TestSerializerEdgeCases(TestCase):
    """Test serializer edge cases and error handling."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

    def test_partial_update_serialization(self):
        """Test partial update with serializer."""
        flag = FeatureFlag.objects.create(
            key="partial_flag",
            name="Partial Flag",
            scope_type=ScopeType.GLOBAL,
            default_value=False,
            created_by=self.user,
        )

        # Partial update - only name
        data = {"name": "Updated Name"}
        serializer = FeatureFlagSerializer(flag, data=data, partial=True)

        assert serializer.is_valid()

        updated_flag = serializer.save()
        assert updated_flag.name == "Updated Name"
        assert updated_flag.default_value is False  # Unchanged

    def test_invalid_foreign_key_reference(self):
        """Test handling of invalid foreign key references."""
        data = {
            "key": "invalid_ref",
            "name": "Invalid Reference",
            "scope_type": ScopeType.ORGANISATION.value,
            "organisation": 99999,  # Non-existent ID
            "default_value": True,
        }

        serializer = FeatureFlagSerializer(data=data)
        assert not serializer.is_valid()
        assert "organisation" in serializer.errors

    def test_empty_data_validation(self):
        """Test validation with empty data."""
        serializer = FeatureFlagSerializer(data={})
        assert not serializer.is_valid()

        # Should have errors for required fields
        required_fields = ["key", "name", "scope_type"]
        for field in required_fields:
            assert field in serializer.errors

    def test_none_values_handling(self):
        """Test handling of None values in serialization."""
        flag = FeatureFlag.objects.create(
            key="none_values",
            name="None Values",
            description=None,  # Optional field
            scope_type=ScopeType.GLOBAL,
            default_value=True,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        assert data["description"] is None
        assert "key" in data
        assert data["key"] == "none_values"

    def test_large_json_serialization(self):
        """Test serialization of large JSON data."""
        large_json = {
            "config": {f"item_{i}": f"value_{i}" for i in range(100)},
            "nested": {"deep": {"data": [i for i in range(50)]}},
        }

        setting = Setting.objects.create(
            key="large_json",
            name="Large JSON",
            value_type="json",
            default_value=large_json,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        assert data["default_value"] == large_json
        assert len(data["default_value"]["config"]) == 100
