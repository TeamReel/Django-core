# H3 — Content Highlights Carousel

| | |
|---|---|
| Fase | H3 |
| Status | ✅ DONE |
| Effort | ~2 uur |

## Doel
Horizontale swipe-carousel met thumbnails van recent gegenereerde content.

## Taken

- [x] Carousel component (horizontaal scroll, CSS scroll-snap)
- [x] Toon laatste 8 content items via `mediaApi.listItems`
- [x] Per item: thumbnail (aspect-ratio 16:9) + type-label overlay
- [x] Tap → navigeert naar `/media/{id}`
- [x] Swipeable op mobile, hover lift-effect op desktop
- [x] Lege state: "Nog geen content — genereer je eerste!" met Sparkles icon
- [x] Lazy load thumbnails (`loading="lazy"`)
- [x] Shimmer skeleton loader
- [x] `prefers-reduced-motion`: geen hover animatie

## Bestanden
- `demo/src/components/dashboard/ContentCarousel.tsx` (nieuw)
- `demo/src/components/dashboard/ContentCarousel.module.css` (nieuw)
- `demo/src/components/dashboard/index.ts` — barrel export
- `demo/src/pages/DashboardPage.tsx` — integratie na ContentPipelineCard
