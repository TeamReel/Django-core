# AI Models, Tokens & Pricing — Referentie

> Compleet overzicht van alle beschikbare AI-modellen per provider, hun pricing, token-schattingen en configuratie.
> Doel: Makkelijk schakelen tussen modellen en begrijpen wat elk model kost.
>
> Last updated: 2026-03-12
> Gerelateerd: [ai-providers.md](ai-providers.md) | [media-templates.md](media-templates.md)

---

## 1. Waarom Model Selectie?

TeamReel genereert twee soorten AI-content:
- **Images** — Tenue, fullbody, closeup, logo's (Gemini ecosystem)
- **Videos** — Intro's, celebrations, then-vs-now (MiniMax, Runway, Pika, Veo)

Per provider zijn er **meerdere modellen** met verschillende trade-offs:

| Factor | Goedkoper model | Duurder model |
|--------|----------------|---------------|
| **Snelheid** | ⚡ Sneller | 🐢 Langzamer |
| **Kwaliteit** | 🔶 Goed genoeg | ✨ Premium |
| **Kosten** | 💰 Low | 💎 High |
| **Beschikbaarheid** | ✅ Stable | ⚠️ Preview |

Door model-selectie toe te voegen aan de generatie-modal, kan de gebruiker zelf kiezen:
- **Budget-modus**: Goedkoopste modellen voor bulk content
- **Premium-modus**: Beste modellen voor showcase content

---

## 2. Image Modellen (Gemini Ecosystem)

### 2.1 Beschikbare Modellen

| Model | ID | Type | Prijs Input | Prijs Output | Per Image | Status | Opmerking |
|-------|----|----|-------------|-------------|-----------|--------|-----------|
| **Nano Banana Pro** | `models/nano-banana-pro-preview` | Text+Image→Image | incl. | incl. | ~$0.04¹ | ✅ **Huidig** | Beste voor tenue/fullbody (edit-aware) |
| **Gemini 2.0 Flash Image** | `gemini-2.0-flash` | Text+Image→Image | $0.10/1M | $30/1M ($0.039/img) | ~$0.04 | ✅ Stable | Native image output mode |
| **Gemini 2.5 Flash Image** | `gemini-2.5-flash-image` | Text+Image→Image | $0.30/1M | $30/1M ($0.039/img) | ~$0.04 | ✅ Stable | Nieuwer, iets beter begrip |
| **Gemini 3 Pro Image** | `gemini-3-pro-image-preview` | Text+Image→Image | $2.00/1M | $120/1M ($0.134/img 1K-2K) | ~$0.14 | 🔶 Preview | Hoogste kwaliteit, 3x duurder |
| **Imagen 4 Fast** | `imagen-4.0-fast-generate-001` | Text→Image | n/a | $0.02/img | $0.02 | ✅ Stable | Alleen text-to-image (geen edit) |
| **Imagen 4 Standard** | `imagen-4.0-generate-001` | Text→Image | n/a | $0.04/img | $0.04 | ✅ Stable | Betere kwaliteit, geen edit |
| **Imagen 4 Ultra** | `imagen-4.0-ultra-generate-001` | Text→Image | n/a | $0.06/img | $0.06 | ✅ Stable | Maximale kwaliteit, geen edit |

¹ Nano Banana Pro pricing is gebaseerd op fal.ai rate ($0.0398/image). Via Google API direct vergelijkbaar met Gemini 2.0 Flash Image pricing.

### 2.2 Welk Model Waarvoor?

