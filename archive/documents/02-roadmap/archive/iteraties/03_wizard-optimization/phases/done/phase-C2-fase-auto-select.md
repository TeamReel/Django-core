# Phase C2 -- Fase Auto-select (Pre/Post/Live)

**Track:** C (Content / Smart)
**Status:** Todo
**Effort:** Klein (1 sessie)
**Vereist:** C1 afgerond (SmartMatchStep bestaat)

---

## Doel

Na het selecteren van een match, automatisch de juiste content-fase selecteren op basis van het tijdstip. De gebruiker ziet de juiste tab al actief staan maar kan handmatig wisselen.

## Logica

```
match_datetime = match.start_time

IF now < match_datetime - 2h:
  -> fase = "pre-match"
  -> Templates: lineup, preview, aankondiging

IF match_datetime - 2h <= now <= match_datetime + 3h:
  -> fase = "live"
  -> Templates: score update, highlights

IF now > match_datetime + 3h:
  -> fase = "post-match"
  -> Templates: samenvatting, stats, man of the match

IF match.start_time is NULL:
  -> fase = "pre-match" (default)
  -> Hint: "Stel een aanvangstijd in voor betere suggesties"
```

## UI Ontwerp

### Fase-tabs
```
+------------------------------------------+
|  [Pre-match]  |  [Live]  |  [Post-match] |
+------------------------------------------+
|                                          |
|  (Templates voor geselecteerde fase)     |
|                                          |
+------------------------------------------+
```

- Auto-geselecteerde tab heeft accent styling
- Badge op auto-geselecteerde tab: "Aanbevolen" of "Nu relevant"
- Wisselen van tab is direct (geen extra API call nodig)

### Fase -> Template mapping
Komt voort uit bestaande `ContentTemplate` model. Elke template heeft een `phase` veld.

## Taken

### 1. useMatchPhase hook
- [ ] `hooks/useMatchPhase.ts`
- [ ] Input: `match.start_time`
- [ ] Output: `{ phase: 'pre-match' | 'live' | 'post-match', confidence: 'auto' | 'fallback' }`
- [ ] Grenswaarden: -2h = pre->live, +3h = live->post

### 2. PhaseSelectStep component
- [ ] `components/CreateWizard/steps/PhaseSelectStep.tsx`
- [ ] 3 tabs: pre-match, live, post-match
- [ ] Auto-select op basis van useMatchPhase
- [ ] Toont templates per fase (hergebruik bestaande template rendering)

### 3. Integratie
- [ ] SmartMatchStep -> PhaseSelectStep -> Template keuze
- [ ] Phase opslaan in CreateWizardProvider state

### 4. Verificatie
- [ ] Match morgen 14:30 -> pre-match tab actief
- [ ] Match 1 uur geleden -> live tab actief
- [ ] Match gisteren -> post-match tab actief
- [ ] Handmatig wisselen werkt

## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/hooks/useMatchPhase.ts` |
| NIEUW | `demo/src/components/CreateWizard/steps/PhaseSelectStep.tsx` |
| WIJZIG | `demo/src/components/CreateWizard/CreateWizardProvider.tsx` |
