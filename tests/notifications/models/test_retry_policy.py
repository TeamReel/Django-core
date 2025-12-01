"""Unit tests for RetryPolicy model."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from notifications.models import RetryPolicy


@pytest.mark.django_db
class TestRetryPolicy:
    """Tests for RetryPolicy model."""

    def test_create_retry_policy(self) -> None:
        """Test creating a valid retry policy."""
        policy = RetryPolicy.objects.create(
            name="test-policy",
            max_attempts=5,
            retry_window_seconds=1800,
            backoff_strategy="exponential",
            backoff_multiplier=2.0,
            initial_delay_seconds=30,
        )

        assert policy.name == "test-policy"
        assert policy.max_attempts == 5
        assert policy.retry_window_seconds == 1800
        assert policy.backoff_strategy == "exponential"
        assert policy.backoff_multiplier == 2.0
        assert policy.initial_delay_seconds == 30
        assert policy.created_at is not None

    def test_unique_name_constraint(self) -> None:
        """Test that policy names must be unique."""
        RetryPolicy.objects.create(name="unique-test-1")

        with pytest.raises((IntegrityError, ValidationError)):
            policy = RetryPolicy(name="unique-test-1")
            policy.save()  # Will raise ValidationError from full_clean()

    def test_retry_window_validation(self) -> None:
        """Test that retry_window must be >= initial_delay."""
        policy = RetryPolicy(
            name="invalid-window",
            retry_window_seconds=100,
            initial_delay_seconds=200,
        )

        with pytest.raises(ValidationError) as exc_info:
            policy.full_clean()

        assert "retry_window_seconds" in exc_info.value.message_dict

    def test_exponential_multiplier_validation(self) -> None:
        """Test that exponential backoff requires multiplier > 1.0."""
        policy = RetryPolicy(
            name="invalid-multiplier",
            backoff_strategy="exponential",
            backoff_multiplier=1.0,
        )

        with pytest.raises(ValidationError) as exc_info:
            policy.full_clean()

        assert "backoff_multiplier" in exc_info.value.message_dict

    def test_linear_backoff_allows_any_multiplier(self) -> None:
        """Test that linear backoff doesn't require multiplier > 1.0."""
        policy = RetryPolicy(
            name="linear-policy",
            backoff_strategy="linear",
            backoff_multiplier=1.0,
        )

        # Should not raise
        policy.full_clean()
        policy.save()

    def test_calculate_retry_delay_exponential(self) -> None:
        """Test exponential backoff calculation."""
        policy = RetryPolicy(
            name="exp-policy",
            max_attempts=4,
            retry_window_seconds=3600,
            backoff_strategy="exponential",
            backoff_multiplier=2.0,
            initial_delay_seconds=60,
        )

        # Attempt 1: 60 * (2^0) = 60
        assert policy.calculate_retry_delay(1) == 60

        # Attempt 2: 60 * (2^1) = 120
        assert policy.calculate_retry_delay(2) == 120

        # Attempt 3: 60 * (2^2) = 240
        assert policy.calculate_retry_delay(3) == 240

        # Attempt 4: 60 * (2^3) = 480
        assert policy.calculate_retry_delay(4) == 480

    def test_calculate_retry_delay_linear(self) -> None:
        """Test linear backoff calculation."""
        policy = RetryPolicy(
            name="linear-policy",
            max_attempts=4,
            retry_window_seconds=3600,
            backoff_strategy="linear",
            initial_delay_seconds=100,
        )

        # Attempt 1: 100 * 1 = 100
        assert policy.calculate_retry_delay(1) == 100

        # Attempt 2: 100 * 2 = 200
        assert policy.calculate_retry_delay(2) == 200

        # Attempt 3: 100 * 3 = 300
        assert policy.calculate_retry_delay(3) == 300

    def test_calculate_retry_delay_capped(self) -> None:
        """Test that delay is capped at window/max_attempts."""
        policy = RetryPolicy(
            name="capped-policy",
            max_attempts=3,
            retry_window_seconds=300,  # 5 minutes
            backoff_strategy="exponential",
            backoff_multiplier=10.0,  # Very aggressive
            initial_delay_seconds=60,
        )

        # Cap is 300 / 3 = 100 seconds
        # Attempt 3: 60 * (10^2) = 6000, but capped at 100
        delay = policy.calculate_retry_delay(3)
        assert delay == 100

    def test_default_values(self) -> None:
        """Test model default values."""
        policy = RetryPolicy.objects.create(name="defaults")

        assert policy.max_attempts == 3
        assert policy.retry_window_seconds == 3600
        assert policy.backoff_strategy == "exponential"
        assert policy.backoff_multiplier == 5.0
        assert policy.initial_delay_seconds == 60

    def test_max_attempts_bounds(self) -> None:
        """Test max_attempts validation (1-20 range)."""
        # Too low
        policy_low = RetryPolicy(name="low", max_attempts=0)
        with pytest.raises(ValidationError):
            policy_low.full_clean()

        # Too high
        policy_high = RetryPolicy(name="high", max_attempts=21)
        with pytest.raises(ValidationError):
            policy_high.full_clean()

        # Valid boundaries
        policy_min = RetryPolicy(name="min", max_attempts=1)
        policy_min.full_clean()
        policy_min.save()

        policy_max = RetryPolicy(name="max", max_attempts=20)
        policy_max.full_clean()
        policy_max.save()

    def test_str_representation(self) -> None:
        """Test string representation."""
        policy = RetryPolicy(name="test-policy")
        assert "test-policy" in str(policy)

    def test_ordering(self) -> None:
        """Test queryset ordering by name."""
        # Clear any seeded data first (delete NotificationTypes to avoid FK constraint)
        from notifications.models import NotificationType

        NotificationType.objects.all().delete()
        RetryPolicy.objects.all().delete()

        RetryPolicy.objects.create(name="zebra")
        RetryPolicy.objects.create(name="alpha")
        RetryPolicy.objects.create(name="beta")

        policies = list(RetryPolicy.objects.all())
        assert policies[0].name == "alpha"
        assert policies[1].name == "beta"
        assert policies[2].name == "zebra"
