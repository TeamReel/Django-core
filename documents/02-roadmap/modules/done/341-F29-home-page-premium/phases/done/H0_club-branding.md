# H0 — Club Branding & Logo's

| | |
|---|---|
| Fase | H0 |
| Status | ✅ DONE |
| Effort | ~2 uur |

## Doel
Clublogo zichtbaar maken op de Home page: in de header en naast wedstrijden. Directe visuele teamidentiteit.

## Taken

### Header logo
- [x] Clublogo (40×40px, rounded) links van de begroeting tonen
- [x] Logo ophalen uit BrandProfile via `useBrandProfile` hook
- [x] Fallback: initialen-avatar met hash-kleur achtergrond (Avatar component)
- [x] Dark mode compatible (Avatar + design tokens)

### Wedstrijd logo's (MatchesCard)
- [x] Eigen clublogo tonen per wedstrijd-rij (24×24px via Avatar xs)
- [x] Tegenstander-logo uit match metadata (24×24px)
- [x] Layout: `[home-logo] TeamName vs [away-logo] OpponentName`
- [x] Fallback: initialen-circle met hash-kleur achtergrond

## Bestanden
- `demo/src/pages/DashboardPage.tsx` — header met Avatar + useBrandProfile
- `demo/src/pages/DashboardPage.module.css` — `.headerBranding` class
- `demo/src/components/dashboard/MatchesCard.tsx` — logo's in UpcomingMatchRow + PastMatchRow
- `demo/src/components/dashboard/MatchesCard.module.css` — `.matchTeams`, `.matchVs` classes

## Klaar wanneer
- [x] Clublogo in header zichtbaar
- [x] Logo's bij wedstrijden in MatchesCard
- [x] Fallbacks werken zonder logo
- [x] Dark mode OK
