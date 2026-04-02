# B25: Cache Layer & Patterns

**Phase:** 9
**Status:** ✅ Done
**Module ID:** 037
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 37. B25 – Cache Layer & Patterns

**Doel**: Formaliseren van Redis-based caching met patterns, decorators en invalidation strategies.

**Waarom agnostisch**: Performance optimization via caching is universeel herbruikbaar.

**Wat moet er gebeuren**:
- **Redis integration**: Expand B06 Redis usage to central cache layer
  - Configure django-redis as cache backend
  - Multiple cache aliases (default, sessions, throttle)
- **Cache decorators**: `@cache_result(ttl=300)`, `@cache_invalidate(pattern)`
  - View-level caching (`@cache_page(60 * 15)`)
  - Query-level caching (custom decorator)
  - Template fragment caching
- **Cache patterns**:
  - Query result caching (ORM queryset caching)
  - Fragment caching (template blocks)
  - Rate limiting storage (per-user/per-IP)
- **Invalidation**:
  - Tag-based invalidation (cache groups)
  - TTL-based expiry (automatic)
  - Manual purge (management command)
  - Signal-based invalidation (on model save/delete)
- **Monitoring**: Cache hit/miss rates, memory usage, eviction stats
  - Prometheus metrics: `cache_hit_total`, `cache_miss_total`, `cache_memory_bytes`
  - Dashboard integration (B18 observability)
- **Configuration**: Per-environment cache settings, circuit breaker
  - Dev: short TTL (5 minutes)
  - Prod: long TTL (1 hour)
  - Circuit breaker: fallback to database if Redis down

**Demo Requirements**:
- 📊 **Performance Dashboard** (`/demo/performance`):
  - Cache hit/miss ratio chart (line chart, last 24h)
  - Memory usage gauge (Redis memory consumption)
  - Top cached queries list (most hit keys)
  - Cache clear button (purge all keys)
  - Before/after performance comparison (benchmark query with/without cache)
  - Tests: run cached query → verify faster than uncached, clear cache → verify metrics reset

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B25-cache-layer-patterns

[feature summary]
Formalize Redis-based caching with reusable patterns, decorators, and invalidation strategies.

[goals]
- Centralized cache configuration
- Reusable cache decorators
- Tag-based invalidation
- Performance metrics
- Circuit breaker (graceful degradation)

