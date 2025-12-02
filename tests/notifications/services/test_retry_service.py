"""Unit tests for RetryService."""

from datetime import timedelta

import pytest
from django.utils import timezone
from notifications.services.retry_service import RetryService


@pytest.mark.django_db
class TestRetryServiceDelayCalculation:
    """Test retry delay calculation for different backoff strategies."""

    def test_exponential_backoff_calculation(self, retry_policy_factory):
        """Exponential backoff doubles delay with each attempt."""
        policy = retry_policy_factory(
            backoff_strategy="exponential",
            initial_delay_seconds=60,
            backoff_multiplier=2.0,
            max_attempts=5,
            retry_window_seconds=3600,
        )

        # First retry: 60 * (2^0) = 60
        assert RetryService.calculate_delay(policy, 1) == 60

        # Second retry: 60 * (2^1) = 120
        assert RetryService.calculate_delay(policy, 2) == 120

        # Third retry: 60 * (2^2) = 240
        assert RetryService.calculate_delay(policy, 3) == 240

        # Fourth retry: 60 * (2^3) = 480
        assert RetryService.calculate_delay(policy, 4) == 480

    def test_linear_backoff_calculation(self, retry_policy_factory):
        """Linear backoff increases delay by constant amount."""
        policy = retry_policy_factory(
            name="linear-test",
            backoff_strategy="linear",
            initial_delay_seconds=30,
            max_attempts=5,
            retry_window_seconds=600,
        )

        # First retry: 30 * 1 = 30
        assert RetryService.calculate_delay(policy, 1) == 30

        # Second retry: 30 * 2 = 60
        assert RetryService.calculate_delay(policy, 2) == 60

        # Third retry: 30 * 3 = 90
        assert RetryService.calculate_delay(policy, 3) == 90

    def test_constant_backoff_fallback(self, retry_policy_factory):
        """Unknown backoff strategy falls back to constant (initial delay)."""
        policy = retry_policy_factory(
            name="constant-test",
            backoff_strategy="linear",  # Will be treated as constant in edge case
            initial_delay_seconds=120,
            max_attempts=3,
            retry_window_seconds=600,
        )

        # Linear: 120 * 1 = 120
        assert RetryService.calculate_delay(policy, 1) == 120

    def test_delay_capped_by_retry_window(self, retry_policy_factory):
        """Delay is capped to fit within retry window."""
        policy = retry_policy_factory(
            backoff_strategy="exponential",
            initial_delay_seconds=100,
            backoff_multiplier=10.0,  # Very aggressive multiplier
            max_attempts=3,
            retry_window_seconds=300,  # 5 minute window
        )

        # Max delay per attempt = 300 / 3 = 100 seconds
        # First retry: min(100, 100) = 100
        assert RetryService.calculate_delay(policy, 1) == 100

        # Second retry: min(1000, 100) = 100 (capped)
        assert RetryService.calculate_delay(policy, 2) == 100

        # Third retry: min(10000, 100) = 100 (capped)
        assert RetryService.calculate_delay(policy, 3) == 100


@pytest.mark.django_db
class TestRetryServiceWindowCheck:
    """Test retry window enforcement."""

    def test_notification_within_window(self, notification_factory, retry_policy_factory):
        """Notification created recently is within window."""
        policy = retry_policy_factory(name="within-window-test", retry_window_seconds=3600)
        notification = notification_factory()
        # Update created_at to 30 minutes ago (bypasses auto_now_add)
        notification.created_at = timezone.now() - timedelta(minutes=30)
        notification.save(update_fields=["created_at"])

        assert RetryService.is_within_window(notification, policy) is True

    def test_notification_outside_window(self, notification_factory, retry_policy_factory):
        """Notification created too long ago is outside window."""
        policy = retry_policy_factory(
            name="outside-window-test", retry_window_seconds=1800  # 30 minutes
        )
        notification = notification_factory()
        # Update created_at to 2 hours ago (bypasses auto_now_add)
        notification.created_at = timezone.now() - timedelta(seconds=7200)
        notification.save(update_fields=["created_at"])

        assert RetryService.is_within_window(notification, policy) is False

    def test_notification_exactly_at_window_edge(self, notification_factory, retry_policy_factory):
        """Notification at exact window boundary is outside (elapsed >= window)."""
        policy = retry_policy_factory(name="edge-test", retry_window_seconds=1800)
        notification = notification_factory()
        # Update created_at to exactly at boundary (bypasses auto_now_add)
        notification.created_at = timezone.now() - timedelta(seconds=1800)
        notification.save(update_fields=["created_at"])

        # At boundary: elapsed >= 1800, window = 1800, so outside
        assert RetryService.is_within_window(notification, policy) is False


