# Q036 — Grote Componenten Splitsen Ronde 3

| | |
|---|---|
| Status | 🔍 REVIEW |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~4 uur |

## Wat
8 componenten boven 400 regels opsplitsen in kleinere, onderhoudbare delen. Langere bestanden zijn foutgevoeliger en moeilijker te reviewen.

## Top 8 (regels)
1. `pages/identity/MyTeamHubPage.tsx` — 499
2. `pages/identity/directory/UsersListTable.tsx` — 481
3. `pages/activities/match-detail/MatchLineupField.tsx` — 441
4. `pages/periods/MemberAssetsTab.tsx` — 439
5. `components/dashboard/DashboardSummaries.tsx` — 436
6. `pages/SettingsPage.tsx` — 421
7. `pages/identity/useUserDetailData.tsx` — 416
8. `components/dashboard/ContentProgressCard.tsx` — 411

## Checklist
- [ ] Identificeer logical splits per component
- [ ] Extract sub-components met eigen props interfaces
- [ ] Maximaal 300 regels per component
- [ ] Tests blijven groen
- [ ] Verify: `pnpm exec tsc --noEmit` + `pnpm exec vite build`
