# Implementation Plan: Contextual Notification Service
*Path: [kitty-specs/017-contextual-notification-service/plan.md](kitty-specs/017-contextual-notification-service/plan.md)*

**Branch**: `017-contextual-notification-service` | **Date**: 2025-12-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/017-contextual-notification-service/spec.md`

## Summary

B17 Contextual Notification Service provides intelligent routing of domain events to appropriate users via appropriate channels. The service evaluates routing rules, respects user preferences and organization policies, suppresses duplicate notifications, and logs all routing decisions for debugging. Domain code emits simple event dicts; B17 handles targeting and hands off to B16 for delivery. Key features: per-user+event-type+resource suppression, rate-limited quiet hours, explicit column-based routing rules, and comprehensive audit logging.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.1+, Django REST Framework 3.14+, Celery 5.3+, Redis (django-redis), django-prometheus
**Storage**: PostgreSQL (RoutingRule, NotificationPreference, OrganisationNotificationPolicy models), Redis (suppression window tracking with TTL)
**Testing**: pytest 8.0+, pytest-django, pytest-celery
**Target Platform**: Linux server (containerized deployment)
**Project Type**: Django app within multi-tenant SaaS platform
**Performance Goals**: Process 1000 events/minute, routing decision <100ms p95, Redis suppression lookup <10ms
**Constraints**: Simple AND-only routing conditions (no OR/complex boolean), global suppression config only, rate-limited quiet hours delivery (10/minute)
**Scale/Scope**: 5 initial event types (project.*, org.*), extensible to 20+ event types, support 10k users with fine-grained preferences

**Key Technical Decisions**:
- **Event Schema**: Simple dict `{"type": str, "context": dict, "payload": dict}` for easy domain integration
- **Routing Rules**: Django models with explicit columns (event_type, org, project, role, priority, channel) - queryable and debuggable
- **User Preferences**: Per (user, event_type, channel) granularity stored in dedicated NotificationPreference model
- **Suppression**: Redis cache keyed by (user_id, event_type, resource_id) with configurable TTL - fast lookups, automatic expiry
- **B16 Integration**: Direct synchronous call to B16 service layer - B17 routes, B16 delivers async via Celery
- **Logging**: All routing decisions logged to B09 audit with full context for debugging

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows (routing is generic, event types are domain concepts)
- [x] **Core Focus**: Feature aligns with core concerns (notification infrastructure, multi-tenant routing, audit)
- [x] **Downstream Extension**: Product-specific needs handled via configurable routing rules and event types

### II. Architecture and Modularity
- [x] **Single Responsibility**: contextual_notifications app handles routing only; delivery delegated to B16
- [x] **Stable APIs**: Event emission API is simple dict interface; service layer clearly documented
- [x] **Minimal Dependencies**: Reuses B16, B10, B09, B08, B15 - no new external dependencies
- [x] **No Circular Deps**: Depends on B16/B10/B09/B08, no reverse dependencies
- [x] **No Downstream Imports**: Core routing logic independent of products

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline maintained
- [x] **Type Hints**: All service layer and models will use type hints
- [x] **Black Formatting**: Enforced via pre-commit
- [x] **Ruff Linting**: Enforced via pre-commit
- [x] **No Dead Code**: Clean implementation
- [x] **Readable Code**: Simple routing logic, well-logged for debugging
- [x] **Curated Dependencies**: Only django-redis added (already used by B10)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Standard framework
- [x] **Test Coverage**: Unit tests for routing logic, integration tests for event→notification flow, 90%+ target
- [x] **Regression Tests**: Edge cases from spec covered
- [x] **Deterministic**: Redis mocked in tests, Celery tasks tested synchronously
- [x] **Coverage Thresholds**: 90% minimum
- [x] **Integration Tests**: Full event emission → B16 delivery flow tested

### V. Security and Privacy
- [x] **Secure Defaults**: Follows Django/DRF standards
- [x] **DEBUG Off**: Standard config
- [x] **No Secrets**: No new secrets required
- [x] **Dependency Scanning**: CI scans all deps
- [x] **Centralized Auth**: Org policy config protected via B08 permissions
- [x] **No Sensitive Logging**: Event payloads redacted in logs, only metadata logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Bulk user lookups with select_related/prefetch_related, explicit query optimization
- [x] **Pagination**: Admin/audit log queries paginated
- [x] **Explicit Caching**: Redis for suppression only, cache invalidation via TTL
- [x] **Structured Logging**: All routing decisions logged with context
- [x] **Health Checks**: Routing queue depth monitored
- [x] **Metrics Hooks**: Events processed, routing time, suppressions tracked via django-prometheus
- [x] **Graceful Degradation**: Failed routing logged, does not block B16; routing can be replayed from audit logs

### VII. UX and API Design
- [x] **DRF Required**: Admin API for routing logs uses DRF
- [x] **Consistent Responses**: Standard DRF response format
- [x] **Versioning Strategy**: Event schema versioned if extended
- [x] **Clear Errors**: Validation errors clear, no payload leaks in logs
- [x] **Boundary Validation**: Event schema validated at emission boundary

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Standard Django app, no special setup beyond Redis
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Standard hooks applied
- [x] **Type Checking**: mypy runs cleanly
- [x] **Task Scripts**: Event emission helper functions provided
- [x] **Developer Docs**: Event emission guide, routing rule config guide, debugging guide

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Working on 017-contextual-notification-service
- [x] **Linked to Spec**: PR will reference spec.md
- [x] **Focused PRs**: Single feature scope
- [x] **main Stable**: Feature branch workflow

### X. CI/CD and Quality Gates
- [x] **CI Checks**: All standard checks (Black, Ruff, mypy, pytest)
- [x] **Merge Gates**: All CI must pass
- [x] **Scripted Deployment**: Standard Django migrations

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Event emission guide, routing config guide, troubleshooting guide
- [x] **App README**: contextual_notifications/README.md will document architecture
- [x] **Getting Started**: Quickstart for emitting events
- [x] **Extension Guide**: How to add new event types and routing rules
- [x] **Spec Sync**: Plan tracks spec
- [x] **ADR Required**: ADR for routing rule evaluation order and suppression strategy

### XII. Constitution Evolution
- [x] **No Constitution Changes**: No amendments required
- [x] **Template Updates**: No template changes

### Violations Requiring Justification

*None - all constitution principles satisfied*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/017-contextual-notification-service/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity design
├── quickstart.md        # Getting started guide
├── tasks.md             # Work breakdown (from /spec-kitty.tasks)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks/
    ├── planned/         # Queued work packages
    ├── doing/           # In-progress WPs
    ├── for_review/      # Review-pending WPs
    └── done/            # Completed WPs
```

