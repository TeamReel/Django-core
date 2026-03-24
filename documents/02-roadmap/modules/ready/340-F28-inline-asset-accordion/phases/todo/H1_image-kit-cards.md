# H1 — Image kit cards

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H0 (accordion component) |

## Doel

`KitCardStrip` en `KitCard` componenten: horizontale scroll van kit-thumbnails per image asset type (closeup, fullbody, action_photo). Gefilterd op role via `ROLE_KIT_MAP` — keeper ziet alleen `goalkeeper`, speler ziet `home/away/third`.

## Context

**Data format** (`iterVariants`):
- Nested: `roles.{role}.images.{assetType}.{kit}` → `{ raw, processed }`
- Legacy flat: `images.{assetType}.{kit}` → `{ raw, processed }`
- `iterVariants` levert itereerbare `[mediaType, assetType, kit, variant]` tuples

**Role filtering** (`ROLE_KIT_MAP`):
- `keeper` → `['goalkeeper']`
- `player` → `['home', 'away', 'third']`

**Thumbnail URL**: `getAssetUrl(variant.processed)` of `getAssetUrl(variant.raw)` als fallback.

## Taken

### 1. `KitCardStrip.tsx`

Locatie: `demo/src/features/members/components/KitCardStrip.tsx`

- [ ] Props: `assetType`, `assets` (member's teamreel_assets), `role`, `allowedKits`
- [ ] Horizontale scroll container (`overflow-x: auto`, snap scrolling)
- [ ] Itereert door `allowedKits`, rendert `KitCard` per kit
- [ ] Toont alle relevante kits, ook als ze leeg zijn (placeholder)

### 2. `KitCard.tsx`

Locatie: `demo/src/features/members/components/KitCard.tsx`

- [ ] Props: `kit`, `variant` (raw/processed URLs of null), `status`
- [ ] Status bepaling: `processed` → "✓ ready", `raw` → "⚙ processing", geen → "— geen"
- [ ] Thumbnail: `<img>` met `processed` URL, fallback naar `raw`, fallback naar kit-placeholder
- [ ] Kit label als caption onder de thumbnail
- [ ] Status badge overlay (rechtsonder)
- [ ] Touch target ≥ 44×44px
- [ ] `loading="lazy"` op thumbnails

### 3. `KitCardStrip.module.css` + `KitCard.module.css`

- [ ] `.strip` — flexbox, gap, horizontal scroll, snap
- [ ] `.card` — fixed width (bijv. 100px), aspect-ratio, border-radius
- [ ] `.thumbnail` — object-fit cover, volle card
- [ ] `.statusBadge` — absolute positioned, token-based kleuren
- [ ] `.placeholder` — gestippeld border, icon center
- [ ] Alle kleuren via `var(--app-*)` tokens

### 4. Integratie in AssetAccordion

- [ ] Image checklist-rows renderen `<KitCardStrip>` binnen `<AssetAccordion>`
- [ ] Role wordt doorgegeven vanuit MemberSummarySheet context
- [ ] `allowedKits` = `ROLE_KIT_MAP[role].kits`

### 5. Tests

- [ ] Keeper lid toont alleen goalkeeper kit card
- [ ] Speler toont home/away/third kit cards
- [ ] Lege kit toont placeholder (niet hidden)
- [ ] Processed thumbnail laadt correct via `getAssetUrl()`
- [ ] Horizontale scroll werkt op 375px viewport
