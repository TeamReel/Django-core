# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
