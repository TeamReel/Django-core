# 340-F28 — Inline Asset Accordion in MemberSummarySheet

| | |
|---|---|
| Code | F28 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~16 uur |
| Afhankelijkheden | F26 (done), B70 (done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie

De MemberSummarySheet toont een checklist van assets per lid:

```
┌──────────────────────────────────┐
│  ← 3 / 18 · 12 met foto →       │
│                                   │
│     [Avatar]                      │
│     Bram Gerrits                  │
│     Keeper · ASC'62               │
│     ████████░░ 6/9 assets         │
│                                   │
│  🪄 Genereer Close-up         →  │
│                                   │
│  [📸] Upload             ✓       │
│  [👕] Fullbody in tenue  ✓       │
│  [✂️] Close-up           ✗       │  ← klik sluit sheet,
│  [🎬] Short intro        ✓       │     opent MemberDetailPanel
│  [✨] Goal celebration    ✗       │
│  ...                              │
│                                   │
│  [Bewerken]  [Bekijk profiel →]   │
└──────────────────────────────────┘
```

**Probleem**: Klikken op een checklist-item sluit de sheet en opent MemberDetailPanel — een volledige pagina-overlay met 5 tabs. De context van de checklist gaat verloren:

- Admin springt uit de "overzicht" flow naar een editing-flow
- Na bewerking keert de admin terug naar de selectielijst, niet de checklist
- Vergelijken van assets binnen de sheet is onmogelijk
- De back-navigatie (sheet → panel → terug) voelt indirect

### 1.2 Gewenste situatie

**Inline accordion** — klikken op een checklist-item klapt een detailpaneel open binnen de sheet:

```
┌──────────────────────────────────┐
│  ← 3 / 18 · 12 met foto →       │
│                                   │
│     [Avatar]                      │
│     Bram Gerrits                  │
│     Keeper · ASC'62               │
│     ████████░░ 6/9 assets         │
│                                   │
│  [📸] Upload             ✓       │
│  [👕] Fullbody in tenue  ✓       │
│  ╔══════════════════════════════╗ │
│  ║ [✂️] Close-up          ✗     ║ │
│  ║                              ║ │
│  ║  ┌─────────┐ ┌─────────┐    ║ │
│  ║  │goalkeeper│ │  home   │    ║ │
│  ║  │  [foto]  │ │ [foto]  │    ║ │
│  ║  │ ✓ ready  │ │ ✓ ready │    ║ │
│  ║  └─────────┘ └─────────┘    ║ │
│  ║                              ║ │
│  ║  [🪄 Genereer]  [📤 Upload] ║ │
│  ║  [🔄 Reprocess]             ║ │
│  ╚══════════════════════════════╝ │
│  [🎬] Short intro        ✓       │
│  [✨] Goal celebration    ✗       │
│  ...                              │
│                                   │
│  [Bekijk profiel →]               │
└──────────────────────────────────┘
```

**Voordelen:**
- Context behouden — de checklist blijft zichtbaar
- Snelle vergelijking — alle assets in één scrollbare view
- iOS-achtig accordion patroon — consistent met rest van de hub
- Minder navigatie-stappen — geen sheet → panel → terug flow
- Één oogopslag: welke kits aanwezig, processing status per variant

---

## 2. Design

### 2.1 Accordion behavior

- **Max 1 open** — tappen op een ander item sluit het vorige
- **Smooth animatie** — `max-height` transition met `prefers-reduced-motion` respect
- **Auto-scroll** — na openen scrollt de accordion in view
- **Sluiten** — tweede tap op hetzelfde item, of tap op close-icoon
- **Read-only vs Admin** — non-admins zien alleen de preview, geen actieknoppen

### 2.2 Accordion inhoud per asset type

#### Images (closeup, fullbody, action_photo)

```
┌─ Kit cards (horizontal scroll als >2 kits) ──────────┐
│ ┌────────┐ ┌────────┐ ┌────────┐                     │
│ │  home   │ │  away  │ │goalkeep│                     │
│ │ [thumb] │ │ [thumb]│ │ [thumb]│                     │
│ │ ✓ ready │ │ — geen │ │ ✓ ready│                     │
│ └────────┘ └────────┘ └────────┘                     │
├──────────────────────────────────────────────────────┤
│ Processing: ████████░░ 80%  "Removing background..."  │
├──────────────────────────────────────────────────────┤
│ [🪄 Genereer variant]  [📤 Upload]  [🔄 Reprocess]  │
└──────────────────────────────────────────────────────┘
```

- **Kit cards**: Tonen `processed` thumbnail of placeholder per kit
- **Status per kit**: `raw` / `processing` / `processed` / leeg
- **Gefilterd op role**: Keeper ziet `goalkeeper`, speler ziet `home/away/third`

#### Videos (intro, celebration, then_vs_now)

```
┌─ Variant cards (horizontal scroll) ──────────────────┐
│ ┌─────────────┐ ┌─────────────┐                      │
│ │ arms_crossed │ │  thumbs_up  │                      │
│ │   [poster]   │ │  [poster]   │                      │
│ │  ▶ 0:03      │ │  ▶ 0:04     │                      │
│ │  ✓ ready     │ │  ⚙ processing│                     │
│ └─────────────┘ └─────────────┘                      │
├──────────────────────────────────────────────────────┤
│ [🪄 Genereer nieuw]  [📤 Upload video]               │
└──────────────────────────────────────────────────────┘
```

- **Variant cards**: Per video-variant (arms_crossed, thumbs_up, etc.)
- **Poster frame**: `preview_url` als thumbnail
- **Afspelen**: Tap op poster → opent in-page tab/panel (niet fullscreen, geen navigatie weg). Blijft binnen de sheet context

### 2.3 Component-structuur

```
MemberSummarySheet
  └─ AssetChecklist
       ├─ ChecklistRow (Upload)
       ├─ ChecklistRow (Fullbody) ← tappable
       │    └─ AssetAccordion
       │         ├─ KitCardStrip (horizontal scroll)
       │         │    └─ KitCard × N (thumbnail + status)
       │         ├─ ProcessingStatus (optional)
       │         └─ ActionBar (Genereer / Upload / Reprocess)
       ├─ ChecklistRow (Close-up) ← tappable
       │    └─ AssetAccordion (collapsed)
       ├─ ChecklistRow (Short intro) ← tappable
       │    └─ VideoAccordion
       │         ├─ VariantCardStrip
       │         └─ ActionBar
       └─ ...
```

### 2.4 Nieuwe componenten

| Component | Verantwoordelijkheid |
|-----------|---------------------|
| `AssetAccordion` | Container met open/close animatie, auto-scroll |
| `KitCardStrip` | Horizontale scroll van kit-thumbnails |
| `KitCard` | Thumbnail + status badge per kit variant |
| `VariantCardStrip` | Horizontale scroll voor video variants |
| `VariantCard` | Video poster + duration + status |
| `AccordionActionBar` | Knoppen: genereer, upload, reprocess |

### 2.5 Data flow

```
MemberSummarySheet
  │
  ├─ buildAssetChecklist(assets, role) → AssetItem[]
  │     (bestaand — levert checklist items)
  │
  └─ per open accordion:
       │
       ├─ iterVariants(assets, role, mediaType, assetType)
       │     → alle kit-varianten voor dit asset type
       │
       ├─ ROLE_KIT_MAP[role].kits
       │     → welke kits getoond worden (filter)
       │
       └─ Actions:
            ├─ onGenerate(member, role, assetType, kit)
            │     → opent AssetGenerationModal (bestaand)
            ├─ onUpload(member, role, assetType, kit)
            │     → file input → upload API
            └─ onReprocess(member, role, assetType, kit)
                  → trigger reprocessing API
```

### 2.6 Interactie met bestaande componenten

| Bestaand | Hergebruik | Aanpassing |
|----------|-----------|-----------|
| `AssetGenerationModal` | Ja — 3-step wizard | Wordt geopend als modal over de sheet |
| `getMemberAssetStatus` | Ja — status berekening | Geen aanpassing |
| `iterVariants` | Ja — data reading | Geen aanpassing |
| `getAssetUrl` | Ja — S3 URL wrapping | Geen aanpassing |
| `MemberDetailPanel` | **Nee** — niet meer nodig vanuit sheet | "Bewerken" knop kan wegvallen |
| `NavigationSheet` | Ja — container | Scroll behavior aanpassen |

---

## 3. Fasering

| Fase | Naam | Uur | Beschrijving |
|------|------|-----|-------------|
| H0 | Accordion component + animatie | 4 | AssetAccordion, open/close, auto-scroll, reduced-motion |
| H1 | Image kit cards | 4 | KitCardStrip, KitCard met thumbnail + status, role-filtering |
| H2 | Video variant cards | 4 | VariantCardStrip, VariantCard met poster + inline preview |
| H3 | Action bar + modal integratie | 4 | Generate/upload/reprocess buttons, AssetGenerationModal hookup |

---

## 4. Acceptatiecriteria

- [ ] Tappen op checklist-item opent accordion inline (sluit vorige)
- [ ] Keeper ziet alleen `goalkeeper` kit, speler ziet `home/away/third`
- [ ] Thumbnails tonen `processed` variant waar beschikbaar
- [ ] Processing status (raw → processing → processed) zichtbaar per kit card
- [ ] "Genereer" opent bestaande AssetGenerationModal
- [ ] "Upload" opent file picker, uploadt naar juiste S3 path
- [ ] Accordion respecteert `prefers-reduced-motion`
- [ ] Touch targets ≥ 44×44px
- [ ] Werkt op 375px viewport (mobile-first)
- [ ] Focus-visible op alle interactieve elementen
- [ ] Geen console errors
- [ ] "Bewerken" knop verwijderd (niet meer nodig)
- [ ] "Bekijk profiel" blijft (navigeert naar read-only profiel)

---

## 5. Beslissingen

| # | Vraag | Besluit |
|---|-------|--------|
| 1 | Video afspelen | **Thumbnail + in-page tab**. Tap op poster opent video in een tab/panel binnen de sheet — geen fullscreen, geen navigatie weg. |
| 2 | Quick action | **Blijft** boven de checklist. Later evt slimmer maken (suggestie op basis van meest impactvolle ontbrekende asset). |
| 3 | Bulk generatie | **Ja, als quick action optie**. "Genereer ontbrekende assets" met asset-selectie: checkboxes zodat admin kan kiezen welke assets gegenereerd worden (niet alles blind). |
