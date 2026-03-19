# H0 — Event Schema & Publisher

> **Effort:** ~4 uur | **Impact:** Backend kan events broadcasten

## To do

- [ ] Event type registry in `src/rtc_websockets/events.py`:
  - `content.status_changed` — queued → rendering → completed / failed
  - `content.approved` — content goedgekeurd
  - `content.rejected` — content afgekeurd
  - `video.progress` — video processing voortgang (percentage)
  - `video.completed` — video klaar
  - `activity.created` — nieuwe B62 ActivityLog entry
- [ ] Event payload schema (dataclass) met verplichte velden: `event_type`, `data`, `timestamp`, `actor_id`
- [ ] `RealtimeEventPublisher` service die `NotificationService` wrapt met typed events
- [ ] Integratie in content-generatie Celery tasks: `publish_content_event()` bij status transitions
- [ ] Integratie in video-processing pipeline: `publish_video_event()` bij progress/completion
- [ ] Unit tests voor event publishing

## Done criteria

- [ ] Celery tasks publiceren events naar Redis channel layer bij content status changes
- [ ] Event payloads valideren tegen schema
- [ ] Bestaande WebSocket connections ontvangen events
