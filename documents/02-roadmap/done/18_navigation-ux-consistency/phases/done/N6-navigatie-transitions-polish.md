# N6 — Navigatie Transitions & Polish

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

- Sheets hadden alleen open-animaties, geen close-animaties (abrupt verdwijnen)
- Geen `prefers-reduced-motion` support op nav-componenten
- Inconsistente animatiepatronen

## Oplossing

### 1. Close animaties (NavigationSheet)
- Mobile: `slideDown` (fadeOut overlay + slideDown sheet)
- Desktop: `slideOutRight` (fadeOut overlay + slideOutRight sheet)
- JS `handleClose()` zet `closing` state → CSS `.sheetClosing` class → wacht `CLOSE_DURATION` → onClose()
- `getCloseDuration()` retourneert 0 bij `prefers-reduced-motion` → geen setTimeout delay

### 2. `prefers-reduced-motion` support
**NavigationSheet.module.css:**
- Overlay + sheet animaties → `0.01ms` duration bij reduced motion

**MobileBottomNav.module.css:**
- Tab + iconPill + createButton transitions → `none` bij reduced motion
- `:active` transform → `none` bij reduced motion

### 3. Bestaande coverage
`base.css` had al een globale `prefers-reduced-motion` rule die `animation-duration` en `transition-duration` op `*` zet. De component-specifieke overrides zijn additioneel als documentatie en garantie.

## Bestanden
- `demo/src/components/ui/NavigationSheet.tsx` — `getCloseDuration()` + `closing` state
- `demo/src/components/ui/NavigationSheet.module.css` — Close keyframes + reduced-motion
- `demo/src/components/MobileBottomNav.module.css` — Reduced-motion overrides
