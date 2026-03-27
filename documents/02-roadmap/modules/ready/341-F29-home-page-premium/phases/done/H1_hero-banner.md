# H1 — Hero Banner met Team Branding

| | |
|---|---|
| Fase | H1 |
| Status | ✅ DONE |
| Effort | ~3 uur |

## Doel
Full-width hero banner bovenaan de Home page met teamfoto en club branding. Eerste indruk = emotie.

## Taken

- [x] Hero banner component maken (full-width op mobile, max-width op desktop)
- [x] Achtergrond: first `club_background` uit BrandProfile
- [x] Gradient overlay (donker → transparant) voor leesbaarheid tekst
- [x] Fallback: gradient met brand primary color of `--app-primary`
- [x] Clublogo (56px, rounded via Avatar `lg`) + teamnaam (groot, bold, wit)
- [x] Lazy load hero afbeelding (`loading="lazy"`)
- [x] Skeleton loader tijdens laden
- [x] `prefers-reduced-motion`: geen fade-in animatie

## Bestanden
- `demo/src/components/dashboard/HeroBanner.tsx` (nieuw)
- `demo/src/components/dashboard/HeroBanner.module.css` (nieuw)
- `demo/src/components/dashboard/index.ts` — barrel export
- `demo/src/pages/DashboardPage.tsx` — integratie boven header (niet op match-day)

## Klaar wanneer
- [x] Hero banner met teamfoto of gradient
- [x] Logo + teamnaam zichtbaar
- [x] Responsive: edge-to-edge mobile, contained desktop
- [x] Dark mode OK (gradient overlay + tokens)
- [x] Tekst contrast ≥ 4.5:1 (white text + dark overlay + text-shadow)
