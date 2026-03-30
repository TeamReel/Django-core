# Roadmap #19 — Dashboard Inline Sheets & Data Layer

> **Status:** ✅ Afgerond (7/7 fases)
> **Start:** 2026-03-14
> **Scope:** `demo/src/` — dashboard, NavigationSheet, data fetching, caching
> **Bron:** [optimalisatie-analyse.md](../../05-demo/plans/optimalisatie-analyse.md), [ux-flows.md](../../05-demo/frontend-design/ux-flows.md)

---

## Doel

Dashboard als **command center** — alle match-acties en dashboard cards openen als inline sheets (iOS-style stacked panels), ondersteund door een performante data layer met caching en deduplicatie.

**Twee pijlers:**
1. **UX Layer (D0–D3):** Inline sheets voor match workflow + dashboard cards
2. **Data Layer (D4–D6):** TanStack Query, request deduplicatie, waterfall eliminatie

---

## Context

### Wat werkt ✅
- **ActiveMatchCard** — dichtstbijzijnde match, opent MatchSheet (iOS slide-up)
- **LineupSheet** — inline opstelling bewerken vanuit dashboard (lazy-loaded)
- **NavigationSheet `onBack`** — `‹ Vorige` back-arrow voor child sheets
- **Media knop verwijderd** — content = media op match-niveau

### Wat ontbreekt ❌
- **Content inline** — navigeert nog weg naar match detail pagina
- **Dashboard card sheets** — alle cards navigeren weg i.p.v. inline
- **Badge refresh** — na lineup save updated de ActiveMatchCard badge niet live
- **Data caching** — 23 API calls op dashboard mount, 13 duplicaten (56%)
- **Request deduplicatie** — 5× dezelfde `/generative/requests/` call

### Dashboard card inventaris

| Card | LOC | API calls | Navigeert naar | Sheet candidate |
|------|----:|-----------|----------------|:---------------:|
| ActiveMatchCard | 397 | 3 (matches, participations, media) | MatchSheet ✅ | ✅ |
| ContentOverviewCard | 404 | 2 (requests × 500, media × 500) | — (zelfstandig) | ✅ |
| AssetsOverviewCard | 342 | 3 (assets, members, requests) | Identity/Squad pagina | ✅ |
| SmartActionsCard | 248 | 2 (members, requests) | Season/Medialib | ⚠️ |
| MemberContentProgressCard | 204 | 2 (members, requests) | Squad pagina | ✅ |
| ContentBreakdownCard | 133 | 1 (requests × 200) | Content pagina | ✅ |
| SquadReadinessCard | ~50 | 1 (members count) | Squad pagina | ⚠️ |
| AIQueueCard | ~40 | 1 (queue counts) | Content pagina | ✅ |
| CreditsTrendCard | ~30 | hook (balance) | Credits pagina | ⚠️ |
| OrgStatsCard | ~30 | 0 (context) | Org detail | ❌ |

---

## Fasering

### 🎯 UX Layer — Inline Sheets (D0–D3)

| Fase | Titel | Status | Beschrijving |
|------|-------|--------|--------------|
| **D0** | [Lineup Sheet + Back navigatie](phases/done/D0-lineup-sheet-back.md) | ✅ Klaar | LineupSheet inline, NavigationSheet `onBack`, Media knop verwijderd |
| **D1** | [Content Sheet (volledig)](phases/done/D1-content-sheet.md) | ✅ Klaar | Content preview + generatie + preview overlay inline vanuit MatchSheet |
| **D2** | [Sheet refresh & badges](phases/done/D2-sheet-refresh-badges.md) | ✅ Klaar | Live badge updates na save/generatie in child sheets |
| **D3** | [Dashboard card sheets](phases/done/D3-dashboard-card-sheets.md) | ✅ Klaar | ContentOverview, MemberProgress, Assets, AIQueue als inline sheets |

### ⚡ Data Layer — Performance (D4–D6)

| Fase | Titel | Status | Beschrijving |
|------|-------|--------|--------------|
| **D4** | [TanStack Query introductie](phases/done/D4-tanstack-query.md) | ✅ Klaar | React Query v5 installatie, QueryClient, dashboard hooks migratie |
| **D5** | [Dashboard request deduplicatie](phases/done/D5-dashboard-deduplicatie.md) | ✅ Klaar | Shared query keys, 23 → ~10 calls, stale-while-revalidate |
| **D6** | [Waterfall eliminatie & image optimalisatie](phases/done/D6-waterfall-image-optimalisatie.md) | ✅ Klaar | Parallel fetches, image lazy loading, breadcrumb batch |

---

## Technische architectuur

### Sheet stacking patroon (iOS-style)
```
Dashboard
 └─ Card (tap)
     └─ Root Sheet (NavigationSheet, ×)
         ├─ Child Sheet (NavigationSheet + ‹ Vorige)
         │   └─ Modal (portal, bovenop alles)
         └─ Child Sheet 2
```

### Herbruikbare patterns uit D0
- **Hook pattern:** `useLineupSheet` — standalone, eigen API calls, geen dependency op page orchestrator
- **Sheet pattern:** `LineupSheet` — lazy-load tab component, wrap in NavigationSheet, `onBack`
- **Card pattern:** `ActiveMatchCard` — state per sheet, close parent → open child

### NavigationSheet capabilities
| Prop | Functie |
|------|---------|
| `isOpen` / `onClose` | Basis open/close |
| `onBack` | iOS back arrow (vervangt × knop) |
| `title` / `icon` | Header content |
| `footer` | Sticky footer (save buttons) |
| `desktopWidth` | Side panel breedte |
| — | Focus trap, scroll lock, escape, animated close |

### Key API endpoints
| Endpoint | Gebruikt door |
|----------|---------------|
| `/activities/?activity_type=match` | ActiveMatchCard |
| `/projects/{id}/members/` | useLineupSheet, SquadReadiness, SmartActions |
| `/activities/{id}/` PATCH | useLineupSheet (save) |
| `/media/items/?activity={id}` | useContentSheet (D1) |
| `/generative/requests/` | ContentBreakdown, ContentOverview, Assets, SmartActions, MemberProgress |
| `/content-templates/?is_active=true` | useContentSheet (D1) |
| `/branding/assets/` | AssetsOverviewCard |

### Metriek targets

| Metric | Huidig | Target | Fase |
|--------|-------:|-------:|------|
| Dashboard API calls | 23 | ~10 | D5 |
| Duplicate requests | 13 (56%) | 0 | D5 |
| Cards met inline sheets | 1 | 6+ | D3 |
| Match actions inline | 1 (lineup) | 3 (lineup + content + badges) | D1–D2 |
| Caching library | Geen | TanStack Query v5 | D4 |
| Image lazy loading | 0/16 | 14/16 | D6 |
