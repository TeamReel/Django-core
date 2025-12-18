import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class FileAsset(models.Model):
    """
    Represents a file uploaded to the system.
    Stores metadata and a reference to the storage backend path.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="assets",
        help_text=_("The organization this file belongs to."),
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        help_text=_("The user who uploaded the file."),
    )

    original_name = models.CharField(max_length=255)
    storage_path = models.CharField(
        max_length=1024,
        unique=True,
        help_text=_("The key/path used by the storage backend to retrieve the file."),
    )
    file_size = models.PositiveIntegerField(help_text=_("Size in bytes."))
    mime_type = models.CharField(max_length=100)
    is_public = models.BooleanField(
        default=False, help_text=_("Whether the file is publicly accessible.")
    )

    # Soft Delete support
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Metadata for future extensibility (e.g. image dimensions)
    metadata = models.JSONField(default=dict, blank=True)

    # Thumbnail path (WP03: Async Processing)
    thumbnail_path = models.CharField(
        max_length=1024,
        null=True,
        blank=True,
        help_text=_("Path to the generated thumbnail image."),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["uploaded_by"]),
            models.Index(fields=["deleted_at"]),
        ]
        ordering = ["-created_at"]
        verbose_name = _("File Asset")
        verbose_name_plural = _("File Assets")

    def __str__(self) -> str:
        return self.original_name

    def soft_delete(self) -> None:
        """
        Soft delete the file asset.
        """
        from django.utils import timezone

        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])
