# Task Breakdown: Organisation Management & Multi-Tenancy

**Feature**: 006-organisation-management-multi
**Branch**: `006-organisation-management-multi`
**Created**: 2025-11-24
**Status**: Ready for Implementation

## Overview

This document breaks down the implementation of the Organisation Management & Multi-Tenancy feature into discrete work packages. Each work package can be implemented independently and includes detailed subtasks.

**Total Work Packages**: 7
**Estimated Effort**: 3-4 weeks for complete implementation
**MVP Scope**: WP01 (Foundation) + WP02 (Core Models) + WP03 (User Story 1)

## Subtask Reference

Subtasks are referenced by ID (T001, T002, etc.) and organized into work packages below. Tasks marked with `[P]` can be parallelized safely across different files/concerns.

## Work Package Summary

| ID | Title | Priority | User Story | Subtasks | Dependencies |
|----|-------|----------|------------|----------|--------------|
| WP01 | Project Foundation & Dependencies | Critical | Setup | 6 | None |
| WP02 | Core Data Models & Managers | Critical | All | 8 | WP01 |
| WP03 | Organisation Creation (US1) | P1 | US1 | 7 | WP02 |
| WP04 | Member Invitation & Roles (US2) | P2 | US2 | 6 | WP03 |
| WP05 | Membership Management (US3) | P3 | US3 | 5 | WP04 |
| WP06 | Organisation Viewing & Updates (US4-5) | P4-P5 | US4, US5 | 6 | WP03 |
| WP07 | Rate Limiting & Observability | Critical | All | 7 | WP02 |

---

## Phase 1: Setup & Foundation

### WP01: Project Foundation & Dependencies

**Goal**: Establish Django app structure, install dependencies, and configure core settings required for organisation management.

**Priority**: Critical (blocking all other work)

**Independent Test**: Django app loads without errors, dependencies are installed, settings are configured correctly, and migrations can be generated.

**Success Criteria**:
- Django `organisations` app created with proper structure
- Dependencies (django-redis, django-prometheus) installed
- Redis cache backend configured
- Prometheus middleware added
- Django admin site can be accessed
- `python manage.py check` passes

**Risks**:
- Redis connection issues in local development
- Version conflicts with existing dependencies

**Subtasks**:

- [x] **T001**: Create `src/organisations/` Django app with `__init__.py`, `apps.py`, `models.py`, `admin.py`
- [x] **T002**: Create sub-packages: `organisations/api/`, `organisations/managers/`, `organisations/permissions/`
- [x] **T003**: Add dependencies to `requirements/base.txt`: django-redis==5.4.0, django-prometheus==2.3.1, prometheus-client==0.19.0
- [x] **T004**: Add `organisations` to `INSTALLED_APPS` in `src/config/settings/base.py`
- [x] **T005**: Configure Redis cache backend in `src/config/settings/base.py` with django_redis
- [x] **T006**: Add django_prometheus middleware to settings and configure /metrics endpoint in URLs

**Implementation Sketch**:
1. Use Django's `startapp` or manually create app structure
2. Add sub-package directories with `__init__.py` files
3. Update requirements file and run `pip install -r requirements/base.txt`
4. Configure settings for cache (Redis connection string, client class, key prefix)
5. Add prometheus middleware to MIDDLEWARE list (before/after as needed)
6. Add URL route for metrics endpoint

**Parallel Opportunities**: T001-T002 can be done in parallel with T003-T006 (structure vs config)

**Dependencies**: None

**Prompt**: [tasks/done/WP01-project-foundation-dependencies.md](tasks/done/WP01-project-foundation-dependencies.md) ✅ **Completed and Reviewed**

---

## Phase 2: Core Infrastructure

### WP02: Core Data Models & Managers

**Goal**: Implement Organisation and Membership models with UUID primary keys, soft-delete support, custom managers, and database migrations.

**Priority**: Critical (required for all user stories)

**Independent Test**: Models can be instantiated, saved, and queried. Soft-delete works correctly. Custom managers return correct querysets. Migrations apply cleanly.

