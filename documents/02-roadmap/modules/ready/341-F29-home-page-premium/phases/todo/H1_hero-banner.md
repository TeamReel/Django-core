# H1 — Hero Banner met Team Branding

| | |
|---|---|
| Fase | H1 |
| Status | 📋 TODO |
| Effort | ~3 uur |

## Doel
Full-width hero banner bovenaan de Home page met teamfoto en club branding. Eerste indruk = emotie.

## Taken

- [ ] Hero banner component maken (full-width op mobile, max-width op desktop)
- [ ] Achtergrond: teamfoto uit BrandProfile (`brand_assets.hero` of `team_photo`)
- [ ] Gradient overlay (donker → transparant) voor leesbaarheid tekst
- [ ] Fallback: gradient met brand-kleuren als er geen foto is
- [ ] Clublogo (48px, rounded) + teamnaam (groot, bold, wit) + seizoen badge
- [ ] Lazy load hero afbeelding
- [ ] Skeleton loader tijdens laden
- [ ] `prefers-reduced-motion`: geen parallax

## Bestanden
- `demo/src/components/dashboard/HeroBanner.tsx` (nieuw)
- `demo/src/components/dashboard/HeroBanner.module.css` (nieuw)
- `demo/src/pages/DashboardPage.tsx` — integratie bovenaan
- `demo/src/pages/DashboardPage.module.css` — header styling aanpassen

## Klaar wanneer
- [ ] Hero banner met teamfoto of gradient
- [ ] Logo + teamnaam + seizoen zichtbaar
- [ ] Responsive: edge-to-edge mobile, contained desktop
- [ ] Dark mode OK
- [ ] Tekst contrast ≥ 4.5:1 over afbeelding
