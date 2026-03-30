"""Models for the email tasks example.

This module demonstrates Django model patterns for tracking
background task execution and results.
"""

from django.db import models


class EmailLog(models.Model):
    """Track email sending attempts and their results.

    This model is used to demonstrate:
    - Tracking async task execution
    - Recording success/failure status
    - Storing error information for debugging
    - Timestamping for monitoring and cleanup

    Attributes:
        email: The recipient email address.
        status: Current status of the email (pending, sent, failed, validated, invalid).
        created_at: When the email attempt was initiated.
        updated_at: When the status was last updated.
        error_message: Error details if the email failed.
        task_id: The Celery task ID for correlation.
        retry_count: Number of retry attempts.

    Example:
        >>> log = EmailLog.objects.create(
        ...     email="user@example.com",
        ...     status="pending",
        ...     task_id="abc-123"
        ... )
        >>> log.status = "sent"
        >>> log.save()
    """

    class Status(models.TextChoices):
        """Possible email status values."""

        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        VALIDATED = "validated", "Validated"
        INVALID = "invalid", "Invalid"

    email = models.EmailField(
        help_text="The recipient email address",
    )
    status = models.CharField(
        max_length=50,
        choices=Status.choices,
        default=Status.PENDING,
        help_text="Current status of the email",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the email attempt was initiated",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the status was last updated",
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error details if the email failed",
    )
    task_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="The Celery task ID for correlation",
    )
    retry_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of retry attempts",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "email log"
        verbose_name_plural = "email logs"
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["email"]),
            models.Index(fields=["task_id"]),
        ]

    def __str__(self) -> str:
        """Return string representation."""
        return f"{self.email} - {self.status}"

    def mark_sent(self) -> None:
        """Mark the email as successfully sent."""
        self.status = self.Status.SENT
        self.save(update_fields=["status", "updated_at"])

    def mark_failed(self, error: str) -> None:
        """Mark the email as failed with error message.

        Args:
            error: The error message to store.
        """
        self.status = self.Status.FAILED
        self.error_message = error
        self.retry_count += 1
        self.save(update_fields=["status", "error_message", "retry_count", "updated_at"])
