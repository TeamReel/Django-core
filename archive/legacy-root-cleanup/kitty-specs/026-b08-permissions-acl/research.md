# Research: B08 Permissions & ACL Security Refactor
*Path: [kitty-specs/026-b08-permissions-acl/research.md](kitty-specs/026-b08-permissions-acl/research.md)*

**Feature**: 026-b08-permissions-acl
**Date**: 2025-12-12
**Phase**: 0 (Research & Discovery)

## Overview

This document consolidates technical research findings from the planning interrogation phase. All decisions are validated against the Django Core-App constitution and the security-focused refactoring goals outlined in WP-R01.

---

## Research Log

### R1: Permission Evaluator Architecture

**Question**: Where should B08 → B09 audit integration be implemented to prevent bypass?

**Research Approach**:
- Analyzed existing B08 codebase structure (`src/permissions/`)
- Reviewed B09 audit backend API (`src/audit/`)
- Evaluated decorator-level vs class-level vs centralized patterns
- Assessed signal-based approaches for audit emission

**Findings**:
- **Decorator-level logging**: Multiple code paths (one per decorator), high bypass risk if new decorator added without logging
- **Permission class level**: 8+ DRF permission classes, duplicated logic, inconsistent error handling
- **Centralized evaluator**: Single function, single audit path, type-safe contract, easy to test
- **Signal-based**: Django signals are fire-and-forget, risk of dropped events, harder to implement fallback

**Decision**: Centralized evaluator in `src/permissions/audit.py`

**Rationale**:
- **Security**: Single source of truth prevents bypass
- **Maintainability**: One function to update for audit changes
- **Testability**: Unit test coverage easier with single entry point
- **Fallback**: Django logging fallback logic in one place (FR-002)

**Implementation**:
```python
def evaluate_permission(
    user: User,
    permission: str,
    resource: Optional[Any] = None,
    context: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Evaluate permission and emit audit event.

    Args:
        user: User requesting permission
        permission: Permission code (e.g., "organization.view_balance")
        resource: Optional resource being accessed (for scoping)
        context: Optional context dict {scope, organization_id, project_id, request_id}

    Returns:
        True if permission granted, False if denied

    Side Effects:
        - Emits B09 audit event (or Django log if B09 unavailable)
        - Increments django-prometheus permission check counter
    """
    # Implementation in Milestone 1
```

**Alternatives Rejected**:
- Decorator-level: Too many code paths (see findings above)
- Signal-based: Unreliable delivery, complex fallback logic

**Constitution Alignment**:
- ✅ Principle II (Architecture): Single responsibility, stable API
- ✅ Principle V (Security): Centralized authorization, auditable
- ✅ Principle VI (Reliability): Graceful degradation with fallback

---

### R2: Hierarchical API Response Format

**Question**: What structure should `/api/permissions/current/` return for efficient frontend integration?

**Research Approach**:
- Analyzed F02 auth context structure (`currentUser`)
- Analyzed F03 context switcher state (`currentOrg`, `currentProject`)
- Evaluated flat array vs scoped object vs hierarchical structure
- Considered caching implications for each format

**Findings**:
- **Flat array**: Simple but loses scope information, requires context-specific API calls
- **Scoped object** (single context): `{permissions: [...], scope: {type, id}}` - forces API call per context switch
- **Hierarchical**: `{global: [...], organization: {id: [...]}, project: {id: [...]}}` - preloads all contexts, efficient caching

**Decision**: Hierarchical format with scope-based nesting

```json
{
  "global": ["system.read_audit"],
  "organization": {
    "42": ["organization.view", "billing.read"],
    "43": ["organization.view"]
  },
  "project": {
    "101": ["project.view", "project.edit"],
    "102": ["project.view"]
  }
}
```

**Rationale**:
- **Efficiency**: Single API call preloads permissions for all user contexts
- **Caching**: Frontend can cache entire response, no refetch on context switch (within TTL)
- **Fallback**: `hasPermission(code, {orgId?, projectId?})` can resolve with project → org → global hierarchy
- **F03 Integration**: Aligns with F03's multi-context model (user may be in multiple orgs/projects)

**Implementation Notes**:
- DRF view: `PermissionsCurrentView` inherits from `APIView`
- Serializer: Custom logic to group B08 permissions by scope
- Query optimization: Use `prefetch_related` to avoid N+1 queries

