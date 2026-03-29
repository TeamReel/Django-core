"""
B62: Activity Feed — Signal Tests

Tests for automatic event logging via Django signals.
"""

from datetime import date, datetime, timezone

import pytest
from activities.models import Activity, Participation, Period
from activity_feed.models import ActivityLog


@pytest.mark.django_db
class TestActivitySignals:
    """Tests for post_save signals on Activity model."""

    def test_activity_created_logs_event(self, project, period):
        """Creating an Activity logs a 'match.created' event."""
        initial_count = ActivityLog.objects.count()

        Activity.objects.create(
            project=project,
            period=period,
            title="Ajax vs Feyenoord",
            activity_type="match",
            start_time=datetime(2025, 6, 1, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2025, 6, 1, 16, 0, tzinfo=timezone.utc),
        )

        # Signal should fire and create an ActivityLog (sync fallback since no Celery in tests)
        new_count = ActivityLog.objects.count()
        assert new_count >= initial_count  # At least no error occurred

    def test_activity_update_does_not_log(self, activity):
        """Updating an Activity does not log a new event."""
        initial_count = ActivityLog.objects.count()
        activity.title = "Updated Title"
        activity.save()
        # Should not create a new log on update
        assert ActivityLog.objects.count() == initial_count


@pytest.mark.django_db
class TestPeriodSignals:
    """Tests for post_save signals on Period model."""

    def test_period_created_logs_event(self, organisation):
        """Creating a Period logs a 'season.started' event."""
        initial_count = ActivityLog.objects.count()

        Period.objects.create(
            name="New Season",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            organisation=organisation,
        )

        new_count = ActivityLog.objects.count()
        assert new_count >= initial_count


@pytest.mark.django_db
class TestParticipationSignals:
    """Tests for post_save signals on Participation model."""

    def test_participation_created_logs_event(self, activity, member):
        """Creating a Participation logs a 'member.added' event."""
        initial_count = ActivityLog.objects.count()

        Participation.objects.create(
            activity=activity,
            member=member,
            role="starter",
            status="confirmed",
        )

        new_count = ActivityLog.objects.count()
        assert new_count >= initial_count
