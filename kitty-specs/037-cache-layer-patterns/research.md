# Research Findings: Cache Layer & Patterns

**Feature**: Cache Layer & Patterns
**Date**: 2026-01-04

## Decisions

### 1. Tag-based Invalidation Strategy
- **Decision**: Use **Redis Sets** to track keys per tag.
- **Rationale**:
    - **Efficiency**: Adding a tag is O(1). Invalidating a tag is O(N) where N is the number of keys in that tag.
    - **Scalability**: Compatible with future Redis Cluster migration (using hash tags).
    - **Simplicity**: Standard pattern supported by `django-redis` primitives.
- **Alternatives Considered**:
    - **Separate DB**: Rejected due to connection overhead and cluster incompatibility.
    - **Key Prefixing**: Rejected due to O(N) scan performance issues on large datasets.

### 2. Circuit Breaker Implementation
- **Decision**: **Local In-Memory** state machine with **Fixed Timeout** (30s).
- **Rationale**:
    - **Resilience**: Prevents cascading failures when Redis is down.
    - **Simplicity**: No external coordination store needed (unlike distributed circuit breakers).
    - **Performance**: Negligible overhead (< 1ms) as it's just a local variable check.
- **Alternatives Considered**:
    - **Simple Try/Except**: Rejected because it causes latency spikes during timeouts.
    - **Exponential Backoff**: Rejected as unnecessary complexity for this phase.

### 3. Metrics Collection & Retention
- **Decision**: **Celery Beat** task every 10 mins, retaining **7 days** of data.
- **Rationale**:
    - **Observability**: Provides historical context (weekly trends) which real-time stats lack.
    - **Lightweight**: 7 days of data is small enough to store in the main DB without bloat.
    - **Integration**: Leverages existing Celery infrastructure.
- **Alternatives Considered**:
    - **Real-time Only**: Rejected as it lacks historical insight.
    - **30 Days**: Rejected as overkill for an internal tool.

### 4. Cache Key Strategy
- **Decision**: **Hybrid** (Auto-hash default, explicit override allowed).
- **Rationale**:
    - **DX**: "Just works" for simple cases.
    - **Control**: Allows semantic keys for critical data that needs manual invalidation.

## Unknowns & Risks

- **Risk**: Local Circuit Breaker state is per-process. If one worker trips, others might still try to connect until they also trip.
    - **Mitigation**: Acceptable for this phase. The goal is to protect the *system* from hanging, not perfect synchronization.
- **Risk**: Tag sets growing too large (e.g., "all users").
    - **Mitigation**: Documentation must warn against tagging high-cardinality groups without sharding.

## Best Practices

- **TTL**: Always set a TTL. Never cache forever.
- **Versioning**: Include a version number in keys if the data structure changes.
- **Serialization**: Use `pickle` (default in django-redis) but be aware of schema changes.
