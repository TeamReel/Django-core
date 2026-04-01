# Q050 — Squad Readiness Dashboard

| | |
|---|---|
| Status | 📋 TODO |
| Bron | F35 Reverse Engineering Analyse |
| Impact | 🟡 important |
| Effort | ~10 uur |

## Wat
Squad-level overzicht van asset-completeness per seizoen. Gebruikers weten nu niet welke spelers klaar zijn voor video generatie — ze genereren onbewust video's met placeholder silhouetten.

## Checklist
- [ ] Backend: `GET /api/v1/projects/{id}/squad-readiness/` endpoint (period filter, per content_type)
- [ ] Backend: `SquadReadinessService` — itereer PM records, check `metadata.teamreel_assets` per kit
- [ ] Frontend: `SquadReadinessCard` component op SeasonSquadTab (progress bar + per-member status)
- [ ] Frontend: Pre-generation warning in MatchWizardV2 / ContentGenerationModal
- [ ] Tests
- [ ] Verify
