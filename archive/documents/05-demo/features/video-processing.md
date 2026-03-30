# Video Processing Pipeline

> Last updated: 2026-03-12

## Overview

De `video` app verwerkt alle visuele output van TeamReel: van FFmpeg transcoding tot lineup-video's, match flyers, en goal celebrations. De architectuur volgt een **Builder → Composer** patroon met pluggable processors.

**Kerngetallen:** 4 models, 12+ services (~12.000 regels), 7 job types, 4 platform exports.

---

## Data Model

### VideoJob

Core processing entity — één job per video-verwerkingsverzoek.

| Veld | Type | Doel |
|------|------|------|
| `job_type` | choices | `transcode`, `thumbnail`, `compose`, `lineup`, `goal_celebration`, `match_intro`, `then_vs_now` |
| `status` | choices | `queued → processing → completed / failed / cancelled` |
| `progress_percent` | int | 0–100 |
| `input_file` | FK → FileAsset | Optioneel (lineup/celebration/intro hebben geen input) |
| `output_file` | FK → FileAsset | Ingevuld bij completion |
| `preset` | FK → VideoPreset | Encoding settings |
| `platform_export` | FK → PlatformExport | Platform-specifiek |
| `workflow_instance` | FK → WorkflowInstance | Approval flow |
| `config` | JSON | Job-specifiek: `{activity_id, segments, formation, ...}` |
| `metadata` | JSON | Output info: `{duration, resolution, approval_status}` |

**Property:** `publishable` — True als completed AND (geen workflow OF workflow approved).

### VideoPreset

Herbruikbare encoding configuratie.

| Veld | Type | Voorbeeld |
|------|------|-----------|
| `output_format` | str | `mp4`, `webm`, `hls` |
| `video_codec` | str | `libx264`, `libvpx-vp9` |
| `resolution` | str | `1920x1080` |
| `bitrate_video` | str | `5M` |
| `crf` | int | 0–51 (quality factor) |
| `framerate` | int | 30, 60 |
| `is_system` | bool | Read-only systeempresets |

### PlatformExport

Platform-specifieke export configs.

| Platform | Aspect Ratio | Crop Strategy |
|----------|-------------|---------------|
| Instagram (Feed) | 1:1 | crop/letterbox/fit |
| Instagram (Reels) | 9:16 | crop |
| TikTok | 9:16 | crop |
| YouTube | 16:9 | letterbox |
| Stories | 9:16 | crop |

### VideoOverlay

Compositie-laag gekoppeld aan een VideoJob.

| Veld | Type | Doel |
|------|------|------|
| `overlay_type` | choices | `logo`, `watermark`, `text`, `intro`, `outro` |
| `position` | choices | 7 presets + `custom` (x,y coords) |
| `opacity` | float | 0.0–1.0 |
| `start_time` / `end_time` | float | Getimede weergave (seconden) |
| `z_index` | int | Laagvolgorde |
| `asset_file` | FK → FileAsset | Logo/intro video bestand |

---

## Job Lifecycle

```
create_job()
  │
  ├── transcode/thumbnail/compose → Celery .delay() (acks_late)
  │
  └── lineup/goal/intro/then_vs_now → Background thread
      (atomic UPDATE WHERE status='queued' → idempotent)
  │
  ▼
QUEUED → PROCESSING (progress_percent updates)
  │
  ├── ✅ COMPLETED
  │   ├── approve → approval_status="approved" + WorkflowEngine.execute_transition
  │   │             + auto-create MediaItem linked to activity
  │   └── reject  → approval_status="rejected"
  │
  ├── ❌ FAILED → retry → terug naar QUEUED (retry_count++)
  │
  └── 🚫 CANCELLED
```

**Stale recovery:** `recover_stale_video_jobs` markeert jobs stuck in QUEUED/PROCESSING >15 min als FAILED.

---

## Content Generators

### Lineup Video (4049 regels)

**Builder → Composer patroon:**

```
POST /video/jobs/lineup-from-template/
  → lineup_builder.build_lineup_video_config()
    → Load Activity + Participation (spelers + posities)
    → Load ProjectMembership.metadata.teamreel_assets
    → Load BrandAssets (logos, sponsors, field bg)
    → Apply FORMATION_SPLITS (4-3-3 → 4,3,3 groepen)
    → Group players: keeper → defense → midfield → attack
    → Output: segments[] config
  → VideoService.create_job(type="lineup")
  → Background thread → LineupComposer:
    1. Download assets van S3
    2. Header image (logos + match info)
    3. Per-phase clip: slide-up animatie → intro overlay (WebM alpha) → crossfade naar badge
    4. Sponsor box overlay
    5. Final hold frame (alle badges zichtbaar)
    6. FFmpeg concat → upload S3 → FileAsset + MediaItem
```

