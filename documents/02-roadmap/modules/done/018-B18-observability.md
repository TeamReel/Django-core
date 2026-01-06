# B18: Observability

**Phase:** 5
**Status:** ✅ Done
**Module ID:** 018
**Category:** Operations

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 18. B18 – Platform Observability Foundation

**Doel**: Health checks, logging standards, metrics hooks (Prometheus), tracing readiness.

**Status**: ✅ Complete

**Key Features**:
- django-prometheus integration
- Health check endpoints (/health/ready, /health/live)
- Metrics exposure (/metrics)
- Structured logging patterns
- Tracing hooks (OpenTelemetry-ready)
- Performance monitoring baseline

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Platform Observability Foundation
*Path: [kitty-specs/018-platform-observability-foundation/spec.md](../../../../kitty-specs/018-platform-observability-foundation/spec.md)*

**Feature Branch**: `018-platform-observability-foundation`
**Created**: 2025-12-03
**Status**: Draft
**Input**: Provide observability primitives such as health checks, readiness probes, structured logging and metric hooks to monitor platform health.

## Executive Summary

This feature provides foundational observability capabilities for the Django Core-App platform. It delivers binary health checks (healthy/unhealthy), Kubernetes-compatible liveness and readiness probes, structured JSON logging, and metric hooks. The system prioritizes simplicity and Constitutional compliance over complex component-level health states. Task-level observability hooks (B15 integration) are a first-class requirement, not an optional extension.

### Problem Statement

Operators and platform engineers need visibility into platform health without deploying custom monitoring solutions. Current gaps include:
- No standardized health check endpoints for Kubernetes orchestration
- Inconsistent logging formats that impede log aggregation and analysis
- No metric collection hooks for downstream monitoring systems (Prometheus, Datadog, etc.)
- Missing observability for background task execution (B15 tasks)

These gaps create operational blind spots, slow incident response, and violate the Engineering Constitution's requirement for "structured logging and metrics hooks" (Principle VI).

### Goals

1. Provide binary health checks for critical dependencies: database, cache, Redis queue, migration state
2. Expose Kubernetes-compatible liveness (`/health/live`) and readiness (`/health/ready`) probe endpoints
3. Implement structured JSON logging with correlation IDs, severity levels, and secure field filtering
4. Provide metric hooks (counters, histograms, gauges) that downstream systems can consume
5. Integrate first-class observability hooks into B15 task scheduling system (task start, completion, failure, duration)
6. Ensure all logging and metrics comply with Engineering Constitution security/privacy rules (no PII, no secrets)

### Non-Goals

1. **Detailed component health states**: No "degraded," "warning," or "critical" statuses—only healthy/unhealthy
2. **Dependency health dashboards**: Downstream products can build dashboards; core provides primitives only
3. **Automatic remediation**: No auto-healing, circuit breakers, or failover logic
4. **Distributed tracing**: OpenTelemetry integration is out of scope (extension layer concern)
5. **Pre-built Grafana/Kibana dashboards**: Provide data primitives; visualization is downstream responsibility


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Kubernetes Health Probes (Priority: P1)

As a **platform operator**, I need Kubernetes to automatically restart unhealthy pods and route traffic only to ready instances, so that service disruptions are minimized without manual intervention.

**Why this priority**: This is the foundational requirement for running Django Core-App in Kubernetes. Without liveness/readiness probes, orchestration cannot function correctly.

**Independent Test**: Deploy pod with health endpoints, simulate database connection failure, verify Kubernetes restarts pod (liveness) and removes pod from service rotation (readiness).

**Acceptance Scenarios**:

1. **Given** all dependencies are healthy, **When** Kubernetes queries `/health/live`, **Then** returns 200 OK with `{"status": "healthy"}`
2. **Given** database connection is lost, **When** Kubernetes queries `/health/ready`, **Then** returns 503 Service Unavailable with `{"status": "unhealthy", "checks": {"database": false}}`
3. **Given** migrations are pending, **When** Kubernetes queries `/health/ready`, **Then** returns 503 and pod is removed from load balancer pool
4. **Given** pod is in startup phase with slow dependency initialization, **When** Kubernetes queries `/health/live` before `/health/ready`, **Then** liveness returns 200 (process alive) while readiness returns 503 (not ready for traffic)

---

### User Story 2 - Structured Logging with Security Compliance (Priority: P2)

