# Work Packages: B34 Generative Pipelines

**Feature**: AI Content Generation Factory with Intelligent Retry
**Branch**: `043-ai-generation-pipeline`
**Inputs**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [research.md](research.md), [contracts/openapi.yaml](contracts/openapi.yaml)

**Organization**: 8 work packages covering Django app creation, pipeline executors, async processing, credit management, retry logic, brand integration, operational tooling, and testing/polish.

**Tests**: Integrated into work packages where coverage targets demand them (>85% overall, >90% models/permissions).

**Prompt Files**: Each WP has a detailed prompt in [tasks/planned/](tasks/planned/). Move prompts through lanes (doing → for_review → done) as work progresses.

**Constitutional Compliance**: All tasks align with Django Core-App Constitution. Product-agnostic design, stable APIs, clean code, security-first, DRF standards.

---

## Subtask Index

**Total**: 71 subtasks across 8 work packages

### Phase 1: Foundation (WP01-WP02) - 17 subtasks
- Django app scaffolding, models, migrations, serializers
- API endpoints with DRF ViewSets, permissions

### Phase 2: Pipeline Execution (WP03-WP04) - 19 subtasks
- Executor architecture (OpenAI, LangGraph)
- Async processing via Celery
- Error classification and intelligent retry

### Phase 3: Integrations (WP05-WP06) - 18 subtasks
- Credit management (B11 reserve/settle)
- Brand context (B33)
- WebSocket status updates (B23)
- File storage (B22/B35)

### Phase 4: Operations & Polish (WP07-WP08) - 17 subtasks
- Cron jobs (cleanup, cost updates)
- Django admin interface
- Comprehensive testing suite
- Documentation and production readiness

---

## Work Package WP01: Core Models & Database (Priority: P0)

**Goal**: Establish data models with versioning, validation, and migrations following Constitution Principle II (Architecture) and VI (Performance).
**Independent Test**: Models create/query successfully, migrations apply cleanly, >90% model test coverage achieved.
**Prompt**: [tasks/planned/WP01-core-models-database.md](tasks/planned/WP01-core-models-database.md)
**Dependencies**: None (starting package)

### Included Subtasks
- [ ] T001 Create Django app `src/generative/` with standard structure (apps.py, __init__.py)
- [ ] T002 Implement `GenerationTemplate` model with JSON Schema validation, versioning fields (parent_template FK, is_latest flag)
- [ ] T003 Implement `GenerationRequest` model with status enum, retry tracking, cost fields
- [ ] T004 Implement `GenerationOutput` model with file/text content, retention tracking (expires_at computed field)
- [ ] T005 [P] Add database indexes: (organisation, slug), (requester, status), (project, created_at), (template, status)
- [ ] T006 Create initial migration `0001_initial.py` with all 3 models
- [ ] T007 [P] Write model tests (validation, relationships, status transitions, versioning logic) - target >90% coverage
- [ ] T008 Add model admin classes to `admin.py` (list_display, search_fields, filters)

### Constitutional Alignment
- Principle II (Architecture): Single responsibility per model, clear FK relationships
- Principle VI (Performance): Compound indexes for query optimization
- Principle III (Code Quality): Type hints, docstrings, PEP8

### Implementation Notes
- Use `JSONField` for input_schema, pipeline_config, metadata (PostgreSQL JSON support)
- Template versioning via `parent_template` FK enables immutable versions
- Status enum: `pending`, `processing`, `completed`, `failed`, `cancelled`
- Error category enum: `transient`, `permanent`, `unknown`

### Parallel Opportunities
- T005 (indexes) and T007 (tests) can proceed in parallel after models exist

### Risks & Mitigations
- JSON Schema validation complexity → Use `jsonschema` library in model `clean()` methods
- Migration conflicts with existing apps → Test migration on clean DB first

---

## Work Package WP02: API Layer & Permissions (Priority: P0)

**Goal**: Implement REST API with DRF serializers, ViewSets, permissions per Constitution Principle VII (API Design).
**Independent Test**: All 8 endpoints return correct responses, permission checks pass, >85% API test coverage.
**Prompt**: [tasks/planned/WP02-api-layer-permissions.md](tasks/planned/WP02-api-layer-permissions.md)
**Dependencies**: WP01 (models must exist)

