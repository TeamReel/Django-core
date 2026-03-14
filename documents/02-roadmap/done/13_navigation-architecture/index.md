# Navigation Architecture — Roadmap

**Status:** ✅ Compleet (10/10 fases done)
**Aangemaakt:** 2026-03-12
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `frontend-final-cleanup/` (12/12 ✅)
- `frontend-hardening/` (12/12 ✅)

---

## Context

Uit een grondige analyse van alle flows en navigatie in de app (12 maart 2026) blijkt dat de route-architectuur functioneel werkt, maar structureel overbelast is door historische URL-migraties. De app ondersteunt 3 navigatie-oppervlakken (TopNavbar, Sidebar, MobileBottomNav) die goed coördineren, maar de onderliggende routing is 3-4x gedupliceerd.

## Audit Resultaten

| Metric | Huidige Staat | Target |
|--------|---------------|--------|
| **Route definities** | **142** totaal | ~60-70 |
| **Hierarchy routes** | **51** (voor 5 unieke pagina's) | ~12 (geneste layouts) |
| **Redirect componenten** | **17** (46 redirect-routes) | ~5 (universele resolver) |
| **/organisations/ duplicaten** | **24** routes (1:1 kopie van root) | 0 (wildcard redirect) |
| **navGroups** | **leeg array** (dead code + rendering) | Verwijderd of gevuld |
| **Barrel imports** | **10+** pages per chunk (identity, config) | Individuele chunks |
| **Type-safe routes** | **0** (handmatige URL strings in 70+ files) | 100% via route helpers |
| **Breadcrumbs** | **0** (geen breadcrumb systeem) | Automatisch vanuit route hiërarchie |
| **createBrowserRouter** | Niet in gebruik (`<Routes>/<Route>`) | Data Router API |
| **Deep-link support** | Beperkt (geen copy/share UI) | Canonical URLs + share UI |

### Sleutelbevinding: Route Explosie

De 51 hiërarchie-routes bestaan uit **4 URL-varianten** voor dezelfde 5 pagina's:

```
Variant 1: /:orgId/projects/:projectId/:seasonId           → redirect
Variant 2: /:orgId/:clubId/:projectId/:seasonId             → SeasonDetailPage (canonical)
Variant 3: /:orgId/:clubId/:projectId/seasons/:seasonId     → redirect (back-compat)
Variant 4: /organisations/:orgId/:clubId/:projectId/:seasonId → duplicate van variant 2
```

**Alleen variant 2 is canonical.** De rest zijn redirects of duplicaten.

---

## Fasering — 4 Tracks, 10 Fases

### Track R — Route Architecture (kern)

**Doel:** Van 142 platte routes → ~65 geneste routes met type-safety

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **R1** | Route Constants & Type-safe Builder | `routes.ts` met typed helpers voor alle canonical URLs | 0 handmatige URL strings | 4 uur |
| **R2** | /organisations/ Prefix Elimination | 1 wildcard catch-all vervangt 24 duplicate routes | -24 routes | 2 uur |
| **R3** | Legacy Redirect Consolidation | 17 redirect componenten → universele `HierarchyResolver` | -40 redirect routes | 4 uur |
| **R4** | createBrowserRouter Migration | Van `<Routes>/<Route>` → Data Router API | Loaders + error boundaries per route | 8 uur |

### Track N — Navigation Surfaces

**Doel:** Opschonen + verbeteren van de 3 navigatie-oppervlakken

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **N1** | navGroups & Dead Code Cleanup | Verwijder of vul `navGroups = []` + ongebruikte mega-menu code | 0 dead code | 2 uur |
| **N2** | Breadcrumb & Back-nav System | Automatische breadcrumbs + consistente back-navigatie | Breadcrumbs op alle detail pages | 6 uur |

### Track B — Bundle & Performance

**Doel:** Kleinere bundles, snellere navigatie

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **B1** | Barrel Import Splits | identity/config/frontend barrel → individuele lazy imports | Elk admin-page in eigen chunk | 3 uur |
| **B2** | Route Prefetch & Preload | Prefetch hints voor waarschijnlijke volgende routes | <100ms perceived nav | 3 uur |

### Track U — UX Flow Verbeteringen

**Doel:** Betere user-facing navigatie en flow entry-points

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **U1** | Deep-link & Share | Canonical URL copy-to-clipboard, match-page share/QR | Copy URL op alle detail pages | 4 uur |
| **U2** | Wizard Entry Points | Context-aware Create triggers vanuit meer plaatsen + betere prefill | Team-page → match aanmaken met team prefilled | 4 uur |

---

## Volgorde & Dependencies

```
R1 (route constants) ─────────────────────────────────────────┐
       ↓                                                       │
R2 (/organisations/ wildcard) ────── N1 (navGroups cleanup)   │
       ↓                                    ↓                  │
R3 (hierarchy resolver) ──────────── N2 (breadcrumbs)         │
       ↓                                                       │
R4 (createBrowserRouter) ─────────────────────────────────────┤
                                                               │
B1 (barrel splits) ────────────────────────────────────────────┤
       ↓                                                       │
B2 (route prefetch)                                            │
                                                               │
U1 (deep-link sharing) ───────────────────────────────────────┤
       ↓                                                       │
U2 (wizard entry points) ─────────────────────────────────────┘
```

**Rationale:**
- **R1 eerst** — Type-safe routes is de fundatie. Alle andere fases profiteren ervan.
- **R2 + N1 parallel** — Onafhankelijke cleanups, beide laag risico.
- **R3 + N2 parallel** — HierarchyResolver maakt breadcrumbs makkelijker (beide begrijpen de hiërarchie).
- **R4 als milestone** — Grootste verandering, na R1-R3 is de route-structuur al simpeler.
- **B1-B2 onafhankelijk** — Kan parallel met Track N/R lopen.
- **U1-U2 laatst** — UX features bouwen voort op de cleane route-architectuur.

---

## Best Practice: Waarom deze aanpak?

### createBrowserRouter (React Router v6.4+)
De huidige app gebruikt `<Routes>/<Route>` (de "legacy" rendering API). De officiële aanbeveling van React Router is migratie naar `createBrowserRouter`:

| Feature | `<Routes>` (nu) | `createBrowserRouter` (target) |
|---------|-----------------|-------------------------------|
| Route loaders | ❌ | ✅ Data laden vóór render |
| Error boundaries | ❌ Per-route | ✅ Automatisch per route |
| Typed params | ❌ Handmatig | ✅ Via route definition |
| Nested layouts | ⚠️ Handmatig | ✅ Ingebouwd |
| Prefetch | ❌ | ✅ Via `<Link prefetch>` |
| Pending UI | ❌ | ✅ `useNavigation().state` |

### Type-safe Route Definitions
In plaats van 70+ files met handmatige URL strings:

```tsx
// ❌ Nu: error-prone, geen autocomplete
navigate(`/${orgId}/${clubId}/${projectId}/${seasonId}`);

// ✅ Straks: type-safe, autocomplete, refactor-proof
navigate(routes.season({ orgId, clubId, projectId, seasonId }));
```

### Geneste Layouts (met createBrowserRouter)
De hiërarchie Organisation → Club → Team → Season → Competition → Match map perfect op geneste routes:

```tsx
// ❌ Nu: 51 platte routes met redirects
<Route path="/:orgId/:clubId/:projectId/:seasonId" element={<SeasonDetailPage />} />
<Route path="/:orgId/:clubId/:projectId/:seasonId/:competitionId" element={<CompRedirect />} />
// ... 49 meer

// ✅ Straks: geneste layouts, ~12 routes
{
  path: ':orgId',
  element: <OrgLayout />,
  children: [{
    path: ':clubId/:projectId',
    element: <TeamLayout />,
    children: [{
      path: ':seasonId',
      element: <SeasonDetailPage />,
      children: [{
        path: ':competitionId/:matchId',
        element: <MatchDetailPage />
      }]
    }]
  }]
}
```

---

## Prioriteit

| Prio | Fases | Reden | Effort |
|------|-------|-------|--------|
| **P0** | R1, N1 | Type-safe routes + dead code cleanup = snelle wins | 6 uur |
| **P1** | R2, R3, B1 | Route reductie (-64 routes) + bundle splits | 9 uur |
| **P2** | N2, U1 | UX verbeteringen: breadcrumbs + deep-links | 10 uur |
| **P3** | R4, B2, U2 | Architectuur upgrade + prefetch + wizard | 15 uur |

**Totaal:** ~40 uur (1-1.5 sprint weken)

---

## Metrics Targets

| Metric | Start | Na P0 | Na P1 | Na P2 | Eind |
|--------|-------|-------|-------|-------|------|
| Route definities | 142 | 142 | ~78 | ~78 | ~65 |
| Hierarchy routes | 51 | 51 | ~12 | ~12 | ~12 |
| Redirect componenten | 17 | 17 | ~5 | ~5 | ~5 |
| navGroups dead code | ✅ | 0 | 0 | 0 | 0 |
| Type-safe route usage | 0% | 80%+ | 90%+ | 95%+ | 100% |
| Breadcrumbs | 0 | 0 | 0 | ✅ | ✅ |
| createBrowserRouter | ❌ | ❌ | ❌ | ✅ | ✅ |
| Deep-link UI | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## Definities

### "Klaar" per fase
- [ ] Geen regressies (`npx tsc --noEmit` + `npx vitest run`)
- [ ] Fase-specifieke metrics gehaald
- [ ] Alle bestaande URL patterns blijven werken (backwards compatible)
- [ ] Gecommit + gepusht

### Voorwaarde
- Vorige roadmap `frontend-hardening/` volledig afgerond (12/12 ✅)