### Implementation Structure

**Django App**: `src/contextual_notifications/`

```
src/contextual_notifications/
├── __init__.py
├── apps.py
├── admin.py             # Admin interface for routing rules, preferences, policies
├── models/
│   ├── __init__.py
│   ├── routing_rule.py         # RoutingRule model
│   ├── notification_preference.py  # NotificationPreference model
│   ├── org_notification_policy.py  # OrganisationNotificationPolicy model
│   └── managers.py            # Custom querysets/managers
├── services/
│   ├── __init__.py
│   ├── event_service.py       # Event emission API
│   ├── routing_service.py     # Core routing logic
│   ├── suppression_service.py # Redis suppression tracking
│   └── audit_service.py       # B09 integration for routing logs
├── tasks/
│   ├── __init__.py
│   └── routing_tasks.py       # Celery tasks for event processing
├── serializers/
│   ├── __init__.py
│   └── routing_serializers.py # DRF serializers for admin API
├── views/
│   ├── __init__.py
│   └── routing_logs_views.py  # Admin API for routing decision logs
├── migrations/
│   ├── __init__.py
│   └── 0001_initial.py
├── management/
│   └── commands/
│       └── configure_routing.py  # CLI for seeding default rules
├── tests/
│   ├── __init__.py
│   ├── test_event_schema.py
│   ├── test_routing_logic.py
│   ├── test_suppression.py
│   └── test_integration.py
└── README.md
```

**Tests**: `tests/contextual_notifications/`

```
tests/contextual_notifications/
├── __init__.py
├── conftest.py           # Shared fixtures
├── models/
│   ├── test_routing_rule.py
│   ├── test_notification_preference.py
│   └── test_org_policy.py
├── services/
│   ├── test_event_service.py
│   ├── test_routing_service.py
│   ├── test_suppression_service.py
│   └── test_audit_service.py
├── tasks/
│   └── test_routing_tasks.py
└── integration/
    ├── test_event_to_notification_flow.py
    ├── test_preference_override.py
    └── test_quiet_hours.py
```

**Structure Decision**: Standard Django app structure. Single app `contextual_notifications` follows Django conventions with models/, services/, tasks/ separation. Services layer encapsulates routing logic, models are pure data, tasks handle async processing. Integration tests cover full event→notification flows.
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
**Structure Decision**: Standard Django app structure. Single app `contextual_notifications` follows Django conventions with models/, services/, tasks/ separation. Services layer encapsulates routing logic, models are pure data, tasks handle async processing. Integration tests cover full event→notification flows.

## Complexity Tracking

*No violations - standard Django patterns used throughout*
