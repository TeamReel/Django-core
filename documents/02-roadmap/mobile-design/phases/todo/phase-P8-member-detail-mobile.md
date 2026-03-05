# Phase P8 — MemberDetailPage Mobile

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

MemberDetailPage responsive: edit formulier stacking, breadcrumb selects fitten, metadata cards mobile layout.

## Huidige staat

- `MemberDetailPage.tsx` — 391 regels, inline state (geen facade hook)
- Geen CSS module — gebruikt utility classes + inline styles
- Heeft `sm:grid-cols-2` / `grid-cols-1` responsive grid (deels)
- Breadcrumb `<select>` dropdowns zijn breed — overflow op mobile
- Edit form: `flex items-center gap-4` stacked niet verticaal
- Gebruikt `SkeletonDetailPage` voor loading state (goed)
- BreadcrumbContextSwitcher from shims

## Taken

### 1. CSS Module extractie
- [ ] `MemberDetailPage.module.css` aanmaken
- [ ] Inline styles → CSS module classes
- [ ] Utility classes waar nodig houden

### 2. Responsive layout
- [ ] Member info card: stack op mobile (avatar boven, details onder)
- [ ] Metadata grid: 1-kolom op mobile
- [ ] Edit form: inputs full-width, labels boven velden
- [ ] Action buttons: full-width stack op mobile

### 3. Breadcrumb fix
- [ ] Breadcrumb selects: max-width op mobile, truncate text
- [ ] Of: vervang door compact breadcrumb (BreadcrumbNav uit N2)

### 4. Touch targets
- [ ] Edit/Save/Cancel buttons: min-height 44px
- [ ] Back button: adequate hit area

## Checklist

- [ ] CSS Module aangemaakt
- [ ] Responsive breakpoints
- [ ] Breadcrumb mobile-fit
- [ ] Touch targets ≥ 44px
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