**Alternatives Rejected**:
- Flat array: Loses scope information needed for hierarchical resolution
- Scoped object: Too many API calls, poor UX on context switch

**Constitution Alignment**:
- ✅ Principle VI (Performance): Efficient queries, explicit caching
- ✅ Principle VII (API Design): Consistent response format, clear structure

---

### R3: 403 Response Format Migration Strategy

**Question**: How to roll out structured 403 format without breaking existing consumers?

**Research Approach**:
- Audited existing 403 responses across Core-App APIs
- Analyzed `@django-core/api-client` error handling code
- Evaluated big bang vs phased vs versioned migration
- Assessed Assumption #8 (2-4 week transition acceptable)

**Findings**:
- **Current format**: Django default `{"detail": "You do not have permission to perform this action."}`
- **Consumers**: All frontend packages use `@django-core/api-client` for API calls
- **Centralization**: Error normalizer in api-client is single point of control
- **Risk**: Big bang migration could break downstream consumers if any bypass api-client

**Decision**: Phased migration with dual format support in api-client normalizer

**Migration Timeline**:
1. **Week 1 (this feature)**: Update api-client normalizer to handle both formats
2. **Week 1-2 (this feature)**: Migrate critical endpoints (B11/B16/B17/settings) to new format
3. **Week 3-4 (future WP)**: Migrate remaining endpoints to new format
4. **Week 4+**: Remove legacy format detection (api-client only expects new format)

**Rationale**:
- **Backward compatibility**: Dual format support prevents breakage
- **Risk mitigation**: Gradual rollout allows rollback if issues arise
- **Centralized handling**: api-client normalizer means zero frontend package updates
- **Observability**: Can track format adoption via django-prometheus metrics

**Implementation**:
```typescript
// packages/api-client/src/errors.ts
export function normalizeForbiddenError(response: any): ForbiddenError {
  // Detect new format (has "permission" field)
  if (response.permission) {
    return {
      error: 'forbidden',
      permission: response.permission,
      detail: response.detail || 'Permission denied'
    };
  }

  // Legacy format (Django default)
  return {
    error: 'forbidden',
    permission: 'unknown',  // Cannot infer from legacy format
    detail: response.detail || 'You do not have permission to perform this action.'
  };
}
```

**Alternatives Rejected**:
- Big bang: High risk, difficult rollback
- Versioned API paths (/api/v2/): Doubles maintenance burden for response format change
- Frontend-level normalization: Duplicates logic across packages

**Constitution Alignment**:
- ✅ Principle VII (API Design): Versioning strategy (phased rollout), clear errors
- ✅ Principle X (CI/CD): Repeatable deployments, gradual rollout

---

### R4: Permission Cache Invalidation Strategy

**Question**: How to balance permission cache efficiency with security (stale permissions risk)?

**Research Approach**:
- Analyzed F03 context switcher integration points
- Evaluated cache invalidation strategies (TTL-only, event-based, hybrid)
- Assessed UX implications of cache miss on context switch
- Considered memory usage for multi-context caching

**Findings**:
- **TTL-only**: Simple but stale permissions risk if user switches org and permissions changed
- **Event-based** (F03 integration): Complex, requires tight coupling with F03 state management
- **Hybrid** (TTL + context-aware): Immediate refetch on new context, reuse cache for recent contexts
- **Memory**: Typical user is in 2-3 orgs, 5-10 projects → ~50KB cached data max

**Decision**: Hybrid context-aware caching with per-context TTL

**Cache Behavior**:
1. **First access**: Fetch permissions from `/api/permissions/current/`, cache for 5 minutes
2. **Same context (within TTL)**: Return cached permissions (no API call)
3. **Context switch to new context**: Immediate refetch, cache new context
4. **Context switch to recent context (within TTL)**: Return cached permissions (no API call)
5. **Explicit refetch**: Clear cache entry for current context, refetch

**Rationale**:
- **Security**: New contexts always fetch fresh permissions (no stale risk)
- **UX**: Recent contexts feel instant (no loading spinner)
- **Memory**: LRU eviction keeps max 10 contexts (~100KB)
- **Simplicity**: F03 integration via React Context, no complex event system

