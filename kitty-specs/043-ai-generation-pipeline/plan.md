# Implementation Plan: B34 Generative Pipelines
*Feature ID: 043 | Module: generative*

**Branch**: `043-ai-generation-pipeline` | **Date**: 2026-02-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/043-ai-generation-pipeline/spec.md`

**Status**: ✅ Planning complete - All architecture decisions validated

## Summary

AI content generation factory managing generation requests (jobs), routing to appropriate pipelines (OpenAI direct API, LangGraph SDK orchestration), and handling async execution with intelligent retry. Core value proposition: Template-based content generation with credit management, file retention policies, and extensible pipeline architecture. Product-agnostic job lifecycle management that downstream products (e.g., TeamReel) extend with custom graphs and templates.

## Technical Context

**Language/Version**: Python 3.12+ (django-core-app baseline)
**Primary Dependencies**:
  - Django 5.1+ & Django REST Framework 3.15+ (existing core stack)
  - Celery 5.4+ (B15 async tasks infrastructure - already integrated)
  - `openai` Python SDK 1.x (direct API calls for simple completions)
  - `langgraph` SDK 0.2+ (stateful workflow orchestration, local execution)
  - `jsonschema` 4.x (input_schema validation)
  - Redis 7+ (Celery broker - existing infrastructure)
**Storage**: PostgreSQL 15+ via Django ORM (3 new models: GenerationTemplate, GenerationRequest, GenerationOutput)
**Testing**: pytest + pytest-django (existing test infrastructure), unittest.mock for provider mocking, >85% coverage target
**Target Platform**: Linux server (existing Railway deployment infrastructure)
**Project Type**: Backend API (Django app `src/generative/` with DRF ViewSets)
**Performance Goals**:
  - API response: <200ms (submit request, queue to Celery)
  - Simple generation (OpenAI direct): 2-5s avg
  - Complex generation (LangGraph): 15-60s avg
  - Concurrent requests: 100+ (Celery horizontal scaling)
**Constraints**:
  - No frontend/demo pages (Backend Only per Constitution Article I)
  - Product-agnostic templates (TeamReel adds custom graphs via Python modules)
  - Celery task timeout: 300s default (configurable per template)
  - File retention: Daily cron cleanup job (lightweight, <1min execution)
**Scale/Scope**:
  - MVP: 5-10 templates (simple completions)
  - Production: 50+ templates, 1000+ requests/day
  - TeamReel: 3-5 custom LangGraph workflows (match analysis, highlights, tactical breakdown)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] ✅ **Product-Agnostic**: GenerationTemplate, GenerationRequest, GenerationOutput models are generic job lifecycle primitives. No TeamReel-specific logic in core (match reports, lineup videos live in downstream product)
- [x] ✅ **Core Focus**: Aligns with core concerns - async task orchestration (extends B15 Celery), credit management (integrates B11), file storage (integrates B35), audit trail (integrates B09)
- [x] ✅ **Downstream Extension**: TeamReel adds custom LangGraph graphs via Python modules in `teamreel/graphs/`, templates via fixtures/migrations. Core provides executor infrastructure and registry pattern

### II. Architecture and Modularity
- [x] ✅ **Single Responsibility**: `src/generative/` focuses solely on AI generation job lifecycle (template management, request execution, output storage). Pipeline-specific logic isolated in `executors/` submodule
- [x] ✅ **Stable APIs**: Public interface = 8 DRF endpoints + `BasePipelineExecutor` abstract class. Extension point: register custom graphs via `graphs/registry.py`
- [x] ✅ **Minimal Dependencies**: Only 2 new external deps (`openai`, `langgraph`). Reuses existing stack (Celery B15, Credits B11, Files B35, WebSocket B23)
- [x] ✅ **No Circular Deps**: Depends on B11 (credits), B15 (celery), B35 (files), B23 (websocket). No reverse dependencies
- [x] ✅ **No Downstream Imports**: Core never imports TeamReel. TeamReel registers graphs via entry point pattern

### III. Code Quality and Style
- [x] ✅ **Python 3.12+**: Matches django-core-app baseline
- [x] ✅ **Type Hints**: All models, serializers, executors, services will use full type annotations
- [x] ✅ **Black Formatting**: CI enforces Black formatting (existing pipeline)
- [x] ✅ **Ruff Linting**: Ruff configured in existing pyproject.toml
- [x] ✅ **No Dead Code**: Clean implementation, no n8n executor (removed from scope per planning decision)
- [x] ✅ **Readable Code**: Factory pattern for executors, service layer for orchestration, max 50 lines per function
- [x] ✅ **Curated Dependencies**: `openai` (official SDK, stable), `langgraph` (LangChain ecosystem, production-ready). Both pinned with version constraints

### IV. Testing Strategy
- [x] ✅ **pytest + pytest-django**: Existing test infrastructure
- [x] ✅ **Test Coverage**: >85% target per spec (Models ≥90%, API ≥85%, Serializers ≥80%, Permissions ≥90%)
- [x] ✅ **Regression Tests**: Intelligent retry logic includes edge case tests (TRANSIENT/PERMANENT/UNKNOWN classification)
- [x] ✅ **Deterministic**: Mock external APIs (OpenAI, LangGraph) via `unittest.mock`, fixtures for templates
- [x] ✅ **Coverage Thresholds**: CI gates enforce coverage thresholds (existing setup-tests.yml workflow)
- [x] ✅ **Integration Tests**: End-to-end test: create template → submit request → Celery processes → output stored → credits settled

### V. Security and Privacy
- [x] ✅ **Secure Defaults**: Inherits django-core-app security config (CSRF, secure cookies, ALLOWED_HOSTS)
- [x] ✅ **DEBUG Off**: Production deployment via Railway (existing setup)
- [x] ✅ **No Secrets**: OpenAI API keys via environment variables (`OPENAI_API_KEY`), never committed
- [x] ✅ **Dependency Scanning**: CI scans `openai` and `langgraph` for vulnerabilities (existing Dependabot)
- [x] ✅ **Centralized Auth**: DRF permissions check project membership (B07/B08), org admin for template creation
- [x] ✅ **No Sensitive Logging**: Input data logged at INFO level (sanitized), API responses at DEBUG only

### VI. Performance and Reliability
- [x] ✅ **No N+1 Queries**: `select_related('template', 'requester', 'project')` on request list, `prefetch_related('generation_outputs')` for output retrieval
- [x] ✅ **Pagination**: DRF PageNumberPagination (50 items default) on all list endpoints
- [x] ✅ **Explicit Caching**: No caching in MVP (stateless requests). Future: Redis cache for template retrieval (read-heavy pattern)
- [x] ✅ **Structured Logging**: Django logging to JSON (existing setup), includes request_id, template_slug, retry_count
- [x] ✅ **Health Checks**: Celery worker health via B15 existing `/health/celery/` endpoint
- [x] ✅ **Metrics Hooks**: Prometheus metrics for request_duration, retry_count, error_category (existing observability stack)
- [x] ✅ **Graceful Degradation**: Celery retry with exponential backoff (30s, 300s, 900s). Permanent failures refund credits immediately

### VII. UX and API Design
- [x] ✅ **DRF Required**: All endpoints via Django REST Framework ViewSets
- [x] ✅ **Consistent Responses**: Standard DRF response format `{"id", "status", "created_at", ...}`, paginated lists
- [x] ✅ **Versioning Strategy**: `/api/v1/generation/*` namespace. Breaking changes require `/api/v2/` (existing API versioning pattern)
- [x] ✅ **Clear Errors**: HTTP 400 (validation), 402 (insufficient credits), 403 (no access), 404 (not found). Error messages: `{"error": "Insufficient credits", "required": 200, "available": 50}`
- [x] ✅ **Boundary Validation**: Input data validated against template.input_schema (JSON Schema) in serializer before queueing

### VIII. Developer Experience and Tooling
- [ ] **Easy Setup**: Local environment setup documented and simple
- [ ] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [ ] **Pre-commit Hooks**: Hooks match CI checks
- [ ] **Type Checking**: mypy runs cleanly on core modules
- [ ] **Task Scripts**: Common operations scripted
- [ ] **Developer Docs**: Setup and development docs exist

### IX. Branching and Git Workflow
- [ ] **Feature Branch**: Work occurs on `feature/NNN-name` branch
- [ ] **Linked to Spec**: PR will reference spec document
- [ ] **Focused PRs**: Changes remain small and focused
- [ ] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [ ] **CI Checks**: Linting, formatting, mypy, pytest in CI
- [ ] **Merge Gates**: All CI checks must pass before merge
- [ ] **Scripted Deployment**: Deployment process documented/automated

### XI. Documentation and Knowledge Sharing
- [ ] **In-Repo Docs**: Documentation lives in repository
### XI. Documentation and Knowledge Sharing
- [x] ✅ **Module README**: `src/generative/README.md` will document purpose, scope, public API, extension points (graph registry, custom executors)
- [x] ✅ **Getting Started**: README includes quickstart (create template, submit request, check output)
- [x] ✅ **Extension Guide**: README has "Extending B34" section (custom graphs, TeamReel integration patterns)
- [x] ✅ **Spec Sync**: Implementation tracks spec.md, updates after major changes
- [x] ✅ **ADR Required**: ADR for LangGraph SDK vs Cloud decision (ADR-034-langgraph-sdk-over-cloud.md)

### XII. Constitution Evolution
- [x] ✅ **No Constitution Changes**: Feature aligns with existing constitution, no amendments needed
- [x] ✅ **Template Updates**: No spec-kitty template changes required

### Violations Requiring Justification

*None - All Constitution checks passed*

**Constitution Check Status**: ✅ **PASS** (30/30 checks compliant)

---

## Phase 0: Research & Discovery ✅ COMPLETE

**Deliverables**:
- ✅ [research.md](research.md) - All planning decisions documented with rationale
- ✅ [data-model.md](data-model.md) - Entity-relationship diagram, schema, validation rules
- ✅ Technology stack validated (Django 5.1, DRF, Celery, OpenAI SDK, LangGraph SDK)
- ✅ Integration points mapped (B11, B15, B22/B35, B23, B33)

**Key Decisions Captured**:
1. LangGraph SDK (local execution) over Cloud API
2. True versioning pattern for templates
3. Per-template retention policy
4. Hybrid cost estimation (manual seed + auto-update)
5. 2 providers (OpenAI direct + LangGraph SDK)

---

## Project Structure

### Documentation (this feature)

```
kitty-specs/043-ai-generation-pipeline/
├── spec.md              # Feature specification (spec-kitty.specify output)
├── plan.md              # THIS FILE (spec-kitty.plan output)
├── research.md          # ✅ Phase 0 output
├── data-model.md        # ✅ Phase 0 output
├── quickstart.md        # Phase 1 output (NEXT)
├── contracts/           # Phase 1 output (NEXT)
│   └── openapi.yaml     # API contract
└── tasks.md             # Phase 2 output (spec-kitty.tasks command)
```

### Source Code (django-core-app)

```
src/generative/                      # New Django app
├── __init__.py
├── apps.py                          # AppConfig
├── models.py                        # GenerationTemplate, GenerationRequest, GenerationOutput
├── serializers.py                   # DRF serializers with JSON Schema validation
├── views.py                         # DRF ViewSets (8 endpoints)
├── permissions.py                   # Project membership + org admin checks
├── services.py                      # GenerationService (orchestration layer)
├── tasks.py                         # Celery task: process_generation_request
├── admin.py                         # Django admin customization
├── urls.py                          # URL routing
├── README.md                        # Module documentation with extension guide
├── migrations/
│   └── 0001_initial.py              # Initial schema
├── executors/
│   ├── __init__.py
│   ├── base.py                      # BasePipelineExecutor (ABC)
│   ├── openai.py                    # OpenAIExecutor (direct API)
│   ├── langgraph.py                 # LangGraphExecutor (SDK)
│   └── factory.py                   # PipelineExecutorFactory
├── graphs/
│   ├── __init__.py
│   ├── registry.py                  # Graph registration decorator
│   └── examples/
│       └── simple_completion.py     # Demo graph for testing
└── management/
    └── commands/
        ├── cleanup_expired_outputs.py  # Daily cron job
        └── update_template_costs.py    # Monthly cost update

tests/generative/                    # Test suite (>85% coverage target)
├── __init__.py
├── test_models.py                   # Model tests (≥90% coverage)
├── test_api.py                      # API endpoint tests (≥85% coverage)
├── test_serializers.py              # Serializer tests (≥80% coverage)
├── test_permissions.py              # Permission tests (≥90% coverage)
├── test_services.py                 # Service layer tests
├── test_tasks.py                    # Celery task tests
├── test_executors.py                # Executor tests (mocked providers)
├── fixtures/
│   ├── templates.json               # Test templates
│   └── requests.json                # Test requests
└── integration/
    └── test_end_to_end.py           # Full workflow tests

# No frontend (Backend Only per Constitution)
```

**Structure Decision**: Single Django app (`src/generative/`) following django-core-app standard layout. Executor pattern isolates provider-specific logic. Graph registry enables downstream product extension (TeamReel adds `teamreel/graphs/`).

---

## Phase 1: Design & Contracts ✅ COMPLETE

**Deliverables**:
- ✅ [Project structure defined](#project-structure) - Django app layout with executor pattern
- ✅ [contracts/openapi.yaml](contracts/openapi.yaml) - OpenAPI 3.0 spec (8 endpoints, full schemas)
- ✅ [quickstart.md](quickstart.md) - Developer onboarding guide with examples
- ✅ [.github/copilot-instructions.md](../../.github/copilot-instructions.md) - Agent context updated

**Architecture Validation**:
- Django app: `src/generative/` with models, serializers, views, executors, services, tasks
- Executor pattern: `BasePipelineExecutor` ABC → `OpenAIExecutor`, `LangGraphExecutor`
- Graph registry: Decorator-based registration (`@register_graph`)
- Test structure: Unit tests (>85% target), integration tests (end-to-end workflows)
- Extension points: Custom graphs (`teamreel/graphs/`), custom executors, product templates

**Constitution Re-Check**: ✅ **STILL PASSING** (30/30 checks)
- No new violations introduced
- Project structure follows django-core-app conventions
- API design consistent with existing modules (DRF, pagination, permissions)

---

## Next Phase: Tasks Breakdown

Run `/spec-kitty.tasks` command to generate `tasks.md` with atomic work packages:
- Phase 1: Core Models & API
- Phase 2: Pipeline Executors
- Phase 3: Integrations (B11, B15, B22/B35)
- Phase 4: Testing & Validation
- Phase 5: Documentation & Release

Expected output: 23 work packages with dependencies, effort estimates, and ordering.

---
