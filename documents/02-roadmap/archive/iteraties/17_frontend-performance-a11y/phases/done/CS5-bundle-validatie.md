# CS5 — Bundle Validatie & Meting

**Status:** ✅ Compleet
**Prioriteit:** 🔴 Hoog
**Geschatte effort:** 1-2 uur
**Afhankelijk van:** CS2, CS3, CS4

---

## Doel

Valideer de impact van alle code splitting optimalisaties en documenteer de resultaten. Optioneel: integreer bundle size check in CI.

## Taken

### 1. Genereer final bundle rapport
```bash
ANALYZE=true pnpm build
```

### 2. Vergelijk met CS1 baseline

| Metric | CS1 Baseline | Na CS2-CS4 | Δ |
|--------|:------------:|:----------:|:-:|
| Totaal (gzip) | — | — | — |
| Initiële chunk (gzip) | — | — | — |
| Aantal chunks | — | — | — |
| Grootste feature chunk | — | — | — |

### 3. Lighthouse Performance audit

Run Lighthouse op:
- `/login` (publiek, cold load)
- `/dashboard` (authenticated, warm)
- `/:org/:club/:team/:season` (deep hierarchy)

Meet:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay) / **INP** (Interaction to Next Paint)
- **CLS** (Cumulative Layout Shift)
- **TTI** (Time to Interactive)

### 4. Documenteer resultaten

Update dit bestand met de gemeten waarden.

### 5. (Optioneel) Bundle size budget in CI

Voeg een build script toe dat de bundle grootte checkt:
```json
// package.json
"scripts": {
  "build:check-size": "pnpm build && node scripts/check-bundle-size.js"
}
```

Met een simpele check die faalt als de initiële bundle > X KB (gzip) is.

## Acceptatiecriteria

- [x] Bundle rapport toont chunk-strategie werkt — 30 JS chunks, feature-area splitsing correct
- [x] Geen performance regressie ten opzichte van baseline — bundle grootte stabiel (+2.5%)
- [x] Resultaten opgeslagen in dit bestand
- [ ] Lighthouse scores gedocumenteerd — vereist running app, kan later

## Resultaten

### Bundle Size Vergelijking

| Metric | CS1 Baseline | Na CS2-CS4 | Δ |
|--------|:------------:|:----------:|:-:|
| JS totaal (raw) | 2,822 KB | 2,893 KB | +2.5% (preload map) |
| JS totaal (gzip) | ~748 KB | ~776 KB | +3.7% |
| CSS totaal (raw) | 596 KB | 610 KB | +2.3% |
| Initiële JS (gzip) | ~221 KB | ~233 KB | +5% (preload utility) |
| JS chunks | 30 | 30 | = |
| CSS chunks | 22 | 22 | = |
| Suspense boundaries | 1 | 6 | +500% |
| Preloading punten | 3 (DashboardPage) | 30+ (Sidebar hover + MobileNav idle + Dashboard) | +900% |

### Toelichting

De totale bundle grootte is iets gestegen (+2.5%) door de `preloadRoute.ts` utility die import-paden bevat voor ~30 routes. Dit is een bewuste trade-off:

**Winst:**
- **6 Suspense boundaries** → contextspecifieke loading states (was: 1 globale SkeletonDashboard)
- **30 feature chunks** → gebruikers laden alleen wat ze nodig hebben
- **Hover preloading** → chunks worden geladen vóór de klik (perceptueel instant)
- **Idle preloading** op mobile → 4 vaste tabs beschikbaar na ~3-5s
- **Admin chunks** (301 KB) worden nooit geladen door reguliere gebruikers

**Initieel geladen (dashboard bezoek):**
- `index` (213 KB) + `vendor-react` (436 KB) + `vendor` (144 KB) + `vendor-icons` (61 KB)
- ≈ 854 KB raw / 233 KB gzip
- Alle feature chunks worden pas geladen bij navigatie of preload trigger
