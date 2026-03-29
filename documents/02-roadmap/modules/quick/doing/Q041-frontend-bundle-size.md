# Q041 — Frontend Bundle Size Optimalisatie

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
De `index.js` chunk is 624 kB (gzipped: 171 kB) — Vite waarschuwt bij >500 kB. Dit vertraagt de eerste page load. Code-splitting met `React.lazy()` kan dit oplossen.

## Scope
Top chunks die gesplitst moeten worden:
- `index.js` — 624 kB → route-level lazy loading
- `TeamHubPage.js` — 152 kB → kan sub-tabs lazy loaden
- `AssetsTab.js` — 93 kB → kan modal-componenten lazy loaden

## Aanpak
1. Route-level lazy loading in `App.tsx` / router config
2. `React.lazy()` + `Suspense` voor zware pagina's
3. Verify met `pnpm exec vite build` — geen chunk >500 kB

## Checklist
- [ ] Lazy loading voor route-level pagina's
- [ ] Verify: `pnpm exec vite build` → geen chunk >500 kB warning
- [ ] Verify: `pnpm exec tsc --noEmit` → 0 errors
- [ ] Handmatig testen: navigatie werkt, geen flicker
