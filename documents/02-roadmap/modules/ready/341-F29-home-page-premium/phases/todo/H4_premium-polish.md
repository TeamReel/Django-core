# H4 — Premium Polish & Animaties

| | |
|---|---|
| Fase | H4 |
| Status | 📋 TODO |
| Effort | ~4 uur |

## Doel
Visuele upgrade van alle dashboard cards + streak widget prominenter + entrance animaties. Van "het werkt" naar "het voelt premium".

## Taken

### Card elevation upgrade
- [ ] Premium shadow tokens definiëren (`--shadow-card`, `--shadow-card-hover`)
- [ ] Multi-layer box-shadows op alle dashboard cards
- [ ] Subtiel glassmorphism op ActiveMatchCard en ContentStreakWidget (backdrop-blur + transparantie)
- [ ] Hover lift-effect op interactieve cards (translateY(-2px) + shadow increase)
- [ ] Dark mode: subtielere shadows

### Streak widget verplaatsen
- [ ] ContentStreakWidget verplaatsen naar sectie-index 0 (direct onder hero)
- [ ] Visueel laten aansluiten op hero banner
- [ ] Test met streak=0, streak actief, at-risk states

### Staggered entrance animatie
- [ ] `@keyframes fadeSlideUp`: translateY(8px) → 0, opacity 0 → 1
- [ ] Staggered delay per card (50ms increment via CSS custom property)
- [ ] Skeleton loaders met shimmer-effect tijdens data loading
- [ ] `@media (prefers-reduced-motion: reduce)`: directe render, geen animatie

## Bestanden
- `demo/src/styles/tokens.css` — nieuwe shadow tokens
- `demo/src/pages/DashboardPage.tsx` — streak ordening + animatie classes
- `demo/src/pages/DashboardPage.module.css` — shadows, animaties, shimmer
- `demo/src/components/dashboard/*.tsx` — card-level styling updates

## Klaar wanneer
- [ ] Cards hebben diepte en premium feel
- [ ] Streak widget staat bovenaan
- [ ] Staggered fade-in bij laden
- [ ] Skeleton loaders tijdens loading
- [ ] Reduced-motion gerespecteerd
- [ ] Dark mode OK
