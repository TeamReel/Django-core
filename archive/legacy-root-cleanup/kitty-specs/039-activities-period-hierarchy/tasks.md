# Implementation Tasks: Activities & Period Hierarchy

**Feature**: 039-activities-period-hierarchy
**Branch**: 039-activities-period-hierarchy
**Date**: 2026-01-05
**Total Work Packages**: 6
**Total Subtasks**: 24
**MVP Scope**: WP01 (Setup), WP02 (Period API)

## Overview

This document breaks down the implementation of B30 Activities & Period Hierarchy into discrete, executable work packages. Each work package is self-contained with clear success criteria and can be implemented independently where dependencies allow.

**Implementation Strategy**: Sequential phases with parallel opportunities within each phase.
**Phase 0 (Blocking)**: WP01 - Foundation models and migrations
**Phase 1 (P1)**: WP02, WP03, WP04 - Core API endpoints [Parallel after WP01]
**Phase 2 (P2)**: WP05 - Admin and search integration
**Phase 3 (P3)**: WP06 - Documentation finalization

---

## Work Package Index

- [X] [WP01 - Setup & Foundation](#wp01---setup--foundation) (Blocking, 7 subtasks) ✅ **DONE**
- [X] [WP02 - Period Hierarchy API](#wp02---period-hierarchy-api) (P1, 5 subtasks) ✅ **DONE**
- [X] [WP03 - Activity Scheduling API](#wp03---activity-scheduling-api) (P1, 4 subtasks) ✅ **DONE**
- [X] [WP04 - Participation Tracking API](#wp04---participation-tracking-api) (P1-P2, 4 subtasks) ✅ **DONE**
- [X] [WP05 - Admin & Search Integration](#wp05---admin--search-integration) (P2, 2 subtasks) ✅ **DONE**
- [X] [WP06 - Documentation & Finalization](#wp06---documentation--finalization) (P3, 3 subtasks) ✅ **DONE**

---

## WP01 - Setup & Foundation

**Priority**: P0 (Blocking)
**Estimated Effort**: 4 hours
**Dependencies**: None
**Blocks**: WP02, WP03, WP04
**Status**: ✅ **DONE** (Reviewed and approved 2026-01-06)
**Prompt File**: [tasks/done/WP01-setup-foundation.md](tasks/done/WP01-setup-foundation.md)

### Summary

Create Django app structure with 3 core models (Period, Activity, Participation) and database migrations. Implement custom QuerySet manager for Period with PostgreSQL recursive CTE support. This work package establishes the data layer foundation required by all subsequent API work.

**Success Criteria**:
- [x] Django app `src/activities/` created with standard structure
- [x] Period model with self-referential parent_period FK and CHECK constraint (end_date > start_date)
- [x] Activity model with timezone-aware datetime fields
- [x] Participation model with CHECK constraint enforcing (activity_id XOR period_id)
- [x] PeriodQuerySet with get_descendants() using PostgreSQL `WITH RECURSIVE`
- [x] Initial migration file generated and idempotent
- [x] App added to INSTALLED_APPS

**Independent Test**: Run `python manage.py migrate activities` successfully. Query `Period.objects.get_descendants()` on a 3-level hierarchy and verify all descendants returned.

### Included Subtasks

- [ ] **T001**: Create Django app structure (src/activities/, apps.py, __init__.py)
- [ ] **T002**: Define Period model with self-referential FK, constraints (end_date > start_date), indexes (organisation_id, project_id, parent_period_id)
- [ ] **T003**: Define Activity model with project/period FKs, timezone-aware start_time/end_time, JSONField data, indexes (project_id, period_id, start_time)
- [ ] **T004**: Define Participation model with activity/period FKs, CHECK constraint (activity_id IS NOT NULL XOR period_id IS NOT NULL), status enum
- [ ] **T005**: Create PeriodQuerySet manager class with CTE methods: get_descendants() (recursive), get_ancestors() (iterative), get_siblings(), get_depth(), is_root()
- [ ] **T006**: Generate initial migration for 3 models with all constraints, indexes, and default values
- [ ] **T020**: Add 'activities' to INSTALLED_APPS in src/config/settings/base.py

### Implementation Sketch

1. Run `python manage.py startapp activities src/activities/` to scaffold app structure
2. Define models in src/activities/models.py:
   - Period: UUID PK, organisation FK, optional project FK, optional parent_period self-FK, name (CharField 200), description (TextField), start_date/end_date (DateField), data (JSONField), timestamps
   - Activity: UUID PK, project FK, period FK, title, activity_type (CharField), start_time/end_time (DateTimeField with timezone), location, description, data (JSONField), timestamps
   - Participation: UUID PK, activity FK (nullable), period FK (nullable), member FK, role (CharField), status (CharField choices), notes, data (JSONField), timestamps, unique_together constraints
3. Add Meta.constraints to Participation for CHECK ((activity_id IS NOT NULL)::int + (period_id IS NOT NULL)::int = 1)
4. Create src/activities/managers.py with PeriodQuerySet:
   - get_descendants(): Use raw SQL WITH RECURSIVE CTE or Django 4.2+ CTE support
   - get_ancestors(): Iterative query climbing parent_period chain
   - Attach to Period.objects manager
5. Run `python manage.py makemigrations activities`
6. Update INSTALLED_APPS
7. Run `python manage.py migrate` in test environment to validate

### Parallel Opportunities

None (blocking work package - all subsequent work depends on this)

### Risks & Dependencies

**Risk**: PostgreSQL recursive CTE syntax may differ across versions
**Mitigation**: Test on PostgreSQL 9.4, 12, 14. Use Django's database features check.

**Dependency**: Requires B06 (organisations), B07 (projects), B05 (accounts) models available
**Status**: Pre-existing modules, no action needed

---

## WP02 - Period Hierarchy API

**Priority**: P1 (User Story 1)
**Estimated Effort**: 5 hours
**Dependencies**: WP01
**Blocks**: WP03, WP04
**Status**: ✅ **DONE** (Reviewed and approved 2026-01-06)
**Prompt File**: [tasks/done/WP02-period-hierarchy-api.md](tasks/done/WP02-period-hierarchy-api.md)

### Summary

Implement REST API for period CRUD operations with tree navigation endpoints. Integrate B08 permissions (manage_periods) and B09 audit logging. Enable creating multi-level period hierarchies via API with validation for date ranges, parent-child organisation matching, and deletion prevention when children exist.

**Success Criteria**:
- [x] GET /api/v1/periods/ lists periods with filtering (organisation_id, project_id, parent_id=null for roots)
- [x] POST /api/v1/periods/ creates period with validation (end_date > start_date, child org matches parent)
- [x] GET /api/v1/periods/{id}/children/ returns direct children
- [x] GET /api/v1/periods/{id}/descendants/ returns all descendants via CTE
- [x] DELETE /api/v1/periods/{id}/ prevents deletion if children exist (HTTP 400 with error message)
- [x] Permission checks: organisation.manage_periods for org-wide, project.manage_periods for project-scoped
- [x] B09 audit events emitted for create/update/delete

**Independent Test**: Via API, create root period "Season 2023" → child "Fall 2023" → grandchild "November 2023". GET /periods/{season_id}/descendants/ returns 2 items. DELETE /periods/{season_id}/ returns 400 error with "Cannot delete period with 2 descendant periods."

### Included Subtasks

- [ ] **T008**: Create PeriodSerializer with nested organisation/project/parent_period representations, children_count annotation, activities_count annotation, validation for end_date > start_date
- [ ] **T011**: Create PeriodPermission class integrating B08: check organisation.manage_periods for org-wide periods, project.manage_periods for project-scoped, read-only for members
- [ ] **T012**: Create PeriodViewSet with CRUD actions, custom actions for /children/ (filter by parent_period=self) and /descendants/ (use get_descendants() manager method), override destroy() to check for children
- [ ] **T015**: Configure API URL routing in src/activities/api/urls.py and include in main urls.py at /api/v1/
- [ ] **T016**: Add signals in src/activities/signals.py to emit B09 audit events on Period post_save and post_delete (event_type: period.created, period.updated, period.deleted)

### Implementation Sketch

1. Create src/activities/api/serializers.py with PeriodSerializer:
   - Nested read-only fields for organisation (id, name), project (id, name), parent_period (id, name)
   - Write fields: organisation_id, project_id, parent_period_id, name, description, start_date, end_date, data
   - Annotate children_count (Count('children')) and activities_count (Count('activities'))
   - validate() method: ensure end_date > start_date, if parent_period set, verify organisation matches parent's organisation
2. Create src/activities/api/permissions.py with PeriodPermission:
   - Import B08 permission checker (e.g., has_permission(user, 'organisation.manage_periods', obj.organisation))
   - has_permission(): Allow read for any org member, write for manage_periods holders
   - has_object_permission(): Check project-level permissions if period.project is set
3. Create src/activities/api/views.py with PeriodViewSet:
   - queryset = Period.objects.select_related('organisation', 'project', 'parent_period').annotate(children_count=Count('children'), activities_count=Count('activities'))
   - filter_queryset(): Support ?organisation_id=, ?project_id=, ?parent_id= (including parent_id=null)
   - @action(detail=True, methods=['get']) def children(): return self.get_object().children.all()
   - @action(detail=True, methods=['get']) def descendants(): return self.get_object().get_descendants()
   - destroy(): Check if self.get_object().children.exists(), if yes, raise ValidationError("Cannot delete period with N child periods")
4. Create src/activities/api/urls.py with router.register('periods', PeriodViewSet)
5. Include in main urls.py
6. Create src/activities/signals.py:
   - @receiver(post_save, sender=Period): emit B09 event with actor=request.user, target=period, changes=diff
   - @receiver(post_delete, sender=Period): emit B09 deletion event

### Parallel Opportunities

Can be developed in parallel with WP03 and WP04 (different models/endpoints)

### Risks & Dependencies

**Risk**: B08 permission names may not exist yet
**Mitigation**: Document required permissions in Constitution Check. If missing, add to B08 seeding script.

**Risk**: B09 audit API signature unknown
**Mitigation**: Reference existing B09 integration patterns in Core. Use fallback Django logger if B09 unavailable.

---

## WP03 - Activity Scheduling API

**Priority**: P1 (User Story 3)
**Estimated Effort**: 4 hours
**Dependencies**: WP01, WP02 (Period model must exist)
**Blocks**: WP04
**Status**: ✅ **DONE** (Reviewed and approved 2026-01-06)
**Prompt File**: [tasks/done/WP03-activity-scheduling-api.md](tasks/done/WP03-activity-scheduling-api.md)

### Summary

Implement REST API for activity CRUD operations with calendar filtering support. Enable scheduling activities within periods with timezone-aware datetime handling, flexible activity_type field, and JSON outcome data storage. Integrate B08 project.manage_activities permission and B09 audit logging.

**Success Criteria**:
- [x] GET /api/v1/activities/ lists activities with filtering (period_id, include_descendants=true, activity_type, start_time__gte/lte)
- [x] POST /api/v1/activities/ creates activity with timezone validation, links to project and period
- [x] PUT /api/v1/activities/{id}/ updates activity including outcome data (JSONField)
- [x] GET /api/v1/activities/{id}/participants/ returns participants for activity (via Participation model)
- [x] Permission checks: project.manage_activities required for mutations, read-only for project members
- [x] B09 audit events emitted for create/update/delete
- [x] Soft warning if activity start_time not within period date range (validation warning, not error)

**Independent Test**: Via API, create activity "Match vs Feyenoord" in period "December 2023" with start_time "2023-12-15T14:30:00Z". GET /activities/?period_id={dec_id}&include_descendants=false returns 1 item. Update activity with data={"score_home": 3, "score_away": 1}. Verify outcome persists.

### Included Subtasks

- [ ] **T009**: Create ActivitySerializer with nested project/period representations, validation for end_time > start_time, timezone enforcement, soft warning if start_time not in period.start_date to period.end_date range. Warning mechanism: Add `warnings` array to serializer response: `{"warnings": ["Activity start_time 2023-12-15 is outside period date range 2024-01-01 to 2024-06-30"]}`. Warning does not prevent save, only informs user.
- [ ] **T013**: Create ActivityViewSet with CRUD actions, filter_queryset() supporting ?period_id=, ?include_descendants=true (use period.get_descendants()), ?activity_type=, ?start_time__gte=, ?start_time__lte=, custom action /participants/ returning Participation records
- [ ] **T015**: Add activity routes to API URL configuration (already partially done in WP02, extend here)
- [ ] **T017**: Add signals to emit B09 audit events on Activity post_save and post_delete (event_type: activity.created, activity.updated, activity.deleted)

### Implementation Sketch

1. Create ActivitySerializer in src/activities/api/serializers.py:
   - Nested read-only: project (id, name), period (id, name, start_date, end_date)
   - Write fields: project_id, period_id, title, activity_type, start_time, end_time, location, description, data
   - validate(): Check end_time > start_time, if start_time not in [period.start_date, period.end_date], add non-field warning (not error)
   - Use DateTimeField with timezone enforcement
2. Create ActivityViewSet in src/activities/api/views.py:
   - queryset = Activity.objects.select_related('project', 'period').prefetch_related('participations__member')
   - permission_classes = [ActivityPermission] (inherits from BasePermission, checks project.manage_activities)
   - filter_queryset():
     - If ?period_id= + ?include_descendants=true: fetch period.get_descendants(), filter activity__period_id__in=[period_id] + descendants
     - If ?activity_type=: filter activity_type=value
     - If ?start_time__gte= or ?start_time__lte=: filter start_time range
   - @action(detail=True, methods=['get']) def participants(): return Participation.objects.filter(activity=self.get_object())
3. Update src/activities/api/urls.py: router.register('activities', ActivityViewSet)
4. Add Activity signal handlers in src/activities/signals.py (mirror Period pattern)

### Parallel Opportunities

Can be developed in parallel with WP04 (Participation API uses different endpoints)

### Risks & Dependencies

**Risk**: Timezone handling may be inconsistent across timezones
**Mitigation**: Use Django's timezone utilities, enforce UTC storage, display in user timezone (from B12 preferences)

**Risk**: include_descendants filter may cause N+1 queries
**Mitigation**: Use prefetch_related and values_list('id', flat=True) for descendant IDs

---

## WP04 - Participation Tracking API

**Priority**: P1-P2 (User Stories 2, 4)
**Estimated Effort**: 4 hours
**Dependencies**: WP01, WP02 (Period), WP03 (Activity)
**Blocks**: None
**Status**: ✅ **DONE** (Reviewed and approved 2026-01-06)
**Prompt File**: [tasks/done/WP04-participation-tracking-api.md](tasks/done/WP04-participation-tracking-api.md)

### Summary

Implement REST API for participation CRUD operations enabling dual-level tracking (period squads + activity lineups). Enforce CHECK constraint validation (activity XOR period) at serializer level. Support filtering by member, period, activity, role, and status. Integrate B08 permissions and B09 audit logging.

**Success Criteria**:
- [x] GET /api/v1/participations/ lists participations with filtering (member_id, period_id, activity_id, role, status)
- [x] POST /api/v1/participations/ creates participation with validation: exactly one of (activity_id, period_id) set
- [x] PUT /api/v1/participations/{id}/ updates role, status, notes, data fields
- [x] DELETE /api/v1/participations/{id}/ removes participation (soft delete not required)
- [x] Permission checks: project.manage_activities for mutations
- [x] B09 audit events emitted
- [x] Serializer raises ValidationError if both activity_id and period_id set or both null

**Independent Test**: Via API, create period participation (period_id set, activity_id null) for member with role="squad_member". Create activity participation (activity_id set, period_id null) for same member with role="starter". Attempt to create participation with both IDs set → expect 400 error.

### Included Subtasks

- [ ] **T010**: Create ParticipationSerializer with nested member/activity/period representations, validation enforcing (activity_id XOR period_id), status choices (confirmed/tentative/declined/no_response), role as flexible CharField. Note: Participation.data JSONField has no schema validation by default (flexible for product-specific metadata). Products can add validation via `def validate_data(self, value):` in custom serializer if strict structure needed (e.g., JSONSchema validation for jersey_number integer, position enum).
- [ ] **T014**: Create ParticipationViewSet with CRUD actions, filter_queryset() supporting ?member_id=, ?period_id=, ?activity_id=, ?role=, ?status=, permission checks via project.manage_activities
- [ ] **T015**: Add participation routes to API URL configuration (completes all 3 resource routes)
- [ ] **T018**: Add signals to emit B09 audit events on Participation post_save and post_delete (event_type: participation.created, participation.updated, participation.deleted)

### Implementation Sketch

1. Create ParticipationSerializer in src/activities/api/serializers.py:
   - Nested read-only: member (id, name), activity (id, title), period (id, name)
   - Write fields: member_id, activity_id, period_id, role, status, notes, data
   - validate(): Check (activity_id is not None) XOR (period_id is not None), raise ValidationError if both set or both null
   - status: ChoiceField with ['confirmed', 'tentative', 'declined', 'no_response']
2. Create ParticipationViewSet in src/activities/api/views.py:
   - queryset = Participation.objects.select_related('member', 'activity', 'period')
   - permission_classes = [ParticipationPermission] (checks project.manage_activities on activity.project or period.project)
   - filter_queryset(): Support ?member_id=, ?period_id=, ?activity_id=, ?role=, ?status=
3. Update src/activities/api/urls.py: router.register('participations', ParticipationViewSet)
4. Add Participation signal handlers in src/activities/signals.py

### Parallel Opportunities

None (depends on WP02 and WP03 models)

### Risks & Dependencies

**Risk**: CHECK constraint at database level may not match serializer validation
**Mitigation**: Migration must include CHECK constraint mirroring serializer logic. Test both layers.

**Risk**: Member FK may reference wrong model (B06 Membership vs B05 User)
**Mitigation**: Verify spec: Participation.member → Membership (organisation membership, not User)

---

## WP05 - Admin & Search Integration

**Priority**: P2
**Estimated Effort**: 2 hours
**Dependencies**: WP01 (models exist)
**Blocks**: None
**Status**: ✅ **DONE** (Reviewed and approved 2026-01-06)
**Prompt File**: [tasks/done/WP05-admin-search-integration.md](tasks/done/WP05-admin-search-integration.md)

### Summary

Configure Django admin interface for Period, Activity, Participation models with inline editing and filtering. Register models with B14 Full-Text Search for search functionality. Admin interface provides fallback UI for staff users; search enables finding periods and activities by text.

**Success Criteria**:
- [x] Period admin: list display (name, organisation, project, start_date, end_date, parent_period), filters (organisation, project, has parent), search (name, description), inline children display
- [x] Activity admin: list display (title, project, period, activity_type, start_time), filters (project, period, activity_type), search (title, location, description)
- [x] Participation admin: list display (member, activity, period, role, status), filters (role, status), inline on Activity admin
- [x] B14 search registration: Period indexed on (name, description), Activity indexed on (title, description, location)

**Independent Test**: Access /admin/activities/ as staff user. Create period via admin UI. Search for "Seizoen" in admin search bar → period appears. Use B14 search API endpoint to search "match" → activities with activity_type=match appear.

### Included Subtasks

- [ ] **T007**: Configure Django admin for Period (list_display, list_filter, search_fields, inlines for children), Activity (list_display, list_filter, search_fields, inlines for participants), Participation (list_display, list_filter, search_fields)
- [ ] **T019**: Register Period and Activity with B14 Full-Text Search module (search_fields configuration: Period [name, description], Activity [title, description, location, activity_type])

### Implementation Sketch

1. Create src/activities/admin.py:
   ```python
   from django.contrib import admin
   from .models import Period, Activity, Participation

   class PeriodAdmin(admin.ModelAdmin):
       list_display = ['name', 'organisation', 'project', 'parent_period', 'start_date', 'end_date']
       list_filter = ['organisation', 'project', 'start_date']
       search_fields = ['name', 'description']
       inlines = []  # Optional: ChildPeriodInline if useful

   class ParticipationInline(admin.TabularInline):
       model = Participation
       extra = 0
       fields = ['member', 'role', 'status', 'notes']

   class ActivityAdmin(admin.ModelAdmin):
       list_display = ['title', 'project', 'period', 'activity_type', 'start_time', 'end_time']
       list_filter = ['project', 'activity_type', 'start_time']
       search_fields = ['title', 'description', 'location']
       inlines = [ParticipationInline]

   class ParticipationAdmin(admin.ModelAdmin):
       list_display = ['member', 'activity', 'period', 'role', 'status']
       list_filter = ['role', 'status']
       search_fields = ['member__user__username', 'notes']

   admin.site.register(Period, PeriodAdmin)
   admin.site.register(Activity, ActivityAdmin)
   admin.site.register(Participation, ParticipationAdmin)
   ```

2. Create src/activities/search.py:
   ```python
   from search.registry import register_search  # B14 API
   from .models import Period, Activity

   register_search(Period, fields=['name', 'description'])
   register_search(Activity, fields=['title', 'description', 'location', 'activity_type'])
   ```

3. Verify B14 search registration: Check if B14 uses AppConfig.ready() hook or explicit import. If explicit, add `import activities.search` to apps.py ready() method.

### Parallel Opportunities

Can be developed in parallel with WP02, WP03, WP04 (no API dependencies)

### Risks & Dependencies

**Risk**: B14 API may differ from assumed register_search() function
**Mitigation**: Review B14 documentation/code in Core. Adjust to actual API (may be class-based registry, signal-based, or decorator pattern).

---

## WP06 - Documentation & Finalization

**Priority**: P3
**Estimated Effort**: 4 hours
**Dependencies**: WP01, WP02, WP03, WP04, WP05 (all implementation complete)
**Blocks**: None
**Status**: ✅ **DONE** (Reviewed and approved 2026-01-06)
**Prompt File**: [tasks/done/WP06-documentation-finalization.md](tasks/done/WP06-documentation-finalization.md)

### Summary

Create developer documentation per Constitution Article XI requirements and demo page per Constitution Section 7.2 (Demo-First Development). Write src/activities/README.md explaining module purpose, key components, public interfaces, integration examples, and extension points. Create ADR documenting unlimited-depth tree design decision. Update extending-core.md guide with activities module patterns. Build functional demo page with realistic UI components.

**Success Criteria**:
- [x] src/activities/README.md exists with sections: Purpose, Scope, Key Components, Public Interface, Integration Example, Related Modules, Extension Points
- [x] ADR 012-period-hierarchy-design.md exists in documents/03-system/architecture-decisions/ documenting CTE vs materialized path vs library choice
- [x] documents/06-workflow/extending-core.md updated with section "Extending Activities Module" covering custom activity types, roles, outcome data structures, and product-specific validation
- [x] Demo page examples/demo-shell/activities/ exists with period tree, calendar views, and participation forms using F01 design system

**Independent Test**: New developer reads src/activities/README.md and successfully understands how to: 1) Create a period hierarchy, 2) Schedule an activity, 3) Add outcome data to activity.data JSONField. ADR clearly explains why recursive CTE chosen over alternatives.

### Included Subtasks

- [ ] **T021**: Create src/activities/README.md with comprehensive module documentation (Purpose: Generic time-based resource planning; Scope: Periods, activities, participation; Key Components: Period CTE manager, Activity scheduling, Participation dual-level tracking; Public Interface: REST API endpoints, model methods; Integration Example: Create 3-level hierarchy, schedule activity, add participants; Related Modules: B05, B06, B07, B08, B09, B14; Extension Points: activity_type, role, status, data JSONField)
- [ ] **T022**: Create documents/03-system/architecture-decisions/012-period-hierarchy-design.md (Status: Accepted; Context: Need hierarchical time periods with flexible depth; Decision: PostgreSQL recursive CTE with custom QuerySet; Alternatives Considered: django-treebeard MPTT, fixed-depth models, materialized path; Consequences: Zero dependencies, optimal performance <10 levels, PostgreSQL-only)
- [ ] **T023**: Update documents/06-workflow/extending-core.md with new section "Extending Activities Module" (Custom activity types: Add product-specific types via serializer validation; Custom roles: Define role vocabularies in product layer; Outcome data patterns: Examples for sports (goals, cards), business (meeting decisions), education (attendance); Custom validation: Override serializer validate() methods for business rules)
- [ ] **T024**: Create demo page examples/demo-shell/activities/ with visual components: 1) Period tree navigator component with expand/collapse controls, 2) Activity calendar view (monthly/weekly toggle) with color-coded activity types, 3) Participation management forms (add members to period, build activity lineup). Use realistic seed data from spec User Story scenarios (football season example). Ensure demo uses F01 design system components and connects to real backend API endpoints.