As a **security engineer**, I need all platform logs to be structured JSON with sensitive fields automatically redacted, so that log aggregation tools can parse events without exposing PII or secrets.

**Why this priority**: Enables centralized log management (ELK, Splunk) while maintaining Constitutional compliance. Must be implemented before any production logging occurs.

**Independent Test**: Trigger log event with user email and API key in context, verify JSON output contains correlation ID and severity level, and verify PII fields are redacted (e.g., `user_email: "[REDACTED]"`).

**Acceptance Scenarios**:

1. **Given** a request with correlation ID `abc-123`, **When** application logs an event, **Then** log includes `{"correlation_id": "abc-123", "severity": "INFO", "timestamp": "ISO8601", "message": "...", "context": {...}}`
2. **Given** log context contains field `password`, **When** log is emitted, **Then** field value is replaced with `"[REDACTED]"` in output
3. **Given** Engineering Constitution defines PII fields (`email`, `ssn`, `phone_number`), **When** any log includes these fields, **Then** values are automatically redacted
4. **Given** developer logs exception with stack trace, **When** trace contains SQL query with user ID, **Then** parameterized query is logged without exposing actual user ID value

---

### User Story 3 - Task-Level Observability (B15 Integration) (Priority: P1)

As a **platform engineer**, I need visibility into background task execution (start time, duration, success/failure, retry attempts), so that I can diagnose task queue backlogs and failures without querying databases directly.

**Why this priority**: B15 tasks are a core platform capability. Without observability, task failures become invisible until users report issues. This is a **first-class requirement**, not optional.

**Independent Test**: Schedule Celery task via B15, verify metric hooks emit `task_started`, `task_completed`, `task_duration_seconds` events to metric backend (e.g., Prometheus `/metrics` endpoint).

**Acceptance Scenarios**:

1. **Given** a scheduled task starts execution, **When** task begins, **Then** emit metric `tasks_started_total{task_name="X", queue="default"}` incremented by 1
2. **Given** a task completes successfully after 5.2 seconds, **When** task finishes, **Then** emit `tasks_completed_total{task_name="X", status="success"}` and `task_duration_seconds{task_name="X"}` histogram with value 5.2
3. **Given** a task fails with exception, **When** task crashes, **Then** emit `tasks_completed_total{task_name="X", status="failure"}` and log structured error with task ID, exception type, and correlation ID
4. **Given** a task is retried 3 times before succeeding, **When** final attempt succeeds, **Then** emit `task_retries_total{task_name="X"}` with count=3

---

### User Story 4 - Dependency Health Monitoring (Priority: P2)

As a **platform operator**, I need to quickly identify which dependency (database, cache, queue) is unhealthy during an incident, so that I can route troubleshooting efforts to the correct team.

**Why this priority**: Enables rapid incident triage. Secondary to P1 because basic health checks (US1) already provide binary status; this adds granularity.

**Independent Test**: Disconnect Redis, query `/health/ready`, verify response includes `{"checks": {"database": true, "cache": false, "queue": true, "migrations": true}}` and overall status is `"unhealthy"`.

**Acceptance Scenarios**:

1. **Given** all dependencies are healthy, **When** operator queries `/health/ready`, **Then** response includes `{"status": "healthy", "checks": {"database": true, "cache": true, "queue": true, "migrations": true}}`
2. **Given** PostgreSQL is unreachable, **When** health check runs, **Then** `checks.database` is `false` and overall status is `"unhealthy"`
3. **Given** Redis cache is slow (>500ms response time) but queue is healthy, **When** health check runs with timeout, **Then** `checks.cache` is `false` but overall status remains `"healthy"` (cache is non-critical)
4. **Given** Redis queue connection fails but cache works, **When** health check runs, **Then** `checks.queue` is `false` and overall status is `"unhealthy"` (queue is critical dependency)
5. **Given** unapplied migrations exist, **When** health check runs, **Then** `checks.migrations` is `false` and readiness probe fails (prevents serving traffic with stale schema)

---

### User Story 5 - Metric Hooks for Downstream Monitoring (Priority: P3)

As a **DevOps engineer**, I need to export platform metrics (request counts, error rates, task queue depth) to Prometheus/Datadog, so that I can build custom alerts and dashboards for my organization's specific SLOs.

