"""
Simple import test to verify models work correctly.
"""

from django.test import TestCase
from settings.models import FeatureFlag, ScopeType, Setting, SettingType


class SimpleImportTest(TestCase):
    """Test that imports work correctly."""

    def test_imports(self):
        """Test that we can import models without errors."""
        self.assertTrue(FeatureFlag)
        self.assertTrue(Setting)
        self.assertTrue(ScopeType)

    def test_model_creation(self):
        """Test basic model creation."""
        flag = FeatureFlag.objects.create(
            key="test_flag", scope_type=ScopeType.GLOBAL, enabled=True
        )
        self.assertEqual(flag.key, "test_flag")

        setting = Setting.objects.create(
            key="test_setting",
            scope_type=ScopeType.GLOBAL,
            default_value="test_value",
            value_type=SettingType.STRING,
        )
        self.assertEqual(setting.key, "test_setting")
