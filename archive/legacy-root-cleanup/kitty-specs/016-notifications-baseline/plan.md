# Implementation Plan: Notifications Baseline
*Path: [kitty-specs/016-notifications-baseline/plan.md](kitty-specs/016-notifications-baseline/plan.md)*


**Branch**: `016-notifications-baseline` | **Date**: 2025-12-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/016-notifications-baseline/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

B16 Notifications Baseline implements a generic, multi-channel notification framework for the django-core-app. The system supports email (SMTP), in-app (database-stored), and webhook (HTTP POST) delivery with async processing via B15 (Celery), configurable per-type retry policies with exponential backoff, delivery tracking, 90-day retention, and B09 audit logging integration. The baseline ships with a single "default" notification type; products extend via plugin architecture (ABC-based NotificationChannel interface) to add custom channels, types, and retry strategies.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, Celery 5.3+ (via B15), django-stubs (type hints)
**Storage**: PostgreSQL (Notification, NotificationType, DeliveryAttempt, RetryPolicy models with JSONField for payloads, GIN indexes for metadata queries)
**Testing**: pytest 8.0+, pytest-django, pytest-celery (for async task testing), mypy 1.8+ (type checking)
**Target Platform**: Linux server (Django web application)
**Project Type**: Web backend (Django app within django-core monorepo)
**Performance Goals**: 10,000 notifications/hour throughput, <5min p99 email delivery, <2s notification history query response, <1s audit event latency
**Constraints**: Email delivery via SMTP (TLS required), webhook timeouts 30s, retry window enforcement, 90-day retention with cleanup tasks
**Scale/Scope**: Multi-channel notification system (3 channels: email, in-app, webhook), extensible plugin architecture, global admin-managed configuration

**Planning Decisions**:
1. **Retry Strategy**: Use Celery's built-in retry mechanism (`autoretry_for`, `retry_backoff`) driven by per-notification-type policies stored in NotificationType/RetryPolicy models
2. **Email Templates**: Django template system for email rendering with variable substitution; products override via template loader
3. **Channel Plugins**: Abstract Base Class (ABC) for NotificationChannel with explicit abstract methods (`send()`, `validate_recipient()`)
4. **Webhook Security**: HMAC-SHA256 signing mandatory by default; per-endpoint opt-out for test environments
5. **Payload Limits**: Channel-specific validation (email: relaxed for HTML, webhook: 1MB limit, in-app: concise for UI)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows - Ships only "default" notification type; products create their own types (password_reset, etc.)
- [x] **Core Focus**: Feature aligns with core concerns (notifications infrastructure for accounts, organisations, projects)
- [x] **Downstream Extension**: Product-specific needs handled via NotificationChannel ABC, custom types, template overrides (FR-032 to FR-034)

### II. Architecture and Modularity
- [x] **Single Responsibility**: New `notifications` Django app - single purpose: notification delivery infrastructure
- [x] **Stable APIs**: REST API via DRF, NotificationChannel ABC with explicit contract, documented extension points
- [x] **Minimal Dependencies**: Only B15 (Celery), B09 (audit), B13 (DRF standards), B05 (User model) - all existing
- [x] **No Circular Deps**: Unidirectional: notifications → B15 → B09 → B13 → B05
- [x] **No Downstream Imports**: Core notifications app imports nothing from products

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
- [x] **Type Hints**: All public APIs (NotificationService, channels, retry logic) fully typed with mypy strict mode
- [x] **Black Formatting**: All code formatted with Black
- [x] **Ruff Linting**: Ruff as primary linter
- [x] **No Dead Code**: Clean implementation, no unused code
- [x] **Readable Code**: Functions/classes small and focused (single responsibility per channel, service, task)
- [x] **Curated Dependencies**: No new external dependencies (uses existing B15 Celery, Django templates, DRF)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
- [x] **Test Coverage**: Target 90%+ for models, tasks, channels; each user story has independent tests
- [x] **Regression Tests**: Edge cases (concurrent updates, retry exhaustion, failure modes) have dedicated tests
- [x] **Deterministic**: SMTP/webhook mocked, no external dependencies in tests
- [x] **Coverage Thresholds**: 90%+ target enforced in CI
- [x] **Integration Tests**: P1 (email delivery), P2 (retry policies), P3 (in-app, webhooks) have end-to-end tests

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF via DRF, webhook HMAC-SHA256 signing mandatory by default, TLS for SMTP
- [x] **DEBUG Off**: No changes to DEBUG settings
- [x] **No Secrets**: SMTP credentials, webhook signing keys in environment variables (SMTP_PASSWORD, WEBHOOK_SECRET_KEY)
- [x] **Dependency Scanning**: No new dependencies to scan
- [x] **Centralized Auth**: Notification creation API uses B05 authentication, B08 permissions for queries
- [x] **No Sensitive Logging**: FR-028 prohibits logging email content/webhook payloads; only metadata logged (hashed recipients)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Notification history API uses select_related(notification_type), prefetch_related(delivery_attempts)
- [x] **Pagination**: All list APIs use DRF PageNumberPagination (default 50, max 100 per page)
- [x] **Explicit Caching**: No caching in baseline (query optimization sufficient for targets)
- [x] **Structured Logging**: Django logging + B09 audit events for critical transitions
- [x] **Health Checks**: Celery task queue depth metric, SMTP connectivity check
- [x] **Metrics Hooks**: FR-026 Prometheus metrics (counters, histograms for delivery performance)
- [x] **Graceful Degradation**: Retry policies for transient failures, permanent failures skip retries, queue throttling (429) on backlog

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework for all APIs
- [x] **Consistent Responses**: B13 error envelope format, {data, meta} structure
- [x] **Versioning Strategy**: Initial v1 API; breaking changes use v2 with v1 deprecation notice
- [x] **Clear Errors**: Validation errors with field-level details, no data leaks in error messages
- [x] **Boundary Validation**: Serializers validate required fields, recipient format, payload size before DB writes

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Standard Django app setup, migrations, admin configuration documented
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest already configured project-wide
- [x] **Pre-commit Hooks**: Existing hooks cover this feature
- [x] **Type Checking**: mypy runs cleanly on all notification modules
- [x] **Task Scripts**: Django management commands for cleanup task, manual retry triggers
- [x] **Developer Docs**: Will create docs/notifications-baseline.md, docs/notifications-extension-guide.md

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work on `016-notifications-baseline` branch
- [x] **Linked to Spec**: PR references kitty-specs/016-notifications-baseline/spec.md
- [x] **Focused PRs**: Implementation broken into work packages (WPs) per /spec-kitty.tasks
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting (Ruff), formatting (Black), mypy, pytest in CI
- [x] **Merge Gates**: All CI checks must pass
- [x] **Scripted Deployment**: Django migrations, Celery worker restart documented

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: docs/notifications-baseline.md (architecture, configuration), docs/notifications-extension-guide.md (custom channels)
- [x] **App README**: notifications/README.md explaining app structure
- [x] **Getting Started**: Quickstart in docs covers SMTP config, first notification, admin setup
- [x] **Extension Guide**: How to subclass NotificationChannel, create custom types, override templates
- [x] **Spec Sync**: Implementation updates spec.md if gaps found during development
- [x] **ADR Required**: ADR-016-notification-retry-policies.md (retry strategy rationale)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: Feature complies with existing constitution
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*None - all constitutional principles satisfied*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/[###-feature]/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (/spec-kitty.plan command)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
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