**Why this priority**: Enables integration with existing monitoring stacks. Lower priority because basic health checks (US1) and task metrics (US3) already provide operational visibility; this is for advanced use cases.

**Independent Test**: Configure Prometheus scraper to query `/metrics` endpoint, verify metrics include `http_requests_total`, `http_request_duration_seconds`, `tasks_queue_depth`, and all metrics follow Prometheus naming conventions.

**Acceptance Scenarios**:

1. **Given** Prometheus scraper is configured, **When** scraper queries `/metrics`, **Then** response includes metrics in Prometheus exposition format (e.g., `# HELP http_requests_total ... \nhttp_requests_total{method="GET",status="200"} 1523`)
2. **Given** application receives 100 HTTP requests, **When** metrics are scraped, **Then** `http_requests_total` counter reflects correct count per method/status label
3. **Given** task queue has 42 pending tasks, **When** metrics are scraped, **Then** `tasks_queue_depth{queue="default"}` gauge returns 42
4. **Given** downstream monitoring system is Datadog (not Prometheus), **When** Datadog agent scrapes metrics, **Then** metric hooks support pluggable exporters (StatsD, OpenMetrics)

---

### Edge Cases

- **What happens when health check itself fails?** If health check logic crashes (e.g., bad configuration), return 503 with minimal error message (no stack traces) to prevent health check from always returning 200.
- **How does system handle partial dependency failures?** If 1 of 4 dependencies fails, readiness probe returns unhealthy (fail-safe), but liveness probe still returns healthy (process is alive).
- **What if correlation ID is missing from request?** Generate new UUID and attach to request context; log warning that upstream service did not provide correlation ID.
- **How are metric cardinality explosions prevented?** Limit label values to predefined sets (e.g., HTTP status codes 2xx/3xx/4xx/5xx, not individual codes like 429); reject custom labels with unbounded values (e.g., user IDs).
- **What happens when log redaction rules conflict?** Explicit redaction rules (e.g., `password`) take precedence over field name patterns (e.g., `*_token`); document precedence order in logging configuration.
- **What happens during database migrations?** While migrations are actively running (detected via migration lock or process check), `/health/ready` returns unhealthy to prevent Kubernetes from routing traffic to pods with in-progress schema changes. Liveness probe remains healthy (process is alive).
- **What happens if observability signal handler crashes?** All observability hooks (B15 signal handlers, metric collectors, log emitters) wrap logic in try-except blocks. If exception occurs, log structured error and increment `observability_signal_failure_total` metric, but allow task execution to continue normally. Observability must never break business logic.
- **What happens when Redis serves both cache and queue, but only one fails?** Health check reports `checks.cache` and `checks.queue` separately. If `checks.queue` fails (Celery broker unavailable), `/health/ready` returns unhealthy and pod is removed from service. If only `checks.cache` fails, health check reports the degradation but pod remains ready (cache is non-critical; application can degrade gracefully without caching).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide `/health/live` endpoint that returns 200 OK when process is running, regardless of dependency state
- **FR-002**: System MUST provide `/health/ready` endpoint that returns 200 OK only when all **critical** dependencies are healthy (database, queue, migrations); non-critical dependencies (cache) are reported but do not affect readiness status
- **FR-003**: System MUST perform health checks for: PostgreSQL connection, Redis cache connection, Redis queue connection, pending migration state, and actively running migrations (treat as unhealthy)
- **FR-004**: System MUST return structured JSON responses for health endpoints with keys: `status` (string: "healthy" or "unhealthy"), `checks` (object with dependency names as keys, boolean values). When Redis is used for both cache and queue, report as separate keys: `checks.cache` and `checks.queue`
  - Example response: `{"status": "unhealthy", "checks": {"database": true, "cache": false, "queue": true, "migrations": true}}`
