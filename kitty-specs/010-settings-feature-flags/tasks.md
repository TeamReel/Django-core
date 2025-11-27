# Work Packages: Settings & Feature Flags System
*Generated from spec.md and plan.md*

**Feature**: B10 Settings & Feature Flags
**Branch**: `010-settings-feature-flags`
**Generated**: 2025-11-27

## Overview

This feature implements a centralised configuration management system with feature flags (boolean toggles) and settings (typed configuration values) supporting three scopes: global, organisation, and project. The system uses separate database tables with optional Redis caching and pub/sub invalidation for multi-instance deployments.

**Architecture Summary**:
- Separate FeatureFlag and Setting Django models with scope support
- Nullable FKs for global scope (scope_id=NULL)
- Redis cache layer with pub/sub invalidation (optional dependency)
- Scope-aware permissions via B08 RBAC integration
- Audit logging via B09 for all CRUD operations
- DRF REST API + Python query API

**Success Criteria**:
- All 4 user stories pass acceptance scenarios
- 80%+ test coverage on core modules
- Constitution check passes (all 12 sections)
- Cache hit rate >90% under typical load
- <5ms p95 for cached queries, <50ms for database fallback

---

## Work Package Status

| ID | Title | Priority | Status | Subtasks | Prompt |
|----|-------|----------|--------|----------|--------|
| WP01 | Django App Setup & Configuration | P0 | Done | 7/7 ✅ | [WP01-django-app-setup.md](tasks/done/WP01-django-app-setup.md) |
| WP02 | Database Models & Migrations | P0 | Done | 8/8 ✅ | [WP02-database-models-migrations.md](tasks/done/WP02-database-models-migrations.md) |
| WP03 | Python Query API & Cache Layer | P1 | Planned | 10 | [WP03-python-query-api-cache.md](tasks/planned/WP03-python-query-api-cache.md) |
| WP04 | REST API Endpoints | P1 | Planned | 9 | [WP04-rest-api-endpoints.md](tasks/planned/WP04-rest-api-endpoints.md) |
| WP05 | Django Admin Interface | P2 | Planned | 6 | [WP05-django-admin-interface.md](tasks/planned/WP05-django-admin-interface.md) |
| WP06 | Scope-Aware Permissions | P1 | Planned | 7 | [WP06-scope-aware-permissions.md](tasks/planned/WP06-scope-aware-permissions.md) |
| WP07 | Audit Integration & Signals | P2 | Planned | 5 | [WP07-audit-integration-signals.md](tasks/planned/WP07-audit-integration-signals.md) |
| WP08 | Testing Suite | P0 | Planned | 12 | [WP08-testing-suite.md](tasks/planned/WP08-testing-suite.md) |

**Total**: 8 work packages, 64 subtasks

---

## Setup & Foundational Work

### WP01: Django App Setup & Configuration
**Priority**: P0 (Foundation)
**Dependencies**: None
**Risk Level**: Low

Create the Django `settings` app structure with all boilerplate files, configuration in base.py, and URL routing. This establishes the foundation for all subsequent work.

**Subtasks** (7):
- [x] T001: Create `src/settings/` directory structure with `__init__.py`, `py.typed`
- [x] T002: Create empty module files (`models.py`, `api.py`, `cache.py`, `admin.py`, `serializers.py`, `views.py`, `urls.py`, `permissions.py`) [P]
- [x] T003: Add `src.settings` to `INSTALLED_APPS` in `src/config/settings/base.py`
- [x] T004: Create `management/commands/` directory with `__init__.py`
- [x] T005: Include `settings.urls` in `src/config/urls.py` at `/api/v1/settings/`
- [x] T006: Create `src/settings/apps.py` with `SettingsConfig` class
- [x] T007: Create `src/settings/README.md` with app overview and architecture summary

**Implementation Notes**:
- Subtasks T001, T002, T004 can run in parallel (different file sets)
- T003, T005 modify existing config files (sequential after file creation)
- T006, T007 are documentation/config (can run in parallel with others)

**Success Criteria**:
- `python manage.py check` passes without errors
- App loads without import errors
- URL routing accessible (returns 404 for now, but no routing errors)

**Prompt**: [tasks/planned/WP01-django-app-setup.md](tasks/planned/WP01-django-app-setup.md)

---

### WP02: Database Models & Migrations
**Priority**: P0 (Foundation)
**Dependencies**: WP01 (app structure must exist)
**Risk Level**: Medium (schema design is critical, migrations must be reversible)