**Canvas:** 1080×1920 (portrait 9:16) @ 30fps

### Andere Generators

| Generator | Regels | Output |
|-----------|--------|--------|
| **Goal Celebration** | 927 | Header + score reveal → celebration overlay → final hold |
| **Then vs Now** | 1807 | Sequentiële member clips met transitions. Modi: `sidebyside`, `transformation`, `duo_portret` |
| **Match Flyer** | 1524 | PNG — 3 design varianten: Modern, Action (speler foto's), Stadium (AI-bg via Gemini) |
| **Lineup Flyer** | 860 | PNG — 1080×1920, speler cutouts op veld, labels, sponsor |
| **Match Intro** | 627 | 6-seconden aankondiging met popup tekst animaties (team namen, VS, datum) |
| **Team Poster** | 291 | AI teamfoto via Gemini — 11 spelers in 6-5 formatie |
| **Header** | 554 | Gedeeld header image: club logo + match info + sponsor logo |

---

## Asset Processing

**AssetProcessor** (1216 regels) — raw → lineup-ready conversie:

```
ProcessingState: raw → processing → processed / failed / cancelled
```

| Asset Type | Target Spec |
|-----------|-------------|
| Fullbody | 1080×1920 PNG (portrait) |
| Closeup | 1080×1920 PNG |
| Intro | 540×960 WebM VP9 25fps (video) |
| Celebration | 540×960 WebM VP9 25fps |

**RVM Processor** (842 regels) — Robust Video Matting:
- FFmpeg decode → raw RGB pipe → RVM inference → RGBA pipe → FFmpeg encode (WebM VP9 alpha)
- Temporally-consistent background removal voor video

---

## Processor Hierarchy

Alle processors extenden `BaseVideoProcessor` (ABC):

```
BaseVideoProcessor
  ├── download input → build_command() → _run_ffmpeg() → upload output → cleanup
  │
  ├── TranscodeProcessor — FFmpeg transcoding via VideoPreset
  ├── ComposeProcessor — Overlay compositie (filter graph)
  ├── LineupProcessor — Multi-segment concatenatie
  ├── GoalCelebrationProcessor — Score reveal compositie
  ├── MatchIntroProcessor — 6s popup animatie (1080×1920 @ 30fps)
  └── ThenVsNowProcessor — Orchestreert ThenVsNowComposer
```

---

## Celery Tasks

| Task | Time Limits | Retries |
|------|------------|---------|
| `transcode_video` | 30m soft / 35m hard | 3, backoff 60s–1h |
| `generate_thumbnail` | 1m soft / 2m hard | 3, backoff 30s–10m |
| `compose_video` | 1h soft / 1h10m hard | 3, backoff 60s–1h |
| `process_then_vs_now_video` | 2h soft / 2h10m hard | 2, backoff 60s–1h |
| `process_member_asset` | — | — |
| `recover_stale_video_jobs` | — | Periodiek, 15 min threshold |

---

## API Endpoints

| Methode | Endpoint | Doel |
|---------|----------|------|
| POST | `/video/jobs/lineup-from-template/` | Lineup video vanuit Activity |
| POST | `/video/jobs/then-vs-now-compilation/` | Then vs Now compilatie |
| POST | `/video/jobs/goal-celebration-from-template/` | Goal celebration video |
| POST | `/video/jobs/lineup-flyer/` | Statische lineup flyer (PNG) |
| POST | `/video/jobs/match-flyer/` | Match flyer (3 varianten) |
| POST | `/video/jobs/match-intro-from-template/` | 6-seconden match intro |
| POST | `/video/jobs/team-poster/` | AI teamfoto via Gemini |
| POST | `/video/jobs/{id}/approve/` | Goedkeuren + MediaItem aanmaken |
| POST | `/video/jobs/{id}/reject/` | Afwijzen |
| POST | `/video/jobs/{id}/retry/` | Opnieuw proberen |
| GET | `/video/jobs/counts/` | Status counts (voor queue badges) |
| POST | `/video/jobs/process-asset/` | Raw → lineup-ready conversie |

---

## Gerelateerde docs

- [generative-pipeline.md](generative-pipeline.md) — AI generation (upstream)
- [../media/media-architecture.md](../media/media-architecture.md) — 4-laags media opslag
- [../media/lineup-architecture.md](../media/lineup-architecture.md) — Lineup video detail
- [../media/rvm-alpha-pipeline.md](../media/rvm-alpha-pipeline.md) — Background removal detail
