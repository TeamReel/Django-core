"""
Serializer tests for Settings & Feature Flags system.

Tests Django REST Framework serializers validation and data handling.
"""

from unittest.mock import Mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import serializers
from settings.models import FeatureFlag, ScopeType, Setting, SettingType
from settings.serializers import (
    FeatureFlagResolveSerializer,
    FeatureFlagSerializer,
    SettingResolveSerializer,
    SettingSerializer,
)

User = get_user_model()


class TestFeatureFlagSerializer(TestCase):
    """Test FeatureFlag serializer validation and functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

    def test_serializer_fields(self):
        """Test serializer includes expected fields."""
        serializer = FeatureFlagSerializer()
        expected_fields = {
            "id",
            "key",
            "enabled",
            "description",
            "scope_type",
            "organisation",
            "project",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        }
        self.assertEqual(set(serializer.fields.keys()), expected_fields)

    def test_read_only_fields(self):
        """Test read-only fields are properly configured."""
        serializer = FeatureFlagSerializer()
        read_only_fields = {"id", "created_at", "updated_at"}

        for field_name in read_only_fields:
            field = serializer.fields[field_name]
            self.assertTrue(field.read_only, f"{field_name} should be read-only")

    def test_valid_key_validation(self):
        """Test valid key passes validation."""
        serializer = FeatureFlagSerializer()
        valid_keys = ["test_key", "TEST_KEY", "test123", "a1", "feature_flag_123"]

        for key in valid_keys:
            result = serializer.validate_key(key)
            self.assertEqual(result, key)

    def test_invalid_key_format(self):
        """Test invalid key format raises validation error."""
        serializer = FeatureFlagSerializer()
        invalid_keys = ["test-key", "test.key", "test key", "test@key", "test/key"]

        for key in invalid_keys:
            with self.assertRaises(serializers.ValidationError) as context:
                serializer.validate_key(key)
            self.assertIn("alphanumeric characters and underscores", str(context.exception))

    def test_key_too_short(self):
        """Test key too short raises validation error."""
        serializer = FeatureFlagSerializer()

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_key("a")
        self.assertIn("at least 2 characters", str(context.exception))

    def test_key_too_long(self):
        """Test key too long raises validation error."""
        serializer = FeatureFlagSerializer()
        long_key = "a" * 101

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_key(long_key)
        self.assertIn("not exceed 100 characters", str(context.exception))

    def test_global_scope_validation_valid(self):
        """Test global scope validation passes when no org/project set."""
        serializer = FeatureFlagSerializer()
        data = {
            "scope_type": ScopeType.GLOBAL,
            "organisation": None,
            "project": None,
        }
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_global_scope_validation_with_organisation(self):
        """Test global scope validation fails when organisation is set."""
        serializer = FeatureFlagSerializer()
        data = {
            "scope_type": ScopeType.GLOBAL,
            "organisation": Mock(id=1),
            "project": None,
        }

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate(data)
        self.assertIn("Global scope flags cannot have", str(context.exception))

    def test_organisation_scope_validation_valid(self):
        """Test organisation scope validation passes when organisation is set."""
        serializer = FeatureFlagSerializer()
        data = {
            "scope_type": ScopeType.ORGANISATION,
            "organisation": Mock(id=1),
            "project": None,
        }
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_organisation_scope_validation_missing_org(self):
        """Test organisation scope validation fails when organisation is missing."""
        serializer = FeatureFlagSerializer()
        data = {
            "scope_type": ScopeType.ORGANISATION,
            "organisation": None,
            "project": None,
        }

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate(data)
        self.assertIn("Organisation scope requires organisation_id", str(context.exception))

    def test_project_scope_validation_valid(self):
        """Test project scope validation passes when project is set."""
        serializer = FeatureFlagSerializer()
        data = {
            "scope_type": ScopeType.PROJECT,
            "organisation": None,
            "project": Mock(id=1),
        }
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_project_scope_validation_missing_project(self):
        """Test project scope validation fails when project is missing."""
        serializer = FeatureFlagSerializer()
        data = {
            "scope_type": ScopeType.PROJECT,
            "organisation": None,
            "project": None,
        }

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate(data)
        self.assertIn("Project scope requires project_id", str(context.exception))

    def test_serialization_of_existing_object(self):
        """Test serialization of existing FeatureFlag object."""
        flag = FeatureFlag.objects.create(
            key="test_flag",
            description="Test flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.user,
        )

        serializer = FeatureFlagSerializer(flag)
        data = serializer.data

        self.assertEqual(data["key"], "test_flag")
        self.assertEqual(data["description"], "Test flag")
        self.assertEqual(data["scope_type"], ScopeType.GLOBAL)
        self.assertTrue(data["enabled"])


class TestSettingSerializer(TestCase):
    """Test Setting serializer validation and functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

    def test_serializer_fields(self):
        """Test serializer includes expected fields."""
        serializer = SettingSerializer()
        expected_fields = {
            "id",
            "key",
            "value",
            "value_type",
            "default_value",
            "description",
            "scope_type",
            "organisation",
            "project",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        }
        self.assertEqual(set(serializer.fields.keys()), expected_fields)

    def test_valid_key_validation(self):
        """Test valid key passes validation."""
        serializer = SettingSerializer()
        valid_keys = ["test_key", "TEST_KEY", "test123", "a1", "setting_value_123"]

        for key in valid_keys:
            result = serializer.validate_key(key)
            self.assertEqual(result, key)

    def test_invalid_key_format(self):
        """Test invalid key format raises validation error."""
        serializer = SettingSerializer()
        invalid_keys = ["test-key", "test.key", "test key", "test@key"]

        for key in invalid_keys:
            with self.assertRaises(serializers.ValidationError) as context:
                serializer.validate_key(key)
            self.assertIn("alphanumeric characters and underscores", str(context.exception))

    def test_valid_value_type_validation(self):
        """Test valid value types pass validation."""
        serializer = SettingSerializer()
        valid_types = [
            SettingType.STRING,
            SettingType.INTEGER,
            SettingType.BOOLEAN,
            SettingType.JSON,
        ]

        for value_type in valid_types:
            result = serializer.validate_value_type(value_type)
            self.assertEqual(result, value_type)

    def test_invalid_value_type_validation(self):
        """Test invalid value type raises validation error."""
        serializer = SettingSerializer()

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_value_type("INVALID_TYPE")
        self.assertIn("Invalid value_type", str(context.exception))

    def test_default_value_required(self):
        """Test default value is required."""
        serializer = SettingSerializer()

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_default_value(None)
        self.assertIn("Default value is required", str(context.exception))

    def test_string_value_type_validation(self):
        """Test string value type validation."""
        serializer = SettingSerializer()

        # Valid string value
        data = {
            "value_type": SettingType.STRING,
            "value": "test_string",
            "default_value": "default_string",
            "scope_type": ScopeType.GLOBAL,
        }
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_integer_value_type_validation_valid(self):
        """Test integer value type validation with valid integer."""
        serializer = SettingSerializer()

        data = {
            "value_type": SettingType.INTEGER,
            "value": 42,
            "default_value": 0,
            "scope_type": ScopeType.GLOBAL,
        }
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_integer_value_type_validation_invalid(self):
        """Test integer value type validation with invalid value."""
        serializer = SettingSerializer()

        data = {
            "value_type": SettingType.INTEGER,
            "value": "not_an_integer",
            "default_value": 0,
            "scope_type": ScopeType.GLOBAL,
        }

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate(data)
        self.assertIn("must be an integer for INTEGER type", str(context.exception))

    def test_boolean_value_type_validation_valid(self):
        """Test boolean value type validation with valid boolean."""
        serializer = SettingSerializer()

        data = {
            "value_type": SettingType.BOOLEAN,
            "value": True,
            "default_value": False,
            "scope_type": ScopeType.GLOBAL,
        }
        result = serializer.validate(data)
        self.assertEqual(result, data)

    def test_boolean_value_type_validation_invalid(self):
        """Test boolean value type validation with invalid value."""
        serializer = SettingSerializer()

        data = {
            "value_type": SettingType.BOOLEAN,
            "value": "not_a_boolean",
            "default_value": False,
            "scope_type": ScopeType.GLOBAL,
        }

        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate(data)
        self.assertIn("must be a boolean for BOOLEAN type", str(context.exception))

    def test_json_value_type_validation(self):
        """Test JSON value type validation accepts any JSON-serializable value."""
        serializer = SettingSerializer()

        json_values = [
            {"key": "value"},
            ["item1", "item2"],
            "string_value",
            42,
            True,
        ]

        for json_value in json_values:
            data = {
                "value_type": SettingType.JSON,
                "value": json_value,
                "default_value": {},
                "scope_type": ScopeType.GLOBAL,
            }
            result = serializer.validate(data)
            self.assertEqual(result, data)

    def test_serialization_of_existing_object(self):
        """Test serialization of existing Setting object."""
        setting = Setting.objects.create(
            key="test_setting",
            description="Test setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.STRING,
            value="test_value",
            default_value="default_value",
            created_by=self.user,
        )

        serializer = SettingSerializer(setting)
        data = serializer.data

        self.assertEqual(data["key"], "test_setting")
        self.assertEqual(data["description"], "Test setting")
        self.assertEqual(data["value_type"], SettingType.STRING)
        self.assertEqual(data["value"], "test_value")


