# Mobile-First App Design — Phase Overview

**Status:** Actief
**Gestart:** 2026-03-04
**Laatste update:** 2026-03-04
**Blueprint:** [mobile-app-blueprint.md](../../05-demo/frontend-design/mobile-app-blueprint.md)

---

## Doel

Premium, vloeiende mobile-first webapp. Best practices hergebruiken (geen wiel uitvinden). Bestaande modules en componenten maximaal benutten.

## Aanpak: Bottom-up opbouw

**Volgorde is essentieel.** We bouwen van fundament naar verfijning:

```
Layer 0: Shell         — MainLayout, TopNavbar, MobileBottomNav ✅ (al goed)
Layer 1: Page shells   — 5 core pages: responsive layout + CSS + data hooks
Layer 2: Navigation    — Tab routing, stack nav, back-button, deeplinks
Layer 3: Components    — Wizard, overlays, modals op mobile
Layer 4: Polish        — Animaties, gestures, haptics, thumbnails
```

Elke laag vertrouwt op de vorige. Geen polish (layer 4) bouwen op pagina's die niet responsive zijn (layer 1).

## Audit resultaat (2026-03-04)

| Component | CSS Module | Mobile CSS (@media) | Data Hook | Score |
|-----------|-----------|---------------------|-----------|-------|
| MainLayout | inline | ✅ JS breakpoints | — | **Goed** |
| TopNavbar | ✅ 877 ln | ✅ data-mobile | ✅ useTopNavbarData | **Goed** |
| MobileBottomNav | ✅ | ✅ | ✅ | **Goed** |
| DashboardPage | ✅ 53 ln | ❌ 0 breakpoints | ❌ Geen facade hook | **Zwak** |
| MatchDetailPage | ❌ Geen | ❌ | ✅ useMatchDetailData | **Zwak** |
| SeasonDetailPage | ✅ 238 ln | ❌ 0 breakpoints | ✅ useSeasonDetailPageData | **Zwak** |
| AIStudioPage/Gallery | wrapper | ❌ | ❌ | **Zwak** |
| ApprovalsPage | ✅ 619 ln | ❌ 0 breakpoints | ❌ Geen facade hook | **Zwak** |

**Conclusie:** Shell is sterk. Alle 5 core pages missen responsive CSS en sommige missen data hooks. Dat moet eerst.

## Tracks (nieuw — bottom-up)

| Track | Naam | Layer | Focus |
|-------|------|-------|-------|
| **P** | Page Foundations | 1 | Core pagina's mobile-ready maken (CSS + hooks + responsive) |
| **N** | Navigation | 2 | Tab routing, stack nav, back-flow, deeplinks |
| **W** | Wizard & Overlays | 3 | Wizard stappen, overlays, modals op mobile |
| **X** | Polish & Interactions | 4 | Animaties, gestures, haptics, thumbnails, transitions |

## Fase-overzicht

### ✅ Done (pre-restructure)

| Nr | Fase | Focus | Resultaat |
|----|------|-------|-----------|
| A1 | Skeleton shimmer | Loading states standaardiseren | 18 bestanden, 5 composites, 0 spinners |
| A2 | Empty states | SmartEmptyState consequent toepassen | 28 bestanden, 17 types |
| A3 | Post-generate flow | Success toast + shortcuts na generatie | Action toasts, queue badge optimistic update |

### 📋 Track P — Page Foundations (Layer 1)

Elke pagina krijgt dezelfde behandeling:
1. CSS Module met responsive breakpoints (`@media (max-width: 639px)`)
2. Facade data hook (`useXxxPageData()`) als dat nog ontbreekt
3. Mobile layout: single-column, juiste spacing, geen overflow
4. Touch targets ≥ 44px op alle interactieve elementen
5. 4-state pattern: loading / empty / error / success

| Nr | Pagina | Wat ontbreekt | Effort |
|----|--------|---------------|--------|
| P1 | **DashboardPage** | Responsive grid, facade hook, mobile card layout | Medium |
| P2 | **MatchDetailPage** | CSS Module maken, responsive tabs, content grid | Medium |
| P3 | **SeasonDetailPage** | Responsive breakpoints in CSS, overview cards mobile | Medium |
| P4 | **Gallery (AIStudio)** | Responsive grid, zoekbalk mobile, filter chips | Medium |
| P5 | **ApprovalsPage** | Facade hook, responsive job cards, filter mobile | Medium |

### 📋 Track N — Navigation (Layer 2)

| Nr | Focus | Wat | Effort |
|----|-------|-----|--------|
| N1 | **Bottom nav routing** | Audit 5 tabs, fix edge cases (no active match/season), fallback routes | Klein |
| N2 | **Stack nav + back** | Back-button hardware + UI consistent, breadcrumbs mobile compact | Klein |
| N3 | **Deeplinks** | `/matches/:id` → auto-select in bottom nav, share URLs werken mobile | Klein |
| N4 | **Overlay → full page** | "Bekijk alles →" links in NavbarQuickReview + Notifications | Klein |

### 📋 Track W — Wizard & Overlays (Layer 3)

| Nr | Focus | Wat | Effort |
|----|-------|-----|--------|
| W1 | **Wizard thumbnails** | Content-type cards met thumbnail previews in stap 3 | Medium |
| W2 | **Wizard review-stap** | Grotere preview + samenvatting vóór generatie | Medium |
| W3 | **Wizard error states** | Error/retry handling per wizard-stap | Klein |
| W4 | **Content detail page** | Full-size preview met video player + metadata | Medium |
| W5 | **Approval workflow UX** | Approve/reject flow met instant feedback | Medium |

### 📋 Track X — Polish & Interactions (Layer 4)

| Nr | Focus | Wat | Effort |
|----|-------|-----|--------|
| X1 | **Swipe-to-approve** | Swipe gestures in queue overlay | Medium |
| X2 | **Pull-to-refresh** | PullToRefresh op meer lijstpagina's | Klein |
| X3 | **Haptic feedback** | useHapticFeedback op meer interacties | Klein |
| X4 | **Page transitions** | Fade/slide animaties tussen pagina's | Medium |
| X5 | **Micro-interactions** | Hover, tap feedback, press states consequent | Klein |

## Volgorde van uitvoering

```
P1 → P2 → P3 → P4 → P5      (pagina's eerst: ~5 sessies)
  ↓
N1 → N2 → N3 → N4            (navigatie: ~2 sessies)
  ↓
W1 → W2 → W3 → W4 → W5      (wizard & content: ~3 sessies)
  ↓
X1 → X2 → X3 → X4 → X5      (polish: ~2-3 sessies)
```

Track P en N zijn **blokkerend** — pas als alle 5 pages responsive zijn en navigatie klopt, heeft wizard polish en animatie zin.

## Principes

1. **Bottom-up**: fundament eerst, polish laatst
2. **Mobile-first CSS**: base = mobile, `@media (min-width: 640px)` voegt desktop toe
3. **Facade hooks**: elke pagina heeft één `useXxxPageData()` hook
4. **CSS Modules met breakpoints**: responsive rules in `.module.css`, niet inline JS
5. **4 states per component**: loading → empty → error → success
6. **Bestaande componenten**: Skeleton, SmartEmptyState, MobileTabBar, BottomSheet, PullToRefresh
7. **Best practices kopiëren**: Instagram/YouTube/LinkedIn patronen voor mobile UX
8. **Touch targets ≥ 44px**: op alle interactieve elementen

## Effort

~12-13 sessies totaal (P: 5, N: 2, W: 3, X: 2-3).