**Implementation**:
```typescript
// packages/permissions/src/cache.ts
interface CacheKey {
  userId: string;
  orgId?: string;
  projectId?: string;
}

interface CachedPermissions {
  data: PermissionData;
  timestamp: number;
}

class PermissionCache {
  private cache = new Map<string, CachedPermissions>();
  private ttl = 5 * 60 * 1000; // 5 minutes
  private maxEntries = 10;

  get(key: CacheKey): PermissionData | null {
    const cacheKey = this.serializeKey(key);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  set(key: CacheKey, data: PermissionData): void {
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(this.serializeKey(key), {
      data,
      timestamp: Date.now()
    });
  }

  private serializeKey(key: CacheKey): string {
    return `${key.userId}:${key.orgId || ''}:${key.projectId || ''}`;
  }

  private evictLRU(): void {
    // Remove oldest entry (Map maintains insertion order)
    const firstKey = this.cache.keys().next().value;
    this.cache.delete(firstKey);
  }
}
```

**Alternatives Rejected**:
- TTL-only: Stale permissions risk on context switch
- Event-based: Tight coupling with F03, complex integration
- Immediate refetch always: Poor UX, feels slow

**Constitution Alignment**:
- ✅ Principle VI (Performance): Explicit caching, efficient API usage
- ✅ Principle V (Security): Fresh permissions for new contexts (no stale risk)

---

### R5: PermissionGate Rendering Modes

**Question**: Should PermissionGate support both "hide" and "disable" modes, or just hide?

**Research Approach**:
- Reviewed F01 design system component patterns
- Analyzed UX trade-offs (security vs layout preservation)
- Evaluated fail-closed security posture requirements
- Considered downstream product needs (from clarification Q1)

**Findings**:
- **Hide-only**: Maximum security (fail-closed), but can break layout in some UIs
- **Disable-only**: Preserves layout, but could leak information (user sees disabled button, infers permission exists)
- **Both modes**: Hide as default (security-first), disable opt-in (UX flexibility)

**Decision**: Support both modes via `mode="hide"|"disable"` prop

**Behavior**:
- `mode="hide"` (default): Return `null` from render function (removes from DOM)
- `mode="disable"`: Clone `children` and inject `disabled` prop (for interactive elements)

**Rationale**:
- **Security-first**: Default is fail-closed (hide)
- **Flexibility**: Products can opt into layout preservation when appropriate
- **Explicit opt-in**: `mode="disable"` is explicit decision (not accidental)
- **No data leakage**: Disabled elements show no sensitive information (just visual affordance)

**Implementation**:
```tsx
// packages/permissions/src/PermissionGate.tsx
export function PermissionGate({
  permission,
  mode = 'hide',
  fallback,
  loading,
  children
}: PermissionGateProps) {
  const { loading: permLoading, hasPermission } = usePermissions();

  if (permLoading) {
    return loading || null;  // Fail-closed during loading
  }

  if (!hasPermission(permission)) {
    if (mode === 'hide') {
      return fallback || null;  // Remove from DOM
    }

    // mode === 'disable'
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { disabled: true });
    }

    // Wrap non-interactive elements
    return (
      <div aria-disabled="true" style={{ opacity: 0.5, pointerEvents: 'none' }}>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
```

**Alternatives Rejected**:
- Hide-only: Inflexible for UX scenarios
- Disable-only: Security risk (default should be fail-closed)
- Boolean flag (`showWhenDenied`): Less clear than mode enum

**Constitution Alignment**:
- ✅ Principle V (Security): Secure defaults (fail-closed mode="hide")
- ✅ Principle VII (UX/API Design): Clear API (mode enum)

---

## Technology Choices

### Backend

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Python | 3.12+ | Language | Existing baseline (Constitution III) |
| Django | 5.1+ | Framework | Existing, no changes |
| Django REST Framework | 3.14+ | API layer | Existing, no changes |
| PostgreSQL | existing | Storage | B08 permissions, B09 audit events (existing) |
| Redis | existing | Caching | B08 permission cache (existing, no changes) |
| pytest + pytest-django | existing | Testing | Existing baseline (Constitution IV) |
| mypy | 1.8+ | Type checking | Constitution III (core modules must use type hints) |

### Frontend

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| TypeScript | 5.x | Language | Existing baseline (strict mode) |
| React | 18.x | UI framework | Existing, F02/F03 compatibility |
| React Testing Library | existing | Testing | Existing frontend test framework |
| Jest | existing | Test runner | Existing frontend test runner |

### No New Dependencies Required

This feature introduces **zero new external dependencies**. All required technologies are already in the Core-App stack.

---

## Security Considerations

### Threat Model

