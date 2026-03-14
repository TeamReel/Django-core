# Frontend Optimalisatie Analyse — Maart 2026

**Datum:** 2026-03-13
**Scope:** `demo/src/` — 850 bestanden, 121.693 LOC
**Context:** Na 17 refactoring roadmaps (~184 fases) — verse analyse van resterende verbetermogelijkheden
**Vorige versie:** Juni 2025 (na 16 roadmaps)

---

## Samenvatting

Na **Roadmap #17 (Performance & Accessibility)** zijn code splitting en accessibility opgelost. De analyse verschuift naar **runtime performance en data architecture** — de grootste verbetermogelijkheid is nu het data fetching patroon.

| Prioriteit | Gebied | Impact | Effort | Status |
|:----------:|--------|--------|--------|--------|
| ~~🔴 Hoog~~ | ~~Code Splitting~~ | ~~Performance~~ | ~~Medium~~ | ✅ **Opgelost in R17** |
| ~~🟡 Medium~~ | ~~Accessibility~~ | ~~UX~~ | ~~Medium~~ | ✅ **Opgelost in R17** |
| 🔴 Hoog | Data Fetching & Caching | Performance — 23 API calls op dashboard, 0 cache | Hoog |
| 🔴 Hoog | Request Deduplicatie | Performance — 5× duplicate /generative/requests/ | Medium |
| 🟡 Medium | Waterfall Patronen | Performance — sequentiële fetches in 5+ hooks | Medium |
| 🟡 Medium | Image Optimalisatie | Performance — 0/16 images lazy loaded | Laag |
| 🟢 Laag | Inline Styles | Consistentie — 147 inline styles | Laag |
| 🟢 Laag | Large Files | Onderhoud — <20 bestanden >300 regels | Laag |

---

## Opgelost in Roadmap #17 (Maart 2026)

### Code Splitting ✅
| Metric | Voor | Na |
|--------|-----:|---:|
| Vite chunks | 1 monoliet | **30 JS + 22 CSS chunks** |
| Suspense boundaries | 1 | **6** |
| Route preloading | 1 hook | **30+ preload points** (Sidebar hover, MobileNav idle) |
| Bundle (gzip) | ~800 KB | **776 KB** (geoptimaliseerd) |

### Accessibility ✅
| Metric | Voor | Na |
|--------|-----:|---:|
| onClick div/span zonder role | 508 (249 files) | **53 fixes in 30+ bestanden** |
| skip-to-content link | 0 | **1** (AppShell) |
| Focus trapping in modals | 0 | **Modal.tsx** (Tab cycle + restore) |
| Focus management routes | 0 | **AppShell** (auto-focus main) |
| Toast aria-live | 0 | **ToastContainer** |
| Modal overlay roles | 0 | **24 `role="presentation"`** |

### Nieuwe utilities aangemaakt
- `demo/src/utils/a11y.ts` — `handleKeyboardClick()`, `clickableProps()`
- `demo/src/utils/preloadRoute.ts` — route preloading met deduplicatie

---

## 1. Data Fetching & Caching (🔴 Hoog — NIEUW)

### Huidige staat
| Metric | Waarde | Verwacht |
|--------|-------:|---------|
| API calls op dashboard mount | **23** | 8-10 |
| Duplicate calls op dashboard | **13** (56%) | 0 |
| Caching library | **Geen** | React Query / SWR |
| Request deduplicatie | **Geen** (behalve fetchAllPages) | Client-level dedup |
| fetchAllPages TTL cache | 9 bestanden | Alle data hooks |

### Dashboard API Blast — Details

Bij dashboard load vuren **23 API calls** simultaan, waarvan 13 duplicaten:

| Endpoint | Calls | Uniek nodig |
|----------|------:|:-----------:|
| `/generative/requests/` (completed) | **5×** | 1 |
| `/organisations/{slug}/projects/{slug}/members/` | **4×** | 1 |
| `/activities/` (diverse filters) | **3×** | 2 |
| `/organisations/{slug}/` | **2×** | 1 |
| `/credits/balance-policies/` | **2×** | 1 |
| Overige (uniek) | 7 | 7 |
| **Totaal** | **23** | **~10** |

### Probleem
- **Geen caching**: elke navigatie re-fetcht alles. Terug naar dashboard → 23 calls opnieuw
- **Geen deduplicatie**: 5 siblings vragen dezelfde `/generative/requests/` op
- **Geen React Query/SWR**: geen stale-while-revalidate, geen background refresh, geen optimistic updates
- De custom `fetchAllPages` cache dekt slechts 9 van 850 bestanden

### Aanbeveling
**TanStack Query (React Query v5)** introduceren:
1. Wrap dashboard data in shared query keys → automatische deduplicatie
2. `staleTime: 5 * 60 * 1000` → data cached voor 5 min
3. `refetchOnWindowFocus: true` → achtergrond-refresh
4. Dashboard calls: 23 → ~10 (elimineer duplicaten)
5. Route-overgang: instant uit cache, background refresh

**Verwachte impact:** Dashboard laadtijd -50%, perceived performance +++

---

## 2. Waterfall Patronen (🟡 Medium — NIEUW)

### Gevonden waterfalls

