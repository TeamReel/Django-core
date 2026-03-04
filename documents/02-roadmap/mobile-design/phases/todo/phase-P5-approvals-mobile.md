# Phase P5 — ApprovalsPage Mobile Foundation

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

ApprovalsPage responsive maken: facade data hook, responsive job cards, mobile filter chips. Grootste CSS module (619 ln) heeft 0 breakpoints.

## Huidige staat

- `ApprovalsPage.tsx` — 388 regels
- `ApprovalsPage.module.css` — 619 regels, **0 `@media` queries**
- Geen facade hook — 3 data hooks + filter state verspreid
- Heeft `MobileTabBar` en `PullToRefresh` (goed)
- Multiple modals (review, follow-up)
- Helpers al geëxtraheerd naar `approvalsTypes.ts`

## Taken

### 1. Facade data hook
- [ ] `useApprovalsPageData()` extraheren
- [ ] Filter state, modal state, derived data naar hook
- [ ] Component wordt render shell

### 2. Responsive CSS
- [ ] Job cards: full-width stack op mobile
- [ ] Filter chips: horizontaal scrollbaar
- [ ] Modal contentt: respect mobile viewport
- [ ] Action buttons: full-width op mobile
- [ ] Tab counts: compact badges

### 3. Job card mobile layout
- [ ] Thumbnail links, metadata rechts (compact)
- [ ] Status badge prominent
- [ ] Approve/reject buttons: full-width, grote touch targets

### 4. 4-state pattern
- [ ] Loading: skeleton job cards
- [ ] Empty: SmartEmptyState per tab
- [ ] Error: retry
- [ ] Success: job list

## Checklist

- [ ] `useApprovalsPageData()` facade hook
- [ ] CSS Module responsive breakpoints
- [ ] Job cards mobile layout
- [ ] Filter chips scrollbaar
- [ ] Touch targets ≥ 44px
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