**Threat 1**: ACL bypass via direct database queries
- **Mitigation**: Remove B17 direct DB queries, use B06/B07 service layer (enforces ACL)
- **Detection**: Integration tests attempt direct database access (should fail)

**Threat 2**: Permission check bypass via decorator omission
- **Mitigation**: Centralized evaluator pattern (all checks go through one function)
- **Detection**: Code audit + security test suite with explicit bypass attempts

**Threat 3**: Stale permissions in frontend cache
- **Mitigation**: Immediate refetch on context switch, 5-minute TTL, explicit refetch available
- **Detection**: Integration test switches context, verifies fresh permissions fetched

**Threat 4**: Information leakage via 403 error messages
- **Mitigation**: FR-011 requires no sensitive data in error messages (permission codes only)
- **Detection**: Manual review of 403 response content during security review

**Threat 5**: B09 audit event loss
- **Mitigation**: Django logging fallback (FR-002), health check flag for B09 availability
- **Detection**: Integration test with B09 disabled, verify Django logs contain events

### Security Test Coverage

**Unit Tests**:
- Permission evaluator logic (all code paths)
- Audit event emission (success + B09 unavailable fallback)
- Frontend cache invalidation (stale entry scenarios)

**Integration Tests**:
- B11/B16/B17/settings endpoints (allowed + denied scenarios)
- End-to-end 403 format (API → api-client normalizer → frontend error handling)

**Security Tests** (explicit bypass attempts):
- Wrong organization ID (user in org A attempts org B resource)
- Wrong project ID (user in project 1 attempts project 2 resource)
- Missing context (no org/project in request, should fail)
- ID guessing (sequential ID brute force attempt)
- Direct model queries (bypass service layer, should fail after B17 refactor)

**Manual Security Review** (before merge):
- Code audit: All tenant-scoped endpoints use ACL checks
- Penetration testing: Attempt bypass scenarios in staging environment
- Error message review: No sensitive data leakage in 403 responses

---

## Performance Analysis

### Backend Performance

**Permission Check Latency**:
- Target: <10ms for uncached checks (B08 database query)
- Target: <1ms for cached checks (Redis)
- Monitoring: django-prometheus metrics for `permission_check_duration_seconds`

**Audit Event Emission**:
- Target: <5ms for B09 async emission (non-blocking)
- Fallback: <1ms for Django logging fallback
- Monitoring: `audit_event_emission_duration_seconds`

**API Endpoint Latency**:
- `/api/permissions/current/`: <50ms (B08 query + serialization)
- Server-side caching: 5-minute cache per user (reduces load)

### Frontend Performance

**Permission Cache Hit Rate**:
- Target: >80% cache hit rate for typical usage (context switches)
- Target: <50ms for cached permission checks (SC-008)
- Monitoring: Frontend performance metrics (web-vitals)

**Network Requests**:
- Baseline: 1 API call on initial load
- Context switch (new): 1 API call (immediate refetch)
- Context switch (recent): 0 API calls (cache hit)

### Load Testing (Out of Scope for This Feature)

Full load testing deferred to separate WP. Basic performance targets established, monitoring in place.

---

## Open Questions (for Phase 1)

1. **B09 audit event schema**: Does B09 AuditEvent model need `permission_code` field, or use `metadata` JSON field?
   - **Resolution approach**: Check B09 model schema in Phase 1, add field if needed

2. **B17 service layer availability**: Do B06/B07 expose service layer functions for notification routing?
   - **Resolution approach**: Audit B06/B07 codebase in Phase 1, add service functions if missing

3. **F02 auth context shape**: What is the exact structure of `currentUser` in F02?
   - **Resolution approach**: Review F02 code in Phase 1, document in data-model.md

4. **F03 context switcher integration**: What event triggers context switch (props change, React Context update)?
   - **Resolution approach**: Review F03 code in Phase 1, document integration pattern

---

## References

- **Specification**: [spec.md](spec.md)
- **Constitution**: `.kittify/memory/constitution.md`
- **Refactor Plan**: `refactor-plan-core-app-v1.1.0.md` (WP-R01)
- **Analysis Report**: `analysis-core-app-25-modules.md` (Section 5: Security Risks)
- **B08 Module**: `src/permissions/` (existing ACL implementation)
- **B09 Module**: `src/audit/` (existing audit system)
- **F02 Auth UI**: `packages/auth/` (existing auth context)
- **F03 Context Switcher**: `packages/context-switcher/` (existing multi-tenancy context)
