# Phase P9 — ProfilePage Mobile

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

ProfilePage mobile polish: CSS module toevoegen, tap targets vergroten, spacing optimaliseren.

## Huidige staat

- `ProfilePage.tsx` — 367 regels, inline state (geen facade hook)
- Geen CSS module — gebruikt utility classes + inline `style={{ }}`
- Single-column `flex-col` layout — passabel op mobile
- "Back to Users" button: inline padding `6px 12px` (te klein)
- Edit form: standaard Input/Button componenten
- Loading/error states aanwezig

## Taken

### 1. CSS Module
- [ ] `ProfilePage.module.css` aanmaken
- [ ] Inline styles → module classes
- [ ] Responsive breakpoints toevoegen

### 2. Mobile spacing
- [ ] Card padding: meer ademruimte op mobile
- [ ] Section spacing: compacter maar leesbaar
- [ ] Profile avatar area: gecentreerd op mobile

### 3. Touch targets
- [ ] Back button: min 44px touch target
- [ ] Edit/Save buttons: full-width op mobile
- [ ] Input fields: min-height 44px

### 4. Profile display
- [ ] User info: stack verticaal (avatar, naam, email, role badges)
- [ ] Metadata (last login, date joined): compact card
- [ ] Edit mode: inputs full-width met adequate spacing

## Checklist

- [ ] CSS Module aangemaakt
- [ ] Responsive breakpoints
- [ ] Touch targets ≥ 44px
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