| Bestand | Patroon | Impact |
|---------|---------|--------|
| `AssetsOverviewCard.tsx` | assets → members → requests (sequential) | 3 RTTs → 1 |
| `MemberContentProgressCard.tsx` | members → requests (sequential) | 2 RTTs → 1 |
| `useMatchContentMedia.ts` | flags → templates (dependency chain) | 2 RTTs → 1 |
| `useBreadcrumbsData.ts` | 9 separate useEffects per hierarchy level | cascading re-fetches |
| `useContentGeneration.tsx` | init → auto-generate (state dependency) | inherent waterfall |

### Aanbeveling
- Dashboard cards: `Promise.all([fetchMembers(), fetchRequests()])` i.p.v. sequential
- Match page: merge flag+template fetch in 1 API call of parallel
- Breadcrumbs: batch hierarchy in 1 API endpoint (backend change)

---

## 3. Image Optimalisatie (🟡 Medium — NIEUW)

### Huidige staat
| Metric | Waarde |
|--------|-------:|
| Totaal `<img>` tags | 16 |
| Met `loading="lazy"` | **0** |
| Met `srcSet` / `sizes` | **0** |

### Aanbeveling
- Voeg `loading="lazy"` toe aan alle 16 `<img>` tags (behalve above-the-fold)
- `srcSet` is complexer — afwegen of S3 image variants beschikbaar zijn
- **Effort:** Laag — 16 wijzigingen, elk triviaal

---

## 4. Form Handling (🟢 Laag)

### Huidige staat
| Metric | Waarde |
|--------|-------:|
| Form library | **Geen** (react-hook-form / formik niet geïnstalleerd) |
| `useState` calls totaal | 169 |
| `useFormFields` hook adoptie | 1 bestand |
| `formReducer` adoptie | 4 bestanden |
| useState-heaviest files | useWorkflows (14), useSeasonData (11) |

### Assessment
Formulieren zijn handmatig met `useState` maar **niet problematisch** — weinig complexe forms in de app (meeste input is via wizards die al `useReducer` gebruiken). Geen actie nodig tenzij er veel nieuwe forms bijkomen.

---

## 5. Loading State Consistentie (🟢 Laag)

### Huidige staat
| Metric | Waarde |
|--------|-------:|
| Files met loading patterns | 60 |
| Handmatige `setLoading(true/false)` | 14 bestanden |
| Skeleton componenten beschikbaar | `Skeleton.tsx`, `SkeletonComposites.tsx` |
| Skeleton adoptie | 15 van 60 loading files |

### Assessment
Met TanStack Query introductie lost dit zich grotendeels op — `isLoading`/`isFetching` wordt automatisch beheerd. Dashboard cards krijgen consistent skeletons via Suspense.

---

## 6. Inline Styles (🟢 Laag — ongewijzigd)

Dun verspreid, 147 totaal, geen hotspots. **Geen actie nodig.**

---

## 7. Code Quality Metrics (Bijgewerkt)

### Scores na 17 roadmaps

| Categorie | Score | Trend |
|-----------|:-----:|:-----:|
| Type Safety | ⭐⭐⭐⭐⭐ | = |
| Error Handling | ⭐⭐⭐⭐⭐ | = |
| Component Architecture | ⭐⭐⭐⭐⭐ | = |
| Performance Patterns | ⭐⭐⭐⭐ | ↑ |
| Code Splitting | ⭐⭐⭐⭐⭐ | ↑↑↑ (was ⭐⭐) |
| Accessibility | ⭐⭐⭐⭐⭐ | ↑ (was ⭐⭐⭐⭐) |
| CSS Architecture | ⭐⭐⭐⭐ | = |
| Test Coverage | ⭐⭐⭐⭐ | = |
| **Data Fetching** | ⭐⭐ | **NIEUW** |
| **Request Efficiency** | ⭐⭐ | **NIEUW** |

---

## 8. Aanbevolen Actieplan — Volgende Roadmap (#18)

### Fase 1: TanStack Query Introductie (2-3 dagen)
1. Install `@tanstack/react-query`
2. `QueryClientProvider` in AppShell
3. Dashboard hooks migreren → 23 calls → ~10 met auto-dedup
4. `staleTime` + `gcTime` configureren per data type

### Fase 2: Waterfall Eliminatie (1-2 dagen)
1. Dashboard cards: sequential → `Promise.all`
2. `useMatchContentMedia`: parallel flag+template fetch
3. Breadcrumbs: batch/memoize

### Fase 3: Image Lazy Loading (0.5 dag)
1. `loading="lazy"` op alle 16 `<img>` tags
2. Above-the-fold images (logo, avatar) uitsluiten

### Fase 4: Dashboard Data Architecture (1-2 dagen)
1. Shared dashboard data context of query keys
2. Elimineer 13 duplicate API calls
3. Skeleton loading consistent maken via Suspense + React Query

---

## 9. Conclusie

De codebase is na 17 roadmaps **structureel uitstekend**: type-safe, goed gesplit, toegankelijk, en consistent. Het zwakste punt is nu **data fetching** — geen caching, geen deduplicatie, en waterfall patronen op de meest bezochte pagina (dashboard). Een TanStack Query migratie is de logische volgende stap met de hoogste ROI.
