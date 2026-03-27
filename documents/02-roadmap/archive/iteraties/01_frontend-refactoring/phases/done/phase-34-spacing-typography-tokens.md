# Phase 34 — Spacing + Typography Tokens

**Track:** D2 (Design Tokens)
**Status:** 📋 Planned

## Doel

Systematische spacing en typography tokens toevoegen.

## Token Plan

```css
/* Spacing: 4px base unit */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-6: 24px;  --space-8: 32px;

/* Typography scale */
--text-xs: 0.75rem;  --text-sm: 0.875rem;  --text-base: 1rem;
--text-lg: 1.125rem; --text-xl: 1.25rem;   --text-2xl: 1.5rem;

/* Font weights */
--font-normal: 400;  --font-medium: 500;
--font-semibold: 600; --font-bold: 700;
```

## Checklist

- [ ] Spacing tokens gedefinieerd
- [ ] Typography scale gedefinieerd
- [ ] Font weight tokens gedefinieerd
- [ ] Utility classes bijgewerkt om tokens te gebruiken
- [ ] 10+ hardcoded spacing/font waarden vervangen
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
