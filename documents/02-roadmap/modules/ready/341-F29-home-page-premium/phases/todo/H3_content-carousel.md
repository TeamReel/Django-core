# H3 — Content Highlights Carousel

| | |
|---|---|
| Fase | H3 |
| Status | 📋 TODO |
| Effort | ~2 uur |

## Doel
Horizontale swipe-carousel met thumbnails van recent gegenereerde content. "Kijk wat we gemaakt hebben!" — trots en motivatie.

## Taken

- [ ] Carousel component (horizontaal scroll, CSS scroll-snap)
- [ ] Toon laatste 6-8 content items met status "completed" of "approved"
- [ ] Per item: thumbnail (aspect-ratio 16:9) + type-label overlay ("Lineup", "Match graphic")
- [ ] Tap → opent content detail/preview
- [ ] Swipeable op mobile, optioneel pijltjes op desktop
- [ ] Lege state: "Nog geen content — genereer je eerste!" met CTA
- [ ] Lazy load thumbnails buiten viewport
- [ ] `prefers-reduced-motion`: geen auto-scroll

## Data
- Content items uit bestaande content API
- Thumbnail URL uit content metadata (S3)
- Gesorteerd op `created_at` DESC, max 8 items

## Bestanden
- `demo/src/components/dashboard/ContentCarousel.tsx` (nieuw)
- `demo/src/components/dashboard/ContentCarousel.module.css` (nieuw)
- `demo/src/pages/DashboardPage.tsx` — integratie na ContentPipelineCard

## Klaar wanneer
- [ ] Carousel toont content thumbnails
- [ ] Swipeable op mobile
- [ ] Tap opent detail
- [ ] Lege state met CTA
- [ ] Dark mode OK
