# Phase C1 -- Smart Match (< 48u Auto-highlight)

**Track:** C (Content / Smart)
**Status:** Todo
**Effort:** Medium (2 sessies)
**Vereist:** E1 afgerond (CreateWizard bestaat)

---

## Doel

Als de gebruiker "Content genereren" kiest, toon automatisch de eerstvolgende match (< 48 uur) bovenaan met 1-tap bevestiging. De rest van de matches verschijnt eronder. Dit is de meest voorkomende use case: snel content maken voor de aankomende wedstrijd.

## Logica

```
IF matches_within_48h.length === 1:
  -> Highlight die match, 1-tap "Ga door"
  -> Rest van matches eronder (collapsed)

IF matches_within_48h.length > 1:
  -> Alle < 48u matches highlighted
  -> Gebruiker kiest er 1

IF matches_within_48h.length === 0:
  -> Geen highlight, toon alle aankomende matches
  -> Fallback: "Geen aankomende match -- kies er een of maak er een aan"
```

## UI Ontwerp

### Highlighted Match Card (< 48u)
```
+-------------------------------------------+
|  [Calendar icon]                          |
|  vs. FC Tegenstander                      |
|  Za 14 dec - 14:30 - Sportpark           |
|                                           |
|  [Ga door ->]                    pre-match |
+-------------------------------------------+
```

- Visueel onderscheid: accent border, grotere kaart
- Badge: "Over 6 uur" / "Morgen 14:30" (relatieve tijd)
- Fase-indicatie: pre-match / post-match (C2 bouwt hierop voort)
- 1-tap: klik op de kaart of "Ga door" knop

### Overige matches (scrollable lijst)
- Kleiner, minder emphasis
- Datum + tegenstander + locatie
- Klikbaar om te selecteren

## Taken

### 1. useSmartMatch hook
- [ ] `hooks/useSmartMatch.ts`
- [ ] Fetch upcoming matches voor actief team/seizoen (bestaande API)
- [ ] Filter: < 48 uur
- [ ] Sort: dichtstbijzijnde eerst
- [ ] Return: `{ highlighted: Match[], upcoming: Match[], loading }`

### 2. SmartMatchStep component
- [ ] `components/CreateWizard/steps/SmartMatchStep.tsx`
- [ ] Rendert highlighted match card(s) bovenaan
- [ ] Scrollable lijst met overige matches eronder
- [ ] Klik op match -> opslaan in CreateWizardProvider state -> volgende stap
- [ ] "Geen match? Maak er een aan" link (-> M1 MatchCreateFlow)

### 3. Integratie in content flow
- [ ] Na "Content genereren" keuze -> SmartMatchStep als eerste sub-stap
- [ ] Na match selectie -> fase selectie (C2) of direct template keuze

### 4. Lege staat
- [ ] Geen team geselecteerd: toon team-selectie eerst
- [ ] Geen seizoen actief: hint "Maak eerst een seizoen aan"
- [ ] Geen matches: "Plan je eerste wedstrijd" (-> M1)

### 5. Verificatie
- [ ] Match < 48u: wordt gehighlight met prominente kaart
- [ ] Meerdere matches < 48u: alle gehighlight, keuze nodig
- [ ] Geen matches < 48u: normale lijst, geen highlight
- [ ] 1-tap op highlighted match gaat naar volgende stap

## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/hooks/useSmartMatch.ts` |
| NIEUW | `demo/src/components/CreateWizard/steps/SmartMatchStep.tsx` |
| WIJZIG | `demo/src/components/CreateWizard/CreateWizardProvider.tsx` |
