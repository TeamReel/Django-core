# H4 — Premium Polish & Animaties

| | |
|---|---|
| Fase | H4 |
| Status | ✅ DONE |
| Effort | ~4 uur |

## Doel
Visuele upgrade van alle dashboard cards + streak widget prominenter + entrance animaties.

## Taken

### Card elevation upgrade
- [x] `--shadow-card` en `--shadow-card-hover` tokens in `tokens.css` (light + dark)
- [x] Multi-layer box-shadows via `.mainCol > *` selector
- [x] Hover lift-effect op interactieve cards (shadow increase)
- [x] Dark mode: subtielere shadows via `[data-theme="dark"]`

### Streak widget verplaatsen
- [x] ContentStreakWidget verplaatst naar positie 0 (direct onder hero, boven ActiveMatchCard)
- [x] Visueel prominent als eerste card

### Staggered entrance animatie
- [x] `@keyframes fadeSlideUp`: translateY(8px) → 0, opacity 0 → 1
- [x] Staggered delay per card (50ms increment via nth-child)
- [x] Shimmer skeleton loaders (al in ContentCarousel + HeroBanner)
- [x] `@media (prefers-reduced-motion: reduce)`: directe render, geen animatie

## Bestanden
- `demo/src/styles/tokens.css` — `--shadow-card`, `--shadow-card-hover`
- `demo/src/pages/DashboardPage.tsx` — streak widget verplaatst + renumbered comments
- `demo/src/pages/DashboardPage.module.css` — shadows, fadeSlideUp animation, staggered delays
