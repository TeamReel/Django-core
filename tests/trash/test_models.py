"""Tests for trash model and signal integration."""

import pytest
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from projects.models.project_membership import ProjectMembership
from trash.models import TrashItem


@pytest.mark.django_db
class TestTrashItemModel:
    """Test TrashItem model."""

    def test_trash_item_created_on_soft_delete(self, membership, user):
        """Signal creates TrashItem when membership is soft-deleted."""
        membership.soft_delete(user=user)

        assert TrashItem.objects.count() == 1
        item = TrashItem.objects.first()
        ct = ContentType.objects.get_for_model(ProjectMembership)
        assert item.content_type == ct
        assert item.object_id == membership.pk
        assert item.deleted_by == user
        assert item.organisation == membership.project.organisation

    def test_trash_item_removed_on_restore(self, membership, user):
        """Signal removes TrashItem when membership is restored."""
        membership.soft_delete(user=user)
        assert TrashItem.objects.count() == 1

        membership.restore()
        assert TrashItem.objects.count() == 0

    def test_trash_item_expires_at_calculated(self, membership, user):
        """TrashItem gets correct expiration based on retention setting."""
        before = timezone.now()
        membership.soft_delete(user=user)

        item = TrashItem.objects.first()
        # Default 30 day retention
        assert item.expires_at > before
        delta = item.expires_at - item.deleted_at
        assert delta.days == 30

    def test_trash_item_stores_object_repr(self, membership, user):
        """TrashItem stores string representation of the deleted object."""
        membership.soft_delete(user=user)

        item = TrashItem.objects.first()
        assert item.object_repr != ""
        assert len(item.object_repr) <= 255

    def test_trash_item_stores_original_data(self, membership, user):
        """TrashItem snapshots key fields for preview."""
        membership.soft_delete(user=user)

        item = TrashItem.objects.first()
        assert isinstance(item.original_data, dict)
        assert "role" in item.original_data

    def test_trash_item_unique_per_object(self, membership, user):
        """Only one TrashItem per object (update_or_create pattern)."""
        membership.soft_delete(user=user)
        assert TrashItem.objects.count() == 1

        # Simulate re-soft-delete (shouldn't create duplicate)
        membership.deleted_at = timezone.now()
        membership.save(update_fields=["deleted_at"])
        assert TrashItem.objects.count() == 1

    def test_trash_item_is_expired_property(self, membership, user):
        """is_expired property works correctly."""
        membership.soft_delete(user=user)
        item = TrashItem.objects.first()

        # Not expired yet (30 day retention)
        assert not item.is_expired

        # Backdate to expired
        item.expires_at = timezone.now() - timezone.timedelta(days=1)
        item.save()
        assert item.is_expired

    def test_no_trash_item_for_non_soft_delete_save(self, membership):
        """Normal saves (without deleted_at change) don't create TrashItem."""
        membership.role = ProjectMembership.Role.VIEWER
        membership.save()
        assert TrashItem.objects.count() == 0

    def test_trash_item_str(self, membership, user):
        """TrashItem __str__ includes object repr and date."""
        membership.soft_delete(user=user)
        item = TrashItem.objects.first()
        assert "Trash:" in str(item)
        assert "deleted" in str(item)
