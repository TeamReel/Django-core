"""
Permissions tests for Settings & Feature Flags system (focused version).

Tests Django REST Framework permission classes and scope-aware access control
without external dependencies.
"""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from settings.models import FeatureFlag, ScopeType
from settings.permissions import ScopeAwarePermission

User = get_user_model()


class TestScopeAwarePermissionFocused(TestCase):
    """Test ScopeAwarePermission class functionality without external dependencies."""

    def setUp(self):
        """Set up test data."""
        self.factory = RequestFactory()
        self.permission = ScopeAwarePermission()

        # Create test users
        self.superuser = User.objects.create_user(
            email="super@example.com", password="testpass123", is_superuser=True
        )
        self.regular_user = User.objects.create_user(
            email="user@example.com", password="testpass123", is_superuser=False
        )

        # Create test objects
        self.global_flag = FeatureFlag.objects.create(
            key="global_flag",
            scope_type=ScopeType.GLOBAL,
            enabled=True,
            created_by=self.superuser,
        )

    def test_unauthenticated_user_denied(self):
        """Test unauthenticated user is denied permission."""
        request = self.factory.get("/")
        request.user = None

        view = Mock()
        view.kwargs = {}

        result = self.permission.has_permission(request, view)
        self.assertFalse(result)

    def test_unauthenticated_user_object_permission_denied(self):
        """Test unauthenticated user is denied object permission."""
        request = self.factory.get("/")
        request.user = None

        view = Mock()

        result = self.permission.has_object_permission(request, view, self.global_flag)
        self.assertFalse(result)

    @patch("settings.permissions.check_permission")
    def test_superuser_global_permission_granted(self, mock_check):
        """Test superuser is granted global permission."""
        request = self.factory.get("/")
        request.user = self.superuser

        view = Mock()
        view.kwargs = {}

        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

        # Should not check permissions for superuser
        mock_check.assert_not_called()

    @patch("settings.permissions.check_permission")
    def test_regular_user_global_permission_denied(self, mock_check):
        """Test regular user is denied global permission."""
        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()
        view.kwargs = {}

        result = self.permission.has_permission(request, view)
        self.assertFalse(result)

        # Should not check permissions for global scope (always denied for non-superuser)
        mock_check.assert_not_called()

    @patch("settings.permissions.check_permission")
    def test_organisation_scope_permission_check(self, mock_check):
        """Test organisation scope permission uses correct permission check."""
        mock_check.return_value = True

        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()
        view.kwargs = {"org_id": "123"}

        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

        mock_check.assert_called_once_with(
            self.regular_user.id,
            "org.manage_settings",
            "123",
            "organisation",
        )

    @patch("settings.permissions.check_permission")
    def test_organisation_scope_permission_denied(self, mock_check):
        """Test organisation scope permission denied when user lacks permission."""
        mock_check.return_value = False

        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()
        view.kwargs = {"org_id": "123"}

        result = self.permission.has_permission(request, view)
        self.assertFalse(result)

    @patch("settings.permissions.check_permission")
    def test_project_scope_permission_check(self, mock_check):
        """Test project scope permission uses correct permission check."""
        mock_check.return_value = True

        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()
        view.kwargs = {"project_id": "456"}

        result = self.permission.has_permission(request, view)
        self.assertTrue(result)

        mock_check.assert_called_once_with(
            self.regular_user.id,
            "projects.update",
            "456",
            "project",
        )

    def test_get_scope_from_request_url_kwargs(self):
        """Test _get_scope_from_request extracts scope from URL kwargs."""
        request = self.factory.get("/")
        request.user = self.regular_user

        # Test project scope
        view = Mock()
        view.kwargs = {"project_id": "123"}

        scope_info = self.permission._get_scope_from_request(request, view)
        expected = {
            "scope_type": ScopeType.PROJECT,
            "resource_id": "123",
            "resource_type": "project",
        }
        self.assertEqual(scope_info, expected)

    def test_get_scope_from_request_org_scope(self):
        """Test _get_scope_from_request extracts organisation scope."""
        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()
        view.kwargs = {"org_id": "456"}

        scope_info = self.permission._get_scope_from_request(request, view)
        expected = {
            "scope_type": ScopeType.ORGANISATION,
            "resource_id": "456",
            "resource_type": "organisation",
        }
        self.assertEqual(scope_info, expected)

    def test_get_scope_from_request_global_scope(self):
        """Test _get_scope_from_request defaults to global scope."""
        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()
        view.kwargs = {}

        scope_info = self.permission._get_scope_from_request(request, view)
        expected = {
            "scope_type": ScopeType.GLOBAL,
            "resource_id": None,
            "resource_type": "global",
        }
        self.assertEqual(scope_info, expected)

    def test_get_scope_from_request_data(self):
        """Test _get_scope_from_request extracts scope from request data."""
        request = self.factory.post("/")
        request.user = self.regular_user
        request.data = {"organisation": "789", "project": "101"}

        view = Mock()
        view.kwargs = {}

        scope_info = self.permission._get_scope_from_request(request, view)
        # Project takes precedence over organisation
        expected = {
            "scope_type": ScopeType.PROJECT,
            "resource_id": "101",
            "resource_type": "project",
        }
        self.assertEqual(scope_info, expected)

    def test_get_scope_from_request_attributes(self):
        """Test _get_scope_from_request extracts scope from request attributes."""
        request = self.factory.get("/")
        request.user = self.regular_user
        request.organisation_id = "555"

        view = Mock()
        view.kwargs = {}

        scope_info = self.permission._get_scope_from_request(request, view)
        expected = {
            "scope_type": ScopeType.ORGANISATION,
            "resource_id": "555",
            "resource_type": "organisation",
        }
        self.assertEqual(scope_info, expected)

    def test_has_object_permission_superuser(self):
        """Test superuser has object permission for any object."""
        request = self.factory.get("/")
        request.user = self.superuser

        view = Mock()

        result = self.permission.has_object_permission(request, view, self.global_flag)
        self.assertTrue(result)

    def test_has_object_permission_global_object(self):
        """Test object permission for global object requires superuser."""
        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()

        result = self.permission.has_object_permission(request, view, self.global_flag)
        self.assertFalse(result)

    @patch("settings.permissions.check_permission")
    def test_has_object_permission_organisation_object(self, mock_check):
        """Test object permission for organisation object."""
        mock_check.return_value = True

        # Create mock organisation setting without foreign key constraints
        org_setting = Mock()
        org_setting.scope_type = ScopeType.ORGANISATION
        org_setting.organisation_id = 123
        org_setting.project_id = None

        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()

        result = self.permission.has_object_permission(request, view, org_setting)
        self.assertTrue(result)

        mock_check.assert_called_once_with(
            self.regular_user.id,
            "org.manage_settings",
            123,
            "organisation",
        )

    @patch("settings.permissions.check_permission")
    def test_has_object_permission_project_object(self, mock_check):
        """Test object permission for project object."""
        mock_check.return_value = True

        # Create mock project setting without foreign key constraints
        project_setting = Mock()
        project_setting.scope_type = ScopeType.PROJECT
        project_setting.organisation_id = None
        project_setting.project_id = 456

        request = self.factory.get("/")
        request.user = self.regular_user

        view = Mock()

        result = self.permission.has_object_permission(request, view, project_setting)
        self.assertTrue(result)

        mock_check.assert_called_once_with(
            self.regular_user.id,
            "projects.update",
            456,
            "project",
        )

    def test_check_scope_permission_superuser_always_true(self):
        """Test _check_scope_permission always returns True for superuser."""
        result = self.permission._check_scope_permission(
            self.superuser, ScopeType.GLOBAL, None, "global"
        )
        self.assertTrue(result)

        result = self.permission._check_scope_permission(
            self.superuser, ScopeType.ORGANISATION, "123", "organisation"
        )
        self.assertTrue(result)

    def test_check_scope_permission_global_requires_superuser(self):
        """Test _check_scope_permission for global scope requires superuser."""
        result = self.permission._check_scope_permission(
            self.regular_user, ScopeType.GLOBAL, None, "global"
        )
        self.assertFalse(result)

    @patch("settings.permissions.check_permission")
    def test_check_scope_permission_organisation(self, mock_check):
        """Test _check_scope_permission for organisation scope."""
        mock_check.return_value = True

        result = self.permission._check_scope_permission(
            self.regular_user, ScopeType.ORGANISATION, "123", "organisation"
        )
        self.assertTrue(result)

        mock_check.assert_called_once_with(
            self.regular_user.id,
            "org.manage_settings",
            "123",
            "organisation",
        )

    @patch("settings.permissions.check_permission")
    def test_check_scope_permission_project_import_error_fallback(self, mock_check):
        """Test _check_scope_permission handles import errors gracefully."""
        mock_check.return_value = False  # Project permission denied

        # Mock ImportError when trying to import inside the method (patch the actual import location)
        with patch("builtins.__import__", side_effect=ImportError):
            result = self.permission._check_scope_permission(
                self.regular_user, ScopeType.PROJECT, "456", "project"
            )
            self.assertFalse(result)

            # Should only check project permission, not org fallback due to import error
            mock_check.assert_called_once_with(
                self.regular_user.id,
                "projects.update",
                "456",
                "project",
            )

    def test_permission_inheritance_from_base_permission(self):
        """Test that ScopeAwarePermission inherits from BasePermission."""
        from rest_framework.permissions import BasePermission

        self.assertTrue(issubclass(ScopeAwarePermission, BasePermission))

    def test_permission_has_required_methods(self):
        """Test that permission class has required methods."""
        required_methods = ["has_permission", "has_object_permission"]
        for method_name in required_methods:
            self.assertTrue(hasattr(self.permission, method_name))
            self.assertTrue(callable(getattr(self.permission, method_name)))

    def test_private_method_existence(self):
        """Test that private helper methods exist."""
        private_methods = ["_get_scope_from_request", "_check_scope_permission"]
        for method_name in private_methods:
            self.assertTrue(hasattr(self.permission, method_name))
            self.assertTrue(callable(getattr(self.permission, method_name)))
