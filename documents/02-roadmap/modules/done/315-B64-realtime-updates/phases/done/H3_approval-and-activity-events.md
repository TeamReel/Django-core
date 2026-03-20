# H3 — Approval & Activity Events

> **Effort:** ~2 uur | **Impact:** Approval requests en activity feed real-time

## To do

- [x] Publish `approval.requested` event wanneer content wacht op goedkeuring
- [x] Publish `approval.decided` event bij approve/reject/revision_requested
- [x] Publish `activity.created` event bij nieuwe B62 ActivityLog entries
- [x] Frontend: notification bell badge update via WebSocket (niet meer pollen)
- [x] Frontend: Approvals page telt "nieuwe items" badge bij incoming events

## Done criteria

- [x] Admin/coach krijgt real-time melding van nieuwe approval requests
- [x] Notification bell update zonder page refresh
- [x] Activity feed op `/activity` toont nieuwe items zonder refresh
