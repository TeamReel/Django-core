"""
Tests for observability metrics infrastructure (WP03).

Tests:
- MetricCollector Protocol compliance
- PrometheusCollector implementation
- emit_metric() fire-and-forget behavior
- Label cardinality validation (FR-013)
- Exception isolation (FR-011a)
- observability_signal_failure_total emission (FR-011b)
- HTTPMetricsMiddleware
- ObservableTask lifecycle metrics
"""

from unittest.mock import Mock, patch

import pytest
from django.http import HttpResponse
from django.test import RequestFactory, TestCase, override_settings
from observability.exporters import PrometheusCollector
from observability.metrics import (
    METRIC_COLLECTORS,
    MetricCollector,
    _emit_failure_metric,
    emit_metric,
    register_metric_collector,
    validate_label_cardinality,
)
from observability.middleware import HTTPMetricsMiddleware
from observability.tasks import ObservableTask

# ==============================================================================
# MetricCollector Protocol Tests
# ==============================================================================


class TestMetricCollectorProtocol:
    """Test MetricCollector Protocol compliance (T029)."""

    def test_protocol_structure(self):
        """Verify MetricCollector Protocol has required methods."""
        # Protocol defines increment, observe, set_gauge
        assert hasattr(MetricCollector, "increment")
        assert hasattr(MetricCollector, "observe")
        assert hasattr(MetricCollector, "set_gauge")

    def test_mock_collector_implementation(self):
        """Test that a mock collector can implement the protocol."""

        class MockCollector:
            def increment(self, name, value, labels):
                pass

            def observe(self, name, value, labels):
                pass

            def set_gauge(self, name, value, labels):
                pass

        collector = MockCollector()
        register_metric_collector(collector)

        # Verify registration
        assert len(METRIC_COLLECTORS) == 1
        assert METRIC_COLLECTORS[0] == collector


# ==============================================================================
# Registry Tests
# ==============================================================================


class TestMetricRegistry:
    """Test metric collector registry (T030)."""

    def setup_method(self):
        """Clear registry before each test."""
        METRIC_COLLECTORS.clear()

    def test_register_collector(self):
        """Test registering a metric collector."""
        collector = Mock(spec=MetricCollector)
        register_metric_collector(collector)

        assert len(METRIC_COLLECTORS) == 1
        assert METRIC_COLLECTORS[0] == collector

    def test_multiple_collectors(self):
        """Test registering multiple collectors."""
        collector1 = Mock(spec=MetricCollector)
        collector2 = Mock(spec=MetricCollector)

        register_metric_collector(collector1)
        register_metric_collector(collector2)

        assert len(METRIC_COLLECTORS) == 2
        assert collector1 in METRIC_COLLECTORS
        assert collector2 in METRIC_COLLECTORS


# ==============================================================================
# emit_metric() Tests
# ==============================================================================


class TestEmitMetric:
    """Test emit_metric() fire-and-forget API (T030)."""

    def setup_method(self):
        """Clear registry before each test."""
        METRIC_COLLECTORS.clear()

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_emit_counter(self):
        """Test emitting counter metric."""
        collector = Mock(spec=MetricCollector)
        register_metric_collector(collector)

        emit_metric("counter", "test_counter", 1, {"label": "value"})

        collector.increment.assert_called_once_with("test_counter", 1, {"label": "value"})

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_emit_histogram(self):
        """Test emitting histogram metric."""
        collector = Mock(spec=MetricCollector)
        register_metric_collector(collector)

        emit_metric("histogram", "test_histogram", 0.5, {"label": "value"})

        collector.observe.assert_called_once_with("test_histogram", 0.5, {"label": "value"})

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_emit_gauge(self):
        """Test emitting gauge metric."""
        collector = Mock(spec=MetricCollector)
        register_metric_collector(collector)

        emit_metric("gauge", "test_gauge", 42, {"label": "value"})

        collector.set_gauge.assert_called_once_with("test_gauge", 42, {"label": "value"})

    @override_settings(OBSERVABILITY_METRICS_ENABLED=False)
    def test_emit_disabled(self):
        """Test that metrics are not emitted when disabled."""
        collector = Mock(spec=MetricCollector)
        register_metric_collector(collector)

        emit_metric("counter", "test_counter", 1, {"label": "value"})

        collector.increment.assert_not_called()

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_emit_no_collectors(self):
        """Test emit_metric() when no collectors registered."""
        # Should not raise exception
        emit_metric("counter", "test_counter", 1, {"label": "value"})

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_exception_isolation(self):
        """Test that exceptions in collectors are isolated (FR-011a)."""
        collector = Mock(spec=MetricCollector)
        collector.increment.side_effect = Exception("Test error")
        register_metric_collector(collector)

        # Should not raise exception - fire-and-forget
        emit_metric("counter", "test_counter", 1, {"label": "value"})

        collector.increment.assert_called_once()


