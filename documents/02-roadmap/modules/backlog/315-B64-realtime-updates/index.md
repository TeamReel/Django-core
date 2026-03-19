# B64: Real-time Updates

**Priority:** 🔥 Bouwen
**Phase:** 16
**Status:** 📋 ROADMAP
**Module ID:** 315
**Category:** Backend (TeamReel Product Feature)

## Description

## 305. B64 – Real-time Updates

**Doel**: Server-Sent Events (SSE) of Django Channels WebSocket integratie zodat content-generatie status, goedkeuringen en teamupdates live zichtbaar zijn zonder page refresh.

**Waarom TeamReel**: Content-generatie duurt 30s–5min. Gebruikers moeten live status zien ("rendering → klaar") zonder te refreshen. Vergroot vertrouwen in het platform en vermindert support-vragen ("waarom duurt het zo lang?").

**Wat moet er gebeuren**:
- **Architectuurbeslissing: SSE vs WebSocket**:
  - **Optie A — SSE (Server-Sent Events)**: Eenvoudiger, HTTP-based, geen extra infra. Unidirectioneel (server→client). Werkt met bestaande Django views + Redis pub/sub.
  - **Optie B — Django Channels (WebSocket)**: Bidirectioneel, meer flexibel. Vereist ASGI, Daphne/Uvicorn, channel layers config. Meer infra-complexiteit op Railway.
  - **Aanbeveling**: SSE voor v1 (TeamReel is read-heavy, gebruikers hoeven niets te sturen). WebSocket als upgrade-pad voor v2 als bidirectionele communicatie nodig wordt.
- **Event channels**:
  - `content.{content_id}` — Status updates: queued → rendering → completed / failed
  - `project.{project_id}` — Project-brede events: nieuwe content, goedkeuringen
  - `user.{user_id}` — Persoonlijke events: notificaties, approval requests
- **Redis pub/sub**:
  - Publisher: Celery tasks sturen events naar Redis channel bij status-wijziging
  - Subscriber: SSE endpoint luistert op Redis en streamt naar client
  - Channel naming: `teamreel:realtime:{channel_type}:{id}`
- **Event payload format**:
  ```json
  {
    "event": "content.status_changed",
    "data": {
      "content_id": 123,
      "old_status": "rendering",
      "new_status": "completed",
      "thumbnail_url": "...",
      "timestamp": "2026-03-18T14:30:00Z"
    }
  }
  ```
- **Connection management**:
  - Auth via JWT token in query param of header
  - Auto-reconnect: client-side retry met exponential backoff
  - Heartbeat: elke 30s een `:keepalive` comment sturen
  - Max connection duration: 1 uur, daarna graceful reconnect
- **Graceful degradation**:
  - Polling fallback: als SSE niet beschikbaar, polling elke 5s
  - Feature flag: `REALTIME_ENABLED` om SSE uit te schakelen
- **Railway deployment**:
  - SSE werkt op bestaande Gunicorn met `--threads` of async workers
  - Geen extra service nodig (wel Redis, die al draait)
- **Integration**: Redis (al op Railway), B34 (content generatie status), B62 (activity feed)

**Scope**: 🔧 **Backend Only** (Django SSE endpoint + Redis pub/sub + tests + README)

**API Endpoints**:
- `GET /api/v1/realtime/events/?channels=content.123,project.456` — SSE stream (EventSource)
- `GET /api/v1/realtime/status/` — Connection status + available channels
- `POST /api/v1/realtime/test-event/` — Stuur test-event (dev/debug only)

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B64-realtime-updates

[feature summary]
Server-Sent Events (SSE) for live content generation status, approvals, and team updates without page refresh. Redis pub/sub as transport layer.

[goals]
- SSE endpoint with JWT auth and Redis pub/sub subscriber
- Event channels: content status, project events, user notifications
- Redis publisher integration in Celery tasks (content generation pipeline)
- Heartbeat keepalive every 30s
- Auto-reconnect with exponential backoff (client guidance)
- Polling fallback with feature flag toggle
- Standardized event payload format

[non-goals]
- Bidirectional WebSocket (v2 upgrade path)
- Chat/messaging features
- Video streaming
- Client-to-server real-time data

[dependencies]
- Redis (already on Railway — used as pub/sub channel)
- B34 (content generation — primary event source)
- B62 (activity feed — event source)
- JWT auth (existing)

[scope]
Backend only — Django SSE endpoint, Redis pub/sub, pytest tests, README
Frontend EventSource integration via Roadmap #30 H5
```
