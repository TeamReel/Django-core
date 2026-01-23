# Feature Specification: Activities & Period Hierarchy

**Feature Branch**: `039-activities-period-hierarchy`
**Created**: 2026-01-05
**Status**: Draft
**Input**: Generic event & resource planning with nestable time-bound cycles (periods) and activities.

## Clarifications

### Session 2026-01-05

- Q: Which deletion strategy should be the default behavior for periods with children? → A: Prevent deletion if children exist (require manual cleanup first, no cascade). Safe default aligning with Core philosophy.
- Q: When displaying activities in a parent period's calendar view, should activities from child periods appear? → A: Yes, always show inherited (parent sees all descendant activities automatically). Matches user mental model and existing spec behavior.
- Q: What is the recommended practical depth limit for period hierarchies? → A: 10 levels with soft warning (no hard constraint). Performance guaranteed up to 10 levels; warning shown at 11+ recommending flattening or materialized path for large datasets.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Period Hierarchy (Priority: P1)

Organisation admins and project managers structure time-bound cycles for planning and resource allocation. A football club creates a season hierarchy ("Seizoen 2023/2024" → "Najaarscompetitie" → "December 2023"). A business creates fiscal planning periods ("FY 2024" → "Q1 2024" → "January 2024").

**Why this priority**: Foundation for all other features. Without period structure, activities and participation cannot be organized.

**Independent Test**: Create a 3-level period hierarchy under an organisation or project. Verify tree navigation, breadcrumb display, and parent-child relationships persist correctly.

**Acceptance Scenarios**:

1. **Given** an organisation admin is logged in, **When** they create a new root period with name "Seizoen 2023/2024" and dates 2023-09-01 to 2024-06-30, **Then** the period appears in the period list with no parent
2. **Given** a root period "Seizoen 2023/2024" exists, **When** a project manager creates a child period "Najaarscompetitie" with parent set to the season, **Then** the child appears under the parent in tree view
3. **Given** a 2-level hierarchy exists, **When** user creates a third-level period "December 2023" under "Najaarscompetitie", **Then** the tree displays all 3 levels with correct indentation and breadcrumbs
4. **Given** a period hierarchy exists, **When** user navigates using breadcrumbs, **Then** they can jump to any ancestor period in one click
5. **Given** a period has child periods, **When** user attempts to delete the parent, **Then** system prompts for confirmation about cascading delete or prevents deletion
6. **Given** project-specific periods exist, **When** user switches to a different project, **Then** only periods for that project (plus org-wide periods) are visible

---

### User Story 2 - Assign Team Members to Period (Priority: P1)

Project managers build squads or teams for a time period. A football coach selects 25 players for the season squad with positions and jersey numbers. A project lead assigns 12 team members to Q1 sprint with roles and responsibilities.

**Why this priority**: Required before activities can be scheduled. Team composition drives activity participation.

**Independent Test**: Add participants to a period with roles and custom data. Verify member list displays correctly and persists role-specific metadata (jersey numbers, positions).

**Acceptance Scenarios**:

1. **Given** a period "Seizoen 2023/2024" exists with no members, **When** coach adds member "Speler 1" with role "squad_member" and data {jersey_number: 10, position: "striker"}, **Then** the member appears in the period's member list with metadata visible
2. **Given** a period has 5 members, **When** coach adds 20 more members in batch, **Then** all 25 members appear in the list sorted by jersey number or name
3. **Given** a member is assigned to a period, **When** coach updates their role from "squad_member" to "captain", **Then** the role change reflects immediately in the member list
4. **Given** a member belongs to a parent period, **When** user views a child period member list, **Then** they can optionally see inherited members from parent or filter to only direct members
5. **Given** a member is removed from parent period, **When** user views child period, **Then** inherited reference no longer appears unless explicitly added to child
6. **Given** organisation has 100 members, **When** adding participants to period, **Then** autocomplete search filters by active members in organisation

---

### User Story 3 - Schedule Activities in Periods (Priority: P1)

Project managers schedule events within time periods. A coach schedules a match "Ajax vs Feyenoord" in December 2023 period. A project lead schedules a sprint review meeting in Q1 2024.

**Why this priority**: Core value delivery—without activities, the period structure serves no purpose.

**Independent Test**: Create an activity in a period with type, time, location. Verify it appears in calendar view and links correctly to period hierarchy.

**Acceptance Scenarios**:

