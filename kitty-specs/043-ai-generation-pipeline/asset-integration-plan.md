# B34.5 — AI Asset Generation Integration Plan

## Status: ✅ Prompts Validated (V9) → Ready for Frontend Integration

---

## 1. Validated Pipeline (What Works)

| Template | ID | Inputs | Output |
|---|---|---|---|
| **Logo Standaardiseren** | `logo_standardize` | logo file | Square 512px, transparent bg |
| **Sponsor Standaardiseren** | `sponsor_standardize` | sponsor file | Landscape 512x256, transparent bg |
| **Tenue Genereren** | `tenue_generate` | logo + sponsor + reference | Full kit flat-lay (shirt+shorts+socks) |
| **Keeperstenue** | `keeper_tenue` | logo + sponsor + reference | Goalkeeper kit + gloves |
| **Trainingspak** | `tracksuit_generate` | logo + reference | Tracksuit jacket + pants |
| **Speler Fullbody** | `fullbody_in_tenue` | person + logo + sponsor + ref | Person in kit, head-to-toe |
| **Speler Close-up** | `closeup_in_tenue` | person + logo + sponsor + ref | Chest-up portrait in kit |

**Model**: `nano-banana-pro-preview` (Google GenAI)
**Analysis**: `gemini-2.0-flash` (kit color/pattern extraction)
**Template Library**: `teamreel_prompts.py` (7 templates, parameterized)

---

## 2. Frontend Integration — Assets Tab Modal

### Target Page
`https://demo.teamreel.app/knvb/ajax?tab=assets`

### Existing Architecture (from research)
- **AssetsTab** component at `demo/src/components/AssetsTab/AssetsTab.tsx`
- **ContentGenerationModal** already exists at `demo/src/pages/identity/ContentGenerationModal.tsx` (945 lines, multi-step wizard)
- **ClubAssets** type system at `demo/src/constants/clubAssets.ts`
- Uses custom design system (`@django-core/design-system`), NOT MUI/Tailwind
- Tabs are URL query-param driven (`?tab=assets`)

### New Modal: `AssetGenerationModal`

```
┌─────────────────────────────────────────────────┐
│  🎨 AI Asset Genereren                      [X] │
├─────────────────────────────────────────────────┤
│                                                 │
│  STAP 1: Type kiezen                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 🏛 Logo │ │ 💼Spons.│ │ 👕Tenue │          │
│  └─────────┘ └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ 🧤Keeper│ │ 🏃Track │ │ 📸Person│          │
│  └─────────┘ └─────────┘ └─────────┘          │
│                                                 │
│  STAP 2: Instellingen                           │
│  ┌─────────────────────────────────────┐       │
│  │ Mouwen:   [Kort ▼]                 │       │
│  │ Hals:     [Ronde kraag ▼]          │       │
│  │ Type:     [Thuis ▼]                │       │
│  │ Aantal:   [1] [2] [3] [4]          │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  STAP 3: Resultaten                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│  │ V1 │ │ V2 │ │ V3 │ │ V4 │                  │
│  │ ☑  │ │    │ │ ☑  │ │    │  ← kies beste   │
│  └────┘ └────┘ └────┘ └────┘                  │
│                                                 │
│  [🔄 Opnieuw genereren]  [✅ Opslaan als asset] │
└─────────────────────────────────────────────────┘
```

### User Flow
1. User is on Assets tab → clicks **"🎨 AI Genereren"** button on any asset card
2. Modal opens with template pre-selected based on context:
   - Clicked on Logo card → `logo_standardize` template
   - Clicked on Tenue card → `tenue_generate` template
   - Clicked on Member → `fullbody_in_tenue` or `closeup_in_tenue`
3. User adjusts parameters (dropdowns for sleeves, neck, count)
4. User clicks **"Genereren"** → Loading state with progress
5. Results appear as selectable thumbnails
6. User picks best variant(s) → clicks **"Opslaan"**
7. Selected image is saved as the asset (uploaded to S3/media via brand profile API)

---

## 3. Backend API Design

### New Endpoint: `POST /api/v1/generation/asset/`

```json
// REQUEST
{
  "template_id": "tenue_generate",
  "project_id": "uuid-of-club",
  "parameters": {
    "sleeves": "long",
    "neck": "collar",
    "kit_type": "home"
  },
  "variant_count": 3,
  "input_assets": {
    "logo": "brand-asset-uuid-logo",
    "sponsor": "brand-asset-uuid-sponsor",
    "reference_photo": "brand-asset-uuid-reference"
  }
}

// RESPONSE (async via Celery)
{
  "request_id": "gen-uuid-123",
  "status": "processing",
  "estimated_seconds": 30
}
```

