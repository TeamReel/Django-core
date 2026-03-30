# Generative Asset Pipeline

> Last updated: 2026-03-12

## Overview

De `generative` app is de AI-kern van TeamReel. Twee parallelle pipelines verwerken content:

1. **Template-based pipeline** — `GenerationRequest` → Executor → `GenerationOutput` (text/image via OpenAI, Gemini, LangGraph)
2. **Asset pipeline** — `GenerationJob` → `asset_pipeline.py` → S3 (member images/videos via Gemini + MiniMax/Runway/Pika/Veo)

**Kernservice:** `asset_pipeline.py` (2617 regels) — preprocessing, kit-analyse, prompt resolution, image/video generatie, postprocessing.

---

## Data Model (4 models)

### GenerationTemplate

Herbruikbare blueprint voor content generatie.

| Veld | Type | Doel |
|------|------|------|
| `template_type` | choices | `member`, `season`, `pre_match`, `during_match`, `post_match`, `custom` |
| `template_subtype` | choices | 24 subtypes: `profile_photo`, `flyer`, `lineup`, `walkon`, `goal`, `end_score`, `custom_logo`… |
| `pipeline_config` | JSON | `{provider, model, estimated_cost, graph_id, use_brand_context}` |
| `input_schema` | JSON | JSON Schema Draft 7 voor input validatie |
| `retention_days` | int | Dagen tot output verwijdering |
| `version` | str | Semver — immutable version chain via `parent_template` |

### GenerationRequest

Job submission met volledige lifecycle tracking.

| Veld | Type | Doel |
|------|------|------|
| `status` | choices | `pending → processing → completed / failed / cancelled` |
| `input_data` | JSON | Gevalideerd tegen `template.input_schema` |
| `estimated_cost` / `actual_cost` | Decimal | Credit reservation & settlement |
| `transaction_id` | BigInt | Verwijzing naar Transaction (credits) |
| `error_category` | choices | `transient / permanent / unknown` |
| `metadata` | JSON | `{retry_history, execution: {provider, duration_seconds}}` |

### GenerationOutput

Resultaat van een voltooide request (OneToOne met Request).

| Veld | Type | Doel |
|------|------|------|
| `output_type` | choices | `image / video / text / json` |
| `file_id` | UUID | FileAsset referentie |
| `text_content` | text | Inline text/JSON output |
| `expires_at` | datetime | Auto-computed uit `retention_days` |

### GenerationJob

Lightweight job tracker voor de "AI Queue" UI. Spiegelt Redis cache state.

| Veld | Type | Doel |
|------|------|------|
| `status` | choices | `queued → waiting → processing → retrying → completed / failed / cancelled` |
| `template_id` | str | bijv. `"fullbody_in_tenue"` |
| `output_type` | str | `image / video` |
| `output_asset_type` | str | bijv. `kit`, `closeup`, `intro` |
| `approval_status` | choices | `pending_review → approved / rejected` |
| `output_url` | text | Primaire output URL |
| `output_variants` | JSON | `[{variant_index, storage_path, file_asset_id, mime_type}]` |

---

## Request Lifecycle

### Template-based (text/structured output)

```
GenerationRequest(status=PENDING)
  → Celery: process_generation_request(request_id)
    → start_processing()
    → BrandContextService.inject_brand_context()
    → ExecutorFactory.get_executor(pipeline_config)
    → executor.execute(config, input_data, brand_context)
    → ✅ Success: GenerationOutput.create → credit settlement → mark_completed
    → ❌ Failure: classify_error → retry (max 5) of mark_failed + credit refund
    → WebSocket status update naar frontend
```

### Asset pipeline (member images/videos)

```
GenerationJob(status=QUEUED)
  → Celery: generate_asset_task (queue=ai_generation, rate=6/min)
    → Acquire provider semaphore (max wait 9 min)
    → Route: output_type == "video" → _process_video() / else → _process_images()
    → Upload variants naar S3
    → Sync GenerationJob DB + Redis cache
    → ❌ Transient error: Celery retry (30s × attempt backoff, max 3)
```

