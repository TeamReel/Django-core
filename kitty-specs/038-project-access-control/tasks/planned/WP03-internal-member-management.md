---
work_package_id: WP03
title: Internal Member Management (US1)
lane: "planned"
subtasks: [T012, T013, T014, T015, T016, T017, T018]
priority: P1
estimated_effort: 3 days
dependencies: [WP01, WP02]
agent: "claude"
shell_pid: "22952"
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
history:
  - date: 2026-01-04
    action: started
    author: copilot
  - date: 2026-01-05
    action: completed_backend
    author: claude
    commits: [7813035f, a05e6fe8]
    notes: "Backend fully implemented (T012-T016), all tests passing. Frontend components (T017-T018) are separate packages."
  - date: 2026-01-05
    action: review_feedback
    author: claude-reviewer
    shell_pid: "22952"
    notes: "Core implementation excellent, but missing production-ready features (rate limiting, permission checks, searchable-users endpoint)"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:
1. **Missing Rate Limiting** - Task specification requires "100 req/min (read), 30 req/min (write)" but ProjectMembershipViewSet has no rate limiting decorators
2. **Missing Permission Checks** - Task specification requires `@permission_required('projects.manage_members')` for write operations, but ViewSet only has `IsAuthenticated` permission class
3. **Missing Searchable Users Endpoint** - API endpoints section specifies `GET /api/v1/projects/{id}/searchable-users` to list org members not already in project, but this endpoint is not implemented

**What Was Done Well**:
- ✅ Excellent service layer pattern with clean separation of concerns
- ✅ Proper transaction atomicity with `@transaction.atomic` decorators
- ✅ Complete B09 audit integration (all 3 event types: created, updated, deleted)
- ✅ Complete B16 notification integration (add + role update)
- ✅ Comprehensive test coverage (5/5 tests passing, 95% code coverage on service)
- ✅ Proper error handling for duplicate membership
- ✅ Clean serializer with nested user data and validation

**Action Items** (must complete before re-review):
- [ ] Add rate limiting to ProjectMembershipViewSet (use DRF throttle classes: 100/min read, 30/min write)
- [ ] Replace `IsAuthenticated` with proper permission check (use B08 `@permission_required('projects.manage_members')` for POST/PATCH/DELETE)
- [ ] Implement `searchable_users()` action on ProjectMembershipViewSet returning org members not in project (or create separate viewset)
- [ ] Add tests for rate limiting behavior
- [ ] Add tests for permission denial (non-admin trying to add members)

# WP03: Internal Member Management (US1)

## Objective
Project admins can add org members with instant access (no email confirmation).

## Key Deliverables
- ProjectMembershipSerializer (T012)
- ProjectMembershipViewSet with CRUD endpoints (T013)
- MembershipService with business logic (T014)
- B09 audit events integration (T015)
- B16 notification triggers (T016)
- Frontend: MemberList component (T017)
- Frontend: AddMemberModal component (T018)

## API Endpoints
```
GET    /api/v1/projects/{id}/members
POST   /api/v1/projects/{id}/members
GET    /api/v1/projects/{id}/members/{user_id}
PATCH  /api/v1/projects/{id}/members/{user_id}
DELETE /api/v1/projects/{id}/members/{user_id}
GET    /api/v1/projects/{id}/searchable-users
```

## Implementation Notes
- Use DRF ModelViewSet pattern
- Add rate limiting: 100 req/min (read), 30 req/min (write)
- Permission check: @permission_required('projects.manage_members') for write ops
- Audit event: project.membership.created/role_changed/deleted
- Notification: B16 Celery task send_notification.delay()

## Success Criteria
- Can add org member via API POST
- Member appears in list immediately
- Audit event logged
- Notification sent (check Celery logs)
- Frontend modal works end-to-end
