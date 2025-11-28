"""
Permission tests for Settings & Feature Flags system.

Tests scope-aware permission checking and helper functions.
"""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from organisations.models import Organisation
from projects.models import Project

from src.settings.models import FeatureFlag, ScopeType, Setting, SettingType
from src.settings.permissions import (
    ScopeAwarePermission,
    can_access_flag,
    can_create_flag,
    can_delete_setting,
    can_modify_setting,
)

User = get_user_model()


class TestCanAccessFlag(TestCase):
    """Test can_access_flag permission helper."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated user cannot access flags."""
        flag = FeatureFlag.objects.create(
            key="test_flag",
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        # None user
        self.assertFalse(can_access_flag(None, flag))

        # Anonymous user mock
        anon = MagicMock()
        anon.is_authenticated = False
        self.assertFalse(can_access_flag(anon, flag))

    def test_superuser_can_access_global_flag(self):
        """Test superuser can access global flags."""
        flag = FeatureFlag.objects.create(
            key="global_flag",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        self.assertTrue(can_access_flag(self.superuser, flag))

    def test_superuser_can_access_org_flag(self):
        """Test superuser can access organisation flags."""
        flag = FeatureFlag.objects.create(
            key="org_flag",
            scope_type=ScopeType.ORGANISATION,
            organisation=self.organisation,
            created_by=self.user,
        )

        self.assertTrue(can_access_flag(self.superuser, flag))

    def test_superuser_can_access_project_flag(self):
        """Test superuser can access project flags."""
        flag = FeatureFlag.objects.create(
            key="project_flag",
            scope_type=ScopeType.PROJECT,
            organisation=self.organisation,
            project=self.project,
            created_by=self.user,
        )

        self.assertTrue(can_access_flag(self.superuser, flag))

    def test_regular_user_cannot_access_global_flag(self):
        """Test regular user cannot access global flags."""
        flag = FeatureFlag.objects.create(
            key="global_flag",
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        self.assertFalse(can_access_flag(self.user, flag))


class TestCanModifySetting(TestCase):
    """Test can_modify_setting permission helper."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated user cannot modify settings."""
        setting = Setting.objects.create(
            key="test_setting",
            value="test",
            default_value="default",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        self.assertFalse(can_modify_setting(None, setting))

    def test_superuser_can_modify_any_setting(self):
        """Test superuser can modify any setting."""
        setting = Setting.objects.create(
            key="test_setting",
            value="test",
            default_value="default",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        self.assertTrue(can_modify_setting(self.superuser, setting))

    def test_superuser_can_modify_none_setting(self):
        """Test superuser can modify even with None setting."""
        self.assertTrue(can_modify_setting(self.superuser, None))

    def test_regular_user_cannot_modify_global_setting(self):
        """Test regular user cannot modify global settings."""
        setting = Setting.objects.create(
            key="global_setting",
            value="test",
            default_value="default",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        self.assertFalse(can_modify_setting(self.user, setting))

    def test_none_setting_returns_false_for_regular_user(self):
        """Test None setting returns False for regular user."""
        self.assertFalse(can_modify_setting(self.user, None))


class TestCanCreateFlag(TestCase):
    """Test can_create_flag permission helper."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )
        self.project = Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=self.organisation,
            creator=self.user,
        )

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated user cannot create flags."""
        self.assertFalse(can_create_flag(None, ScopeType.GLOBAL))

    def test_superuser_can_create_global_flag(self):
        """Test superuser can create global flags."""
        self.assertTrue(can_create_flag(self.superuser, ScopeType.GLOBAL))

    def test_superuser_can_create_org_flag(self):
        """Test superuser can create organisation flags."""
        self.assertTrue(can_create_flag(self.superuser, ScopeType.ORGANISATION, self.organisation))

    def test_superuser_can_create_project_flag(self):
        """Test superuser can create project flags."""
        self.assertTrue(
            can_create_flag(self.superuser, ScopeType.PROJECT, self.organisation, self.project)
        )

    def test_regular_user_cannot_create_global_flag(self):
        """Test regular user cannot create global flags."""
        self.assertFalse(can_create_flag(self.user, ScopeType.GLOBAL))


class TestCanDeleteSetting(TestCase):
    """Test can_delete_setting permission helper."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.organisation = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user
        )

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated user cannot delete settings."""
        setting = Setting.objects.create(
            key="test_setting",
            value="test",
            default_value="default",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        self.assertFalse(can_delete_setting(None, setting))

    def test_superuser_can_delete_any_setting(self):
        """Test superuser can delete any setting."""
        setting = Setting.objects.create(
            key="test_setting",
            value="test",
            default_value="default",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=self.user,
        )

        self.assertTrue(can_delete_setting(self.superuser, setting))

    def test_regular_user_cannot_delete_global_setting(self):
        """Test regular user cannot delete global settings."""
        setting = Setting.objects.create(
            key="global_setting",
            value="test",
            default_value="default",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            created_by=self.superuser,
        )

        self.assertFalse(can_delete_setting(self.user, setting))


class TestScopeAwarePermissionClass(TestCase):
    """Test ScopeAwarePermission DRF permission class."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="adminpass123"
        )
        self.permission = ScopeAwarePermission()

    def test_unauthenticated_denied(self):
        """Test unauthenticated request is denied."""
        request = MagicMock()
        request.user = None
        view = MagicMock()

        self.assertFalse(self.permission.has_permission(request, view))

    def test_anonymous_user_denied(self):
        """Test anonymous user is denied."""
        request = MagicMock()
        request.user = MagicMock()
        request.user.is_authenticated = False
        view = MagicMock()

        self.assertFalse(self.permission.has_permission(request, view))

    def test_superuser_allowed(self):
        """Test superuser is allowed."""
        request = MagicMock()
        request.user = self.superuser
        request.data = {}
        view = MagicMock()
        view.kwargs = {}

        self.assertTrue(self.permission.has_permission(request, view))
