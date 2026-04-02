# Media/Video/Image Pipeline — Architectural Code Review

**Scope**: `src/video/`, `src/files/`, `src/generative/`, `src/activities/services/lineup_sync.py`
**Files reviewed**: 60+ files, ~15 000 lines
**Date**: 2025-01-31

---

## 1. Architecture Overview

### Pipeline Pattern

Every video type follows a **four-layer architecture**:

```
API View → VideoService (orchestrator) → Celery Task → Processor → Builder/Composer
```

| Layer | Responsibility |
|---|---|
| **View** (`views/`) | HTTP validation, permission check, job creation |
| **VideoService** (`services/video_service.py`) | Job lifecycle, Celery dispatch, workflow attachment |
| **Celery Task** (`tasks/`) | Retry logic, error handling, status management |
| **Processor** (`services/processors/`) | Download → process → upload → cleanup |
| **Builder** (`services/*_builder.py`) | Gather data from DB (Activity, Participations, BrandAssets) |
| **Composer/Generator** (`services/*_composer.py`, `*_generator.py`) | FFmpeg/PIL composition |

### Supported Job Types

| Type | Builder | Composer/Generator | Output |
|---|---|---|---|
| LINEUP | `LineupSegmentBuilder` | `LineupComposer` (FFmpeg) + `LineupSceneGenerator` (PIL) | MP4 video |
| GOAL_CELEBRATION | `GoalCelebrationBuilder` | `GoalCelebrationComposer` (FFmpeg) | MP4 video |
| MATCH_INTRO | — (inline in processor) | `MatchIntroProcessor` (FFmpeg drawtext) | MP4 video |
| THEN_VS_NOW | — (inline in processor) | `ThenVsNowComposer` (FFmpeg) | MP4 video |
| TRANSCODE | — | `TranscodeProcessor` (FFmpeg) | MP4/WebM |
| THUMBNAIL | — | `ThumbnailProcessor` (FFmpeg) | JPG |
| LINEUP_FLYER | `LineupSegmentBuilder` | `LineupFlyerGenerator` (PIL) | PNG |
| MATCH_FLYER | — | `MatchFlyerGenerator` (PIL) | PNG |

### Supporting Systems

| System | Location | Role |
|---|---|---|
| **FileAsset** | `src/files/` | Storage abstraction (S3/local), presigned URLs, thumbnails |
| **Generative** | `src/generative/` | AI asset generation (Gemini images, MiniMax/Runway/Pika/Veo video) |
| **Asset Processing** | `tasks/asset_processing.py` | Background removal (RVM/rembg), resize, per-member metadata |
| **LineupSyncService** | `activities/services/lineup_sync.py` | metadata.lineup → Participation records |
| **Workflow Engine** | `src/workflows/` | Video approval flow (processing → ready_for_review → approved) |

---

## 2. Data Flow

### Video Job Lifecycle

```
Frontend POST → View validates → VideoService.create_job()
  → Creates VideoJob (QUEUED)
  → Attaches "Video Approval" workflow (for match types)
  → transaction.on_commit → Celery task.delay()

Celery Worker:
  → Task fetches VideoJob, sets PROCESSING
  → Processor.execute():
      1. _download_source() → temp dir
      2. _process() → Builder gathers DB data → Composer runs FFmpeg
      3. _upload_output() → S3, creates FileAsset
      4. Updates VideoJob → COMPLETED
  → Task creates MediaItem (lineup/goal_celebration)
  → Task transitions workflow → ready_for_review
  → WebSocket event → frontend
```

### Asset Processing Lifecycle

```
Frontend POST /process-asset/ → View validates membership + raw URL
  → Marks metadata.teamreel_assets = PROCESSING
  → process_member_asset.delay()

Celery Worker:
  → AssetProcessor.process_asset():
      Image: download → rembg bg removal → resize/crop → upload PNG
      Video: download → RVM bg removal (or rembg fallback) → re-encode VP9 → upload WebM
  → Updates membership.metadata.teamreel_assets = PROCESSED
  → If fullbody: auto-queues closeup crop + halfbody crop
```