### Implementation Sketch

1. Create src/activities/README.md using template from Constitution Article XI:
   - Purpose: 2-3 sentences on why activities module exists
   - Scope: What's in scope (periods, activities, participation) and out of scope (product-specific workflows, UI)
   - Key Components: Period model (unlimited-depth tree), Activity model (timezone-aware scheduling), Participation model (dual-level tracking), PeriodQuerySet (recursive CTE methods)
   - Public Interface: List REST API endpoints, key model methods (get_descendants(), get_ancestors()), signals emitted
   - Integration Example: Code snippet showing create period → schedule activity → add participants workflow
   - Related Modules: B05 (auth), B06 (orgs), B07 (projects), B08 (permissions), B09 (audit), B14 (search)
   - Extension Points: activity_type, role, status (string fields for product flexibility), data JSONField (domain-specific attributes)

2. Create documents/03-system/architecture-decisions/012-period-hierarchy-design.md:
   - Use ADR template (Status, Context, Decision, Alternatives, Consequences)
   - Context: Need flexible period hierarchy for diverse products (sports seasons, fiscal quarters, project sprints)
   - Decision: Self-referential FK with PostgreSQL recursive CTE queries via custom QuerySet
   - Alternatives: django-treebeard MPTT (rejected: external dependency), Fixed 3-level models (rejected: inflexible), Materialized path (rejected: complexity for reads)
   - Consequences: (+) Zero dependencies, (+) Optimal read performance, (+) Unlimited depth, (-) PostgreSQL-only, (-) CTE complexity for maintainers

