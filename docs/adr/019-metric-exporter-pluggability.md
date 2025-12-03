# ADR 019: Metric Exporter Pluggability

**Status**: Accepted  
**Date**: 2025-12-03  
**Context**: B18 Platform Observability Foundation  
**Decision Makers**: Platform Architecture Team

---

## Problem

The core platform must support multiple metric backends (Prometheus, StatsD, OpenMetrics) without tight coupling to any single exporter library. Downstream products may have existing monitoring stacks that require different metric formats. The solution must:

1. Allow multiple metric exporters to coexist
2. Provide type safety for exporter implementations
3. Enable easy addition of new exporters without modifying core code
4. Maintain consistent metric emission API regardless of backend

---

## Decision

Use **Protocol pattern** for metric collector interface with pluggable exporter implementations.

### Architecture

```python
from typing import Protocol

class MetricCollector(Protocol):
    """Protocol for metric collector implementations."""
    
    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        """Increment a counter metric."""
        ...
    
    def observe(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Record a histogram observation."""
        ...
    
    def set_gauge(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        """Set a gauge value."""
        ...

# Core emission API
def emit_metric(metric_type: str, name: str, value: float, labels: dict[str, str] = {}) -> None:
    """Emit metric to all registered collectors."""
    for collector in METRIC_COLLECTORS:
        if metric_type == 'counter':
            collector.increment(name, int(value), labels)
        elif metric_type == 'histogram':
            collector.observe(name, value, labels)
        elif metric_type == 'gauge':
            collector.set_gauge(name, value, labels)
```

### Registration Pattern

```python
# List-based registry (consistent with health checks)
METRIC_COLLECTORS: list[MetricCollector] = []

def register_metric_collector(collector: MetricCollector) -> None:
    """Register a metric collector implementation."""
    METRIC_COLLECTORS.append(collector)

# Usage in apps.py
register_metric_collector(PrometheusCollector())
register_metric_collector(StatsDCollector(host='statsd.internal'))
```

---

## Alternatives Considered

### 1. Abstract Base Classes (ABC)

```python
from abc import ABC, abstractmethod

class MetricCollector(ABC):
    @abstractmethod
    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        pass
```

**Pros**:
- Explicit inheritance contract
- Runtime validation via `ABCMeta`
- More familiar to developers coming from other languages

**Cons**:
- Forces inheritance (couples implementations to base class)
- Requires `from abc import ABC, abstractmethod` boilerplate
- Less Pythonic (violates "duck typing" principle)

**Decision**: Rejected. Protocol pattern provides same type safety without forced inheritance.

---

### 2. Registry-Only Pattern (No Type Checking)

```python
METRIC_COLLECTORS = {}

def register_metric_collector(name: str, collector: Any) -> None:
    METRIC_COLLECTORS[name] = collector
```

**Pros**:
- Simpler implementation (no Protocol definition)
- Maximum flexibility (any callable works)
- Minimal boilerplate

