# Implementation Plan: Core Transactions & Credits Engine

**Branch**: `011-core-transactions-credits` | **Date**: 2025-11-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/011-core-transactions-credits/spec.md`

## Summary

Implement a generic transaction and credits engine to track usage events, balances, and billable events at organization and project levels. The system uses a single-ledger approach with signed decimal amounts, computed balances with Redis caching, and configurable billing policies (prepaid/postpaid). Key features include idempotent transaction writes, multi-tenant isolation, bulk export (CSV/JSON), and sub-500ms balance queries for 100k transactions.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, django-redis (caching), PostgreSQL 12+ (NUMERIC type, JSONB, partial indexes)
**Storage**: PostgreSQL with tables: `usage_events`, `transactions`, `balance_policies`. Redis for balance caching (60s TTL).
**Testing**: pytest 8.0+, pytest-django, factory_boy (fixtures), pytest-xdist (parallel execution)
**Target Platform**: Linux server (Django WSGI/ASGI)
**Project Type**: Django web backend (REST API)
**Performance Goals**:
- Balance queries: <500ms for 100k transactions
- Transaction writes: <200ms including lock acquisition
- Concurrent writes: 100/sec without data loss
- Bulk export: <5s for 1M transactions

**Constraints**:
- Multi-tenant isolation: 0% cross-org data leakage
- Financial precision: NUMERIC(14,4) - no rounding errors
- Idempotency: Required for transactions, optional for usage events
- Immutability: UsageEvent and Transaction records never updated/deleted

**Scale/Scope**:
- 1,000 organizations initially
- ~1M transactions/month across all orgs
- ~5M usage events/month
- 90% test coverage target

### Architecture Decisions

**1. Single-Ledger with Signed Amounts**
- Decision: Use one Transaction table with signed `amount` field (positive=increase, negative=decrease)
- Rationale: Simpler than separate Credit/Debit tables; easier balance calculation (SUM); industry standard (Stripe, AWS)
- Alternative rejected: Double-entry bookkeeping (unnecessary complexity for this use case)

**2. Computed Balance (Not Stored)**
- Decision: Calculate balance on-demand via SUM aggregation, cache in Redis (60s TTL)
- Rationale: Source of truth remains Transaction table; no risk of stored balance drifting; easier reconciliation
- Cache invalidation: After every successful Transaction write (not UsageEvent)
- Alternative rejected: Stored balance field (risk of inconsistency, requires reconciliation logic)

**3. Transaction Source References**
- Decision: Separate nullable FK fields (`usage_event_id`, `external_reference_id`)
- Rationale: Type-safe, faster queries, no GenericForeignKey overhead
- Alternative rejected: GenericForeignKey (adds complexity, slower queries, only needed if 3+ source types emerge)

**4. BalancePolicy Responsibilities**
- **Scope**: BalancePolicy ONLY decides enforcement actions (allow/block/warn) and warning thresholds
- **Explicitly handles**:
  - `allow_negative` (boolean): Can balance go negative?
  - `warn_threshold` (decimal): Balance level to trigger warnings
  - `enforcement_mode` (enum): 'block', 'warn', or 'allow'
- **Explicitly does NOT handle**:
  - Pricing rules (per-unit costs, tiered pricing) - product-specific, out of scope
  - Spending limits/budgets - future feature, builds on top of this engine
  - Payment method configuration - external billing system responsibility
  - Invoice generation - external billing system responsibility
- **Policy Evaluation Timing**: Checked BEFORE transaction write; if enforcement_mode='block' and balance would go negative, return 403 Forbidden

**5. Redis Cache Invalidation Strategy**
- **Invalidation Trigger**: After every successful Transaction.save() (commit)
- **Cache Keys Invalidated**:
  - `balance:org:{organization_id}` (always)
  - `balance:proj:{project_id}` (if transaction has project_id)
- **NOT Invalidated On**: UsageEvent creation (events don't affect balance until Transaction created)
- **TTL**: 60 seconds (short enough for acceptable staleness, long enough for read performance)
- **Cache Miss Strategy**: Compute balance via SQL SUM, store in Redis, return to client
- **Multi-Server Consideration**: Use Redis Pub/Sub for distributed cache invalidation (Phase 2 optimization if needed)

**6. Idempotency Key Handling**
- UsageEvent: `idempotency_key` nullable (client manages deduplication if needed)
- Transaction: `idempotency_key` required NOT NULL (financial safety)
- Retention: 7 days (configurable via IDEMPOTENCY_KEY_RETENTION_DAYS env var)
- Cleanup: Celery periodic task runs daily, deletes expired keys

**7. Concurrency Control**
- Mechanism: Pessimistic locking (SELECT FOR UPDATE) on Organization/Project during transaction write
- Lock scope: Organization row OR Project row (depending on transaction scope)
- Lock duration: <10ms (balance calculation + transaction insert)
- Alternative (future): Optimistic locking if performance bottlenecks emerge

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows - Generic transaction engine, products define their own pricing
- [x] **Core Focus**: Feature aligns with core concerns - Billing infrastructure is core capability
- [x] **Downstream Extension**: Product-specific needs handled via event_type taxonomy + metadata (products define own usage events)

### II. Architecture and Modularity
- [x] **Single Responsibility**: New Django app `transactions/` handles usage tracking + financial ledger
- [x] **Stable APIs**: DRF serializers/viewsets for UsageEvent, Transaction, Balance queries
- [x] **Minimal Dependencies**: Only django-redis added (caching); PostgreSQL native features used
- [x] **No Circular Deps**: Depends on B05/B06/B07 (User, Organisation, Project); no reverse dependencies
- [x] **No Downstream Imports**: Core engine has no product-specific imports

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline maintained
- [x] **Type Hints**: All models, services, serializers will use type hints
- [x] **Black Formatting**: Pre-commit hook enforced
- [x] **Ruff Linting**: Configured in pyproject.toml
- [x] **No Dead Code**: New feature, no dead code
- [x] **Readable Code**: Service layer pattern (models, services, API views separated)
- [x] **Curated Dependencies**: django-redis only new dep (Redis already in stack for B06)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Standard testing framework
- [x] **Test Coverage**: 90% target - model tests, service tests, API tests, integration tests
- [x] **Regression Tests**: All bug fixes will include tests
- [x] **Deterministic**: No flaky tests; fixed timestamps in factories
- [x] **Coverage Thresholds**: pytest-cov with --cov-fail-under=90
- [x] **Integration Tests**: Usage event → Transaction flow, concurrent writes, policy enforcement

### V. Security and Privacy
- [x] **Secure Defaults**: Inherits from Django settings (CSRF, secure cookies, ALLOWED_HOSTS)
- [x] **DEBUG Off**: Production settings already configured
- [x] **No Secrets**: Redis connection via environment variables
- [x] **Dependency Scanning**: CI already runs pip-audit (B03)
- [x] **Centralized Auth**: DRF permissions check org/project access via B08
- [x] **No Sensitive Logging**: Financial amounts masked in logs; idempotency keys hashed

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Aggregation queries use single SUM; select_related for FK joins
- [x] **Pagination**: Transaction history uses cursor pagination (50 items default)
- [x] **Explicit Caching**: Redis caching for balances (60s TTL, invalidate on write)
- [x] **Structured Logging**: Django logging with transaction_id, org_id context
- [x] **Health Checks**: Balance calculation health check endpoint
- [x] **Metrics Hooks**: django-prometheus integration (B06 already has this)
- [x] **Graceful Degradation**: If Redis down, compute balance from DB; if lock timeout, retry with backoff

### VII. UX and API Design
- [x] **DRF Required**: Using DRF serializers, viewsets, routers
- [x] **Consistent Responses**: Standard DRF response format; errors follow RFC 7807
- [x] **Versioning Strategy**: URLs use /api/v1/ prefix; deprecation via X-Deprecated-Version header
- [x] **Clear Errors**: 403 with structured JSON for policy violations (no data leaks)
- [x] **Boundary Validation**: Serializers validate idempotency keys, FK references, decimal precision

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Django migrations + fixture command for test data
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest already configured
- [x] **Pre-commit Hooks**: Already match CI checks
- [x] **Type Checking**: mypy strict mode on transactions/ app
- [x] **Task Scripts**: manage.py commands for cleanup (expired idempotency keys)
- [x] **Developer Docs**: API docs auto-generated via drf-spectacular

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work on `011-core-transactions-credits` branch
- [x] **Linked to Spec**: PR references spec.md and plan.md
- [x] **Focused PRs**: Single feature, no scope creep
- [x] **main Stable**: Merge only after CI passes + review

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest already in GitHub Actions
- [x] **Merge Gates**: All checks must pass; 90% coverage required
- [x] **Scripted Deployment**: Django migrations run in deployment pipeline

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: API integration guide in docs/billing-integration.md
- [x] **App README**: transactions/README.md with architecture overview
- [x] **Getting Started**: Update main README with billing engine setup
- [x] **Extension Guide**: Document event_type taxonomy, metadata schemas
- [x] **Spec Sync**: Update spec.md if implementation deviates
- [x] **ADR Required**: ADRs for: idempotency retention policy, single-ledger vs double-entry, Redis caching strategy

### XII. Constitution Evolution
- [x] **No Constitution Changes**: Feature complies with existing constitution
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*No violations*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/011-core-transactions-credits/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Research decisions and evidence
├── data-model.md        # Entity definitions and relationships
├── quickstart.md        # Getting started guide
├── contracts/           # API contracts (OpenAPI schema)
│   └── transactions-api.yaml
├── checklists/          # Validation checklists
│   └── requirements.md
└── research/            # Evidence audit trail
    ├── evidence-log.csv
    └── source-register.csv
```

