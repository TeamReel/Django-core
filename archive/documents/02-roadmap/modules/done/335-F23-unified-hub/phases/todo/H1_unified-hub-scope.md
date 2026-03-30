# H1 — MyTeamHubPage scope-detectie

> **Effort:** ~8 uur | **Impact:** Eén component dat zich aanpast aan de beschikbare context

## Context

`MyTeamHubPage` werkt momenteel alleen in seizoen-scope (4-segment). Dit fase voegt scope-detectie toe zodat hetzelfde component ook in team-only scope kan draaien.

## To do

- [ ] Refactor `MyTeamHubPage`:
  - Accepteer `scope` prop: `'season' | 'team-only'`
  - `scope='season'`: bestaand gedrag (alle 6 tabs, SeasonProvider data)
  - `scope='team-only'`: beperkte tabs (Overview, Selectie, Beheer)
- [ ] Team-only tab content:
  - Overview: team info, "Start je eerste seizoen" CTA als er geen seizoenen zijn
  - Selectie: team leden via `useTeamTabData` (niet seizoen-specifiek)
  - Beheer: `TeamBeheerTab` (assets, kits, credits)
- [ ] Header aanpassen:
  - Season-scope: team naam + SeasonSwitcher (bestaand)
  - Team-only scope: team naam, geen SeasonSwitcher
- [ ] RBAC consistent:
  - Team-only: supporter ziet alleen Overview, player ziet Overview + Selectie
  - Season-scope: ongewijzigd (2/4/6 tabs)
- [ ] Data hooks:
  - `useTeamDetailData()` altijd aanroepen
  - `useSeasonDetailPageData()` alleen in season-scope (via SeasonProvider)
  - `useTeamTabData()` alleen in team-only scope
  - Geen conditionele hooks — gebruik `enabled` patterns

## Done criteria

- [ ] `MyTeamHubPage` rendert correct in beide scopes
- [ ] Tab-structuur past zich aan aan scope + rol
- [ ] Geen lege placeholder-content meer (alles interactief of met duidelijke CTA)
- [ ] TypeScript compileert zonder errors (`npx tsc --noEmit`)
- [ ] Bestaande season-scope hub werkt identiek (geen regressie)
