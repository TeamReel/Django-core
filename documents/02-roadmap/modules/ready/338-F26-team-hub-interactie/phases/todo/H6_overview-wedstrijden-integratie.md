# H6 — Overview Simplificatie & Wedstrijden Integratie

| | |
|---|---|
| Fase | H6 |
| Status | 📋 TODO |
| Effort | ~8 uur |
| Afhankelijkheid | H2 (done) |

## Wat

De Overview tab is nu te vol en competition-interactie werkt niet optimaal:

1. **Competition sheet opent te laag** — `CompetitionSummarySheet` is inline in `CompetitionGrid.tsx` en rendert onder de competition cards, waardoor het laag in het scherm verschijnt
2. **Season card is niet klikbaar** — Gebruiker kan niet doorklikken naar seizoen details
3. **Overview te druk** — Alle seasons, competities, wedstrijden en selectie tegelijk zichtbaar

### Gewenste situatie

- **Overview tab**: Alleen het actieve seizoen card + actieve competitie tonen. Compact, informatief.
- **Wedstrijden tab uitbreiden**: Season switcher, competition management (aanmaken/bewerken/verwijderen), en alle wedstrijden per competitie — alles geïntegreerd
- De Season card op Overview wordt een compacte "hero" die switchbaar is

## Technische analyse

### CompetitionSummarySheet positie
- **Locatie**: `CompetitionGrid.tsx` line ~107 — inline component
- Sheet rendert als absolute positioned element BINNEN de grid
- **Fix**: Verplaats naar een portal/overlay of gebruik `NavigationSheet` component

### Season click behavior
- **Locatie**: `SeasonSection.tsx` — `heroCard` div is niet klikbaar
- Season pills (andere seizoenen) roepen `onSeasonSwitch` aan — dat werkt
- Maar de actieve season hero card zelf is een niet-interactieve div

### Overview vereenvoudiging
- Huidig: SeasonSection + CompetitionGrid + Wedstrijden accordion + Selectie accordion + Team assets + Club assets + Beheer
- Gewenst: Compact seizoen card + compact competitie summary + asset accordions + beheer

### Wedstrijden tab uitbreiding
- `HubWedstrijdenTab.tsx` bestaat al met FAB + create modal
- Moet uitgebreid met: season context bar, competition filter/management, season switcher

## Checklist

- [ ] Overview tab simplificeren:
  - [ ] Compact seizoen card (klikbaar → opent seizoen detail of switcher)
  - [ ] Compact competitie summary (1-2 regels, niet full grid)
  - [ ] Asset accordions + Beheer accordion houden
  - [ ] Wedstrijden en Selectie accordions verwijderen van Overview (verplaatst naar eigen tabs)
- [ ] CompetitionSummarySheet: verplaatsen naar `NavigationSheet` overlay i.p.v. inline
- [ ] Wedstrijden tab uitbreiden:
  - [ ] Season context bar bovenaan (met switcher)
  - [ ] Competition sections met wedstrijden per competitie
  - [ ] Competition aanmaken/bewerken mogelijkheid
  - [ ] Season aanmaken mogelijkheid
- [ ] WCAG: focus management, aria-labels
- [ ] TypeScript 0 errors, Vite build success
