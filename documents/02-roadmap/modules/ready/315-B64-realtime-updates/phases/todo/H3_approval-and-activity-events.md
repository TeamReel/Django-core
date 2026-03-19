# H3 — Approval & Activity Events

> **Effort:** ~2 uur | **Impact:** Approval requests en activity feed real-time

## To do

- [ ] Publish `approval.requested` event wanneer content wacht op goedkeuring
- [ ] Publish `approval.decided` event bij approve/reject/revision_requested
- [ ] Publish `activity.created` event bij nieuwe B62 ActivityLog entries
- [ ] Frontend: notification bell badge update via WebSocket (niet meer pollen)
- [ ] Frontend: Approvals page telt "nieuwe items" badge bij incoming events

## Done criteria

- [ ] Admin/coach krijgt real-time melding van nieuwe approval requests
- [ ] Notification bell update zonder page refresh
- [ ] Activity feed op `/activity` toont nieuwe items zonder refresh
