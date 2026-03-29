"""Retry policy calculation and enforcement service."""

from django.utils import timezone
from notifications.models import Notification, RetryPolicy


class RetryService:
    """Service for calculating retry delays and enforcing retry windows."""

    @staticmethod
    def calculate_delay(policy: RetryPolicy, attempt_number: int) -> int:
        """
        Calculate retry delay in seconds based on policy and attempt number.

        Args:
            policy: RetryPolicy instance with backoff configuration
            attempt_number: Current retry attempt (1-indexed)

        Returns:
            Delay in seconds before next retry attempt

        Examples:
            >>> policy = RetryPolicy(
            ...     backoff_strategy='exponential',
            ...     initial_delay_seconds=60,
            ...     backoff_multiplier=2.0,
            ...     max_attempts=5,
            ...     retry_window_seconds=3600
            ... )
            >>> RetryService.calculate_delay(policy, 1)  # First retry
            60
            >>> RetryService.calculate_delay(policy, 2)  # Second retry
            120
            >>> RetryService.calculate_delay(policy, 3)  # Third retry
            240
        """
        if policy.backoff_strategy == "exponential":
            # Exponential backoff: delay = initial * (multiplier ^ (attempt - 1))
            delay = policy.initial_delay_seconds * (
                policy.backoff_multiplier ** (attempt_number - 1)
            )
        elif policy.backoff_strategy == "linear":
            # Linear backoff: delay = initial * attempt
            delay = policy.initial_delay_seconds * attempt_number
        else:
            # Fixed/constant: always use initial delay
            delay = policy.initial_delay_seconds

        # Cap delay to fit within retry window
        # max_delay ensures all retries fit within the window
        max_delay = policy.retry_window_seconds / policy.max_attempts
        return min(int(delay), int(max_delay))

    @staticmethod
    def is_within_window(notification: Notification, policy: RetryPolicy) -> bool:
        """
        Check if notification is still within retry window.

        Args:
            notification: Notification instance to check
            policy: RetryPolicy with retry_window_seconds

        Returns:
            True if notification can still be retried, False otherwise

        Examples:
            >>> from django.utils import timezone
            >>> from datetime import timedelta
            >>> notification = Notification(
            ...     created_at=timezone.now() - timedelta(seconds=1800)
            ... )
            >>> policy = RetryPolicy(retry_window_seconds=3600)
            >>> RetryService.is_within_window(notification, policy)
            True
            >>> policy = RetryPolicy(retry_window_seconds=1200)
            >>> RetryService.is_within_window(notification, policy)
            False
        """
        elapsed = (timezone.now() - notification.created_at).total_seconds()
        return elapsed < policy.retry_window_seconds

    @staticmethod
    def should_retry(
        notification: Notification, policy: RetryPolicy, current_attempts: int
    ) -> bool:
        """
        Determine if notification should be retried.

        Checks:
        1. Max attempts not exhausted
        2. Still within retry window

        Args:
            notification: Notification instance to check
            policy: RetryPolicy with max_attempts and retry_window_seconds
            current_attempts: Number of attempts already made

        Returns:
            True if retry should proceed, False otherwise

        Examples:
            >>> notification = Notification(created_at=timezone.now())
            >>> policy = RetryPolicy(max_attempts=3, retry_window_seconds=3600)
            >>> RetryService.should_retry(notification, policy, 1)  # First retry
            True
            >>> RetryService.should_retry(notification, policy, 3)  # Max reached
            False
        """
        # Check if max attempts exhausted
        if current_attempts >= policy.max_attempts:
            return False

        # Check if within retry window
        return RetryService.is_within_window(notification, policy)
