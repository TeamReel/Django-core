"""
Test cases for soft-delete functionality on Period, Activity, and Participation.
Verifies SoftDeleteMixin integration and cascade behavior.
"""

from datetime import date, datetime, timezone

import pytest
from activities.models import Activity, Participation, Period


@pytest.mark.django_db
class TestPeriodSoftDelete:
    """Test Period soft-delete behavior."""

    def test_soft_delete_period(self, organisation, user):
        """Soft-deleting a period sets deleted_at and deleted_by."""
        period = Period.objects.create(
            name="Season 2024",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )

        period.soft_delete(user=user)
        period.refresh_from_db()

        assert period.deleted_at is not None
        assert period.deleted_by == user
        assert period.is_deleted is True

    def test_soft_deleted_period_excluded_from_default_queryset(self, organisation):
        """Soft-deleted periods are excluded from default queryset."""
        period = Period.objects.create(
            name="Deleted Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        period.soft_delete()

        assert Period.objects.filter(id=period.id).count() == 0
        assert Period.all_objects.filter(id=period.id).count() == 1

    def test_restore_period(self, organisation):
        """Restoring a period clears deleted_at and deleted_by."""
        period = Period.objects.create(
            name="Restored Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        period.soft_delete()

        # Use all_objects to find deleted period
        period = Period.all_objects.get(id=period.id)
        period.restore()
        period.refresh_from_db()

        assert period.deleted_at is None
        assert period.deleted_by is None
        assert period.is_deleted is False

    def test_cascade_soft_delete_to_activities(self, organisation, project):
        """Soft-deleting a period cascades to related activities."""
        period = Period.objects.create(
            name="Season with Activities",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Match",
            activity_type="match",
            start_time=datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc),
        )

        period.soft_delete()

        # Activity should be soft-deleted too (cascade)
        assert Activity.objects.filter(id=activity.id).count() == 0
        assert Activity.all_objects.filter(id=activity.id).count() == 1

    def test_cascade_soft_delete_to_children(self, organisation):
        """Soft-deleting a parent period cascades to child periods."""
        parent = Period.objects.create(
            name="Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        child = Period.objects.create(
            name="Competition",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 6, 30),
            parent_period=parent,
            organisation=organisation,
        )

        parent.soft_delete()

        # Child should be soft-deleted too (cascade)
        assert Period.objects.filter(id=child.id).count() == 0
        assert Period.all_objects.filter(id=child.id).count() == 1

    def test_deleted_only_queryset(self, organisation):
        """deleted_only() returns only soft-deleted periods."""
        active = Period.objects.create(
            name="Active Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        deleted = Period.objects.create(
            name="Deleted Season",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        deleted.soft_delete()

        deleted_periods = Period.objects.deleted_only()

        assert deleted_periods.count() == 1
        assert deleted_periods.first().id == deleted.id

    def test_with_deleted_queryset(self, organisation):
        """with_deleted() returns all periods including soft-deleted."""
        active = Period.objects.create(
            name="Active Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        deleted = Period.objects.create(
            name="Deleted Season",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        deleted.soft_delete()

        all_periods = Period.objects.with_deleted().filter(id__in=[active.id, deleted.id])

        assert all_periods.count() == 2

    def test_cte_methods_still_work(self, organisation):
        """Period CTE methods (roots, children_of) respect soft-delete."""
        parent = Period.objects.create(
            name="Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        child1 = Period.objects.create(
            name="Competition 1",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 6, 30),
            parent_period=parent,
            organisation=organisation,
        )
        child2 = Period.objects.create(
            name="Competition 2",
            start_date=date(2024, 7, 1),
            end_date=date(2024, 12, 31),
            parent_period=parent,
            organisation=organisation,
        )
        child1.soft_delete()

        # roots() should work
        roots = Period.objects.roots()
        assert parent in roots

        # children_of() should exclude soft-deleted
        children = Period.objects.children_of(parent)
        assert children.count() == 1
        assert child2 in children
        assert child1 not in children


@pytest.mark.django_db
class TestActivitySoftDelete:
    """Test Activity soft-delete behavior."""

    def test_soft_delete_activity(self, project, period, user):
        """Soft-deleting an activity sets deleted_at and deleted_by."""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Match to Delete",
            activity_type="match",
            start_time=datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc),
        )

        activity.soft_delete(user=user)
        activity.refresh_from_db()

        assert activity.deleted_at is not None
        assert activity.deleted_by == user
        assert activity.is_deleted is True

    def test_soft_deleted_activity_excluded_from_default_queryset(self, project, period):
        """Soft-deleted activities are excluded from default queryset."""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Deleted Match",
            activity_type="match",
            start_time=datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc),
        )
        activity.soft_delete()

        assert Activity.objects.filter(id=activity.id).count() == 0
        assert Activity.all_objects.filter(id=activity.id).count() == 1

    def test_restore_activity(self, project, period):
        """Restoring an activity clears deleted_at and deleted_by."""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Restored Match",
            activity_type="match",
            start_time=datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc),
        )
        activity.soft_delete()

        activity = Activity.all_objects.get(id=activity.id)
        activity.restore()
        activity.refresh_from_db()

        assert activity.deleted_at is None
        assert activity.deleted_by is None

    def test_cascade_soft_delete_to_participations(self, project, period, member):
        """Soft-deleting an activity cascades to related participations."""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Match with Lineup",
            activity_type="match",
            start_time=datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc),
        )
        participation = Participation.objects.create(
            activity=activity,
            member=member,
            role="starter",
        )

        activity.soft_delete()

        # Participation should be soft-deleted too (cascade)
        assert Participation.objects.filter(id=participation.id).count() == 0
        assert Participation.all_objects.filter(id=participation.id).count() == 1


