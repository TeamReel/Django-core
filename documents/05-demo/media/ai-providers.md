# AI Video & Image Providers — Overzicht

> Alle AI-providers die TeamReel gebruikt voor media-generatie: modellen, configuratie, kosten en integratie.
>
> Last updated: 2026-03-12
> Gerelateerd: [media-architecture.md](media-architecture.md) | [media-templates.md](media-templates.md)

---

## 1. Architectuur Overview

TeamReel gebruikt een **provider-agnostisch pipeline model** voor AI-generatie. De frontend selecteert optioneel een provider; de backend kiest automatisch op basis van beschikbare API-keys.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (React)                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  AssetGenerationModal                                        │   │
│  │  ┌──────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌──────┐          │   │
│  │  │ Auto │ │MiniMax │ │ Runway │ │ Pika │ │ (Veo)│          │   │
│  │  └──┬───┘ └───┬────┘ └───┬────┘ └──┬───┘ └──┬───┘          │   │
│  └─────┼─────────┼──────────┼─────────┼────────┼──────────────┘   │
│        │         │          │         │        │                    │
│        ▼         ▼          ▼         ▼        ▼                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  POST /api/generative/generate/                              │   │
│  │  { provider: "minimax" | "runway" | "pika" | "veo" | null } │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
├─────────────────────────────────┼───────────────────────────────────┤
│  Backend (Django + Celery)      │                                    │
│  ┌──────────────────────────────▼───────────────────────────────┐   │
│  │  generate_asset_task (Celery)                                 │   │
│  │  → rate limiting, semaphore, provider routing                │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│  ┌──────────────────────────────▼───────────────────────────────┐   │
│  │  asset_pipeline.generate_video()                              │   │
│  │  Provider cascade:                                            │   │
│  │   1. Explicit provider (from request)                        │   │
│  │   2. Auto: MINIMAX → RUNWAY → PIKA → VEO → Error            │   │
│  └──┬──────────┬──────────┬──────────┬──────────┬───────────────┘   │
│     ▼          ▼          ▼          ▼          ▼                    │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                 │
│  │Gemini│  │MiniMax│  │Runway│  │ Pika │  │ Veo  │                 │
│  │Client│  │Client │  │Client│  │Client│  │(genai)│                │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘                 │
│     │         │         │         │         │                       │
│     ▼         ▼         ▼         ▼         ▼                       │
│  Google    MiniMax    Runway    fal.ai    Google                     │
│  API       API        API       API       API                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Providers Overzicht

| Provider | Type | Model | SDK/Lib | Env Var | Kosten (indicatief) | Status |
|----------|------|-------|---------|---------|---------------------|--------|
| **Gemini** | Image | `models/nano-banana-pro-preview` | `google-genai` | `GOOGLE_API_KEY` | ~$0.01/image | ✅ Actief |
| **MiniMax/Hailuo** | Video | `video-01` | `httpx` (raw) | `MINIMAX_API_KEY` + `MINIMAX_GROUP_ID` | ~$0.10/5s clip | ✅ Primary |
| **Runway Gen** | Video | `gen4_turbo` / `gen4.5` | `runwayml` | `RUNWAYML_API_SECRET` | 5 credits/sec (~$0.05/sec) | ✅ Actief |
| **Pika 2.2** | Video | `pika-2.2` | `fal-client` | `FAL_KEY` | $0.20/5s 720p, $0.45/5s 1080p | ✅ Actief |
| **Google Veo** | Video | `veo-3.1-fast` / `veo-3.1-generate` | `google-genai` | `GOOGLE_API_KEY` | $0.15–$0.60/video | ⚠️ Fallback |

---

## 3. Provider Details

### 3.1 Google Gemini (Afbeeldingen)

