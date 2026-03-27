# H0 — Club Branding & Logo's

| | |
|---|---|
| Fase | H0 |
| Status | 📋 TODO |
| Effort | ~2 uur |

## Doel
Clublogo zichtbaar maken op de Home page: in de header en naast wedstrijden. Directe visuele teamidentiteit.

## Taken

### Header logo
- [ ] Clublogo (40×40px, rounded) links van de begroeting tonen
- [ ] Logo ophalen uit BrandProfile of Organisation data (al beschikbaar in context)
- [ ] Fallback: initialen-avatar met brand-kleur achtergrond
- [ ] Dark mode compatible

### Wedstrijd logo's (MatchesCard)
- [ ] Eigen clublogo tonen per wedstrijd-rij (24×24px)
- [ ] Tegenstander-logo uit match metadata (24×24px)
- [ ] Layout: `[eigen-logo] vs [tegenstander-logo] Teamnaam`
- [ ] Fallback: initialen-circle met grijze achtergrond

## Bestanden
- `demo/src/pages/DashboardPage.tsx` — header sectie
- `demo/src/pages/DashboardPage.module.css`
- `demo/src/components/dashboard/MatchesCard.tsx` — wedstrijd-rijen

## Klaar wanneer
- [ ] Clublogo in header zichtbaar
- [ ] Logo's bij wedstrijden in MatchesCard
- [ ] Fallbacks werken zonder logo
- [ ] Dark mode OK
