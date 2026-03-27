# CS1 — Bundle Analyse & Baseline

**Status:** ✅ Compleet
**Prioriteit:** 🔴 Hoog
**Geschatte effort:** 1-2 uur

---

## Doel

Een baseline meting van de huidige bundle size en chunk distributie, zodat we de impact van optimalisaties objectief kunnen meten.

## Taken

### 1. Installeer rollup-plugin-visualizer
```bash
pnpm add -D rollup-plugin-visualizer
```

### 2. Configureer Vite build analyse
Voeg toe aan `vite.config.ts`:
```ts
import { visualizer } from 'rollup-plugin-visualizer';

// In plugins array (alleen in analyse-mode):
...(process.env.ANALYZE ? [visualizer({
  open: true,
  filename: 'bundle-stats.html',
  gzipSize: true,
  brotliSize: true,
})] : []),
```

### 3. Genereer baseline rapport
```bash
ANALYZE=true pnpm build
```

### 4. Documenteer baseline metrieken
- Totale bundel size (raw + gzip + brotli)
- Aantal chunks
- Top 10 grootste chunks
- Vendor chunk size
- Per-route-groep schatting (identity, config, platform, frontend)

### 5. Identificeer chunk overlap
- Welke modules worden in meerdere chunks gedupliceerd?
- Welke dependencies zijn te groot voor de vendor chunk?

## Acceptatiecriteria

- [ ] `rollup-plugin-visualizer` geïnstalleerd
- [ ] `ANALYZE=true pnpm build` genereert visueel rapport
- [ ] Baseline metrieken gedocumenteerd in dit bestand
- [ ] Top chunk-overlap geïdentificeerd

## Baseline Resultaten

**Build datum:** 2026-03-13

### JS Chunks (30 chunks, 2.76 MB raw)

| Chunk | Raw | Gzip | Type |
|-------|----:|-----:|------|
| chunk-identity | 849.79 KB | 212.25 KB | Feature — identity/org/club/team/member CRUD |
| vendor-react | 436.12 KB | 111.95 KB | Vendor — react + react-dom |
| chunk-periods | 307.11 KB | 80.72 KB | Feature — season/competition/member detail |
| index (core) | 208.24 KB | 55.22 KB | Core — app shell, shared components |
| chunk-activities | 202.84 KB | 58.30 KB | Feature — match detail |
| chunk-config | 172.85 KB | 46.15 KB | Feature — admin config pages |
| vendor (misc) | 144.34 KB | 51.64 KB | Vendor — overige dependencies |
| vendor-recharts | 68.57 KB | 22.64 KB | Vendor — recharts + d3 |
| chunk-create-wizard | 65.93 KB | 16.61 KB | Feature — CreateWizard flows |
| vendor-icons | 61.46 KB | 12.67 KB | Vendor — lucide-react |
| chunk-frontend-dev | 61.34 KB | 14.67 KB | Feature — dev tools pages |
| chunk-platform | 47.18 KB | 11.18 KB | Feature — superadmin pages |
| ApprovalsPage | 45.39 KB | 13.60 KB | Feature — approval queue |
| ContentLibraryPage | 41.16 KB | 12.23 KB | Feature — content library |
| chunk-match-wizard | 38.03 KB | 10.92 KB | Feature — MatchWizardV2 |
| chunk-medialib | 32.29 KB | 9.36 KB | Feature — media library |
| chunk-aistudio | 30.60 KB | 9.28 KB | Feature — AI studio |
| chunk-docs | 19.76 KB | 5.64 KB | Feature — docs pages |
| ProfileHubPage | 11.74 KB | 3.35 KB | Page |
| SearchPage | 10.48 KB | 3.71 KB | Page |
| index (medialib) | 7.90 KB | 3.04 KB | Page |
| NotificationsPage | 6.55 KB | 2.43 KB | Page |
| chunk-work | 4.07 KB | 1.20 KB | Feature — work list pages |
| RecentsPage | 2.95 KB | 1.15 KB | Page |
| FavoritesPage | 2.18 KB | 1.00 KB | Page |
| SwipeableCard | 1.95 KB | 0.86 KB | Component |
| TileGrid | 1.80 KB | 0.90 KB | Component |
| AppsPage | 1.75 KB | 0.86 KB | Page |
| SettingsLandingPage | 1.66 KB | 0.81 KB | Page |
| ContentPage | 1.49 KB | 0.72 KB | Page |

### CSS Chunks (22 chunks, 595.6 KB raw)

| Chunk | Raw | Gzip |
|-------|----:|-----:|
| chunk-identity | 152.54 KB | 24.74 KB |
| index (core) | 142.84 KB | 24.94 KB |
| chunk-periods | 80.78 KB | 14.15 KB |
| chunk-activities | 65.73 KB | 12.10 KB |
| chunk-create-wizard | 37.78 KB | 4.85 KB |
| ApprovalsPage | 31.52 KB | 5.44 KB |
| ContentLibraryPage | 23.33 KB | 4.41 KB |
| chunk-config | 19.47 KB | 4.74 KB |
| chunk-aistudio | 12.04 KB | 2.66 KB |
| chunk-match-wizard | 11.64 KB | 2.28 KB |
| chunk-frontend-dev | 8.69 KB | 2.52 KB |
| ProfileHubPage | 5.66 KB | 1.52 KB |

### Samenvatting

| Metric | Waarde |
|--------|-------:|
| JS totaal (raw) | 2,822 KB (2.76 MB) |
| JS totaal (gzip) | ~748 KB |
| CSS totaal (raw) | 596 KB |
| CSS totaal (gzip) | ~106 KB |
| JS chunks | 30 |
| CSS chunks | 22 |
| Grootste JS chunk | chunk-identity (850 KB / 212 KB gzip) |
| Initiële JS (core + vendors) | ~853 KB raw / ~221 KB gzip |

### Observaties

1. **chunk-identity is 30% van alle JS** — enorm, bevat alle org/club/team/member/user pages
2. **Vendor chunks goed gesplitst** — react, recharts, icons elk apart
3. **Feature chunks werken** — 13 feature-area chunks succesvol aangemaakt
4. **Initieel geladen** = index + vendor-react + vendor + vendor-icons ≈ 853 KB raw
5. **Admin chunks** (config 173KB + platform 47KB + frontend-dev 61KB + docs 20KB) = 301 KB die reguliere gebruikers nooit laden
6. **Warning**: SeasonDetailPage wordt zowel statisch als dynamisch geïmporteerd → wordt niet correct gesplit
