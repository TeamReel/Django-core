# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Platform Observability Foundation (Feature 018 - B18)

- **Health Check System**:
  - Added `observability` Django app for foundational observability primitives
  - Added `/health/live` endpoint for Kubernetes liveness probes (always returns 200 if process alive)
  - Added `/health/ready` endpoint for Kubernetes readiness probes (checks database, cache, queue, migrations)
  - Added Protocol-based health check registry for custom dependency checks
  - Added automatic health check registration on Django app startup
  - Added 500ms timeout per health check to prevent blocking
  - Added structured JSON response format: `{"status": "healthy|unhealthy", "checks": {...}}`

- **Structured Logging**:
  - Added JSON log formatting with automatic field mapping (timestamp, severity, logger, message, correlation_id)
  - Added correlation ID propagation across HTTP requests and Celery tasks via middleware
  - Added automatic PII redaction for sensitive fields (password, email, ssn, token, api_key, credit_card, phone_number)
  - Added SQL parameter redaction (e.g., `WHERE user_id=?` instead of `WHERE user_id=123`)
  - Added configurable redaction rules via `PIIRedactionFilter` extension points

- **Metrics System**:
  - Added Prometheus-compatible `/metrics` endpoint via django-prometheus integration
  - Added pluggable metric exporter architecture using Protocol pattern (ADR-019)
  - Added `emit_metric()` API for counters, histograms, and gauges with label support
  - Added HTTP request metrics: `http_requests_total`, `http_request_duration_seconds` with method/status labels
  - Added cardinality control: status grouping (2xx/3xx/4xx/5xx), method allowlist (GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS)
  - Added label cardinality validation to prevent metric explosion (<1,000 unique series)

- **Celery Task Observability (B15 Integration)**:
  - Added `ObservableTask` base class for automatic task lifecycle metrics
  - Added task metrics: `tasks_started_total`, `tasks_completed_total`, `task_duration_seconds`, `task_retries_total`, `tasks_queue_depth`
  - Added automatic correlation ID propagation from HTTP request → Celery task context
  - Added task-level exception isolation (failed tasks don't break observability hooks)

- **Exception Isolation & Reliability**:
  - Added graceful failure handling for all observability hooks (never propagates exceptions)
  - Added `observability_signal_failure_total` metric to track observability system failures
  - Added Django signals for observability failures (monitoring + alerting)

- **Configuration & Extension Points**:
  - Added settings namespace: `OBSERVABILITY_HEALTH_CHECKS_ENABLED`, `OBSERVABILITY_METRICS_ENABLED`, `OBSERVABILITY_LOGGING_JSON`, `OBSERVABILITY_PII_REDACTION_ENABLED`
  - Added extension APIs: `register_health_check()`, `register_metric_collector()`, custom PII filters
  - Added Prometheus exporter (default), StatsD exporter (example), OpenMetrics support (via protocol)

- **Documentation**:
  - Added [Platform Observability Guide](docs/observability.md) with quickstart and configuration examples
  - Added [Extension Guide](docs/observability-extension-guide.md) with custom health check, metric exporter, and PII redaction examples
  - Added [Troubleshooting Guide](docs/observability-troubleshooting.md) covering 7 common issues and solutions
  - Added [ADR-019: Metric Exporter Pluggability](docs/adr/019-metric-exporter-pluggability.md) documenting Protocol pattern decision
  - Added [Kubernetes Deployment YAML](docs/deployment/observability-k8s-probes.yaml) with probe configuration examples
  - Added [Prometheus Scrape Configuration](docs/deployment/observability-prometheus-scrape.yaml) with service discovery and alert rules

#### Audit Logging System (Feature 009)

- **Core Audit System**:
  - Added `audit` Django app for system-wide activity tracking
  - Added `AuditEvent` model with immutable event records (id, created_at, event_type, user, organization, project, metadata)
  - Added PostgreSQL JSONField with explicit GIN index for fast metadata queries
  - Added `audit_log.record()` API for recording events with graceful failure handling
  - Added event type registry pattern for runtime validation and extensibility
  - Added Django signals (`audit_record_failed`) for failure observability
  - Added Prometheus metrics (`audit_events_recorded_total`, `audit_failures_total`) for monitoring

- **Event Types**:
  - Registered 13 core event types across 5 categories:
    - Auth: `auth.login`, `auth.logout`, `auth.login_failed`, `auth.password_changed`
    - Permission: `permission.checked`, `permission.granted`, `permission.denied`
    - Role: `role.assigned`, `role.revoked`
    - Config: `config.updated`, `config.feature_toggled`
    - Resource: `resource.created`, `resource.deleted`

- **Admin Interface**:
  - Added read-only Django admin interface at `/admin/audit/auditevent/`
  - Added admin filters for user, event_type, created_at, organization, project
  - Added admin search by event type, user email, and metadata (JSON)
  - Added pagination (100 events per page) and query optimization (select_related)
  - Added date hierarchy for timeline navigation (year/month/day drill-down)
  - Added CSV export admin action for bulk export with metadata serialization
  - Added fieldsets for organized detail view (Event Info, Context, Metadata)

- **B08 Permission System Integration**:
  - Added automatic audit logging for all permission checks in `permissions/evaluator.py`
  - Added automatic audit logging for role assignments in `permissions/models.py` (save)
  - Added automatic audit logging for role revocations in `permissions/models.py` (delete)
  - Permission checks now create `permission.checked` events with result (allowed/denied)
  - Role assignments now create `role.assigned` events with role and target user details
  - Role deletions now create `role.revoked` events with revocation reason

- **Management Commands**:
  - Added `audit_list_event_types` command to display all registered event types
  - Added `audit_export` command to export events to CSV with filtering (--days, --event-types, --user-id)
  - Added `audit_cleanup` command to delete old events per retention policy (--days, --dry-run)
  - Added `audit_seed` command to generate test data (--count)

- **Validation & Safety**:
  - Added metadata size validation (10KB limit) with clear error messages
  - Added automatic IP and user agent capture from HTTP requests
  - Added graceful degradation - audit failures never break application flow
  - Added multi-layer read-only enforcement in admin (permissions + method overrides)
  - Added confirmation prompt in cleanup command to prevent accidental deletion

- **Documentation**:
  - Added `src/audit/README.md` with API documentation and usage examples
  - Added Architecture Decision Record (ADR-009) for audit event storage strategy
  - Updated main README.md with Audit Logging section and quickstart
  - Updated `.github/copilot-instructions.md` with audit technologies
  - Updated `src/permissions/README.md` with B08 audit integration documentation

- **Testing**:
  - Added comprehensive unit tests for audit API (success cases, validation, graceful failure)
  - Added integration tests for B08 permission system (permission checks, role operations)
  - Added admin tests for read-only enforcement, filters, search, pagination
  - Added CSV export tests for edge cases (unicode, quotes, commas in metadata)
  - Added management command tests for all commands
  - Achieved 96% test coverage for audit module, 100% for audit/api.py

### Technical Details

- **Database**: PostgreSQL 13+ with JSONB type and GIN index on metadata field
- **Performance**: 100 events/sec per instance, <10ms overhead, <2s searches on 100k+ events
- **Type Safety**: Full type hints with mypy + django-stubs, all core audit code type-checks cleanly
- **Observability**: Django signals + Prometheus metrics for dual observability
- **Architecture**: Single table design for product-agnostic extensibility

### Migration Notes

- Run `python manage.py migrate audit` to create audit_events table with GIN index
- No data migration required (new feature)
- Audit system is opt-in - existing code continues to work without changes
- B08 integration automatically logs permission checks and role changes
