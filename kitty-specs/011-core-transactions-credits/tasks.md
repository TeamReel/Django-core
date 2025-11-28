# Work Packages: Core Transactions & Credits Engine

**Feature**: 011-core-transactions-credits
**Branch**: `011-core-transactions-credits`
**Inputs**: plan.md, quickstart.md, contracts/transactions-api.yaml
**Prerequisites**: B05 (User), B06 (Organisation), B07 (Project), B09 (Audit)

**Tests**: Included per constitution - 90% coverage target

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently deliverable and testable.

**Prompt Files**: Each work package references a matching prompt in `tasks/planned/` with detailed implementation guidance.

**Constitutional Compliance**: All tasks align with Django Core-App Constitution (`.kittify/memory/constitution.md`).

---

## Work Package WP01: Django App Setup & Models (Priority: P0)

**Goal**: Create transactions Django app with data models (UsageEvent, Transaction, BalancePolicy), migrations, and admin configuration.
**Independent Test**: Migrations run successfully; models pass unit tests; admin interface accessible.
**Prompt**: `tasks/planned/WP01-django-app-setup-models.md`

### Included Subtasks
- [ ] T001 Create transactions Django app structure (`src/transactions/`)
- [ ] T002 Define UsageEvent model with UUID PK, JSONB metadata, partial indexes
- [ ] T003 Define Transaction model with NUMERIC(14,4) amount, idempotency enforcement
- [ ] T004 Define BalancePolicy model with enforcement modes enum
- [ ] T005 Add model Meta classes (indexes, constraints, ordering)
- [ ] T006 Create custom model managers (TransactionManager, UsageEventManager)
- [ ] T007 Create migration 0001_initial.py with all tables, indexes, constraints
- [ ] T008 Configure Django admin for all three models
- [ ] T009 [P] Write unit tests for model creation, validation, constraints
- [ ] T010 Add transactions app to INSTALLED_APPS in config/settings/base.py
- [ ] T011 Create src/transactions/README.md with architecture overview

### Constitutional Alignment
- Principle II (Architecture): Single Responsibility - new app for billing
- Principle III (Code Quality): Type hints, Python 3.12+, no dead code
- Principle IV (Testing): Model unit tests, 90% coverage
- Principle VI (Performance): Partial indexes, no N+1 queries design

### Implementation Notes
- Use DecimalField for amounts (NUMERIC 14,4 in PostgreSQL)
- Implement partial unique indexes for nullable idempotency_key
- Add CHECK constraints (amount != 0, enforcement_mode validation)
- GIN index on metadata JSONB field

### Parallel Opportunities
- Unit tests (T009) can be written while admin config (T008) is being done

### Dependencies
- None (foundational work package)

### Risks & Mitigations
- Migration size → Use CONCURRENTLY for GIN indexes if needed
- DecimalField precision → Explicitly set max_digits=14, decimal_places=4

---

## Work Package WP02: Service Layer & Business Logic (Priority: P0)

**Goal**: Implement service layer with transaction creation, balance calculation, policy enforcement, and cache invalidation.
**Independent Test**: Service functions pass unit tests; policy enforcement blocks negative balances; Redis caching works.
**Prompt**: `tasks/planned/WP02-service-layer-business-logic.md`

### Included Subtasks
- [ ] T012 Create src/transactions/services.py module structure
- [ ] T013 Implement `record_usage_event()` with idempotency handling
- [ ] T014 Implement `create_transaction()` with locking (SELECT FOR UPDATE)
- [ ] T015 Implement `get_organization_balance()` with Redis caching
- [ ] T016 Implement `get_project_balance()` with Redis caching
- [ ] T017 Implement `get_policy()` with defaults fallback
- [ ] T018 Implement `check_policy_violation()` with enforcement logic
- [ ] T019 Implement `invalidate_balance_cache()` for Redis keys
- [ ] T020 Create src/transactions/exceptions.py (InsufficientBalanceError, PolicyViolationError)
- [ ] T021 [P] Write service layer unit tests (all functions)
- [ ] T022 [P] Write integration tests (usage event → transaction flow)
- [ ] T023 Add Django signals for post_save Transaction → cache invalidation

### Constitutional Alignment
- Principle II (Architecture): Service layer pattern separates business logic
- Principle IV (Testing): Unit tests + integration tests
- Principle V (Security): Multi-tenant isolation via ORM filters
- Principle VI (Performance): Redis caching, pessimistic locking

