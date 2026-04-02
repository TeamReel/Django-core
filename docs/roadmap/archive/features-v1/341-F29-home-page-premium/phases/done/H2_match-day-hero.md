# H2 — Match Day Hero Mode

| | |
|---|---|
| Fase | H2 |
| Status | ✅ DONE |
| Effort | ~3 uur |

## Doel
Op wedstrijddag transformeert de hero sectie in een epische "match poster": eigen logo vs tegenstander, countdown, stadium-sfeer.

## Taken

- [x] Hero schakelt naar match-mode via `matchDay` en `activeMatch` props
- [x] Eigen clublogo (links, 56px) vs tegenstander-logo (rechts, 56px) via Avatar
- [x] "VS" divider centraal
- [x] Countdown timer (uit `useMatchDayMode`) — "Over 2u 15min"
- [x] Donkere stadium-gradient achtergrond
- [x] Fallback logo's: initialen-circles
- [x] LIVE modus: rode pulserende badge + optioneel score
- [x] `prefers-reduced-motion`: statische versie, geen puls-animatie
- [x] Countdown als `aria-live="polite"`
- [x] Dark mode compatible
- [x] Klik op hero → navigeert naar match detail

## Bestanden
- `demo/src/components/dashboard/HeroBanner.tsx` — match-mode variant met props
- `demo/src/components/dashboard/HeroBanner.module.css` — `.matchBanner`, `.matchLogos`, `.vsText`, `.liveBadge`
- `demo/src/pages/DashboardPage.tsx` — HeroBanner altijd getoond, match-day props doorgeven
