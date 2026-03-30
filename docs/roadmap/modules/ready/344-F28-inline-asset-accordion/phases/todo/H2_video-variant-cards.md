# H2 — Video variant cards

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H0 (accordion component) |

## Doel

`VariantCardStrip` en `VariantCard` componenten: horizontale scroll van video varianten (arms_crossed, thumbs_up, etc.) met poster frame thumbnail en in-page afspelen. Tap op poster opent een video tab/panel binnen de sheet — geen fullscreen, geen navigatie weg.

## Context

**Video data** (`iterVariants`):
- `videos.{assetType}.{variantName}` → `{ raw, processed, preview_url, duration }`
- Asset types: `intro`, `celebration`, `then_vs_now`
- Variant names: `arms_crossed`, `thumbs_up`, `walking`, etc.

**Besluit**: Video afspelen via **in-page tab** — thumbnail tap opent een inline video player panel, geen fullscreen modal of navigatie.

## Taken

### 1. `VariantCardStrip.tsx`

Locatie: `demo/src/features/members/components/VariantCardStrip.tsx`

- [ ] Props: `assetType`, `variants` (array van variant data), `onPlay(variantName)`
- [ ] Horizontale scroll container (zelfde pattern als KitCardStrip)
- [ ] Rendert `VariantCard` per variant

### 2. `VariantCard.tsx`

Locatie: `demo/src/features/members/components/VariantCard.tsx`

- [ ] Props: `variantName`, `posterUrl`, `duration`, `status`, `onPlay`
- [ ] Poster frame: `<img>` met `preview_url` of video `raw` URL first-frame
- [ ] Play icon overlay (▶) op de poster
- [ ] Duration label (bijv. "0:03") linksonder
- [ ] Status badge (✓ ready / ⚙ processing) rechtsonder
- [ ] Tap → `onPlay(variantName)` callback
- [ ] Touch target ≥ 44×44px

### 3. In-page video player

- [ ] `VideoPreviewPanel` component — rendert `<video>` inline in de accordion
- [ ] Toont onder de VariantCardStrip wanneer een variant geselecteerd is
- [ ] Controls: play/pause, mute (native controls prima voor nu)
- [ ] Sluit bij tap op ander variant of bij accordion close
- [ ] Geen fullscreen — blijft binnen sheet scroll context
- [ ] `preload="metadata"` — niet auto-downloaden

### 4. `VariantCard.module.css` + `VideoPreviewPanel.module.css`

- [ ] `.card` — zelfde layout als KitCard (consistent visueel)
- [ ] `.poster` — object-fit cover, border-radius
- [ ] `.playIcon` — centered overlay, semi-transparant achtergrond
- [ ] `.duration` — absolute positioned, kleine font
- [ ] `.videoPanel` — max-height animatie, padding
- [ ] Alle kleuren via `var(--app-*)` tokens

### 5. Tests

- [ ] Video varianten tonen correcte poster thumbnails
- [ ] Tap op poster opent inline video player
- [ ] Duration label toont juiste tijd
- [ ] Status badge reflecteert processing state
- [ ] Video player sluit bij accordion close
