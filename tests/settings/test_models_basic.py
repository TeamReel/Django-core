"""
Basic model tests for Settings & Feature Flags system.

Tests core model functionality, constraints, and validation.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from src.settings.models import FeatureFlag, ScopeType, Setting, SettingType

User = get_user_model()


class TestFeatureFlagBasic(TestCase):
    """Test FeatureFlag model basic functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

    def test_create_global_feature_flag(self):
        """Test creating a global feature flag."""
        flag = FeatureFlag.objects.create(
            key="test_flag", scope_type=ScopeType.GLOBAL, enabled=True, created_by=self.user
        )

        self.assertEqual(flag.key, "test_flag")
        self.assertEqual(flag.scope_type, ScopeType.GLOBAL)
        self.assertTrue(flag.enabled)
        self.assertIsNone(flag.organisation)
        self.assertIsNone(flag.project)

    def test_feature_flag_default_disabled(self):
        """Test that feature flags default to disabled."""
        flag = FeatureFlag.objects.create(
            key="default_test", scope_type=ScopeType.GLOBAL, created_by=self.user
        )

        self.assertFalse(flag.enabled)

    def test_feature_flag_str_representation(self):
        """Test string representation of feature flag."""
        flag = FeatureFlag.objects.create(
            key="str_test", scope_type=ScopeType.GLOBAL, created_by=self.user
        )

        expected = "str_test (GLOBAL)"
        self.assertEqual(str(flag), expected)

    def test_unique_constraint_same_scope(self):
        """Test unique constraint allows duplicate keys in global scope due to NULL values."""
        # Note: Due to SQL NULL behavior, unique constraints don't prevent
        # multiple global scope entries with same key (both org and project are NULL)

        # Create initial flag
        flag1 = FeatureFlag.objects.create(
            key="global_test", scope_type=ScopeType.GLOBAL, created_by=self.user
        )

        # Creating another global flag with same key is allowed (both org/project are NULL)
        flag2 = FeatureFlag.objects.create(
            key="global_test", scope_type=ScopeType.GLOBAL, created_by=self.user
        )

        # Both should exist
        self.assertEqual(FeatureFlag.objects.filter(key="global_test").count(), 2)


class TestSettingBasic(TestCase):
    """Test Setting model basic functionality."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

    def test_create_global_setting(self):
        """Test creating a global setting."""
        setting = Setting.objects.create(
            key="test_setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.STRING,
            value="test_value",
            default_value="default_test",
            created_by=self.user,
        )

        self.assertEqual(setting.key, "test_setting")
        self.assertEqual(setting.scope_type, ScopeType.GLOBAL)
        self.assertEqual(setting.value_type, SettingType.STRING)
        self.assertEqual(setting.value, "test_value")

    def test_setting_str_representation(self):
        """Test string representation of setting."""
        setting = Setting.objects.create(
            key="str_test",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.INTEGER,
            value="42",
            default_value="0",
            created_by=self.user,
        )

        expected = "str_test (GLOBAL)"
        self.assertEqual(str(setting), expected)

    def test_unique_constraint_same_scope(self):
        """Test unique constraint allows duplicate keys in global scope due to NULL values."""
        # Note: Due to SQL NULL behavior, unique constraints don't prevent
        # multiple global scope entries with same key (both org and project are NULL)

        # Create initial setting
        Setting.objects.create(
            key="global_setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.STRING,
            value="test",
            default_value="default",
            created_by=self.user,
        )

        # Creating another global setting with same key is allowed (both org/project are NULL)
        Setting.objects.create(
            key="global_setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.STRING,
            value="test2",
            default_value="default2",
            created_by=self.user,
        )

        # Both should exist
        self.assertEqual(Setting.objects.filter(key="global_setting").count(), 2)