@pytest.mark.django_db
class TestParticipationSoftDelete:
    """Test Participation soft-delete behavior."""

    def test_soft_delete_participation(self, activity, member, user):
        """Soft-deleting a participation sets deleted_at and deleted_by."""
        participation = Participation.objects.create(
            activity=activity,
            member=member,
            role="starter",
        )

        participation.soft_delete(user=user)
        participation.refresh_from_db()

        assert participation.deleted_at is not None
        assert participation.deleted_by == user
        assert participation.is_deleted is True

    def test_soft_deleted_participation_excluded_from_queryset(self, activity, member):
        """Soft-deleted participations are excluded from default queryset."""
        participation = Participation.objects.create(
            activity=activity,
            member=member,
            role="starter",
        )
        participation.soft_delete()

        assert Participation.objects.filter(id=participation.id).count() == 0
        assert Participation.all_objects.filter(id=participation.id).count() == 1

    def test_restore_participation(self, period, member):
        """Restoring a participation clears deleted_at and deleted_by."""
        participation = Participation.objects.create(
            period=period,
            member=member,
            role="squad_member",
        )
        participation.soft_delete()

        participation = Participation.all_objects.get(id=participation.id)
        participation.restore()
        participation.refresh_from_db()

        assert participation.deleted_at is None
        assert participation.deleted_by is None


@pytest.mark.django_db
class TestTrashItemIntegration:
    """Test TrashItem is created when soft-deleting activities models."""

    def test_period_soft_delete_creates_trash_item(self, organisation, user):
        """Soft-deleting a period creates a TrashItem."""
        from django.contrib.contenttypes.models import ContentType
        from trash.models import TrashItem

        period = Period.objects.create(
            name="Trash Test Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )

        period.soft_delete(user=user)

        ct = ContentType.objects.get_for_model(Period)
        trash_item = TrashItem.objects.filter(
            content_type=ct,
            object_id=period.id,
        ).first()

        assert trash_item is not None
        assert trash_item.deleted_by == user
        assert trash_item.organisation == organisation
        assert "Trash Test Season" in trash_item.object_repr

    def test_activity_soft_delete_creates_trash_item(self, project, period, user):
        """Soft-deleting an activity creates a TrashItem."""
        from django.contrib.contenttypes.models import ContentType
        from trash.models import TrashItem

        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Trash Test Match",
            activity_type="match",
            start_time=datetime(2024, 6, 15, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 6, 15, 16, 0, tzinfo=timezone.utc),
        )

        activity.soft_delete(user=user)

        ct = ContentType.objects.get_for_model(Activity)
        trash_item = TrashItem.objects.filter(
            content_type=ct,
            object_id=activity.id,
        ).first()

        assert trash_item is not None
        assert trash_item.deleted_by == user
        assert "Trash Test Match" in trash_item.object_repr

    def test_restore_removes_trash_item(self, organisation, user):
        """Restoring an item removes its TrashItem."""
        from django.contrib.contenttypes.models import ContentType
        from trash.models import TrashItem

        period = Period.objects.create(
            name="Restore Test Season",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
            organisation=organisation,
        )
        period.soft_delete(user=user)

        # Verify TrashItem exists
        ct = ContentType.objects.get_for_model(Period)
        assert TrashItem.objects.filter(content_type=ct, object_id=period.id).exists()

        # Restore
        period = Period.all_objects.get(id=period.id)
        period.restore()

        # TrashItem should be removed
        assert not TrashItem.objects.filter(content_type=ct, object_id=period.id).exists()