---

## Executor Architecture

**Base:** `BasePipelineExecutor` (ABC) met `execute()`, `calculate_estimated_cost()`, `classify_error()`

| Executor | Provider key | Modellen | Gebruik |
|----------|-------------|----------|---------|
| `OpenAIExecutor` | `openai` | gpt-4, gpt-4-turbo, gpt-4o | Chat completions (text) |
| `GeminiImageExecutor` | `gemini_image` | gemini-2.0-flash, imagen-4 | Image generate/edit/analyze/variation |
| `LangGraphExecutor` | `langgraph` | Any graph_id | Stateful multi-step workflows |

`ExecutorFactory` — eager + lazy loading, extensible via `register_executor()`.

---

## Provider Cascade (Video)

Auto-selectie op basis van beschikbare API keys:

| Prioriteit | Provider | Model | Specs |
|-----------|----------|-------|-------|
| 1 | **MiniMax/Hailuo** | video-01 | 720p, 25fps, ~6s |
| 2 | **Runway Gen** | gen4_turbo | 5 credits/s |
| 3 | **Pika 2.2** (via fal.ai) | pika-2.2 | text-to-video & image-to-video |
| 4 | **Google Veo** | veo-3.1 | Legacy fallback |

**Concurrency:** Redis semaphore per provider (2 concurrent, behalve Veo: 1).

---

## Image Pipeline Stages

### 1. Preprocessing

- **Fast path** (Pillow-only): logo/sponsor/kit/location postprocess → skip Gemini
- **Photo composite**: crop fullbodies, create PIL reference, verzend 4 images
- **Standard**: preprocess images (pad/center) → kit analyse via Gemini → prompt resolution

### 2. Generation

- Gemini API call per variant (1-4 varianten, sequentieel met delay)
- Model: configureerbaar (default: nano-banana-pro-preview)

### 3. Postprocessing

- **Logo**: tight-crop alpha bbox, scale naar 1024×1024
- **Sponsor**: landscape (1024×512) of square (1024×1024)
- **Kit**: portrait 820×1024
- **Background**: portrait 1920×1080
- **Checkerboard removal**: BFS flood-fill, multi-scale block detectie

---

## Services

| Service | Doel |
|---------|------|
| `asset_pipeline.py` | Core orchestrator (2617 regels) |
| `brand.py` | BrandContextService — injecteert brand identity in generation input |
| `file_storage.py` | S3 path builder, store/get/delete via FileAsset |
| `minimax_client.py` | MiniMax/Hailuo video-01 API client (create→poll→download) |
| `runway_client.py` | Runway Gen SDK wrapper (gen4_turbo) |
| `pika_client.py` | Pika 2.2 via fal.ai SDK |
| `websocket.py` | Real-time status updates via WebSocket |
| `credit_service.py` | Reserve → settle → refund credit flow (zie [credits-transactions.md](credits-transactions.md)) |

---

## Celery Tasks

| Task | Queue | Timing |
|------|-------|--------|
| `process_generation_request` | default | Max 5 retries, exponential backoff |
| `generate_asset_task` | ai_generation | Rate 6/min, 15-min soft limit, max 3 retries |
| `cleanup_expired_outputs` | default | Dagelijks 2:00 UTC |
| `update_template_costs` | default | Maandelijks 1e, 3:00 UTC |
| `recover_stale_generation_jobs` | default | Periodiek, 30 min threshold |

---

## Gerelateerde docs

- [credits-transactions.md](credits-transactions.md) — Credit reserve/settle/refund flow
- [generation-queue.md](generation-queue.md) — GenerationJob queue polling UI
- [video-processing.md](video-processing.md) — FFmpeg video pipeline (downstream)
- [../media/ai-providers.md](../media/ai-providers.md) — Provider cascade details
- [../media/ai-models-pricing.md](../media/ai-models-pricing.md) — Per-provider kosten
