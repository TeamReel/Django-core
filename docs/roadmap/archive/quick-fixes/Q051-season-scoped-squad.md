# Q051 — Season-scoped Squad Everywhere

| | |
|---|---|
| Status | ✅ DONE |
| Bron | F35 Reverse Engineering Analyse |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
Dashboard lineup sheet en MatchWizardV2 halen alle project members op zonder seizoen-filter. Spelers van vorige seizoenen verschijnen in de lineup selector. Alleen Match Detail filtert op seizoen.

## Checklist
- [x] Frontend: `useLineupSheet.ts` — filter op `period` param uit match context
- [x] Frontend: `useSquadData.ts` (MatchWizardV2) — zelfde seizoen-filter
- [x] Backend: Controleer `ProjectMembershipViewSet` period filter support (was al aanwezig)
- [x] Fallback: members zonder period (general) verschijnen nog wel (fallback bij 0 resultaten)
- [x] Tests (4 backend tests voor period filtering)
- [x] Verify (23 tests pass, tsc clean, vite build clean)

## Implementatie

### Aanpak
Het reference pattern uit Match Detail (`useMatchDataFetching.ts`) hergebruikt: probeer eerst `?period=<seasonId>`, en als dat 0 resultaten geeft, retry zonder filter. De season UUID komt uit `match.period.parent_period.id`.

### Gewijzigde bestanden
| Bestand | Wijziging |
|---------|-----------|
| `demo/src/components/dashboard/useLineupSheet.ts` | Season filter + fallback |
| `demo/src/components/MatchWizardV2/hooks/useSquadData.ts` | Season filter + fallback |
| `demo/src/hooks/useActivities.ts` | `Activity.period` type uitgebreid met `parent_period` |
| `tests/projects/test_membership_api.py` | `TestMembershipPeriodFilter` class (4 tests) |

## Review
**Reviewer**: Code Review agent

### N+1 fix (bonus)
`ActivityViewSet.queryset` deed `select_related("period")` maar miste `"period__parent_period"`.
De serializer las `obj.period.parent_period` al, wat een extra DB query per activity veroorzaakte.
Gefixt door `"period__parent_period"` toe te voegen aan `select_related` in `src/activities/api/views.py`.

### Beoordeling
Implementatie correct en consistent met het bestaande match detail patroon. Alle 6 review dimensies passing.