3. Update documents/06-workflow/extending-core.md:
   - Add section after existing content: "## Extending the Activities Module"
   - Custom activity types: Products can use any string for activity_type; recommend defining vocabulary in product serializer
   - Custom roles: period_role and activity_role are flexible strings; products can enforce enum via choices
   - Outcome data patterns:
     * Sports: `{"score_home": 3, "score_away": 1, "goals": [{"player": "...", "minute": 23}]}`
     * Business: `{"decisions": ["Action item 1"], "attendees": ["user_id_1"]}`
     * Education: `{"attendance": ["student_id_1"], "homework_assigned": true}`
   - Custom validation: Override ActivitySerializer.validate() to add product-specific rules (e.g., require outcome data for completed activities)

4. Create examples/demo-shell/activities/ demo page:
   - Create activities-demo.tsx with three sections:
     * Period Tree Navigator: Expandable tree component showing 3-level hierarchy (Season 2023/2024 → Fall Competition → December 2023), uses F01 Tree component
     * Activity Calendar: Monthly/weekly toggle view with color-coded activity cards (matches=blue, training=green, meetings=gray), filters by period and activity type
     * Participation Manager: Tabbed interface (Period Squad / Activity Lineup) with drag-drop member selection, role badges, status indicators
   - Connect to real API endpoints (/api/v1/periods/, /api/v1/activities/, /api/v1/participations/)
   - Use seed data from spec: Football club scenario with 25 players, season hierarchy, scheduled matches
   - Implement responsive design (mobile: stacked views, desktop: side-by-side layout)