**Doel:** Genereren van lineup flyers, player cards, en andere statische content.

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Image generation (text-to-image, image editing) |
| **Model** | `models/nano-banana-pro-preview` (Imagen 3) |
| **SDK** | `google-genai>=1.0.0` |
| **Auth** | `GOOGLE_API_KEY` env var |
| **Output** | PNG, variabele resolutie |
| **Rate limit** | 10 RPM (free tier), 60 RPM (paid) |
| **Client** | Inline in `asset_pipeline.py` (geen apart client-bestand) |

**Gebruik in TeamReel:**
- Lineup flyers (11 spelers composiet)
- Player cards (individueel portret + statistieken)
- Social media banners

---

### 3.2 MiniMax / Hailuo (Video — Primary)

**Doel:** Primaire video-generatie provider. Beste prijs-kwaliteit voor korte clips.

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Image-to-video, text-to-video |
| **Model** | `video-01` |
| **SDK** | `httpx` (raw HTTP, eigen client) |
| **Auth** | `MINIMAX_API_KEY` + `MINIMAX_GROUP_ID` |
| **Output** | MP4, meerdere aspect ratio's |
| **Max duur** | ~6 seconden |
| **Rate limit** | Best-effort, geen harde limiet gedocumenteerd |
| **Client** | `src/generative/services/minimax_client.py` |
| **API Base** | `https://api.minimaxi.chat/v1` |

**Patroon:** Create task → Poll status → Download file

**Statussen:** `Preparing` → `Queueing` → `Processing` → `Success` / `Fail`

**Gebruik in TeamReel:**
- Intro video's (I2V: speler foto → bewegend portret)
- Lineup reveal animaties
- Match preview clips

---

### 3.3 Runway Gen (Video)

**Doel:** Hoge kwaliteit video-generatie met geavanceerde camera-controle.

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Image-to-video (I2V), text-to-video (T2V, gen4.5 only) |
| **Model** | `gen4_turbo` (snel), `gen4.5` (hoogste kwaliteit) |
| **SDK** | `runwayml>=1.0.0` (officiële SDK) |
| **Auth** | `RUNWAYML_API_SECRET` (begint met `rw-...`) |
| **Output** | MP4, configureerbare ratio |
| **Duur** | 5 of 10 seconden |
| **Ratio formaat** | `W:H` (bijv. `1280:720`, `720:1280`) |
| **Rate limit** | Account-afhankelijk |
| **Client** | `src/generative/services/runway_client.py` |

**Patroon:** Create task (SDK) → Poll task status (SDK) → Download output URL (httpx)

**Statussen:** `PENDING` → `THROTTLED` → `RUNNING` → `SUCCEEDED` / `FAILED` / `CANCELLED`

**Ratio mapping** (template → Runway):
```
"9:16" → "720:1280"
"16:9" → "1280:720"
"1:1"  → "1024:1024"
"4:3"  → "1024:768"
"3:4"  → "768:1024"
```

**Gebruik in TeamReel:**
- Premium intro video's (betere camera-beweging)
- Speciale evenement content
- Waar hogere kwaliteit vereist is

---

### 3.4 Pika 2.2 (Video — via fal.ai)

**Doel:** Cinematische video-generatie met ondersteuning tot 1080p.

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Text-to-video (T2V), image-to-video (I2V) |
| **Model** | Pika 2.2 |
| **SDK** | `fal-client>=0.13.0` |
| **Auth** | `FAL_KEY` (fal.ai API key) |
| **Output** | MP4, tot 1080p |
| **Duur** | 5 of 10 seconden |
| **Resoluties** | `720p`, `1080p` |
| **Aspect ratio's** | `16:9`, `9:16`, `1:1`, `4:5`, `5:4`, `3:2`, `2:3` |
| **Rate limit** | 20 gen/min (legacy), fal.ai: plan-afhankelijk |
| **Client** | `src/generative/services/pika_client.py` |

**fal.ai Endpoints:**
```
Text-to-video:  fal-ai/pika/v2.2/text-to-video
Image-to-video: fal-ai/pika/v2.2/image-to-video
```

