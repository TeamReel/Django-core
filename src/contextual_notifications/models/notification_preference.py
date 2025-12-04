"""NotificationPreference model for per-user notification preferences."""

from typing import TYPE_CHECKING

from django.db import models
from django.db.models import Index, UniqueConstraint

if TYPE_CHECKING:
    pass

from .managers import NotificationPreferenceManager


class NotificationPreference(models.Model):
    """
    Per-user opt-out preferences for event types and channels.

    If no preference exists for a (user, event_type, channel) combination,
    the default is enabled=True (user receives notifications).
    """

    CHANNEL_IN_APP = "in_app"
    CHANNEL_EMAIL = "email"
    CHANNEL_PUSH = "push"
    CHANNEL_CHOICES = [
        (CHANNEL_IN_APP, "In-App"),
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_PUSH, "Push"),
    ]

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        db_index=True,
        related_name="notification_preferences",
        help_text="User who owns this preference",
    )
    event_type = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Event type (e.g., 'project.updated', 'task.assigned')",
    )
    channel = models.CharField(
        max_length=20,
        choices=CHANNEL_CHOICES,
        help_text="Delivery channel",
    )
    enabled = models.BooleanField(
        default=True,
        help_text="Whether user wants to receive this notification type",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Custom manager
    objects = NotificationPreferenceManager()

    class Meta:
        db_table = "contextual_notifications_notificationpreference"
        verbose_name = "Notification Preference"
        verbose_name_plural = "Notification Preferences"
        ordering = ["user", "event_type", "channel"]

        indexes = [
            Index(fields=["user", "event_type", "channel"]),
        ]

        constraints = [
            # One preference per user per event type per channel
            UniqueConstraint(
                fields=["user", "event_type", "channel"],
                name="notification_preference_unique_constraint",
            ),
        ]

    def __str__(self) -> str:
        """Return string representation of notification preference."""
        status = "enabled" if self.enabled else "disabled"
        return f"{self.user.email} - {self.event_type} ({self.channel}): {status}"