1. **Given** a period "December 2023" exists, **When** user creates activity "Ajax vs Feyenoord" with type "match", start_time "2023-12-15 14:30", location "Johan Cruijff Arena", **Then** activity appears in calendar on correct date
2. **Given** an activity exists in a child period, **When** user views parent period calendar, **Then** the activity is visible (inherited from child)
3. **Given** multiple activities exist, **When** user filters calendar by activity type "match", **Then** only match activities display
4. **Given** user is viewing weekly calendar, **When** they switch to monthly view, **Then** all activities for the month appear aggregated by date
5. **Given** activities span multiple periods, **When** user selects period filter, **Then** only activities in that period and its descendants display
6. **Given** user has permission to manage activities in project A, **When** they view project B calendar, **Then** they can view but not edit project B activities

---

### User Story 4 - Build Activity Lineups from Period Squad (Priority: P2)

Project managers select participants for specific activities from period members. A coach selects 11 starters and 7 substitutes for a match from the 25-player season squad. A meeting organizer invites 5 attendees from the 12-person Q1 team.

**Why this priority**: Enables efficient participant selection by inheriting from period membership, reducing duplicate data entry.

**Independent Test**: Add activity participants by selecting from period members. Verify role assignment (starter/substitute) and status tracking work independently from period membership.

**Acceptance Scenarios**:

1. **Given** activity "Ajax vs Feyenoord" exists in period with 25 squad members, **When** coach opens participant selection, **Then** autocomplete suggests all 25 period members
2. **Given** coach is adding activity participants, **When** they select "Speler 1" with role "starter", **Then** participant is added to activity with role separate from period role
3. **Given** activity has 11 starters, **When** coach adds 12th starter, **Then** system warns about exceeding typical lineup size (configurable threshold)
4. **Given** activity participant exists, **When** coach updates status to "declined", **Then** status updates without affecting period membership
5. **Given** coach is building lineup, **When** they view period squad in side panel, **Then** they can drag-drop members into activity participant list
6. **Given** activity has 18 participants, **When** coach views participant list, **Then** participants are grouped by role (starters, substitutes) with counts

---

### User Story 5 - Record Activity Outcomes (Priority: P2)

Users capture results and metadata after activities complete. A coach records match score, goals, cards, and player performance. A project lead records meeting decisions, action items, and attendance.

**Why this priority**: Completes the activity lifecycle—planning → execution → outcome recording. Essential for historical tracking and reporting.

**Independent Test**: Save flexible JSON data to activity's data field. Verify complex nested structures (goals array with player+minute, cards with type+time) persist and display correctly.

**Acceptance Scenarios**:

1. **Given** activity "Ajax vs Feyenoord" is complete, **When** coach enters outcome data {score_home: 3, score_away: 1, goals: [{player: "Speler 1", minute: 23}]}, **Then** data saves to activity.data field
2. **Given** outcome data exists, **When** user views activity detail page, **Then** outcome displays in structured format (not raw JSON)
3. **Given** flexible JSON editor is open, **When** user adds nested object {cards: [{player: "Speler 5", type: "yellow", minute: 45}]}, **Then** validation ensures data structure is valid JSON before save
4. **Given** activity has outcome data, **When** user exports to PDF via B29 integration, **Then** outcome data appears in formatted report
5. **Given** multiple activities have outcomes, **When** user views period summary dashboard, **Then** aggregated statistics display (total goals, win/loss record)
6. **Given** user makes typo in JSON editor, **When** they attempt to save invalid JSON, **Then** system highlights syntax error and prevents save until fixed

---

### User Story 6 - Calendar Views with Hierarchy Filtering (Priority: P3)

Users visualize scheduled activities across time periods with multiple view modes. A coach reviews all matches for "Najaarscompetitie" in monthly calendar. An admin sees organization-wide events across all projects.

**Why this priority**: Enhances usability for users managing many activities, but system is functional without advanced visualization.

**Independent Test**: Switch between monthly/weekly calendar views with period hierarchy filter. Verify activities display correctly and filtering by period shows activities in that period plus descendants.

**Acceptance Scenarios**:

1. **Given** activities exist across 3-level hierarchy, **When** user views calendar and selects "Seizoen 2023/2024" filter, **Then** all activities in season and child periods display
2. **Given** user is in monthly view, **When** they click "Week" button, **Then** calendar switches to current week with activities for that week
3. **Given** activities have different types (match, training, meeting), **When** user enables color-coding, **Then** each activity type displays in distinct color
4. **Given** user is viewing calendar, **When** they click an activity card, **Then** activity detail panel opens with participants, outcome data, and edit options
5. **Given** calendar shows 20+ activities in one month, **When** user hovers over date cell, **Then** tooltip shows activity count with expand option
6. **Given** activities span multiple projects, **When** org admin views calendar, **Then** they can filter by project to isolate project-specific activities