### Included Subtasks
- [ ] T009 Create serializers: `GenerationTemplateSerializer`, `GenerationRequestSerializer`, `GenerationOutputSerializer`
- [ ] T010 Implement input_schema validation in serializer (jsonschema against template.input_schema)
- [ ] T011 Implement pipeline_config validation (required keys per provider: openai needs "model", langgraph needs "graph_id")
- [ ] T012 Create permission classes: `IsOrgAdmin` (template create), `IsProjectMember` (request list filter)
- [ ] T013 Implement `TemplateViewSet` (CRUD endpoints, is_active filter, pagination)
- [ ] T014 Implement `RequestViewSet` (create, list with filters, retrieve, cancel action)
- [ ] T015 Implement `OutputViewSet` (nested under request, retrieve output with presigned URLs)
- [ ] T016 Configure URL routing in `urls.py` with DRF router
- [ ] T017 [P] Write API tests (CRUD operations, filters, pagination, permission denials) - target >85% coverage

### Constitutional Alignment
- Principle VII (API Design): DRF standards, consistent error responses, versioning ready
- Principle V (Security): Permission checks, project membership filtering, org admin gates

### Implementation Notes
- Use `PageNumberPagination` (50 items per page) per NFR-005
- Error responses follow `{"error_code": "...", "message": "...", "details": {...}}` format
- Presigned URLs for file outputs via B35 integration (30min expiry)

### Parallel Opportunities
- T017 (tests) can start once serializers/views are scaffolded

### Risks & Mitigations
- Complex permission logic → Separate permission classes, unit test each
- N+1 queries → Use `select_related('template', 'requester', 'project')` in viewset querysets

---

## Work Package WP03: Pipeline Executors (Priority: P1)

**Goal**: Implement executor architecture with OpenAI and LangGraph providers per FR-005.
**Independent Test**: Both executors generate content successfully (mocked APIs), cost calculation accurate, >80% executor test coverage.
**Prompt**: [tasks/planned/WP03-pipeline-executors.md](tasks/planned/WP03-pipeline-executors.md)
**Dependencies**: WP01 (models), WP02 (serializers for testing)

### Included Subtasks
- [ ] T018 Create `executors/base.py` with `BasePipelineExecutor` abstract class (execute method signature, cost calculation interface)
- [ ] T019 Implement `executors/openai.py` - `OpenAIExecutor` with direct API calls (GPT-4, GPT-3.5-turbo support)
- [ ] T020 Implement OpenAI cost calculation (token usage → credits conversion, rate per model)
- [ ] T021 Implement `executors/langgraph.py` - `LangGraphExecutor` with SDK integration (StateGraph loading by graph_id)
- [ ] T022 Implement LangGraph cost aggregation (sum costs from multi-node execution)
- [ ] T023 Create `executors/factory.py` - `PipelineExecutorFactory` with provider routing logic
- [ ] T024 Create `graphs/registry.py` - decorator-based graph registration (`@register_graph(graph_id)`)
- [ ] T025 Create example graph `graphs/examples/simple_completion.py` for testing
- [ ] T026 [P] Write executor tests (mock OpenAI/LangGraph APIs, test success/error paths, cost calculations) - target >80% coverage

### Constitutional Alignment
- Principle II (Architecture): Factory pattern for extensibility, clear abstractions
- Principle III (Code Quality): Type hints for executor interfaces, clean separation

### Implementation Notes
- Use `openai` library v1.x (async client for better performance)
- LangGraph SDK: Local execution (no Cloud API dependency per research.md decision)
- Cost rates: Store in `settings.py` as `GENERATION_COST_RATES = {"gpt-4": 0.03, ...}`

### Parallel Opportunities
- T019-T020 (OpenAI) and T021-T022 (LangGraph) can develop in parallel
- T026 (tests) proceeds alongside executor implementations

### Risks & Mitigations
- OpenAI API changes → Pin `openai==1.x` version, monitor deprecations
- LangGraph SDK complexity → Start with simple graph examples, document patterns

---

## Work Package WP04: Async Processing & Retry Logic (Priority: P1) ✅ DONE