```
┌────────────────────────────────────────────────────────────────────┐
│                    IMAGE MODEL SELECTIE                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  TENUE / FULLBODY / CLOSEUP / COACH / TRACKSUIT              │  │
│  │  (Heeft input images nodig: logo, sponsor, reference_photo)  │  │
│  │                                                              │  │
│  │  ✅ Nano Banana Pro (huidig)     — ~$0.04/img — edit-aware  │  │
│  │  ✅ Gemini 2.0 Flash Image       — ~$0.04/img — stable      │  │
│  │  ✅ Gemini 2.5 Flash Image       — ~$0.04/img — nieuwer     │  │
│  │  💎 Gemini 3 Pro Image Preview   — ~$0.14/img — premium     │  │
│  │                                                              │  │
│  │  ❌ Imagen 4 (niet geschikt — geen multi-image input/edit)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LOGO / SPONSOR / LOCATION STANDARDIZE                       │  │
│  │  (Enkele afbeelding → bewerkte versie)                       │  │
│  │                                                              │  │
│  │  ✅ Nano Banana Pro (huidig)     — ~$0.04/img               │  │
│  │  ✅ Gemini 2.0 Flash Image       — ~$0.04/img               │  │
│  │  💎 Gemini 3 Pro Image Preview   — ~$0.14/img               │  │
│  │  🔶 Imagen 4 Fast               — $0.02/img (indien T2I ok) │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### 2.3 Kit Analysis Model

De kit-analyse stap (voor templates met `reference_photo`) gebruikt altijd **Gemini 2.0 Flash** als text-analyse model. Dit genereert geen afbeelding maar een tekst-beschrijving van het tenue.

| Model | Prijs | Gebruik |
|-------|-------|---------|
| `gemini-2.0-flash` | $0.10/1M in + $0.40/1M out | ~760 in + ~375 out → **$0.0002** per analyse |
| `gemini-2.5-flash` | $0.30/1M in + $2.50/1M out | ~760 in + ~375 out → **$0.0010** per analyse |

De kit-analyse is verwaarloosbaar in kosten vergeleken met de image-generatie.

---

## 3. Video Modellen

### 3.1 MiniMax / Hailuo

| Model | ID | Duur | Resolutie | Prijs | Status |
|-------|-----|------|-----------|-------|--------|
| **Video-01** | `video-01` | ~6s | 720p | ~$0.05/video | ✅ **Huidig** |
| **Video-01-Live** | `video-01-live` | ~6s | 720p | ~$0.05/video | 🔶 Sneller, iets minder kwaliteit |
| **T2V-01** | `T2V-01` | ~6s | 720p | ~$0.05/video | 🔶 Text-only |
| **T2V-01-HD** | `T2V-01-HD` | ~6s | 1080p | ~$0.10/video | 🔶 HD variant |
| **S2V-01** | `S2V-01` | ~6s | 720p | ~$0.05/video | 🔶 Subject-reference |

**MiniMaxClient ondersteunt model parameter:** `model: str = "video-01"` — al configureerbaar.

### 3.2 Runway

| Model | ID | Duur | Camera Control | Prijs per seconde | Prijs per 5s | Status |
|-------|-----|------|---------------|-------------------|-------------|--------|
| **Gen-4 Turbo** | `gen4_turbo` | 5/10s | Basis | 5 credits/s (~$0.096/s) | ~$0.48 | ✅ **Huidig** |
| **Gen-4** | `gen4` | 5/10s | Geavanceerd | 12 credits/s (~$0.23/s) | ~$1.15 | ✅ Stable |
| **Gen-4.5** | `gen4.5` | 5/10s | Premium | 25 credits/s (~$0.48/s) | ~$2.40 | ✅ Stable |
| **Gen-3 Alpha Turbo** | `gen3a_turbo` | 5/10s | Basis | 5 credits/s (~$0.096/s) | ~$0.48 | ⚠️ Legacy |

**RunwayClient ondersteunt model parameter:** `model: str = "gen4_turbo"` — al configureerbaar.

#### Runway Credit Mapping

Runway werkt met credits. Omrekening naar USD (standaard plan):

| Plan | Credits/maand | $/credit (approx) |
|------|--------------|-------------------|
| Standard ($12/mo) | 625 | ~$0.019 |
| Pro ($28/mo) | 2250 | ~$0.012 |
| Unlimited ($76/mo) | Unlimited (explore) | ~$0.010 |

### 3.3 Pika 2.2 (via fal.ai)

| Model | Endpoint | Duur | Resolutie | Prijs per seconde | Prijs per 5s | Status |
|-------|----------|------|-----------|-------------------|-------------|--------|
| **Pika 2.2 I2V** | `fal-ai/pika/v2.2/image-to-video` | 5/10s | 720p/1080p | ~$0.05/s | $0.25 (720p) | ✅ **Huidig** |
| **Pika 2.2 T2V** | `fal-ai/pika/v2.2/text-to-video` | 5/10s | 720p/1080p | ~$0.05/s | $0.25 (720p) | ✅ Beschikbaar |

Pika 2.2 biedt geen model-selectie — het endpoint bepaalt het model. Resolutie en duur zijn configureerbaar.

### 3.4 Google Veo

| Model | ID | Duur | Resolutie | Prijs | Status |
|-------|-----|------|-----------|-------|--------|
| **Veo 3.1 Fast** | `veo-3.1-fast` | 4-8s | 720p/1080p | $0.15/video | ✅ **Huidig** |
| **Veo 3.1 Standard** | `veo-3.1-generate` | 4-8s | 720p-4K | $0.60/video | ✅ Actief |
| **Veo 3 Fast** | `veo-3.0-fast-generate-001` | 4-8s | 720p/1080p | $0.15/video | ✅ Stable |
| **Veo 3 Standard** | `veo-3.0-generate-001` | 4-8s | 720p/1080p | $0.40/video | ✅ Stable |
| **Veo 2** | `veo-2.0-generate-001` | 4-8s | 720p | $0.35/video | ⚠️ Legacy |

---

## 4. Token-Based Cost Estimation

### 4.1 Hoe werkt de berekening?

De backend berekent geschatte kosten op basis van:

1. **Provider** → vast of per-token
2. **Model** → specifieke pricing
3. **Input tokens** → prompt + afbeeldingen
4. **Output tokens** → gegenereerde content
5. **Varianten** → vermenigvuldiger
6. **Content duur** → voor video (per-seconde providers)

### 4.2 Token Schattingen per Template

| Template | Input imgs | Analyse stap? | Est. Input Tokens | Est. Output Tokens | Est. Cost (EUR) |
|----------|-----------|--------------|-------------------|--------------------|-----------------|
| `logo_standardize` | 1 | ❌ | 760 | 1.290 | €0.036 |
| `sponsor_standardize` | 1 | ❌ | 760 | 1.290 | €0.036 |
| `tenue_generate` | 3 | ✅ | 2.640 | 1.665 | €0.048 |
| `keeper_tenue` | 3 | ✅ | 2.640 | 1.665 | €0.048 |
| `fullbody_in_tenue` | 4 | ✅ | 3.200 | 1.665 | €0.048 |
| `closeup_in_tenue` | 4 | ✅ | 3.200 | 1.665 | €0.048 |
| `tracksuit_generate` | 2 | ✅ | 1.880 | 1.665 | €0.047 |
| `coach_outfit` | 3 | ✅ | 2.640 | 1.665 | €0.048 |

*Prijzen per variant, Nano Banana Pro / Gemini 2.0 Flash Image.*

### 4.3 Video Cost Berekening

```
Video kosten = prijs_per_eenheid × duur_factor × aantal_varianten × EUR_factor