**Success Criteria**:
- Organisation model with all fields (id, name, slug, description, timestamps, creator, is_active, deleted_at)
- Membership model with all fields (id, user, organisation, role, joined_at, invited_by, is_active)
- Unique constraints and indexes defined
- Custom managers (active(), deleted()) work correctly
- Soft-delete logic prevents accidental hard-deletes
- Migrations generated and applied successfully
- Database constraints enforced (unique name, unique (user, org) membership)

**Risks**:
- UUID vs integer PK migration complexity (none, new app)
- Slug generation conflicts with existing organisations

**Subtasks**:

- [x] **T007**: Define Organisation model in `organisations/models.py` with UUID PK, fields, and indexes
- [x] **T008**: Define Membership model with UUID PK, foreign keys, role choices, and unique constraint
- [x] **T009**: Implement custom model managers in `organisations/managers.py`: OrganisationQuerySet with `active()`, `deleted()` methods
- [x] **T010**: Implement soft-delete logic: override `delete()` method to set is_active=False and deleted_at=now()
- [x] **T011**: Add `hard_delete()` method for superadmin permanent deletion
- [x] **T012**: Implement slug auto-generation from organisation name in `save()` method using Django's slugify
- [x] **T013**: Generate and apply initial migration: `python manage.py makemigrations organisations && python manage.py migrate`
- [x] **T014**: Add `__str__()` methods, Meta classes with ordering, and model validation

**Implementation Sketch**:
1. Import UUID, User model, Django fields
2. Define Organisation with all fields, set default for id (uuid.uuid4)
3. Define Membership with ForeignKeys, choices for role
4. Create custom QuerySet and Manager classes
5. Override delete() to soft-delete, add hard_delete() for actual deletion
6. Use slugify() in save() if slug not provided
7. Run makemigrations and inspect SQL
8. Apply migrations

**Parallel Opportunities**: T007-T008 [P] (different models), T009-T012 [P] (after models defined)

**Dependencies**: WP01 (app structure must exist)

**Prompt**: [tasks/for_review/WP02-core-data-models-managers.md](tasks/for_review/WP02-core-data-models-managers.md) ✅ **Completed, Awaiting Review**

---

## Phase 3: User Stories (Priority Order)

### WP03: Organisation Creation API (User Story 1)

**Goal**: Implement REST API endpoints for creating organisations and viewing organisation details, enforcing that creators become first admin.

**Priority**: P1 (highest user story priority)

**Independent Test**: Authenticated user can POST to /api/organisations/ with name, system creates org with creator as admin, GET returns org details with member count.

**Success Criteria**:
- POST /api/organisations/ endpoint accepts name and optional description
- System auto-assigns creator as first admin member
- GET /api/organisations/{id}/ returns full org details including member counts
- Validation enforces unique name, 3-100 character length, allowed characters
- Creator's role is correctly set to 'admin' in membership
- Audit log records organisation creation event

**Risks**:
- Race conditions on name uniqueness
- Creator membership transaction rollback scenarios

**Subtasks**:

- [x] **T015**: Create `organisations/api/serializers.py` with OrganisationSerializer (read) and OrganisationCreateSerializer (write)
- [x] **T016**: Implement validation in serializer: unique name, length 3-100, pattern `^[a-zA-Z0-9\s\-_]+$`
- [x] **T017**: Create `organisations/api/views.py` with OrganisationViewSet (DRF ModelViewSet)
- [x] **T018**: Implement `perform_create()` override to set creator=request.user and create first admin membership atomically using transaction.atomic()
- [x] **T019**: Add computed fields to detail serializer: member_count, admin_count, user_role
- [x] **T020**: Configure URL routing in `organisations/api/urls.py` using DRF router
- [x] **T021**: Register organisations API URLs in `src/config/urls.py` at `/api/organisations/`

**Implementation Sketch**:
1. Create serializer with fields matching model
2. Add validation methods for name constraints
3. Create viewset inheriting from ModelViewSet
4. Override perform_create to wrap org creation + membership creation in transaction
5. Add SerializerMethodFields for counts and user role
6. Use DRF DefaultRouter for URL generation
7. Include router.urls in main URLconf

**Parallel Opportunities**: T015-T016 [P] (serializer), T020-T021 [P] (URLs after views complete)

**Dependencies**: WP02 (models must exist)

**Prompt**: [tasks/for_review/WP03-organisation-creation-api.md](tasks/for_review/WP03-organisation-creation-api.md) ✅ **Completed, Awaiting Review**

