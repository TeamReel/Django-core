# B10: Settings & Feature Flags

**Phase:** 3
**Status:** ✅ Done
**Module ID:** 010
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 10. B10 – Settings & Feature Flags

**Doel**: Scoped configuration (global/org/project) en feature toggles.

**Status**: ✅ Complete

**Key Features**:
- Setting model with scope hierarchy
- FeatureFlag model (enable/disable features)
- Hierarchical resolution (global → org → project)
- Admin interface for feature management
- API endpoints for settings retrieval

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Settings & Feature Flags
*Path: [kitty-specs/010-settings-feature-flags/spec.md](../../../../kitty-specs/010-settings-feature-flags/spec.md)*

**Feature Branch**: `010-settings-feature-flags`
**Created**: 2025-11-27
**Status**: Draft
**Input**: User description: "Implement a flexible, cache-friendly settings and feature flags subsystem that supports configuration at global, organisation, and project scope without code redeploys, including safe rollout patterns and fallbacks."

## Clarifications

### Session 2025-11-27

- Q: When a flag or setting is updated, how should cache invalidation occur across multiple application instances? → A: Redis pub/sub notifications (real-time invalidation across instances)
- Q: How should global-scope flags and settings store their scope identifier? → A: NULL scope_id for global (nullable FK)
- Q: Can a feature flag and a setting share the same key (e.g., both named "experimental_mode"), or must all keys be globally unique across both types? → A: Separate namespaces (flag "x" and setting "x" can coexist)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enable Feature for Test Organisation (Priority: P1)

An administrator wants to enable a new experimental feature for a single organisation to validate it works correctly before rolling it out globally.

**Why this priority**: Core value proposition - scoped feature flags enable safe rollout patterns and are the foundation for all other scenarios.

**Independent Test**: Create a feature flag at organisation scope, verify it resolves correctly for projects within that organisation, and confirm projects in other organisations don't see the flag enabled.

**Acceptance Scenarios**:

1. **Given** a feature flag "new_dashboard" is disabled globally, **When** an admin enables it for organisation "Acme Corp", **Then** projects belonging to Acme Corp see the flag as enabled, and projects in other organisations see it as disabled.
2. **Given** a feature flag "beta_api" is enabled globally, **When** an admin disables it for organisation "Test Org", **Then** projects in Test Org see the flag as disabled (organisation override takes precedence), and other organisations see it as enabled.
3. **Given** a feature flag "experimental_ui" exists at organisation level, **When** an admin sets it at project level for "Project Alpha", **Then** Project Alpha sees the project-level value (highest precedence), while other projects in the same organisation see the organisation-level value.

---

### User Story 2 - Query Settings via Simple API (Priority: P1)

A developer needs to check whether a feature is enabled or retrieve a configuration value without hardcoding values or querying the database directly.

**Why this priority**: Primary developer interface - without this API, the system cannot be used. Equal priority to P1 since flags are useless without a query mechanism.

**Independent Test**: Call the settings API with various scope combinations, verify correct precedence resolution, and confirm caching behavior reduces database queries.

**Acceptance Scenarios**:

1. **Given** a developer calls `get_flag("feature_x", project=proj)`, **When** the flag is defined at project scope, **Then** the system returns the project-level value without querying organisation or global scopes.
2. **Given** a developer calls `get_setting("max_items", organisation=org)`, **When** no organisation-level value exists but a global default does, **Then** the system falls back to the global value and caches the result.
3. **Given** a cached flag value exists, **When** a developer queries the same flag within the cache TTL, **Then** no database query is executed and the cached value is returned immediately.
4. **Given** a developer calls `get_flag("unknown_flag", project=proj, default=False)`, **When** the flag doesn't exist at any scope, **Then** the system returns the provided default value without raising an error.

---

### User Story 3 - Emergency Flag Disable (Priority: P2)

An operator discovers a production issue caused by a recently enabled feature and needs to disable it immediately across all scopes without redeploying code.

**Why this priority**: Critical operational capability but depends on P1 flag system being in place first.

**Independent Test**: Disable a flag at global scope via admin interface, verify all scope resolutions immediately reflect the change after cache invalidation.

**Acceptance Scenarios**:

