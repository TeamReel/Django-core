# Phase P4 — Gallery (AIStudio) Mobile Foundation

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

Gallery page mobile-ready maken: responsive media grid, zoekbalk mobile, filter chips, facade data hook.

## Huidige staat

- `AIStudioPage.tsx` — 18 regels (thin wrapper around `ContentLibraryView`)
- `ContentLibraryView` doet het eigenlijke werk — audit dat component
- Geen eigen CSS Module, geen responsive styling
- Geen MobileTabBar, geen mobile-aware filters

## Taken

### 1. ContentLibraryView audit + responsive
- [ ] Check `ContentLibraryPage.tsx` / `ContentLibraryView` voor mobile state
- [ ] Responsive media grid: 2 kolommen mobile, 3-4 desktop
- [ ] Square thumbnails met `aspect-ratio: 1`
- [ ] Lazy loading voor below-fold items

### 2. Search & filters mobile
- [ ] Search field: full-width op mobile, compact op desktop
- [ ] Filter chips: horizontaal scrollbaar row (niet wrap)
- [ ] Active filter indicator

### 3. Data hook
- [ ] Facade hook als die ontbreekt
- [ ] Loading / empty / error states

### 4. Touch UX
- [ ] Tap op thumbnail → content detail (of modal)
- [ ] Long-press → quick actions menu
- [ ] Touch targets ≥ 44px

## Referentie-apps

- **Instagram Explore**: Grid van 3 kolommen, zoekbalk bovenaan
- **Pinterest**: Masonry grid, zoek + filter chips

## Checklist

- [ ] Responsive media grid werkt op mobile
- [ ] Zoekbalk bruikbaar op mobile
- [ ] Filter chips horizontaal scrollbaar
- [ ] 4 states: loading / empty / error / success
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