Implement FeatureFlag and Setting models with scope support, nullable FKs for global scope, unique constraints, indexes, and check constraints. Generate and test migrations.

**Subtasks** (8):
- [x] T008: Define `ScopeType` and `SettingType` enums in `models.py`
- [x] T009: Implement `FeatureFlag` model with all fields, constraints, and Meta options
- [x] T010: Implement `Setting` model with all fields, constraints, and Meta options
- [x] T011: Generate initial migration (`0001_initial.py`) for both models
- [x] T012: Create migration `0002_add_indexes.py` for partial indexes and GIN index
- [x] T013: Add check constraints in migration `0003_add_check_constraints.py` (scope_type validation, project→org relationship)
- [x] T014: Test migrations forward and backward (migrate + migrate zero)
- [x] T015: Verify unique constraints work correctly (test duplicate key rejection at same scope)

**Implementation Notes**:
- T008 must complete before T009, T010 (enum definitions needed)
- T009, T010 can be implemented in parallel [P]
- T011 depends on T009, T010 completion
- T012, T013 sequential after T011 (separate migration files)
- T014, T015 are validation steps (run after all migrations created)

**Success Criteria**:
- Migrations apply cleanly in both directions
- Unique constraint enforced on (key, scope_type, organisation_id, project_id)
- Check constraints prevent invalid scope combinations
- Indexes created successfully (verify with `\d settings_feature_flag` in psql)

**Prompt**: [tasks/planned/WP02-database-models-migrations.md](tasks/planned/WP02-database-models-migrations.md)

---

## User Story 1 & 2: Core Query API (P1)

### WP03: Python Query API & Cache Layer
**Priority**: P1 (Core functionality - User Story 2)
**Dependencies**: WP02 (models must exist)
**Risk Level**: High (cache logic complex, Redis pub/sub requires careful handling)

Implement the Python query API (`get_flag`, `get_setting`, `set_flag`, `set_setting`) with scope hierarchy resolution and Redis cache layer with pub/sub invalidation. Graceful degradation when Redis unavailable.

**Subtasks** (10):
- [x] T016: Implement scope hierarchy resolution logic in `api.py` (project → org → global fallback)
- [x] T017: Implement `get_flag(key, project_id=None, organisation_id=None, default=False)` function
- [x] T018: Implement `get_setting(key, project_id=None, organisation_id=None, default=None)` function with type coercion
- [x] T019: Implement cache key generation logic in `cache.py` (format: `settings:flag:{scope}:{id}:{key}`)
- [x] T020: Implement cache get/set operations with TTL (5 minutes)
- [x] T021: Implement cache invalidation logic (delete cache entry on update)
- [x] T022: Implement Redis pub/sub publisher in `cache.py` (send invalidation messages on write)
- [x] T023: Implement Redis pub/sub listener (subscribe to invalidation channel, process messages)
- [x] T024: Add graceful degradation logic (fallback to database-only if Redis unavailable)
- [x] T025: Implement `set_flag` and `set_setting` functions with cache invalidation and audit context

**Implementation Notes**:
- T016 is foundational (required by T017, T018)
- T017, T018 can run in parallel after T016 [P]
- T019-T021 are cache layer basics (sequential)
- T022, T023 are pub/sub implementation (T023 depends on T022 for channel format)
- T024 adds error handling (can be implemented alongside T020-T023)
- T025 is final integration (depends on all previous subtasks)

**Parallelization Opportunities**:
- Query API (T017, T018) and cache layer (T019-T021) can be developed in parallel
- Pub/sub (T022, T023) and graceful degradation (T024) are independent concerns

**Success Criteria**:
- `get_flag` and `get_setting` resolve correctly across all scope combinations (9 test cases: 3 scopes × 3 precedence levels)
- Cache hit rate >90% in load tests
- Cache invalidation propagates within 100ms across multiple instances
- System remains functional when Redis is unavailable (database fallback)

**Prompt**: [tasks/planned/WP03-python-query-api-cache.md](tasks/planned/WP03-python-query-api-cache.md)

---

### WP04: REST API Endpoints
**Priority**: P1 (Core functionality - User Story 2)
**Dependencies**: WP02 (models), WP03 (query API for resolve endpoints)
**Risk Level**: Medium (DRF serializers require careful validation)

Implement DRF ViewSets, serializers, and URL routing for feature flags and settings CRUD operations, plus resolve endpoints for scope hierarchy queries.