EUR_factor = 0.92 (USD → EUR conversie)
```

| Provider | Prijs model | Berekening voor 2 varianten, 5s |
|----------|------------|-------------------------------|
| MiniMax | $0.05/video (vast) | 0.05 × 2 × 0.92 = **€0.09** |
| Runway Gen-4 Turbo | $0.096/s | 0.096 × 5 × 2 × 0.92 = **€0.88** |
| Runway Gen-4 | $0.23/s | 0.23 × 5 × 2 × 0.92 = **€2.12** |
| Runway Gen-4.5 | $0.48/s | 0.48 × 5 × 2 × 0.92 = **€4.42** |
| Pika 2.2 | $0.05/s | 0.05 × 5 × 2 × 0.92 = **€0.46** |
| Veo 3.1 Fast | $0.15/video (vast) | 0.15 × 2 × 0.92 = **€0.28** |
| Veo 3.1 Standard | $0.40/video (vast) | 0.40 × 2 × 0.92 = **€0.74** |

---

## 5. Model Selectie — Architectuur

### 5.1 Huidige Situatie

```
Frontend                 API                    Pipeline              Client
┌──────────┐     ┌──────────────┐     ┌──────────────────┐    ┌─────────────┐
│ Provider  │ ──→ │ provider:    │ ──→ │ generate_video() │ ──→│ model=      │
│ selector  │     │ "minimax"    │     │ reads from       │    │ "video-01"  │
│ (4 btns)  │     │              │     │ video_config     │    │ (hardcoded) │
└──────────┘     │ ❌ model     │     └──────────────────┘    └─────────────┘
                  └──────────────┘