### Parallel Opportunities

None (requires all implementation complete to document accurately)

### Risks & Dependencies

**Risk**: Documentation may drift from implementation over time
**Mitigation**: Include documentation review in PR checklist. Use concrete code examples that can be tested.

---

## Implementation Notes

### Parallelization Strategy

```
Phase 0 (Blocking):
  WP01 ────────────┐
                   │
Phase 1 (Parallel):│
  WP02 ────────────┤
  WP03 ────────────┤─── (All depend on WP01)
  WP04 ────────────┤
  WP05 ────────────┘

Phase 2 (Final):
  WP06 ──────────────── (Depends on all above)
```

**Optimal Sequence**:
1. Complete WP01 (blocking)
2. Parallelize WP02, WP03, WP05 (independent models/concerns)
3. Complete WP04 (depends on WP02, WP03)
4. Complete WP06 (documentation after all code done)

### Testing Strategy

**Per Work Package**: Each work package includes "Independent Test" description. Run these incrementally as work packages complete.

**Integration Test** (from spec User Story scenarios): After WP04 completion, run full workflow test:
1. Create 3-level period hierarchy (Season → Fall → November)
2. Add 25 members to Season period with roles
3. Schedule activity "Match vs Feyenoord" in November period
4. Add 11 participants to activity from period members
5. Update activity with outcome data (score, goals)
6. Query /periods/{season_id}/descendants/ → verify 2 descendants
7. Query /activities/?period_id={season_id}&include_descendants=true → verify activity appears