### AI Generation Lifecycle

```
Frontend POST /generate/ → View validates template + input images
  → Pillow-only templates: runs synchronously, returns immediately
  → AI templates:
      → generate_asset_task.delay() via Celery ai_generation queue
      → Semaphore-based concurrency control per provider
      → Gemini/MiniMax/Runway/Pika/Veo API call
      → Uploads result to S3 → updates cache + GenerationJob record
      → Frontend polls /status/<task_id>/ for result
```

---

## 3. Model Structure

### Video Models

| Model | Key Fields | Relationships |
|---|---|---|
| `VideoJob` | job_type, status, config (JSON), metadata (JSON), progress_percent | → Project, User, FileAsset (in/out), VideoPreset, PlatformExport, WorkflowInstance |
| `VideoOverlay` | overlay_type, position, opacity, z_index, start/end time | → VideoJob |
| `VideoPreset` | codec, bitrate, crf, framerate, output_format | standalone |
| `PlatformExport` | platform, aspect_ratio, resolution, crop_strategy | → VideoPreset |

### Files Models

| Model | Key Fields | Notes |
|---|---|---|
| `FileAsset` | storage_path, file_size, mime_type, is_public, thumbnail_path | Soft-delete support, org-scoped |

### Generative Models

| Model | Key Fields | Notes |
|---|---|---|
| `GenerationTemplate` | slug, version, input_schema (JSON Schema), pipeline_config, prompt_text | Versioned via parent_template FK |
| `GenerationRequest` | status, input_data, retry_count, estimated_cost, actual_cost | Lifecycle tracking |
| `GenerationOutput` | output_type, text_content, file_path | Result storage |
| `GenerationJob` | task_id, output_type, approval_status, output_url | Workflow Queue UI record |

---

## 4. Code Quality Issues

### 🔴 Critical

#### C1. Massive `_transition_workflow_on_completion()` Duplication

**The exact same 20-line function is copy-pasted in 5 files:**

