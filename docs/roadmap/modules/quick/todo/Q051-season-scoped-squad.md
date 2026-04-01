# Q051 — Season-scoped Squad Everywhere

| | |
|---|---|
| Status | 📋 TODO |
| Bron | F35 Reverse Engineering Analyse |
| Impact | 🟡 important |
| Effort | ~6 uur |

## Wat
Dashboard lineup sheet en MatchWizardV2 halen alle project members op zonder seizoen-filter. Spelers van vorige seizoenen verschijnen in de lineup selector. Alleen Match Detail filtert op seizoen.

## Checklist
- [ ] Frontend: `useLineupSheet.ts` — filter op `period` param uit match context
- [ ] Frontend: `useSquadData.ts` (MatchWizardV2) — zelfde seizoen-filter
- [ ] Backend: Controleer `ProjectMembershipViewSet` period filter support
- [ ] Fallback: members zonder period (general) verschijnen nog wel
- [ ] Tests
- [ ] Verify