### Implementation Notes
- Use `select_for_update()` on Organization/Project during transaction writes
- Cache key format: `balance:org:{id}` and `balance:proj:{id}`
- TTL 60 seconds for balance cache
- Invalidate cache ONLY after successful Transaction.save()

### Parallel Opportunities
- Unit tests (T021) and integration tests (T022) can proceed in parallel

### Dependencies
- WP01 (models must exist)

### Risks & Mitigations
- Lock contention → Set lock timeout, implement retry with backoff
- Redis downtime → Graceful degradation (compute from DB if cache unavailable)

---

## Work Package WP03: REST API Endpoints (Priority: P1)

**Goal**: Implement DRF API for usage events, transactions, balances, and policies.
**Independent Test**: All 8 endpoints return correct responses; permissions enforced; CSV export works.
**Prompt**: `tasks/planned/WP03-rest-api-endpoints.md`

### Included Subtasks
- [ ] T024 Create src/transactions/api/ module structure
- [ ] T025 Implement UsageEventSerializer with validation
- [ ] T026 Implement TransactionSerializer with decimal validation
- [ ] T027 Implement BalanceSerializer (read-only, computed fields)
- [ ] T028 Implement BalancePolicySerializer
- [ ] T029 Create UsageEventViewSet (list, create)
- [ ] T030 Create TransactionViewSet (list, create) with CSV export
- [ ] T031 Create OrganizationBalanceView (retrieve)
- [ ] T032 Create ProjectBalanceView (retrieve)
- [ ] T033 Create BalancePolicyViewSet (retrieve, update)
- [ ] T034 Create src/transactions/api/filters.py (django-filter classes)
- [ ] T035 Create src/transactions/api/urls.py with router configuration
- [ ] T036 Include transactions.api.urls in config/urls.py
- [ ] T037 [P] Write API tests for all endpoints (success, validation, errors)
- [ ] T038 [P] Test policy enforcement (403 responses)
- [ ] T039 [P] Test CSV export functionality

### Constitutional Alignment
- Principle II (Stable APIs): DRF serializers/viewsets
- Principle IV (Testing): API tests with 90% coverage
- Principle V (Security): DRF permissions, multi-tenant isolation
- Principle VII (UX): Consistent responses, clear error messages, versioning

### Implementation Notes
- Use DRF pagination (50 items default)
- CSV export via custom renderer or StreamingHttpResponse
- Error responses follow RFC 7807 format
- Include /api/v1/ prefix in URLs

### Parallel Opportunities
- Serializers (T025-T028) can be written in parallel
- ViewSets (T029-T033) can be implemented in parallel after serializers
- All API tests (T037-T039) can run in parallel

### Dependencies
- WP02 (service layer must exist)

### Risks & Mitigations
- CSV memory usage → Use iterator() and streaming for large exports
- Permission checks → Ensure all viewsets check org/project access via B08

---

## Work Package WP04: Redis Caching & Signals (Priority: P1)

**Goal**: Configure Redis caching backend and implement cache invalidation signals.
**Independent Test**: Balance queries hit cache; cache invalidates on transaction write; cache misses compute correctly.
**Prompt**: `tasks/planned/WP04-redis-caching-signals.md`

### Included Subtasks
- [ ] T040 Configure django-redis in config/settings/base.py
- [ ] T041 Add Redis connection to environment variables (.env.example)
- [ ] T042 Create src/transactions/signals.py with post_save handler
- [ ] T043 Connect signals to Transaction model in apps.py ready() method
- [ ] T044 Implement cache_balance() helper function
- [ ] T045 Implement get_cached_balance() with fallback to DB
- [ ] T046 [P] Write cache hit/miss tests
- [ ] T047 [P] Write cache invalidation tests
- [ ] T048 [P] Write concurrent write tests (10 threads)

### Constitutional Alignment
- Principle III (Dependencies): django-redis added to requirements
- Principle IV (Testing): Cache behavior tests, concurrency tests
- Principle VI (Performance): Explicit caching with 60s TTL
- Principle XII (No Circular Deps): django-redis has no app dependencies

### Implementation Notes
- Use django_redis.cache.RedisCache backend
- TTL 60 seconds for balance keys
- Invalidation triggered by post_save signal on Transaction model
- Cache keys: `balance:org:{org_id}` and `balance:proj:{proj_id}`

### Parallel Opportunities
- All tests (T046-T048) can run in parallel

### Dependencies
- WP01 (Transaction model), WP02 (service layer)

### Risks & Mitigations
- Redis unavailable → Service layer gracefully falls back to DB query
- Multi-server cache → Use Redis Pub/Sub if needed (Phase 2 optimization)

