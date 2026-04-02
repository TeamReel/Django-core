# H3 — Media tab segmented control + asset-matrix

> **Effort:** ~3 uur | **Impact:** Media tab met twee views + visueel asset-overzicht voor admins

## To do

### Segmented control

- [ ] `SegmentedControl` component:
  - Twee opties: "Per wedstrijd" / "Per seizoen"
  - Premium feel: niet als pills, maar als iOS-stijl toggle
  - CSS: subtiele achtergrond, sliding indicator, design tokens
  - `value` + `onChange` props, gecontroleerd component
  - `:focus-visible` op segmenten, keyboard navigatie (pijltjestoetsen)

### View: Per wedstrijd (default)

- [ ] Wedstrijden als `ListSection` groepen (meest recent bovenaan):
  - Section header: "ASC 6 vs RKC 3 | 8 mrt"
  - Thumbnails in horizontale scroll (`overflow-x: auto`)
  - Ondertitel: "5 items | 3 video"
  - Admin: "Genereer meer" link met `ChevronRight`
- [ ] Tap op thumbnail -> fullscreen viewer (bestaand)
- [ ] Lege wedstrijden (nog geen content) tonen met placeholder tekst

### View: Per seizoen (asset-matrix)

- [ ] **Desktop (>=768px)**: volle matrix-tabel
  - Kolom-headers: prof, full, clo, intr, cele
  - Rij per lid: naam + 5 cellen met `Check` icon (--text-success) of leeg (--text-tertiary)
  - Tap op naam -> MemberDetailPage
- [ ] **Mobiel (<768px)**: compacte weergave
  - Rij per lid: avatar + naam + 5 mini-dots (8px, gevuld of leeg)
  - Zelfde data, compacter formaat
- [ ] Gebruik `getMemberAssetStatus()` helper uit H0 voor per-slot data
- [ ] Sorteer: leden met minste assets bovenaan (admin ziet direct wie actie nodig heeft)

### Polish en a11y

- [ ] `@media (prefers-reduced-motion: reduce)` op segmented control animatie
- [ ] `aria-label` op segmented control en matrix-cellen
- [ ] Thumbnail-rij: keyboard scrollable, screen reader beschrijvingen
- [ ] Consistente spacing en tokens over alle views
- [ ] Visuele check op 375px, 768px en 1024px viewports

## Done criteria

- [ ] Segmented control wisselt tussen "Per wedstrijd" en "Per seizoen" view
- [ ] Per wedstrijd: thumbnails in horizontale scroll met wedstrijd-headers
- [ ] Per seizoen desktop: volle matrix met Check/leeg per asset-slot per lid
- [ ] Per seizoen mobiel: compacte mini-dots weergave
- [ ] Admin ziet "Genereer meer" links per wedstrijd
- [ ] Tap op lid-naam navigeert naar MemberDetailPage
- [ ] Reduced motion respecteert toggle-animatie
- [ ] Touch targets >= 44x44px, `:focus-visible`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
