# H1 — Wedstrijden tab iOS-list

> **Effort:** ~2.5 uur | **Impact:** Wedstrijden tab omgebouwd naar clean iOS-stijl lijst

## To do

### Groepering en data

- [ ] Wedstrijden splitsen in twee categorieën:
  - "Komend" — max 3 eerstvolgende wedstrijden zonder score
  - Per maand — gespeelde wedstrijden, nieuwste maand bovenaan
- [ ] Groepeer-logica: `groupMatchesByMonth()` utility:
  - Input: array van Activities (type=match)
  - Output: `{ upcoming: Activity[], months: { label: string, matches: Activity[] }[] }`
  - "Komend" sectie leeg als geen toekomstige wedstrijden

### Wedstrijd rows

- [ ] Elke wedstrijd-row als `ListSection.Row` (hergebruik uit H0):
  - Datum links (`Calendar` icon bij "Komend" rows)
  - Teamnamen (thuis - uit) als label
  - Gespeeld: score badge rechts in clubkleuren
  - Komend: `ChevronRight` rechts
- [ ] Score badge component:
  - Kleine badge met score ("2-1"), achtergrondkleur via brand tokens
  - Geen score bij komende wedstrijden

### Navigatie en acties

- [ ] Tap op wedstrijd-row -> `navigate()` naar `MatchDetailPage` (bestaand)
- [ ] Back-button context via `useSetBackNavigation()` (terug naar Mijn Team)
- [ ] Admin FAB (+) knop onderaan:
  - Floating action button voor "Wedstrijd toevoegen"
  - Navigeert naar bestaande create-flow
  - Alleen zichtbaar voor admins

### Layout

- [ ] `ListSection` per groep: "KOMEND", "MAART 2026", "FEBRUARI 2026", etc.
- [ ] Geen expandable accordions — flat list met navigatie naar detail
- [ ] Werkt op alle viewports

## Done criteria

- [ ] "Komend" sectie toont max 3 toekomstige wedstrijden
- [ ] Gespeelde wedstrijden grouped per maand, nieuwste eerst
- [ ] Score badges zichtbaar bij gespeelde wedstrijden
- [ ] Tap op wedstrijd navigeert naar MatchDetailPage, back-button werkt
- [ ] Admin ziet FAB (+) knop, non-admins niet
- [ ] Geen expandable accordions meer
- [ ] Touch targets >= 44x44px, `:focus-visible`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
