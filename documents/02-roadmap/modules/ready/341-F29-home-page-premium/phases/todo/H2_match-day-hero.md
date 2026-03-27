# H2 — Match Day Hero Mode

| | |
|---|---|
| Fase | H2 |
| Status | 📋 TODO |
| Effort | ~3 uur |

## Doel
Op wedstrijddag transformeert de hero sectie in een epische "match poster": eigen logo vs tegenstander, countdown, stadium-sfeer.

## Taken

### Match mode activatie
- [ ] Hero schakelt naar match-mode wanneer wedstrijd < 24 uur weg is
- [ ] Hergebruik `useClosestMatch()` hook (bestaand)

### Visuele layout
- [ ] Eigen clublogo (links, 48px) vs tegenstander-logo (rechts, 48px)
- [ ] "VS" divider centraal
- [ ] Countdown timer (HH:MM, live aftellend) — alleen timer-element updaten
- [ ] Donkere stadium-gradient achtergrond
- [ ] Fallback logo's: initialen-circles

### LIVE & post-match
- [ ] LIVE modus: rode pulserende badge + optioneel score
- [ ] Post-match (< 2 uur na afloop): uitslag prominent + "Genereer content" CTA

### Toegankelijkheid
- [ ] `prefers-reduced-motion`: statische versie, geen puls-animatie
- [ ] Timer als `aria-live="polite"` (update elke minuut, niet elke seconde)
- [ ] Dark mode compatible

## Bestanden
- `demo/src/components/dashboard/HeroBanner.tsx` — match-mode variant
- `demo/src/components/dashboard/HeroBanner.module.css` — match-mode styling

## Klaar wanneer
- [ ] Match mode activeert < 24 uur voor wedstrijd
- [ ] Logo vs logo layout
- [ ] Countdown timer
- [ ] LIVE + post-match states
- [ ] Smooth transitie van/naar normale hero