---

### WP04: Member Invitation & Role Assignment API (User Story 2)

**Goal**: Implement REST API endpoints for admins to invite members with roles, enforcing admin-only access and preventing duplicate memberships.

**Priority**: P2

**Independent Test**: Admin user can POST to /api/organisations/{id}/members/ with user_id and role, membership is created, non-admin users are denied access.

**Success Criteria**:
- POST /api/organisations/{id}/members/ endpoint accepts user_id and role
- Custom permission class verifies requester is admin
- System validates no existing membership exists (409 Conflict if duplicate)
- Membership records invited_by field
- GET /api/organisations/{id}/members/ lists all members with pagination
- Non-admin requests return 403 Forbidden

**Risks**:
- Inviting non-existent users (handle gracefully with 404)
- Race conditions on duplicate membership checks

**Subtasks**:

- [x] **T022**: Create custom permission class `IsOrganisationAdmin` in `organisations/permissions.py` that checks membership role
- [x] **T023**: Create MembershipSerializer in `organisations/api/serializers.py` with user, organisation, role, joined_at, invited_by fields
- [x] **T024**: Implement MembershipViewSet as nested route under organisations in `organisations/api/views.py`
- [x] **T025**: Add validation to prevent duplicate memberships (check existing membership in create)
- [x] **T026**: Override perform_create to set invited_by=request.user
- [x] **T027**: Configure nested routing in URLs: `/api/organisations/{organisation_id}/members/`

**Implementation Sketch**:
1. Create permission class that gets organisation from view kwargs, queries membership for request.user with role='admin'
2. Create membership serializer with user FK, role choices
3. Use DRF viewsets.ModelViewSet for CRUD operations
4. Add get_queryset() to filter by organisation
5. Add validation for duplicate (user, org) combo
6. Set invited_by in perform_create
7. Use drf-nested-routers or manual URL patterns for nesting

**Parallel Opportunities**: T022 [P] (permission class independent), T023-T024 [P] (serializer and view can be built together)

**Dependencies**: WP03 (organisation creation must work first)

**Prompt**: [tasks/for_review/WP04-member-invitation-roles.md](tasks/for_review/WP04-member-invitation-roles.md) ✅ **Completed, Awaiting Review**

---

### WP05: Membership Management API (User Story 3)

**Goal**: Implement role change and member removal endpoints with last-admin protection.

**Priority**: P3

**Independent Test**: Admin can PATCH membership role, admin can DELETE membership, system prevents removing/downgrading last admin.

**Success Criteria**:
- PATCH /api/organisations/{id}/members/{user_id}/ changes role
- DELETE /api/organisations/{id}/members/{user_id}/ removes membership
- System counts remaining admins before removal/demotion
- Returns 409 Conflict if action would leave org without admins
- Audit log records role changes and removals
- Non-admin users cannot change roles or remove members

**Risks**:
- Race conditions on last-admin check (use select_for_update or database-level check)
- Self-removal edge cases

**Subtasks**:

- [x] **T028**: Implement `get_admin_count()` helper method on Organisation model to count active admin memberships
- [x] **T029**: Add validation in MembershipViewSet.update() to check admin count before role downgrade
- [x] **T030**: Add validation in MembershipViewSet.destroy() to check admin count before deletion
- [x] **T031**: Implement business rule: prevent self-removal if user is last admin
- [x] **T032**: Add audit logging hooks on role change and membership deletion using Django signals

**Implementation Sketch**:
1. Add method to Organisation: `self.memberships.filter(role='admin', is_active=True).count()`
2. In update, if changing role from admin to member, check admin_count > 1
3. In destroy, if user being removed is admin, check admin_count > 1
4. Raise ValidationError with 409 response if would remove last admin
5. Connect signals (post_save, post_delete) to audit logging if B09 available

**Parallel Opportunities**: T028 [P] (model method), T029-T031 (validation logic sequential), T032 [P] (signals separate)

**Dependencies**: WP04 (membership creation must work first)

**Prompt**: [tasks/for_review/WP05-membership-management-api.md](tasks/for_review/WP05-membership-management-api.md) ✅ **Completed, Awaiting Review**

---

### WP06: Organisation Viewing & Profile Updates (User Stories 4-5)

