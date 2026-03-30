# Q012 — Progress counter mismatch lijst vs sheet

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review F27 iteratie 2 — Playwright 24-03-2026 |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat

De **Selectie-lijst** toont 5 progress-dots per lid (Upload, In tenue, Close-up, Short intro, Celebration).

De **MemberSummarySheet** toont 6 asset-slots: Fullbody, Close-up, Intro, Celebration, Then vs Now, Actiefoto.

Dit is verwarrend: een lid kan "5/5 compleet" zijn in de lijst, maar "5/6" in het detail-sheet. De gebruiker ziet een groen vinkje in de lijst en vervolgens een onvolledig profiel in het sheet.

## Gewenste situatie

De twee weergaven tellen dezelfde assets. Opties:

**A) Lijst updaten naar 6 dots** — consistent met het summary sheet
**B) Sheet updaten naar 5** — Then vs Now en Actiefoto zijn nice-to-have, niet verplicht
**C) Twee niveaus tonen** — "Basis compleet (5/5)" + "Bonus: 1/2 extra"

★ Aanbeveling: **A** — de lijst moet alle 6 assets tellen zodat completeness klopt met het sheet.

## Checklist
- [ ] Identificeer de progress-logica in de lijstweergave
- [ ] Align met `getAssetSections()` telling in MemberSummarySheet
- [ ] Progress dots of bar updaten naar 6 items
- [ ] Tooltip/legend updaten met alle 6 asset-namen
- [ ] Verify: een lid met 5/6 assets toont niet "compleet" in de lijst
- [ ] Tests updaten
