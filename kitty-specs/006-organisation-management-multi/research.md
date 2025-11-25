# Research: Organisation Management & Multi-Tenancy

**Feature**: 006-organisation-management-multi
**Created**: 2025-11-24
**Status**: Complete

## Research Questions & Findings

### Q1: Django App Structure Pattern for Multi-Module Features

**Decision**: Modular app with sub-packages (api/, admin/, permissions/, managers/)

**Rationale**:
- Clear separation of concerns improves maintainability
- Follows Django best practices for medium-to-large apps
- Makes testing easier with isolated components
- Aligns with existing accounts app structure (B05)
- Facilitates future refactoring if needed

**Alternatives Considered**:
- Single monolithic app: Simpler initially but harder to maintain as complexity grows
- Split into core + API apps: Over-engineering for this scope; adds unnecessary dependency management
- Flat structure: Works for small apps but becomes unwieldy with 20+ modules

**References**:
- Django documentation: App structure best practices
- Two Scoops of Django: Chapter on app design
- Existing B05-core-accounts implementation patterns

---

### Q2: Rate Limiting Implementation Strategy

**Decision**: Django cache-based limiter with Redis backend for distributed rate tracking

**Rationale**:
- Redis provides atomic increment operations for accurate counting
- Distributed: Works across multiple application instances
- Fast: In-memory operations don't impact database performance
- TTL support: Automatic expiry of rate limit windows
- Battle-tested: Industry standard for rate limiting
- Integrates cleanly with Django cache framework

**Alternatives Considered**:
- Database-backed tracking: Simpler but doesn't scale; adds DB load; harder to implement sliding windows
- django-ratelimit library: Good but adds external dependency; less flexible for custom logic
- Application-level only: Doesn't work in distributed environments

**Implementation Notes**:
- Use Django cache API with Redis backend
- Key format: `ratelimit:org_create:{user_id}:{date}` for daily limits
- Key format: `ratelimit:invite:{org_id}:{hour}` for hourly limits
- Atomic increment with `cache.incr()`
- Set TTL on first increment: 24h for daily, 1h for hourly

**References**:
- Django cache framework documentation
- Redis INCR command for atomic counting
- Rate limiting patterns in distributed systems

---

### Q3: Metrics & Observability Implementation

**Decision**: Prometheus-compatible /metrics endpoint with django-prometheus integration

**Rationale**:
- Industry standard for metrics collection
- Time-series data model perfect for tracking rates and distributions
- Grafana integration for visualization
- PromQL for powerful querying (percentiles, rates, aggregations)
- Pull-based model: No need to push metrics to external service
- django-prometheus provides Django-specific instrumentation out of the box

**Alternatives Considered**:
- Management command with JSON output: Requires external orchestration; no time-series storage
- Structured logging only: Harder to query; requires log aggregation; not real-time
- Custom metrics service: Reinventing the wheel; more maintenance burden

**Implementation Notes**:
- Install django-prometheus package
- Add prometheus middleware to settings
- Expose /metrics endpoint (separate from main API, no auth required from monitoring network)
- Custom metrics via prometheus_client gauges/counters/histograms:
  - `organisations_total` (gauge)
  - `memberships_total` (gauge)
  - `organisation_creations_total` (counter)
  - `member_invitations_total` (counter)
  - `role_changes_total` (counter)
  - `permission_check_duration_seconds` (histogram)
  - `rate_limit_hits_total` (counter)
- Use Django signals to update metrics on model changes

**References**:
- django-prometheus documentation
- Prometheus best practices for metric naming
- Histogram vs Summary for latency tracking

---

### Q4: Soft-Delete & Retention Strategy

**Decision**: Boolean `is_active` field + `deleted_at` timestamp; 30-day retention with automated cleanup

**Rationale**:
- Simple to implement and query
- Preserves audit trail without exposing deleted orgs to users
- Allows graceful restoration within retention window
- Scheduled task for cleanup is straightforward with Django management commands

**Implementation Notes**:
- Add `is_active` (BooleanField, default=True, indexed)
- Add `deleted_at` (DateTimeField, null=True, indexed)
- Manager methods:
  - `active()`: Returns `filter(is_active=True)`
  - `deleted()`: Returns `filter(is_active=False)`
- Override `delete()` method to soft-delete by default
- Provide `hard_delete()` method for superadmin use
- Django management command: `cleanup_deleted_organisations --days=30`
- Celery task (if available) or cron job to run daily

**References**:
- Django model managers for query filtering
- Management commands for scheduled tasks
- Soft-delete patterns in Django

---

### Q5: Permission Checking Pattern

**Decision**: Custom DRF permission classes with membership role lookup

**Rationale**:
- DRF permission classes are the Django/DRF standard
- Composable: Can combine multiple permission checks
- Testable: Easy to unit test permission logic
- Consistent with existing accounts app patterns

**Implementation Notes**:
- `IsOrganisationMember`: Checks user has any membership
- `IsOrganisationAdmin`: Checks user has admin role
- `IsOrganisationAdminOrReadOnly`: Admins can write, members read-only
- Cache membership lookups in request context to avoid repeated queries
- Use `select_related('user', 'organisation')` in viewsets

**References**:
- DRF permissions documentation
- Custom permission class examples

---

## Data Model Decisions

### Organisation Model

