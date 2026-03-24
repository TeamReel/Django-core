# H0 — Accordion component + animatie

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | — |

## Doel

`AssetAccordion` als herbruikbaar component: open/close animatie, max-1-open logica, auto-scroll naar geopend item, en `prefers-reduced-motion` support. Checklist-rows worden tappable — klikken opent de accordion in plaats van navigeren naar MemberDetailPanel.

## Context

**Bestaande checklist** (`MemberSummarySheet.tsx`):
- `buildAssetChecklist()` genereert een array van `AssetItem[]` per lid
- Elke row heeft een `onClick` die nu navigeert naar MemberDetailPanel
- Na H0: `onClick` toggled de accordion open/dicht

**Patroon**: iOS-achtig — consistent met andere accordion-patronen in de hub.

## Taken

### 1. `AssetAccordion.tsx`

Locatie: `demo/src/features/members/components/AssetAccordion.tsx`

- [ ] Props: `isOpen`, `onToggle`, `children`
- [ ] `max-height` transition animatie (CSS-only, geen JS height measurement)
- [ ] `overflow: hidden` wanneer collapsed
- [ ] `@media (prefers-reduced-motion: reduce)` → geen animatie, direct open/dicht
- [ ] `useRef` + `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` na open
- [ ] `aria-expanded` op de trigger row
- [ ] `role="region"` + `aria-labelledby` op het accordion paneel

### 2. `AssetAccordion.module.css`

- [ ] `.accordion` — basis container
- [ ] `.accordion[data-open="true"]` — max-height transition
- [ ] `.accordionContent` — padding, spacing
- [ ] Alleen `var(--app-*)` tokens — geen hardcoded kleuren
- [ ] Smooth transition: `max-height 300ms ease-out`
- [ ] `prefers-reduced-motion: reduce` → `transition: none`

### 3. Checklist-row aanpassing (`MemberSummarySheet.tsx`)

- [ ] `onClick` per row → toggle `openAccordionId` state (max 1 open)
- [ ] Verwijder navigatie naar MemberDetailPanel bij klik op checklist-row
- [ ] "Bewerken" knop verwijderen (wordt overbodig)
- [ ] `openAccordionId` state in MemberSummarySheet: `string | null`
- [ ] Elke row rendert `<AssetAccordion isOpen={openId === itemId}>` als child

### 4. Tests

- [ ] Visuele check: accordion opent/sluit smooth
- [ ] Max 1 open: openen van B sluit A
- [ ] Reduced-motion: geen animatie
- [ ] Touch target ≥ 44×44px op elke row
- [ ] `aria-expanded` togglet correct