---

## Work Package WP05: Management Commands & Cleanup (Priority: P2)

**Goal**: Create management commands for idempotency cleanup and test data seeding.
**Independent Test**: Commands run successfully; expired keys removed; test data loads.
**Prompt**: `tasks/planned/WP05-management-commands-cleanup.md`

### Included Subtasks
- [ ] T049 Create src/transactions/management/commands/cleanup_idempotency_keys.py
- [ ] T050 Implement cleanup logic (delete keys older than 7 days)
- [ ] T051 Add --retention-days argument with default from settings
- [ ] T052 Add dry-run mode (--dry-run flag)
- [ ] T053 Create src/transactions/management/commands/seed_test_transactions.py
- [ ] T054 Implement fixture generation (sample orgs, events, transactions)
- [ ] T055 [P] Write command tests
- [ ] T056 Document commands in src/transactions/README.md

### Constitutional Alignment
- Principle VIII (Developer Experience): Easy setup with seed data
- Principle IV (Testing): Command tests included
- Principle XI (Documentation): Commands documented in README

### Implementation Notes
- Use Django Q objects for date filtering
- Log deleted counts at INFO level
- Seed command creates realistic test data (various event types, amounts)

### Parallel Opportunities
- Both commands (T049-T054) can be developed in parallel
- Tests (T055) can run in parallel

### Dependencies
- WP01 (models must exist)

### Risks & Mitigations
- Large cleanup → Batch deletes to avoid long transactions

---

## Work Package WP06: Testing & Quality Gates (Priority: P1)

**Goal**: Achieve 90% test coverage; configure pytest-cov; write performance tests.
**Independent Test**: `pytest --cov` passes with ≥90%; performance tests meet SLAs.
**Prompt**: `tasks/planned/WP06-testing-quality-gates.md`

### Included Subtasks
- [ ] T057 Configure pytest-cov in pyproject.toml (--cov-fail-under=90)
- [ ] T058 Create tests/transactions/factories.py (factory_boy fixtures)
- [ ] T059 Create tests/transactions/fixtures/ (JSON fixtures)
- [ ] T060 Write performance test: balance query with 100k transactions (<500ms)
- [ ] T061 Write performance test: 100 concurrent transaction writes
- [ ] T062 Write performance test: bulk export 1M transactions (<5s)
- [ ] T063 [P] Write edge case tests (exactly zero balance, large amounts)
- [ ] T064 [P] Write error handling tests (missing FK, invalid amounts)
- [ ] T065 [P] Write multi-tenant isolation tests (cross-org data leakage)
- [ ] T066 Run full test suite and achieve 90% coverage
- [ ] T067 Update GitHub Actions CI to run transaction tests

### Constitutional Alignment
- Principle IV (Testing): 90% coverage, deterministic tests, pytest framework
- Principle V (Security): Multi-tenant isolation tests
- Principle VI (Performance): Performance tests validate SLAs
- Principle X (CI/CD): CI gates enforce coverage threshold

### Implementation Notes
- Use pytest-django fixtures
- factory_boy for model factories
- pytest-xdist for parallel test execution
- Freeze time in tests for determinism

### Parallel Opportunities
- All test writing (T060-T065) can proceed in parallel
- Factories (T058) independent of fixtures (T059)

### Dependencies
- WP01-WP04 (all code must exist)

### Risks & Mitigations
- Flaky tests → Use fixed timestamps, deterministic UUIDs
- Slow tests → Use pytest-xdist for parallelization

---

## Work Package WP07: Documentation & ADRs (Priority: P2)

**Goal**: Write comprehensive documentation and architecture decision records.
**Independent Test**: Docs render correctly; ADRs capture key decisions; quickstart verified.
**Prompt**: `tasks/planned/WP07-documentation-adrs.md`

### Included Subtasks
- [ ] T068 Write src/transactions/README.md (architecture, usage, models)
- [ ] T069 Write docs/billing-integration.md (external developer guide)
- [ ] T070 Update main README.md with transactions engine overview
- [ ] T071 Write ADR-011-001: Single-Ledger vs Double-Entry
- [ ] T072 Write ADR-011-002: Computed Balance vs Stored Balance
- [ ] T073 Write ADR-011-003: Idempotency Key Retention Policy
- [ ] T074 Write ADR-011-004: Redis Cache Invalidation Strategy
- [ ] T075 [P] Generate API docs with drf-spectacular
- [ ] T076 Verify quickstart.md examples work end-to-end

