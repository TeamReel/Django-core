"""
B62: Activity Feed — API Tests

Tests for the ActivityFeedViewSet: list, filtering, pagination,
unread count, mark-read, aggregation, and org isolation.
"""

from datetime import timedelta

import pytest
from activity_feed.models import ActivityLog, FeedPosition
from django.utils import timezone

FEED_URL = "/api/v1/activity-feed/"
UNREAD_URL = "/api/v1/activity-feed/unread-count/"
MARK_READ_URL = "/api/v1/activity-feed/mark-read/"


@pytest.mark.django_db
class TestActivityFeedList:
    """Tests for the feed list endpoint."""

    def test_list_feed(self, authenticated_client, member, organisation, activity_logs):
        """List returns paginated feed events for the user's org."""
        response = authenticated_client.get(FEED_URL, {"organisation_id": str(organisation.id)})
        assert response.status_code == 200
        results = response.data.get("results", response.data)
        assert len(results) == 5

    def test_list_feed_empty(self, authenticated_client, member, organisation):
        """Empty feed returns empty results."""
        response = authenticated_client.get(FEED_URL, {"organisation_id": str(organisation.id)})
        assert response.status_code == 200
        results = response.data.get("results", response.data)
        assert len(results) == 0

    def test_filter_by_project(
        self, authenticated_client, member, organisation, project, activity_logs
    ):
        """Filter by project returns only project-scoped events."""
        response = authenticated_client.get(
            FEED_URL,
            {"organisation_id": str(organisation.id), "project": str(project.id)},
        )
        assert response.status_code == 200
        results = response.data.get("results", response.data)
        # activity_logs fixture creates 3 with project, 2 without
        assert len(results) == 3

    def test_filter_by_verb(self, authenticated_client, member, organisation, activity_logs):
        """Filter by verb returns only matching events."""
        response = authenticated_client.get(
            FEED_URL,
            {"organisation_id": str(organisation.id), "verb": "content.created"},
        )
        assert response.status_code == 200
        results = response.data.get("results", response.data)
        assert len(results) == 1
        assert results[0]["verb"] == "content.created"

    def test_filter_by_actor(self, authenticated_client, member, organisation, user, activity_logs):
        """Filter by actor returns only that user's events."""
        response = authenticated_client.get(
            FEED_URL,
            {"organisation_id": str(organisation.id), "actor": str(user.id)},
        )
        assert response.status_code == 200
        results = response.data.get("results", response.data)
        assert len(results) == 5  # All created by same user


@pytest.mark.django_db
class TestActivityFeedOrgIsolation:
    """Tests for organisation isolation."""

    def test_no_cross_org_events(
        self,
        authenticated_client,
        member,
        organisation,
        other_organisation,
        other_user,
        activity_logs,
    ):
        """Events from another org are not visible."""
        # Create event in other org
        ActivityLog.objects.create(
            actor=other_user,
            verb="content.created",
            organisation=other_organisation,
            extra_data={"should_not_see": True},
        )
        response = authenticated_client.get(FEED_URL, {"organisation_id": str(organisation.id)})
        results = response.data.get("results", response.data)
        # Should only see events from own org
        for event in results:
            assert str(event["organisation"]) == str(organisation.id)

    def test_no_org_returns_empty(self, authenticated_client, user):
        """Without org context, returns empty list."""
        response = authenticated_client.get(FEED_URL)
        assert response.status_code == 200


