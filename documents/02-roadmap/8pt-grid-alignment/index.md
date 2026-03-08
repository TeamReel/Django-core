# 8pt Grid Alignment — Phase Overview

**Status:** Gepland
**Aangemaakt:** 2026-03-08
**Laatste update:** 2026-03-08

---

## Doel

Alle frontend CSS uitlijnen op het **8pt grid** (4px base unit). Alle spacing, padding, margin, gap, border-radius en sizing moeten multiples zijn van 4px. Typography is het enige waar bewust wordt afgeweken (standaard typografische schaal).

## Huidige staat

| Metric | Waarde |
|--------|--------|
| **Totale compliance** | ~62% |
| **Token-laag** | 100% (spacing + radius) |
| **Utility CSS** | ~66% |
| **Component CSS** | ~52-71% |
| **Grootste overtreders** | 6px (30+×), 10px (25+×), 14px padding (18×) |

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
| **T1** | Token & Typography | tokens.css typography + radius | Fundament | 🔲 Todo |
| **T2** | Utility Classes | utility.css off-grid values | ~40 fixes | 🔲 Todo |
| **C1** | Core Shell | Sidebar, MobileBottomNav, BottomSheet | ~30 fixes | 🔲 Todo |
| **C2** | Wizard CSS | Wizard.module.css + CreateWizard.module.css | ~40 fixes | 🔲 Todo |
| **P1** | Page Styles | Dashboard, MatchDetail, AIStudio, overige pages | ~35 fixes | 🔲 Todo |
| **G1** | Guardrails | Stylelint regel tegen off-grid hardcoded px | Preventie | 🔲 Todo |

## Volgorde

```
T1 (tokens) → T2 (utilities) → C1 (shell) → C2 (wizard) → P1 (pages) → G1 (lint)
```

T1 en T2 eerst omdat ze de basis leggen. C1/C2/P1 zijn onafhankelijk van elkaar (kunnen parallel). G1 als laatste om regressie te voorkomen.

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
