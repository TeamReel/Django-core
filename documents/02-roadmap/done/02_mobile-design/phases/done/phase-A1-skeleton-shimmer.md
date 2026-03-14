# Phase A1 — Skeleton Shimmer System

**Track:** A (Foundation)
**Status:** ✅ Done
**Commit:** `078c1c07`

## Doel

Alle loading states consistent maken met shimmer-skeletons. Geen spinners, geen "Loading..." tekst.

## Wat gebouwd

### Nieuwe Skeleton composites (`components/Skeleton.tsx`)

| Component | Layout match | Gebruik |
|-----------|-------------|---------|
| `SkeletonPageHeader` | PageHeader (breadcrumbs + titel + acties) | Detail pagina's |
| `SkeletonTabBar` | MobileTabBar/tab navigatie | Tab-pagina's |
| `SkeletonDetailPage` | Header + tabs + content card | Club, Member, User detail |
| `SkeletonTablePage` | Filters + tabelrijen | Directory lijsten |
| `SkeletonDashboard` | Header + widget grid | Dashboard, Suspense fallback |

### Gemigreerde bestanden (18 totaal)

| Categorie | Bestanden | Van → Naar |
|-----------|----------|------------|
| Route shell | App.tsx | `LoadingState` spinner → `SkeletonDashboard` |
| Permission guards | PermissionGuards.tsx (4x) | spinner → `SkeletonDashboard` |
| Detail pagina's | Club, Member, User, ProjectEdit, MemberDetail | tekst/spinner → `SkeletonDetailPage` |
| Lijst pagina's | Projects, Users, Clubs, Teams, UsersList, Squad | spinner → `SkeletonTablePage`/`SkeletonList` |
| Content pagina's | ContentList, ContentOverview | spinner → `SkeletonList` card |
| Charts | Credits, Observability, LazyChartBoundary | spinner → `Skeleton` card |
| Redirect | LegacyMatchRedirectPage | spinner → `SkeletonDetailPage` |

### CSS toevoegingen (`Skeleton.module.css`)

- Breadcrumbs, header row, tab bar, detail/table/dashboard layouts
- Responsive breakpoints (mobile < 640px)
- `prefers-reduced-motion` support (animatie uit → static opacity)

## Resultaat

- **0** `LoadingState` spinner imports remaining
- **18** bestanden gemigreerd naar shimmer
- **5** page-level composites toegevoegd
- TypeScript + Vite build clean

## Checklist

- [x] Skeleton composites gebouwd
- [x] Alle LoadingState imports vervangen
- [x] CSS responsive + reduced motion
- [x] `npx tsc --noEmit` — pass
- [x] `npx vite build` — pass
- [x] Gecommit + pushed naar `main`