**Goal**: Implement Celery task execution with intelligent retry per FR-014 to FR-019.
**Independent Test**: Tasks execute async, retries work for transient errors, no retry for permanent errors, >85% task test coverage.
**Prompt**: [tasks/done/WP04-async-processing-retry.md](tasks/done/WP04-async-processing-retry.md)
**Dependencies**: WP03 (executors must exist)

### Included Subtasks
- [x] T027 Create `tasks.py` with `process_generation_request` Celery task (bind=True, acks_late=True)
- [x] T028 Implement job lifecycle in task: status updates (pending → processing → completed/failed), timestamp tracking
- [x] T029 Create `error_classifier.py` with `ErrorClassifier` class (provider-specific error mapping)
- [x] T030 Implement OpenAI error classification (RateLimitError=TRANSIENT, BadRequestError=PERMANENT, etc.)
- [x] T031 Implement LangGraph error classification (HTTP 503=TRANSIENT, ValidationError=PERMANENT)
- [x] T032 Implement retry policy: exponential backoff [30s, 300s, 900s] for TRANSIENT, no retry for PERMANENT, 1x retry for UNKNOWN
- [x] T033 Track retry attempts in `GenerationRequest.retry_count` and metadata (attempt history)
- [x] T034 Implement max retries check (3 for transient) - mark failed after exhaustion
- [x] T035 [P] Write task tests (pytest-celery, mock executors, test transient/permanent/unknown flows) - target >85% coverage

### Constitutional Alignment
- Principle VI (Performance): Async processing, graceful degradation with retry
- Principle IV (Testing): Deterministic tests with mocked external deps

### Implementation Notes
- Use Celery's built-in retry mechanism: `self.retry(exc=exc, countdown=delay)`
- Error history stored in `GenerationRequest.metadata` as JSON array
- Retry backoff: 30s, 5min (300s), 15min (900s) per FR-015

### Parallel Opportunities
- T030-T031 (error classification) can develop in parallel per provider
- T035 (tests) proceeds alongside task implementation

### Risks & Mitigations
- Task timeout for long LangGraph workflows → Set `task_time_limit=600` in Celery config
- Celery worker crashes → Use `acks_late=True` to requeue tasks on failure

---

## Work Package WP05: Credit Management Integration (Priority: P1)

**Goal**: Integrate B11 Credits API with reserve/settle pattern per FR-009 to FR-013.
**Independent Test**: Credits reserved on submit, settled on complete, refunded on failure, insufficient credits rejected with HTTP 402.
**Prompt**: [tasks/planned/WP05-credit-management.md](tasks/planned/WP05-credit-management.md)
**Dependencies**: WP04 (task execution must work)

### Included Subtasks
- [ ] T036 Create `services/credit_service.py` - wrapper for B11 Transactions API calls
- [ ] T037 Implement credit reservation in `RequestViewSet.create()` - reserve estimated_cost before queueing
- [ ] T038 Implement balance check - return HTTP 402 if user.available_balance < estimated_cost
- [ ] T039 Link transaction to request via `GenerationRequest.transaction_id` FK
- [ ] T040 Implement credit settlement in Celery task on success - update transaction with actual_cost
- [ ] T041 Implement credit refund in Celery task on permanent failure - cancel transaction (full refund)
- [ ] T042 Handle partial refund case: actual_cost < estimated_cost (release difference)
- [ ] T043 [P] Write credit integration tests (mock B11 API, test reserve→settle, reserve→refund, insufficient balance) - target >85% coverage

### Constitutional Alignment
- Principle V (Security): No credit leakage, transaction safety
- Principle VI (Performance): Atomic credit operations, no race conditions

### Implementation Notes
- Use B11 `CreditService.reserve()`, `.settle()`, `.refund()` API methods
- Transaction model from B11: `type="reserve"`, `status="pending|completed|cancelled"`
- Insufficient credits message: `{"error": "Insufficient credits", "required": 200, "available": 50}`

### Parallel Opportunities
- T043 (tests) proceeds alongside service implementation

### Risks & Mitigations
- B11 API downtime → Implement circuit breaker pattern (fail fast after 3 timeouts)
- Double settlement → Use transaction status check before settling

---

## Work Package WP06: Brand & File Storage Integration (Priority: P2)

