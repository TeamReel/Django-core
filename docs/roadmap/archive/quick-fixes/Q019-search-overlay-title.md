# Q019 — Search overlay: titel toevoegen in sheet header

| | |
|---|---|
| Status | ✅ DONE |
| Bron | UI/UX Review (Playwright) |
| Impact | 🟢 nice-to-have |
| Effort | ~30 min |

## Wat
De search overlay is de enige sheet/overlay zonder titel in de header.
Alle andere sheets hebben een duidelijke titel ("Profiel bewerken", "Queue", "Prullenbak", etc.).

**Gewenst**: Voeg "Zoeken" als titel toe aan de search overlay header, consistent met alle andere sheets.

## Checklist
- [x] Voeg titel "Zoeken" toe aan MobileSearchOverlay header
- [x] Consistent styling met andere sheet headers
- [ ] Verify via Playwright