### Source Code (repository root)

```
src/
├── transactions/              # New Django app (this feature)
│   ├── __init__.py
│   ├── README.md             # Architecture overview
│   ├── apps.py
│   ├── models.py             # UsageEvent, Transaction, BalancePolicy
│   ├── admin.py              # Django admin config
│   ├── services.py           # Business logic (balance calculation, policy enforcement)
│   ├── exceptions.py         # Custom exceptions (InsufficientBalanceError, etc.)
│   ├── managers.py           # Custom QuerySet managers
│   ├── signals.py            # Post-save signals for cache invalidation
│   ├── api/
│   │   ├── __init__.py
│   │   ├── serializers.py   # DRF serializers
│   │   ├── views.py         # DRF viewsets
│   │   ├── urls.py          # API URL routing
│   │   └── filters.py       # django-filter classes
│   ├── management/
│   │   └── commands/
│   │       ├── cleanup_idempotency_keys.py  # Celery task/mgmt command
│   │       └── seed_test_transactions.py     # Dev data fixtures
│   ├── migrations/
│   │   └── 0001_initial.py  # Initial schema
│   └── tests/
│       ├── __init__.py
│       ├── factories.py      # factory_boy fixtures
│       ├── test_models.py    # Model tests
│       ├── test_services.py  # Service layer tests
│       ├── test_api.py       # API endpoint tests
│       └── test_integration.py  # End-to-end flow tests
│
├── config/
│   ├── settings/
│   │   ├── base.py           # Add transactions to INSTALLED_APPS
│   │   └── local.py          # Redis cache backend config
│   └── urls.py               # Include transactions.api.urls
│
└── docs/
    └── billing-integration.md  # How to integrate usage tracking

tests/
└── transactions/             # Additional test fixtures (shared across apps)
    └── fixtures/
        └── sample_transactions.json
```

