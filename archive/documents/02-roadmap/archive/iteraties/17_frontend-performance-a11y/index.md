# Frontend Performance & Accessibility Roadmap

**Status:** ✅ Compleet (9/9 fases)
**Aangemaakt:** 2026-03-13
**Bron:** [optimalisatie-analyse.md](../../05-demo/plans/optimalisatie-analyse.md)

---

## Context

Na 16 afgeronde roadmaps (~175 fases) is de codebase structureel solide. Een **verse analyse** (maart 2026) toont 2 significante verbetermogelijkheden:

| Prioriteit | Gebied | Impact | Huidige staat |
|:----------:|--------|--------|---------------|
| 🔴 Hoog | Code Splitting & Bundle Optimization | Performance | 2 React.lazy, 1 Suspense boundary, 850 bestanden in 1 bundel |
| 🟡 Medium | Accessibility | UX / Inclusie | 34 clickable div/span zonder role, 16 tabIndex, geen skip-link |

### Wat er al goed is
- `lazyWithRetry` wrapper bestaat en wordt gebruikt voor **alle pagina's** in `appLazyImports.ts`
- Robuuste error handling: 20 ErrorBoundary, 589 try/catch
- Basisaccessibility: 95 aria-*, 65 role=, 80 alt=
- React.memo (882), useMemo (1030), useCallback (423) — component-level optimalisatie is sterk

### Wat ontbreekt
- **Chunk strategy**: alle lazy imports in 1 barrel file → Vite maakt suboptimale chunks
- **Suspense boundaries**: slechts 1 globale (AppShell) → geen progressive loading per feature area
- **Route preloading**: enkel DashboardPage → veelgebruikte bestemmingen worden niet geprefetched
- **A11y interactie**: 34 div/span met onClick zonder keyboard support
- **Skip-to-content**: ontbreekt volledig
- **Focus management**: niet consistent bij modal open/close

---

## Fasering

### 🔴 Code Splitting & Bundle Optimization (CS1 – CS5)

| Fase | Titel | Status | Bestanden |
|------|-------|--------|-----------|
| CS1 | [Bundle Analyse & Baseline](phases/done/CS1-bundle-analyse.md) | ✅ Compleet | Vite config, package.json |
| CS2 | [Vite Manual Chunks Strategy](phases/done/CS2-vite-chunks.md) | ✅ Compleet | vite.config.ts |
| CS3 | [Nested Suspense Boundaries](phases/done/CS3-suspense-boundaries.md) | ✅ Compleet | appRouteGroups.tsx, router.tsx |
| CS4 | [Route Preloading & Prefetch](phases/done/CS4-route-preloading.md) | ✅ Compleet | usePreloadRoutes, Sidebar, MobileBottomNav |
| CS5 | [Bundle Validatie & Meting](phases/done/CS5-bundle-validatie.md) | ✅ Compleet | CI/CD, docs |

### 🟡 Accessibility (A1 – A4)

| Fase | Titel | Status | Bestanden |
|------|-------|--------|-----------|
| A1 | [A11y Audit & Categorisatie](phases/done/A1-a11y-audit.md) | ✅ Compleet | Alle 249 bestanden (508 hits) |
| A2 | [Interactive Elements Fix — Batch 1](phases/done/A2-interactive-fix-1.md) | ✅ Compleet | 36 fixes in 22 bestanden |
| A3 | [Interactive Elements Fix — Batch 2](phases/done/A3-interactive-fix-2.md) | ✅ Compleet | 11 fixes in 7 bestanden |
| A4 | [Keyboard Navigation & Skip Links](phases/done/A4-keyboard-nav.md) | ✅ Compleet | AppShell, Modal.tsx, Toast |

---

## Metriek Targets

| Metric | Huidig | Target | Meting |
|--------|-------:|-------:|--------|
| React.lazy per route groep | 0 | 5+ | `grep -c "React.lazy" appRouteGroups.tsx` |
| Suspense boundaries | 1 | 6+ | `grep -rc "Suspense" layouts/ appRouteGroups.tsx` |
| Initiële bundel (gzip) | TBD | -30% | Vite build + visualizer |
| onClick div/span zonder role | 34 | 0 | `grep` audit |
| Skip-to-content link | 0 | 1 | Manual check |
| Keyboard-navigable modals | ~60% | 100% | Manual audit |

---

## Afhankelijkheden

```
CS1 (analyse) → CS2 (chunks) → CS3 (suspense) → CS5 (validatie)
                                 CS4 (preload) ↗
A1 (audit) → A2 (batch 1) → A3 (batch 2)
              A4 (keyboard) kan parallel met A2/A3
```
