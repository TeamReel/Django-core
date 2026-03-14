# Phase P2 — MatchDetailPage Mobile Foundation

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

MatchDetailPage responsive maken: CSS Module toevoegen (ontbreekt volledig), inline styles elimineren, mobile tab layout verbeteren.

## Huidige staat

- `MatchDetailPage.tsx` — 294 regels
- **Geen CSS Module** — alle styling via inline `React.CSSProperties` en utilities
- Heeft `useMatchDetailData()` facade hook (goed)
- Heeft `MobileTabBar` (goed)
- Heavy inline styles (button style objects, header styling)

## Taken

### 1. CSS Module creëren
- [ ] `MatchDetailPage.module.css` aanmaken
- [ ] Alle inline styles migreren naar CSS Module
- [ ] Mobile-first breakpoints: single-column base, multi-column desktop

### 2. Responsive layout
- [ ] Match header: team names + score compact op mobile
- [ ] Tab content: full-width, geen overflow
- [ ] Content grid within tabs: responsive columns
- [ ] Action buttons: full-width op mobile, inline op desktop

### 3. Mobile tab UX
- [ ] MobileTabBar: horizontaal scrollbaar als tabs > viewport
- [ ] Active tab indicator: duidelijk zichtbaar
- [ ] Tab content transition: smooth switch (geen layout shift)

### 4. 4-state pattern
- [ ] Loading: skeleton match header + skeleton tab content
- [ ] Empty: SmartEmptyState per tab-inhoud
- [ ] Error: retry met wedstrijd-context
- [ ] Success: content

## Checklist

- [ ] `MatchDetailPage.module.css` bestaat met responsive breakpoints
- [ ] 0 inline style objects in component
- [ ] Mobile layout: single-column, compact header
- [ ] Touch targets ≥ 44px
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
