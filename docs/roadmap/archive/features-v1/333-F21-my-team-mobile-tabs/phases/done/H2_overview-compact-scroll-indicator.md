# H2 — Overview compact + scroll indicator

> **Effort:** ~3 uur | **Impact:** Betere mobile UX voor tab-navigatie

## Doel

Overview-tab optimaliseren voor mobile en een scroll-indicator toevoegen voor de tab-bar.

## To do

- [ ] Overview mobile layout reviewen en compacter maken
- [ ] Scroll-indicator (fade/gradient of dots) als tabs breder zijn dan viewport
- [ ] `overflow-x: auto` met `-webkit-overflow-scrolling: touch`
- [ ] Snap-scrolling op tab-bar (`scroll-snap-type: x mandatory`)
- [ ] Active tab always scrolled into view
- [ ] Test op 375px, 320px (iPhone SE), en 390px (iPhone 14)

## Done criteria

- [ ] Tab-bar scrollt smooth met visuele hint
- [ ] Overview past goed op 375px zonder overflow
- [ ] Geen content afgesneden
