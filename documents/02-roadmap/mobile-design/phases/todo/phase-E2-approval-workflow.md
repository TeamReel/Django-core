# Phase E2 — Approval Workflow UX

**Track:** E (Content Flow)
**Status:** 📋 Planned

## Doel

Volledige approve/reject flow met instant feedback. Van queue tot definitieve actie — vloeiend en duidelijk.

## Huidige situatie

- `NavbarQuickReviewModal` bestaat (quick view)
- `/approvals` pagina (ApprovedContent?) bestaat
- Approve/reject API calls bestaan

## Gewenste verbeteringen

| Verbetering | Beschrijving |
|-------------|-------------|
| **Inline preview** | Grotere preview in approval card (niet alleen tekst) |
| **Swipe of knoppen** | Approve (groen) / Reject (rood) acties |
| **Optimistic UI** | Item verdwijnt direct uit lijst na actie |
| **Undo** | Toast: "Afgekeurd. Ongedaan maken?" (5 sec window) |
| **Batch acties** | "Alles goedkeuren" voor vertrouwde content |
| **Status feedback** | Badge count in TopNav updatet direct |
| **Filter** | By status, by match, by content type |

## Taken

- [ ] Approval cards redesign met grotere preview
- [ ] Approve/reject knoppen of swipe
- [ ] Optimistic removal uit lijst
- [ ] Undo toast (5 sec)
- [ ] "Alles goedkeuren" bulk actie
- [ ] Badge count optimistic update
- [ ] Filters op approvals pagina
- [ ] Empty state na laatste approval: "Alles verwerkt! 🎉"

## Checklist

- [ ] Approval cards redesigned
- [ ] Approve/reject flow werkend
- [ ] Optimistic UI
- [ ] Undo toast
- [ ] Bulk acties
- [ ] Badge update
- [ ] Responsive
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
