"""OrganisationNotificationPolicy model for organisation-level policies."""

from typing import TYPE_CHECKING

import pytz
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import CheckConstraint, Q

if TYPE_CHECKING:
    pass


class OrganisationNotificationPolicy(models.Model):
    """
    Organisation-level notification policies including quiet hours and rate limiting.

    Each organisation can have one policy that defines quiet hours periods
    during which notifications are rate-limited.
    """

    POLICY_TYPE_DEFAULT = "default"
    POLICY_TYPE_CHOICES = [
        (POLICY_TYPE_DEFAULT, "Default"),
    ]

    id = models.BigAutoField(primary_key=True)
    organisation = models.OneToOneField(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="notification_policy",
        help_text="Organisation (one policy per org)",
    )
    policy_type = models.CharField(
        max_length=50,
        choices=POLICY_TYPE_CHOICES,
        default=POLICY_TYPE_DEFAULT,
        help_text="Policy type (for future extensibility)",
    )
    quiet_hours_enabled = models.BooleanField(
        default=False,
        help_text="Enable quiet hours rate limiting",
    )
    quiet_hours_start = models.TimeField(
        null=True,
        blank=True,
        help_text="Quiet hours start time (e.g., 22:00)",
    )
    quiet_hours_end = models.TimeField(
        null=True,
        blank=True,
        help_text="Quiet hours end time (e.g., 08:00)",
    )
    quiet_hours_timezone = models.CharField(
        max_length=63,
        default="UTC",
        help_text="Timezone for quiet hours (pytz timezone name)",
    )
    quiet_hours_rate_limit = models.IntegerField(
        default=10,
        help_text="Max notifications per minute during quiet hours",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "contextual_notifications_organisationnotificationpolicy"
        verbose_name = "Organisation Notification Policy"
        verbose_name_plural = "Organisation Notification Policies"
        ordering = ["organisation"]

        constraints = [
            # If quiet hours enabled, start and end times must be set
            CheckConstraint(
                check=(
                    Q(quiet_hours_enabled=False)
                    | Q(
                        quiet_hours_enabled=True,
                        quiet_hours_start__isnull=False,
                        quiet_hours_end__isnull=False,
                    )
                ),
                name="org_policy_quiet_hours_consistency",
            ),
        ]

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        # Validate timezone
        if self.quiet_hours_timezone and self.quiet_hours_timezone not in pytz.all_timezones:
            raise ValidationError(
                {
                    "quiet_hours_timezone": f"Invalid timezone: {self.quiet_hours_timezone}. "
                    f"Must be a valid pytz timezone name."
                }
            )

        # Validate quiet hours consistency
        if self.quiet_hours_enabled:
            if not self.quiet_hours_start or not self.quiet_hours_end:
                raise ValidationError(
                    {
                        "quiet_hours_enabled": (
                            "Quiet hours start and end times must"
                            " be set when quiet hours are enabled."
                        )
                    }
                )

    def __str__(self) -> str:
        """Return string representation of organisation notification policy."""
        status = "enabled" if self.quiet_hours_enabled else "disabled"
        return f"{self.organisation.name} - Quiet Hours: {status}"
