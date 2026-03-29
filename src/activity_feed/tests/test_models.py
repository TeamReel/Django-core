"""
B62: Activity Feed — Model Tests

Tests for ActivityLog and FeedPosition models.
"""

import uuid

import pytest
from activity_feed.models import ActivityLog, FeedPosition, VerbChoices
from django.utils import timezone


@pytest.mark.django_db
class TestActivityLog:
    """Tests for the ActivityLog model."""

    def test_create_activity_log(self, user, organisation, project):
        """ActivityLog can be created with all required fields."""
        log = ActivityLog.objects.create(
            actor=user,
            verb="content.created",
            organisation=organisation,
            project=project,
            extra_data={"title": "Test"},
        )
        assert log.pk is not None
        assert isinstance(log.pk, uuid.UUID)
        assert log.verb == "content.created"
        assert log.organisation == organisation
        assert log.created_at is not None

    def test_uuid_primary_key(self, activity_log):
        """ActivityLog uses UUID primary key."""
        assert isinstance(activity_log.pk, uuid.UUID)

    def test_str_representation(self, activity_log):
        """__str__ includes verb and actor email."""
        s = str(activity_log)
        assert "content.created" in s
        assert "feed-test@example.com" in s

    def test_str_without_actor(self, organisation):
        """__str__ shows 'system' when no actor."""
        log = ActivityLog.objects.create(
            actor=None,
            verb="season.started",
            organisation=organisation,
        )
        assert "system" in str(log)

    def test_ordering_newest_first(self, user, organisation):
        """Events are ordered by -created_at (newest first)."""
        from datetime import timedelta

        from django.utils import timezone as tz

        now = tz.now()
        log1 = ActivityLog.objects.create(
            actor=user, verb="content.created", organisation=organisation
        )
        # Force a later created_at so ordering is deterministic
        ActivityLog.objects.filter(pk=log1.pk).update(created_at=now - timedelta(seconds=10))
        log1.refresh_from_db()

        log2 = ActivityLog.objects.create(
            actor=user, verb="content.approved", organisation=organisation
        )
        logs = list(ActivityLog.objects.filter(organisation=organisation))
        assert logs[0] == log2
        assert logs[1] == log1

    def test_extra_data_json_field(self, user, organisation):
        """extra_data stores arbitrary JSON."""
        log = ActivityLog.objects.create(
            actor=user,
            verb="content.created",
            organisation=organisation,
            extra_data={"title": "Test", "score": {"home": 2, "away": 1}},
        )
        log.refresh_from_db()
        assert log.extra_data["title"] == "Test"
        assert log.extra_data["score"]["home"] == 2

    def test_extra_data_default_empty_dict(self, user, organisation):
        """extra_data defaults to empty dict."""
        log = ActivityLog.objects.create(
            actor=user, verb="content.created", organisation=organisation
        )
        assert log.extra_data == {}

    def test_nullable_actor(self, organisation):
        """Actor can be null (system events)."""
        log = ActivityLog.objects.create(
            actor=None, verb="season.started", organisation=organisation
        )
        assert log.actor is None

    def test_nullable_project(self, user, organisation):
        """Project can be null (org-wide events)."""
        log = ActivityLog.objects.create(
            actor=user, verb="season.started", organisation=organisation, project=None
        )
        assert log.project is None

    def test_verb_choices_defined(self):
        """VerbChoices enum has expected values."""
        assert VerbChoices.CONTENT_CREATED == "content.created"
        assert VerbChoices.MATCH_CREATED == "match.created"
        assert VerbChoices.MEMBER_ADDED == "member.added"
        assert VerbChoices.SEASON_STARTED == "season.started"

    def test_org_index_used(self, user, organisation):
        """Composite index on (organisation, created_at) exists for fast queries."""
        index_names = [idx.name for idx in ActivityLog._meta.indexes]
        assert "actfeed_org_created_desc" in index_names


@pytest.mark.django_db
class TestFeedPosition:
    """Tests for the FeedPosition model."""

    def test_create_feed_position(self, user, organisation):
        """FeedPosition can be created."""
        now = timezone.now()
        pos = FeedPosition.objects.create(user=user, organisation=organisation, last_read_at=now)
        assert pos.pk is not None
        assert pos.last_read_at == now

    def test_uuid_primary_key(self, feed_position):
        """FeedPosition uses UUID primary key."""
        assert isinstance(feed_position.pk, uuid.UUID)

    def test_unique_per_user_org(self, user, organisation):
        """Only one FeedPosition per user per org."""
        FeedPosition.objects.create(
            user=user, organisation=organisation, last_read_at=timezone.now()
        )
        with pytest.raises(Exception):  # IntegrityError
            FeedPosition.objects.create(
                user=user, organisation=organisation, last_read_at=timezone.now()
            )

    def test_str_representation(self, feed_position):
        """__str__ includes user and org."""
        s = str(feed_position)
        assert "FeedPosition" in s

    def test_updated_at_auto(self, feed_position):
        """updated_at is set automatically."""
        assert feed_position.updated_at is not None
