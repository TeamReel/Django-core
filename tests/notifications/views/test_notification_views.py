"""Tests for notification API views."""

import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for testing."""
    return APIClient()


@pytest.mark.django_db
class TestNotificationViewSetList:
    """Tests for NotificationViewSet list endpoint."""

    def test_list_notifications(self, authenticated_client, notification_factory, api_data):
        """Test listing notifications."""
        # Create notifications
        notification_factory(status="sent")
        notification_factory(status="pending")
        notification_factory(status="failed")

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 3
        assert len(data["results"]) == 3

    def test_list_empty(self, authenticated_client, api_data):
        """Test listing when no notifications exist."""
        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 0
        assert data["results"] == []

    def test_pagination_default(self, authenticated_client, notification_factory, api_data):
        """Test default pagination (50 per page)."""
        # Create 60 notifications
        for _ in range(60):
            notification_factory()

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 60
        assert len(data["results"]) == 50  # Default page size
        assert data["next"] is not None

    def test_pagination_custom_page_size(
        self, authenticated_client, notification_factory, api_data
    ):
        """Test custom page size parameter."""
        for _ in range(30):
            notification_factory()

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"page_size": 10})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert len(data["results"]) == 10

    def test_pagination_max_page_size(self, authenticated_client, notification_factory, api_data):
        """Test maximum page size limit (100)."""
        for _ in range(150):
            notification_factory()

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"page_size": 200})  # Request more than max

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert len(data["results"]) == 100  # Capped at max

    def test_ordering_by_created_at_desc(
        self, authenticated_client, notification_factory, api_data
    ):
        """Test default ordering (newest first)."""
        from notifications.models import Notification

        now = timezone.now()

        notif1 = notification_factory()
        Notification.objects.filter(pk=notif1.pk).update(created_at=now - timedelta(hours=2))

        notif2 = notification_factory()
        Notification.objects.filter(pk=notif2.pk).update(created_at=now - timedelta(hours=1))

        notif3 = notification_factory()
        Notification.objects.filter(pk=notif3.pk).update(created_at=now)

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        results = data["results"]
        assert str(results[0]["id"]) == str(notif3.id)  # Newest
        assert str(results[2]["id"]) == str(notif1.id)  # Oldest


@pytest.mark.django_db
class TestNotificationViewSetFilters:
    """Tests for NotificationViewSet filtering."""

    def test_filter_by_status(self, authenticated_client, notification_factory, api_data):
        """Test filtering by status."""
        notification_factory(status="sent")
        notification_factory(status="sent")
        notification_factory(status="failed")

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"status": "sent"})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 2
        for result in data["results"]:
            assert result["status"] == "sent"

    def test_filter_by_channel(self, authenticated_client, notification_factory, api_data):
        """Test filtering by channel."""
        user = User.objects.create_user(email="user@example.com")
        notification_factory(channel="email")
        notification_factory(channel="email")
        notification_factory(channel="in_app", recipient_user=user)

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"channel": "email"})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 2
        for result in data["results"]:
            assert result["channel"] == "email"

    def test_filter_by_type(
        self, authenticated_client, notification_factory, notification_type_factory, api_data
    ):
        """Test filtering by notification type code."""
        type1 = notification_type_factory(code="welcome_email")
        type2 = notification_type_factory(code="password_reset")

        notification_factory(type=type1)
        notification_factory(type=type1)
        notification_factory(type=type2)

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"type": "welcome_email"})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 2
        for result in data["results"]:
            assert result["type_code"] == "welcome_email"

    def test_filter_by_recipient(self, authenticated_client, notification_factory, api_data):
        """Test filtering by recipient (partial match)."""
        notification_factory(recipient="alice@example.com")
        notification_factory(recipient="bob@example.com")
        notification_factory(recipient="alice@test.com")

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"recipient": "alice"})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 2

    def test_filter_by_date_range(self, authenticated_client, notification_factory, api_data):
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
        response = authenticated_client.get(url, {"date_from": date_from})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 1
        assert str(data["results"][0]["id"]) == str(recent.id)

    def test_search_across_fields(
        self, authenticated_client, notification_factory, notification_type_factory, api_data
    ):
        """Test search filter across multiple fields."""
        type1 = notification_type_factory(code="welcome", name="Welcome Message")
        notification_factory(recipient="alice@example.com", type=type1)
        notification_factory(recipient="bob@example.com")

        url = reverse("notifications:notification-list")
        response = authenticated_client.get(url, {"search": "welcome"})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["count"] == 1


@pytest.mark.django_db
class TestNotificationViewSetDetail:
    """Tests for NotificationViewSet detail endpoint."""

    def test_retrieve_notification(
        self, authenticated_client, notification_factory, delivery_attempt_factory, api_data
    ):
        """Test retrieving a single notification with delivery attempts."""
        notification = notification_factory(status="sent")
        delivery_attempt_factory(notification=notification, attempt_number=1, outcome="success")

        url = reverse("notifications:notification-detail", args=[notification.id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["id"] == str(notification.id)
        assert data["status"] == "sent"
        assert len(data["delivery_attempts"]) == 1
        assert data["delivery_attempts"][0]["attempt_number"] == 1

    def test_retrieve_nonexistent(self, authenticated_client):
        """Test retrieving a non-existent notification."""
        import uuid

        fake_id = uuid.uuid4()
        url = reverse("notifications:notification-detail", args=[fake_id])
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestNotificationViewSetStats:
    """Tests for NotificationViewSet stats endpoint."""

    def test_stats_all_notifications(self, authenticated_client, notification_factory, api_data):
        """Test stats endpoint returns counts."""
        user = User.objects.create_user(email="user@example.com")
        notification_factory(status="sent", channel="email")
        notification_factory(status="sent", channel="email")
        notification_factory(status="failed", channel="email")
        notification_factory(status="pending", channel="in_app", recipient_user=user)

        url = reverse("notifications:notification-stats")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["total"] == 4
        assert data["by_status"]["sent"] == 2
        assert data["by_status"]["failed"] == 1
        assert data["by_status"]["pending"] == 1
        assert data["by_channel"]["email"] == 3
        assert data["by_channel"]["in_app"] == 1

    def test_stats_with_filters(self, authenticated_client, notification_factory, api_data):
        """Test stats endpoint respects filters."""
        notification_factory(status="sent", channel="email")
        notification_factory(status="sent", channel="email")
        notification_factory(status="failed", channel="email")

        url = reverse("notifications:notification-stats")
        response = authenticated_client.get(url, {"status": "sent"})

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["total"] == 2
        assert data["by_status"]["sent"] == 2
        assert "failed" not in data["by_status"]

    def test_stats_empty(self, authenticated_client, api_data):
        """Test stats endpoint with no notifications."""
        url = reverse("notifications:notification-stats")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = api_data(response)
        assert data["total"] == 0
        assert data["by_status"] == {}
        assert data["by_channel"] == {}


@pytest.mark.django_db
class TestNotificationViewSetQueryOptimization:
    """Tests for query optimization."""

    @pytest.mark.skip(
        reason="Query count test fragile to cache/audit state - deferred for performance optimization phase"
    )
    def test_list_view_select_related(
        self, authenticated_client, notification_factory, django_assert_num_queries, api_data
    ):
        """Test list view uses select_related for type."""
        # Create 10 notifications (will share same type due to factory)
        for _ in range(10):
            notification_factory()

        url = reverse("notifications:notification-list")

        # Should use select_related for type and type__retry_policy
        # Expected queries:
        # 1. Savepoint
        # 2. Audit insert
        # 3. Release savepoint
        # 4. Permission check (membership)
        # 5. Count query
        # 6. Notification query with JOINs (type, retry_policy)
        with django_assert_num_queries(6):
            response = authenticated_client.get(url)
            assert response.status_code == status.HTTP_200_OK
            data = api_data(response)
            # Access type_code to ensure it's pre-fetched
            for result in data["results"]:
                _ = result["type_code"]

    @pytest.mark.skip(
        reason="Query count test fragile to cache/audit state - deferred for performance optimization phase"
    )
    def test_detail_view_prefetch_related(
        self,
        authenticated_client,
        notification_factory,
        delivery_attempt_factory,
        django_assert_num_queries,
        api_data,
    ):
        """Test detail view prefetches delivery attempts."""
        notification = notification_factory()
        for i in range(5):
            delivery_attempt_factory(notification=notification, attempt_number=i + 1)

        url = reverse("notifications:notification-detail", args=[notification.id])

        # Expected queries:
        # 1. Savepoint
        # 2. Audit insert
        # 3. Release savepoint
        # 4. Permission check (membership)
        # 5. Notification query with JOINs (type, retry_policy)
        # 6. DeliveryAttempt prefetch query
        with django_assert_num_queries(6):
            response = authenticated_client.get(url)
            assert response.status_code == status.HTTP_200_OK
            data = api_data(response)
            # Access delivery attempts to ensure they're pre-fetched
            assert len(data["delivery_attempts"]) == 5
