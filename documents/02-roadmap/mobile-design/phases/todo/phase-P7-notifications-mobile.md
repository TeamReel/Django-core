# Phase P7 — NotificationsPage Mobile

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

NotificationsPage responsive fine-tuning: header actions compacter, notification cards mobile-optimized, al bestaande PullToRefresh/SwipeableCard behouden.

## Huidige staat

- `NotificationsPage.tsx` — 404 regels, inline state (geen facade hook)
- `NotificationsPage.module.css` — 52 regels, **0 `@media` queries**
- Heeft `PullToRefresh` + `SwipeableCard` (goed, mobile patterns)
- `max-width: 1100px` / `900px` containers — ok maar geen mobile optimization
- Header actions: `flex-row gap-8 flex-wrap` — kan crowden op small screens
- Filter tabs (all/unread) + bulk actions (mark all read)

## Taken

### 1. Header & actions responsive
- [ ] Filter tabs: full-width op mobile, grotere touch targets
- [ ] "Mark all read" button: icon-only op mobile of verplaats naar overflow menu
- [ ] Page header: compactere spacing

### 2. Notification card mobile
- [ ] Notification items: full-width, adequate padding
- [ ] Timestamp: relative time, compact op mobile
- [ ] Action URL: hele card tappable (al deels via SwipeableCard)
- [ ] Unread indicator: prominenter

### 3. Empty state
- [ ] Empty state voor "geen notificaties" — centered, mobile-friendly

## Checklist

- [ ] CSS Module responsive breakpoints
- [ ] Header actions mobile layout
- [ ] Touch targets ≥ 44px
- [ ] Bestaande PullToRefresh/Swipe bewaard
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
