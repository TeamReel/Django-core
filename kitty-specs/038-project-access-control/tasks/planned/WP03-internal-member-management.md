---
work_package_id: WP03
title: Internal Member Management (US1)
lane: planned
subtasks: [T012, T013, T014, T015, T016, T017, T018]
priority: P1
estimated_effort: 3 days
dependencies: [WP01, WP02]
---

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
