# HX — End-to-End Test & Verificatie

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~1 uur |
| Laag | Full-stack |
| Afhankelijkheid | Alle vorige fases |

## Doel

Volledige E2E verificatie dat het assets-per-rol systeem correct werkt over alle lagen.

## Verificatie Checklist

### Backend verificatie

- [ ] Upload asset met role=keeper → opgeslagen in `roles.keeper.images.*`
- [ ] Upload asset met role=player → opgeslagen in `roles.player.images.*`
- [ ] Process asset met role → S3-pad bevat role
- [ ] API response bevat `roles` in metadata
- [ ] Bestaande assets (pre-migratie) nog bereikbaar via correct pad

### Frontend verificatie

- [ ] MemberDetailPanel toont role tabs
- [ ] Switch rol → correcte assets getoond
- [ ] Upload per rol → verschijnt onder juiste tab
- [ ] AI generatie per rol → correcte tenue
- [ ] HubSelectieTab → asset dots per rol
- [ ] MemberSummarySheet → slots per rol

### Video verificatie

- [ ] Lineup met keeper → goalkeeper assets in video
- [ ] Lineup met spelers → home kit assets in video
- [ ] Fallback werkt als role-asset ontbreekt

### Regressie

- [ ] `pytest` — alle bestaande tests passed
- [ ] `npx tsc --noEmit` — geen TypeScript errors
- [ ] `npx vite build` — frontend build succesvol
- [ ] Bestaande members zonder roles → geen breaks

### Performance

- [ ] Geen extra API calls (role assets in bestaand membership endpoint)
- [ ] Serializer performance: geen N+1 op role lookups
- [ ] Frontend: geen re-renders bij role switch (memoization)

## Procedure

1. Run backend tests: `pytest tests/projects/test_role_assets.py -v`
2. Run full test suite: `pytest --tb=short`
3. Build frontend: `cd demo && npx tsc --noEmit && npx vite build`
4. Optioneel: Playwright E2E op demo.teamreel.app
5. Check Railway logs na deploy

## Acceptatiecriteria

- [ ] Alle checks hierboven groen
- [ ] Geen regressies in bestaande functionaliteit
- [ ] Performance acceptabel
