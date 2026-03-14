# 8pt Grid Alignment — Phase Overview

**Status:** ✅ Volledig afgerond (7/7 fases)
**Aangemaakt:** 2026-03-08
**Laatste update:** 2025-06-25

---

## Doel

Alle frontend CSS uitlijnen op het **8pt grid** (4px base unit) en design token gebruik afdwingen. Concreet:

1. **Spacing** — padding, margin, gap, border-radius, sizing → multiples van 4px
2. **Typography** — font-size schaal vereenvoudigen van 9 → 5 stappen, font-family tokenizen, line-height koppelen
3. **Kleuren** — alle hardcoded hex-waarden → design tokens (voor dark mode + theming)
4. **Guardrails** — lint regels om regressie te voorkomen

## Huidige staat

| Metric | Waarde |
|--------|--------|
| **Totale compliance** | 100% (spatial + kleuren) |
| **Token-laag** | 100% (spacing + radius + typography + kleuren) |
| **Utility CSS** | 100% |
| **Component CSS** | 100% spatial, 100% kleuren |
| **Guardrails** | Stylelint custom plugin (2 regels), 0 violations |
| **Resterend** | Geen — volledige compliance |

## Toegestane waarden (4px grid)

```
0  4  8  12  16  20  24  28  32  36  40  44  48  52  56  60  64  72  80  96  120  ...
```

**Uitzonderingen:**
- `1px` — borders, dividers, hairlines
- `2px` — drag indicators, micro-details (minimaliseren)
- Typography — eigen schaal, niet op grid geforceerd (maar bij voorkeur wel)

## Fasering

| Fase | Naam | Scope | Impact | Status |
|------|------|-------|--------|--------|
| **T1** | Token & Typography | 5-stappen font-size, font-family token, line-height koppeling, radius | Fundament | ✅ Done |
| **T2** | Utility Classes | utility.css off-grid spacing + deprecated font-size utils | ~40 fixes | ✅ Done |
| **K1** | Color Cleanup | Hardcoded hex → design tokens (181 vervangingen) | Dark mode + theming | ✅ Done |
| **C1** | Core Shell | Sidebar, MobileBottomNav, BottomSheet, TopNavbar | ~80 fixes | ✅ Done |
| **C2** | Wizard CSS | Wizard.module.css + CreateWizard.module.css | ~75 fixes | ✅ Done |
| **P1** | Page Styles | Dashboard, MatchDetail, AIStudio, overige pages | ~1200 fixes | ✅ Done |
| **G1** | Guardrails | Stylelint regels tegen off-grid px + hardcoded hex | Preventie | ✅ Done |

## Volgorde

```
T1 (tokens) → T2 (utilities) → K1 (kleuren) → C1 (shell) → C2 (wizard) → P1 (pages) → G1 (lint)
```

T1 en T2 eerst omdat ze de basis leggen. K1 daarna voor dark mode correctheid. C1/C2/P1 zijn onafhankelijk van elkaar (kunnen parallel). G1 als laatste om regressie te voorkomen.

## Snap-regels

Bij twijfel:

| Off-grid waarde | Snap naar | Rationale |
|-----------------|-----------|-----------|
| 2px | 4px (of behouden voor micro-details) | Soms nodig voor visueel |
| 3px | 4px | Altijd |
| 5px | 4px | Tighter |
| 6px | 4px of 8px | Context-afhankelijk |
| 7px | 8px | Altijd |
| 9px | 8px | Altijd |
| 10px | 8px of 12px | Context-afhankelijk |
| 11px | 12px | Altijd |
| 13px | 12px of 16px | Context-afhankelijk |
| 14px (spacing) | 12px of 16px | 16px als meer ruimte OK |
| 15px | 16px | Altijd |
| 17px | 16px of 20px | Context-afhankelijk |
| 22px | 20px of 24px | Context-afhankelijk |
| 50px | 48px of 52px | Nearest grid point |
| 57px | 56px | Nearest grid point |
| 65px | 64px | Nearest grid point |

## Visuele impact verwachting

De meeste snaps zijn 1-2px verschil. Gebruikers zullen het verschil niet bewust zien, maar het geheel voelt strakker en consistenter aan. Enige risicoplekken:
- **6px → 8px** op kleine gaps kan iets ruimer aanvoelen
- **10px → 12px** padding op inputs/banners — subtiel maar merkbaar
- **14px → 16px** card padding — kan iets luchtiger worden

Altijd visueel checken na elke fase.