- **FR-005**: System MUST treat health check timeouts (>500ms per dependency) as unhealthy status
- **FR-006**: System MUST emit structured JSON logs with mandatory fields: `timestamp` (ISO 8601), `severity` (string), `message` (string), `correlation_id` (UUID), `context` (object)
- **FR-007**: System MUST automatically redact sensitive fields in logs according to Engineering Constitution rules: `password`, `secret`, `token`, `api_key`, `ssn`, `email`, `phone_number`, `credit_card`
- **FR-008**: System MUST generate correlation IDs for requests that lack upstream correlation headers (e.g., `X-Correlation-ID`)
- **FR-009**: System MUST provide metric hooks for: counter (monotonically increasing), histogram (distribution of values), gauge (point-in-time value)
- **FR-010**: System MUST emit task-level metrics via B15 hooks: `tasks_started_total`, `tasks_completed_total{status}`, `task_duration_seconds`, `task_retries_total`
- **FR-011**: System MUST log task execution events with structured context: `task_id`, `task_name`, `queue`, `start_time`, `end_time`, `status`, `exception_type` (if failed)
- **FR-011a**: System MUST ensure all observability hooks (signal handlers, metric collectors, log emitters) catch exceptions internally and NEVER propagate uncaught exceptions to task execution logic
- **FR-011b**: System MUST emit `observability_signal_failure_total` metric when any observability hook fails, with labels: `hook_type` (signal name), `failure_reason` (exception class)
- **FR-012**: System MUST expose Prometheus-compatible `/metrics` endpoint with metric names following Prometheus naming conventions (snake_case, `_total` suffix for counters)
- **FR-012a**: System MUST expose per-pod metrics without cross-pod aggregation; each pod's `/metrics` endpoint reports only that pod's counters/gauges/histograms
- **FR-013**: System MUST limit metric label cardinality by restricting label values to predefined sets (e.g., HTTP status grouped as 2xx/3xx/4xx/5xx, not individual codes)
- **FR-014**: System MUST provide pluggable metric exporters to support Prometheus, StatsD, and OpenMetrics formats
- **FR-015**: System MUST NOT log raw SQL queries with parameter values; use parameterized query placeholders only
- **FR-016**: System MUST provide configuration for log severity levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **FR-017**: System MUST document extension points for downstream products to add custom health checks (e.g., external API dependencies)

### Key Entities *(include if feature involves data)*

**N/A**: This feature does not introduce persistent data models. All observability data is emitted to external systems (logs to stdout/files, metrics to Prometheus, health check responses are computed on-demand).

### Constraints

- **Performance Overhead**: Health checks MUST complete in <100ms per dependency (500ms total timeout budget). Metric collection overhead MUST be <1ms per event.
- **Security**: No PII, secrets, or sensitive business data in logs or metrics. All redaction rules MUST be enforced at log emission time, not post-processing.
- **Kubernetes Compatibility**: Liveness and readiness probes MUST conform to Kubernetes HTTP probe specifications (GET requests, status code-based health determination).
- **Engineering Constitution Compliance**: Logging and metrics MUST follow Principle V (Security & Privacy) and Principle VI (Performance & Reliability). No exceptions.
- **B15 Integration**: Task observability hooks are **first-class requirements**, not optional extensions. All task lifecycle events MUST emit metrics and logs.
- **Horizontal Scalability**: Metrics are per-pod and stateless. No in-app aggregation or cross-pod coordination. Downstream monitoring systems (Prometheus) handle aggregation via pod/instance labels. Each pod exposes independent `/metrics` endpoint.

### Assumptions

