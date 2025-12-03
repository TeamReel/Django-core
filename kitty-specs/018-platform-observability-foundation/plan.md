# Implementation Plan: Platform Observability Foundation
*Path: [kitty-specs/018-platform-observability-foundation/plan.md](kitty-specs/018-platform-observability-foundation/plan.md)*

**Branch**: `018-platform-observability-foundation` | **Date**: 2025-12-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from [kitty-specs/018-platform-observability-foundation/spec.md](kitty-specs/018-platform-observability-foundation/spec.md)

## Summary

Provide foundational observability capabilities for the Django Core-App platform: binary health checks (healthy/unhealthy) for Kubernetes liveness and readiness probes, structured JSON logging with PII redaction and correlation IDs, metric hooks (counters/histograms/gauges) with pluggable exporters (Prometheus/StatsD/OpenMetrics), and first-class B15 task observability integration. System prioritizes simplicity, Constitution compliance, and minimal dependencies over complex component-level health states or distributed tracing.

**Technical Approach**: Custom Health Check Protocol with registry pattern (minimal deps), stdlib logging with custom JSON formatter and PII redaction filter, pluggable metrics abstraction wrapping prometheus-client, custom Celery Task base class for guaranteed exception isolation, contextvars for async-safe correlation ID propagation.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: 
- Django 5.1+
- prometheus-client (official Prometheus library, wrapped in abstraction layer)
- Celery 5.3+ (B15 task integration)
- Redis (cache + queue health checks)

**Storage**: N/A (no persistent data models; all observability data emitted to external systems)
**Testing**: pytest 8.0+ + pytest-django + pytest-celery
**Target Platform**: Kubernetes (Linux containers), Django WSGI/ASGI servers
**Project Type**: Django app (new `observability/` app in core)

**Performance Goals**: 
- Health check latency: <100ms per dependency, 500ms total timeout
- Metric collection overhead: <1ms per event
- Log emission overhead: <1ms per log event
- Support 10,000 req/min with <1% observability overhead

**Constraints**: 
- **Minimal Dependencies**: No django-prometheus, structlog, or django-health-check in core (extension layer only)
- **Exception Isolation**: All observability hooks MUST catch exceptions internally; never break task/request execution
- **Constitution Compliance**: Logging and metrics MUST follow Principle V (Security & Privacy) and Principle VI (Performance & Reliability)
- **Kubernetes Compatibility**: Health endpoints MUST conform to K8s HTTP probe specifications
- **Horizontal Scalability**: Per-pod metrics, no cross-pod aggregation or coordination

**Scale/Scope**:
- 5 user stories (3 P1, 2 P2/P3)
- 17 functional requirements + 2 sub-requirements (FR-011a, FR-011b, FR-012a)
- 10 success criteria (measurable)
- Target: 3-4 work packages, ~40-50 tasks, 95% test coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [x] **Core Focus**: Feature aligns with core concerns (observability infrastructure for all apps)
- [x] **Downstream Extension**: Product-specific needs handled via documented extension points (custom health checks, metric exporters)

### II. Architecture and Modularity
- [x] **Single Responsibility**: New `observability/` app with three focused modules: `health.py`, `logging.py`, `metrics.py`
- [x] **Stable APIs**: Health Check Protocol, metric collector interface, logging façade documented
- [x] **Minimal Dependencies**: Only prometheus-client (wrapped); no django-prometheus, structlog, or django-health-check
- [x] **No Circular Deps**: Observability depends on Django core + B15 tasks; no reverse dependencies
- [x] **No Downstream Imports**: Core observability primitives only; products extend via registries

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: All health check, metric, and logging interfaces use Protocol types
- [x] **Black Formatting**: All code formatted with Black
- [x] **Ruff Linting**: Ruff primary linter
- [x] **No Dead Code**: No unused imports or deprecated patterns
- [x] **Readable Code**: Small functions (<50 lines), clear naming (e.g., `register_health_check()`, `emit_metric()`)
- [x] **Curated Dependencies**: prometheus-client justified for industry-standard metric exposition format

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: 95% coverage target; tests for all health checks, PII redaction, metric emission, B15 hooks
- [x] **Regression Tests**: Mocked dependency failures (database timeout, Redis slow response)
- [x] **Deterministic**: Time.time() mocked for duration metrics; no flaky network calls
- [x] **Coverage Thresholds**: 95% enforced in CI
- [x] **Integration Tests**: K8s probe simulation, Prometheus scrape validation, end-to-end correlation ID propagation

### V. Security and Privacy
- [x] **Secure Defaults**: Health endpoints public (K8s requirement) but minimal data exposure; `/metrics` supports optional auth
- [x] **DEBUG Off**: No debug-only code paths in observability
- [x] **No Secrets**: No secrets in logs or metrics; PII redaction enforced at emission time
- [x] **Dependency Scanning**: prometheus-client scanned in CI
- [x] **Centralized Auth**: `/metrics` endpoint can integrate with B05 authentication if downstream product requires it
- [x] **No Sensitive Logging**: FR-007 enforces automatic redaction of `password`, `secret`, `token`, `api_key`, `ssn`, `email`, `phone_number`, `credit_card`

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Health checks use connection pooling; no ORM queries in hot path
- [x] **Pagination**: N/A (no paginated APIs in observability primitives)
- [x] **Explicit Caching**: N/A (health checks compute on-demand; metrics are stateless counters/gauges)
- [x] **Structured Logging**: FR-006 implements structured JSON logging with correlation IDs
- [x] **Health Checks**: FR-001/FR-002 implement `/health/live` and `/health/ready` endpoints
- [x] **Metrics Hooks**: FR-009/FR-010 implement counter/histogram/gauge hooks + B15 task metrics
- [x] **Graceful Degradation**: FR-011a ensures observability hooks catch all exceptions; emit `observability_signal_failure_total` on failure