**Goal**: Integrate B33 Brand Identity and B22/B35 File Storage per FR-020 to FR-023.
**Independent Test**: Brand tokens injected into generation context, output files stored with ACL, WebSocket events emitted.
**Prompt**: [tasks/planned/WP06-brand-file-integration.md](tasks/planned/WP06-brand-file-integration.md)
**Dependencies**: WP04 (task execution), WP05 (credit flow complete)

### Included Subtasks
- [ ] T044 Implement brand context fetching in Celery task - call `BrandProfile.get_effective_profile(project=request.project_id)`
- [ ] T045 Pass brand_context to executor.execute() method (update executor interface)
- [ ] T046 Inject brand tokens in OpenAI executor (add to system message: "Brand colors: #FF0000, Logo: ...")
- [ ] T047 Pass brand tokens to LangGraph executor as flow variables
- [ ] T048 Handle missing brand profile gracefully (continue with empty context)
- [ ] T049 Implement file storage via B35 - save output files with `FileStorageRecord.create()`
- [ ] T050 Set ACL on output files - inherit from request.project permissions
- [ ] T051 Generate presigned URLs for file downloads (15min expiry) in OutputSerializer
- [ ] T052 Implement WebSocket integration via B23 - emit events on status changes (created, processing, completed, failed)
- [ ] T053 Include metadata in WebSocket events: request_id, status, retry_count, error_category, progress_percentage
- [ ] T054 [P] Write integration tests (mock B33/B35/B23 APIs, test brand injection, file storage, WebSocket events)

### Constitutional Alignment
- Principle II (Architecture): Loose coupling with B33/B35/B23 (use public APIs)
- Principle V (Security): ACL inheritance, secure file URLs

### Implementation Notes
- Brand tokens format: `{"colors": ["#FF0000"], "logo_url": "...", "fonts": [...]}`
- WebSocket channel naming: `generation.{request_id}` per FR-023
- Use B35 presigned URL generation: `file.get_presigned_url(expires_in=900)` (15min)

### Parallel Opportunities
- T044-T048 (brand), T049-T051 (file storage), T052-T053 (WebSocket) can develop in parallel

### Risks & Mitigations
- B33 API latency → Cache brand profile for request duration (in-memory)
- File upload failures → Classify as TRANSIENT, retry request

---

## Work Package WP07: Operational Tooling (Priority: P2)

**Goal**: Implement cron jobs, Django admin, logging, monitoring per NFR-004 and Constitution Principle VI.
**Independent Test**: Cleanup job deletes expired outputs, cost update recalculates estimates, admin interface functional, logs structured.
**Prompt**: [tasks/planned/WP07-operational-tooling.md](tasks/planned/WP07-operational-tooling.md)
**Dependencies**: WP06 (all core features complete)

### Included Subtasks
- [ ] T055 Create management command `cleanup_expired_outputs` - soft-delete outputs where expires_at < now()
- [ ] T056 Create management command `update_template_costs` - recalculate estimated_cost from avg(actual_cost) last 30 days
- [ ] T057 Implement cost update logic: only update if sample_size ≥ 10 completed requests
- [ ] T058 Store cost metadata in template.pipeline_config: estimated_cost, cost_last_updated, cost_sample_size
- [ ] T059 Configure Django admin for models: list_display, search_fields, filters, readonly_fields
- [ ] T060 Add admin action: "Retry failed requests" (creates new requests with same input_data)
- [ ] T061 Implement structured logging (JSON format) with request_id, provider, duration, cost, token_usage
- [ ] T062 Add metrics hooks: request_count, success_rate, average_cost, retry_rate (Prometheus format)
- [ ] T063 [P] Write operational tests (test cleanup job, cost update calculation, admin actions)

### Constitutional Alignment
- Principle VI (Performance): Automated cleanup, cost optimization
- Principle XI (Documentation): Admin interface for operator UX

### Implementation Notes
- Cron schedule: cleanup daily at 2am, cost update monthly on 1st at 3am
- Use Django's `BaseCommand` for management commands
- Log format: `{"timestamp": "...", "request_id": "...", "event": "generation_completed", "duration": 3.42, "cost": 11.3}`

### Parallel Opportunities
- T055-T058 (cron jobs), T059-T060 (admin), T061-T062 (observability) can develop in parallel

