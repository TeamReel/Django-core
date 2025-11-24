"""Tests for permission classes - 100% coverage required."""

import pytest
from accounts.permissions import IsAdmin
from rest_framework.test import APIRequestFactory


@pytest.mark.django_db
class TestIsAdminPermission:
    """Tests for IsAdmin permission class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.factory = APIRequestFactory()
        self.permission = IsAdmin()

    def test_unauthenticated_user_denied(self):
        """Test that unauthenticated users are denied."""
        request = self.factory.get("/")
        request.user = None
        assert self.permission.has_permission(request, None) is False

    def test_anonymous_user_denied(self):
        """Test that anonymous users are denied."""
        from django.contrib.auth.models import AnonymousUser

        request = self.factory.get("/")
        request.user = AnonymousUser()
        assert self.permission.has_permission(request, None) is False

    def test_regular_user_denied(self, regular_user):
        """Test that regular users are denied."""
        request = self.factory.get("/")
        request.user = regular_user
        assert self.permission.has_permission(request, None) is False

    def test_unverified_user_denied(self, unverified_user):
        """Test that unverified users are denied."""
        request = self.factory.get("/")
        request.user = unverified_user
        assert self.permission.has_permission(request, None) is False

    def test_admin_user_allowed(self, admin_user):
        """Test that admin users are allowed."""
        request = self.factory.get("/")
        request.user = admin_user
        assert self.permission.has_permission(request, None) is True

    def test_superadmin_user_allowed(self, superadmin_user):
        """Test that superadmin users are allowed."""
        request = self.factory.get("/")
        request.user = superadmin_user
        assert self.permission.has_permission(request, None) is True

    def test_inactive_admin_denied(self, admin_user):
        """Test that inactive admin users are denied."""
        admin_user.is_active = False
        admin_user.save()
        request = self.factory.get("/")
        request.user = admin_user
        assert self.permission.has_permission(request, None) is False

    def test_inactive_superadmin_denied(self, superadmin_user):
        """Test that inactive superadmin users are denied."""
        superadmin_user.is_active = False
        superadmin_user.save()
        request = self.factory.get("/")
        request.user = superadmin_user
        assert self.permission.has_permission(request, None) is False

    def test_user_with_admin_group_but_not_active(self, db, admin_group):
        """Test user in admin group but inactive is denied."""
        from accounts.models import User

        user = User.objects.create_user(email="inactive@test.com", password="Test123!@#")
        user.is_active = False
        user.groups.add(admin_group)
        user.save()
        request = self.factory.get("/")
        request.user = user
        assert self.permission.has_permission(request, None) is False

    def test_superuser_flag_without_active(self, db):
        """Test is_superuser=True but is_active=False is denied."""
        from accounts.models import User

        user = User.objects.create_user(email="super@test.com", password="Test123!@#")
        user.is_superuser = True
        user.is_active = False
        user.save()
        request = self.factory.get("/")
        request.user = user
        assert self.permission.has_permission(request, None) is False

    def test_permission_with_different_http_methods(self, admin_user):
        """Test permission works with different HTTP methods."""
        methods = ["get", "post", "put", "patch", "delete"]
        for method in methods:
            request = getattr(self.factory, method)("/")
            request.user = admin_user
            assert self.permission.has_permission(request, None) is True

    def test_permission_message_attribute(self):
        """Test that permission has a message attribute."""
        assert hasattr(self.permission, "message")
        assert isinstance(self.permission.message, str)
        assert len(self.permission.message) > 0