```

### 5.2 Gewenste Situatie

```
Frontend                 API                    Pipeline              Client
┌──────────┐     ┌──────────────┐     ┌──────────────────┐    ┌─────────────┐
│ Provider  │ ──→ │ provider:    │ ──→ │ generate_video() │ ──→│ model=      │
│ + Model   │     │ "runway"     │     │ or gen_image()   │    │ "gen4.5"    │
│ selector  │     │ model:       │     │ uses model param │    │ (from user) │
│ + cost    │     │ "gen4.5"     │     │                  │    │             │
│ estimate  │     │              │     └──────────────────┘    └─────────────┘
└──────────┘     └──────────────┘
```

### 5.3 Model Registry (Backend)

De backend bevat een `MODEL_REGISTRY` die alle beschikbare modellen definieert:

```python
MODEL_REGISTRY = {
    # ── Image Models ──────────────────────────────────────────
    "gemini": {
        "nano-banana-pro": {
            "model_id": "models/nano-banana-pro-preview",
            "type": "image",
            "supports_edit": True,
            "cost_per_image_usd": 0.04,
            "label": "Nano Banana Pro",
            "tier": "standard",
        },
        "gemini-2.0-flash-image": {
            "model_id": "gemini-2.0-flash",
            "type": "image",
            "supports_edit": True,
            "cost_per_image_usd": 0.039,
            "label": "Gemini 2.0 Flash Image",
            "tier": "standard",
        },
        "gemini-2.5-flash-image": {
            "model_id": "gemini-2.5-flash-image",
            "type": "image",
            "supports_edit": True,
            "cost_per_image_usd": 0.039,
            "label": "Gemini 2.5 Flash Image",
            "tier": "standard",
        },
        "gemini-3-pro-image": {
            "model_id": "gemini-3-pro-image-preview",
            "type": "image",
            "supports_edit": True,
            "cost_per_image_usd": 0.134,
            "label": "Gemini 3 Pro Image (Premium)",
            "tier": "premium",
        },
    },
    # ── Video Models ──────────────────────────────────────────
    "minimax": {
        "video-01": {
            "model_id": "video-01",
            "type": "video",
            "cost_per_video_usd": 0.05,
            "label": "MiniMax Video-01",
            "tier": "standard",
        },
    },
    "runway": {
        "gen4_turbo": {
            "model_id": "gen4_turbo",
            "type": "video",
            "cost_per_second_usd": 0.096,
            "label": "Gen-4 Turbo (Fast)",
            "tier": "standard",
        },
        "gen4": {
            "model_id": "gen4",
            "type": "video",
            "cost_per_second_usd": 0.23,
            "label": "Gen-4 (Balanced)",
            "tier": "premium",
        },
        "gen4.5": {
            "model_id": "gen4.5",
            "type": "video",
            "cost_per_second_usd": 0.48,
            "label": "Gen-4.5 (Premium)",
            "tier": "premium",
        },
    },
    "pika": {
        "pika-2.2": {
            "model_id": "pika-2.2",
            "type": "video",
            "cost_per_second_usd": 0.05,
            "label": "Pika 2.2",
            "tier": "standard",
        },
    },
    "veo": {
        "veo-3.1-fast": {
            "model_id": "veo-3.1-fast",
            "type": "video",
            "cost_per_video_usd": 0.15,
            "label": "Veo 3.1 Fast",
            "tier": "standard",
        },
        "veo-3.1": {
            "model_id": "veo-3.1-generate",
            "type": "video",
            "cost_per_video_usd": 0.60,
            "label": "Veo 3.1 Standard",
            "tier": "premium",
        },
    },
}
```

### 5.4 Cost Invloed per Modelkeuze

#### Voorbeeld: "Create Fullbody in Tenue" (4 varianten)

| Model | Per variant | 4 varianten (EUR) | Kwaliteit |
|-------|-----------|-------------------|-----------|
| Nano Banana Pro | €0.037 | **€0.15** | ⭐⭐⭐⭐ |
| Gemini 2.5 Flash Image | €0.036 | **€0.14** | ⭐⭐⭐⭐ |
| Gemini 3 Pro Image | €0.123 | **€0.49** | ⭐⭐⭐⭐⭐ |

#### Voorbeeld: "Create Intro Video" (2 varianten, 5s)

| Provider + Model | Per variant | 2 varianten (EUR) | Kwaliteit |
|-----------------|-----------|-------------------|-----------|
| MiniMax Video-01 | €0.046 | **€0.09** | ⭐⭐⭐ |
| Runway Gen-4 Turbo | €0.442 | **€0.88** | ⭐⭐⭐⭐ |
| Runway Gen-4 | €1.058 | **€2.12** | ⭐⭐⭐⭐½ |
| Runway Gen-4.5 | €2.208 | **€4.42** | ⭐⭐⭐⭐⭐ |
| Pika 2.2 | €0.230 | **€0.46** | ⭐⭐⭐½ |
| Veo 3.1 Fast | €0.138 | **€0.28** | ⭐⭐⭐ |

---

## 6. Frontend Model Selector — Ontwerp

### 6.1 UI Concept

De AssetGenerationModal toont een **model selector** onder de provider selector, met live kostenvoorvertoning:

```
┌─────────────────────────────────────────────────────────────┐
│  Create Fullbody in Tenue                                    │
│                                                              │
│  📷 Image Model                                              │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐  │
│  │ ⚡ Nano Banana  │ │  Gemini 2.5 Flash│ │ 💎 Gemini 3  │  │
│  │    Pro          │ │    Image         │ │    Pro Image │  │
│  │   ~€0.04/img   │ │   ~€0.04/img    │ │  ~€0.14/img  │  │
│  │   ███████████   │ │                  │ │              │  │
│  └─────────────────┘ └──────────────────┘ └──────────────┘  │
│                                                              │
│  With 4 variants: Est. ~€0.15                                │
│                                                              │
│  [Generate 4 Variants]                                       │
└─────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────┐
│  Create Member Intro Video                                   │
│                                                              │
│  🎬 Video Provider                                           │
│  ┌──────┐ ┌────────┐ ┌────────┐ ┌──────┐                   │
│  │ Auto │ │MiniMax │ │ Runway │ │ Pika │                   │
│  └──────┘ └────────┘ └───▓▓▓──┘ └──────┘                   │
│                                                              │
│  🎯 Runway Model                                             │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐  │
│  │ ⚡ Gen-4 Turbo  │ │  Gen-4           │ │ 💎 Gen-4.5   │  │
│  │   ~€0.44/5s    │ │   ~€1.06/5s     │ │  ~€2.21/5s   │  │
│  │   ███████████   │ │                  │ │              │  │
│  └─────────────────┘ └──────────────────┘ └──────────────┘  │
│                                                              │
│  With 2 variants (5s): Est. ~€0.88                           │
│                                                              │
│  [Generate 2 Variants]                                       │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 API Interface

