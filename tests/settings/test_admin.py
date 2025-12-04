"""
Admin interface tests for Settings & Feature Flags system.

Tests Django admin functionality including permissions, actions, and UI.
"""

from unittest.mock import Mock, patch

from django.contrib.admin import site
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from settings.admin import FeatureFlagAdmin, SettingAdmin
from settings.models import FeatureFlag, ScopeType, Setting, SettingType

User = get_user_model()


class TestFeatureFlagAdmin(TestCase):
    """Test FeatureFlag admin interface."""

    def setUp(self):
        """Set up test data."""
        self.factory = RequestFactory()
        self.superuser = User.objects.create_user(
            email="super@example.com", password="testpass123", is_superuser=True, is_staff=True
        )
        self.regular_user = User.objects.create_user(
            email="user@example.com", password="testpass123", is_superuser=False, is_staff=True
        )
        self.admin = FeatureFlagAdmin(FeatureFlag, site)

        # Create test feature flag
        self.feature_flag = FeatureFlag.objects.create(
            key="test_flag",
            description="Test feature flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.superuser,
            updated_by=self.superuser,
        )

    def test_list_display_fields(self):
        """Test that list_display contains expected fields."""
        expected_fields = [
            "key",
            "enabled_badge",
            "scope_type",
            "organisation",
            "project",
            "updated_at",
            "updated_by",
        ]
        self.assertEqual(self.admin.list_display, expected_fields)

    def test_enabled_badge_true(self):
        """Test enabled_badge method for enabled flag."""
        badge_html = self.admin.enabled_badge(self.feature_flag)
        self.assertIn("✓ Enabled", badge_html)
        self.assertIn("color: green", badge_html)

    def test_enabled_badge_false(self):
        """Test enabled_badge method for disabled flag."""
        disabled_flag = FeatureFlag.objects.create(
            key="disabled_flag",
            scope_type=ScopeType.GLOBAL,
            enabled=False,
            created_by=self.superuser,
        )
        badge_html = self.admin.enabled_badge(disabled_flag)
        self.assertIn("✗ Disabled", badge_html)
        self.assertIn("color: red", badge_html)

    def test_enable_flags_action(self):
        """Test bulk enable action."""
        # Create disabled flag
        disabled_flag = FeatureFlag.objects.create(
            key="disabled_flag",
            scope_type=ScopeType.GLOBAL,
            enabled=False,
            created_by=self.superuser,
        )

        request = self.factory.get("/")
        request.user = self.superuser
        request._messages = Mock()

        queryset = FeatureFlag.objects.filter(id=disabled_flag.id)
        self.admin.enable_flags(request, queryset)

        # Refresh from database
        disabled_flag.refresh_from_db()
        self.assertTrue(disabled_flag.enabled)
        self.assertEqual(disabled_flag.updated_by, self.superuser)

    def test_disable_flags_action(self):
        """Test bulk disable action."""
        request = self.factory.get("/")
        request.user = self.superuser
        request._messages = Mock()

        queryset = FeatureFlag.objects.filter(id=self.feature_flag.id)
        self.admin.disable_flags(request, queryset)

        # Refresh from database
        self.feature_flag.refresh_from_db()
        self.assertFalse(self.feature_flag.enabled)
        self.assertEqual(self.feature_flag.updated_by, self.superuser)

    def test_save_model_new_object(self):
        """Test save_model method for new objects sets created_by."""
        request = self.factory.post("/")
        request.user = self.regular_user

        new_flag = FeatureFlag(
            key="new_flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
        )

        # Mock form
        form = Mock()

        self.admin.save_model(request, new_flag, form, change=False)

        self.assertEqual(new_flag.created_by, self.regular_user)
        self.assertEqual(new_flag.updated_by, self.regular_user)

    def test_save_model_existing_object(self):
        """Test save_model method for existing objects only sets updated_by."""
        request = self.factory.post("/")
        request.user = self.regular_user

        # Mock form
        form = Mock()

        original_created_by = self.feature_flag.created_by
        self.admin.save_model(request, self.feature_flag, form, change=True)

        self.assertEqual(self.feature_flag.created_by, original_created_by)  # Unchanged
        self.assertEqual(self.feature_flag.updated_by, self.regular_user)

    @patch("settings.admin.check_permission")
    def test_has_change_permission_superuser(self, mock_check):
        """Test change permission for superuser."""
        request = self.factory.get("/")
        request.user = self.superuser

        result = self.admin.has_change_permission(request, self.feature_flag)
        self.assertTrue(result)

        # Should not need to check permissions for superuser
        mock_check.assert_not_called()

    @patch("settings.admin.check_permission")
    def test_has_change_permission_unauthenticated(self, mock_check):
        """Test change permission for unauthenticated user."""
        request = self.factory.get("/")
        request.user = None

        result = self.admin.has_change_permission(request, self.feature_flag)
        self.assertFalse(result)

    @patch("settings.admin.check_permission")
    def test_has_change_permission_global_flag_regular_user(self, mock_check):
        """Test change permission for global flag requires superuser."""
        request = self.factory.get("/")
        request.user = self.regular_user

        result = self.admin.has_change_permission(request, self.feature_flag)
        self.assertFalse(result)

    @patch("settings.admin.check_permission")
    def test_has_change_permission_list_view(self, mock_check):
        """Test change permission for list view (obj=None)."""
        mock_check.return_value = True

        request = self.factory.get("/")
        request.user = self.regular_user

        result = self.admin.has_change_permission(request, obj=None)
        self.assertTrue(result)

        # Should check for any permissions
        self.assertTrue(mock_check.called)

    def test_has_add_permission(self):
        """Test add permission delegates to change permission."""
        request = self.factory.get("/")
        request.user = self.superuser

        result = self.admin.has_add_permission(request)
        self.assertTrue(result)

    def test_has_delete_permission(self):
        """Test delete permission delegates to change permission."""
        request = self.factory.get("/")
        request.user = self.superuser

        result = self.admin.has_delete_permission(request, self.feature_flag)
        self.assertTrue(result)

    def test_fieldsets_structure(self):
        """Test admin fieldsets are properly configured."""
        expected_sections = ["Basic Information", "Scope Configuration", "Audit Information"]

        fieldset_names = [fieldset[0] for fieldset in self.admin.fieldsets]
        self.assertEqual(fieldset_names, expected_sections)

    def test_list_filter_fields(self):
        """Test list_filter contains expected fields."""
        expected_filters = ["scope_type", "enabled", "updated_at", "organisation"]
        self.assertEqual(self.admin.list_filter, expected_filters)

    def test_search_fields(self):
        """Test search_fields contains expected fields."""
        expected_search = ["key", "description"]
        self.assertEqual(self.admin.search_fields, expected_search)

    def test_actions_configured(self):
        """Test admin actions are configured."""
        expected_actions = ["enable_flags", "disable_flags"]
        self.assertEqual(self.admin.actions, expected_actions)


