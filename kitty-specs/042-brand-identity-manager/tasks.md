# Implementation Tasks: B33 Brand Identity Manager

**Feature**: B33 Brand Identity Manager
**Branch**: `042-brand-identity-manager`
**Created**: 2026-02-01

## Overview

This task breakdown covers the implementation of the Brand Identity Manager feature, organized into 6 work packages. The feature implements centralized brand management with merge inheritance pattern for organisations and projects.

**Total Subtasks**: 42
**Work Packages**: 6
**Estimated Effort**: 3-4 days

## Work Package Summary

| ID | Title | Priority | Subtasks | Status |
|----|-------|----------|----------|--------|
| WP01 | Django App Setup & Models | P1 | 8 | ✅ Done |
| WP02 | Serializers & Validation | P1 | 6 | Planned |
| WP03 | ViewSets & API Endpoints | P1 | 8 | Planned |
| WP04 | Permissions & Django Admin | P2 | 6 | Planned |
| WP05 | Testing Suite | P2 | 10 | Planned |
| WP06 | Documentation & Integration | P3 | 4 | Planned |

---

## Work Package 01: Django App Setup & Models
**Priority**: P1 (Foundation)
**Prompt**: [tasks/planned/WP01-django-app-setup-models.md](tasks/planned/WP01-django-app-setup-models.md)

### Goal
Create the `branding` Django app with complete data models for BrandProfile, DesignToken, and BrandAsset.

### Subtasks

- [x] **T001**: Create Django app `src/branding/` with standard structure
- [x] **T002**: Implement BrandProfile model with UUID PK, organisation/project FKs, timestamps
- [x] **T003**: Implement DesignToken model with key-value storage, type choices
- [x] **T004**: Implement BrandAsset model with asset_type choices, File FK (B22)
- [x] **T005**: Add model constraints (unique, check, FK cascades)
- [x] **T006**: Add model methods: `get_tokens()`, `get_effective_brand()`, `__str__()`
- [x] **T007**: Create initial migration file
- [x] **T008**: Run migrations and verify tables created

### Implementation Sketch

1. Use `django-admin startapp branding` in `src/` directory
2. Define models with proper field types, constraints, and relationships
3. Add Meta classes with ordering, verbose names
4. Implement business logic methods for token merge inheritance
5. Generate and apply migrations

### Dependencies
- B06 (Organisations), B07 (Projects), B22 (Files) models must exist

### Risks
- Migration conflicts if parallel development on other features
- FK constraint issues if B06/B07/B22 not properly configured

---

## Work Package 02: Serializers & Validation
**Priority**: P1 (Foundation)
**Prompt**: [tasks/planned/WP02-serializers-validation.md](tasks/planned/WP02-serializers-validation.md)

### Goal
Implement DRF serializers with validation logic for all models.

### Subtasks

- [ ] **T009**: Create BrandProfileSerializer with nested relationships
- [ ] **T010**: Create DesignTokenSerializer with type choices validation
- [ ] **T011**: Create BrandAssetSerializer with File relationship
- [ ] **T012**: Implement token value validation (length 1-255 chars)
- [ ] **T013**: Implement BrandProfile validation (org XOR project, not both)
- [ ] **T014**: Implement unique constraint validation per serializer

### Implementation Sketch

1. Create serializers in `src/branding/serializers.py`
2. Use ModelSerializer base class
3. Add custom validation methods (`validate_*`, `validate()`)
4. Configure read_only, write_only fields appropriately
5. Add nested serializers for related objects in read views

### Dependencies
- WP01 (models) must be complete

### Parallelization
- [P] Can be developed in parallel with WP03 (views) using TDD approach

---

## Work Package 03: ViewSets & API Endpoints
**Priority**: P1 (Core Functionality)
**Prompt**: [tasks/planned/WP03-viewsets-api-endpoints.md](tasks/planned/WP03-viewsets-api-endpoints.md)

### Goal
Implement DRF ViewSets for CRUD operations and special token resolution endpoint.

### Subtasks

- [ ] **T015**: Create BrandProfileViewSet with CRUD operations
- [ ] **T016**: Create DesignTokenViewSet (nested under profile)
- [ ] **T017**: Create BrandAssetViewSet (nested under profile)
- [ ] **T018**: Implement token resolution endpoint (`/api/branding/tokens/resolve/`)
- [ ] **T019**: Implement merge inheritance logic in token resolution
- [ ] **T020**: Add pagination (PageNumberPagination, page_size=20, max=100)
- [ ] **T021**: Configure URL routing in `src/branding/urls.py`
- [ ] **T022**: Add URL includes to main `src/config/urls.py`

### Implementation Sketch

1. Create ViewSets in `src/branding/views.py`
2. Use ModelViewSet for standard CRUD
3. Add custom action for token resolution (`@action(detail=False)`)
4. Implement merge logic: fetch org brand + project brand, merge tokens
5. Configure routers and URL patterns
6. Add query optimization (select_related, prefetch_related)

### Dependencies
- WP01 (models) and WP02 (serializers) must be complete

### Risks
- N+1 query issues if select_related not properly configured
- Merge logic bugs if inheritance pattern not correctly implemented

---

## Work Package 04: Permissions & Django Admin
**Priority**: P2 (Access Control)
**Prompt**: [tasks/planned/WP04-permissions-django-admin.md](tasks/planned/WP04-permissions-django-admin.md)

