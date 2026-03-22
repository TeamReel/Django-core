# H10 — Breadcrumb Cleanup + Kleine UI Fixes

| | |
|---|---|
| Fase | H10 |
| Status | ✅ DONE |
| Effort | ~1 uur |
| Afhankelijkheid | H5 (done) |

## Wat

Diverse kleine UI-fixes op basis van review-feedback:

1. **← breadcrumb knop verwijderd** — De "← Club" breadcrumb bovenaan de hub is verwijderd. De hub is het root-destination, geen terug-navigatie nodig.
2. **Season context bar** — Wedstrijden tab toont nu de seizoensnaam bovenaan.
3. **Selectie verwijder-knop** — Admin ziet een rode `UserMinus`-knop per lid in de selectie.
4. **CompetitionSummarySheet** — Gebruikt nu `NavigationSheet` i.p.v. inline sheet (opent correct als side panel).
5. **Overview accordions** — Staan standaard ingeklapt.

## Voltooid

Alle items zijn gecommit in `3e62d03c` en breadcrumb removal in volgende commit.
