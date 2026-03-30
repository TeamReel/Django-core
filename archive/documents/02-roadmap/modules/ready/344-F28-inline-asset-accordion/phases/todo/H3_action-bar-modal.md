# H3 — Action bar + modal integratie

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H1 (image kit cards), H2 (video variant cards) |

## Doel

`AccordionActionBar` met genereer-, upload-, en reprocess-knoppen per asset type. Integratie met bestaande `AssetGenerationModal`. Bulk generatie als quick action optie met asset-selectie checkboxes.

## Context

**Bestaande modal** (`AssetGenerationModal`):
- 3-step wizard: selecteer type → configureer → genereer
- Wordt nu geopend vanuit MemberDetailPanel
- Na H3: wordt geopend als modal over de MemberSummarySheet

**Quick action** (boven checklist):
- Blijft bestaan — "🪄 Genereer Close-up" knop
- Toevoegen: "Genereer ontbrekende assets" optie met selectie-checkboxes

**Besluit**: Bulk generatie met checkboxes zodat admin kan kiezen welke assets gegenereerd worden.

## Taken

### 1. `AccordionActionBar.tsx`

Locatie: `demo/src/features/members/components/AccordionActionBar.tsx`

- [ ] Props: `member`, `role`, `assetType`, `kit?`, `onGenerate`, `onUpload`, `onReprocess`
- [ ] Drie knoppen: 🪄 Genereer, 📤 Upload, 🔄 Reprocess
- [ ] Conditioneel tonen:
  - Genereer: altijd zichtbaar (genereert nieuwe variant)
  - Upload: altijd zichtbaar (file picker)
  - Reprocess: alleen als `raw` bestaat maar `processed` ontbreekt of verouderd
- [ ] Responsive: buttons stacken verticaal op smalle viewports
- [ ] Admin-only: niet tonen voor read-only users

### 2. Genereer integratie

- [ ] "Genereer" knop → opent `AssetGenerationModal` met pre-filled context:
  - `member`, `role`, `assetType`, `kit` (voor images)
  - `variantName` (voor videos)
- [ ] Modal opent als overlay over de sheet (z-index boven NavigationSheet)
- [ ] Na succesvolle generatie → refresh member data → kit card updated

### 3. Upload integratie

- [ ] "Upload" knop → opent native file input (`accept="image/*"` of `video/*`)
- [ ] Na selectie → upload naar S3 via bestaande upload API
- [ ] Progress indicator op de KitCard/VariantCard tijdens upload
- [ ] Na upload → refresh member data

### 4. Reprocess integratie

- [ ] "Reprocess" knop → API call naar reprocessing endpoint
- [ ] Status op KitCard wijzigt naar "⚙ processing"
- [ ] Polling of websocket voor completion (consistent met bestaand patroon)

### 5. Bulk generatie quick action

- [ ] Nieuwe quick action optie: "Genereer ontbrekende assets"
- [ ] Opent een selectie-panel met checkboxes per ontbrekend asset type
- [ ] Per asset type: checkbox + label + kit indicator
- [ ] "Genereer geselecteerde" knop onderaan
- [ ] Genereert sequentieel of parallel via bestaande generatie API
- [ ] Progress indicator per asset in de checklist

### 6. `AccordionActionBar.module.css`

- [ ] `.actionBar` — flex container, gap, padding-top border
- [ ] `.actionButton` — consistent met bestaande button tokens
- [ ] Touch targets ≥ 44×44px
- [ ] `:focus-visible` styling
- [ ] Alle kleuren via `var(--app-*)` tokens

### 7. Tests

- [ ] "Genereer" opent AssetGenerationModal met correcte context
- [ ] "Upload" triggert file picker
- [ ] "Reprocess" knop alleen zichtbaar wanneer relevant
- [ ] Bulk generatie toont checkboxes voor ontbrekende assets
- [ ] Non-admin ziet geen action bar
- [ ] Modal overlay z-index correct boven sheet
