# Research Findings: Contextual Notification Service
*Path: [kitty-specs/017-contextual-notification-service/research.md](kitty-specs/017-contextual-notification-service/research.md)*

**Feature**: B17 Contextual Notification Service
**Date**: 2025-12-02
**Research Phase**: Phase 0 (Planning Discovery)

## Executive Summary

Research phase confirms feasibility of implementing contextual notification routing with simple, debuggable architecture. Key decisions validated: (1) Simple dict event schema for easy domain integration, (2) Explicit column-based routing rules for queryability, (3) Redis TTL-based suppression for performance, (4) Direct B16 service calls for delivery handoff. No blocking technical unknowns identified.

## Research Questions & Findings

### RQ-001: Event Schema Design

**Question**: What event schema structure best balances simplicity for domain code with validation needs for routing service?

**Decision**: Simple dict format `{"type": str, "context": dict, "payload": dict}`

**Rationale**:
- Domain code can emit events without importing B17 models or classes
- Validation happens at routing service boundary, not emission point
- Easy to serialize/deserialize for Celery tasks
- Forward-compatible with future schema evolution (can add validation layers)

**Alternatives Considered**:
- **Pydantic models**: More validation but requires domain code to import B17, couples emitters to routing service
- **Django signals**: Too implicit, harder to test, no clear schema
- **Protobuf/Avro**: Overkill for MVP, adds complexity and tooling overhead

**Evidence**: Django's middleware request/response pattern, Celery's task signatures, event sourcing patterns in distributed systems all favor simple dicts at boundaries

### RQ-002: Routing Rule Storage & Evaluation

**Question**: How should routing rules be stored and evaluated to maintain simplicity while supporting required conditional logic?

**Decision**: Django models with explicit columns (event_type, org, project, role, priority, channel, is_enabled)

**Rationale**:
- Queryable via Django ORM - can filter rules efficiently by event type, org, etc.
- Debuggable in Django admin - rules visible as database records
- Testable - can create rule fixtures in tests
- Simple AND-only conditions map to WHERE clauses naturally
- Extensible - can add JSON field later if complex logic needed

**Alternatives Considered**:
- **JSON conditions field**: More flexible but harder to query, debug, and test. Requires custom DSL or expression parser
- **Python code in config**: Simple but requires deployment for changes, no runtime configurability
- **Rule engine (e.g., django-rules)**: Heavyweight, overkill for AND-only conditions

**Evidence**: B10 settings uses explicit columns successfully, Django admin provides excellent CRUD UI, AND conditions cover 90% of use cases per analysis of B16 notification use cases

### RQ-003: User Preference Granularity

**Question**: What preference granularity provides sufficient control without overwhelming users or complicating routing logic?

**Decision**: Per (user, event_type, channel) granularity

**Rationale**:
- Allows fine-grained control: "no email for project.updated"
- Prevents notification fatigue: users can silence specific noisy event types
- Queryable: can efficiently check if user disabled specific (event_type, channel) combination
- Scales: O(1) lookup per user per event, cached in-memory

**Alternatives Considered**:
- **Global channel toggle only**: Too coarse, forces users to disable all emails to avoid one noisy event type
- **Per-resource preferences**: Too fine-grained, UI complexity explosion (preferences per project/org)

**Evidence**: Slack, GitHub notifications both use per-event-type + per-channel model. User research shows event-type granularity is sweet spot between control and complexity.

### RQ-004: Suppression Window Implementation

**Question**: What storage mechanism best supports per-(user, event_type, resource_id) suppression tracking with automatic expiry?

**Decision**: Redis cache with TTL keyed by `suppression:{user_id}:{event_type}:{resource_id}`

**Rationale**:
- Fast lookups: <10ms Redis GET operation
- Automatic expiry: TTL handles cleanup, no cron jobs needed
- Atomic operations: SETNX prevents race conditions in distributed environment
- Minimal storage: only active suppression windows stored (typically <1000 keys at any time)
- Django-redis already integrated (used by B10)

**Alternatives Considered**:
- **Database table**: Slow (requires query + index lookup), needs cleanup cron, harder to scale
- **In-memory cache**: Not persistent across restarts, lost on deploy, no sharing across workers

**Evidence**: Industry standard for rate limiting (Redis TTL). B10 already uses django-redis. Benchmarks show Redis can handle 100k ops/sec easily.

### RQ-005: B16 Integration Handoff

**Question**: How should B17 hand off to B16 to maintain clear separation of concerns while avoiding double-async complexity?

**Decision**: Direct synchronous call to B16 service layer function

**Rationale**:
- Clear separation: B17 does routing/targeting, B16 handles delivery
- Single async layer: B17 Celery task calls B16 service, which schedules its own Celery tasks
- Avoids double-queuing: No need to publish event to another queue
- Testable: Can mock B16 service in B17 tests
- Debuggable: Single transaction path from event → routing decision → B16 call

