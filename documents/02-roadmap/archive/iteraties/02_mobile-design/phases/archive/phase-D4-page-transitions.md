# Phase D4 — Page Transitions

**Track:** D (Advanced Interactions)
**Status:** 📋 Planned

## Doel

Fade/slide animaties tussen pagina-navigaties voor vloeiende premium feel.

## Taken

- [ ] Route-level transition wrapper (framer-motion of CSS-only)
- [ ] Forward navigation: slide-in-from-right
- [ ] Back navigation: slide-in-from-left
- [ ] Tab switches: crossfade
- [ ] Modal open: scale-up + fade
- [ ] Modal close: scale-down + fade
- [ ] `prefers-reduced-motion`: alle animaties uit

## Besluit: CSS-only vs framer-motion

| Optie | Pro | Con |
|-------|-----|-----|
| CSS-only (View Transitions API) | Zero bundle, native | Beperkte browser support |
| framer-motion | Krachtig, declaratief | +30KB bundle |
| CSS + `@starting-style` | Modern, zero bundle | Zeer beperkte support |

> Aanbeveling: CSS-only met View Transitions API. Graceful degradation naar instant switch.

## Checklist

- [ ] Transition wrapper gebouwd
- [ ] Forward/back slide werkend
- [ ] Tab crossfade werkend
- [ ] Modal scale werkend
- [ ] Reduced motion gerespecteerd
- [ ] Bundle size niet vergroot (CSS-only)
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