**Cons**:
- No type safety (mypy can't validate implementations)
- Runtime errors if collector missing required methods
- No IDE autocomplete for collector methods

**Decision**: Rejected. Type safety is critical for maintainability.

---

### 3. Plugin System with Entry Points

```python
# setup.py
entry_points={
    'observability.metric_collectors': [
        'prometheus = observability.exporters.prometheus:PrometheusCollector',
        'statsd = observability.exporters.statsd:StatsDCollector',
    ],
}
```

**Pros**:
- Standard Python packaging mechanism
- Automatic discovery of plugins
- No manual registration needed

**Cons**:
- Over-engineered for internal use case
- Requires setuptools entry point infrastructure
- Harder to debug (implicit registration)

**Decision**: Rejected. Manual registration is sufficient for internal exporters.

---

## Trade-offs

### Advantages

1. **Type Safety**: mypy validates collector implementations match Protocol
2. **Duck Typing**: No forced inheritance (structural subtyping)
3. **Easy Extension**: New exporters implement Protocol without modifying core
4. **Multiple Backends**: List-based registry supports multiple simultaneous exporters
5. **Consistency**: Matches WP01 health check pattern (list-based registry)

### Disadvantages

1. **Python 3.8+ Required**: Protocol introduced in Python 3.8 (acceptable; baseline is 3.12+)
2. **Less Explicit**: No runtime enforcement of Protocol (only mypy static checking)
3. **No Versioning**: Protocol changes require all implementations to update

### Mitigations

- **Python Version**: Already baseline Python 3.12+, so Protocol is available
- **Runtime Validation**: Exception isolation (FR-011a) catches missing methods gracefully
- **Breaking Changes**: Protocol is internal to core; breaking changes only affect core team

---

## Consequences

### What Changes

1. **New Exporters**: Implement `MetricCollector` Protocol with `increment()`, `observe()`, `set_gauge()`
2. **Registration**: Call `register_metric_collector(collector)` in apps.py `ready()` method
3. **Emission API**: Core code uses `emit_metric()` abstraction; exporter selection via registry

### What Stays the Same

1. **Metric Types**: Counter, Histogram, Gauge remain the three core types
2. **Label Cardinality**: Cardinality validation (FR-013) applies to all exporters
3. **Exception Isolation**: All collector calls wrapped in try-except (FR-011a)

### Migration Path

**Existing Code**: No changes needed (Prometheus is default exporter)

**Adding New Exporter**:
1. Create exporter class implementing `MetricCollector` Protocol
2. Register in apps.py: `register_metric_collector(MyCollector())`
3. Verify metrics appear in target backend

**Example: Adding StatsD**:
```python
# myproduct/exporters/statsd.py
class StatsDCollector:
    def __init__(self, host='localhost', port=8125):
        self.client = statsd.StatsClient(host, port)
    
    def increment(self, name: str, value: int = 1, labels: dict[str, str] = {}) -> None:
        metric_name = f"{name}.{'.'.join(f'{k}_{v}' for k, v in labels.items())}"
        self.client.incr(metric_name, value)
    
    def observe(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        metric_name = f"{name}.{'.'.join(f'{k}_{v}' for k, v in labels.items())}"
        self.client.timing(metric_name, value * 1000)
    
    def set_gauge(self, name: str, value: float, labels: dict[str, str] = {}) -> None:
        metric_name = f"{name}.{'.'.join(f'{k}_{v}' for k, v in labels.items())}"
        self.client.gauge(metric_name, value)

# myproduct/apps.py
from observability.metrics import register_metric_collector
from .exporters.statsd import StatsDCollector

def ready(self):
    register_metric_collector(StatsDCollector(host='statsd.internal'))
```

---

## Validation

**Success Criteria**:
- [ ] Prometheus exporter remains default and functional
- [ ] New exporters can be added without modifying core code
- [ ] mypy validates collector implementations
- [ ] Multiple exporters can coexist (e.g., Prometheus + StatsD)
- [ ] Exception isolation prevents collector failures from breaking app

**Testing**:
- Unit tests verify Protocol compliance for PrometheusCollector
- Integration tests verify metrics appear in Prometheus after emission
- Mock collector tests verify registry iteration and exception handling

---

## References

- [PEP 544: Protocols (Structural Subtyping)](https://peps.python.org/pep-0544/)
- [FR-012: Prometheus Exporter](../../kitty-specs/018-platform-observability-foundation/spec.md#fr-012)
- [FR-014: Pluggable Metric Exporters](../../kitty-specs/018-platform-observability-foundation/spec.md#fr-014)
- [WP01: Health Check Registry Pattern](../../kitty-specs/018-platform-observability-foundation/tasks/done/WP01-health-checks-k8s-probes.md)
- [Extension Guide: Custom Metric Exporters](../observability-extension-guide.md#custom-metric-exporters)

---

## Approval

**Status**: ✅ Accepted  
**Approved By**: Platform Architecture Team  
**Date**: 2025-12-03

**Reviewers**:
- Platform Lead: Approved
- Security Team: Approved (no security implications)
- DevOps Team: Approved (supports existing monitoring stacks)
