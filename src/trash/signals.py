"""
Signal handlers for automatic trash tracking.

When a SoftDeleteMixin model is soft-deleted, a TrashItem is created.
When restored, the TrashItem is removed.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save
from django.dispatch import receiver

from src.common.mixins import SoftDeleteMixin

from .models import TrashItem

logger = logging.getLogger(__name__)


def _get_retention_days(model_label: str) -> int:
    """Get retention days for a model, checking overrides first."""
    overrides = getattr(settings, "SOFT_DELETE_RETENTION_OVERRIDES", {})
    if model_label in overrides:
        return overrides[model_label]
    return getattr(settings, "SOFT_DELETE_RETENTION_DAYS", 30)


def _get_organisation(instance):
    """Extract organisation from an object, walking up common FK patterns."""
    if hasattr(instance, "organisation_id") and instance.organisation_id:
        return instance.organisation
    if hasattr(instance, "project_id") and instance.project_id:
        return instance.project.organisation
    return None


@receiver(post_save)
def track_soft_delete_in_trash(sender, instance, **kwargs):
    """Create or remove TrashItem when a SoftDeleteMixin model is saved."""
    if not isinstance(instance, SoftDeleteMixin):
        return

    # Skip if update_fields is provided and doesn't include deleted_at
    update_fields = kwargs.get("update_fields")
    if update_fields is not None and "deleted_at" not in update_fields:
        return

    ct = ContentType.objects.get_for_model(sender)
    model_label = f"{ct.app_label}.{ct.model}"

    if instance.is_deleted:
        # Object was soft-deleted → create TrashItem
        organisation = _get_organisation(instance)
        if organisation is None:
            return  # Can't track without org scope

        retention_days = _get_retention_days(model_label)

        TrashItem.objects.update_or_create(
            content_type=ct,
            object_id=instance.pk,
            defaults={
                "organisation": organisation,
                "deleted_at": instance.deleted_at,
                "deleted_by": instance.deleted_by,
                "expires_at": instance.deleted_at + timedelta(days=retention_days),
                "object_repr": str(instance)[:255],
                "original_data": _snapshot_fields(instance),
            },
        )

        # Record audit event
        _record_audit_event(
            "trash.soft_delete",
            user=instance.deleted_by,
            organisation=organisation,
            metadata={
                "content_type": model_label,
                "object_id": str(instance.pk),
                "object_repr": str(instance)[:255],
            },
        )
    else:
        # Object was restored → remove TrashItem
        deleted = TrashItem.objects.filter(content_type=ct, object_id=instance.pk).delete()
        if deleted[0] > 0:
            organisation = _get_organisation(instance)
            _record_audit_event(
                "trash.restore",
                user=None,  # restore() doesn't track the restoring user
                organisation=organisation,
                metadata={
                    "content_type": model_label,
                    "object_id": str(instance.pk),
                    "object_repr": str(instance)[:255],
                },
            )


def _record_audit_event(event_type: str, user, organisation, metadata: dict) -> None:
    """Record audit event, gracefully handling failures."""
    try:
        from audit.api import audit_log

        audit_log.record(
            event_type,
            user=user,
            organization=organisation,
            metadata=metadata,
        )
    except Exception:
        # Audit should never break the main flow
        logger.debug("Failed to record audit event for trash operation", exc_info=True)


def _snapshot_fields(instance) -> dict:
    """Capture key fields for trash preview."""
    data = {}
    for field_name in ("name", "title", "email", "slug", "role"):
        if hasattr(instance, field_name):
            val = getattr(instance, field_name)
            if val is not None:
                data[field_name] = str(val)
    return data
