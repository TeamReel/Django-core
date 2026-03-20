"""
Soft-delete mixin for TeamReel models.

Provides a reusable abstract model mixin that adds soft-delete
functionality with deleted_at/deleted_by tracking, cascade support,
and automatic manager integration.

Usage:
    from src.common.mixins import SoftDeleteMixin
    from src.common.managers import SoftDeleteManager, AllObjectsManager

    class MyModel(SoftDeleteMixin, models.Model):
        name = models.CharField(max_length=200)

        objects = SoftDeleteManager()
        all_objects = AllObjectsManager()
"""

from datetime import timedelta

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone

# Default retention period for trashed items (30 days)
TRASH_RETENTION_DAYS = 30


class SoftDeleteMixin(models.Model):
    """
    Abstract mixin that adds soft-delete support to any model.

    Fields:
        deleted_at  — Timestamp when the record was soft-deleted (NULL = active)
        deleted_by  — User who performed the deletion (NULL = system or unknown)

    Methods:
        soft_delete(user=None)  — Mark as deleted
        restore()               — Undo soft-delete
        permanent_delete()      — Hard-delete from database

    Class attributes:
        soft_delete_cascade_fields — List of related field names to cascade
                                     soft-delete to (opt-in per model).
    """

    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Timestamp when this record was soft-deleted (NULL = active)",
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="User who soft-deleted this record",
    )

    # Override in subclass to cascade soft-delete to related objects.
    # Example: soft_delete_cascade_fields = ["participations", "content_items"]
    soft_delete_cascade_fields: list[str] = []

    class Meta:
        abstract = True

    @property
    def is_deleted(self) -> bool:
        """Check if this record is soft-deleted."""
        return self.deleted_at is not None

    def get_organisation(self):
        """
        Return the organisation this object belongs to.
        Override in subclass if the field has a different name.
        """
        # Try common field names
        if hasattr(self, "organisation"):
            return self.organisation
        if hasattr(self, "project"):
            project = self.project
            if project and hasattr(project, "organisation"):
                return project.organisation
        if hasattr(self, "period"):
            period = self.period
            if period and hasattr(period, "project"):
                return period.project.organisation if period.project else None
        if hasattr(self, "activity"):
            activity = self.activity
            if activity and hasattr(activity, "period"):
                return (
                    activity.period.project.organisation
                    if activity.period and activity.period.project
                    else None
                )
        return None

    def get_trash_metadata(self) -> dict:
        """
        Return metadata for the TrashItem. Override for custom fields.
        Returns dict with 'object_repr' and 'original_data'.
        """
        return {
            "object_repr": str(self)[:255],
            "original_data": {},
        }

    def _create_trash_item(self, user=None) -> None:
        """Create a TrashItem record for this soft-deleted object."""
        # Import here to avoid circular imports
        from src.trash.models import TrashItem

        organisation = self.get_organisation()
        if organisation is None:
            # Can't create trash item without organisation (org-scoped requirement)
            return

        metadata = self.get_trash_metadata()
        content_type = ContentType.objects.get_for_model(self.__class__)
        expires_at = timezone.now() + timedelta(days=TRASH_RETENTION_DAYS)

        TrashItem.objects.update_or_create(
            content_type=content_type,
            object_id=self.pk,
            defaults={
                "organisation": organisation,
                "deleted_at": self.deleted_at,
                "deleted_by": user,
                "expires_at": expires_at,
                "object_repr": metadata.get("object_repr", str(self)[:255]),
                "original_data": metadata.get("original_data", {}),
            },
        )

    def _delete_trash_item(self) -> None:
        """Remove the TrashItem record when restoring."""
        # Import here to avoid circular imports
        from src.trash.models import TrashItem

        content_type = ContentType.objects.get_for_model(self.__class__)
        TrashItem.objects.filter(
            content_type=content_type,
            object_id=self.pk,
        ).delete()

    def soft_delete(self, user=None) -> None:
        """
        Soft-delete this record and optionally cascade to related objects.

        Args:
            user: The user performing the deletion (tracked in deleted_by).
        """
        if self.is_deleted:
            return  # Already deleted, no-op

        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=["deleted_at", "deleted_by"])

        # Create TrashItem for unified trash view
        self._create_trash_item(user=user)

        # Cascade soft-delete to configured related objects
        for field_name in self.soft_delete_cascade_fields:
            related_manager = getattr(self, field_name, None)
            if related_manager is None:
                continue
            qs = related_manager.all()
            # If the related model also uses SoftDeleteMixin, use its manager
            if hasattr(qs, "soft_delete"):
                qs.soft_delete(user=user)
            else:
                # Fallback: set deleted_at directly if field exists
                if hasattr(qs.model, "deleted_at"):
                    qs.filter(deleted_at__isnull=True).update(deleted_at=timezone.now())

    def restore(self) -> None:
        """
        Restore a soft-deleted record and cascade-restore related objects.
        """
        if not self.is_deleted:
            return  # Not deleted, no-op

        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=["deleted_at", "deleted_by"])

        # Remove from trash
        self._delete_trash_item()

        # Cascade restore
        for field_name in self.soft_delete_cascade_fields:
            related_manager = getattr(self, field_name, None)
            if related_manager is None:
                continue
            # Use all_objects or with_deleted to find soft-deleted related items
            model = related_manager.model
            if hasattr(model, "all_objects"):
                qs = model.all_objects.filter(**{related_manager.field.name: self})
            else:
                qs = related_manager.all()
            if hasattr(qs, "restore"):
                qs.restore()
            elif hasattr(model, "deleted_at"):
                qs.filter(deleted_at__isnull=False).update(deleted_at=None, deleted_by=None)

    def permanent_delete(self) -> None:
        """Hard-delete this record from the database. Irreversible."""
        super().delete()

    def delete(self, using=None, keep_parents=False):
        """Override default delete() to soft-delete instead."""
        self.soft_delete()