**Patroon:** `fal_client.subscribe()` → (intern: submit → poll → return) → Download video URL (httpx)

**Input parameters:**
- `prompt` (required): Text beschrijving
- `image_url` (I2V): Eerste frame afbeelding
- `negative_prompt`: Wat te vermijden
- `resolution`: `"720p"` of `"1080p"`
- `duration`: `5` of `10`
- `aspect_ratio`: (alleen T2V)
- `seed`: Optioneel voor reproduceerbaarheid

**Output formaat:**
```json
{
  "video": {
    "url": "https://storage.googleapis.com/.../output.mp4"
  }
}
```

**Kosten:**
- $0.20 per 5s clip @ 720p
- $0.45 per 5s clip @ 1080p

**Gebruik in TeamReel:**
- Alternatieve video provider voor variatie
- 1080p content waar hogere resolutie gewenst is
- Kosteneffectief alternatief voor Runway

---

### 3.5 Google Veo (Video — Legacy Fallback)

**Doel:** Fallback provider wanneer andere providers niet beschikbaar zijn. Wordt vaak content-geblokkeerd voor persoonsfoto's.

| Eigenschap | Waarde |
|------------|--------|
| **Type** | Image-to-video |
| **Model** | `veo-3.1-fast` (standaard) / `veo-3.1-generate` (HQ) |
| **SDK** | `google-genai>=1.0.0` |
| **Auth** | `GOOGLE_API_KEY` (zelfde als Gemini) |
| **Output** | MP4 |
| **Duur** | Variabel (5-8s) |
| **Client** | Inline in `asset_pipeline.py` |

**⚠️ Beperkingen:**
- Content filtering blokkeert regelmatig op persoonsfoto's
- Niet betrouwbaar voor productie I2V met portretten
- Puur als fallback-optie

---

## 4. Provider Cascade (Auto-select)

Wanneer geen `provider` parameter wordt meegegeven, kiest de backend automatisch:

```
┌──────────────────────────────────────────────────────────────┐
│  MINIMAX_API_KEY aanwezig?                                    │
│  ├── Ja → MiniMax/Hailuo (primary, beste prijs-kwaliteit)    │
│  └── Nee ↓                                                    │
│  RUNWAYML_API_SECRET aanwezig?                                │
│  ├── Ja → Runway Gen (high quality fallback)                 │
│  └── Nee ↓                                                    │
│  FAL_KEY aanwezig?                                            │
│  ├── Ja → Pika 2.2 via fal.ai                               │
│  └── Nee ↓                                                    │
│  GOOGLE_API_KEY aanwezig?                                     │
│  ├── Ja → Google Veo (legacy, unreliable for portraits)      │
│  └── Nee → ERROR: No provider configured                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Configuratie

### 5.1 Environment Variables

```bash
# === Image Generation ===
GOOGLE_API_KEY=AIza...              # Google Gemini (images) + Veo (video fallback)

# === Video Generation ===
MINIMAX_API_KEY=eyJ...              # MiniMax / Hailuo (primary video)
MINIMAX_GROUP_ID=17...              # MiniMax group ID

RUNWAYML_API_SECRET=rw-...          # Runway Gen (video)

FAL_KEY=fal-...                     # Pika 2.2 via fal.ai (video)
```

### 5.2 Django Settings

De keys worden geladen in:
- `src/config/settings/local.py` — via `os.environ.get()`
- `src/config/settings/production.py` — via `env()` (django-environ)

### 5.3 Requirements

```
google-genai>=1.0.0     # Gemini + Veo
minimax-python>=0.2.0   # MiniMax (alleen voor types, niet direct gebruikt)
runwayml>=1.0.0         # Runway Gen SDK
fal-client>=0.13.0      # Pika 2.2 via fal.ai
```

---

## 6. Celery Task Queue

Alle AI-generatie draait via Celery async tasks in de `ai_generation` queue.

### 6.1 Concurrency Control

Per-provider semaphore voorkomt overbelasting:

| Provider | Max Concurrent | Inter-request Delay |
|----------|---------------|---------------------|
| Gemini | 2 | 1.0s |
| MiniMax | 2 | 2.0s |
| Runway | 2 | 2.0s |
| Pika | 2 | 2.0s |
| Veo | 1 | 2.0s |

### 6.2 Task Flow

```
Frontend POST → DRF Serializer (validatie + provider keuze)
    → Celery task (generate_asset_task)
        → acquire_semaphore(provider)
        → generate_video(provider=...) of generate_image()
            → provider-specifieke client
            → download output
            → upload naar S3
        → release_semaphore(provider)
    → Cache update (job status: queued → processing → completed/failed)
    → Frontend pollt /api/generative/status/{job_id}/