- Deployment environment has access to stdout for log collection (e.g., Kubernetes logs, Docker logs)
- Downstream monitoring systems (Prometheus, Datadog) will scrape `/metrics` endpoint at regular intervals (recommended: 60 seconds for standard deployments; critical P1 services may use 30 seconds if resources allow)
- Prometheus (or equivalent) handles metric aggregation across pods using labels (pod, instance, deployment); no in-app aggregation required
- Operators will configure alert thresholds based on exposed metrics (e.g., `task_failure_rate > 0.05` triggers alert)
- Log aggregation tools (ELK, Splunk) can parse JSON logs and index by correlation ID
- Redis is used for both cache (django-redis) and task queue (Celery broker)
- Implementation will be efficient enough that 60-second metric scraping adds no measurable performance overhead

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Observability primitives (health checks, logging, metrics) are universally applicable. Health check extension points allow downstream products to add custom dependency checks (e.g., external payment gateway).

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: New Django app `observability/` will be created with three modules: `health.py` (health checks), `logging.py` (structured logging), `metrics.py` (metric hooks). B15 integration via signal handlers to avoid tight coupling.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Justification**: All code will include type hints (e.g., `def check_database() -> HealthStatus`). Metric and logging interfaces will use Protocol types for pluggability.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Justification**: Target 95% coverage. Tests will include: mocked dependency failures (database timeout), correlation ID propagation, PII redaction in logs, metric cardinality limits, B15 task hook invocation.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Justification**: This is a **critical requirement**. All logging and metrics MUST comply with Engineering Constitution security/privacy rules. Redaction is enforced at emission time using configurable field patterns. Health endpoints do NOT require authentication (Kubernetes probes are unauthenticated), but `/metrics` endpoint will support optional token-based auth for downstream products.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Justification**: Health checks use connection pooling and 500ms timeout to prevent cascading failures. Metric collection is async (fire-and-forget) to avoid blocking request threads. If metric backend is unavailable, emit warning log but do not crash application. All observability hooks catch exceptions internally to ensure task/request logic never fails due to observability code.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Justification**: Health endpoints (`/health/live`, `/health/ready`) return consistent JSON schema. Metrics endpoint (`/metrics`) follows Prometheus exposition format spec. No breaking changes expected; if metric format changes, use content negotiation (Accept header).

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Justification**: Documentation will include: (1) Observability quickstart guide, (2) Extension guide for custom health checks, (3) ADR for metric exporter pluggability strategy, (4) Troubleshooting guide for common issues (health check timeouts, missing metrics).

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Kubernetes liveness probe returns 200 OK within 50ms when application process is running (measured via `kubectl describe pod` probe success rate >99.9%)
- **SC-002**: Kubernetes readiness probe correctly detects unhealthy dependencies within 500ms (measured by simulating database failure and verifying pod removal from service within 1 probe cycle)
- **SC-003**: All platform logs include correlation IDs and are parsable by standard JSON parsers (measured by ingesting 10,000 logs into Elasticsearch with 0 parsing errors)
- **SC-004**: PII redaction rules prevent leakage of sensitive fields in logs (measured by scanning 1,000 log samples for patterns matching `email`, `password`, `ssn` and finding 0 unredacted values)
- **SC-005**: Task-level metrics capture 100% of B15 task lifecycle events (measured by comparing Celery task count to `tasks_started_total` metric delta over 1-hour period)
- **SC-006**: Metric cardinality remains bounded under load (measured by verifying `/metrics` endpoint exposes <1,000 unique metric series under 10,000 req/min load)
- **SC-007**: Health check overhead is <5ms p99 latency (measured by comparing p99 latency with and without health checks enabled)
- **SC-008**: Operators can identify failing dependency within 30 seconds of incident start using health check endpoint (measured via incident response simulation)
- **SC-009**: Downstream monitoring systems (Prometheus) successfully scrape metrics every 60 seconds without errors (measured by Prometheus scrape success rate >99.5% over 24 hours; critical services may use 30s interval)
- **SC-010**: Documentation enables downstream product teams to add custom health checks in <30 minutes (measured via user study with 3 product engineers)

## Clarifications

### Session 2025-12-03

- Q: During database migrations (e.g., `python manage.py migrate` running), should the `/health/ready` endpoint return healthy or unhealthy? → A: Unhealthy during migrations - prevents traffic to pods with schema changes in progress
- Q: If B15 Celery task signals fail to fire (e.g., due to Celery middleware crash or signal handler exception), what should happen to ensure observability doesn't silently fail? → A: Observability must never break task logic - signal handlers catch all exceptions internally, log structured error, and emit `observability_signal_failure_total` metric. Task execution continues normally.
- Q: For the `/metrics` endpoint scraping interval, what is the recommended balance between metric freshness and performance overhead? → A: 60 seconds (balanced freshness/overhead, standard practice). Critical P1 services may use 30s if resources allow. Implementation must ensure 60s scraping adds no measurable load.
- Q: When Redis is used for both cache (django-redis) and task queue (Celery broker), and only one function fails, how should health checks report this? → A: Report cache and queue separately in health check response (`checks.cache`, `checks.queue`). Only `checks.queue` failures make pod unready (critical dependency); `checks.cache` failures are reported but don't trigger pod removal (degraded performance, not unavailability).
- Q: For horizontal scaling scenarios with multiple pods scraping metrics, should the implementation include any aggregation strategy or expect downstream systems to handle it? → A: Each pod exposes independent metrics; Prometheus aggregates across pods (standard pull model). No in-app aggregation; metrics are per-pod, stateless, and horizontally scalable. Aggregation/rollups live entirely in the monitoring stack via labels (pod, instance, deployment).
