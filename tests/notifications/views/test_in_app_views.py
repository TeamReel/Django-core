"""Tests for in-app notification API endpoints."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for testing."""
    return APIClient()


@pytest.fixture(autouse=True)
def disable_throttling(settings):
    """Disable API throttling for tests (avoids Redis dependency)."""
    settings.REST_FRAMEWORK = {
        **getattr(settings, "REST_FRAMEWORK", {}),
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    }


@pytest.mark.django_db
class TestInAppNotificationAPI:
    """Test suite for in-app notification API endpoints."""

    def test_list_user_notifications(self, api_client, notification_factory):
        """Test that user only sees their own in-app notifications."""
        user1 = User.objects.create_user(email="user1@example.com")
        user2 = User.objects.create_user(email="user2@example.com")

        # Create notifications for both users
        notif1 = notification_factory(
            channel="in_app", recipient_user=user1, recipient="user1@example.com"
        )
        notification_factory(channel="in_app", recipient_user=user2, recipient="user2@example.com")

        # User1 queries
        api_client.force_authenticate(user=user1)
        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == str(notif1.id)

    def test_unauthenticated_user_denied(self, api_client):
        """Test that unauthenticated users cannot access notifications."""
        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_mark_notification_as_read(self, api_client, notification_factory):
        """Test marking a notification as read."""
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=None,
        )

        api_client.force_authenticate(user=user)
        url = reverse("notifications:notification-mark-read", args=[notification.id])
        response = api_client.put(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "read"
        assert "read_at" in response.data

        # Verify database updated
        notification.refresh_from_db()
        assert notification.read_at is not None

    def test_mark_read_is_idempotent(self, api_client, notification_factory):
        """Test that marking as read multiple times doesn't change read_at."""
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
        )

        # Mark as read first time
        api_client.force_authenticate(user=user)
        url = reverse("notifications:notification-mark-read", args=[notification.id])
        response1 = api_client.put(url)
        first_read_at = response1.data["read_at"]

        # Mark as read second time
        response2 = api_client.put(url)
        second_read_at = response2.data["read_at"]

        # read_at should not change
        assert first_read_at == second_read_at

    def test_cannot_mark_email_notification_as_read(self, api_client, notification_factory):
        """Test that non-in-app notifications cannot be marked as read.

        Since get_queryset filters to in-app only for non-admins,
        email notifications will return 404 (not found) not 400.
        """
        user = User.objects.create_user(email="user@example.com")
        notification = notification_factory(
            channel="email",
            recipient="user@example.com",
        )

        api_client.force_authenticate(user=user)
        url = reverse("notifications:notification-mark-read", args=[notification.id])
        response = api_client.put(url)

        # Email notification filtered out by get_queryset -> 404
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_user_cannot_mark_other_users_notification_as_read(
        self, api_client, notification_factory
    ):
        """Test permission enforcement for mark-as-read."""
        user1 = User.objects.create_user(email="user1@example.com")
        user2 = User.objects.create_user(email="user2@example.com")
        notification = notification_factory(
            channel="in_app",
            recipient_user=user2,
            recipient="user2@example.com",
        )

        # User1 tries to mark user2's notification
        api_client.force_authenticate(user=user1)
        url = reverse("notifications:notification-mark-read", args=[notification.id])
        response = api_client.put(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_all_read(self, api_client, notification_factory):
        """Test bulk mark-all-read endpoint."""
        user = User.objects.create_user(email="user@example.com")

        # Create mix of read and unread notifications
        notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=None,
        )
        notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=None,
        )
        notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=timezone.now(),  # Already read
        )

        api_client.force_authenticate(user=user)
        url = reverse("notifications:notification-mark-all-read")
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert response.data["marked_read"] == 2  # Only unread ones

    def test_mark_all_read_only_affects_user_notifications(self, api_client, notification_factory):
        """Test that mark-all-read only affects current user."""
        user1 = User.objects.create_user(email="user1@example.com")
        user2 = User.objects.create_user(email="user2@example.com")

        # Create unread for both users
        notification_factory(
            channel="in_app",
            recipient_user=user1,
            recipient="user1@example.com",
            read_at=None,
        )
        notif2 = notification_factory(
            channel="in_app",
            recipient_user=user2,
            recipient="user2@example.com",
            read_at=None,
        )

        # User1 marks all read
        api_client.force_authenticate(user=user1)
        url = reverse("notifications:notification-mark-all-read")
        response = api_client.post(url)

        assert response.data["marked_read"] == 1

        # User2's notification still unread
        notif2.refresh_from_db()
        assert notif2.read_at is None

    def test_filter_unread_notifications(self, api_client, notification_factory):
        """Test filtering for unread notifications."""
        user = User.objects.create_user(email="user@example.com")

        # Create mix
        unread = notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=None,
        )
        notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=timezone.now(),
        )

        api_client.force_authenticate(user=user)
        url = reverse("notifications:notification-list") + "?unread=true"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == str(unread.id)

    def test_filter_read_notifications(self, api_client, notification_factory):
        """Test filtering for read notifications."""
        user = User.objects.create_user(email="user@example.com")

        # Create mix
        notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=None,
        )
        read_notif = notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
            read_at=timezone.now(),
        )

        api_client.force_authenticate(user=user)
        url = reverse("notifications:notification-list") + "?read=true"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == str(read_notif.id)

    def test_admin_can_see_all_notifications(self, api_client, notification_factory):
        """Test that admin users can see all in-app notifications."""
        admin = User.objects.create_user(email="admin@example.com", is_staff=True)
        user = User.objects.create_user(email="user@example.com")

        notification_factory(
            channel="in_app",
            recipient_user=user,
            recipient="user@example.com",
        )

        api_client.force_authenticate(user=admin)
        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        # Admin should see user's notification
        assert response.status_code == status.HTTP_200_OK
