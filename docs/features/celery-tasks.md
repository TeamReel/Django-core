# Celery & Async Tasks

> Last updated: 2026-03-21

## Overview

TeamReel uses **Celery 5** with **Redis** as broker for background processing. **33 production tasks** across 4 queues, handled by 3 Railway workers.

---

## Queue Architecture

| Queue | Purpose | Worker | Concurrency | Timeout |
|-------|---------|--------|-------------|---------|
| **default** | Lightweight tasks — notifications, cleanup, indexing | celery-worker | 2 | 5 min |
| **video_fast** | Quick video ops — thumbnails, cropping, metadata | celery-worker | 2 | 2 min |
| **video_slow** | Heavy FFmpeg — transcode, compose, asset processing | celery-worker | 1 | 2 hr |
| **ai_generation** | Rate-limited AI API calls — image/video generation | worker-ai | 1 | 15 min |

---

## Tasks by Domain

### Video Processing (12 tasks — `video_slow` / `video_fast`)

| Task | Queue | Description |
|------|-------|-------------|
| `transcode_video` | video_slow | Transcode video to target format |
| `compose_video` | video_slow | Compose video with overlays, text, intro/outro |
| `process_video_job` | default | Dispatch video job to appropriate processor |
| `process_lineup_video` | video_slow | Process lineup video with member extraction |
| `process_match_intro_video` | video_slow | Process match intro video |
| `process_then_vs_now_video` | video_slow | Process Then vs Now compilation |
| `process_goal_celebration_video` | video_slow | Process goal celebration video |
| `process_member_asset` | video_slow | Process single member asset + metadata |
| `auto_crop_closeup_from_fullbody` | video_fast | Auto-crop closeup from fullbody image |
| `stitch_video_lightbox` | video_slow | Stitch multiple videos into grid layout |
| `extract_then_vs_now_clips` | video_slow | Extract clips from raw footage |
| `generate_thumbnail` (video) | video_fast | Generate thumbnail at timestamp or grid |
| `recover_stale_video_jobs` | default | Detect and fail stuck video jobs (>15 min) |

### AI Generation (4 tasks — `ai_generation` / `default`)

| Task | Queue | Description |
|------|-------|-------------|
| `process_generation_request` | ai_generation | Process GenerationRequest through LangGraph executor |
| `generate_asset_task` | ai_generation | Rate-limited asset generation (images/videos) |
| `recover_stale_generation_jobs` | default | Fail stuck generation jobs (>30 min) |
| `update_template_costs` | default | Monthly recalculate template costs |
| `cleanup_expired_outputs` | default | Daily cleanup expired generation outputs |

### Content Generation (2 tasks — `default`)

| Task | Queue | Description |
|------|-------|-------------|
| `generate_content_task` | default | AI content generation with file storage |
| `cleanup_expired_content` | default | Daily cleanup expired content items |

### Notifications (4 tasks — `default`)

| Task | Queue | Description |
|------|-------|-------------|
| `route_event_task` | default | Route event to recipients with suppression & dedup |
| `deliver_email_notification` | default | Deliver email with auto-retry on transient errors |
| `cleanup_old_notifications` | default | Daily delete old notifications |
| `archive_old_notifications` | default | Archive before deletion (placeholder) |

### Workflows (1 task)

| Task | Queue | Description |
|------|-------|-------------|
| `execute_workflow_hooks` | default | Execute on_exit, on_transition, on_enter hooks async |

### Media & Files (4 tasks — `default`)

| Task | Queue | Description |
|------|-------|-------------|
| `process_media_item` | default | Extract metadata & trigger thumbnails |
| `generate_media_thumbnails` | default | Generate image/video thumbnails |
| `generate_thumbnail` (files) | default | Generate 300x300 thumbnail for image file |
| `cleanup_deleted_files` | default | Daily cleanup soft-deleted files |

### Other (5 tasks — `default`)

| Task | Queue | Description |
|------|-------|-------------|
| `log_event` | default | Create ActivityLog entry + real-time event |
| `cleanup_expired_trash` | default | Permanently delete expired TrashItems |
| `collect_system_metrics` | default | Cache performance metrics (every 10 min) |
| `update_search_index` | default | Update search index for object |
| `delete_search_index` | default | Remove search index entry |
| `cleanup_stale_connections` | default | Remove stale WebSocket records (>1 hr) |

---

## Celery Beat Schedule

| Schedule | Task | Time |
|----------|------|------|
| Every 10 min | `collect_system_metrics` | — |
| Daily | `cleanup_old_notifications` | 02:00 UTC |
| Daily | `cleanup_expired_content` | 02:15 UTC |
| Daily | `cleanup_deleted_files` | 02:30 UTC |
| Daily | `cleanup_expired_sessions` | 03:00 UTC |
| Monthly | `update_template_costs` | 1st, 03:00 UTC |

---

## Gerelateerde docs

- [architecture.md](../architecture/overview.md) — System architecture met worker diagram
- [../infrastructure/railway-services.md](../infrastructure/railway-services.md) — Railway worker configuratie
- [generative-pipeline.md](generative-pipeline.md) — AI generation pipeline details
- [video-processing.md](video-processing.md) — Video pipeline details
