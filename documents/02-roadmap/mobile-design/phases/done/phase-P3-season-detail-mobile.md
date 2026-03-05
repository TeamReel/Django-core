# Phase P3 — SeasonDetailPage Mobile Foundation

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

SeasonDetailPage responsive breakpoints toevoegen aan bestaande CSS Module (238 ln, 0 breakpoints). Grids en cards aanpassen voor mobile viewports.

## Huidige staat

- `ProjectSeasonDetailPage.tsx` — 386 regels
- `ProjectSeasonDetailPage.module.css` — 238 regels, **0 `@media` queries**
- Heeft `useSeasonDetailPageData()` facade hook (goed)
- Heeft `MobileTabBar` (goed)
- Grids gebruiken `auto-fill + minmax(240px, 1fr)` (passief responsive maar niet optimaal)
- Fixed-width tiles (`width: 100px`) passen niet op mobile

## Taken

### 1. Responsive breakpoints
- [ ] `@media (max-width: 639px)` rules toevoegen voor alle grids
- [ ] Overview cards: single-column stack op mobile
- [ ] Competition tiles: 2-column grid i.p.v. fixed-width
- [ ] Stats/counters: compact row of horizontaal scroll

### 2. Mobile-specifiek
- [ ] Inline action buttons → full-width op mobile
- [ ] Tab content padding aanpassen
- [ ] Geen horizontale overflow op <640px
- [ ] Touch targets check

### 3. Content tabs mobile
- [ ] Season Content tab: card grid responsive
- [ ] Squad tab: list view op mobile (niet grid)
- [ ] Hierarchy tab: tree view compact

## Checklist

- [ ] CSS Module heeft responsive breakpoints
- [ ] Grids: single/dual-column op mobile
- [ ] No horizontal overflow
- [ ] Touch targets ≥ 44px
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