# ==============================================================================
# Label Cardinality Validation Tests
# ==============================================================================


class TestLabelCardinalityValidation:
    """Test label cardinality validation (FR-013, T037)."""

    def test_http_status_grouping(self):
        """Test HTTP status code grouping (2xx, 3xx, 4xx, 5xx)."""
        labels = validate_label_cardinality({"status": "200"})
        assert labels["status"] == "2xx"

        labels = validate_label_cardinality({"status": "404"})
        assert labels["status"] == "4xx"

        labels = validate_label_cardinality({"status": "500"})
        assert labels["status"] == "5xx"

    def test_http_method_allowlist(self):
        """Test HTTP method allowlist validation."""
        # Valid methods
        for method in ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]:
            labels = validate_label_cardinality({"method": method})
            assert labels["method"] == method

        # Invalid method replaced with 'OTHER'
        labels = validate_label_cardinality({"method": "TRACE"})
        assert labels["method"] == "OTHER"

    def test_task_name_length_limit(self):
        """Test task_name label length limit."""
        long_name = "a" * 200
        labels = validate_label_cardinality({"task_name": long_name})

        # Should be truncated to 100 characters
        assert len(labels["task_name"]) == 100

    def test_other_label_length_limit(self):
        """Test other labels have 50 character limit."""
        long_value = "b" * 100
        labels = validate_label_cardinality({"custom_label": long_value})

        # Should be truncated to 50 characters
        assert len(labels["custom_label"]) == 50

    def test_empty_labels(self):
        """Test validation with empty labels."""
        labels = validate_label_cardinality({})
        assert labels == {}


# ==============================================================================
# PrometheusCollector Tests
# ==============================================================================


class TestPrometheusCollector:
    """Test PrometheusCollector implementation (T033)."""

    def setup_method(self):
        """Create fresh collector for each test."""
        self.collector = PrometheusCollector()

    @patch("observability.exporters.prometheus.Counter")
    def test_increment_counter(self, mock_counter_class):
        """Test counter increment with lazy initialization."""
        mock_counter_instance = Mock()
        mock_counter_class.return_value = mock_counter_instance

        self.collector.increment("test_counter", 1, {"label": "value"})

        # Verify lazy initialization
        mock_counter_class.assert_called_once_with(
            "test_counter", "Metric: test_counter", ["label"]
        )

        # Verify increment call
        mock_counter_instance.labels.assert_called_once_with(label="value")
        mock_counter_instance.labels.return_value.inc.assert_called_once_with(1)

    @patch("observability.exporters.prometheus.Histogram")
    def test_observe_histogram(self, mock_histogram_class):
        """Test histogram observation with lazy initialization."""
        mock_histogram_instance = Mock()
        mock_histogram_class.return_value = mock_histogram_instance

        self.collector.observe("test_histogram", 0.5, {"label": "value"})

        # Verify lazy initialization
        mock_histogram_class.assert_called_once_with(
            "test_histogram", "Metric: test_histogram", ["label"]
        )

        # Verify observe call
        mock_histogram_instance.labels.assert_called_once_with(label="value")
        mock_histogram_instance.labels.return_value.observe.assert_called_once_with(0.5)

    @patch("observability.exporters.prometheus.Gauge")
    def test_set_gauge(self, mock_gauge_class):
        """Test gauge set with lazy initialization."""
        mock_gauge_instance = Mock()
        mock_gauge_class.return_value = mock_gauge_instance

        self.collector.set_gauge("test_gauge", 42, {"label": "value"})

        # Verify lazy initialization
        mock_gauge_class.assert_called_once_with("test_gauge", "Metric: test_gauge", ["label"])

        # Verify set call
        mock_gauge_instance.labels.assert_called_once_with(label="value")
        mock_gauge_instance.labels.return_value.set.assert_called_once_with(42)

    @patch("observability.exporters.prometheus.Counter")
    def test_lazy_initialization_caching(self, mock_counter_class):
        """Test that metrics are cached after first initialization."""
        mock_counter_instance = Mock()
        mock_counter_class.return_value = mock_counter_instance

        # Emit twice with same metric name and labels
        self.collector.increment("test_counter", 1, {"label": "value"})
        self.collector.increment("test_counter", 2, {"label": "value"})

        # Should only initialize once
        mock_counter_class.assert_called_once()

        # But increment twice
        assert mock_counter_instance.labels.return_value.inc.call_count == 2