---

### Edge Cases

- **What happens when a period's date range overlaps with sibling period?** System allows overlapping periods (e.g., "Fall Season" and "Winter Training" may overlap). No validation constraint—products can add custom rules if needed.
- **How does system handle activities scheduled outside their period's date range?** System allows this flexibility. Warning notification (optional) if activity start_time is not within period.start_date to period.end_date, but no hard constraint.
- **What happens when deleting a period with child periods and activities?** System prevents deletion if children exist. User must delete child periods/activities first (bottom-up cleanup). Error message: "Cannot delete period with N child periods. Delete children first." Products can override with cascade delete if needed.
- **How are permissions inherited in multi-level hierarchies?** If user has `period.manage` on parent period, they can create child periods. If user has `project.manage_activities` on project, they can create activities in any project period. Permissions flow down (parent → child) but not up.
- **What happens when member is removed from organisation while assigned to period/activity?** Soft delete: participation record remains with is_active=false. Historical data preserved for audit trail. Period member list filters out inactive by default, with option to show all.
- **How does system handle concurrent edits to activity participants?** Optimistic locking: last-write-wins with updated_at timestamp. If conflicts occur, user sees "Activity was modified by another user" message with option to reload and retry.
- **What if activity type is not in configurable list?** System allows custom activity types via text field. Products can enforce strict type lists via validation if needed. Core remains flexible.
- **How are timezones handled for activity start/end times?** Activity times stored in UTC (datetime with timezone). Display in user's preferred timezone (from B12 user preferences). Period date ranges are date-only (no time/timezone).
- **What happens when period hierarchy exceeds 10 levels deep?** System allows unlimited depth (no hard constraint) but displays performance warning at 11+ levels: "Period hierarchy depth exceeds performance-tested threshold (10). Query times may increase. Consider flattening structure or materialized path for large datasets." Products can suppress warning if needed.

## Requirements *(mandatory)*

### Functional Requirements

#### Period Management

- **FR-001**: System MUST allow organisation admins to create root periods (no parent_period) scoped to organisation
- **FR-002**: System MUST allow project managers to create periods scoped to project (project foreign key set)
- **FR-003**: System MUST allow unlimited-depth period nesting via self-referential parent_period foreign key
- **FR-004**: System MUST enforce that child period's organisation matches parent's organisation (data integrity constraint)
- **FR-005**: System MUST provide tree view UI component displaying period hierarchy with expand/collapse controls
- **FR-006**: System MUST display breadcrumb navigation showing path from root to current period
- **FR-007**: System MUST validate that period end_date is after start_date
- **FR-008**: System MUST index periods on (organisation_id, project_id) and (parent_period_id) for query performance
- **FR-009**: System MUST support querying "all descendants of period X" efficiently for calendar filtering
- **FR-009b**: System MUST prevent deletion of periods with child periods or activities (raise validation error with count of children)
- **FR-009c**: System MUST display soft warning when period hierarchy depth exceeds 10 levels during creation (no hard constraint, allow continuation)

#### Activity Scheduling

- **FR-010**: System MUST allow project managers to create activities within project scope
- **FR-011**: System MUST link each activity to exactly one period (most specific in hierarchy)
- **FR-012**: System MUST support configurable activity_type field (match, meeting, training, lecture, etc.) stored as string
- **FR-013**: System MUST store activity start_time and end_time as timezone-aware datetimes
- **FR-014**: System MUST provide flexible data field (JSONField) for domain-specific attributes (score, goals, attachments)
- **FR-015**: System MUST display activities in calendar views (monthly, weekly) grouped by date
- **FR-016**: System MUST support filtering activities by period, showing activities in selected period and all descendants (inherited activities visible in parent period calendars by default)
- **FR-017**: System MUST support color-coding activities by type in calendar view
- **FR-018**: System MUST index activities on (project_id, period_id, start_time) for calendar query performance

#### Participation Tracking