### Risks & Mitigations
- Cleanup job slow on large datasets → Add LIMIT batching (1000 records per run)
- Cost update edge cases → Handle division by zero, missing samples gracefully

---

## Work Package WP08: Testing & Production Readiness (Priority: P3)

**Goal**: Achieve >85% test coverage, security audit pass, comprehensive documentation per Constitution Principles IV, V, XI.
**Independent Test**: All tests pass, coverage >85%, Bandit clean, documentation complete.
**Prompt**: [tasks/planned/WP08-testing-production-readiness.md](tasks/planned/WP08-testing-production-readiness.md)
**Dependencies**: WP07 (all features implemented)

### Included Subtasks
- [ ] T064 Write integration tests - full job lifecycle (template → request → execution → output → credits)
- [ ] T065 Write integration tests - retry flow (transient error → retry → success)
- [ ] T066 Write integration tests - failure flow (permanent error → no retry → refund)
- [ ] T067 Run coverage report - ensure >85% overall (models >90%, API >85%, executors >80%)
- [ ] T068 Run Bandit security scan - fix all high/medium severity issues
- [ ] T069 Run mypy type checking - resolve all type errors in core modules
- [ ] T070 Write `src/generative/README.md` - feature overview, API usage, extension guide
- [ ] T071 Create ADR: `ADR-034-langgraph-sdk-over-cloud.md` - document LangGraph integration decision

### Constitutional Alignment
- Principle IV (Testing): >85% coverage, deterministic tests, regression prevention
- Principle V (Security): Security audit, no vulnerabilities
- Principle XI (Documentation): Complete feature documentation, extension patterns

### Implementation Notes
- Use `pytest-cov` for coverage: `pytest --cov=src.generative --cov-report=html`
- Bandit command: `bandit -r src/generative/`
- mypy command: `mypy src/generative/ --strict`

### Parallel Opportunities
- All testing/audit tasks can run in parallel (T064-T069)

### Risks & Mitigations
- Coverage gaps → Focus on error paths, edge cases in complex logic
- Mypy strict mode errors → Use `type: ignore` sparingly, document rationale

---

## Progress Tracking

### Phase 1: Foundation (WP01-WP02)
- [ ] WP01: Core Models & Database (8 subtasks)
- [ ] WP02: API Layer & Permissions (9 subtasks)
**Milestone**: API functional with manual testing (no async, no credits yet)

### Phase 2: Pipeline Execution (WP03-WP04)
System.Func`2[System.Text.RegularExpressions.Match,System.String]
- [ ] WP04: Async Processing & Retry Logic (9 subtasks)
**Milestone**: Content generation works end-to-end (mocked credits)

### Phase 3: Integrations (WP05-WP06)
- [ ] WP05: Credit Management Integration (8 subtasks)
- [ ] WP06: Brand & File Storage Integration (11 subtasks)
**Milestone**: Production-ready job lifecycle with all integrations

### Phase 4: Operations & Polish (WP07-WP08)
- [ ] WP07: Operational Tooling (9 subtasks)
- [ ] WP08: Testing & Production Readiness (8 subtasks)
**Milestone**: Feature complete, tested, documented, deployed

---

## MVP Scope Recommendation

**Minimum Viable Product (WP01-WP04)**: Core models, API, executors, async processing with retry. Excludes credit integration (use free tier), brand context (optional), operational tooling (manual ops).

**MVP Deliverable**: Developers can create templates, submit requests, get generated content asynchronously with intelligent retry. Sufficient for internal testing and demos.

**MVP Timeline**: ~4-6 work days (assuming 1-2 WPs per day with parallel work)

---

## Next Steps

1. **Start Implementation**: Begin with WP01 (Core Models & Database)
   - Move [tasks/planned/WP01-core-models-database.md](tasks/planned/WP01-core-models-database.md) to `tasks/doing/`
   - Run `/spec-kitty.implement tasks/doing/WP01-core-models-database.md`

2. **Track Progress**: Update checkboxes in this file as subtasks complete

3. **Review Cycle**: Move completed WPs to `tasks/for_review/` for validation

4. **Production Deployment**: After WP08, merge feature branch to main

**Constitution Reminder**: All work must align with Django Core-App Constitution principles. Review `.kittify/memory/constitution.md` before starting each work package.
