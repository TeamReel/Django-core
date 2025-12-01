"""RetryPolicy model for configuring notification retry behavior."""

from typing import Literal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class RetryPolicy(models.Model):
    """Configures retry behavior for notification types.

    Defines how many times to retry failed notifications, what backoff
    strategy to use, and the time window for all retries.
    """

    # Type hints for key fields
    backoff_strategy: Literal["linear", "exponential"]
    max_attempts: int
    retry_window_seconds: int
    backoff_multiplier: float
    initial_delay_seconds: int

    # Fields
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Policy name (e.g., 'best-effort', 'critical')",
    )
    max_attempts = models.PositiveIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        help_text="Maximum number of delivery attempts",
    )
    retry_window_seconds = models.PositiveIntegerField(
        default=3600,  # 1 hour
        help_text="Time window for all retries (seconds)",
    )
    backoff_strategy = models.CharField(
        max_length=20,
        choices=[("linear", "Linear"), ("exponential", "Exponential")],
        default="exponential",
        help_text="Backoff strategy for retry delays",
    )
    backoff_multiplier = models.FloatField(
        default=5.0,
        validators=[MinValueValidator(1.0)],
        help_text="Multiplier for exponential backoff (must be > 1.0)",
    )
    initial_delay_seconds = models.PositiveIntegerField(
        default=60,  # 1 minute
        help_text="Delay before first retry (seconds)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications_retry_policy"
        verbose_name = "Retry Policy"
        verbose_name_plural = "Retry Policies"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.max_attempts} attempts)"

    def clean(self) -> None:
        """Validate retry policy configuration."""
        super().clean()

        # Ensure retry window is long enough for initial delay
        if self.retry_window_seconds < self.initial_delay_seconds:
            raise ValidationError(
                {
                    "retry_window_seconds": (
                        "Retry window must be >= initial delay "
                        f"({self.initial_delay_seconds} seconds)"
                    )
                }
            )

        # For exponential backoff, multiplier must be > 1.0
        if self.backoff_strategy == "exponential" and self.backoff_multiplier <= 1.0:
            raise ValidationError(
                {"backoff_multiplier": ("Exponential backoff requires multiplier > 1.0")}
            )

    def save(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
        """Save with validation."""
        self.full_clean()
        super().save(*args, **kwargs)

    def calculate_retry_delay(self, attempt_number: int) -> int:
        """Calculate delay in seconds for given attempt number.

        Args:
            attempt_number: The retry attempt number (1-based)

        Returns:
            Delay in seconds before this retry attempt

        Example:
            >>> policy = RetryPolicy(
            ...     initial_delay_seconds=60,
            ...     backoff_strategy='exponential',
            ...     backoff_multiplier=5.0,
            ...     retry_window_seconds=3600,
            ...     max_attempts=3
            ... )
            >>> policy.calculate_retry_delay(1)  # First retry
            60
            >>> policy.calculate_retry_delay(2)  # Second retry
            300
            >>> policy.calculate_retry_delay(3)  # Third retry
            1200
        """
        if self.backoff_strategy == "linear":
            delay = self.initial_delay_seconds * attempt_number
        else:  # exponential
            delay = int(
                self.initial_delay_seconds * (self.backoff_multiplier ** (attempt_number - 1))
            )

        # Cap delay at window / max_attempts to ensure all retries fit in window
        max_delay = self.retry_window_seconds // self.max_attempts
        return min(delay, max_delay)
