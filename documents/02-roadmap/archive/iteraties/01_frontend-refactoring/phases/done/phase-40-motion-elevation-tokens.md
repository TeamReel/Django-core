# Phase 40 — Motion + Elevation Tokens

**Track:** D3 (Design Tokens)
**Status:** 📋 Planned

## Doel

Motion, shadow en border-radius tokens toevoegen.

## Token Plan

```css
/* Transitions */
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);

/* Elevation (shadows) */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
--shadow-md: 0 4px 6px rgba(0,0,0,0.25);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.3);

/* Border radius */
--radius-sm: 4px;   --radius-md: 8px;
--radius-lg: 12px;  --radius-full: 9999px;

/* Breakpoints */
--breakpoint-sm: 640px;  --breakpoint-md: 768px;
--breakpoint-lg: 1024px; --breakpoint-xl: 1280px;
```

## Checklist

- [ ] Motion tokens gedefinieerd (duration, easing)
- [ ] Shadow tokens gedefinieerd
- [ ] Border radius tokens gedefinieerd
- [ ] Breakpoint tokens gedefinieerd
- [ ] 10+ hardcoded motion/shadow waarden vervangen
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
