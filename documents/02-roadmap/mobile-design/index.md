# Mobile-First App Design — Phase Overview

**Status:** Actief
**Gestart:** 2026-03-04
**Laatste update:** 2026-03-04
**Blueprint:** [mobile-app-blueprint.md](../../05-demo/frontend-design/mobile-app-blueprint.md)

---

## Doel

Premium, vloeiende mobile-first webapp. Best practices hergebruiken (geen wiel uitvinden). Bestaande modules en componenten maximaal benutten.

## Tracks

| Track | Naam | Focus |
|-------|------|-------|
| **A** | Foundation | Loading states, empty states, success flows, overlay navigation |
| **B** | Wizard Polish | Thumbnails, review-stap, error/retry per stap |
| **C** | Page Refinement | Gallery, Season, Match detail, Dashboard verbeteren |
| **D** | Advanced Interactions | Swipe gestures, pull-to-refresh, haptics, transitions |
| **E** | Content Flow | Post-generate UX, approval shortcuts, content preview |

## Fase-overzicht

### ✅ Done

| Nr | Track | Fase | Focus | Resultaat |
|----|-------|------|-------|-----------|
| A1 | A | Skeleton shimmer | Loading states standaardiseren | 18 bestanden gemigreerd, 5 page-level composites, 0 spinners over |
| A2 | A | Empty states | SmartEmptyState consequent toepassen | 28 bestanden, 17 types, 25+ locaties gemigreerd |

### 📋 Planned

| Nr | Track | Fase | Focus | Effort |
|----|-------|------|-------|--------|
| A3 | A+E | Post-generate flow | Success toast + shortcuts na content generatie | Klein |
| A4 | A | Overlay navigation | "Bekijk alles →" links in alle overlay modals | Klein |
| B1 | B | Wizard thumbnails | Content-type cards met thumbnail previews | Medium |
| B2 | B | Wizard review-stap | Grotere preview + samenvatting vóór generatie | Medium |
| B3 | B | Wizard error states | Error/retry handling per wizard-stap | Klein |
| C1 | C | Gallery zoekbalk | Dedicated search field bovenaan Gallery page | Klein |
| C2 | C | Season highlights | Actieve competitie + eerstvolgende match prominent | Medium |
| C3 | C | Match content grid | Content preview thumbnails op match detail | Medium |
| C4 | C | Dashboard upgrade | Activity feed verbeteren + quick action cards | Groot |
| D1 | D | Swipe-to-approve | Swipe gestures in queue overlay | Medium |
| D2 | D | Pull-to-refresh | PullToRefresh op meer lijstpagina's | Klein |
| D3 | D | Haptic feedback | useHapticFeedback op meer interacties | Klein |
| D4 | D | Page transitions | Fade/slide animaties tussen pagina's | Medium |
| E1 | E | Content detail page | Full-size preview met video player + metadata | Medium |
| E2 | E | Approval workflow UX | Approve/reject flow met instant feedback | Medium |

## Principes

1. **Mobile-first**: base CSS = mobile, breakpoints voegen complexity toe
2. **Bestaande componenten hergebruiken**: Skeleton, SmartEmptyState, BottomSheet, MobileTabBar, design-system
3. **Best practices, geen uitvinden**: patronen van Instagram/YouTube/LinkedIn kopiëren
4. **Progressive disclosure**: toon eerst het minimum, onthul details op interactie
5. **4 states per component**: loading → empty → error → success
6. **Consistent tokens**: spacing (4px grid), typografie (9 sizes), kleuren (semantic)

## Relatie met frontend-refactoring

De [frontend-refactoring roadmap](../frontend-refactoring/index.md) (46 fasen) heeft de **technische basis** gelegd:
- Track A: Token system + utilities + CSS Modules
- Track B: Page decomposition (<500 regels per bestand)
- Track C+D: UI Primitives + design token scale
- Track E: Inline style elimination
- Track F: Mobile-first polish (touch targets, gestures, navigation)

Deze mobile-design roadmap **bouwt daarop voort** met UX-gedreven verbeteringen:
- Niet meer "code opruimen" maar "experience bouwen"
- Focus verschuift van technische schuld → gebruikerswaarde

## Effort

~8-10 sessies totaal (A: 2, B: 2, C: 2-3, D: 1-2, E: 1).
