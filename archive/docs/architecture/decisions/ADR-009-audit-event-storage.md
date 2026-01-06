# ADR-009: Audit Event Storage Strategy

**Status**: Accepted
**Date**: 2025-11-27
**Deciders**: Engineering Team
**Feature**: 009-audit-logging-system

## Context

The audit logging system needs to store diverse event types (auth, permission, role, config, resource) with event-specific metadata. Each event type has different metadata fields.

**Example**:
- `auth.login` needs `ip` and `user_agent`
- `permission.checked` needs `permission`, `result`, `resource_type`, `resource_id`
- `role.assigned` needs `role_name`, `target_user_id`

We evaluated two approaches:
1. **Single table with JSONField**: One AuditEvent model with metadata as JSON
2. **Separate tables per event type**: AuthLoginEvent, PermissionCheckEvent, etc.

## Decision

**Use single table with PostgreSQL JSONField and explicit GIN index for metadata.**

### Rationale

**Advantages**:
- **Product-Agnostic**: Downstream products can define custom event types without database migrations
- **Query Performance**: GIN index enables fast JSON queries (`metadata__ip='192.168.1.1'`)
- **Schema Simplicity**: One model, one migration, one admin interface
- **Storage Efficiency**: PostgreSQL's JSONB type is space-efficient (binary encoding, compression)
- **Flexibility**: Can add new event types at runtime via registry pattern
- **Proven at Scale**: GitHub, Stripe, GitLab use similar approach for audit logs

**Disadvantages** (and mitigations):
- **Type Safety**: JSON fields lack schema validation
  - *Mitigation*: Event type registry validates required metadata keys
  - *Mitigation*: API-level validation (10KB size limit, event type registration)
- **Query Complexity**: JSON queries use special syntax (`metadata__key`)
  - *Mitigation*: Admin interface abstracts queries
  - *Mitigation*: Documentation provides query examples
- **Index Size**: GIN indexes can be large
  - *Mitigation*: 90-day retention policy limits table growth
  - *Mitigation*: PostgreSQL GIN index compression

### Alternatives Considered

#### Alternative 1: Separate Tables per Event Type

**Approach**: Create `AuthLoginEvent`, `PermissionCheckEvent`, etc. with explicit columns.

**Rejected because**:
- Requires database migration for every new event type (violates product-agnostic principle)
- 13+ tables for core event types alone (schema complexity)
- Downstream products would need Django migrations (tight coupling)
- Querying across event types requires UNIONs (query complexity)

#### Alternative 2: NoSQL (MongoDB, Elasticsearch)

**Approach**: Store events in document database.

**Rejected because**:
- Adds operational complexity (another database to manage)
- PostgreSQL already handles JSON well (JSONB type + GIN indexes)
- ACID guarantees important for audit trail (NoSQL often eventual consistency)
- Team expertise on PostgreSQL (learning curve for NoSQL)

#### Alternative 3: Hybrid (Base table + Type-Specific tables)

**Approach**: AuditEvent base table with foreign keys to type-specific tables.

**Rejected because**:
- Combines disadvantages of both approaches
- Query complexity (always need JOINs)
- Schema complexity (multiple tables)
- No clear advantages over JSONField approach

## Consequences

### Positive

- **Downstream Extensibility**: Products can register event types without migrations:
  ```python
  register_event_type('deployment.started', 'deployment', 'Deployment initiated')
  audit_log.record('deployment.started', metadata={'environment': 'production'})
  ```
- **Fast Queries**: GIN index enables subsecond searches on 100k+ events
- **Simple Schema**: One migration, one model, easy to understand
- **Low Maintenance**: No schema changes needed for new event types

### Negative

- **Metadata Schema Drift**: No database-level validation of metadata structure
  - *Accepted*: API-level validation sufficient for our use case
- **Query Syntax**: JSON queries less intuitive than column queries
  - *Accepted*: Admin interface abstracts most queries, documentation covers advanced usage

### Implementation Requirements

1. **Explicit GIN Index**: Must manually add GIN index on metadata field in migration
   ```python
   migrations.AddIndex(
       model_name='auditevent',
       index=GinIndex(fields=['metadata'], name='audit_metadata_gin'),
   )
   ```

2. **Event Type Registry**: Must validate event types before recording
   ```python
   if not is_event_type_registered(event_type):
       raise ValueError(f"Event type '{event_type}' not registered")
   ```

3. **Metadata Size Limit**: Must enforce 10KB limit to prevent large JSON documents
   ```python
   if metadata_size_kb > 10:
       raise ValueError(f"Metadata size {metadata_size_kb}KB exceeds 10KB limit")
   ```

4. **Retention Policy**: Must implement cleanup command to prevent unbounded growth
   ```bash
   python manage.py audit_cleanup --days 90
   ```

## References

- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin-intro.html)
- [GitHub Audit Log Architecture](https://github.blog/2017-05-23-introducing-github-audit-log/)
- [Stripe Event Log Design](https://stripe.com/docs/api/events)
- [research.md](../../../kitty-specs/009-audit-logging-system/research.md) - Decision 4 (Metadata Storage)
- [data-model.md](../../../kitty-specs/009-audit-logging-system/data-model.md) - Schema design

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-27 | Engineering Team | Initial decision |
