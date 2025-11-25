---
lane: "for_review"
agent: "copilot"
shell_pid: "11524"
assignee: "GitHub Copilot"
started_at: "2025-11-25T13:50:00Z"
completed_at: "2025-11-25T14:00:00Z"
review_status: ""
reviewed_by: ""
---

# WP04: Project Updates & Archive/Restore (User Story 2)

**Work Package ID**: WP04
**Status**: For Review
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

## Activity Log
- 2025-11-25T13:50:00Z – copilot – shell_pid=11524 – lane=doing – Started implementation of project updates and archive/restore
- 2025-11-25T14:00:00Z – copilot – shell_pid=11524 – lane=doing – Implementation verification complete: All WP04 features already implemented in WP03, fixed URL routing issue (removed unnecessary rest_framework_nested dependency), Django checks pass with 0 issues
- 2025-11-25T14:02:00Z – copilot – shell_pid=11524 – lane=for_review – Ready for review: WP04 complete with all subtasks verified
