"""Tests for notification API views."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """API client for testing."""
    return APIClient()


@pytest.mark.django_db
class TestNotificationViewSetList:
    """Tests for NotificationViewSet list endpoint."""

    def test_list_notifications(self, api_client, notification_factory):
        """Test listing notifications."""
        # Create notifications
        notification_factory(status="sent")
        notification_factory(status="pending")
        notification_factory(status="failed")

        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 3
        assert len(response.data["results"]) == 3

    def test_list_empty(self, api_client):
        """Test listing when no notifications exist."""
        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 0
        assert response.data["results"] == []

    def test_pagination_default(self, api_client, notification_factory):
        """Test default pagination (50 per page)."""
        # Create 60 notifications
        for _ in range(60):
            notification_factory()

        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 60
        assert len(response.data["results"]) == 50  # Default page size
        assert response.data["next"] is not None

    def test_pagination_custom_page_size(self, api_client, notification_factory):
        """Test custom page size parameter."""
        for _ in range(30):
            notification_factory()

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"page_size": 10})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 10

    def test_pagination_max_page_size(self, api_client, notification_factory):
        """Test maximum page size limit (100)."""
        for _ in range(150):
            notification_factory()

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"page_size": 200})  # Request more than max

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 100  # Capped at max

    def test_ordering_by_created_at_desc(self, api_client, notification_factory):
        """Test default ordering (newest first)."""
        notif1 = notification_factory()
        notification_factory()  # notif2
        notif3 = notification_factory()

        url = reverse("notifications:notification-list")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert str(results[0]["id"]) == str(notif3.id)  # Newest
        assert str(results[2]["id"]) == str(notif1.id)  # Oldest


@pytest.mark.django_db
class TestNotificationViewSetFilters:
    """Tests for NotificationViewSet filtering."""

    def test_filter_by_status(self, api_client, notification_factory):
        """Test filtering by status."""
        notification_factory(status="sent")
        notification_factory(status="sent")
        notification_factory(status="failed")

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"status": "sent"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        for result in response.data["results"]:
            assert result["status"] == "sent"

    def test_filter_by_channel(self, api_client, notification_factory):
        """Test filtering by channel."""
        notification_factory(channel="email")
        notification_factory(channel="email")
        notification_factory(channel="in_app")

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"channel": "email"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        for result in response.data["results"]:
            assert result["channel"] == "email"

    def test_filter_by_type(self, api_client, notification_factory, notification_type_factory):
        """Test filtering by notification type code."""
        type1 = notification_type_factory(code="welcome_email")
        type2 = notification_type_factory(code="password_reset")

        notification_factory(type=type1)
        notification_factory(type=type1)
        notification_factory(type=type2)

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"type": "welcome_email"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2
        for result in response.data["results"]:
            assert result["type_code"] == "welcome_email"

    def test_filter_by_recipient(self, api_client, notification_factory):
        """Test filtering by recipient (partial match)."""
        notification_factory(recipient="alice@example.com")
        notification_factory(recipient="bob@example.com")
        notification_factory(recipient="alice@test.com")

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"recipient": "alice"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_filter_by_date_range(self, api_client, notification_factory):
        """Test filtering by date range."""
        from datetime import timedelta

        from django.utils import timezone

        # Create notifications at different times
        old = notification_factory()
        old.created_at = timezone.now() - timedelta(days=10)
        old.save(update_fields=["created_at"])

        recent = notification_factory()

        url = reverse("notifications:notification-list")
        date_from = (timezone.now() - timedelta(days=5)).isoformat()
        response = api_client.get(url, {"date_from": date_from})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert str(response.data["results"][0]["id"]) == str(recent.id)

    def test_search_across_fields(
        self, api_client, notification_factory, notification_type_factory
    ):
        """Test search filter across multiple fields."""
        type1 = notification_type_factory(code="welcome", name="Welcome Message")
        notification_factory(recipient="alice@example.com", type=type1)
        notification_factory(recipient="bob@example.com")

        url = reverse("notifications:notification-list")
        response = api_client.get(url, {"search": "welcome"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1


@pytest.mark.django_db
class TestNotificationViewSetDetail:
    """Tests for NotificationViewSet detail endpoint."""

    def test_retrieve_notification(
        self, api_client, notification_factory, delivery_attempt_factory
    ):
        """Test retrieving a single notification with delivery attempts."""
        notification = notification_factory(status="sent")
        delivery_attempt_factory(notification=notification, attempt_number=1, outcome="success")

        url = reverse("notifications:notification-detail", args=[notification.id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(notification.id)
        assert response.data["status"] == "sent"
        assert len(response.data["delivery_attempts"]) == 1
        assert response.data["delivery_attempts"][0]["attempt_number"] == 1

    def test_retrieve_nonexistent(self, api_client):
        """Test retrieving a non-existent notification."""
        import uuid

        fake_id = uuid.uuid4()
        url = reverse("notifications:notification-detail", args=[fake_id])
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationViewSetStats:
    """Tests for NotificationViewSet stats endpoint."""

    def test_stats_all_notifications(self, api_client, notification_factory):
        """Test stats endpoint returns counts."""
        notification_factory(status="sent", channel="email")
        notification_factory(status="sent", channel="email")
        notification_factory(status="failed", channel="email")
        notification_factory(status="pending", channel="in_app")

        url = reverse("notifications:notification-stats")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 4
        assert response.data["by_status"]["sent"] == 2
        assert response.data["by_status"]["failed"] == 1
        assert response.data["by_status"]["pending"] == 1
        assert response.data["by_channel"]["email"] == 3
        assert response.data["by_channel"]["in_app"] == 1

    def test_stats_with_filters(self, api_client, notification_factory):
        """Test stats endpoint respects filters."""
        notification_factory(status="sent", channel="email")
        notification_factory(status="sent", channel="email")
        notification_factory(status="failed", channel="email")

        url = reverse("notifications:notification-stats")
        response = api_client.get(url, {"status": "sent"})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 2
        assert response.data["by_status"]["sent"] == 2
        assert "failed" not in response.data["by_status"]

    def test_stats_empty(self, api_client):
        """Test stats endpoint with no notifications."""
        url = reverse("notifications:notification-stats")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["total"] == 0
        assert response.data["by_status"] == {}
        assert response.data["by_channel"] == {}


@pytest.mark.django_db
class TestNotificationViewSetQueryOptimization:
    """Tests for query optimization."""

    def test_list_view_select_related(
        self, api_client, notification_factory, django_assert_num_queries
    ):
        """Test list view uses select_related for type."""
        # Create 10 notifications (will share same type due to factory)
        for _ in range(10):
            notification_factory()

        url = reverse("notifications:notification-list")

        # Should use select_related for type and type__retry_policy
        # Expected queries:
        # 1. Count query
        # 2. Notification query with JOINs (type, retry_policy)
        with django_assert_num_queries(2):
            response = api_client.get(url)
            assert response.status_code == status.HTTP_200_OK
            # Access type_code to ensure it's pre-fetched
            for result in response.data["results"]:
                _ = result["type_code"]

    def test_detail_view_prefetch_related(
        self, api_client, notification_factory, delivery_attempt_factory, django_assert_num_queries
    ):
        """Test detail view prefetches delivery attempts."""
        notification = notification_factory()
        for i in range(5):
            delivery_attempt_factory(notification=notification, attempt_number=i + 1)

        url = reverse("notifications:notification-detail", args=[notification.id])

        # Expected queries:
        # 1. Notification query with JOINs (type, retry_policy)
        # 2. DeliveryAttempt prefetch query
        with django_assert_num_queries(2):
            response = api_client.get(url)
            assert response.status_code == status.HTTP_200_OK
            # Access delivery attempts to ensure they're pre-fetched
            assert len(response.data["delivery_attempts"]) == 5