**Goal**: Implement list endpoint for user's organisations, detail updates for admins, and context switching support.

**Priority**: P4-P5 (lower priority user stories)

**Independent Test**: GET /api/organisations/ returns user's orgs with roles, PATCH updates org details (admin only), list includes member counts.

**Success Criteria**:
- GET /api/organisations/ filters to user's memberships only
- Response includes user's role in each org
- PATCH /api/organisations/{id}/ allows admin to update name, description
- Name validation enforced on update (unique, length, pattern)
- List endpoint uses pagination (20 per page)
- Performance: uses select_related to avoid N+1 queries

**Risks**:
- N+1 queries on organisation list with member counts
- Name uniqueness conflicts on update

**Subtasks**:

- [x] **T033**: Implement get_queryset() override in OrganisationViewSet to filter by user's memberships
- [x] **T034**: Add optimisation: use select_related('creator') and prefetch_related('memberships') to prevent N+1
- [x] **T035**: Implement partial_update in viewset with admin permission check
- [x] **T036**: Add pagination configuration (PageNumberPagination, page_size=20)
- [x] **T037**: Create OrganisationListSerializer with minimal fields (id, name, slug, member_count, user_role)
- [x] **T038**: Update viewset to use different serializers for list vs detail (get_serializer_class)

**Implementation Sketch**:
1. Override get_queryset to filter organisations where user has membership
2. Use select_related and prefetch_related for related data
3. Require IsOrganisationAdmin permission for update/partial_update actions
4. Configure pagination in settings or viewset
5. Create lighter serializer for list view
6. Return appropriate serializer based on action

**Parallel Opportunities**: T033-T034 [P] (query optimization), T035-T036 [P] (permissions and pagination), T037-T038 [P] (serializers)

**Dependencies**: WP03 (organisation API must exist)

**Prompt**: [tasks/for_review/WP06-organisation-viewing-updates.md](tasks/for_review/WP06-organisation-viewing-updates.md) ✅ **Completed, Awaiting Review**

---

## Phase 4: Operational Features

### WP07: Rate Limiting & Observability

**Goal**: Implement Redis-backed rate limiting for org creation and invitations, expose Prometheus metrics for monitoring.

**Priority**: Critical (required for production readiness)

**Independent Test**: Creating 6 orgs in 24 hours returns 429. Sending 21 invites in 1 hour returns 429. /metrics endpoint returns Prometheus format data.

**Success Criteria**:
- Rate limit enforcer checks Redis cache before allowing org creation (5/day per user)
- Rate limit enforcer checks Redis cache before allowing member invitation (20/hour per org)
- 429 Too Many Requests returned with Retry-After header
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) included in responses
- Prometheus metrics exposed at /metrics endpoint
- Custom metrics track: org count, membership count, creation rate, invitation rate, role change rate, rate limit hits
- Metrics updated via Django signals on model changes

**Risks**:
- Redis unavailability breaks rate limiting (fallback behavior needed)
- Metrics performance overhead on high-traffic endpoints

**Subtasks**:

- [x] **T039**: Create rate limiting utility in `organisations/ratelimit.py` with `check_rate_limit(key, limit, window)` function using cache.incr()
- [x] **T040**: Add rate limit check to OrganisationViewSet.create() before org creation (5 per user per day)
- [x] **T041**: Add rate limit check to MembershipViewSet.create() before invitation (20 per org per hour)
- [x] **T042**: Implement rate limit response with 429 status, Retry-After header, and descriptive error message
- [x] **T043**: Create `organisations/metrics.py` with Prometheus gauges and counters using prometheus_client
- [x] **T044**: Create `organisations/signals.py` to connect Django signals (post_save, post_delete) to metric updates
- [x] **T045**: Verify /metrics endpoint exposes custom organisation metrics in Prometheus format

**Implementation Sketch**:
1. Create function that uses cache.add() for first hit (with TTL), cache.incr() for subsequent
2. Return (allowed: bool, remaining: int, reset_time: timestamp)
3. In viewset create methods, call rate limiter before perform_create
4. If not allowed, raise APIException with 429 status
5. Define Gauge for counts, Counter for events, Histogram for latency
6. Connect signals to increment/decrement metrics
7. Test /metrics endpoint returns text/plain prometheus format

