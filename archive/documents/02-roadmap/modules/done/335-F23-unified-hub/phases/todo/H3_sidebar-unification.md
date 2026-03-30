# H3 — Sidebar Panel B unificatie

> **Effort:** ~4 uur | **Impact:** Eén sidebar builder vervangt zes aparte functies

## To do

- [ ] Maak `buildUnifiedHubSection()` functie in `sidebarPanelBWorkEntities.ts`:
  - Parameters: `baseUrl`, `scope` (`season | team-only | club`), `isPlayer`, `isSupporter`, `isClubAdmin`
  - Genereert exact dezelfde items als de hub's MobileTabBar
  - Season scope: Overview, Wedstrijden, Media, Selectie, Beheer, Club (RBAC-gated)
  - Team-only scope: Overview, Selectie, Beheer
  - Club scope: Overview, Teams, Leden, Identity
- [ ] Deprecate oude builders:
  - `buildTeamDetailSection` → verwijzen naar `buildUnifiedHubSection`
  - `buildClubDetailSection` → verwijzen naar `buildUnifiedHubSection`
  - `buildSeasonSection` / `buildSeasonProjectSection` → verwijzen naar `buildUnifiedHubSection`
  - `buildCompetitionSection` → verwijzen naar `buildUnifiedHubSection`
  - `buildMemberSection` → verwijzen naar `buildUnifiedHubSection`
  - Voeg `@deprecated` JSDoc toe aan oude functies
- [ ] Update aanroepers in Panel B builder logic:
  - Detect scope op basis van URL-segmenten
  - Gebruik `buildUnifiedHubSection` met correct scope
- [ ] Tab-aliasing in sidebar:
  - Season sidebar items moeten overeenkomen met hub tab-IDs
  - Verwijder legacy tab-namen die niet meer bestaan

## Done criteria

- [ ] Panel B sidebar items matchen exact de hub tabs per scope/rol
- [ ] Klikken op sidebar item navigeert correct naar de juiste hub tab
- [ ] Oude builder-functies gemarkeerd als `@deprecated`
- [ ] Geen regressie in sidebar navigatie op desktop