**Subtasks** (9):
- [x] T026: Create `FeatureFlagSerializer` with validation (key format, scope_type choices, FK validation)
- [x] T027: Create `SettingSerializer` with type validation (value matches value_type, default_value required)
- [x] T028: Implement `FeatureFlagViewSet` with list, retrieve, create, update, delete actions
- [x] T029: Implement `SettingViewSet` with list, retrieve, create, update, delete actions
- [x] T030: Add filtering support (django-filter integration for scope_type, organisation_id, project_id)
- [x] T031: Implement custom `resolve` action in FeatureFlagViewSet (query param: `?project_id=&organisation_id=`)
- [x] T032: Implement custom `resolve` action in SettingViewSet (query param: `?project_id=&organisation_id=`)
- [x] T033: Configure URL routing in `urls.py` with DefaultRouter
- [x] T034: Add pagination (PageNumberPagination with page_size=20)

**Implementation Notes**:
- T026, T027 are serializer definitions (can run in parallel) [P]
- T028, T029 are ViewSet implementations (can run in parallel after serializers) [P]
- T030 is filtering logic (depends on ViewSets)
- T031, T032 are custom actions (can run in parallel) [P]
- T033, T034 are routing/config (sequential after ViewSets)

**Parallelization Opportunities**:
- Serializers, ViewSets, and resolve actions are independent and can be developed in parallel

**Success Criteria**:
- All CRUD operations work correctly (POST, GET, PATCH, DELETE)
- Filtering returns correct subsets (test with various scope combinations)
- Resolve endpoints return correct values following hierarchy precedence
- Serializer validation rejects invalid data (malformed JSON, type mismatches)

**Prompt**: [tasks/planned/WP04-rest-api-endpoints.md](tasks/planned/WP04-rest-api-endpoints.md)

---

## User Story 3: Emergency Operations (P2)

### WP05: Django Admin Interface
**Priority**: P2 (User Story 3 - operational tool)
**Dependencies**: WP02 (models must exist)
**Risk Level**: Low (standard Django admin patterns)

Create Django admin customizations for managing flags and settings with scope filtering, search, inline editing, and audit trail display.

**Subtasks** (6):
- [x] T035: Register `FeatureFlag` model in `admin.py` with custom ModelAdmin
- [x] T036: Configure `list_display` (key, enabled, scope_type, organisation, project, updated_at)
- [x] T037: Add `list_filter` (scope_type, enabled, updated_at) and `search_fields` (key, description)
- [x] T038: Register `Setting` model with custom ModelAdmin (similar to FeatureFlag)
- [x] T039: Add readonly fields for created_at, updated_at, created_by, updated_by (audit trail)
- [x] T040: Implement custom `save_model` to capture current user in created_by/updated_by fields

**Implementation Notes**:
- T035-T037 configure FeatureFlag admin (sequential steps)
- T038-T040 configure Setting admin (can run in parallel with T035-T037) [P]

**Parallelization Opportunities**:
- FeatureFlag admin and Setting admin configurations are independent

**Success Criteria**:
- Admin interface loads without errors
- Filtering and search work correctly
- Audit fields (created_by, updated_by) populate correctly on save
- Bulk actions (enable/disable flags) work correctly

**Prompt**: [tasks/planned/WP05-django-admin-interface.md](tasks/planned/WP05-django-admin-interface.md)

---

## User Story 1: Scoped Rollout (P1)

### WP06: Scope-Aware Permissions
**Priority**: P1 (User Story 1 - secure scoped access)
**Dependencies**: WP02 (models), WP04 (REST API)
**Risk Level**: High (security-critical, must integrate with B08 RBAC correctly)

Implement DRF permission classes that enforce scope-aware access control: org admins can modify org flags, project admins can modify project flags, superusers manage global scope.

