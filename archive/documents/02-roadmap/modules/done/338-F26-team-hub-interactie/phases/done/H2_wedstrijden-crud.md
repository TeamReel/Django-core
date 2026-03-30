# H2 — Wedstrijden CRUD

| | |
|---|---|
| Status | TODO |
| Effort | ~6 uur |
| Blokkeerd door | — |

## Doel

Wedstrijden zijn volledig beheerbaar vanuit de hub: toevoegen via + knop, bewerken via tappable wedstrijd-items, verwijderen via swipe of overflow menu. De bestaande `HubWedstrijdenTab` heeft al FAB + create modal logica — dit moet doorgetrokken worden naar de Overview accordion en de wedstrijd-items zelf.

## Context

**Nu:**
- Overview: Wedstrijden accordion toont match-items (wedstrijd-titel + chevron)
- Wedstrijden tab: `HubWedstrijdenTab` heeft `setIsCreateMatchModalOpen` en FAB knop
- Tappen op wedstrijd in Overview → `setSelectedMatch(match)` → opent match detail
- **Geen** + knop op de Overview accordion
- **Bewerken** van wedstrijd vereist navigatie naar aparte pagina

**Na H2:**
- Overview Wedstrijden accordion krijgt + knop in de header
- Wedstrijden tab behoudt FAB
- Tappen op wedstrijd → opent edit sheet/modal (niet navigatie)
- Nieuw aangemakte wedstrijd verschijnt direct in de lijst

## Bestaande componenten

| Component | Pad | Functie |
|-----------|-----|---------|
| `HubWedstrijdenTab` | `demo/src/pages/identity/HubWedstrijdenTab.tsx` | Tab met FAB, `isCreateMatchModalOpen`, `handleCreateMatch` |
| `SeasonDetailModals` | `demo/src/pages/periods/SeasonDetailModals.tsx` | Modals voor match create/edit |
| `CompetitionGrid` | `demo/src/pages/identity/CompetitionGrid.tsx` | Competitie cards met match list in sheet |
| `CompetitionSummarySheet` | `demo/src/pages/identity/CompetitionGrid.tsx` | Match items per competitie |
| `MatchRecord` type | `demo/src/pages/periods/SeasonMatchesTab.tsx` | `{ id, slug, title, start_time, period_id, metadata }` |

## Taken

### 1. + knop op Wedstrijden accordion header
- [ ] Voeg een "+" icoon-button toe naast de chevron in de Wedstrijden accordion header
- [ ] `onClick` → `d.setIsCreateMatchModalOpen(true)` (hergebruik bestaande handler)
- [ ] Styling: subtiel, rechts naast label, voor de chevron
- [ ] `aria-label="Wedstrijd toevoegen"`
- [ ] Voorkom dat klik op + óók de accordion toggled (`e.stopPropagation()`)

### 2. Wedstrijd-items editable
- [ ] Tappen op wedstrijd in Overview accordion → opent match edit modal (niet navigatie)
- [ ] Gebruik `setSelectedMatch(match)` + aanvullende `isMatchEditMode` state
- [ ] Edit modal: pre-filled met bestaande match data (titel, datum, competitie, score, locatie)
- [ ] Save → PATCH naar `/activities/{id}/` → refresh matchlijst
- [ ] Delete optie in edit modal → `DELETE /activities/{id}/` → verwijdert uit lijst

### 3. CompetitionSummarySheet wedstrijden edit
- [ ] Wedstrijd-items in CompetitionSummarySheet ook editable (zelfde flow)
- [ ] `onMatchTap` callback hooked naar edit modal in plaats van navigatie

### 4. Create match flow
- [ ] `handleCreateMatch` → POST `/activities/` met `activity_type: 'match'`
- [ ] Na success: invalidate match queries → nieuwe wedstrijd verschijnt in lijst
- [ ] Auto-select competitie als er maar één competitie is
- [ ] Datum default: vandaag

### 5. Data refresh
- [ ] Na create/edit/delete: `refetch()` of invalidate React Query keys
- [ ] Accordion match count update na mutatie
- [ ] Loading state tijdens save

## Acceptatiecriteria

- [ ] + knop zichtbaar in Wedstrijden accordion header (Overview tab)
- [ ] + knop opent create modal met juiste defaults
- [ ] Tappen op bestaande wedstrijd opent edit modal (niet navigatie)
- [ ] Admin kan wedstrijd-gegevens wijzigen en opslaan
- [ ] Admin kan wedstrijd verwijderen (met confirm)
- [ ] Na create/edit/delete: match-lijst en counts refreshen live
- [ ] TypeScript 0 errors, build success
- [ ] focus-visible op + knop en alle interactieve items
