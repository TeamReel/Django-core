# H0 — Wedstrijd-knop + KNVB-label weg

> **Status:** ✅ Done
> **Commit:** `2270ca41`

## Wat is gedaan

### Wedstrijd toevoegen-knop (UpcomingMatchesCard)
- `Plus` icon geïmporteerd uit lucide-react
- Knop toegevoegd in 3 states: loading, empty, en main header
- Dispatcht `teamreel:open-quick-create` met `{ flow: 'match' }`
- Stijl: 32×32px zichtbaar, 44×44px touch target, `aria-label="Wedstrijd toevoegen"`
- Hover, active, focus-visible, reduced-motion states

### KNVB-label verwijderd (MatchOverview)
- `match.period?.name` blok verwijderd (toonde bijv. "KNVB 6e klasse")
- `Trophy` icon import verwijderd
- Commentaar achtergelaten voor context

## Bestanden
- `demo/src/components/dashboard/UpcomingMatchesCard.tsx`
- `demo/src/components/dashboard/UpcomingMatchesCard.module.css`
- `demo/src/components/dashboard/MatchOverview.tsx`
