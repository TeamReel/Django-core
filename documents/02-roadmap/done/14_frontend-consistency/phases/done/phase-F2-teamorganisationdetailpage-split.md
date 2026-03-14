# F2 — TeamOrganisationDetailPage Split

**Status:** ✅ Done
**Track:** F — File Splitting
**Effort:** 2 uur
**Dependencies:** Geen
**Afgerond:** 2026-06-18

---

## Doel

Split `TeamOrganisationDetailPage.tsx` (441 regels) naar <300 regels.

## Aanpak

Gekozen voor **Optie A variant** — tab componenten waren al geëxtraheerd. De bulk zat in de header-sectie (activate/edit/share/overflow menu) en de identity sub-tab. Twee nieuwe componenten geëxtraheerd.

## Wat Gedaan

### `TeamPageHeader.tsx` (nieuw)
- Volledige header inclusief: title block, activate knop, edit knop, ShareButton, overflow menu
- Beheert eigen `overflowOpen` state en click-outside effect
- Props: `team, club, org, isActive, activatingContext, isPlayer, backToClubHref, setTeam, onEditClick, onDetailClick, ...`

### `IdentitySubtab.tsx` (nieuw)
- Identity sub-tab toggle (Assets | Kits) + AssetsTab + KitsTab rendering
- Beheert eigen `identitySubtab` state
- Props: `org, team, setTeam, brandProfileId, club`

### `TeamOrganisationDetailPage.tsx` (refactored)
Van 441 → **298 regels**. Puur orchestrator: data fetching via hooks, tab routing, modals.

Verwijderde imports (moved to child components):
- `Link`, `Alert`, `Button`
- `Check, Pencil, Eye, Trash2, MoreHorizontal`
- `ShareButton`, `setActiveContext`, `getActiveContext`, `api`
- `AssetsTab`, `KitsTab`

## Verificatie

- ✅ TeamOrganisationDetailPage.tsx: 298 regels (< 300 ✅)
- ✅ Geen TypeScript errors in alle 3 bestanden
- ✅ Bestaande imports naar de pagina werken ongewijzigd