1. **Given** a feature flag "problematic_feature" is causing errors, **When** an operator disables it globally via Django admin, **Then** all subsequent queries return disabled within cache TTL (5 minutes or less).
2. **Given** a flag is disabled globally, **When** organisation-level overrides exist, **Then** the organisation overrides are ignored and all projects see the flag as disabled (global disable is absolute).
3. **Given** an operator disables a flag, **When** the change is saved, **Then** an audit log entry is created recording the actor, timestamp, scope, and reason (if provided).

---

### User Story 4 - Manage Settings Types (Priority: P3)

An administrator configures various setting types (string, integer, boolean, JSON) at different scopes to control application behavior.

**Why this priority**: Extends basic flag functionality with typed settings - useful but not critical for MVP.

**Independent Test**: Create settings of different types at various scopes, verify type validation and correct serialization/deserialization.

**Acceptance Scenarios**:

1. **Given** an admin creates a string setting "api_base_url" with value "https://api.example.com", **When** a developer queries this setting, **Then** the value is returned as a string without type conversion errors.
2. **Given** an admin creates an integer setting "max_connections" with value "100", **When** the setting is queried, **Then** the value is returned as an integer (not string "100").
3. **Given** an admin creates a JSON setting "feature_config" with value `{"timeout": 30, "retry": true}`, **When** the setting is queried, **Then** the value is returned as a parsed dictionary/object.
4. **Given** an admin attempts to save an invalid JSON string, **When** validation runs, **Then** the system rejects the value with a clear error message.

---

### Edge Cases