### Constitutional Alignment
- Principle XI (Documentation): In-repo docs, getting started guide, extension guide, ADRs
- Principle VIII (Developer Experience): Easy setup, clear docs
- Principle VII (API Design): drf-spectacular for auto-generated API docs

### Implementation Notes
- ADRs follow standard format (Context, Decision, Consequences)
- API docs auto-generated from DRF serializers
- Quickstart validation: actually run all code examples

### Parallel Opportunities
- All ADRs (T071-T074) can be written in parallel
- README writing (T068-T070) can proceed in parallel
- API doc generation (T075) independent of ADRs

### Dependencies
- WP01-WP05 (all features implemented)

### Risks & Mitigations
- Docs drift → Update docs in same PR as code changes

---

## Work Package WP08: Metrics & Observability (Priority: P2)

**Goal**: Add prometheus metrics, structured logging, and health checks.
**Independent Test**: Metrics endpoint exposes transaction counters; logs include context; health check passes.
**Prompt**: `tasks/planned/WP08-metrics-observability.md`

### Included Subtasks
- [ ] T077 Add django-prometheus integration for transactions app
- [ ] T078 Create metrics: transaction_writes_total (counter)
- [ ] T079 Create metrics: transaction_write_latency_seconds (histogram)
- [ ] T080 Create metrics: balance_queries_total (counter)
- [ ] T081 Create metrics: balance_query_latency_seconds (histogram)
- [ ] T082 Create metrics: policy_violations_total (counter by mode)
- [ ] T083 Create metrics: cache_hits_total / cache_misses_total (counters)
- [ ] T084 Add structured logging with transaction_id, org_id context
- [ ] T085 Create health check endpoint (/api/v1/health/transactions/)
- [ ] T086 [P] Write observability tests (metrics increment, logs emit)
- [ ] T087 Document metrics in docs/observability.md

### Constitutional Alignment
- Principle VI (Performance): Metrics hooks, structured logging, health checks
- Principle XI (Documentation): Observability guide

### Implementation Notes
- Use django-prometheus (already in stack from B06)
- Health check validates: DB connection, Redis connection, balance calculation
- Structured logging uses JSON format in production

### Parallel Opportunities
- Metric creation (T078-T083) can proceed in parallel
- Logging (T084) independent of metrics
- Tests (T086) can run in parallel

### Dependencies
- WP01-WP05 (all features implemented)

### Risks & Mitigations
- Metrics overhead → Use sampling for high-frequency counters if needed

---

## Summary Statistics

**Total Work Packages**: 8
**Total Subtasks**: 87
**Parallelizable Subtasks**: 32 (marked with [P])

**Estimated Effort by Priority**:
- P0 (Critical): WP01, WP02 (~25 subtasks) - Must complete first
- P1 (High): WP03, WP04, WP06 (~30 subtasks) - Core functionality
- P2 (Medium): WP05, WP07, WP08 (~32 subtasks) - Polish & ops

**MVP Scope** (Minimum Viable Product):
- WP01: Django App Setup & Models
- WP02: Service Layer & Business Logic
- WP03: REST API Endpoints
- **MVP subtask count**: ~50 subtasks

**Parallelization Strategy**:
- WP01 foundational → WP02 depends on WP01 → WP03/WP04 depend on WP02
- WP05/WP06/WP07/WP08 can proceed in parallel after WP03/WP04 complete
- Within packages: serializers, tests, docs, metrics can parallelize

**Next Steps**:
1. ✅ Task breakdown complete (this file)
2. ✅ Prompt files generated (tasks/planned/WP0x-*.md)
3. 🔄 Begin implementation: `/spec-kitty.implement WP01`
4. 🔄 Review after each package: `/spec-kitty.review WP01`
5. 🔄 Accept when ready: `/spec-kitty.accept`
6. 🔄 Merge to main: `/spec-kitty.merge`

---

**Constitutional Compliance Summary**:
All work packages align with Django Core-App Constitution principles:
- ✅ Single Responsibility (Principle II): transactions app isolated
- ✅ Testing (Principle IV): 90% coverage target, pytest framework
- ✅ Security (Principle V): Multi-tenant isolation, no secrets in code
- ✅ Performance (Principle VI): Redis caching, no N+1 queries, metrics
- ✅ API Design (Principle VII): DRF, versioning, clear errors
- ✅ Developer Experience (Principle VIII): Easy setup, tooling, pre-commit
- ✅ Documentation (Principle XI): ADRs, READMEs, API docs, quickstart
- ✅ Quality Gates (Principle X): CI checks, coverage thresholds