**Subtasks** (7):
- [x] T041: Create `ScopeAwarePermission` base class in `permissions.py` (check user role at requested scope)
- [x] T042: Implement `has_permission` logic (check scope from URL kwargs or request data)
- [x] T043: Implement `has_object_permission` logic (verify user has permission for object's scope)
- [x] T044: Integrate with B08 RBAC system (`user.has_perm('settings.change_featureflag', obj=organisation)`)
- [x] T045: Apply permission class to FeatureFlagViewSet
- [x] T046: Apply permission class to SettingViewSet
- [x] T047: Add permission checks to Django Admin (use `has_change_permission` override)

**Implementation Notes**:
- T041-T043 build permission class (sequential)
- T044 integrates with B08 (depends on T041-T043)
- T045, T046 apply to ViewSets (can run in parallel) [P]
- T047 adds admin permissions (sequential after T044)

**Success Criteria**:
- Org admins cannot modify global flags (403 Forbidden)
- Project admins cannot modify org-level flags (403 Forbidden)
- Superusers can modify all scopes
- Permission checks work in both REST API and Django Admin

**Prompt**: [tasks/planned/WP06-scope-aware-permissions.md](tasks/planned/WP06-scope-aware-permissions.md)

---

## Audit & Observability (P2)

### WP07: Audit Integration & Signals
**Priority**: P2 (Observability - User Story 3)
**Dependencies**: WP02 (models), B09 audit app must exist
**Risk Level**: Medium (signal timing critical, must not block writes)

Integrate with B09 audit logging system using Django signals to record all CRUD operations on flags and settings, including old/new values and actor context.

**Subtasks** (5):
- [x] T048: Create signal handlers in `signals.py` for `post_save` (FeatureFlag and Setting)
- [x] T049: Create signal handlers for `post_delete` (FeatureFlag and Setting)
- [x] T050: Capture old values in `pre_save` handler (store in thread-local or instance attribute)
- [x] T051: Emit audit events to B09 with metadata (actor, scope, old_value, new_value, timestamp)
- [x] T052: Connect signals in `apps.py` `ready()` method

**Implementation Notes**:
- T048, T049 create signal handlers (can run in parallel) [P]
- T050 adds old value capture (depends on T048)
- T051 emits audit events (depends on T048-T050)
- T052 connects signals (final step, depends on all handlers)

**Success Criteria**:
- Audit events emitted for all create, update, delete operations
- Old and new values captured correctly for updates
- Actor (user) captured in audit events
- Audit events do not block flag/setting writes (async or eventual consistency)

**Prompt**: [tasks/planned/WP07-audit-integration-signals.md](tasks/planned/WP07-audit-integration-signals.md)

---

## Testing & Validation (P0)

### WP08: Testing Suite
**Priority**: P0 (Quality gate - must pass before merge)
**Dependencies**: WP02-WP07 (all implementation complete)
**Risk Level**: Medium (comprehensive tests required for 80%+ coverage)

Implement comprehensive test suite covering models, query API, cache layer, REST API, permissions, and audit integration. Includes unit tests, integration tests, and contract tests.

**Subtasks** (12):
- [x] T053: Create `tests/settings/conftest.py` with pytest fixtures (Redis mock, database factories)
- [x] T054: Write model tests (`test_models.py`): unique constraints, check constraints, defaults
- [x] T055: Write query API tests (`test_api.py`): scope resolution, cache hits/misses, graceful degradation
- [x] T056: Write cache layer tests (`test_cache.py`): key generation, TTL, pub/sub invalidation
- [x] T057: Write REST API tests (`test_views.py`): CRUD operations, filtering, pagination
- [x] T058: Write serializer tests: validation logic, type checking, error messages
- [x] T059: Write permission tests (`test_permissions.py`): scope-aware access control, B08 integration
- [x] T060: Write audit integration tests (`test_integration.py`): signal emission, event capture
- [x] T061: Write resolve endpoint tests: hierarchy precedence, all scope combinations
- [x] T062: Run coverage report, verify 80%+ coverage on `src/settings/` module
- [x] T063: Write integration test for User Story 1 acceptance scenarios (scoped rollout)
- [x] T064: Write integration test for User Story 2 acceptance scenarios (query API caching)

**Implementation Notes**:
- T053 creates shared fixtures (foundational)
- T054-T061 are test modules (mostly independent, can run in parallel) [P]
- T062 is validation step (run after all tests written)
- T063, T064 are end-to-end integration tests (sequential after unit tests)

**Parallelization Opportunities**:
- All test modules (T054-T061) can be developed in parallel
- Integration tests (T063, T064) are independent of each other

**Success Criteria**:
- All tests pass (`pytest tests/settings/ -v`)
- Coverage ≥80% on `src/settings/` module
- All user story acceptance scenarios covered by tests
- No flaky tests (run 3 times, all pass)

**Prompt**: [tasks/planned/WP08-testing-suite.md](tasks/planned/WP08-testing-suite.md)

---

## Execution Strategy

### Recommended Sequence

**Phase 0: Foundation** (Parallel safe)
1. WP01: Django App Setup (independent)
2. WP02: Database Models & Migrations (depends on WP01)

**Phase 1: Core API** (Partial parallel)
3. WP03: Python Query API & Cache Layer (depends on WP02)
4. WP04: REST API Endpoints (depends on WP02, WP03 for resolve endpoints)

**Phase 2: Security & Operations** (Parallel safe)
5. WP06: Scope-Aware Permissions (depends on WP02, WP04)
6. WP05: Django Admin Interface (depends on WP02) [P - can run parallel with WP06]
7. WP07: Audit Integration & Signals (depends on WP02) [P - can run parallel with WP05, WP06]

**Phase 3: Testing & Validation** (Sequential)
8. WP08: Testing Suite (depends on WP02-WP07 all complete)

### Parallelization Summary

- **Parallel Group 1** (Phase 0): WP01 (independent)
- **Parallel Group 2** (Phase 1): WP03, WP04 (partial overlap, WP04 resolve depends on WP03)
- **Parallel Group 3** (Phase 2): WP05, WP06, WP07 (fully independent)

**Critical Path**: WP01 → WP02 → WP03 → WP04 → WP06 → WP08 (testing)

**Fastest Execution**: 5 stages
1. WP01
2. WP02
3. WP03 + start WP04
4. Complete WP04 + WP05 + WP06 + WP07 (all parallel)
5. WP08

### MVP Recommendation

**MVP Scope** (Minimum Viable Product for User Story 1 & 2):
- WP01: Django App Setup
- WP02: Database Models & Migrations
- WP03: Python Query API & Cache Layer (without Redis pub/sub - simple TTL cache)
- WP04: REST API Endpoints (basic CRUD only, skip resolve endpoints)
- WP08: Testing Suite (subset - models, query API, REST API only)

**Estimated Effort**: 3-4 work packages → ~2-3 days for experienced developer

**Deferred to Post-MVP**:
- Redis pub/sub invalidation (use TTL-only caching)
- Scope-aware permissions (use Django's default permissions)
- Django Admin interface (use REST API only)
- Audit integration (add signals later)

---

## Risk Assessment

### High Risk Items
1. **Redis pub/sub implementation** (T022, T023): Complex, requires background listener thread/process
   - Mitigation: Start with TTL-only caching, add pub/sub in iteration 2
2. **Scope hierarchy resolution** (T016): Complex logic with 9 combinations (3 scopes × 3 precedence levels)
   - Mitigation: Comprehensive unit tests with all combinations
3. **B08 RBAC integration** (T044): External dependency, may require schema/API changes in B08
   - Mitigation: Review B08 docs first, create integration tests early

### Medium Risk Items
1. **Check constraints** (T013): PostgreSQL-specific, may not work in SQLite for local dev
   - Mitigation: Document dev environment requirements, provide Docker Compose
2. **Type validation** (T027): Setting value types require runtime validation
   - Mitigation: Use JSONField native type checking + custom serializer validators
3. **Graceful degradation** (T024): Redis unavailable scenarios must not crash app
   - Mitigation: Extensive error handling tests, circuit breaker pattern

---

## Success Metrics

### Functional Metrics
- ✅ All 4 user stories pass acceptance scenarios
- ✅ All 15 functional requirements implemented
- ✅ Constitution check passes (12/12 sections)

### Quality Metrics
- ✅ Test coverage ≥80% on `src/settings/` module
- ✅ Zero flaky tests (run 3 times, all pass)
- ✅ Mypy type checking passes (no type errors)
- ✅ Black + Ruff formatting/linting passes

### Performance Metrics
- ✅ Cache hit rate >90% under typical load (100 queries/sec)
- ✅ Cached query latency <5ms p95
- ✅ Database fallback latency <50ms p95
- ✅ Cache invalidation propagation <100ms (with Redis pub/sub)

### Documentation Metrics
- ✅ quickstart.md examples all work (manual validation)
- ✅ API contracts match OpenAPI spec (schema validation)
- ✅ README.md complete with setup instructions

---

## Next Steps

1. **Review this document** with team/stakeholders
2. **Generate work package prompts** (run remaining task generation)
3. **Start with WP01** (Django App Setup - lowest risk, foundational)
4. **Implement MVP** (WP01 + WP02 + WP03 + WP04 + WP08 subset)
5. **Run integration tests** after MVP complete
6. **Add Phase 2 features** (permissions, admin, audit) in parallel
7. **Final testing & validation** (WP08 complete)
8. **Create PR** against main branch

**Estimated Total Effort**: 6-8 days for full implementation (1 developer)
**MVP Timeline**: 2-3 days (focusing on core API only)
