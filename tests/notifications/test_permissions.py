"""Tests for notification permissions."""

import pytest
from django.contrib.auth import get_user_model
from notifications.permissions import IsOwnerOrAdmin
from rest_framework.test import APIRequestFactory

User = get_user_model()


@pytest.mark.django_db
class TestIsOwnerOrAdmin:
    """Test suite for IsOwnerOrAdmin permission."""

    def setup_method(self):
        """Set up test fixtures."""
        self.factory = APIRequestFactory()
        self.permission = IsOwnerOrAdmin()

    def test_unauthenticated_user_denied(self):
        """Test that unauthenticated users are denied."""
        request = self.factory.get("/")
        request.user = None

        assert self.permission.has_permission(request, None) is False

    def test_authenticated_user_allowed(self):
        """Test that authenticated users pass has_permission."""
        user = User.objects.create_user(email="user@example.com")
        request = self.factory.get("/")
        request.user = user

        assert self.permission.has_permission(request, None) is True

    def test_user_owns_in_app_notification(self, notification_factory):
        """Test that user can access their own in-app notification."""
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user@example.com",
            recipient_user=user,
        )

        request = self.factory.get("/")
        request.user = user

        assert self.permission.has_object_permission(request, None, notification) is True

    def test_user_cannot_access_other_users_notification(self, notification_factory):
        """Test that user cannot access another user's notification."""
        user1 = User.objects.create_user(email="user1@example.com")
        user2 = User.objects.create_user(email="user2@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user2@example.com",
            recipient_user=user2,
        )

        request = self.factory.get("/")
        request.user = user1

        assert self.permission.has_object_permission(request, None, notification) is False

    def test_admin_can_access_any_notification(self, notification_factory):
        """Test that admin users can access any notification."""
        admin = User.objects.create_user(email="admin@example.com", is_staff=True)
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user@example.com",
            recipient_user=user,
        )

        request = self.factory.get("/")
        request.user = admin

        assert self.permission.has_object_permission(request, None, notification) is True

    def test_superuser_can_access_any_notification(self, notification_factory):
        """Test that superusers can access any notification."""
        superuser = User.objects.create_user(email="super@example.com", is_superuser=True)
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient="user@example.com",
            recipient_user=user,
        )

        request = self.factory.get("/")
        request.user = superuser

        assert self.permission.has_object_permission(request, None, notification) is True

    def test_user_can_access_email_notification_by_email_match(self, notification_factory):
        """Test that user can access email notification if recipient matches."""
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="email",
            recipient="user@example.com",
        )

        request = self.factory.get("/")
        request.user = user

        assert self.permission.has_object_permission(request, None, notification) is True

    def test_user_cannot_access_email_notification_with_different_email(self, notification_factory):
        """Test that user cannot access email notification with different recipient."""
        user = User.objects.create_user(email="user1@example.com")
        notification = notification_factory(
            channel="email",
            recipient="user2@example.com",
        )

        request = self.factory.get("/")
        request.user = user

        assert self.permission.has_object_permission(request, None, notification) is False
