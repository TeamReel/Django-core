# Tasks: Cache Layer & Patterns

**Feature**: Cache Layer & Patterns
**Status**: Planned
**Progress**: 0 / 22

## Work Packages

### WP01: Core Cache Infrastructure & Circuit Breaker
**Goal**: Establish the base `CacheService` with resilience against Redis outages.
**Priority**: P0 (Foundational)
**Independent Test**: Unit tests for `CircuitBreaker` state transitions and `CacheService` fallback.

- [ ] **T001**: Verify `django-redis` configuration in `settings.py` (ensure aliases).
- [ ] **T002**: Create `core/cache/` module structure (`services.py`, `decorators.py`, `circuit_breaker.py`).
- [ ] **T003**: Implement `CircuitBreaker` class with Open/Closed/Half-Open states (TDD).
- [ ] **T004**: Implement `CacheService` wrapper with Circuit Breaker integration for `get`/`set`.

### WP02: Decorators & Tagging Strategy
**Goal**: Implement the developer-facing API (`@cache_result`) and tag-based invalidation.
**Priority**: P1 (Core Feature)
**Independent Test**: Verify `@cache_result` caches data and `invalidate_tags` clears it.

- [ ] **T005**: Implement `CacheService.add_tags(key, tags)` using Redis Sets.
- [ ] **T006**: Implement `CacheService.invalidate_tags(tags)` using Redis Sets.
- [ ] **T007**: Implement `@cache_result` decorator with hybrid key generation.
- [ ] **T008**: Implement `@cache_invalidate` decorator.
- [ ] **T009**: Unit tests for decorators and tagging scenarios.

### WP03: Metrics Collection (Backend)
**Goal**: Implement historical data collection and API endpoints for the dashboard.
**Priority**: P1 (Observability)
**Independent Test**: Verify `SystemMetric` records are created by the Celery task.

- [ ] **T010**: Create `SystemMetric` model (timestamp, hits, misses, memory, keys).
- [ ] **T011**: Implement `collect_system_metrics` Celery task.
- [ ] **T012**: Configure Celery Beat schedule (10 min interval).
- [ ] **T013**: Implement `GET /api/v1/system/cache/metrics` (Realtime + History).
- [ ] **T014**: Implement `POST /api/v1/system/cache/clear` and `benchmark` (including Circuit Breaker overhead measurement).

### WP04: Performance Dashboard (Frontend)
**Goal**: Visualize cache performance and provide admin controls.
**Priority**: P2 (UI)
**Independent Test**: Verify dashboard renders charts and actions work.

- [ ] **T015**: Scaffold `/demo/performance` page.
- [ ] **T016**: Implement `CacheStats` component (Gauges).
- [ ] **T017**: Implement `CacheHistory` component (Recharts Line Chart).
- [ ] **T018**: Implement `CacheActions` component (Clear, Benchmark).
- [ ] **T019**: Connect UI to APIs.

### WP05: Integration & Polish
**Goal**: Verify resilience and finalize documentation.
**Priority**: P3 (Polish)
**Independent Test**: "Unplug Test" passes.

- [ ] **T020**: Perform "Unplug Test" (Stop Redis, verify app doesn't crash).
- [ ] **T021**: Verify Metrics retention (mock data or short interval).
- [ ] **T022**: Update `quickstart.md` with final examples.