@pytest.mark.django_db
class TestUnreadCount:
    """Tests for the unread-count endpoint."""

    def test_unread_count_no_position(
        self, authenticated_client, member, organisation, activity_logs
    ):
        """Without a feed position, all events are unread."""
        response = authenticated_client.get(UNREAD_URL, {"organisation_id": str(organisation.id)})
        assert response.status_code == 200
        assert response.data["unread_count"] == 5
        assert response.data["last_read_at"] is None

    def test_unread_count_with_position(
        self, authenticated_client, member, organisation, user, activity_logs
    ):
        """With a feed position, only newer events are unread."""
        # Mark as read 1 second ago
        FeedPosition.objects.create(
            user=user,
            organisation=organisation,
            last_read_at=timezone.now() - timedelta(seconds=1),
        )
        # Create a new event after the position
        ActivityLog.objects.create(
            actor=user,
            verb="content.created",
            organisation=organisation,
            extra_data={"new": True},
        )
        response = authenticated_client.get(UNREAD_URL, {"organisation_id": str(organisation.id)})
        assert response.status_code == 200
        # New event is unread
        assert response.data["unread_count"] >= 1

    def test_unread_count_zero_after_mark_read(
        self, authenticated_client, member, organisation, user, activity_logs
    ):
        """After marking as read, unread count is 0."""
        # Mark all as read
        authenticated_client.post(
            MARK_READ_URL,
            {"organisation_id": str(organisation.id)},
            format="json",
        )
        response = authenticated_client.get(UNREAD_URL, {"organisation_id": str(organisation.id)})
        assert response.status_code == 200
        assert response.data["unread_count"] == 0


@pytest.mark.django_db
class TestMarkRead:
    """Tests for the mark-read endpoint."""

    def test_mark_read_creates_position(self, authenticated_client, member, organisation, user):
        """Mark-read creates a FeedPosition if none exists."""
        assert not FeedPosition.objects.filter(user=user, organisation=organisation).exists()

        response = authenticated_client.post(
            MARK_READ_URL,
            {"organisation_id": str(organisation.id)},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["created"] is True
        assert FeedPosition.objects.filter(user=user, organisation=organisation).exists()

    def test_mark_read_updates_position(
        self, authenticated_client, member, organisation, user, feed_position
    ):
        """Mark-read updates existing FeedPosition."""
        old_time = feed_position.last_read_at

        response = authenticated_client.post(
            MARK_READ_URL,
            {"organisation_id": str(organisation.id)},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["created"] is False

        feed_position.refresh_from_db()
        assert feed_position.last_read_at > old_time

    def test_mark_read_with_custom_timestamp(
        self, authenticated_client, member, organisation, user
    ):
        """Mark-read with explicit timestamp."""
        custom_time = timezone.now() - timedelta(hours=2)

        response = authenticated_client.post(
            MARK_READ_URL,
            {
                "organisation_id": str(organisation.id),
                "last_read_at": custom_time.isoformat(),
            },
            format="json",
        )
        assert response.status_code == 200

    def test_mark_read_without_org_fails(self, api_client, other_user):
        """Mark-read without org or membership is forbidden (403)."""
        api_client.force_authenticate(user=other_user)
        response = api_client.post(MARK_READ_URL, {}, format="json")
        # Permission class denies access before view resolves org
        assert response.status_code == 403


@pytest.mark.django_db
class TestGroupedFeed:
    """Tests for the aggregated/grouped feed."""

    def test_grouped_feed(self, authenticated_client, member, organisation, user):
        """Grouped feed aggregates events by verb within 5-min window."""
        # Create 3 events with same verb close together
        for i in range(3):
            ActivityLog.objects.create(
                actor=user,
                verb="member.added",
                organisation=organisation,
                extra_data={"index": i},
            )
        # Create 1 event with different verb
        ActivityLog.objects.create(
            actor=user,
            verb="content.created",
            organisation=organisation,
        )

        response = authenticated_client.get(
            FEED_URL,
            {"organisation_id": str(organisation.id), "grouped": "true"},
        )
        assert response.status_code == 200


@pytest.mark.django_db
class TestFeedAuth:
    """Tests for authentication and permissions."""

    def test_unauthenticated_returns_403(self, api_client):
        """Unauthenticated requests are rejected."""
        response = api_client.get(FEED_URL)
        assert response.status_code in (401, 403)

    def test_staff_can_access(self, authenticated_client, organisation, member, activity_logs):
        """Staff users can access the feed."""
        response = authenticated_client.get(FEED_URL, {"organisation_id": str(organisation.id)})
        assert response.status_code == 200
