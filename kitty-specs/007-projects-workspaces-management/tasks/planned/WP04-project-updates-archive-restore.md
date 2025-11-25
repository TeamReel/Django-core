# WP04: Project Updates & Archive/Restore (User Story 2)

**Work Package ID**: WP04
**Status**: Planned
**Priority**: P2
**Estimated Effort**: 4-5 hours

## Objective
Implement API endpoints for updating project details and archiving/restoring projects.

## Dependencies
WP03 (CRUD endpoints must exist)

## Subtasks

### T021: Update Actions
Add update/partial_update to viewset (inherited from ModelViewSet).
Make slug read-only in serializer.

### T022-T023: Archive & Restore Actions
Implement custom @action methods:
- archive: Validate is_active=True, call project.archive(), return 204
- restore: Validate is_active=False, call project.restore(), return 204

### T024-T025: Edge Cases
Add validation to prevent:
- Archiving already archived project (400 error)
- Restoring already active project (400 error)

## Success Criteria
- PATCH updates name/description
- Slug cannot be updated
- Archive/restore work correctly
- Edge cases handled with proper error messages