### Goal
Implement permission classes and configure Django admin interface.

### Subtasks

- [ ] **T023**: Create BrandProfilePermission class (cascade control: org admins → all, project admins → own)
- [ ] **T024**: Apply permissions to all ViewSets
- [ ] **T025**: Register BrandProfile in Django admin with inlines
- [ ] **T026**: Register DesignToken in Django admin
- [ ] **T027**: Register BrandAsset in Django admin
- [ ] **T028**: Add admin list filters, search fields, readonly fields

### Implementation Sketch

1. Create `src/branding/permissions.py` with custom DRF permission class
2. Check user's org/project membership via B06/B07
3. Implement cascade logic: org admin can edit org + all project brands
4. Register models in `src/branding/admin.py`
5. Add TabularInline for tokens and assets
6. Configure list display, filters, search

### Dependencies
- WP03 (views) must be complete for permission testing

---

## Work Package 05: Testing Suite
**Priority**: P2 (Quality Assurance)
**Prompt**: [tasks/planned/WP05-testing-suite.md](tasks/planned/WP05-testing-suite.md)

### Goal
Comprehensive test coverage for models, serializers, views, and integration scenarios.

### Subtasks

- [ ] **T029**: Create test fixtures in `tests/branding/conftest.py`
- [ ] **T030**: Write model tests (`test_models.py`): field validation, constraints, methods
- [ ] **T031**: Write serializer tests (`test_serializers.py`): validation logic
- [ ] **T032**: Write ViewSet tests (`test_views.py`): CRUD operations, status codes
- [ ] **T033**: Write token resolution tests: merge inheritance scenarios
- [ ] **T034**: Write permission tests (`test_permissions.py`): cascade control
- [ ] **T035**: Write integration tests (`test_integration.py`): US1-US5 scenarios
- [ ] **T036**: Write edge case tests: no org brand, inactive profiles, B22 unavailable
- [ ] **T037**: Run coverage report, ensure >90% coverage
- [ ] **T038**: Fix any failing tests or coverage gaps

### Implementation Sketch

1. Create test directory structure: `tests/branding/`
2. Setup pytest fixtures: users, orgs, projects, brands
3. Write unit tests for each component (models, serializers, views)
4. Write integration tests for complete user stories
5. Use APIClient for endpoint testing
6. Mock B22 File storage where appropriate
7. Run: `pytest tests/branding/ --cov=src.branding`

### Dependencies
- All previous work packages (WP01-WP04) must be complete

### Parallelization
- [P] Individual test files can be written in parallel per concern

---

## Work Package 06: Documentation & Integration
**Priority**: P3 (Finalization)
**Prompt**: [tasks/planned/WP06-documentation-integration.md](tasks/planned/WP06-documentation-integration.md)

### Goal
Complete README, update settings, verify integration with B06/B07/B22.

### Subtasks

- [ ] **T039**: Write `src/branding/README.md` with API examples
- [ ] **T040**: Add `branding` to INSTALLED_APPS in settings
- [ ] **T041**: Run full integration test with real B06/B07/B22 data
- [ ] **T042**: Update main repository README with B33 feature entry

### Implementation Sketch

1. Document API endpoints, models, usage examples in app README
2. Update Django settings to include new app
3. Manual integration testing:
   - Create org brand via admin
   - Create project brand via API
   - Verify token resolution returns merged result
   - Upload brand assets and verify B22 storage
4. Update main docs with feature description

### Dependencies
- All previous work packages (WP01-WP05) must be complete

---

## Execution Strategy

### MVP Scope (Day 1-2)
Minimum viable implementation for smoke testing:
- **WP01**: Models complete
- **WP02**: Basic serializers (no advanced validation)
- **WP03**: CRUD endpoints functional
- **T033**: Token merge logic working

This allows early validation of inheritance pattern before building out full feature set.

### Parallel Work Opportunities

1. **After WP01 complete**:
   - [P] WP02 (serializers)
   - [P] WP03 (views) using TDD with serializer mocks

2. **After WP02 + WP03 complete**:
   - [P] WP04 (permissions + admin)
   - [P] WP05 (tests) per component

3. **Final phase**:
   - WP06 (documentation) requires all previous work complete

### Critical Path
WP01 → WP02 → WP03 → WP05 (integration tests) → WP06

**Bottlenecks**: WP03 (token resolution logic) is most complex; allocate extra review time.

---

## Definition of Done

Feature is complete when:

- [ ] All 42 subtasks completed and checked off
- [ ] All 6 work packages in `done/` lane
- [ ] Migrations applied successfully on dev environment
- [ ] All tests passing (`pytest tests/branding/`)
- [ ] Test coverage >90%
- [ ] Code formatted (black) and linted (ruff) with no errors
- [ ] Type hints pass mypy checks
- [ ] Django admin functional for all models
- [ ] API endpoints respond correctly to manual curl tests
- [ ] Integration with B06/B07/B22 verified
- [ ] README documentation complete
- [ ] Pre-commit hooks pass
- [ ] Feature merged to main branch

---

## Next Steps

1. Move `WP01-django-app-setup-models.md` from `planned/` to `doing/`
2. Implement all subtasks in WP01
3. Mark completed subtasks in this file
4. Move WP01 prompt to `for_review/` when done
5. Proceed to WP02 after review passes

**Start with**: [WP01-django-app-setup-models.md](tasks/planned/WP01-django-app-setup-models.md)