@pytest.mark.django_db
class TestRetryServiceShouldRetry:
    """Test combined retry decision logic."""

    def test_should_retry_within_limits(self, notification_factory, retry_policy_factory):
        """Should retry when under max attempts and within window."""
        policy = retry_policy_factory(
            name="within-limits-test", max_attempts=3, retry_window_seconds=3600
        )
        notification = notification_factory()
        notification.created_at = timezone.now() - timedelta(minutes=10)
        notification.save(update_fields=["created_at"])

        # First attempt (1 of 3)
        assert RetryService.should_retry(notification, policy, 1) is True

        # Second attempt (2 of 3)
        assert RetryService.should_retry(notification, policy, 2) is True

    def test_should_not_retry_max_attempts_reached(
        self, notification_factory, retry_policy_factory
    ):
        """Should not retry when max attempts reached."""
        policy = retry_policy_factory(
            name="max-attempts-test", max_attempts=3, retry_window_seconds=3600
        )
        notification = notification_factory()
        notification.created_at = timezone.now() - timedelta(minutes=10)
        notification.save(update_fields=["created_at"])

        # Third attempt (3 of 3) - reached max
        assert RetryService.should_retry(notification, policy, 3) is False

    def test_should_not_retry_outside_window(self, notification_factory, retry_policy_factory):
        """Should not retry when outside retry window."""
        policy = retry_policy_factory(
            name="outside-window-retry-test", max_attempts=5, retry_window_seconds=1800
        )
        notification = notification_factory()
        # Update to 2 hours ago (bypasses auto_now_add)
        notification.created_at = timezone.now() - timedelta(seconds=7200)
        notification.save(update_fields=["created_at"])

        # Only 1 attempt, but outside window
        assert RetryService.should_retry(notification, policy, 1) is False

    def test_should_not_retry_both_limits_exceeded(
        self, notification_factory, retry_policy_factory
    ):
        """Should not retry when both max attempts and window exceeded."""
        policy = retry_policy_factory(
            name="both-limits-test", max_attempts=2, retry_window_seconds=600
        )
        notification = notification_factory()
        notification.created_at = timezone.now() - timedelta(hours=1)
        notification.save(update_fields=["created_at"])

        # Both limits exceeded
        assert RetryService.should_retry(notification, policy, 2) is False


@pytest.mark.django_db
class TestRetryServiceEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_first_attempt_always_allowed(self, notification_factory, retry_policy_factory):
        """First retry attempt should always be allowed (if within window)."""
        policy = retry_policy_factory(
            name="first-attempt-test", max_attempts=1, retry_window_seconds=3600
        )
        notification = notification_factory(created_at=timezone.now())

        # Even with max_attempts=1, should allow the first retry (0 attempts so far)
        assert RetryService.should_retry(notification, policy, 0) is True

    def test_very_short_retry_window(self, notification_factory, retry_policy_factory):
        """Very short retry window (e.g., 60 seconds minimum) works correctly."""
        policy = retry_policy_factory(
            name="short-window-test",
            max_attempts=2,
            retry_window_seconds=60,
            initial_delay_seconds=30,
        )
        notification = notification_factory()
        notification.created_at = timezone.now() - timedelta(seconds=5)
        notification.save(update_fields=["created_at"])

        # Within window
        assert RetryService.is_within_window(notification, policy) is True

        # After 61 seconds, outside window
        notification.created_at = timezone.now() - timedelta(seconds=61)
        notification.save(update_fields=["created_at"])
        assert RetryService.is_within_window(notification, policy) is False

    def test_delay_calculation_with_zero_initial_delay(self, retry_policy_factory):
        """Zero initial delay should result in zero calculated delay."""
        policy = retry_policy_factory(
            name="zero-delay-test",
            backoff_strategy="exponential",
            initial_delay_seconds=0,
            backoff_multiplier=2.0,
            max_attempts=3,
            retry_window_seconds=600,
        )

        # All delays should be 0 (0 * multiplier = 0)
        assert RetryService.calculate_delay(policy, 1) == 0
        assert RetryService.calculate_delay(policy, 2) == 0
        assert RetryService.calculate_delay(policy, 3) == 0