- **FR-019**: System MUST enforce database constraint that exactly one of (activity_id, period_id) is set on Participation model
- **FR-020**: System MUST allow adding members to periods with configurable role (squad_member, captain, etc.)
- **FR-021**: System MUST allow adding members to activities with configurable role (starter, substitute, attendee, etc.)
- **FR-022**: System MUST store participation status (confirmed, tentative, declined, no_response)
- **FR-023**: System MUST provide flexible data field on Participation for role-specific metadata (jersey_number, position)
- **FR-024**: System MUST display period members in sortable, filterable list
- **FR-025**: System MUST suggest period members when adding activity participants (autocomplete)
- **FR-026**: System MUST keep period-level participation separate from activity-level participation (no automatic inheritance)
- **FR-027**: System MUST index Participation on (member_id, period_id) and (member_id, activity_id) for query performance

#### Access Control (B08 Integration)

- **FR-028**: System MUST enforce `organisation.manage_periods` permission for creating/editing organisation-wide periods
- **FR-029**: System MUST enforce `project.manage_periods` permission for creating/editing project-specific periods
- **FR-030**: System MUST enforce `project.manage_activities` permission for creating/editing activities
- **FR-031**: System MUST enforce `project.manage_activities` permission for managing activity participants
- **FR-032**: System MUST allow read-only access to periods/activities for organisation members without manage permissions
- **FR-033**: System MUST prevent users from accessing periods/activities in organisations they don't belong to

#### Audit & Integration

- **FR-034**: System MUST emit B09 audit events for period creation, modification, deletion
- **FR-035**: System MUST emit B09 audit events for activity creation, modification, deletion
- **FR-036**: System MUST emit B09 audit events for participation changes (member added/removed, role changed)
- **FR-037**: System MUST support B16 notification triggers for activity creation, participant assignment, status changes
- **FR-038**: System MUST support B29 export of activities to PDF/Excel with outcome data formatted
- **FR-039**: System MUST support B29 export of period member lists with role metadata

### Key Entities

- **Period**: Time-bound cycle for organizing activities and resources
  - Attributes: name, description, start_date, end_date, created_at, updated_at
  - Relationships: belongs to organisation (required), optionally belongs to project, optional parent_period for hierarchy
  - Constraints: end_date > start_date, child organisation matches parent organisation

- **Activity**: Scheduled event within a project and period
  - Attributes: title, activity_type (string), start_time, end_time (timezone-aware), location, data (JSON), created_at, updated_at
  - Relationships: belongs to project (required), belongs to period (required), has many participants via Participation
  - Constraints: period must belong to same organisation/project as activity

- **Participation**: Links members to periods or activities with roles
  - Attributes: role (string), status (confirmed/tentative/declined/no_response), notes, data (JSON), created_at, updated_at
  - Relationships: belongs to either activity OR period (exclusive), belongs to member (organisation membership)
  - Constraints: exactly one of (activity_id, period_id) must be set (database CHECK constraint)

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products (sports teams, business projects, education courses)
- [x] Extension points clearly documented: flexible JSON data fields for domain-specific attributes, configurable role/status values, products can add custom validation

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: models in `activities` app, API in `activities/api/`, no circular dependencies
- [x] No circular dependencies introduced: depends on B05 (accounts), B06 (organisations), B07 (projects), B08 (permissions)
- [x] Extension points are stable: JSONField for data, string fields for role/status/type allow product-specific values

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in models, managers, API serializers
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests for models, API, permissions, hierarchy queries
- [x] Coverage targets: ≥90% for models and API views, ≥85% for permissions integration
- [x] Integration tests planned: create 3-level hierarchy → add squad → schedule activity → record outcome

### Security & Privacy (Principle V)
- [x] Secure defaults maintained: all endpoints use DRF permission classes
- [x] No secrets in code: no sensitive data in models, configuration via settings
- [x] Authentication/authorization through B08: permission checks on all create/update operations
- [x] No sensitive data logged: participant role/status not considered sensitive, outcome data (scores, meeting notes) logged only in B09 audit trail

### Performance & Reliability (Principle VI)
- [x] No N+1 queries: queries use `select_related('period', 'project')` and `prefetch_related('participants__member')`
- [x] Pagination implemented: activity list and period member list paginated at 20 items per page
- [x] Structured logging: all mutations logged via B09 integration, errors logged with request_id
- [x] Graceful degradation: if B09 unavailable, audit events logged to Django logger as fallback

