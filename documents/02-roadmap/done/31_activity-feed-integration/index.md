# Roadmap #31 — Activity Feed Frontend Integration

> **Status:** Voltooid
> **Start:** 2026-03-19
> **Voltooid:** 2026-03-19
> **Scope:** `demo/src/components/`, `demo/src/hooks/`, `demo/src/pages/`
> **Backend:** B62 Activity Feed (✅ geïmplementeerd)

## Doel

De B62 Activity Feed API (`/api/v1/activity-feed/`) integreren in de webapp zodat coaches en admins een timeline zien van organisatie-events ("Brian maakte een video", "Jayden bevestigde beschikbaarheid") — via de bestaande notificatie bell modal én een aparte /activity pagina.

## Huidige staat

### Wat werkt ✅
- B62 backend: ActivityLog model, signal-based logging, cursor-paginatie, org-scoping
- Notification bell in TopNavbar met modal (`NavbarNotificationsModal`)
- `useNotifications` hook fetcht `/api/v1/user-notifications/` met polling
- Bestaande `ActivityFeed` component toont **wedstrijden** (Activity model), niet B62 events
- Role-based visibility via `useUserRole()`

### Wat ontbreekt ❌
- Niets — alle features geimplementeerd via unified notification feed

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| Waar zien gebruikers events? | In de bestaande notificatie bell modal (tab-based) + aparte /activity pagina |
| Unread indicator? | Geen apart systeem — bestaande notification bell badge is genoeg |
| Wie ziet het? | Alleen org admins + coaches (via `useUserRole`) |
| Hoe integreren met notificaties? | Tab-switcher in NavbarNotificationsModal: "Notificaties" / "Activiteit" |
| Aparte pagina? | Ja, `/activity` met volledige cursor-paginated timeline |
| Bestaande ActivityFeed component? | Blijft apart — dat is de wedstrijdkalender, niet de B62 timeline |

## Fasering

| Fase | Titel | Effort | Status | Doc |
|------|-------|--------|--------|-----|
| H0 | Hook + Types | ~1 uur | Voltooid | — |
| H1 | Notificatie Modal Integratie | ~2 uur | Voltooid | — |
| H2 | Activity Pagina | ~2 uur | Voltooid | — |
| H3 | Polish + Tests | ~1 uur | Voltooid | — |

> Wanneer een fase klaar is → verplaats doc van `phases/todo/` naar `phases/done/`.

## Acceptatiecriteria (geheel)

- [x] Coaches/admins zien activity feed in notificatie modal (unified feed)
- [x] Coaches/admins kunnen `/activity` pagina bezoeken met filters
- [x] Spelers/supporters zien geen activity tab of pagina
- [x] Events komen van B62 API (`/api/v1/activity-feed/`)
- [x] Cursor-based paginatie werkt
- [x] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [x] No new `any` types
- [x] All interactive elements accessible (keyboard + screen reader)
- [x] Mobile-first responsive design
- [x] Design tokens only (geen hardcoded kleuren/spacing)