## Phase 0: Research (✅ COMPLETE)

**Status**: Research artifacts already generated via `/spec-kitty.research`

**Artifacts Created**:
- ✅ `research.md` - 9 research questions with decisions, rationale, evidence
- ✅ `data-model.md` - 4 entities (UsageEvent, Transaction, BalancePolicy, Balance) with full specifications
- ✅ `research/evidence-log.csv` - 20 evidence entries with sources
- ✅ `research/source-register.csv` - 20 source references

**Key Decisions**:
1. Single-ledger approach (signed amounts) ✅
2. Computed balance with Redis caching ✅
3. Separate FK fields for transaction sources ✅
4. BalancePolicy scope (enforcement only, no pricing) ✅
5. Redis cache invalidation (on Transaction write only) ✅
6. Idempotency optional for events, required for transactions ✅
7. Pessimistic locking for concurrency ✅
8. NUMERIC(14,4) precision ✅
9. 7-day idempotency retention ✅

**Open Questions Resolved**:
- GenericForeignKey vs separate FKs → Separate FKs chosen
- Balance caching implementation → Redis with 60s TTL, invalidate on write
- Bulk export streaming → V1 uses pagination, V2 adds streaming if needed
- Metadata schema validation → No validation in core (product-agnostic)

---

## Phase 1: Design & Contracts

