# H6 — Polish & edge cases

> **Effort:** ~4 uur | **Impact:** Robuustheid en productie-kwaliteit

## To do

- [ ] Deep link compatibiliteit:
  - `/:org/:club/:team/members/:memberId` → redirect naar hub season scope + open member panel
  - `/:org/:club?tab=identity` → redirect naar hub club tab + identity subtab
  - Legacy `/organisations/:org/projects/:team/seasons` → redirect naar hub
- [ ] Loading states optimaliseren:
  - Skeleton consistent over alle scopes (season, team-only, club)
  - Geen FOUC (flash of unstyled content) bij redirects
  - localStorage pre-seed voor instant skeleton → data swap
- [ ] Error boundaries:
  - SeasonProvider error → fallback naar team-only scope (niet crash)
  - Team not found → redirect naar club scope (niet error page)
  - Club not found → redirect naar federation (niet error page)
- [ ] Analytics / monitoring:
  - Track welke scope het vaakst wordt geladen
  - Track redirect-latency (3→4 segment)
  - Track errors in resolutie-flow
- [ ] Performance:
  - Lighthouse audit op hub in alle 3 scopes
  - Geen regressie vs. huidige MyTeamHubPage
  - Preload hub chunks vanuit bottom nav (al aanwezig, valideren)

## Done criteria

- [ ] Alle legacy deep links redirecten correct
- [ ] Geen console errors bij scope-transitions
- [ ] Error boundaries vangen gracefully op
- [ ] Lighthouse performance score ≥ huidige baseline
- [ ] Handmatige test: supporter, player, team admin, club admin flows
