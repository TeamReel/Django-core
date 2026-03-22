# H4 — Accordion UX & Beheer In-Page

| | |
|---|---|
| Fase | H4 |
| Status | ✅ DONE |
| Effort | ~3 uur |
| Afhankelijkheid | H0–H3 (done) |

## Wat

Twee verbeteringen aan de Overview tab:

1. **Wedstrijden en Selectie standaard dichtgeklapt** — Ze staan nu default open, waardoor de overview te lang is. Alleen Seizoen en Competities card moeten direct zichtbaar zijn.

2. **Team instellingen → in-page credits/balance** — "Team instellingen" in de Beheer accordion navigeert nu naar de Beheer tab (`navigateToTab('beheer')`). Dit moet vervangen worden door een in-page credits & balance weergave, zonder weg te navigeren.

## Technische analyse

### Accordion default state
- **Locatie**: `MyTeamHubPage.tsx` line 167
- **Huidig**: `new Set(['wedstrijden', 'selectie'])` → beide open
- **Gewenst**: `new Set([])` → alles dicht

### Team instellingen
- **Locatie**: `MyTeamHubPage.tsx` line 687
- **Huidig**: `onClick={() => navigateToTab('beheer')}` → switcht naar Beheer tab
- **Gewenst**: Open een in-page sheet/card met credits balance info
- **Hergebruik**: `creditsApi.getProjectBalance()` is al geïmporteerd (H1), `TeamCreditsTab` component bestaat al (`./detail/TeamCreditsTab.tsx`)

## Checklist

- [ ] `expandedSections` default state wijzigen naar `new Set([])` (alles dicht)
- [ ] "Team instellingen" onClick: open in-page credits/balance sheet i.p.v. `navigateToTab('beheer')`
- [ ] Credits balance sheet tonen met: saldo, verbruik, opwaardeer-link
- [ ] Sheet is een `NavigationSheet` of inline card, geen tab-navigatie
- [ ] "Competities" item in Beheer: ook in-place handling (of verwijderen, want Competition management gaat naar Wedstrijden tab in H6)
- [ ] TypeScript 0 errors, Vite build success
