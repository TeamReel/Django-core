"""
Soft-delete managers for TeamReel.

Provides QuerySet and Manager classes that automatically exclude
soft-deleted records from default queries.

Usage:
    class MyModel(SoftDeleteMixin, models.Model):
        objects = SoftDeleteManager()
        all_objects = AllObjectsManager()
"""

from django.db import models


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that supports bulk soft-delete and restore."""

    def soft_delete(self, user=None):
        """Bulk soft-delete all items in this queryset."""
        from django.utils import timezone

        update_kwargs = {"deleted_at": timezone.now()}
        if user is not None:
            update_kwargs["deleted_by"] = user
        return self.filter(deleted_at__isnull=True).update(**update_kwargs)

    def restore(self):
        """Bulk restore all soft-deleted items in this queryset."""
        return self.filter(deleted_at__isnull=False).update(deleted_at=None, deleted_by=None)

    def delete(self):
        """Override delete to soft-delete by default."""
        return self.soft_delete()

    def hard_delete(self):
        """Permanently delete records (bypasses soft-delete)."""
        return super().delete()


class SoftDeleteManager(models.Manager):
    """
    Default manager that excludes soft-deleted records.

    Provides:
        - objects.all()          → only active (non-deleted) records
        - objects.deleted_only() → only soft-deleted records
        - objects.with_deleted() → all records including deleted
    """

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)

    def deleted_only(self):
        """Return only soft-deleted records."""
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=False)

    def with_deleted(self):
        """Return all records including soft-deleted."""
        return SoftDeleteQuerySet(self.model, using=self._db)


class AllObjectsManager(models.Manager):
    """Manager that includes all records (including soft-deleted). For admin/internal use."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)