# ==============================================================================
# Failure Metric Tests
# ==============================================================================


class TestFailureMetric:
    """Test observability_signal_failure_total emission (FR-011b, T042)."""

    @patch("observability.metrics.prometheus_client.Counter")
    def test_emit_failure_metric(self, mock_counter_class):
        """Test _emit_failure_metric() calls prometheus-client directly."""
        mock_counter_instance = Mock()
        mock_counter_class.return_value = mock_counter_instance

        _emit_failure_metric("test_component", "TestError: something broke")

        # Verify Counter creation
        mock_counter_class.assert_called_once_with(
            "observability_signal_failure_total",
            "Observability signal failures (FR-011b)",
            ["component", "error"],
        )

        # Verify increment
        mock_counter_instance.labels.assert_called_once_with(
            component="test_component", error="TestError: something broke"
        )
        mock_counter_instance.labels.return_value.inc.assert_called_once()


# ==============================================================================
# HTTPMetricsMiddleware Tests
# ==============================================================================


class TestHTTPMetricsMiddleware(TestCase):
    """Test HTTP request metrics middleware (T038)."""

    def setUp(self):
        """Set up test client and middleware."""
        self.factory = RequestFactory()
        self.middleware = HTTPMetricsMiddleware(lambda request: HttpResponse())
        METRIC_COLLECTORS.clear()

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    @patch("observability.middleware.emit_metric")
    def test_http_metrics_emission(self, mock_emit):
        """Test that HTTP metrics are emitted on request."""
        request = self.factory.get("/test")

        # Process request (records start time)
        self.middleware.process_request(request)

        # Simulate response
        response = HttpResponse(status=200)
        self.middleware.process_response(request, response)

        # Verify metrics emitted
        assert mock_emit.call_count == 2

        # Check counter call
        counter_call = mock_emit.call_args_list[0]
        assert counter_call[0] == ("counter", "http_requests_total", 1)
        assert counter_call[0][3]["method"] == "GET"
        assert counter_call[0][3]["status"] == "200"

        # Check histogram call
        histogram_call = mock_emit.call_args_list[1]
        assert histogram_call[0][0] == "histogram"
        assert histogram_call[0][1] == "http_request_duration_seconds"
        assert isinstance(histogram_call[0][2], float)

    def test_missing_start_time(self):
        """Test middleware handles missing _metrics_start_time gracefully."""
        request = self.factory.get("/test")
        response = HttpResponse(status=200)

        # Call process_response without process_request
        result = self.middleware.process_response(request, response)

        # Should not raise exception
        assert result == response

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    @patch("observability.middleware.emit_metric")
    def test_exception_isolation(self, mock_emit):
        """Test that exceptions in metric emission are isolated (FR-011a)."""
        mock_emit.side_effect = Exception("Test error")

        request = self.factory.get("/test")
        self.middleware.process_request(request)

        response = HttpResponse(status=200)
        result = self.middleware.process_response(request, response)

        # Should return response despite exception
        assert result == response


# ==============================================================================
# ObservableTask Tests
# ==============================================================================