```

---

## 7. Bestanden Overzicht

```
src/generative/
├── services/
│   ├── asset_pipeline.py      # Hoofd-pipeline: provider routing, generate_video(), generate_image()
│   ├── minimax_client.py      # MiniMax/Hailuo client (httpx, raw API)
│   ├── runway_client.py       # Runway Gen client (runwayml SDK)
│   ├── pika_client.py         # Pika 2.2 client (fal-client SDK)
│   └── file_storage.py        # S3 upload service
├── tasks_asset.py             # Celery tasks, semaphore, rate limiting
├── views_asset.py             # DRF endpoints, serializers
└── urls.py                    # API routing

demo/src/
├── components/
│   └── AssetGenerationModal/
│       └── AssetGenerationModal.tsx   # Frontend UI met provider selector
└── hooks/
    └── useAssetGeneration.ts          # API hook (POST + polling)
```

---

## 8. Nieuwe Provider Toevoegen

Om een nieuwe video-provider toe te voegen (bijv. Kling, Luma):

1. **Client maken:** `src/generative/services/{provider}_client.py`
   - Volg het patroon van `pika_client.py` of `runway_client.py`
   - Implement: `create_video()`, `download_video()`, `generate_video()`

2. **Pipeline integreren:** `asset_pipeline.py`
   - Voeg `_generate_video_{provider}()` functie toe
   - Voeg provider toe aan explicit dispatch (if/elif)
   - Voeg provider toe aan auto-cascade
   - Laad de env var key

3. **Task queue:** `tasks_asset.py`
   - Voeg toe aan `PROVIDER_CONCURRENCY` en `PROVIDER_DELAY`

4. **API:** `views_asset.py`
   - Voeg toe aan `provider` ChoiceField choices

5. **Settings:** `local.py` + `production.py`
   - Voeg env var toe

6. **Frontend:** `AssetGenerationModal.tsx`
   - Voeg button toe aan provider selector array
   - Voeg beschrijving toe aan conditionale tekst

7. **Dependencies:** `requirements/base.txt`
   - Voeg SDK package toe

---

## 9. Vergelijking & Aanbevelingen

### Wanneer welke provider?

| Use Case | Aanbevolen | Waarom |
|----------|-----------|--------|
| Intro video's (I2V) | **MiniMax** | Beste prijs, betrouwbaar, geen content filter issues |
| Premium kwaliteit | **Runway** | Beste camera-controle, gen4.5 top tier |
| 1080p content | **Pika** | Native 1080p, goede T2V kwaliteit |
| Budget-vriendelijk | **MiniMax** | Laagste kosten per clip |
| Text-to-video | **Pika** of **Runway** (gen4.5) | MiniMax I2V-focused |
| Fallback/test | **Veo** | $0.15–$0.60 maar onbetrouwbaar voor portretten |

### Kostenmatrix (per 5s clip)

| Provider | 720p | 1080p |
|----------|------|-------|
| MiniMax | ~$0.10 | N/A |
| Runway | ~$0.25 (5 credits) | ~$0.50 (10 credits) |
| Pika | $0.20 | $0.45 |
| Veo | $0.15 (Fast) | $0.60 (Standard HQ) |
