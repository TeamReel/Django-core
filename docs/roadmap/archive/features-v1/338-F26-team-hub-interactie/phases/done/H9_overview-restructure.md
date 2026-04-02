# H9 — Overview Herstructureren: Wedstrijden Tab Merge

| | |
|---|---|
| Fase | H9 |
| Status | 📋 TODO |
| Effort | ~8 uur |
| Afhankelijkheid | H6 (asset fix), H8 (member inpage) |

## Wat

De Overview tab is te vol en de interactie met seasons/competities werkt niet intuïtief. De gebruiker wil:

1. **Overview compacter** — Alleen actieve season + actieve competitie tonen, niet alles tegelijk
2. **Seasons + competities → Wedstrijden tab** — Season switching, competition management en wedstrijden horen bij elkaar
3. **Breadcrumb (← knop) weg** — ✅ Al verwijderd

### Huidige Overview structuur
```
SeasonSection (hero card + pills)
CompetitionGrid (alle competities als cards)
Wedstrijden accordion
Selectie accordion
Team assets accordion
Club assets accordion (admin)
Beheer accordion (admin)
```

### Gewenste Overview
```
Volgende wedstrijd hero (bestaand, goed)
Compact seizoen info (naam + status, klikbaar → detail)
Compact samenvatting (X wedstrijden, Y leden, Z competities)
Team assets accordion (bestaand)
Club assets accordion (admin, bestaand)
Beheer accordion (admin, bestaand)
```

### Gewenste Wedstrijden tab
```
Season context bar (naam + switcher)        ← al gebouwd (H5)
Competition filter bar (tabs of pills per competitie)
Wedstrijden per competitie (grouped list)
Competition management (aanmaken/bewerken)   ← admin only
Season aanmaken                              ← admin only
```

## Technische aanpak

### Overview simplificatie
- `SeasonSection` vervangen door compact blok (1 kaart, geen pills)
- `CompetitionGrid` verwijderen van Overview → verplaats naar Wedstrijden tab
- Wedstrijden + Selectie accordions al standaard ingeklapt (✅ done)

### Wedstrijden tab uitbreiding
- `HubWedstrijdenTab.tsx` uitbreiden met:
  - Competition filter (toggle per competitie)
  - Competition cards of pills boven de wedstrijdenlijst
  - Admin: + knop voor competitie aanmaken
  - Admin: season aanmaken

### Bestanden
- `demo/src/pages/identity/MyTeamHubPage.tsx` — Overview tab vereenvoudigen
- `demo/src/pages/identity/HubWedstrijdenTab.tsx` — uitbreiden met competitions
- `demo/src/pages/identity/SeasonSection.tsx` — compacter maken of vervangen
- `demo/src/pages/identity/CompetitionGrid.tsx` — verplaatsen naar Wedstrijden tab

## Checklist

- [ ] Overview: SeasonSection → compact seizoen-info card
- [ ] Overview: CompetitionGrid verwijderen (verplaatst naar Wedstrijden)
- [ ] Wedstrijden tab: competition filter bar toevoegen
- [ ] Wedstrijden tab: wedstrijden gegroepeerd per competitie
- [ ] Wedstrijden tab: competition aanmaken/bewerken (admin)
- [ ] Wedstrijden tab: season aanmaken mogelijkheid (admin)
- [ ] WCAG: focus management, aria-labels
- [ ] TypeScript 0 errors, Vite build success