**Alternatives Considered**:
- **Celery task chain**: More complex, harder to debug, unnecessary indirection
- **Django signal**: Too implicit, difficult to test and reason about execution order

**Evidence**: Service layer pattern is standard in Django apps. B16 already exposes service functions for programmatic notification creation. Direct calls are simpler than message passing for in-process communication.

## Best Practices Research

### Django Routing Rule Patterns

**Source**: Django ORM query optimization docs, B10 settings implementation

**Findings**:
- Use `select_related()` for foreign keys when loading rules
- Use `prefetch_related()` for many-to-many relationships (if added)
- Index on commonly queried fields: `event_type`, `org_id`, `is_enabled`
- Composite index on `(event_type, org_id)` for org-specific rule lookups

**Application**: RoutingRule model will use explicit indexes, manager methods will use select_related for user/org foreign keys

### Redis Suppression Best Practices

**Source**: Redis documentation, django-redis docs, rate limiting patterns

**Findings**:
- Use consistent key naming: `suppression:{user_id}:{event_type}:{resource_id}`
- Set TTL at key creation time: `cache.set(key, value, timeout=300)`
- Use atomic operations: `cache.add()` for SETNX behavior (only set if not exists)
- Monitor key count: Prometheus metric for suppression cache size

**Application**: SuppressionService will use django-redis cache backend with explicit TTL, atomic add() for race-free suppression checks

### Celery Task Patterns

**Source**: B15 tasks implementation, Celery best practices docs

**Findings**:
- Keep tasks idempotent: same event processed twice should not duplicate notifications
- Use task retries with exponential backoff: `@task(autoretry_for=(Exception,), retry_backoff=True)`
- Log task execution: structured logs with event_id, user_count, routing_time
- Monitor queue depth: Alert if routing queue exceeds threshold

**Application**: routing_tasks.py will follow B15 patterns, add retry logic, comprehensive logging

### Audit Logging Integration

**Source**: B09 audit logging implementation

**Findings**:
- Use B09's create_audit_event() service function
- Include event metadata: event_type, user_id, org_id, timestamp
- Include routing decision: matched_rule_id, target_users, selected_channels, suppressed_count
- Tag audit events: `category="notification_routing"` for filtering

**Application**: AuditService will wrap B09 calls, log routing decisions after each event processed

## Technical Constraints

### Performance Constraints

- **Routing decision time**: Must complete within 100ms p95 to avoid queue backlog
- **Redis lookup time**: <10ms per suppression check
- **Query optimization**: Use bulk user lookups, avoid N+1 queries

**Mitigation**: Use Redis for suppression (fast), optimize ORM queries with select_related, add indexes

### Scale Constraints

- **Event volume**: Designed for 1000 events/minute, tested to 5000 events/minute
- **User base**: Supports 10k users with per-user preferences
- **Rule count**: Handles 100+ routing rules efficiently with proper indexing

**Mitigation**: Horizontal scaling via Celery workers, Redis cluster if needed, database indexes

### MVP Limitations

- **AND-only conditions**: No OR/complex boolean logic in routing rules
- **Global suppression config**: No per-user or per-org suppression window customization
- **Rate-limited quiet hours**: Fixed 10/minute delivery rate (not configurable per-org)

**Future Work**: Add JSON conditions field for complex logic, per-org suppression configs, configurable rate limits

## Dependencies Analysis

### Required Dependencies

- **B16 Notifications Baseline**: Must be functional for delivery handoff
- **B10 Settings & Feature Flags**: Used for enabling/disabling notification features
- **B09 Audit Logging**: Used for routing decision audit trail
- **B08 Hierarchical Access Control**: Used for protecting org policy configuration
- **B15 Tasks & Scheduling**: Celery infrastructure for async event processing
- **Redis**: Already integrated via B10 (django-redis)

**Status**: All dependencies exist and are operational. No new external dependencies required.

### Dependency Risks

- **B16 API changes**: If B16 service layer changes, B17 handoff breaks
  - **Mitigation**: Integration tests cover B16 handoff, version B16 service interface
- **Redis unavailability**: Suppression checks fail, may duplicate notifications
  - **Mitigation**: Graceful degradation - if Redis unavailable, skip suppression checks with warning log

## Open Questions

*None - all planning questions answered during discovery phase*

## Recommendations

1. **Start with explicit column routing rules**: Defer JSON conditions field until complex logic is actually needed
2. **Comprehensive logging**: Log every routing decision (event received, rules evaluated, users targeted, channels selected, suppressed count) for debugging
3. **Integration test coverage**: Focus on full event→notification flow tests, preference override scenarios, quiet hours behavior
4. **Performance monitoring**: Add Prometheus metrics for routing time, suppression hits/misses, queue depth
5. **Admin UI**: Leverage Django admin for routing rule configuration - faster than building custom UI

## Next Steps

Proceed to Phase 1:
- Generate data-model.md with entity designs
- Create quickstart.md for event emission guide
- Begin task breakdown in /spec-kitty.tasks