**Parallel Opportunities**: T039-T042 [P] (rate limiting), T043-T045 [P] (metrics), both can be developed in parallel

**Dependencies**: WP02 (models exist), WP03-WP04 (API endpoints exist)

**Prompt**: [tasks/planned/WP07-rate-limiting-observability.md](tasks/planned/WP07-rate-limiting-observability.md)

---

## Phase 5: Administration & Cleanup

### WP08: Django Admin & Soft-Delete Management

**Goal**: Configure Django admin interface for superadmin management, implement management command for cleanup.

**Priority**: Medium (operational convenience, not user-facing)

**Independent Test**: Superadmin can view/edit orgs in admin, soft-deleted orgs are visually distinct, cleanup command removes orgs older than 30 days.

**Success Criteria**:
- Organisation and Membership registered in Django admin
- Admin interface shows is_active status and deleted_at timestamp
- Admin list filters for active/deleted organisations
- Soft-deleted organisations marked visually (colored, icon, etc.)
- Management command `cleanup_deleted_organisations` removes orgs where deleted_at < 30 days ago
- Command has --dry-run flag for safety
- Cleanup logs deletions for audit trail

**Risks**:
- Accidental hard-deletion by superadmin
- Cleanup command bugs causing data loss

**Subtasks**:

- [x] **T046**: Register Organisation and Membership in `organisations/admin.py` with ModelAdmin configurations
- [x] **T047**: Add list_display, list_filter, search_fields for admin usability
- [x] **T048**: Add custom admin action "Restore soft-deleted organisation" for superadmins
- [x] **T049**: Create management command `src/organisations/management/commands/cleanup_deleted_organisations.py`
- [x] **T050**: Implement cleanup logic: query orgs with `deleted_at < now() - 30 days`, call hard_delete()
- [x] **T051**: Add --dry-run and --days flags to command for flexibility and safety

**Implementation Sketch**:
1. Create OrganisationAdmin and MembershipAdmin classes
2. Configure list display with key fields
3. Add list filters for is_active, created_at, role
4. Create custom admin action that sets is_active=True, deleted_at=None
5. Use Django's BaseCommand class for management command
6. Add arguments with argparse (dry-run, days)
7. Query, iterate, delete with logging

**Parallel Opportunities**: T046-T048 [P] (admin config), T049-T051 [P] (management command), both independent

**Dependencies**: WP02 (models exist)

**Prompt**: [tasks/planned/WP08-django-admin-cleanup.md](tasks/planned/WP08-django-admin-cleanup.md)

---

## Implementation Order Recommendation

1. **Sprint 1 (Week 1)**: WP01 → WP02 → Start WP03
   - Foundation and models are critical path
   - Get basic org creation working

2. **Sprint 2 (Week 2)**: Complete WP03 → WP04 → WP07
   - Finish User Story 1
   - Add User Story 2 (invitations)
   - Add rate limiting and metrics (critical for production)

3. **Sprint 3 (Week 3)**: WP05 → WP06 → WP08
   - Complete User Stories 3-5
   - Add admin interface and cleanup
   - System is feature-complete

4. **Sprint 4 (Week 4)**: Testing, documentation, polish
   - Integration tests for critical flows
   - Update documentation
   - Performance testing
   - Security review

## MVP Scope

**Minimum Viable Product** = WP01 + WP02 + WP03 + WP04 (partial)

This delivers:
- Organisation creation with automatic admin assignment (US1)
- Basic member invitation (US2)
- Foundation for all other features

Estimated: 1 week for experienced Django developer

## Parallelization Strategy

**Can be done simultaneously**:
- WP07 (rate limiting/metrics) + WP03-WP06 (APIs) - different concerns
- WP08 (admin) + any API work - separate interfaces
- Within each WP, look for [P] markers on subtasks

**Must be sequential**:
- WP01 before everything (foundation)
- WP02 before all user stories (models required)
- WP03 before WP04 before WP05 (build up complexity)

## Next Steps

1. Review this task breakdown for completeness
2. Adjust work package scope if needed based on team capacity
3. Begin with `/spec-kitty.implement WP01` to start implementation
4. Use prompts in `tasks/planned/` directory for detailed guidance per work package