class TestFeatureFlagResolveSerializer(TestCase):
    """Test FeatureFlagResolveSerializer functionality."""

    def test_serializer_fields(self):
        """Test serializer includes expected fields."""
        serializer = FeatureFlagResolveSerializer()
        expected_fields = {"key", "value", "scope_used", "scope_id"}
        self.assertEqual(set(serializer.fields.keys()), expected_fields)

    def test_serialization_with_scope_id(self):
        """Test serialization with scope_id."""
        data = {
            "key": "test_flag",
            "value": True,
            "scope_used": "project",
            "scope_id": "123",
        }

        serializer = FeatureFlagResolveSerializer(data)
        self.assertEqual(serializer.data, data)

    def test_serialization_with_null_scope_id(self):
        """Test serialization with null scope_id (global scope)."""
        data = {
            "key": "test_flag",
            "value": False,
            "scope_used": "global",
            "scope_id": None,
        }

        serializer = FeatureFlagResolveSerializer(data)
        self.assertEqual(serializer.data, data)


class TestSettingResolveSerializer(TestCase):
    """Test SettingResolveSerializer functionality."""

    def test_serializer_fields(self):
        """Test serializer includes expected fields."""
        serializer = SettingResolveSerializer()
        expected_fields = {"key", "value", "scope_used", "scope_id"}
        self.assertEqual(set(serializer.fields.keys()), expected_fields)

    def test_serialization_with_string_value(self):
        """Test serialization with string value."""
        data = {
            "key": "test_setting",
            "value": "test_value",
            "scope_used": "organisation",
            "scope_id": "456",
        }

        serializer = SettingResolveSerializer(data)
        self.assertEqual(serializer.data, data)

    def test_serialization_with_json_value(self):
        """Test serialization with JSON value."""
        data = {
            "key": "test_setting",
            "value": {"nested": {"key": "value"}},
            "scope_used": "global",
            "scope_id": None,
        }

        serializer = SettingResolveSerializer(data)
        self.assertEqual(serializer.data, data)