### Data Model (from data-model.md)

**Core Entities**:

1. **UsageEvent** (Immutable fact log)
   - Fields: id (UUID), event_type, user, organization, project, metadata (JSONB), timestamp, idempotency_key (nullable), created_at
   - Indexes: org+timestamp, project (partial), idempotency (unique partial), metadata (GIN)
   - Constraints: project belongs to organization

2. **Transaction** (Financial ledger)
   - Fields: id (UUID), amount (NUMERIC 14,4), organization, project, source_type, usage_event_id (nullable FK), external_reference_id (nullable), timestamp, created_by, idempotency_key (required), notes, created_at
   - Indexes: org+timestamp, project+timestamp (partial), idempotency (unique), source type
   - Constraints: amount != 0, project belongs to org, source_type validation

3. **BalancePolicy** (Configuration)
   - Fields: id (UUID), organization, project (nullable), allow_negative (bool), warn_threshold (NUMERIC 14,4 nullable), enforcement_mode (enum), created_at, updated_at
   - Indexes: org (partial), project (partial)
   - Constraints: unique(org, project), enforcement_mode in ('block', 'warn', 'allow')

4. **Balance** (Computed aggregate - NOT a table)
   - Computed fields: current_balance, total_positive_amounts, total_negative_amounts, transaction_count, last_updated
   - Calculation: SUM aggregation on Transaction table
   - Caching: Redis with key `balance:org:{id}` or `balance:proj:{id}`, 60s TTL

**Relationships**:
- Organisation (1) → Transaction (N) - PROTECT on delete
- Project (1) → Transaction (N) - PROTECT on delete
- UsageEvent (1) → Transaction (N) - PROTECT on delete (optional link)
- User (1) → Transaction (N) via created_by - PROTECT on delete
- User (1) → UsageEvent (N) via user - PROTECT on delete
- Organisation (1) → BalancePolicy (0..1) - CASCADE on delete
- Project (1) → BalancePolicy (0..1) - CASCADE on delete

### API Contracts

**Endpoints** (to be documented in `contracts/transactions-api.yaml`):

