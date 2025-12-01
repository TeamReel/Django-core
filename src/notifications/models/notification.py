"""Notification model - core entity for multi-channel notifications."""

import uuid
from typing import Literal

from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, URLValidator
from django.db import models, transaction
from django.utils import timezone

from .managers import NotificationManager


class Notification(models.Model):
    """Core notification entity for multi-channel delivery.

    Represents a single notification to be delivered via one channel
    (email, in-app, or webhook).
    """

    # Type hints for key fields
    channel: Literal["email", "in_app", "webhook"]
    status: Literal["pending", "sent", "failed"]
    recipient: str
    payload: dict  # type: ignore[misc]
    metadata: dict  # type: ignore[misc]

    # Fields
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier",
    )
    type = models.ForeignKey(
        "notifications.NotificationType",
        on_delete=models.PROTECT,
        related_name="notifications",
        help_text="Notification category",
    )
    channel = models.CharField(
        max_length=20,
        choices=[
            ("email", "Email"),
            ("in_app", "In-App"),
            ("webhook", "Webhook"),
        ],
        help_text="Delivery channel",
    )
    recipient = models.CharField(max_length=255, help_text="Email address, user ID, or webhook URL")
    recipient_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        help_text="Link to User model (for in-app)",
    )
    payload = models.JSONField(help_text="Channel-specific data (subject/body/data)")
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional custom metadata for filtering",
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("sent", "Sent"),
            ("failed", "Failed"),
        ],
        default="pending",
        db_index=True,
        help_text="Notification status",
    )
    created_at = models.DateTimeField(
        auto_now_add=True, db_index=True, help_text="When notification was created"
    )
    updated_at = models.DateTimeField(auto_now=True, help_text="Last status change")
    read_at = models.DateTimeField(null=True, blank=True, help_text="When user read (in-app only)")

    # Custom manager
    objects = NotificationManager()

    class Meta:
        db_table = "notifications_notification"
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="idx_status_created"),
            models.Index(
                fields=["recipient_user", "status", "created_at"],
                name="idx_recipient_user",
            ),
            models.Index(fields=["type", "channel", "created_at"], name="idx_type_channel"),
        ]

    def __str__(self) -> str:
        return f"{self.type.code} to {self.recipient} ({self.status})"

    def clean(self) -> None:
        """Validate notification configuration."""
        super().clean()

        # Validate recipient format based on channel
        if self.channel == "email":
            validator = EmailValidator(message="Invalid email address")
            try:
                validator(self.recipient)
            except ValidationError as e:
                raise ValidationError(
                    {"recipient": "Invalid email address for email channel"}
                ) from e

        elif self.channel == "webhook":
            url_validator = URLValidator(
                schemes=["http", "https"],
                message="Invalid webhook URL",
            )
            try:
                url_validator(self.recipient)
            except ValidationError as e:
                raise ValidationError({"recipient": "Invalid URL for webhook channel"}) from e

        elif self.channel == "in_app":
            if not self.recipient_user_id:
                raise ValidationError(
                    {"recipient_user": ("recipient_user must be set for in-app notifications")}
                )

        # Validate payload size based on channel
        payload_size = len(str(self.payload))
        if self.channel == "webhook" and payload_size > 1024 * 1024:  # 1MB
            raise ValidationError(
                {"payload": (f"Webhook payload too large ({payload_size} bytes, " "max 1MB)")}
            )
        elif self.channel == "in_app" and payload_size > 100 * 1024:  # 100KB
            raise ValidationError(
                {"payload": (f"In-app payload too large ({payload_size} bytes, " "max 100KB)")}
            )

        # Validate read_at only for in-app
        if self.read_at and self.channel != "in_app":
            raise ValidationError({"read_at": "read_at can only be set for in-app notifications"})

    def save(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
        """Save with validation and status transition checks."""
        # Validate before save
        self.full_clean()

        # Check status transitions (only allow pending -> sent/failed)
        if self.pk:  # Existing notification
            try:
                old = Notification.objects.get(pk=self.pk)
                if old.status != "pending" and old.status != self.status:
                    raise ValidationError(
                        f"Cannot change status from {old.status} to {self.status}"
                    )
            except Notification.DoesNotExist:
                pass  # New object, allow any status

        super().save(*args, **kwargs)

    def update_status(self, new_status: Literal["sent", "failed"]) -> None:
        """Update notification status atomically with row locking.

        Args:
            new_status: New status ('sent' or 'failed')

        Raises:
            ValueError: If notification is not in 'pending' status
        """
        with transaction.atomic():
            notification = Notification.objects.select_for_update().get(pk=self.pk)
            if notification.status != "pending":
                raise ValueError(f"Cannot update status of {notification.status} notification")
            notification.status = new_status
            notification.updated_at = timezone.now()
            notification.save(update_fields=["status", "updated_at"])
            # Update self to reflect changes
            self.status = new_status
            self.updated_at = notification.updated_at

    def mark_as_read(self) -> None:
        """Mark in-app notification as read.

        Raises:
            ValueError: If notification is not in-app channel
        """
        if self.channel != "in_app":
            raise ValueError("Only in-app notifications can be marked as read")

        self.read_at = timezone.now()
        self.save(update_fields=["read_at"])