```http
POST /api/v1/generative/generate/
{
  "template_id": "fullbody_in_tenue",
  "membership_id": "...",
  "variant_count": 4,
  "provider": "gemini",           // provider (existing)
  "model": "nano-banana-pro",     // NEW: model keuze
  "video_config": { ... }
}
```

---

## 7. Implementatie Roadmap

### Phase 1: Model Registry (Backend) ✅ → Quick win
- [ ] Model registry dict in `views_asset.py` (of apart bestand)
- [ ] API endpoint: `GET /api/v1/generative/models/` — lijst beschikbare modellen per provider met pricing
- [ ] `model` parameter toevoegen aan serializer
- [ ] Model doorsturen via task → pipeline → client

### Phase 2: Frontend Model Selector
- [ ] Model selector component in AssetGenerationModal
- [ ] Live cost estimate op basis van model + varianten + duur
- [ ] Model keuze meesturen bij generate request

### Phase 3: Cost Tracking
- [ ] Werkelijke kosten opslaan bij job completion
- [ ] Dashboard: kosten per model, per provider, per club
- [ ] Vergelijking geschatte vs. werkelijke kosten

---

## 8. Bronnen & Documentatie

| Provider | Pricing pagina | API Docs |
|----------|---------------|----------|
| **Google Gemini** | [ai.google.dev/pricing](https://ai.google.dev/gemini-api/docs/pricing) | [Gemini API](https://ai.google.dev/gemini-api/docs) |
| **Google Imagen 4** | [ai.google.dev/pricing#imagen-4](https://ai.google.dev/gemini-api/docs/pricing#imagen-4) | [Imagen API](https://ai.google.dev/gemini-api/docs/imagen) |
| **Google Veo** | [ai.google.dev/pricing#veo-3.1](https://ai.google.dev/gemini-api/docs/pricing#veo-3.1) | [Veo API](https://ai.google.dev/gemini-api/docs/video) |
| **MiniMax/Hailuo** | [hailuoai.video/pricing](https://hailuoai.video/pricing) | [MiniMax Docs](https://docs.minimaxi.com/en/) |
| **Runway** | [runwayml.com/pricing](https://runwayml.com/pricing) | [Runway API](https://docs.runwayml.com/) |
| **Pika via fal.ai** | [fal.ai/pricing](https://fal.ai/pricing) | [fal.ai Docs](https://docs.fal.ai/) |

---

## Appendix A: USD → EUR Conversie

Alle backend-berekeningen gebruiken `× 0.92` voor USD → EUR conversie.
Dit is een vast getal dat periodiek geüpdatet moet worden.

## Appendix B: Gemini Token Sizing

| Input type | Tokens | Bron |
|-----------|--------|------|
| Tekst prompt (~800 chars) | ~200 tokens | Google docs (4 chars/token) |
| Afbeelding (elke resolutie) | 560 tokens | [Pricing: "$0.0011 per image"](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-pro-image-preview) |
| Output image ≤ 2048×2048 | 1.290 tokens | [Pricing: "$0.039 per image = 1290 tokens"](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.0-flash) |
| Output image ≤ 4096×4096 | 2.000 tokens | [Pricing: "$0.24 per image = 2000 tokens"](https://ai.google.dev/gemini-api/docs/pricing#gemini-3-pro-image-preview) |