### Status Polling: `GET /api/v1/generation/asset/{request_id}/`

```json
{
  "request_id": "gen-uuid-123",
  "status": "completed",
  "variants": [
    {"id": 1, "url": "https://media.../variant_1.png", "thumbnail_url": "..."},
    {"id": 2, "url": "https://media.../variant_2.png", "thumbnail_url": "..."},
    {"id": 3, "url": "https://media.../variant_3.png", "thumbnail_url": "..."}
  ]
}
```

### Accept Variant: `POST /api/v1/generation/asset/{request_id}/accept/`

```json
{
  "variant_id": 1,
  "save_as": "tenue_full",
  "project_id": "uuid-of-club"
}
```

---

## 4. Implementation Phases

### Phase 1: Backend Service (1-2 days)
- [ ] Create `src/generative/services/asset_pipeline.py`
  - Port `teamreel_prompts.py` templates + `run_v9_templates.py` logic
  - Image preprocessing (Pillow square_pad, landscape_pad)
  - Gemini Flash analysis step
  - Nano Banana generation step
- [ ] Create Celery task `process_asset_generation`
- [ ] API endpoints (ViewSet for generation requests)
- [ ] Wire to B11 Credits (deduct per generation)

### Phase 2: Frontend Modal (1-2 days)
- [ ] Create `demo/src/components/AssetGenerationModal/`
  - `AssetGenerationModal.tsx` — Main modal component
  - `TemplateSelector.tsx` — Step 1: Pick template type
  - `ParameterForm.tsx` — Step 2: Configure options
  - `ResultGrid.tsx` — Step 3: View & select results
- [ ] Add "AI Genereren" button to `AssetCard` in `AssetsTab.tsx`
- [ ] Polling hook for generation status
- [ ] Connect accept flow to `useBrandProfile` hook

### Phase 3: Polish & Credits (1 day)
- [ ] Credit cost display per template
- [ ] Loading animations / progress indicator
- [ ] Error handling (quota exceeded, generation failed)
- [ ] Regenerate button
- [ ] Mobile-responsive modal

---

## 5. File Structure (Proposed)

```
src/generative/
├── services/
│   ├── asset_pipeline.py        # Core generation logic (from run_v9)
│   └── prompt_templates.py      # teamreel_prompts.py (production version)
├── tasks/
│   └── asset_generation.py      # Celery task
├── api/
│   └── asset_generation.py      # DRF ViewSet
└── tests/
    └── test_asset_pipeline.py   # Mocked provider tests

demo/src/
├── components/
│   ├── AssetGenerationModal/
│   │   ├── AssetGenerationModal.tsx
│   │   ├── TemplateSelector.tsx
│   │   ├── ParameterForm.tsx
│   │   ├── ResultGrid.tsx
│   │   └── index.ts
│   └── AssetsTab/
│       └── AssetsTab.tsx         # + "AI Genereren" button
├── hooks/
│   └── useAssetGeneration.ts    # API hook for generation flow
└── constants/
    └── assetTemplates.ts        # Frontend mirror of template definitions
```

---

## 6. Cost Estimation (Credits)

| Template | Gemini Flash Call | Nano Banana Call | Total per variant |
|---|---|---|---|
| Logo Standardize | 0 | 1 | ~$0.04 |
| Sponsor Standardize | 0 | 1 | ~$0.04 |
| Tenue Generate | 1 | 1 | ~$0.05 |
| Keeper Tenue | 1 | 1 | ~$0.05 |
| Tracksuit | 1 | 1 | ~$0.05 |
| Fullbody Player | 1 | 1 | ~$0.06 |
| Close-up Player | 1 | 1 | ~$0.06 |

**Suggested credit mapping**: 1 credit = 1 variant generation

---

## 7. Key Files Created

| File | Purpose |
|---|---|
| `teamreel_prompts.py` | Template library (7 templates, parameterized, tested) |
| `run_v9_templates.py` | Test runner (validated both ASC + Ajax, 22 outputs) |
| `asc/output_v9/` | Generated samples for review |
| `kitty-specs/043-ai-generation-pipeline/asset-integration-plan.md` | This file |
