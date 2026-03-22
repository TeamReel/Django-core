# H5 — Polish & cleanup

| | |
|---|---|
| Status | TODO |
| Effort | ~3 uur |
| Blokkeerd door | H4 |

## Doel

Final polish: dead code opruimen, full accessibility audit, E2E test, desktop/mobile QA, en documentatie updaten.

## Taken

### 1. Dead code cleanup
- [ ] Verwijder `TeamDetailPage.tsx` als die alleen nog een legacy redirect was (of vereenvoudig tot 1-liner `<Navigate>`)
- [ ] Verwijder `SeasonDetailPage.tsx` als die alleen nog een legacy redirect is
- [ ] Clean up ongebruikte imports in `MyTeamHubPage.tsx` (old tab components, etc.)
- [ ] Verwijder de old `SeasonContentTab` import als die naar Beheer is verplaatst
- [ ] Check `routes.ts` op ongebruikte helpers

### 2. Accessibility audit (WCAG 2.1 AA)
- [ ] **Accordions**: `aria-expanded={isOpen}`, `aria-controls="panel-id"`, `id` op panel
- [ ] **SeasonSwitcher**: `aria-label="Seizoen selecteren"`, `aria-haspopup="listbox"`
- [ ] **Tab navigatie**: tab index volgorde logisch op keyboard
- [ ] **Touch targets**: alle klikbare elementen ≥ 44×44px (checken via browser devtools)
- [ ] **Focus indicators**: `:focus-visible` op alle buttons/links/rijen
- [ ] **Reduced motion**: alle transities in CSS hebben `@media (prefers-reduced-motion: reduce)` block
- [ ] **Kleurcontrast**: alle tekst ≥ 4.5:1 ratio (AA)
- [ ] **Screen reader test**: accordions kondigen state aan

### 3. Theme support verificatie
- [ ] Light theme: alle nieuwe componenten correct ✓
- [ ] Dark theme: alle nieuwe componenten correct (check met `data-theme="dark"`)
- [ ] Geen hardcoded kleuren — uitsluitend design tokens (`var(--app-*)`)
- [ ] Geen hardcoded spacing — uitsluitend tokens of grid (8pt)
- [ ] Test beide themes visueel op 375px + 1280px

### 4. E2E verificatie (Playwright MCP)
- [ ] **Mobile (375px)**:
  - Navigeer naar `/knvb/asc/helden-6`
  - Hub laadt met seizoen uit active context
  - Tap "Seizoenen" accordion → opent en toont seizoenen
  - Tap ander seizoen → data wisselt
  - Tap "Competities" accordion → toont competities
  - Tap "Assets" tab → tenue/sponsor/ledenfoto's zichtbaar
  - Bottom nav "Mijn Team" → navigeert correct
- [ ] **Desktop (1280px)**:
  - Alle tabs in sidebar zichtbaar
  - Assets tab: tenue + club assets + ledenfoto's
  - Beheer tab: content pipeline sectie aanwezig
  - Seizoenen/Competities accordions op Overview
- [ ] **Legacy URL**: `/knvb/asc/helden-6/2025-2026` → redirect naar 3-seg
- [ ] **0 console errors** in alle scenarios
- [ ] **Screenshot** van Overview tab (mobile + desktop) voor referentie

### 5. TypeScript & build verificatie
- [ ] `cd demo && npx tsc --noEmit` — 0 errors
- [ ] `npx vite build` — 0 errors, bundle size check (geen regressie)

### 6. Documentatie updaten
- [ ] `documents/05-demo/frontend-design/ux-flows.md` — voeg F24 team hub flow toe
- [ ] `documents/05-demo/ai-context-index.md` — update navigatie/routing sectie
- [ ] Module fases: verplaats H0-H5 van `phases/todo/` naar `phases/done/`
- [ ] Module status: zet op `✅ DONE` in `index.md`
- [ ] Git commit: conventioneel commit bericht voor F24

## Verificatie checklist

- [ ] `npx tsc --noEmit` clean
- [ ] `npx vite build` clean
- [ ] Playwright E2E: alle checks passed
- [ ] Light + dark theme visueel OK
- [ ] WCAG 2.1 AA: geen violations
- [ ] 0 console errors
- [ ] Docs bijgewerkt
- [ ] Fase-specs verplaatst naar `phases/done/`
- [ ] Module status → `✅ DONE`
- [ ] Git commit + push
