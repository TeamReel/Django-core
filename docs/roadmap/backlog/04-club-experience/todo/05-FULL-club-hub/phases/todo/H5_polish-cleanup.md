# H5 — A11y, E2E, docs & afronden

| | |
|---|---|
| Status | TODO |
| Effort | ~2 uur |
| Blokkeerd door | H0, H1, H2, H3, H4 |

## Doel

Kwaliteitsborging + documentatie voor de volledige Club Hub implementatie. TypeScript clean, WCAG 2.1 AA, E2E flows, docs bijgewerkt, module afgerond.

## Taken

### 1. TypeScript validatie

- [ ] Vanuit `demo/`: `npx tsc --noEmit` — nul fouten
- [ ] `npx vite build` — nul warnings/errors
- [ ] Alle nieuwe componenten: volledige type-annotaties, geen impliciet `any`
- [ ] Props interfaces geëxporteerd als nodig (`ClubHubPage`, `ClubBeheerTab`, etc.)

### 2. A11y audit

- [ ] **Focusorder**: tabvolgorde logisch voor alle 4 tabs
- [ ] **Landmarks**: `<main>`, `<nav aria-label="Club tabs">`, `<section aria-label="...">`
- [ ] **ARIA**: `aria-current="page"` op actieve tab, `aria-label` op icon-only knoppen
- [ ] **Touch targets**: alle interactieve elementen ≥ 44×44px
- [ ] `:focus-visible` op alle interactief elementen (buttons, links, tab-knoppen)
- [ ] Overflow menu: `aria-expanded`, `aria-haspopup`, `role="menu"` + `role="menuitem"`
- [ ] Dark mode: check `@media (prefers-color-scheme: dark)` op alle nieuwe CSS modules
- [ ] `@media (prefers-reduced-motion: reduce)` op alle animations en transitions
- [ ] Contrast check: tekst ≥ 4.5:1 (normaal), ≥ 3:1 (groot)

### 3. Responsiveness

- [ ] 375px (mobile): alle tabs bereikbaar, cards stapelen correct
- [ ] 768px (tablet): grid adapteert
- [ ] 1280px (desktop): layout maximale breedte + grid volledig
- [ ] Tab-balk: scroll horizontaal op mobiel als tabs niet passen

### 4. E2E Playwright tests

Testbestand: `demo/tests/club-hub.spec.ts`

**Flow 1: Navigate + tabs**
```
- Navigeer naar /:org/:club
- Verificeer: ClubHubPage geladen, default tab "Overview" actief
- Klik op "Assets" tab → AssetsTab verschijnt
- Klik op "Leden" tab → LedenTab verschijnt
- Klik op "Beheer" tab → BeheerTab verschijnt (als admin)
```

**Flow 2: TeamCard → Team Hub navigatie**
```
- Navigeer naar /:org/:club → Overview tab
- Klik op een TeamCard in de teams-grid
- Verificeer: navigeert naar /:org/:club/:team (Team Hub)
```

**Flow 3: Club lid admin role**
```
- Navigeer naar /:org/:club → "Leden" tab
- Verander rol van lid → Toast "Rol bijgewerkt" verschijnt
- Verificeer: rol badge is bijgewerkt (optimistic UI)
```

**Flow 4: TeamSwitcher (als beschikbaar via F24 H4)**
```
- Navigeer naar Team Hub
- Klik op TeamSwitcher
- Selecteer ander team → navigeert naar /:org/:club/:other-team
```

### 5. Documentatie bijwerken

- [ ] `documents/05-demo/ai-context-index.md` — voeg Club Hub route toe aan routering-sectie
- [ ] `documents/05-demo/architecture.md` — voeg Club Hub toe aan paginaoverzicht (als aanwezig)
- [ ] `documents/05-demo/frontend-design/ux-flows.md` — voeg Club Hub navigatieflow toe

Index.md entry voor routing:
```
| `/:org/:club` | ClubHubPage | Club overzicht (4 tabs: Overview, Assets, Leden, Beheer) |
```

### 6. Phase-management

- [ ] Kopieer `H0_scaffold.md` t/m `H4_beheer-tab.md` van `phases/todo/` naar `phases/done/`
- [ ] Verwijder originelen uit `phases/todo/`
- [ ] Kopieer dit bestand (`H5_polish-cleanup.md`) naar `phases/done/`
- [ ] Update `index.md` status → `✅ DONE`
- [ ] Verplaats module map van `active/` naar `done/`

## Verificatie

- [ ] `npx tsc --noEmit` — nul fouten
- [ ] `npx vite build` — succesvol
- [ ] E2E tests: alle 4 flows groen
- [ ] A11y: geen WCAG 2.1 AA violations (axe-core scan)
- [ ] Alle docs bijgewerkt
- [ ] Module status `✅ DONE` in index.md
- [ ] Map verplaatst naar `done/`
