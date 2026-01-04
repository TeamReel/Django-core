---
lane: "doing"
assignee: "Claude Agent"
agent: "claude"
shell_pid: "45452"
review_status: ""
---

# WP03: Metrics Collection (Backend)

## Activity Log
- 2026-01-04T00:25:00Z – claude – shell_pid=45452 – lane=doing – Started implementation

## Context
- **Spec:** [spec.md](../../spec.md)
- **Plan:** [plan.md](../../plan.md)
- **Data Model:** [data-model.md](../../data-model.md)
- **Contracts:** [contracts/api.yaml](../../contracts/api.yaml)

## Goal
Implement historical data collection and API endpoints for the dashboard.

## Tasks
- [ ] **T010**: Create `SystemMetric` model (timestamp, hits, misses, memory, keys).
- [ ] **T011**: Implement `collect_system_metrics` Celery task.
- [ ] **T012**: Configure Celery Beat schedule (10 min interval).
- [ ] **T013**: Implement `GET /api/v1/system/cache/metrics` (Realtime + History).
- [ ] **T014**: Implement `POST /api/v1/system/cache/clear` and `benchmark`.

## Definition of Done
- `SystemMetric` table is populated by the Celery task.
- API endpoints return data in the format specified in `contracts/api.yaml`.
- 7-day retention logic is implemented (or noted for future cleanup task).
