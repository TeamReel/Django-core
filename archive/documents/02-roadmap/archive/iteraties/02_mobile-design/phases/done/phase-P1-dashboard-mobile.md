# Phase P1 — DashboardPage Mobile Foundation

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

DashboardPage volledig responsive maken: mobile-first CSS, facade data hook, single-column layout op mobile met juiste spacing en touch targets.

## Huidige staat

- `DashboardPage.tsx` — 237 regels
- `DashboardPage.module.css` — 53 regels, **0 `@media` queries**
- Geen facade hook — state verspreid over component
- Gebruikt `hide-mobile` utility maar geen echte responsive layout
- Heeft `PullToRefresh` (goed)

## Taken

### 1. Facade data hook
- [ ] `useDashboardPageData()` hook extraheren
- [ ] Alle state, effects, derived values naar hook
- [ ] Component wordt pure render shell (<100 regels JSX ideaal)

### 2. Responsive CSS Module
- [ ] Mobile-first breakpoints toevoegen aan `DashboardPage.module.css`
- [ ] Quick-create grid: 2 kolommen mobile, 4 desktop
- [ ] Stats row: horizontaal scrollbaar of stacked op mobile
- [ ] Activity feed: full-width cards op mobile
- [ ] Upcoming matches: compact card layout
- [ ] Touch targets ≥ 44px op alle knoppen/links

### 3. 4-state pattern
- [ ] Loading: `SkeletonDashboard` (bestaat al, check kwaliteit)
- [ ] Empty: SmartEmptyState voor lege secties
- [ ] Error: retry button met melding
- [ ] Success: content renders

### 4. Mobile-specific UX
- [ ] Spacing: consistent `var(--space-*)` tokens
- [ ] Typografie: juiste font sizes per element
- [ ] Geen horizontale overflow
- [ ] Safe area bottom padding (voor bottom nav)

## Referentie-apps

- **Instagram**: Home feed = single column, stories bovenaan, cards full-width
- **YouTube**: Dashboard = vertical feed, horizontal scroll voor categories

## Checklist

- [ ] `useDashboardPageData()` hook werkend
- [ ] CSS Module met `@media (min-width: 640px)` breakpoints
- [ ] Mobile layout: single-column, geen overflow
- [ ] Touch targets ≥ 44px
- [ ] 4 states: loading / empty / error / success
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
