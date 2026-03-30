# Phase P6 — SettingsPage Mobile

**Track:** P (Page Foundations)
**Layer:** 1 — Page shells
**Status:** Todo

## Doel

SettingsPage responsive maken: sidebar navigatie omzetten naar mobile-friendly tabs/select, form inputs touch-optimized, viewport height fix.

## Huidige staat

- `SettingsPage.tsx` — 285 regels, delegeert naar `useSettingsPage.ts` facade hook (138 ln)
- `SettingsPage.module.css` — 62 regels, **0 `@media` queries**
- Gebruikt `<Settings>` component uit `@django-core/page-templates` (sidebar + content layout)
- `height: calc(100vh - 120px)` — fragiel op mobile viewports
- Form inputs: `padding: 10px 12px` — net te klein voor mobile touch
- Sections: profile, preferences, notifications, security

## Taken

### 1. Mobile navigation pattern
- [ ] Op mobile (≤768px): sidebar verbergen, section-select of horizontale tabs tonen
- [ ] Active section highlight
- [ ] Smooth section wisseling

### 2. Responsive CSS
- [ ] `height: calc(100vh - 120px)` → `min-height` met mobile-safe viewport
- [ ] Form inputs: `min-height: 44px` touch targets
- [ ] Save buttons: full-width op mobile
- [ ] Section headings: compactere spacing op mobile
- [ ] Password/2FA knoppen: stack verticaal op mobile

### 3. Mobile form UX
- [ ] Labels boven inputs (al zo, goed)
- [ ] Textarea: grotere touch target
- [ ] Toggle switches: grotere hit area
- [ ] Notification toggles: card-gebaseerd met switch rechts

## Checklist

- [ ] CSS Module responsive breakpoints (≤768px, ≤480px)
- [ ] Mobile section navigation
- [ ] Touch targets ≥ 44px
- [ ] Viewport height fix
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
