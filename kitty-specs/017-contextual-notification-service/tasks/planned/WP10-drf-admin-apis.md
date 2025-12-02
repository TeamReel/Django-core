---
work_package_id: "WP10"
subtasks: ["T070", "T071", "T072", "T073", "T074", "T075", "T076", "T077"]
title: "DRF Admin APIs & Routing Log Queries"
phase: "Phase 3 - Admin & Developer Experience"
lane: "planned"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP10 – DRF Admin APIs & Routing Log Queries

## Objectives

Provide DRF APIs for admins to query routing logs and manage preferences. User Story 5 debugging support.

**Success**: Admin can query routing logs via API, filter by event/org/user, paginated results.

## Key Subtasks

- T070: DRF serializers (`serializers/routing_serializers.py`)
- T071: Viewsets for routing log queries (`views/routing_logs_views.py`)
- T072: Filtering (event_type, org_id, user_id, timestamp)
- T073: Pagination (page_size=50)
- T074: Permissions (org admin for org logs, superadmin for all)
- T075 [P]: Preference CRUD views
- T076: URL routing
- T077: API documentation

## Implementation

- Query B09 AuditEvent with category="notification_routing"
- DRF filter backends for query params
- Permissions: `IsAuthenticated` + custom org admin check

## Definition of Done

- [ ] Admin can query routing logs via API
- [ ] Filtering and pagination work
- [ ] Permissions enforced

## Dependencies

- WP07 (audit logging)
- B09 AuditEvent API
