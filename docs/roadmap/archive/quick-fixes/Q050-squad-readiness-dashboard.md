# Q050 — Squad Readiness Dashboard

| | |
|---|---|
| Status | ✅ DONE |
| Bron | F35 Reverse Engineering Analyse |
| Impact | 🟡 important |
| Effort | ~10 uur |

## Wat
Squad-level overzicht van asset-completeness per seizoen. Gebruikers weten nu niet welke spelers klaar zijn voor video generatie — ze genereren onbewust video's met placeholder silhouetten.

## Checklist
- [x] Backend: `GET /api/v1/projects/{id}/members/squad-readiness/` endpoint (kit_type filter)
- [x] Backend: Itereer PM records, check `metadata.teamreel_assets` per kit via `check_member_kit_readiness()`
- [x] Frontend: `SquadReadinessCard` upgraded met `ReadinessRing` progress + per-member status
- [x] Frontend: Pre-generation warning in MatchWizardV2 ReviewStep
- [x] Tests (8 backend tests voor squad-readiness endpoint)
- [x] Verify (pytest, tsc, vite build)

## Review
- Reviewed + security fix applied: `_check_can_view_members()` was missing on the action
- Added unauthenticated access regression test
- 19/19 tests pass, tsc clean, vite build clean
