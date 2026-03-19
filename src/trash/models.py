"""
Trash item models.

Provides a unified trash/recycle bin that tracks soft-deleted objects
across the system for browsing, restoring, and permanent deletion.
"""

import uuid

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.utils import timezone


class TrashItem(models.Model):
    """
    Unified trash entry created automatically when an object is soft-deleted.

    Each TrashItem links to the original object via GenericForeignKey and
    stores metadata for display, filtering, and scheduled cleanup.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Generic relation to the trashed object
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="trash_items",
        help_text="Type of the trashed object",
    )
    object_id = models.UUIDField(
        help_text="PK of the trashed object",
    )
    content_object = GenericForeignKey("content_type", "object_id")

    # Org-scoping for multi-tenancy
    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="trash_items",
        help_text="Organisation that owns the trashed object",
    )

    # Deletion context
    deleted_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text="When the object was soft-deleted",
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trash_items",
        help_text="User who deleted the object",
    )

    # Retention
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="When this item is eligible for permanent deletion",
    )

    # Display metadata
    object_repr = models.CharField(
        max_length=255,
        help_text="Human-readable representation of the trashed object (cached at deletion time)",
    )
    original_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Snapshot of key fields at deletion time (for preview without DB lookup)",
    )
    restore_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="API path hint for restoring the object",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "trash"
        db_table = "trash_items"
        ordering = ["-deleted_at"]
        verbose_name = "Trash Item"
        verbose_name_plural = "Trash Items"
        constraints = [
            models.UniqueConstraint(
                fields=["content_type", "object_id"],
                name="unique_trash_per_object",
            ),
        ]
        indexes = [
            models.Index(fields=["organisation", "-deleted_at"], name="trash_org_deleted"),
            models.Index(fields=["expires_at"], name="trash_expires"),
            models.Index(fields=["content_type", "organisation"], name="trash_ct_org"),
        ]

    def __str__(self) -> str:
        return f"Trash: {self.object_repr} (deleted {self.deleted_at:%Y-%m-%d})"

    @property
    def is_expired(self) -> bool:
        """Check if this item has passed its retention period."""
        return timezone.now() >= self.expires_at
