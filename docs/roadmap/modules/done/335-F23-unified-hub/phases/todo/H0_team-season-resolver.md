# H0 — TeamSeasonResolver: Auto-redirect 3→4 segment

> **Effort:** ~6 uur | **Impact:** Elimineert de nutteloze TeamDetailPage voor 95% van de users

## Context

Wanneer een user op `/:org/:club/:team` landt (3-segment), krijgt hij nu de `TeamDetailPage` met lege placeholders voor wedstrijden en media. Dit is een doodlopende ervaring — alle echte data zit in de seizoen-scope (4-segment).

## To do

- [ ] Maak `TeamSeasonResolver` component:
  - Fetch team's seizoenen via API (`/organisations/:org/projects/:team/periods/?type=season&ordering=-start_date&limit=1`)
  - Als seizoen gevonden → `<Navigate to="/:org/:club/:team/:season" replace />`
  - Als geen seizoenen → render `<MyTeamHubPage scope="team-only" />` (placeholder, uitgewerkt in H4)
  - Loading state: hergebruik bestaande `HubSkeleton`
- [ ] Update `appRouteGroups.tsx`:
  - Route `/:orgId/:clubId/:projectId` wijst naar `TeamSeasonResolver` ipv `TeamDetailPage`
- [ ] Behoud backward compatibility:
  - `TeamDetailPage` component blijft bestaan (niet verwijderen)
  - Alleen de route-mapping verandert
- [ ] Local-first optimalisatie:
  - Check `localStorage` (APP_LAST_CTX_KEY) voor cached seizoen voor dit team
  - Dient als instant-hint vóór API response binnenkomt
- [ ] Query params preserveren door redirect (`?tab=beheer`, `?tab=selectie`)
- [ ] Legacy vanity routes afvangen:
  - `/:orgId/:clubId/:projectId/seasons` → redirect naar hub
  - `/:orgId/:clubId/:projectId/competitions` → redirect naar hub met competitie-context
- [ ] E2E test coverage:
  - Test redirect `/org/club/team` → `/org/club/team/seizoen-2025`
  - Test redirect `/org/club/team?tab=beheer` → `/org/club/team/seizoen-2025?tab=beheer`
  - Test team zonder seizoenen → team-only hub
  - Test team met meerdere seizoenen → selecteert meest recente

## Done criteria

- [ ] `/:org/:club/:team` navigeert automatisch naar `/:org/:club/:team/:latest-season`
- [ ] Redirect is een 1-frame `<Navigate replace />` — geen flash of layout shift
- [ ] Bestaande bookmarks naar 3-segment URLs werken (redirect vangt op)
- [ ] Als team 0 seizoenen heeft → geen crash, toont fallback
- [ ] `?tab=beheer` query parameter blijft behouden door redirect
- [ ] Geen extra API calls als user al via bottom nav met seizoen binnenkomt
- [ ] Geen enkel pad leidt meer naar de oude `TeamDetailPage` met lege placeholders
- [ ] Legacy vanity routes redirecten correct