**Fields**:
- `id`: UUIDField (primary key, default=uuid4) - Better for distributed systems, no enumeration
- `name`: CharField(max_length=100, unique=True, db_index=True) - Business requirement
- `slug`: SlugField(max_length=100, unique=True, db_index=True) - URL-friendly identifier
- `description`: TextField(blank=True) - Optional rich context
- `created_at`: DateTimeField(auto_now_add=True, db_index=True)
- `updated_at`: DateTimeField(auto_now=True)
- `creator`: ForeignKey(User, related_name='created_organisations', on_delete=PROTECT)
- `is_active`: BooleanField(default=True, db_index=True)
- `deleted_at`: DateTimeField(null=True, blank=True, db_index=True)

**Rationale for UUID**: Prevents enumeration attacks, works better in distributed/sharded scenarios, no ID collision risk.

---

### Membership Model

**Fields**:
- `id`: UUIDField (primary key)
- `user`: ForeignKey(User, on_delete=CASCADE, related_name='memberships')
- `organisation`: ForeignKey(Organisation, on_delete=CASCADE, related_name='memberships')
- `role`: CharField(max_length=20, choices=[('admin', 'Admin'), ('member', 'Member')])
- `joined_at`: DateTimeField(auto_now_add=True, db_index=True)
- `invited_by`: ForeignKey(User, null=True, on_delete=SET_NULL, related_name='invited_memberships')
- `is_active`: BooleanField(default=True, db_index=True)

**Constraints**:
- UniqueConstraint on (user, organisation) - No duplicate memberships
- Index on (organisation, role) - Fast admin lookups
- Index on (user, is_active) - Fast active membership queries

---

## API Design Decisions

### Endpoint Structure

```
/api/organisations/
  GET     - List user's organisations (paginated)
  POST    - Create new organisation

/api/organisations/{id}/
  GET     - Organisation detail
  PATCH   - Update organisation (admin only)
  DELETE  - Soft-delete organisation (admin only)

/api/organisations/{id}/members/
  GET     - List organisation members (paginated)
  POST    - Invite member (admin only)

/api/organisations/{id}/members/{user_id}/
  GET     - Member detail
  PATCH   - Update member role (admin only)
  DELETE  - Remove member (admin only)

/api/organisations/{id}/restore/
  POST    - Restore soft-deleted org (superadmin only)
```

**Rationale**: RESTful, follows DRF conventions, nested routes for hierarchical resources.

---

## Testing Strategy

### Coverage Targets

- Models: 100% (simple logic, critical for data integrity)
- Managers: 100% (query correctness)
- Permissions: 100% (security-critical)
- Views/Serializers: >90%
- API Integration: >90%

### Test Categories

1. **Unit Tests** (`test_models.py`, `test_permissions.py`, `test_validators.py`):
   - Model validation
   - Permission logic
   - Manager methods
   - Rate limiting

2. **API Tests** (`test_api.py`):
   - CRUD operations
   - Role-based access
   - Pagination
   - Error responses
   - Rate limit enforcement

3. **Integration Tests** (`test_integration.py`):
   - Full user flows (create org → invite member → change role → remove)
   - Audit log integration
   - Soft-delete lifecycle

---

## Dependencies

### Required

- Django 5.1+ (project baseline)
- djangorestframework 3.14+
- redis (for rate limiting)
- django-redis (Django cache backend)
- django-prometheus (metrics)
- prometheus-client (metrics library)

### Optional

- celery (for async cleanup tasks - can use management commands otherwise)

---

## Security Considerations

### Authentication

- All endpoints require authentication (IsAuthenticated)
- Use existing accounts app authentication

### Authorization

- Role-based access via custom permission classes
- Admin-only operations: invite, remove, role change, org update
- Self-service: org creation, leaving org (if not last admin)

### Rate Limiting

- Prevent abuse via Redis-backed limits
- Return 429 with Retry-After header
- Log rate limit violations for abuse detection

### Input Validation

- Organisation name: 3-100 chars, alphanumeric + spaces/hyphens/underscores
- Description: Max 2000 chars
- Role: Enum validation (admin/member only)

### Audit Trail

- Log all state changes via B09-audit-logging
- Include actor, timestamp, before/after states
- Never log sensitive data

---

## Performance Considerations

### Query Optimization

- Use `select_related('user', 'organisation')` on membership queries
- Use `prefetch_related('memberships__user')` when loading org with members
- Index on common query patterns: (user, is_active), (organisation, role)

### Caching

- Cache membership lookups per request (avoid repeated DB hits)
- Consider caching org list for users with many orgs (>50)

### Pagination

- Default page size: 25
- Max page size: 100
- Use cursor pagination for large result sets

---

## Deployment Considerations

### Redis Setup

- Redis instance required for rate limiting
- Recommend dedicated Redis for caching vs sessions
- TTL settings: Match rate limit windows (24h/1h)

### Metrics Endpoint

- Expose /metrics on separate port or path
- Network-level access control (monitoring subnet only)
- No authentication required from trusted network

### Scheduled Tasks

- Daily cleanup task for 30-day deleted orgs
- Run via cron or Celery beat scheduler
- Log cleanup results to audit log

---

## Future Enhancements (Out of Scope)

- Hierarchical organisations (parent/child)
- Custom roles beyond admin/member
- Email invitations for non-existent users
- Organisation settings/configuration
- Billing integration
- Organisation transfer workflows
