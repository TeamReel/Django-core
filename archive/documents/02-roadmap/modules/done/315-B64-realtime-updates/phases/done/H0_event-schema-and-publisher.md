# H0 — Event Schema & Publisher

> **Effort:** ~4 uur | **Impact:** Backend kan events broadcasten

## To do

- [x] Event type registry in `src/rtc_websockets/events.py`:
  - `content.status_changed` — queued → rendering → completed / failed
  - `content.approved` — content goedgekeurd
  - `content.rejected` — content afgekeurd
  - `video.progress` — video processing voortgang (percentage)
  - `video.completed` — video klaar
  - `activity.created` — nieuwe B62 ActivityLog entry
- [x] Event payload schema (dataclass) met verplichte velden: `event_type`, `data`, `timestamp`, `actor_id`
- [x] `RealtimeEventPublisher` service die `NotificationService` wrapt met typed events
- [x] Integratie in content-generatie Celery tasks: `publish_content_event()` bij status transitions
- [x] Integratie in video-processing pipeline: `publish_video_event()` bij progress/completion
- [x] Unit tests voor event publishing

## Done criteria

- [x] Celery tasks publiceren events naar Redis channel layer bij content status changes
- [x] Event payloads valideren tegen schema
- [x] Bestaande WebSocket connections ontvangen events
