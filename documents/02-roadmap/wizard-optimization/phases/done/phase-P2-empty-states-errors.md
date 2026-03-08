# Phase P2 -- Lege Staten + Foutafhandeling

**Track:** P (Polish)
**Status:** Todo
**Effort:** Klein-Medium (1-2 sessies)
**Vereist:** Minimaal E1 + M1 afgerond

---

## Doel

Elke mogelijke lege of fout-staat in de CreateWizard heeft een duidelijke, helpende melding met een actie. Geen doodlopende schermen.

## Lege Staten Matrix

| Situatie | Melding | Actie |
|----------|---------|-------|
| Geen organisatie | "Je bent nog niet gekoppeld aan een organisatie" | Link naar instellingen |
| Geen club | "Voeg eerst een club toe aan [Org]" | -> M3 ProjectCreateFlow (club) |
| Geen team | "Maak je eerste team aan" | -> M3 ProjectCreateFlow (team) |
| Geen seizoen | "Start een seizoen om matches te plannen" | -> M4 PeriodCreateFlow |
| Geen matches | "Plan je eerste wedstrijd" | -> M1 MatchCreateFlow |
| Geen leden | "Voeg spelers toe aan je team" | -> M2 MemberAddFlow |
| Geen templates | "Templates worden geladen..." | Loading state / retry |
| API error | "Er ging iets mis. Probeer opnieuw." | Retry knop |
| Geen internet | "Controleer je internetverbinding" | Retry knop |

### Doorlink-principe
Elke lege staat linkt naar de juiste sub-flow BINNEN de wizard. De gebruiker hoeft de wizard niet te sluiten om een ontbrekend onderdeel aan te maken.

Voorbeeld flow:
1. Gebruiker kiest "Content genereren"
2. Geen matches gevonden
3. Wizard toont: "Nog geen wedstrijden. Plan je eerste wedstrijd"
4. Klik -> wizard navigeert naar MatchCreateFlow
5. Na match aanmaken -> terug naar content flow met nieuwe match

## Taken

### 1. EmptyState component voor wizard
- [ ] `components/CreateWizard/shared/WizardEmptyState.tsx`
- [ ] Props: `icon`, `title`, `description`, `action` (label + onClick)
- [ ] Consistent design met rest van de app

### 2. Lege staten per flow
- [ ] Content flow: geen matches -> link naar M1
- [ ] Match flow: geen team/seizoen -> link naar M3/M4
- [ ] Member flow: geen team -> link naar M3
- [ ] Period flow: geen team -> link naar M3

### 3. Error boundaries
- [ ] API errors: toast + retry knop in de stap
- [ ] Netwerk errors: offline-detectie + melding
- [ ] Validatie errors: inline per veld (niet alleen bij submit)

### 4. Loading states
- [ ] Skeleton loaders voor cascading selects
- [ ] Spinner voor API submits
- [ ] Optimistic updates waar mogelijk

### 5. Cross-flow navigatie
- [ ] "Maak eerst een [X] aan" knop navigeert naar juiste sub-flow
- [ ] Na aanmaken: automatisch terug naar oorspronkelijke flow met nieuwe data
- [ ] Breadcrumb of indicator: "Match aanmaken (vanuit Content)" zodat context duidelijk is

### 6. Verificatie
- [ ] Elk empty state scenario handmatig testen
- [ ] API error simuleren (netwerk uitzetten)
- [ ] Cross-flow navigatie: content -> match aanmaken -> terug naar content

## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/shared/WizardEmptyState.tsx` |
| WIJZIG | Alle flow-componenten (error/empty handling toevoegen) |
| WIJZIG | `demo/src/components/CreateWizard/CreateWizardProvider.tsx` (flow-stack voor cross-flow nav) |
