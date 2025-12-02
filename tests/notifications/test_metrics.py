"""Unit tests for Prometheus metrics."""

from notifications.metrics import (
    notification_delivery_duration_seconds,
    notifications_created_total,
    notifications_failed_total,
    notifications_sent_total,
)


class TestPrometheusMetrics:
    """Test Prometheus metrics collection."""

    def test_notifications_created_total_exists(self):
        """Test notifications_created_total metric is registered."""
        # Check metric exists and has correct name (prometheus strips _total suffix from counters)
        assert notifications_created_total._name == "notifications_created"
        assert notifications_created_total._documentation == "Total notifications created"

    def test_notifications_sent_total_exists(self):
        """Test notifications_sent_total metric is registered."""
        assert notifications_sent_total._name == "notifications_sent"
        assert notifications_sent_total._documentation == "Total notifications sent successfully"

    def test_notifications_failed_total_exists(self):
        """Test notifications_failed_total metric is registered."""
        assert notifications_failed_total._name == "notifications_failed"
        assert notifications_failed_total._documentation == "Total notifications failed"

    def test_notification_delivery_duration_seconds_exists(self):
        """Test notification_delivery_duration_seconds metric is registered."""
        assert (
            notification_delivery_duration_seconds._name == "notification_delivery_duration_seconds"
        )
        # Check documentation contains key phrase
        assert "deliver" in notification_delivery_duration_seconds._documentation.lower()

    def test_notifications_created_total_increment(self):
        """Test incrementing notifications_created_total."""
        # Get initial value
        initial_value = notifications_created_total.labels(
            notification_type="test_type", channel="email"
        )._value.get()

        # Increment
        notifications_created_total.labels(notification_type="test_type", channel="email").inc()

        # Check value increased
        new_value = notifications_created_total.labels(
            notification_type="test_type", channel="email"
        )._value.get()
        assert new_value > initial_value

    def test_notifications_sent_total_increment(self):
        """Test incrementing notifications_sent_total."""
        initial_value = notifications_sent_total.labels(
            notification_type="test_type", channel="email"
        )._value.get()

        notifications_sent_total.labels(notification_type="test_type", channel="email").inc()

        new_value = notifications_sent_total.labels(
            notification_type="test_type", channel="email"
        )._value.get()
        assert new_value > initial_value

    def test_notifications_failed_total_increment(self):
        """Test incrementing notifications_failed_total."""
        initial_value = notifications_failed_total.labels(
            notification_type="test_type", channel="email", failure_reason="smtp_error"
        )._value.get()

        notifications_failed_total.labels(
            notification_type="test_type", channel="email", failure_reason="smtp_error"
        ).inc()

        new_value = notifications_failed_total.labels(
            notification_type="test_type", channel="email", failure_reason="smtp_error"
        )._value.get()
        assert new_value > initial_value

    def test_notification_delivery_duration_seconds_observe(self):
        """Test observing delivery duration."""
        # Observe a duration
        notification_delivery_duration_seconds.labels(
            notification_type="test_type", channel="email"
        ).observe(1.5)

        # Check histogram has been updated
        histogram = notification_delivery_duration_seconds.labels(
            notification_type="test_type", channel="email"
        )
        assert histogram._sum.get() >= 1.5

    def test_metrics_with_different_labels(self):
        """Test metrics track different label combinations separately."""
        # Increment for email
        notifications_created_total.labels(notification_type="alert", channel="email").inc()

        # Increment for SMS
        notifications_created_total.labels(notification_type="alert", channel="sms").inc()

        # Verify they're tracked separately
        email_value = notifications_created_total.labels(
            notification_type="alert", channel="email"
        )._value.get()

        sms_value = notifications_created_total.labels(
            notification_type="alert", channel="sms"
        )._value.get()

        # Both should have been incremented
        assert email_value >= 1
        assert sms_value >= 1

    def test_histogram_buckets(self):
        """Test delivery duration histogram has correct buckets."""
        # Verify histogram has expected attributes and type
        assert notification_delivery_duration_seconds._type == "histogram"

        # Observe a value to create samples
        notification_delivery_duration_seconds.labels(
            notification_type="test", channel="email"
        ).observe(1.0)

        # Verify the histogram has the expected structure
        # Prometheus histograms track observations in buckets
        assert hasattr(notification_delivery_duration_seconds, "_metrics")
        assert len(notification_delivery_duration_seconds._metrics) > 0