class TestSettingAdmin(TestCase):
    """Test Setting admin interface."""

    def setUp(self):
        """Set up test data."""
        self.factory = RequestFactory()
        self.superuser = User.objects.create_user(
            email="super@example.com", password="testpass123", is_superuser=True, is_staff=True
        )
        self.regular_user = User.objects.create_user(
            email="user@example.com", password="testpass123", is_superuser=False, is_staff=True
        )
        self.admin = SettingAdmin(Setting, site)

        # Create test setting
        self.setting = Setting.objects.create(
            key="test_setting",
            description="Test setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.STRING,
            value="test_value",
            default_value="default_value",
            created_by=self.superuser,
            updated_by=self.superuser,
        )

    def test_list_display_fields(self):
        """Test that list_display contains expected fields."""
        expected_fields = [
            "key",
            "value_type",
            "scope_type",
            "organisation",
            "project",
            "updated_at",
            "updated_by",
        ]
        self.assertEqual(self.admin.list_display, expected_fields)

    def test_save_model_new_object(self):
        """Test save_model method for new objects sets created_by."""
        request = self.factory.post("/")
        request.user = self.regular_user

        new_setting = Setting(
            key="new_setting",
            scope_type=ScopeType.GLOBAL,
            value_type=SettingType.INTEGER,
            value="42",
            default_value="0",
        )

        # Mock form
        form = Mock()

        self.admin.save_model(request, new_setting, form, change=False)

        self.assertEqual(new_setting.created_by, self.regular_user)
        self.assertEqual(new_setting.updated_by, self.regular_user)

    def test_save_model_existing_object(self):
        """Test save_model method for existing objects only sets updated_by."""
        request = self.factory.post("/")
        request.user = self.regular_user

        # Mock form
        form = Mock()

        original_created_by = self.setting.created_by
        self.admin.save_model(request, self.setting, form, change=True)

        self.assertEqual(self.setting.created_by, original_created_by)  # Unchanged
        self.assertEqual(self.setting.updated_by, self.regular_user)

    @patch("settings.admin.check_permission")
    def test_has_change_permission_superuser(self, mock_check):
        """Test change permission for superuser."""
        request = self.factory.get("/")
        request.user = self.superuser

        result = self.admin.has_change_permission(request, self.setting)
        self.assertTrue(result)

        # Should not need to check permissions for superuser
        mock_check.assert_not_called()

    @patch("settings.admin.check_permission")
    def test_has_change_permission_global_setting_regular_user(self, mock_check):
        """Test change permission for global setting requires superuser."""
        request = self.factory.get("/")
        request.user = self.regular_user

        result = self.admin.has_change_permission(request, self.setting)
        self.assertFalse(result)

    def test_fieldsets_structure(self):
        """Test admin fieldsets are properly configured."""
        expected_sections = [
            "Basic Information",
            "Type Configuration",
            "Scope Configuration",
            "Audit Information",
        ]

        fieldset_names = [fieldset[0] for fieldset in self.admin.fieldsets]
        self.assertEqual(fieldset_names, expected_sections)

    def test_list_filter_fields(self):
        """Test list_filter contains expected fields."""
        expected_filters = ["value_type", "scope_type", "updated_at", "organisation"]
        self.assertEqual(self.admin.list_filter, expected_filters)

    def test_search_fields(self):
        """Test search_fields contains expected fields."""
        expected_search = ["key", "description"]
        self.assertEqual(self.admin.search_fields, expected_search)

    def test_has_add_permission(self):
        """Test add permission delegates to change permission."""
        request = self.factory.get("/")
        request.user = self.superuser

        result = self.admin.has_add_permission(request)
        self.assertTrue(result)

    def test_has_delete_permission(self):
        """Test delete permission delegates to change permission."""
        request = self.factory.get("/")
        request.user = self.superuser

        result = self.admin.has_delete_permission(request, self.setting)
        self.assertTrue(result)

    def test_readonly_fields_configured(self):
        """Test readonly fields are properly configured."""
        expected_readonly = ["id", "created_at", "updated_at", "created_by", "updated_by"]
        self.assertEqual(self.admin.readonly_fields, expected_readonly)
