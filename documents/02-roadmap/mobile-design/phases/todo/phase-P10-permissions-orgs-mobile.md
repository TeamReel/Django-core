# Phase P10 — PermissionsPage & OrganisationsPage Mobile

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

Admin-only tabel-pagina's responsive: wide permission matrix + organisation table omzetten naar mobile-friendly card/accordion layout.

## Huidige staat

### PermissionsPage
- `PermissionsPage.tsx` — 193 regels
- `PermissionsPage.module.css` — 98 regels, **0 `@media` queries**
- Wide permission matrix `<Table>` met `width: 360px` + meerdere `100px` role columns (700px+ min)
- Sticky columns met `position: sticky` + `z-index` — problematisch op mobile
- `max-height: calc(100vh - 320px)` — desktop-calibrated

### OrganisationsPage
- `OrganisationsPage.tsx` — 393 regels
- `OrganisationsPage.module.css` — 46 regels, **0 `@media` queries**
- 6-kolom tabel + action buttons (View/Edit/Delete)
- `overflow-x-auto` voorkomt breakage maar forceert horizontal scroll
- Header met flex-row action buttons

## Taken

### 1. PermissionsPage — card/accordion layout
- [ ] Op mobile: permission rijen als cards (permission naam + role toggles)
- [ ] Of: accordion per permission categorie
- [ ] Tabel bewaren op desktop (≥1024px)
- [ ] Sticky header/column verwijderen op mobile

### 2. OrganisationsPage — card list
- [ ] Op mobile: org items als cards (naam, type, member count, actions)
- [ ] Action buttons: icon-only of overflow menu op mobile
- [ ] Tabel bewaren op desktop
- [ ] Search/filter: full-width op mobile

### 3. Responsive CSS
- [ ] Beide: `max-height` fixes voor mobile viewport
- [ ] Beide: touch targets op action buttons ≥ 44px
- [ ] Beide: compactere spacing op mobile

## Checklist

- [ ] PermissionsPage mobile card layout
- [ ] OrganisationsPage mobile card layout
- [ ] CSS Module responsive breakpoints
- [ ] Touch targets ≥ 44px
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