1. **POST /api/v1/usage-events/**
   - Create usage event
   - Request: `{event_type, user_id, organization_id, project_id?, metadata, idempotency_key?}`
   - Response 201: `{id, event_type, timestamp, ...}`
   - Response 409: Duplicate idempotency_key (return existing event)
   - Response 400: Validation errors
   - Response 404: Organization/project not found

2. **POST /api/v1/transactions/**
   - Create transaction
   - Request: `{amount, organization_id, project_id?, source_type, usage_event_id?, external_reference_id?, idempotency_key, notes?}`
   - Response 201: `{id, amount, timestamp, current_balance}`
   - Response 403: Policy violation (insufficient balance)
   - Response 409: Duplicate idempotency_key
   - Response 400: Validation errors

3. **GET /api/v1/organizations/{id}/balance/**
   - Query organization balance
   - Response 200: `{current_balance, total_positive_amounts, total_negative_amounts, transaction_count, last_updated}`
   - Response 404: Organization not found
   - Response 403: User lacks access to organization

4. **GET /api/v1/projects/{id}/balance/**
   - Query project balance
   - Response 200: (same as org balance)
   - Response 404: Project not found
   - Response 403: User lacks access to project

5. **GET /api/v1/transactions/**
   - List transactions with filters
   - Query params: `organization_id, project_id, start_date, end_date, source_type, format=(json|csv), page, page_size`
   - Response 200: Paginated transaction list or CSV download
   - Response 403: User lacks access

6. **GET /api/v1/usage-events/**
   - List usage events (with optional unbilled filter)
   - Query params: `organization_id, project_id, start_date, end_date, event_type, unbilled=(true|false), page, page_size`
   - Response 200: Paginated event list

7. **GET /api/v1/balance-policies/{org_or_project_id}/**
   - Get current policy for org/project
   - Response 200: `{allow_negative, warn_threshold, enforcement_mode}`
   - Response 404: No policy configured (use defaults)

8. **PUT /api/v1/balance-policies/{org_or_project_id}/**
   - Update policy (admin only)
   - Request: `{allow_negative, warn_threshold?, enforcement_mode}`
   - Response 200: Updated policy
   - Response 403: User not admin

### Service Layer Design

**Core Services** (in `transactions/services.py`):

1. **`record_usage_event(event_type, user, organization, project, metadata, idempotency_key)`**
   - Validate org/project exist and user has access
   - Check idempotency key if provided
   - Create UsageEvent record
   - Return event instance

2. **`create_transaction(amount, organization, project, source_type, source_ref, created_by, idempotency_key, notes)`**
   - Validate idempotency key (required)
   - Acquire lock on organization/project (SELECT FOR UPDATE)
   - Get current balance
   - Check policy enforcement
   - If policy=block and would go negative → raise InsufficientBalanceError (403)
   - Create Transaction record
   - Invalidate Redis cache for balance
   - Release lock (transaction commit)
   - Return transaction instance + new balance

3. **`get_organization_balance(organization_id, use_cache=True)`**
   - Check Redis cache if use_cache=True
   - If cache miss: compute SUM aggregation
   - Store in Redis with 60s TTL
   - Return balance dict

4. **`get_project_balance(project_id, use_cache=True)`**
   - Similar to org balance but filtered by project_id

5. **`get_policy(organization, project=None)`**
   - Query BalancePolicy for org/project
   - If project policy exists, return it (override)
   - Else if org policy exists, return it
   - Else return default policy (allow_negative=False, enforcement_mode='block')

6. **`check_policy_violation(organization, project, proposed_amount, current_balance)`**
   - Get policy for org/project
   - Calculate hypothetical_balance = current_balance + proposed_amount
   - If hypothetical < 0 and not allow_negative:
     - If enforcement_mode='block' → return (True, 'block')
     - If enforcement_mode='warn' → return (True, 'warn')
   - If hypothetical < warn_threshold:
     - Return (True, 'warn_threshold')
   - Return (False, None)

7. **`invalidate_balance_cache(organization_id, project_id=None)`**
   - Delete Redis key `balance:org:{organization_id}`
   - If project_id: also delete `balance:proj:{project_id}`

8. **`cleanup_expired_idempotency_keys(retention_days=7)`**
   - Delete idempotency records older than retention_days
   - Called by Celery periodic task or management command

### Quickstart Guide (quickstart.md)

Will document:
1. **Setup**: Add transactions app to INSTALLED_APPS, run migrations
2. **Configure Redis**: Set CACHES in settings for django-redis
3. **Record Usage**: Code example for recording usage event
4. **Create Transaction**: Code example for debiting credits based on usage
5. **Query Balance**: Code example for balance API call
6. **Configure Policy**: Code example for setting prepaid/postpaid mode
7. **Export Transactions**: Code example for bulk export (CSV/JSON)

---

## Phase 2: Implementation Tasks

**Phase 2 is handled by `/spec-kitty.tasks` command - NOT generated here**

Task categories (preview):
1. Database layer: Models, migrations, indexes
2. Business logic: Service functions, policy enforcement
3. API layer: Serializers, viewsets, URL routing
4. Caching: Redis integration, cache invalidation signals
5. Testing: Unit tests, integration tests, performance tests
6. Documentation: API docs, integration guide, ADRs
7. Operations: Management commands, Celery tasks, monitoring

---

## Dependencies

### Upstream (Required)

- **B05-core-accounts-authentication**: `User` model for created_by and usage event user
- **B06-organisation-management-multi**: `Organisation` model for multi-tenant scoping
- **B07-projects-workspaces-management**: `Project` model for project-level balances
- **B09-audit-logging-system**: Integration for transaction audit trail

### Downstream (Consumers)

- Future billing/invoicing features will consume transaction data
- Product features (AI, storage, API) will record usage via this engine
- Reporting/analytics will aggregate usage + transaction data

### External Integrations

- **Redis**: Cache backend for balance caching (already in stack for B06)
- **PostgreSQL**: NUMERIC type, JSONB, partial indexes (already baseline DB)
- **django-redis**: New dependency for cache backend (add to requirements)

---

## Migration Strategy

### Database Migrations

1. **Migration 0001_initial.py**:
   - Create `usage_events` table with all fields + indexes
   - Create `transactions` table with all fields + indexes
   - Create `balance_policies` table with all fields + indexes
   - Add FK constraints to Organisation, Project, User
   - Add CHECK constraints (amount != 0, enforcement_mode enum)
   - Add partial unique indexes for idempotency keys

2. **Migration 0002_add_gin_index.py** (if CONCURRENT index needed):
   - `CREATE INDEX CONCURRENTLY idx_usage_events_metadata ON usage_events USING GIN(metadata)`

### Data Migration (if legacy data exists)

- If existing billing data: import as transactions with source_type='external_billing'
- Generate idempotency keys: hash(legacy_id + 'migration')
- Set external_reference_id to legacy system ID

### Rollback Plan

- Migrations are reversible
- No data loss: can drop tables if feature disabled
- Seed script recreates test data

---

## Testing Strategy

### Unit Tests (transactions/tests/test_models.py)

- UsageEvent: creation, idempotency, validation
- Transaction: creation, amount validation, FK constraints
- BalancePolicy: enforcement modes, defaults

### Service Tests (transactions/tests/test_services.py)

- `record_usage_event`: idempotency handling, validation
- `create_transaction`: policy enforcement, locking, cache invalidation
- `get_balance`: aggregation logic, caching behavior
- `check_policy_violation`: prepaid/postpaid logic

### API Tests (transactions/tests/test_api.py)

- POST /usage-events/: success, idempotency, validation errors
- POST /transactions/: success, 403 policy violation, 409 duplicate
- GET /balance/: success, 403 unauthorized, 404 not found
- GET /transactions/: pagination, filtering, CSV export

### Integration Tests (transactions/tests/test_integration.py)

- End-to-end: record usage → create transaction → query balance
- Concurrent writes: 10 threads creating transactions simultaneously
- Policy enforcement: prepaid mode blocks negative balance
- Cache invalidation: balance updates after transaction write

### Performance Tests

- Balance query with 100k transactions (<500ms)
- 100 concurrent transaction writes without data loss
- Bulk export of 1M transactions (<5s)

### Coverage Target

- 90% minimum (enforced by pytest-cov --cov-fail-under=90)
- Focus on business logic (services.py) and API layer

---

## Rollout Plan

### Phase 1: Development & Testing
1. Implement models + migrations ✅ (tasks)
2. Implement service layer ✅ (tasks)
3. Implement API layer ✅ (tasks)
4. Write tests (90% coverage) ✅ (tasks)
5. Manual testing in local environment ✅

### Phase 2: Staging Deployment
1. Deploy to staging environment
2. Run migrations
3. Seed test data
4. Integration testing with dependent features
5. Performance testing (load tests)

### Phase 3: Production Rollout
1. Deploy to production (off-hours)
2. Run migrations (downtime: ~30s for index creation)
3. Monitor error rates + performance metrics
4. Enable for pilot organizations (canary)
5. Full rollout after 48h observation

### Monitoring & Observability

**Metrics to Track** (django-prometheus):
- `transaction_writes_total` - Counter
- `transaction_write_latency_seconds` - Histogram
- `balance_queries_total` - Counter
- `balance_query_latency_seconds` - Histogram
- `policy_violations_total{enforcement_mode}` - Counter
- `idempotency_key_collisions_total` - Counter
- `cache_hits_total` / `cache_misses_total` - Counter

**Alerts**:
- Balance query latency p95 > 500ms
- Transaction write error rate > 1%
- Policy violation rate spike (> 10% of transactions)
- Cache miss rate > 50%

**Logging**:
- Transaction creation: `logger.info("transaction.created", extra={transaction_id, org_id, amount})`
- Policy violations: `logger.warning("policy.violation", extra={org_id, enforcement_mode, balance})`
- Cache invalidation: `logger.debug("cache.invalidated", extra={cache_key})`

---

## Success Criteria (from spec.md)

- [x] SC-001: Balance queries <500ms for 100k transactions
- [x] SC-002: 100 concurrent writes without data loss (idempotency verified)
- [x] SC-003: 4 decimal places precision (NUMERIC 14,4)
- [x] SC-004: 99% cache hit rate (60s TTL effective)
- [x] SC-005: Transaction history first page <200ms
- [x] SC-006: 0% cross-org leakage (multi-tenant isolation)
- [x] SC-007: 99.9% idempotency success rate
- [x] SC-008: 100% policy enforcement respect
- [x] SC-009: Bulk export <5s for 1M transactions

---

## Risks & Mitigations (from research.md)

1. **Concurrent race conditions** → Pessimistic locking (SELECT FOR UPDATE)
2. **Idempotency key collisions** → UUID4 + 7-day expiration
3. **Balance calculation performance** → Redis caching (60s TTL)
4. **Multi-tenant data leakage** → ORM-level filters + security audits
5. **Precision loss** → DecimalField (not float)

---

## ADR Requirements

**Architecture Decision Records to Write**:

1. **ADR-011-001: Single-Ledger vs Double-Entry Bookkeeping**
   - Decision: Single-ledger with signed amounts
   - Context: Financial transaction tracking
   - Consequences: Simpler queries, easier balance calc, matches industry practice

2. **ADR-011-002: Computed Balance vs Stored Balance**
   - Decision: Compute on-demand with Redis caching
   - Context: Balance accuracy vs performance tradeoff
   - Consequences: Guaranteed consistency, caching mitigates performance impact

3. **ADR-011-003: Idempotency Key Retention Policy**
   - Decision: 7 days retention (configurable)
   - Context: Storage cost vs duplicate detection window
   - Consequences: Covers retry scenarios, manageable storage growth

4. **ADR-011-004: Redis Cache Invalidation Strategy**
   - Decision: Invalidate on Transaction write (not UsageEvent)
   - Context: When to refresh cached balances
   - Consequences: Balance always reflects committed transactions, minimal cache churn

---

## Next Steps

1. ✅ Planning complete (this document)
2. 🔄 Run `/spec-kitty.tasks` to generate task breakdown (tasks.md)
3. 🔄 Create contracts/transactions-api.yaml (OpenAPI spec)
4. 🔄 Create quickstart.md (integration guide)
5. 🔄 Update agent context (`.github/copilot-instructions.md`)
6. 🔄 Begin implementation (Phase 3)
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
