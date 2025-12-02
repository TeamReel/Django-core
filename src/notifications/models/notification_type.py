"""NotificationType model for defining notification categories."""

import re
from typing import Literal

from django.core.exceptions import ValidationError
from django.db import models


class NotificationType(models.Model):
    """Defines notification categories with retry policies and defaults.

    Each notification type (e.g., 'password_reset', 'default') has a
    configured retry policy and default delivery channel.
    """

    # Type hints for key fields
    default_channel: Literal["email", "in_app", "webhook"]
    is_active: bool

    # Fields
    code = models.SlugField(
        max_length=50,
        unique=True,
        help_text="Unique slug (e.g., 'password_reset', 'default')",
    )
    name = models.CharField(max_length=100, help_text="Human-readable name")
    description = models.TextField(null=True, blank=True, help_text="Purpose/usage documentation")
    default_channel = models.CharField(
        max_length=20,
        choices=[
            ("email", "Email"),
            ("in_app", "In-App"),
            ("webhook", "Webhook"),
        ],
        help_text="Default channel if not specified",
    )
    retry_policy = models.ForeignKey(
        "notifications.RetryPolicy",
        on_delete=models.PROTECT,
        related_name="notification_types",
        help_text="Retry configuration for this type",
    )
    is_active = models.BooleanField(default=True, help_text="Soft delete / disable type")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications_notification_type"
        verbose_name = "Notification Type"
        verbose_name_plural = "Notification Types"
        ordering = ["code"]
        indexes = [
            models.Index(fields=["is_active", "code"], name="idx_type_active"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"

    def clean(self) -> None:
        """Validate notification type configuration."""
        super().clean()

        # Code must be lowercase, alphanumeric with underscores/hyphens only
        if self.code:
            if not re.match(r"^[a-z0-9_-]+$", self.code):
                raise ValidationError(
                    {
                        "code": (
                            "Code must be lowercase, alphanumeric with " "underscores/hyphens only"
                        )
                    }
                )

    def save(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
        """Save with validation."""
        self.full_clean()
        super().save(*args, **kwargs)