### VII. UX and API Design
- [x] **DRF Required**: N/A (health/metrics endpoints are plain Django views for performance; no DRF serialization overhead)
- [x] **Consistent Responses**: FR-004 defines structured JSON schema for health endpoints (`{status, checks}`)
- [x] **Versioning Strategy**: Health endpoint schema stable; breaking changes require new endpoint paths
- [x] **Clear Errors**: Health check failures return 503 with minimal error messages (no stack traces)
- [x] **Boundary Validation**: N/A (health checks are read-only; no user input validation)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Health checks auto-register on Django startup; minimal configuration required
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Hooks match CI checks
- [x] **Type Checking**: mypy runs cleanly on `observability/` modules
- [x] **Task Scripts**: Health check testing script, metric simulation script
- [x] **Developer Docs**: "How to extend" guide for custom health checks (FR-017), metric exporters (FR-014), PII redaction rules

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `018-platform-observability-foundation` branch
- [x] **Linked to Spec**: PR references [spec.md](spec.md) and [plan.md](plan.md)
- [x] **Focused PRs**: Changes scoped to observability primitives only
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting (Ruff), formatting (Black), type checking (mypy), tests (pytest), coverage (95%)
- [x] **Merge Gates**: All CI checks must pass; manual Constitution Check review
- [x] **Scripted Deployment**: Health endpoints auto-discovered by K8s; Prometheus auto-discovers `/metrics` via service annotations

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation in `docs/observability.md`, `docs/observability-extension-guide.md`
- [x] **App README**: `src/observability/README.md` with quickstart
- [x] **Getting Started**: Observability quickstart guide (enable app, configure K8s probes, scrape metrics)
- [x] **Extension Guide**: "How to extend" sections for health checks, metrics, logging (user refinement request)
- [x] **Spec Sync**: Implementation updates spec.md with actual API endpoints and configuration options
- [x] **ADR Required**: ADR for metric exporter pluggability strategy (Protocol vs registry pattern)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature implements existing Principle VI (Performance & Reliability) requirements
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

**None** - All Constitution principles satisfied.

**Additional Refinements** (User-requested):
1. **Health Endpoints Security**: Public but minimal (no sensitive data in responses); can be IP/ingress-protected per Constitution if needed
2. **Optional but On-by-Default**: Clear INSTALLED_APPS toggle; settings namespace `OBSERVABILITY_*` for all configuration
3. **Extension Documentation**: "How to extend" sections with 1-2 concrete examples for downstream teams (health checks, metrics, logging filters)

**Constitution Check Status**: ✅ **PASS**

## Project Structure

### Documentation (this feature)

```
kitty-specs/018-platform-observability-foundation/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research (completed)
├── data-model.md        # Phase 1 data model (completed)
├── quickstart.md        # Phase 1 quickstart guide (to be created)
├── checklists/
│   └── requirements.md  # Specification quality checklist (completed)
└── tasks.md             # Phase 2 task breakdown (via /spec-kitty.tasks)
```

### Source Code (repository root)

**Selected Structure**: Django app (new `observability/` app in existing `src/` directory)

```
src/observability/
├── __init__.py                  # App registration
├── apps.py                      # Django AppConfig (auto-registers health checks)
├── health.py                    # Health check protocol + registry + views
├── logging.py                   # JSON formatter + PII redaction filter
├── metrics.py                   # Metric collector protocol + registry
├── middleware.py                # Correlation ID middleware
├── tasks.py                     # ObservableTask base class for Celery
├── utils.py                     # Timeout wrapper, helper functions
└── README.md                    # App-level documentation

src/observability/checks/
├── __init__.py
├── database.py                  # DatabaseHealthCheck
├── cache.py                     # CacheHealthCheck
├── queue.py                     # QueueHealthCheck
└── migrations.py                # MigrationHealthCheck

src/observability/exporters/
├── __init__.py
├── prometheus.py                # PrometheusCollector (default)
├── statsd.py                    # StatsDCollector (optional)
└── base.py                      # MetricCollector Protocol definition

tests/observability/
├── __init__.py
├── conftest.py                  # pytest fixtures (mocked Redis, DB)
├── test_health_checks.py        # Health check protocol tests
├── test_health_views.py         # /health/live, /health/ready endpoint tests
├── test_logging.py              # JSON formatting + PII redaction tests
├── test_metrics.py              # Metric collector tests
├── test_middleware.py           # Correlation ID propagation tests
├── test_tasks.py                # ObservableTask instrumentation tests
└── test_integration.py          # End-to-end: request → task → log → metric

docs/
├── observability.md             # Observability quickstart guide
├── observability-extension-guide.md  # "How to extend" documentation
├── observability-troubleshooting.md  # Common issues + solutions
└── adr/
    └── 019-metric-exporter-pluggability.md  # ADR for metric collector pattern
```

**Structure Decision**: Django app pattern chosen because:
- Follows existing Core-App architecture (B05 accounts, B06 organisations, B09 audit, B15 tasks)
- Clean module separation: `health.py`, `logging.py`, `metrics.py` for distinct concerns
- Registry pattern enables downstream extension without modifying core
- Tests colocated in `tests/observability/` mirror source structure

**No Additional Projects**: Observability is a supporting Django app, not a standalone service.

## Complexity Tracking

**No violations or complexity escalation.** Feature uses standard Django app patterns with Protocol-based extension points (Constitution Principle II compliant).
