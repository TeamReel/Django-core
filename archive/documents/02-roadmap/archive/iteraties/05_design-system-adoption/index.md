# Design System Adoption — Phase Overview

**Status:** ✅ Voltooid (11/11 fases)
**Aangemaakt:** 2026-03-08
**Laatste update:** 2026-03-08

---

## Doel

De design tokens die in `tokens.css` gedefinieerd zijn daadwerkelijk **overal toepassen**, en ontbrekende premium UX-patronen toevoegen. Momenteel gebruikt ~89% van de codebase nog hardcoded waarden terwijl tokens beschikbaar zijn.

## Huidige staat

| Metric | Waarde |
|--------|--------|
| **Token adoptie** | ~11% (975 van ~8.675 declaraties) |
| **Spacing tokens** | ~90% adoptie (2.111 gefixt, rest = neg/off-grid/mixed) |
| **Font-size tokens** | ~95% adoptie (900 gefixt, rest = 8-9px/28px+/hero) |
| **Font-weight tokens** | 3.0% adoptie (19 / 629) |
| **Border-radius tokens** | ~99% adoptie (707 gefixt) |
| **Motion tokens** | ~95% adoptie (234 gefixt, rest = none/keyframes/linear) |
| **Shadow tokens** | ~85% adoptie (28 gefixt, rest = none/focus/directional) |
| **Line-height tokens** | ~95% adoptie (112 gefixt) |
| **Premium UX patronen** | 17/28 aanwezig, 11 ontbreken |

## Fasering

| Fase | Naam | Scope | Waarden | Effort | Status |
|------|------|-------|---------|--------|--------|
| **Q1** | Quick Wins (base.css) | `::selection`, `scroll-padding`, `overscroll-behavior`, `text-rendering`, `prefers-color-scheme`, `content-visibility`, `--border-default` token | — | 30 min | ✅ Done |
| **A1** | Radius Token Adoption | `border-radius: Npx` → `var(--radius-*)` | 707 | 30 min | ✅ Done |
| **A2** | Shadow Token Adoption | `box-shadow: ...` → `var(--shadow-*)` | 28 | 30 min | ✅ Done |
| **A3** | Motion Token Adoption | `transition` / `animation` → `var(--duration-*)` + `var(--ease-*)` | 234 | 45 min | ✅ Done |
| **A4** | Font-weight Token Adoption | `font-weight: N` → `var(--font-*)` | 586 | 30 min | ✅ Done |
| **A5** | Font-size Token Adoption | `font-size: Nrem` → `var(--text-*)` | 900 | 45 min | ✅ Done |
| **A6** | Spacing Token Adoption | `padding/margin/gap: Npx` → `var(--space-*)` | 2.111 | 2 uur | ✅ Done |
| **A7** | Line-height + Font-family Cleanup | `line-height` / `font-family` → tokens | 112 | 20 min | ✅ Done |
| **H1** | Touch-safe Hovers | `@media (hover: hover)` wrappers + z-index tokens | 123 | 1 uur | ✅ Done |
| **H2** | Fluid Typography | `clamp()` in `--text-*` tokens | 5 tokens | 30 min | ✅ Done |
| **L1** | CSS @layer Refactor | `!important` verwijderen via cascade layers | 24 verwijderd | 2 uur | ✅ Done |

## Volgorde

```
Q1 (quick wins) → A1 (radius) → A2 (shadow) → A3 (motion) → A4 (font-weight) → A5 (font-size) → A7 (line-height) → A6 (spacing) → H1 (hover) → H2 (fluid type) → L1 (@layer)
```

**Rationale:**
- **Q1** eerst — geen risico, maximale polish + system dark mode + perf
- **A1–A3** — kleinste sets, hoogste visuele impact (radius + shadow + motion = "feel")
- **A4–A5** — typografie tokens, medium set
- **A7** — kleine cleanup, afhankelijk van A5 (font-size eerst)
- **A6** — grootste set (2.552 waarden), als laatste want meest mechanisch
- **H1–H2** — UX verbeteringen die onafhankelijk van token adoptie kunnen
- **L1** als laatste — architectuur refactor, vereist dat alle andere fases stabiel zijn

## Aanpak per fase

Alle "A" fases volgen hetzelfde patroon:
1. **Python snap-script** — regex-based find & replace
2. **Stylelint check** — `pnpm lint:css` moet 0 violations blijven
3. **Visuele check** — `npx vite build` + steekproef in browser
4. **Commit** — per fase apart, zodat revert mogelijk is

## Ontbrekende tokens (nog aan te maken)

| Categorie | Tokens nodig |
|-----------|-------------|
| **z-index** | `--z-dropdown: 100`, `--z-sticky: 200`, `--z-modal: 1000`, `--z-toast: 1100`, `--z-tooltip: 1200` |
| **Opacity** | `--opacity-disabled: 0.5`, `--opacity-hover: 0.8`, `--opacity-overlay: 0.6` |

Deze worden meegenomen in de fase waar ze het meest relevant zijn (z-index bij H1, opacity bij A3).