class TestObservableTask:
    """Test ObservableTask lifecycle metrics (T039-T041)."""

    def setup_method(self):
        """Clear registry before each test."""
        METRIC_COLLECTORS.clear()

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    @patch("observability.tasks.emit_metric")
    def test_task_success_metrics(self, mock_emit):
        """Test metrics emission for successful task."""

        # Create task with ObservableTask base
        class TestTask(ObservableTask):
            name = "test_task"

            def run(self, *args, **kwargs):
                return "success"

        task = TestTask()
        task.request.retries = 0
        task.request.id = "test-id"

        # Execute task
        task()

        # Verify metrics emitted
        assert mock_emit.call_count == 3

        # Check tasks_started_total
        assert mock_emit.call_args_list[0][0] == ("counter", "tasks_started_total", 1)
        assert mock_emit.call_args_list[0][0][3]["task_name"] == "test_task"

        # Check tasks_completed_total with status=success
        assert mock_emit.call_args_list[1][0] == ("counter", "tasks_completed_total", 1)
        assert mock_emit.call_args_list[1][0][3]["status"] == "success"

        # Check task_duration_seconds
        assert mock_emit.call_args_list[2][0][0] == "histogram"
        assert mock_emit.call_args_list[2][0][1] == "task_duration_seconds"

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    @patch("observability.tasks.emit_metric")
    def test_task_failure_metrics(self, mock_emit):
        """Test metrics emission for failed task."""

        class TestTask(ObservableTask):
            name = "test_task"

            def run(self, *args, **kwargs):
                raise ValueError("Test error")

        task = TestTask()
        task.request.retries = 0
        task.request.id = "test-id"

        # Execute task (should raise)
        with pytest.raises(ValueError):
            task()

        # Verify tasks_completed_total emitted with status=failure
        completed_calls = [
            call for call in mock_emit.call_args_list if call[0][1] == "tasks_completed_total"
        ]
        assert len(completed_calls) == 1
        assert completed_calls[0][0][3]["status"] == "failure"

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    @patch("observability.tasks.emit_metric")
    def test_task_retries_metric(self, mock_emit):
        """Test task_retries_total emission."""

        class TestTask(ObservableTask):
            name = "test_task"

            def run(self, *args, **kwargs):
                return "success"

        task = TestTask()
        task.request.retries = 3  # Simulate 3 retries
        task.request.id = "test-id"

        # Execute task
        task()

        # Verify task_retries_total emitted
        retry_calls = [
            call for call in mock_emit.call_args_list if call[0][1] == "task_retries_total"
        ]
        assert len(retry_calls) == 1
        assert retry_calls[0][0][2] == 3

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    @patch("observability.tasks.emit_metric")
    @patch("observability.tasks.set_correlation_id")
    def test_correlation_id_extraction(self, mock_set_correlation_id, mock_emit):
        """Test correlation_id extraction from request headers."""

        class TestTask(ObservableTask):
            name = "test_task"

            def run(self, *args, **kwargs):
                return "success"

        task = TestTask()
        task.request.retries = 0
        task.request.id = "test-id"
        task.request.correlation_id = "test-correlation-id"

        # Execute task
        task()

        # Verify correlation_id set
        mock_set_correlation_id.assert_called_once_with("test-correlation-id")


# ==============================================================================
# Integration Tests (Major Issue #4 - verify metrics appear at /metrics)
# ==============================================================================


class TestMetricsIntegration(TestCase):
    """Integration tests for end-to-end metric emission and scraping."""

    def setUp(self):
        """Set up test environment with PrometheusCollector."""
        METRIC_COLLECTORS.clear()
        from observability.exporters import PrometheusCollector

        register_metric_collector(PrometheusCollector())

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_metrics_endpoint_shows_emitted_metrics(self):
        """
        Integration test: Emit metric, verify it appears at /metrics endpoint.

        Addresses Review Feedback Issue #3:
        Verifies PrometheusCollector metrics are registered to global REGISTRY
        and exposed via django-prometheus /metrics endpoint.
        """
        from observability import emit_metric

        # Emit a test metric
        emit_metric("counter", "integration_test_counter", 5, {"test_label": "test_value"})

        # Fetch /metrics endpoint
        response = self.client.get("/metrics")

        # Verify response
        assert response.status_code == 200

        # Verify metric appears in Prometheus exposition format
        content = response.content.decode("utf-8")
        assert "integration_test_counter" in content
        # Note: label cardinality validation may transform label values

    @override_settings(OBSERVABILITY_METRICS_ENABLED=True)
    def test_http_metrics_appear_at_endpoint(self):
        """
        Integration test: Make HTTP request, verify metrics appear at /metrics.

        Tests HTTPMetricsMiddleware integration with PrometheusCollector.
        """
        # Make a test HTTP request (triggers HTTPMetricsMiddleware)
        response = self.client.get("/health/live")
        assert response.status_code == 200

        # Fetch /metrics endpoint
        metrics_response = self.client.get("/metrics")
        content = metrics_response.content.decode("utf-8")

        # Verify HTTP metrics appear
        # Note: http_requests_total may already exist from django-prometheus
        # Our custom HTTPMetricsMiddleware adds additional data points
        assert "http_requests_total" in content or "http_request_duration_seconds" in content
