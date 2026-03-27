# Q016 — Create Wizard: terug-knop in stap 2+

| | |
|---|---|
| Status | ✅ DONE |
| Bron | UI/UX Review (Playwright) |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
De Create Content wizard (via + FAB) heeft alleen een × close in stap 2+.
Als je per ongeluk doorklikt naar "Kies wedstrijd", moet je de hele wizard opnieuw starten.

**Gewenst**: ← terug-knop naar vorige stap, naast de × close.

## Checklist
- [x] Voeg `onBack` prop toe aan CreateWizard stap-componenten
- [x] Render ← Vorige knop in wizard header wanneer stap > 1
- [x] Gebruik NavigationSheet's bestaande `onBack` pattern
- [ ] Tests
- [ ] Verify via Playwright
