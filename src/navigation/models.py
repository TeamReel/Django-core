"""Navigation models for user recents and favorites."""

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models


def validate_relative_path(value: str) -> None:
    """
    Validate that path is a relative path starting with /.

    Prevents absolute URLs and potential phishing/open redirect attacks.
    """
    if not value.startswith("/"):
        raise ValidationError(
            "Path must be a relative path starting with '/' (e.g., '/projects/123')"
        )
    if value.startswith("//") or "://" in value:
        raise ValidationError("Absolute URLs are not allowed. Use relative paths only.")


class NavigationBase(models.Model):
    """
    Abstract base model for navigation state.

    Provides polymorphic relationships to any Django model via GenericForeignKey.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="%(class)s_set",
        help_text="User who owns this navigation item",
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Type of the linked object",
    )
    object_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="ID of the linked object",
    )
    content_object = GenericForeignKey("content_type", "object_id")

    label = models.CharField(
        max_length=255,
        help_text="Display label (snapshot of object title)",
    )
    path = models.CharField(
        max_length=500,
        validators=[validate_relative_path],
        help_text="Frontend route (e.g., '/projects/123')",
    )
    context = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional frontend state (opaque)",
    )

    class Meta:
        abstract = True

    def __str__(self) -> str:
        return f"{self.user.email}: {self.label} ({self.path})"


class UserRecent(NavigationBase):
    """
    Auto-generated history of recently visited navigation targets.

    Implements FIFO pruning to maintain a maximum of 50 items per user.
    """

    last_seen_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp of last access (auto-updates on save)",
    )

    class Meta:
        ordering = ["-last_seen_at"]
        unique_together = [("user", "content_type", "object_id")]
        indexes = [
            models.Index(fields=["user", "-last_seen_at"]),
        ]
        verbose_name = "User Recent"
        verbose_name_plural = "User Recents"

    def __str__(self) -> str:
        return f"Recent: {super().__str__()}"


class UserFavorite(NavigationBase):
    """
    User-pinned navigation targets (persistent until explicitly removed).
    """

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the favorite was created",
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Custom sort order (0 = default chronological)",
    )

    class Meta:
        ordering = ["order", "-created_at"]
        unique_together = [("user", "content_type", "object_id")]
        verbose_name = "User Favorite"
        verbose_name_plural = "User Favorites"

    def __str__(self) -> str:
        return f"Favorite: {super().__str__()}"
