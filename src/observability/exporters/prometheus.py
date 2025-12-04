"""Prometheus metric collector implementation."""

from prometheus_client import REGISTRY, Counter, Gauge, Histogram


# T033: PrometheusCollector
class PrometheusCollector:
    """
    Prometheus metric collector implementation (FR-012).

    Wraps prometheus-client with lazy metric initialization.
    Per-pod metrics; Prometheus handles aggregation (FR-012a).

    All metrics are registered to the global prometheus_client.REGISTRY,
    making them available at the /metrics endpoint (served by django-prometheus).
    """

    def __init__(self):
        self._counters: dict[tuple, Counter] = {}
        self._histograms: dict[tuple, Histogram] = {}
        self._gauges: dict[tuple, Gauge] = {}

    def increment(self, name: str, value: int = 1, labels: dict[str, str] | None = None) -> None:
        """Increment counter metric."""
        if labels is None:
            labels = {}

        # Create unique key for metric + label names
        label_names = tuple(sorted(labels.keys()))
        metric_key = (name, label_names)

        if metric_key not in self._counters:
            # Explicitly register to global REGISTRY (though it's the default)
            self._counters[metric_key] = Counter(
                name,
                f'Counter: {name}',
                labelnames=list(label_names),
                registry=REGISTRY
            )

        self._counters[metric_key].labels(**labels).inc(value)

    def observe(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Record histogram observation."""
        if labels is None:
            labels = {}

        label_names = tuple(sorted(labels.keys()))
        metric_key = (name, label_names)

        if metric_key not in self._histograms:
            self._histograms[metric_key] = Histogram(
                name,
                f'Histogram: {name}',
                labelnames=list(label_names),
                registry=REGISTRY
            )

        self._histograms[metric_key].labels(**labels).observe(value)

    def set_gauge(self, name: str, value: float, labels: dict[str, str] | None = None) -> None:
        """Set gauge value."""
        if labels is None:
            labels = {}

        label_names = tuple(sorted(labels.keys()))
        metric_key = (name, label_names)

        if metric_key not in self._gauges:
            self._gauges[metric_key] = Gauge(
                name,
                f'Gauge: {name}',
                labelnames=list(label_names),
                registry=REGISTRY
            )

        self._gauges[metric_key].labels(**labels).set(value)
