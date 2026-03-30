# Phase 44 — Mobile: Touch Targets + Safe Areas

**Track:** F1-F2 (Mobile-First Polish)
**Status:** 📋 Planned

## Doel

Alle interactieve elementen ≥ 44x44px. Correcte safe area handling voor notch/dynamic island.

## Taken

### F1: Touch Targets
- [ ] Audit: welke buttons/links zijn <44px touch target
- [ ] Alle buttons ≥ 44x44px (via padding of min-height)
- [ ] Alle links in navigatie ≥ 44px touch area
- [ ] Form elements ≥ 44px hoogte op mobiel

### F2: Safe Areas
- [ ] `env(safe-area-inset-*)` toevoegen aan app shell
- [ ] Bottom navigation respecteert safe area
- [ ] Modals respecteren safe area
- [ ] Landscape mode getest

## Checklist

- [ ] Touch target audit compleet
- [ ] Alle interactieve elementen ≥ 44px
- [ ] Safe area insets correct
- [ ] Getest op iPhone (notch) en Android
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