### API Design (Principle VII)
- [x] DRF standards followed: viewsets for CRUD, nested routes for hierarchy (`/periods/{id}/children/`, `/activities/{id}/participants/`)
- [x] API responses consistent: envelope pattern from B13, error responses follow B13 standards
- [x] Breaking changes use versioning: all APIs under `/api/v1/`, future changes via `/api/v2/`
- [x] Validation at boundary: serializers validate date ranges, participant constraints, permission checks

### Documentation (Principle XI)
- [x] Feature documentation plan: README.md in `src/activities/` with Purpose, Scope, Key Components, Public Interface, Integration Example, Related Modules, Extension Points
- [x] Extension guide updates: add section to `documents/06-workflow/extending-core.md` showing how to add custom activity types, roles, and outcome data structures
- [x] ADR planned: `documents/03-system/architecture-decisions/012-period-hierarchy-design.md` documenting why unlimited-depth tree over fixed levels

**Violations Requiring Justification**: None

## Terminology

- **Inherited Activities**: Activities scheduled in child periods automatically appear in parent period calendar views. This enables viewing all descendant activities when viewing a parent period.
- **Period Members**: Participation records at the period level (squad/team membership) are NOT automatically inherited to activities. Activity participants (lineups/attendees) must be explicitly created, though they can be selected from period members via autocomplete.
- **Period Hierarchy**: Unlimited-depth tree structure using self-referential foreign key. Performance guaranteed up to 10 levels; deeper hierarchies supported but may require optimization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a 3-level period hierarchy and navigate using tree view in under 2 minutes
- **SC-002**: Users can add 25 members to a period with roles and metadata in under 5 minutes using batch operations
- **SC-003**: Users can schedule an activity and select participants from period members in under 3 minutes
- **SC-004**: Calendar view loads and displays 100 activities across multiple periods in under 2 seconds
- **SC-005**: 95% of users successfully complete "create period → add squad → schedule activity → record outcome" workflow on first attempt without assistance
- **SC-006**: System handles 1000 concurrent users viewing/editing activities without performance degradation
- **SC-007**: Period hierarchy queries (fetch all descendants) complete in under 500ms for hierarchies up to 10 levels deep (performance guarantee threshold; deeper hierarchies supported but not performance-tested). For hierarchies >10 levels, system will display warning but queries remain functional. No performance guarantee beyond 10 levels. If production monitoring shows p95 >2s for queries, recommend materialized path optimization or hierarchy flattening
- **SC-008**: Zero data integrity violations: database constraints prevent invalid participation records (activity and period both set)
- **SC-009**: Audit trail completeness: 100% of mutations (create, update, delete) emit B09 events or fallback logs
- **SC-010**: API response times: 95th percentile under 300ms for calendar listing, under 200ms for single activity fetch

## Assumptions

1. **Permission model**: Assumes B08 Hierarchical Access Control provides `organisation.manage_periods`, `project.manage_periods`, and `project.manage_activities` permissions. If these don't exist, they must be added to B08 permission seeding.

2. **Organisation membership**: Assumes all participants referenced in Participation model have active membership in the organisation (via B06 Membership model). No cross-organisation participation allowed.

3. **Timezone handling**: Assumes user timezone preferences available from B12 i18n/l10n preferences. If not set, falls back to organisation timezone or UTC.

4. **Configurable types/roles/status**: Role, status, and activity_type stored as text fields with no database enum constraints. Products can add validation via serializers if strict types needed. Default suggestions provided in API but not enforced.

5. **Audit integration**: Assumes B09 Audit module accepts event_type, actor, target_object_id, changes dict. If B09 signature differs, adapter layer required.

6. **Notification integration**: Assumes B16 Notifications accepts notification_type, recipient, context dict. Notification routing rules configured by products, not Core.

7. **Export integration**: Assumes B29 Advanced Reporting provides template-based PDF/Excel generation accepting data dict. If B29 not available, export endpoints return JSON only.

8. **Tree query performance**: Recursive CTE (Common Table Expressions) used for "fetch all descendants" queries. Assumes PostgreSQL 9.4+ with CTE support. Performance guaranteed up to 10 levels (SC-007). Soft warning displayed at 11+ levels. For hierarchies exceeding 15 levels with performance issues, products should consider materialized path column or denormalization.

9. **Concurrent edit handling**: Uses optimistic locking via `updated_at` timestamp. No pessimistic locks. Assumes conflict resolution at application layer (last-write-wins with user notification).

10. **Calendar view scope**: Calendar displays activities for selected period and all descendants. No "show only direct children" filter in initial version—can be added if user feedback indicates need.
