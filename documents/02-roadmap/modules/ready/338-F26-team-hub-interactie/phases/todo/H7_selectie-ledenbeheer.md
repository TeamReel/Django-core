# H7 — Selectie Ledenbeheer

| | |
|---|---|
| Fase | H7 |
| Status | 📋 TODO |
| Effort | ~6 uur |
| Afhankelijkheid | H3 (done) |

## Wat

Twee ontbrekende functies in de Selectie:

1. **Leden toevoegen/verwijderen** — Admin moet leden aan de selectie kunnen toevoegen (uit het team) of verwijderen. Nu is de selectie read-only.

2. **Season-level membership** — Een lid kan lid zijn van het team maar niet gekoppeld aan het huidige seizoen. Admin moet per seizoen kunnen bepalen welke leden actief zijn.

## Technische analyse

### Huidige situatie
- `HubSelectieTab.tsx` toont een lijst van `SquadMember[]` uit `d.members`
- Members komen uit `useSeasonDetailPageData` → API call naar `/memberships/`
- Er is geen UI om leden toe te voegen of te verwijderen
- De member list is gekoppeld aan het seizoen (period) via de membership API

### Backend API
- **Memberships endpoint**: `/api/v1/organisations/{org}/projects/{project}/memberships/`
- **Create**: POST met `{ user: userId, role: 'member' }` (of via invite)
- **Delete**: DELETE `/memberships/{id}/`
- **Season koppeling**: Memberships zijn gekoppeld aan een project (team). Season-level is via `period_memberships` of een filter op de membership.

### Gewenste UX
- **Toevoegen**: "Lid toevoegen" button → zoek/selecteer uit team-leden die nog niet in het seizoen zitten
- **Verwijderen**: Swipe-to-delete of "Verwijder" optie in de MemberSummarySheet
- **Season koppeling**: Toggle of checkbox per lid om aan/uit het seizoen te koppelen

### Bestaande componenten
- `MemberSummarySheet` — kan uitgebreid met "Verwijder uit selectie" actie
- `UsersList` / `MembersList` — kan hergebruikt voor de "toevoegen" picker

## Checklist

- [ ] Research: Hoe werkt season-level membership in de backend? Is er een aparte `period_membership` of filter?
- [ ] "Lid toevoegen" button in Selectie tab/accordion — opent picker sheet
- [ ] Picker sheet: toon team-leden die niet in het huidige seizoen zitten
- [ ] Koppel geselecteerd lid aan seizoen via API
- [ ] "Verwijder uit selectie" actie op MemberSummarySheet (admin only)
- [ ] Verwijder-actie ontkoppelt lid van seizoen (niet permanent verwijderen uit team)
- [ ] Refresh na toevoegen/verwijderen (`setMembersReloadToken`)
- [ ] Empty state: "Geen leden in dit seizoen — voeg leden toe"
- [ ] WCAG: focus management, confirmatie bij verwijderen
- [ ] TypeScript 0 errors, Vite build success