[demo requirements]
Demo page: /demo/performance
- Cache metrics dashboard
- Hit/miss ratio chart
- Memory usage
- Clear cache actions
- Performance comparison tests
```

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Cache Layer & Patterns
*Path: [templates/spec-template.md*

**Feature Branch**: `037-cache-layer-patterns`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "Formalize Redis-based caching with reusable patterns, decorators, and invalidation strategies."

## Clarifications

### Session 2026-01-04
- Q: How should the `@cache_result` decorator construct cache keys from function arguments? → A: Hybrid (allow both auto-hash and explicit format string).
- Q: How should the Circuit Breaker determine when to attempt a reset (transition from Open to Half-Open)? → A: Fixed timeout (e.g., 30s).
- Q: For the "Lightweight Metric Collector", how long should we retain historical data in the database? → A: 7 days (weekly trends).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Caching Patterns (Priority: P1)

As a backend developer, I want to easily cache expensive function results and invalidate them using tags, so that I can optimize performance without writing boilerplate code.

**Why this priority**: This is the core utility that enables performance optimization across the platform.

**Independent Test**: Can be tested by creating a dummy expensive function, decorating it, and verifying it only runs once.

**Acceptance Scenarios**:

1. **Given** an expensive function decorated with `@cache_result(ttl=60)`, **When** called multiple times, **Then** the function body executes only once.
2. **Given** a cached function result, **When** the TTL expires, **Then** the function executes again on the next call.
3. **Given** a function decorated with `@cache_result(tags=['org:123'])`, **When** I call `invalidate_tags(['org:123'])`, **Then** the cache entry is removed.
4. **Given** a view decorated with `@cache_page`, **When** accessed, **Then** the response is cached for the specified duration.

---

### User Story 2 - System Resilience (Circuit Breaker) (Priority: P1)

As a system operator, I want the application to continue functioning (using the database) if the cache layer fails, so that users do not experience downtime during infrastructure glitches.

**Why this priority**: Ensures the "Production-Grade" promise of the platform; outages are unacceptable for auxiliary services like cache.

**Independent Test**: Can be tested by configuring an invalid Redis URL and verifying the app still serves requests (albeit slower).

**Acceptance Scenarios**:

1. **Given** the Redis service is down, **When** a cached function is called, **Then** the system catches the connection error, logs a warning, and executes the function (fallback to DB).
2. **Given** Redis is down and the circuit breaker is "Open", **When** a cached function is called, **Then** the system skips the Redis connection attempt entirely and executes the function immediately.
3. **Given** the circuit breaker is "Open", **When** the cooldown period expires (Half-Open), **Then** the system attempts one connection to check if Redis is back.

---

### User Story 3 - Performance Observability (Priority: P2)

As an admin, I want to see cache performance metrics and history, so that I can tune TTLs and identify bottlenecks.

**Why this priority**: Provides visibility into the effectiveness of the caching strategy.

**Independent Test**: Can be tested by generating traffic and viewing the `/demo/performance` dashboard.

**Acceptance Scenarios**:

1. **Given** the performance dashboard, **When** I view it, **Then** I see current hit/miss ratios and memory usage.
2. **Given** the historical chart, **When** I view it, **Then** I see a line graph of cache hits/misses over the last 24 hours.
3. **Given** the "Clear Cache" button, **When** clicked, **Then** all cache keys are purged and metrics reflect the reset.
4. **Given** the "Benchmark" tool, **When** I run a test, **Then** I see the execution time difference between cached and uncached calls.

### Edge Cases

- **Redis Full**: What happens when Redis runs out of memory? (Should evict via LRU, app continues).
- **Serialization Failure**: What happens if a cached object cannot be pickled? (Should catch error, log, and skip cache).
- **Tag Explosion**: What happens if we invalidate a tag with 1 million keys? (Should use `SCAN` or async deletion to avoid blocking Redis).
- **Clock Skew**: What happens if app servers have different times? (TTLs might be slightly off, acceptable).

## Requirements *(mandatory)*

### Functional Requirements

**Core Caching & Decorators**
- **FR-001**: System MUST configure `django-redis` as the default cache backend with support for multiple aliases (default, sessions, locks).
- **FR-002**: System MUST provide a `@cache_result(key_pattern, ttl, tags)` decorator for arbitrary functions.
    - If `key_pattern` is provided, it MUST be formatted using function arguments (e.g., `"user:{user_id}"`).
    - If `key_pattern` is omitted, the system MUST automatically generate a key by hashing the function name and all arguments (using MD5 or SHA256).
- **FR-003**: System MUST provide a `@cache_invalidate(tags)` decorator that runs after a successful function execution (e.g., on model save).
- **FR-004**: System MUST implement a **Custom Wrapper** for tag-based invalidation that manages tag-to-key mappings (using Redis Sets with key pattern `cache:tag:{tag_name}`) to allow invalidating groups of keys (e.g., "all keys for org X").

**Resilience (Circuit Breaker)**
- **FR-005**: System MUST implement a **Local Circuit Breaker** (in-memory state machine) for Redis connections.
- **FR-006**: The Circuit Breaker MUST transition to "Open" state after 5 consecutive failures, preventing connection attempts for 30 seconds (Fixed Timeout strategy).
- **FR-007**: The Circuit Breaker MUST fallback to executing the underlying function (database query) when Open or when a connection error occurs.

**Metrics & Dashboard**
- **FR-008**: System MUST collect real-time metrics from Redis (`INFO stats`): hits, misses, memory used, total keys.
- **FR-009**: System MUST implement a **Lightweight Metric Collector** (background task) that snapshots these metrics to a database table every 10 minutes.
- **FR-010**: System MUST provide a dashboard page (`/demo/performance`) displaying:
    - Real-time gauges for Hit/Miss ratio and Memory.
    - A historical line chart (last 24h) derived from the collected metrics.
    - A "Clear Cache" action.
    - A "Benchmark" tool that runs a dummy query with and without cache to demonstrate speedup.

### Non-Functional Requirements

- **NFR-001**: **Performance**: Cached retrieval MUST be < 10ms (excluding network latency).
- **NFR-002**: **Reliability**: The application MUST NOT crash if Redis is unreachable.
- **NFR-003**: **Overhead**: The Circuit Breaker logic MUST add negligible overhead (< 1ms) to cache calls.
- **NFR-004**: **Data Retention**: Historical metric data MUST be automatically pruned (keep last 7 days) to prevent database bloat.

## Success Criteria *(mandatory)*

- **SC-001**: **Resilience**: System passes the "Unplug Test" (Redis stopped) with 0% error rate for end-users (graceful degradation).
- **SC-002**: **Observability**: Dashboard successfully renders a 24-hour history chart of cache performance.
- **SC-003**: **Efficiency**: Benchmark test demonstrates at least 10x speedup for cached vs uncached complex queries.
- **SC-004**: **Usability**: Developers can cache a function with a single line of code (`@cache_result`).

## Assumptions

- Redis is available as a service in the deployment environment (Railway/Docker).
- `django-redis` is the underlying library.
- We are using the default `LocMemCache` for local development if Redis is not configured (though the Circuit Breaker should still be testable by forcing a connection error).

## Key Entities

- **SystemMetric**: Model to store historical snapshots (timestamp, hit_count, miss_count, memory_bytes).
- **CacheService**: Central utility class/module containing the decorators and circuit breaker logic.
