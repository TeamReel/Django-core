---
lane: "doing"
agent: "system"
---
# WP03: Project Creation & Listing API (User Story 1)

**Work Package ID**: WP03
**Status**: Planned
**Priority**: P1 (highest user story priority)
**Estimated Effort**: 8-10 hours

## Objective
Implement REST API endpoints for creating projects and listing projects with proper permissions and pagination.

## Dependencies
WP02 (Project model must exist)

## Subtasks

### T015-T016: Serializers
Create `ProjectSerializer` and `ProjectListSerializer` in `projects/api/serializers.py` with:
- Nested organisation/creator fields
- Validation: name length (1-200), slug pattern, description max 2000
- Case-insensitive name uniqueness check per organisation

### T017-T018: Views & Pagination
Create `ProjectViewSet` in `projects/api/views.py`:
- Actions: create, list, retrieve
- Queryset filtering: by org_id (nested) or user orgs (top-level)
- select_related('organisation', 'creator') optimization
- CursorPagination (50 items/page)

### T019: URL Routing
Create routers in `projects/api/urls.py`:
- nested_router: for `/api/organisations/{org_id}/projects/`
- toplevel_router: for `/api/projects/`

### T020: Permissions
Reuse `IsOrganisationAdmin` from Feature 006 for create action.
Filter queryset by user's organisation memberships.

## Success Criteria
- POST creates project with auto-generated slug
- GET returns paginated list with nested org/creator
- Permissions enforced (admin for create, member for view)
- Handle slug collisions with sequential suffix

## Activity Log

- 2025-11-25T13:17:49Z – system – shell_pid= – lane=doing – Moved to doing
