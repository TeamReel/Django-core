# Phase W5 — Approval Workflow UX

**Track:** W (Wizard & Overlays) | **Layer:** 3
**Status:** Done | **Previously:** E2

Approve/reject flow met instant feedback.

## Implementation notes
- Modal entrance animations: overlay fade-in (0.2s) + panel slide-up (0.25s cubic-bezier)
- Toast notifications: slide-in animation (0.28s) from right
- Approve/Reject buttons: `:active { transform: scale(0.94-0.95) }` + hover states
- AI/Video job cards: `:active { transform: scale(0.98) }` on clickable items
- Workflow action buttons: `:active { transform: scale(0.94) }` + hover bg transition
- Review modal: variant card border transition (0.2s), nav arrow active states
- Variant approve/reject buttons: `:active { scale(0.94) }` + existing color transitions
- Filter chips: `:active { scale(0.95) }` on content type filters
- All buttons: consistent `transition` for smooth hover/active feedback
- `prefers-reduced-motion` override for all new animations
- Applied to: ApprovalsPage, ApprovalsJobList, ReviewModals, NavbarModals, WorkflowActionButtons, TopNavbar