- [tasks/lineup.py](src/video/tasks/lineup.py#L24-L48)
- [tasks/compose.py](src/video/tasks/compose.py) (similar)
- [tasks/then_vs_now.py](src/video/tasks/then_vs_now.py#L18-L49)
- [tasks/thumbnail.py](src/video/tasks/thumbnail.py#L17-L48)
- [tasks/transcode.py](src/video/tasks/transcode.py#L17-L48)
- [services/video_service.py](src/video/services/video_service.py) (`_transition_workflow_on_completion` method)

**Risk**: Inconsistent behavior if one copy is updated but others aren't. Already happening — `tasks/goal_celebration.py` and `tasks/match_intro.py` import from `tasks/lineup.py` while others define their own.

**Fix**: Extract to a shared module (e.g., `video/services/workflow.py`) and import everywhere.

---

#### C2. Brand Resolution Logic Duplicated ~80 Lines × 3 Files

Brand asset resolution (team → club → organisation fallback cascade) is nearly identical in:

- [services/lineup_builder.py](src/video/services/lineup_builder.py) (`_resolve_brand_assets`)
- [services/goal_celebration_builder.py](src/video/services/goal_celebration_builder.py) (`_resolve_brand_assets`)
- [processors/match_intro.py](src/video/services/processors/match_intro.py) (`_gather_match_data`)

**Risk**: Already diverged slightly between files. Any brand resolution bug fix must be applied 3×.

**Fix**: Create `video/services/brand_resolver.py` with a shared `resolve_brand_assets(project) → BrandAssetSet` function.

---

#### C3. Match Data Resolution Duplicated × 3 Files

Date, venue, competition, opponent extraction from Activity appears in:

- [services/lineup_builder.py](src/video/services/lineup_builder.py) (`_resolve_match_info`)
- [services/goal_celebration_builder.py](src/video/services/goal_celebration_builder.py) (`_resolve_match_info`)
- [processors/match_intro.py](src/video/services/processors/match_intro.py) (`_gather_match_data`)

**Fix**: Extract to a shared `MatchContext` dataclass + factory in `video/services/match_context.py`.

---

#### C4. Celery Task Boilerplate Duplicated × 7 Files

Each task file has ~60 identical lines of:
1. Fetch job from DB
2. Check if already completed/cancelled
3. Instantiate processor
4. Call `processor.execute()`
5. Error handling with retry logic
6. Cancel handling
7. Workflow transition

Files: `tasks/lineup.py`, `tasks/compose.py`, `tasks/goal_celebration.py`, `tasks/match_intro.py`, `tasks/then_vs_now.py`, `tasks/thumbnail.py`, `tasks/transcode.py`

**Fix**: Create a generic `run_video_job_task(job_id, processor_class)` function that all tasks call.

---

#### C5. Helper Wrapper Duplication

`_get_ffmpeg_path()`, `_download_image()`, `_get_font()`, `_resolve_font_path()` are redefined **despite `_common.py` providing canonical implementations**:

| Function | `_common.py` ✅ | Also defined in |
|---|---|---|
| `get_ffmpeg_path()` | ✅ | `lineup_flyer_generator.py`, `processors/match_intro.py`, `then_vs_now_composer.py` |
| `download_image()` | ✅ | `lineup_flyer_generator.py`, `lineup_scene_generator.py` |
| `get_pil_font()` | ✅ | `lineup_flyer_generator.py` |
| `resolve_ffmpeg_font_path()` | ✅ | `then_vs_now_composer.py` |

**Fix**: Delete duplicate definitions, import from `_common.py`.

---

### 🟡 Important

#### I1. N+1 Query Risk in `lineup_builder.py`

[lineup_builder.py](src/video/services/lineup_builder.py) `_resolve_asset_url()` performs individual `BrandAsset.objects.filter()` calls per asset type per brand profile in nested loops. For a typical lineup with 4 brand profiles × 5 asset types = 20 DB queries.

**Fix**: Batch-load all BrandAssets for the project/org upfront and filter in Python.

---

#### I2. Deprecated Daemon Threads in `video_service.py`

[video_service.py](src/video/services/video_service.py) contains 4 `_process_*_sync()` methods and 4 `_start_*_thread()` methods — deprecated daemon-thread fallbacks that:
- Run outside transaction management
- Have no retry logic
- Have no resource cleanup guarantees
- Each is ~50 lines of near-identical boilerplate

**Fix**: Delete these methods. All processing now goes through Celery tasks.

---

#### I3. Excessive DEBUG Logging in `lineup_builder.py`

~30+ `logger.info("DEBUG: ...")` statements throughout [lineup_builder.py](src/video/services/lineup_builder.py). These pollute production logs and were clearly left from development.

**Fix**: Remove or downgrade to `logger.debug()`.

---

#### I4. `_find_best_intro_url()` / `_find_best_celebration_url()` Near-Identical

These two functions in [lineup_builder.py](src/video/services/lineup_builder.py) differ only in variable names. They both iterate through video variants to find the best URL by kit type priority.

**Fix**: Parameterize into a single `_find_best_video_url(variants, kit_type, url_fn)`.

---

#### I5. Hardcoded Dutch Text

| File | Text | Line |
|---|---|---|
| `goal_celebration_composer.py` | `"DOELPUNT!"` | overlay text |
| `header_generator.py` | `"STARTING XI"`, `"LOCATIE:"` | header labels |
| `tasks/processing.py` | `"Taak vastgelopen"` | error messages |

**Risk**: Not i18n-safe. If TeamReel ever serves non-Dutch clubs, these are hard to find.

**Fix**: Low priority — product is Dutch-first. Consider extracting to a constants file for future i18n.

---

#### I6. FileViewSet `perform_create()` Has Complex Path Rewriting

[files/views.py](src/files/views.py) `perform_create()` contains ~60 lines of legacy path rewriting logic (slug deduplication, double-slug fixes, club/team hierarchy resolution). This is fragile and handles edge cases with multiple try/except blocks.

**Fix**: Extract path resolution to a dedicated `StoragePathResolver` service.

---

#### I7. Semaphore Race Condition in `tasks_asset.py`

[generative/tasks_asset.py](src/generative/tasks_asset.py) `_acquire_semaphore()` for `max_concurrent > 1` uses a non-atomic read-increment pattern:
```python
current = cache.get(counter_key) or 0
if int(current) < max_concurrent:
    cache.set(counter_key, int(current) + 1, ...)
```
Two workers reading simultaneously could both see `current=1` and both increment to 2, exceeding the limit.

**Fix**: Use Redis `INCR` + check, or a Redis-backed distributed lock.

---

#### I8. `process_member_asset` 45-Second Sleep

[tasks/asset_processing.py](src/video/tasks/asset_processing.py#L315) has a hardcoded 45-second `time.sleep()` after video processing:
```python
if asset_type in ("intro", "celebration", "then_vs_now"):
    cooldown_secs = 45
    time.sleep(cooldown_secs)
```
This blocks the Celery worker for 45 seconds per video asset, reducing throughput.

**Fix**: Use Celery's `countdown` parameter for the next task instead of blocking the worker, or use Railway worker autoscaling.

---

### 🟢 Nice-to-Have

#### N1. `compose.py` Processor Hardcodes `ffmpeg` Binary

[processors/compose.py](src/video/services/processors/compose.py) uses `"ffmpeg"` string directly instead of the canonical `get_ffmpeg_path()` from `_common.py`.

---

#### N2. `TranscodeProcessor` Raises NotImplementedError for HLS

[processors/transcode.py](src/video/services/processors/transcode.py) raises `NotImplementedError` for HLS output format. This is listed as a supported `OutputFormat` on `VideoPreset`.

---

#### N3. `team_poster_generator.py` — No Retry or Rate Limiting

[services/team_poster_generator.py](src/video/services/team_poster_generator.py) makes a single Gemini API call with no retry logic and no rate limiting. For a paid API, this is risky.

---

#### N4. `asset_metadata.py` `resolve_lineup_member_assets()` Has Complex Legacy Fallback

The function checks new `roles.{role}` structure then falls back to legacy flat `images/videos` and then to legacy `media.*` aliases. This three-layer fallback adds complexity.

**Fix**: After migration to new format is complete, remove legacy fallback paths.

---

## 5. Refactoring Opportunities

### Priority 1: Extract Shared Utilities (Eliminates ~500 duplicated lines)

Create these shared modules:

| Module | Extracts from | Impact |
|---|---|---|
| `video/services/workflow.py` | 5× `_transition_workflow_on_completion()` | ~100 lines removed |
| `video/services/brand_resolver.py` | 3× brand resolution, match data resolution | ~300 lines removed |
| `video/services/task_runner.py` | 7× task boilerplate | ~400 lines removed |

### Priority 2: Delete Dead Code

| Target | Impact |
|---|---|
| `video_service.py` `_process_*_sync()` × 4 | ~200 lines removed |
| `video_service.py` `_start_*_thread()` × 4 | ~60 lines removed |
| DEBUG log spam in `lineup_builder.py` | ~30 lines cleaned |

### Priority 3: Consolidate Helper Functions

Import from `_common.py` instead of redefining in each composer/generator. Affects ~5 files.

### Priority 4: Plugin Architecture for Video Types

Currently adding a new video type requires:
1. New builder
2. New composer
3. New processor
4. New task (copy-paste from existing)
5. New dispatch mapping in `video_service.py`
6. New job type enum value

A registry-based plugin system would reduce this to:
1. New builder + composer
2. Register with `@video_processor("my_type")`

---

## 6. File-Level Summary

### `src/video/services/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `video_service.py` | ~650 | 🟡 | Central orchestrator. Contains ~260 lines of deprecated thread/sync fallback code. |
| `lineup_builder.py` | ~900 | 🔴 | Complex but functional. N+1 risk, DEBUG spam, duplicated brand/match resolution. |
| `lineup_composer.py` | ~900 | 🟡 | Massive FFmpeg filter chains. Well-structured but hard to maintain. |
| `lineup_flyer_generator.py` | ~750 | 🟡 | Duplicates helpers from `_common.py`. Label collision algo is brute-force O(n²). |
| `lineup_scene_generator.py` | ~350 | 🟢 | Clean PIL-based scene generator. |
| `goal_celebration_builder.py` | ~320 | 🔴 | ~80 lines copy-pasted from `lineup_builder.py`. |
| `goal_celebration_composer.py` | ~300 | 🟡 | Hardcoded Dutch text "DOELPUNT!". |
| `match_flyer_generator.py` | ~400 | 🟢 | Clean, 3 design variants. |
| `header_generator.py` | ~500 | 🟢 | Good shared header logic. Some hardcoded Dutch text. |
| `team_poster_generator.py` | ~250 | 🟡 | No retry/rate limiting on Gemini API. |
| `then_vs_now_composer.py` | ~500 | 🟡 | Duplicates helper wrappers. |
| `asset_processor.py` | ~400 | 🟢 | Clean dual-path (image/video) processor. |
| `asset_processing_specs.py` | ~230 | 🟢 | Well-structured spec definitions. |
| `rvm_processor.py` | ~400 | 🟢 | Solid RVM integration with lazy model loading. |
| `_common.py` | ~330 | 🟢 | **Canonical utilities** — well-written, but underused by other files. |
| `constants.py` | 25 | 🟢 | Simple constants. |

### `src/video/services/processors/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `base.py` | ~200 | 🟢 | Good abstract base class with download → process → upload flow. |
| `compose.py` | ~180 | 🟢 | Hardcodes `ffmpeg` binary name (minor). |
| `lineup.py` | ~400 | 🟢 | Dual pipeline (new composer vs legacy segments). |
| `goal_celebration.py` | ~180 | 🟢 | Clean delegation to builder + composer. |
| `match_intro.py` | ~200 | 🟡 | Duplicates `_get_ffmpeg_path()` and brand resolution. |
| `thumbnail.py` | 40 | 🟢 | Simple. |
| `transcode.py` | 63 | 🟢 | HLS raises NotImplementedError. |
| `then_vs_now.py` | ~200 | 🟢 | Clean 3-mode routing. |

### `src/video/tasks/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `lineup.py` | ~200 | 🟢 | Canonical task + auto-MediaItem creation. Defines shared helpers. |
| `compose.py` | ~150 | 🔴 | Duplicates `_transition_workflow_on_completion()`. |
| `goal_celebration.py` | ~100 | 🟢 | Imports helpers from `tasks/lineup.py` (good). |
| `match_intro.py` | ~100 | 🟢 | Imports helpers from `tasks/lineup.py` (good). |
| `then_vs_now.py` | ~140 | 🔴 | Defines own `_transition_workflow_on_completion()` copy. |
| `thumbnail.py` | ~100 | 🔴 | Defines own `_transition_workflow_on_completion()` copy. |
| `transcode.py` | ~100 | 🔴 | Defines own `_transition_workflow_on_completion()` copy. |
| `processing.py` | ~100 | 🟢 | Generic dispatcher + `recover_stale_video_jobs` periodic task. |
| `asset_processing.py` | ~500 | 🟡 | 45s `time.sleep()` blocking worker. Auto-crop chaining is smart. |

### `src/video/views/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `job.py` | ~300 | 🟢 | Well-structured ViewSet. Good self-healing for stuck jobs. Good org-scoping. |
| `job_content.py` | ~300 | 🟡 | Complex `lineup_from_template` with sync/async paths. |
| `job_processing.py` | ~300 | 🟢 | Clean asset processing mixin. |
| `platform.py` | 30 | 🟢 | Simple read-only ViewSet. |
| `preset.py` | 30 | 🟢 | Simple read-only ViewSet. |

### `src/video/utils/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `asset_metadata.py` | ~450 | 🟡 | Complex but necessary 3-layer metadata format with legacy fallbacks. |

### `src/files/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `models.py` | ~80 | 🟢 | Clean FileAsset model. |
| `views.py` | ~300 | 🟡 | `perform_create()` has ~60 lines of fragile path rewriting. |
| `serializers.py` | 50 | 🟢 | Clean. |
| `tasks.py` | ~130 | 🟢 | Thumbnail generation + cleanup. |
| `utils.py` | ~50 | 🟢 | Storage backend factory with auto-detection. |

### `src/generative/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `models.py` | ~300 | 🟢 | Well-designed template + request + output models with JSON Schema validation. |
| `tasks.py` | ~300 | 🟢 | Clean async processing with idempotency and retry. |
| `tasks_asset.py` | ~300 | 🟡 | Semaphore race condition on concurrent counter. |
| `serializers.py` | ~250 | 🟢 | Thorough validation. |
| `views_generate.py` | ~300 | 🟢 | Clean sync/async split (Pillow vs AI). |
| `views_save.py` | ~200 | 🟢 | Asset persistence. |
| `views_jobs.py` | ~200 | 🟢 | Job listing with live cache enrichment. |
| `views_crop.py` | ~200 | 🟢 | Deterministic Pillow cropping. |
| `_asset_helpers.py` | ~300 | 🟢 | Model registry, cache store, serializers. |

### `src/activities/services/`

| File | Lines | Severity | Summary |
|---|---|---|---|
| `lineup_sync.py` | ~250 | 🟢 | Clean sync service. Good use of `@transaction.atomic`, batch operations, kit readiness checks. |

---

## 7. Positive Highlights

1. **`_common.py`** is well-designed as a canonical utility module — it just needs wider adoption.
2. **Asset metadata helpers** (`asset_metadata.py`) provide clean read/write abstractions for a complex nested JSON structure.
3. **`recover_stale_video_jobs`** is a smart self-healing mechanism for stuck jobs.
4. **Job self-healing** in `VideoJobViewSet.retrieve()` auto-redispatches stuck QUEUED jobs.
5. **`LineupSyncService`** has clean architecture with batch DB operations and proper transaction management.
6. **Generative pipeline** has good separation (templates, requests, outputs) with JSON Schema validation.
7. **Celery task configuration** is well-tuned (acks_late, retry_backoff with jitter, appropriate time limits).
8. **Auto-crop chaining** after fullbody processing is a smart UX optimization.
9. **`BaseVideoProcessor`** provides a clean template method pattern for the download → process → upload flow.

---

## 8. Recommended Action Plan

| # | Action | Files | Effort | Impact |
|---|---|---|---|---|
| 1 | Extract `_transition_workflow_on_completion()` to shared module | 7 task files | ~1h | 🔴 Eliminates inconsistency risk |
| 2 | Extract brand/match resolution to shared service | 3 builder files | ~3h | 🔴 Eliminates 300 duplicated lines |
| 3 | Delete deprecated sync/thread methods from `video_service.py` | 1 file | ~30m | 🟡 Removes ~260 dead lines |
| 4 | Clean DEBUG logging in `lineup_builder.py` | 1 file | ~15m | 🟡 Cleans production logs |
| 5 | Import helpers from `_common.py` instead of redefining | ~5 files | ~1h | 🟡 Prevents drift |
| 6 | Fix semaphore race condition in `tasks_asset.py` | 1 file | ~30m | 🟡 Prevents over-concurrency |
| 7 | Replace `time.sleep(45)` with Celery countdown | 1 file | ~30m | 🟡 Unblocks worker |
| 8 | Create generic task runner to reduce task boilerplate | 7 task files | ~3h | 🟢 Future maintenance |
