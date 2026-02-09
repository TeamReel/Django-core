---
work_package_id: "WP10"
title: "User Story 5 – View Workflow History"
phase: "Phase 2 - Enhancement"
lane: "planned"
history: [{timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}]
---

# WP10 – Workflow History API (Priority P2)

User can view full transition history for workflow instances.

**Endpoints**:
- `GET /api/workflows/history/` - List history (paginated, filtered)
- `GET /api/workflows/history/{id}/` - History details
- `GET /api/workflows/history/{id}/hook_status/` - Query async hook status

**Implementation**: ReadOnlyModelViewSet with filters (instance, actor, action, date range)

Activity Log: 2026-02-09T18:18:50Z – Created
