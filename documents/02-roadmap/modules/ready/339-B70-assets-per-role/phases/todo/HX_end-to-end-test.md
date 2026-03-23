# HX — End-to-End Test & Verificatie

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~1 uur |
| Laag | Full-stack |
| Afhankelijkheid | Alle vorige fases |

## Verificatie Checklist

### Variant nesting

- [ ] Upload intro → opgeslagen als `videos.intro.home.default`
- [ ] Upload tweede intro variant → opgeslagen als `videos.intro.home.arms_crossed`
- [ ] Alle varianten ophaalbaar via `get_all_variants()`
- [ ] Geen `split("_", 1)` meer in asset code
- [ ] S3 pad: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`

### Role scoping

- [ ] Upload als keeper → `roles.keeper.images.*`
- [ ] Upload als speler → `roles.player.images.*`
- [ ] Switch rol in UI → correcte assets getoond
- [ ] AI generatie met role context → juiste tenue

### Backward compat

- [ ] Bestaande data (pre-migratie) leesbaar via fallback
- [ ] Members zonder rollen → geen breaks

### Regressie

- [ ] `pytest` — alle tests passed
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx vite build` — success
- [ ] Video lineup correct met role-based assets

### Performance

- [ ] Geen extra API calls
- [ ] Geen N+1 op role lookups
- [ ] Frontend: geen onnodige re-renders

## Procedure

1. `pytest tests/projects/test_role_assets.py -v`
2. `pytest --tb=short`
3. `cd demo && npx tsc --noEmit && npx vite build`
4. Optioneel: Playwright E2E
5. Railway logs check na deploy
