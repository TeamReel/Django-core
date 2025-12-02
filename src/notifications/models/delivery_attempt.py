"""DeliveryAttempt model for tracking notification delivery attempts."""

from typing import Literal, Optional

from django.db import models


class DeliveryAttempt(models.Model):
    """Tracks each delivery attempt for audit and debugging.

    Records outcome, error messages, response codes, and timing for
    each attempt to deliver a notification.
    """

    # Type hints for key fields
    outcome: Literal["success", "transient_failure", "permanent_failure"]
    attempt_number: int
    duration_ms: Optional[int]

    # Fields
    notification = models.ForeignKey(
        "notifications.Notification",
        on_delete=models.CASCADE,
        related_name="delivery_attempts",
        help_text="Parent notification",
    )
    attempt_number = models.PositiveIntegerField(help_text="Attempt sequence (1, 2, 3...)")
    attempted_at = models.DateTimeField(auto_now_add=True, help_text="When attempt was made")
    outcome = models.CharField(
        max_length=30,
        choices=[
            ("success", "Success"),
            ("transient_failure", "Transient Failure"),
            ("permanent_failure", "Permanent Failure"),
        ],
        help_text="Delivery outcome",
    )
    error_message = models.TextField(null=True, blank=True, help_text="Error details if failed")
    http_status_code = models.PositiveIntegerField(
        null=True, blank=True, help_text="HTTP status for webhooks"
    )
    smtp_response_code = models.PositiveIntegerField(
        null=True, blank=True, help_text="SMTP code for emails"
    )
    response_body_snippet = models.TextField(
        null=True, blank=True, help_text="Response body (truncated to 1KB)"
    )
    duration_ms = models.PositiveIntegerField(
        null=True, blank=True, help_text="Delivery duration in milliseconds"
    )

    class Meta:
        db_table = "notifications_delivery_attempt"
        verbose_name = "Delivery Attempt"
        verbose_name_plural = "Delivery Attempts"
        ordering = ["notification", "attempt_number"]
        indexes = [
            models.Index(
                fields=["notification", "attempt_number"],
                name="idx_notification_attempt",
            ),
            models.Index(fields=["outcome", "attempted_at"], name="idx_outcome_attempted"),
        ]
        unique_together = [["notification", "attempt_number"]]

    def __str__(self) -> str:
        return f"Attempt #{self.attempt_number} for {self.notification_id} " f"({self.outcome})"

    def save(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
        """Save with response body truncation."""
        # Truncate response body to 1KB
        if self.response_body_snippet and len(self.response_body_snippet) > 1024:
            self.response_body_snippet = self.response_body_snippet[:1024]

        super().save(*args, **kwargs)