- **Concurrent updates**: What happens when two admins update the same flag simultaneously? (Last write wins; audit log captures both changes)
- **Cache staleness**: How does the system handle stale cached values after a flag update? (Time-based TTL expiration; document acceptable staleness window of 5 minutes)
- **Missing scope context**: What happens when code queries a flag without providing project or organisation context? (Falls back to global scope; logs warning if global value also doesn't exist)
- **Type mismatch**: How does the system handle a setting value that doesn't match its declared type? (Validation at save time prevents this; document migration path if type changes)
- **Circular precedence**: Can organisation and project scopes create circular dependencies? (No - linear precedence hierarchy prevents cycles: project > organisation > global)
- **Deleted scope entities**: What happens when a project or organisation referenced by a setting is deleted? (Cascade delete settings tied to that scope; document cleanup procedure)
- **Very large JSON settings**: How does the system handle settings with multi-megabyte JSON values? (Enforce size limit at validation time; document recommended maximum of 64KB per setting)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store feature flags and settings with three scope types: global, organisation, and project. Flags and settings maintain separate key namespaces (a flag and setting may share the same key name without conflict)
- **FR-002**: System MUST resolve flag/setting values using precedence: project scope > organisation scope > global scope
- **FR-003**: System MUST support setting value types: boolean, string, integer, and JSON
- **FR-004**: System MUST provide a query API that accepts scope context (project, organisation, or neither) and returns resolved values
- **FR-005**: System MUST cache resolved values with a configurable TTL (default 5 minutes) to minimize database queries under high read load
- **FR-006**: System MUST invalidate cache entries when flag or setting values are updated at any scope using Redis pub/sub to broadcast invalidation messages to all application instances
- **FR-007**: System MUST integrate with B09 audit logging to record create, update, and delete operations on flags and settings, including actor identity and scope context
- **FR-008**: System MUST provide Django admin interface for managing flags and settings across all scopes
- **FR-009**: System MUST validate setting values match their declared type before saving (e.g., reject malformed JSON)
- **FR-010**: System MUST allow default values to be specified when querying non-existent flags or settings
- **FR-011**: System MUST enforce unique constraints on (key, scope_type, scope_id) to prevent duplicate settings at the same scope, where scope_id may be NULL for global scope
- **FR-012**: System MUST support querying all flags/settings for a given scope (e.g., "get all organisation-level settings")
- **FR-013**: System MUST document safe rollout patterns including gradual rollout strategies, fallback procedures, and cache invalidation best practices
- **FR-014**: System MUST NOT store secrets, credentials, or PII as setting values
- **FR-015**: System MUST support soft-delete or archiving of deprecated flags (optional audit trail of historical flag states)

### Key Entities

- **Flag**: A boolean feature toggle with a unique key, scope (global/organisation/project), scope identifier (NULL for global scope, FK to organisation or project for scoped flags), enabled/disabled state, optional description, and metadata for audit context.
- **Setting**: A typed configuration value with a unique key, scope (global/organisation/project), scope identifier (NULL for global scope, FK to organisation or project for scoped settings), value (stored as text/JSON), declared type (boolean/string/integer/JSON), optional description, and metadata for audit context.
- **Scope**: An enumeration representing the three hierarchy levels (GLOBAL, ORGANISATION, PROJECT) with clear precedence rules.

**Relationships**:
- Flags and Settings reference Organisation and Project entities from existing apps (B06, B07)
- Flags and Settings emit audit events to B09 audit logging system
- Cache keys are derived from (flag/setting key, scope type, scope id) tuples

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Settings and feature flags are infrastructure primitives applicable to any multi-tenant application. No product-specific behavior is encoded.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Notes**: The settings app depends on `organisations` and `projects` for scope resolution, and on `audit` for change tracking. These are unidirectional dependencies. Future extensions (e.g., user-specific settings) can be added via new scope types without breaking existing code.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Test Coverage Targets**:
- Models and managers: 90%+
- Query API: 95%+ (critical path)
- Admin interface: 80%+
- Cache layer: 90%+
- Audit integration: 85%+

**Key Test Scenarios**:
- Precedence resolution across all scope combinations
- Cache hit/miss behavior and invalidation
- Concurrent updates and race conditions
- Type validation for all supported setting types
- Audit log emission on CRUD operations

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Security Notes**:
- Settings API requires authentication; admin interface uses Django's permission system
- No secrets or credentials stored as setting values (enforce via validation)
- Audit logs capture changes but not sensitive setting content
- Cache keys do not expose sensitive data

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Performance Strategy**:
- Use `select_related` when resolving scope precedence to avoid N+1
- Cache resolved values with Redis; fallback to database if cache unavailable
- Use Redis pub/sub for real-time cache invalidation across all application instances
- Batch queries when fetching multiple settings for same scope
- Pagination for admin list views and bulk export APIs
- Metrics: cache hit rate, query latency, flag resolution time, invalidation message propagation latency

**Degradation Strategy**:
- If cache unavailable, query database directly (slower but functional)
- If audit logging fails, log error but allow setting update to succeed (eventual consistency)
- If scope entity (org/project) not found, fall back to global scope with warning

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**API Patterns**:
- REST API endpoints: `GET /api/settings/flags/{key}`, `GET /api/settings/config/{key}` (separate endpoints enforce namespace separation)
- Python API: `settings.get_flag(key, project=None, org=None, default=False)` and `settings.get_setting(key, project=None, org=None, default=None)` (separate functions enforce namespace separation)
- Consistent error responses (404 for missing key, 400 for validation errors)
- Deprecation: If flag schema changes, use API versioning (`/api/v2/settings/`)

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Documentation Deliverables**:
1. **User Guide**: How to create, update, and query flags/settings
2. **Rollout Playbook**: Safe rollout patterns (gradual enablement, monitoring, rollback)
3. **API Reference**: Python and REST API documentation with examples
4. **ADR**: Cache invalidation strategy and scope precedence rules
5. **Extension Guide**: How to add new scope types or setting value types

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can query any flag or setting in under 10ms on cache hit, 50ms on cache miss (p95)
- **SC-002**: System handles 10,000+ flag queries per second per instance without database saturation
- **SC-003**: Admins can enable/disable flags for specific scopes within 2 minutes via Django admin
- **SC-004**: 95% of flag queries result in cache hits under normal operating conditions (measure cache hit rate)
- **SC-005**: All flag/setting changes are audited with 100% reliability (audit log completeness)
- **SC-006**: Cache staleness window is ≤ 5 minutes after flag update (measure cache invalidation latency)
- **SC-007**: Zero production incidents caused by incorrect flag precedence resolution (correctness)
- **SC-008**: Operators can safely disable problematic features within 1 minute (including cache propagation time)

### Qualitative Outcomes

- Developers report the flag query API is intuitive and requires minimal documentation lookup
- Operations team successfully rolls out new features to test organisations before global launch without errors
- Feature flag documentation includes clear examples and rollout best practices