**Coverage Requirement** (from spec SC-008, SC-009): ≥90% for models/API, ≥85% for permissions

### Risk Management

**High Risk Items**:
1. PostgreSQL recursive CTE performance at depth >10 → Monitor query times, document soft warning threshold
2. B08 permission names may not exist → Coordinate with B08 maintainer or add to seeding script
3. B09/B14 integration APIs unknown → Review existing integrations, use fallback if unavailable

**Mitigation**:
- All high-risk items identified in work package "Risks & Dependencies" sections
- Test CTE performance early (WP01)
- Stub B08/B09/B14 integrations with fallback logging if modules unavailable

### MVP Scope

**Minimum Viable Product**: WP01 + WP02
**Rationale**: Core period hierarchy functionality with API. Enables creating and viewing nested periods, which is foundation for all other features.

**MVP Deliverable**: Users can create 3-level period hierarchy via API, navigate tree structure, and prevent accidental deletion of parent periods.

**Full Feature Delivery**: All 6 work packages
**Estimated Total Effort**: 23 hours (assuming no blocking issues)

---

## Appendix: Subtask Reference

| ID | Description | WP |
|----|-------------|----|
| T001 | Create Django app structure | WP01 |
| T002 | Define Period model | WP01 |
| T003 | Define Activity model | WP01 |
| T004 | Define Participation model | WP01 |
| T005 | Create PeriodQuerySet with CTE methods | WP01 |
| T006 | Generate initial migration | WP01 |
| T007 | Configure Django admin | WP05 |
| T008 | Create PeriodSerializer | WP02 |
| T009 | Create ActivitySerializer | WP03 |
| T010 | Create ParticipationSerializer | WP04 |
| T011 | Create permission classes (B08) | WP02 |
| T012 | Create PeriodViewSet | WP02 |
| T013 | Create ActivityViewSet | WP03 |
| T014 | Create ParticipationViewSet | WP04 |
| T015 | Configure API URL routing | WP02/WP03/WP04 |
| T016 | Add B09 audit signals for Period | WP02 |
| T017 | Add B09 audit signals for Activity | WP03 |
| T018 | Add B09 audit signals for Participation | WP04 |
| T019 | Register with B14 search | WP05 |
| T020 | Add to INSTALLED_APPS | WP01 |
| T021 | Create src/activities/README.md | WP06 |
| T022 | Create ADR 012 | WP06 |
| T023 | Update extending-core.md | WP06 |
| T024 | Create demo page examples/demo-shell/activities/ | WP06 |

---

*Document generated by /spec-kitty.tasks on 2026-01-05*
*Updated 2026-01-06: Fixed task ID collision (T007→T020), added clarifications for warnings/validation, added demo page task*
