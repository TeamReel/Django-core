# Phase 29 — Color Token Scale

**Track:** D1 (Design Tokens)
**Status:** 📋 Planned

## Doel

Van 18 → 60+ color tokens. Systematische kleurenschaal + semantic tokens.

## Token Plan

```css
/* Primaire schaal */
--color-primary-50 .. --color-primary-900

/* Neutral schaal */
--color-neutral-50 .. --color-neutral-900

/* Semantic tokens */
--color-bg-primary: var(--color-neutral-900);
--color-bg-secondary: var(--color-neutral-800);
--color-bg-surface: var(--color-neutral-850);
--color-text-primary: var(--color-neutral-100);
--color-text-secondary: var(--color-neutral-400);
--color-border-default: var(--color-neutral-700);

/* Status tokens */
--color-success: var(--color-green-500);
--color-warning: var(--color-amber-500);
--color-error: var(--color-red-500);
--color-info: var(--color-blue-500);
```

## Checklist

- [ ] Primaire kleurenschaal gedefinieerd (50-900)
- [ ] Neutral schaal gedefinieerd
- [ ] Semantic tokens (bg, text, border) aangemaakt
- [ ] Status tokens (success, warning, error, info)
- [ ] 10+ bestaande hardcoded kleuren vervangen door tokens
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
