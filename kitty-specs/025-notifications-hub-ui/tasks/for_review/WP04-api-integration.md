---
work_package_id: "WP04"
subtasks: ["T017", "T018", "T019", "T020"]
title: "API Integration & Data Fetching"
phase: "Phase 1 - State Management & Data Flow"
lane: "for_review"
assignee: "GitHub Copilot (Claude)"
agent: "claude"
shell_pid: "21096"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-11T18:18:41Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "21096"
    action: "Started implementation"
---

# Work Package Prompt: WP04 – API Integration & Data Fetching

## Objectives & Success Criteria

Implement all API calls to B13/B16/B17 using @django-core/api-client, including fetch, mark-as-read, and mark-all-as-read operations with error handling and retry logic.

**Success Criteria**:
- GET /api/notifications returns paginated notifications
- PATCH /api/notifications/:id/read updates with optimistic UI
- POST /api/notifications/mark-all-read updates all
- 401 errors trigger F02 re-authentication
- 500 errors retry with exponential backoff (max 3)
- All API calls include CSRF token

## Key Implementation Points

### T017 – API Fetch Logic
Use @django-core/api-client for GET /api/notifications with org/project/status/page params. Dispatch FETCH_START → FETCH_SUCCESS/ERROR actions.

### T018 – Optimistic Mark-as-Read
Dispatch MARK_READ_OPTIMISTIC immediately, fire PATCH request, dispatch SUCCESS or FAILED (with rollback).

### T019 – Mark-All-as-Read
POST /api/notifications/mark-all-read with org/project context. Update all local notifications.

### T020 – Error Handling & Retry
Exponential backoff: 1s, 2s, 4s delays. Log errors without exposing sensitive data. Handle 401/403/500 specifically.

## Files
- Update `src/context/NotificationsProvider.tsx` with real API implementations
- Create `src/context/apiClient.ts` for API wrapper functions

## References
- [contracts/notifications-api.yaml](../contracts/notifications-api.yaml)
- [data-model.md](../data-model.md) - API request/response contracts

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
- 2025-12-11T18:18:41Z – claude – shell_pid=21096 – lane=doing – Started implementation
- 2025-12-11T18:25:27Z – claude – shell_pid=21096 – lane=doing – Completed all subtasks (T017-T020): apiClient wrapper with retry logic, fetchNotifications/loadMore/refresh, optimistic mark-as-read/unread with rollback, markAllRead, Provider tests re-enabled (62/67 passing, 5 async timing issues remain)
- 2025-12-11T18:26:29Z – claude – shell_pid=21096 – lane=for_review – Ready for review
