# B63: Push Notifications & PWA

**Priority:** ⏳ Later
**Phase:** 15
**Status:** 📋 ROADMAP
**Module ID:** 321
**Category:** Backend (TeamReel Product Feature)

## Description

## 304. B63 – Push Notifications & PWA

**Doel**: Web Push Notifications via VAPID zodat coaches en spelers herinneringen krijgen voor wedstrijden, content-goedkeuringen en teamupdates — zelfs als de app niet open staat.

**Waarom TeamReel**: Essentieel voor retentie — amateurclubs gebruiken de app sporadisch. Push notifications herinneren coaches tijdig aan wedstrijd-content en brengen spelers terug voor beschikbaarheid-bevestiging. PWA install maakt de app toegankelijk als "echte app" op het homescreen.

**Wat moet er gebeuren**:
- **PushSubscription model**:
  - Fields: user FK, endpoint (URL), p256dh (public key), auth (auth secret)
  - Metadata: browser, os, device_name, created_at, last_used_at
  - Unique constraint: (user, endpoint) — meerdere devices per user
  - Cleanup: subscriptions met delivery failure > 3x markeren als inactive
- **VAPID configuratie**:
  - VAPID keys genereren via `py_vapid`
  - Environment variables: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS_EMAIL`
  - Public key endpoint voor frontend Service Worker
- **Notification triggers (Celery tasks)**:
  - `send_match_reminder` — 2 uur vóór wedstrijd ("Heren 1 speelt over 2 uur vs Ajax")
  - `send_content_ready` — Wanneer content-generatie klaar is ("Je line-up video is klaar!")
  - `send_approval_request` — Wanneer content wacht op goedkeuring
  - `send_lineup_published` — Wanneer line-up gepubliceerd is naar spelers
  - `send_availability_reminder` — 24 uur voor deadline beschikbaarheid
- **Delivery service**:
  - `pywebpush` library voor Web Push Protocol
  - Retry logica: max 3 attempts met exponential backoff
  - Batch sending: meerdere users tegelijk (geen N+1)
  - Error handling: 410 Gone → subscription verwijderen, 429 → rate limit respecteren
- **Permission flow**:
  - Strategisch moment: na eerste content-generatie of na 2e bezoek (niet bij login)
  - Permission status tracking: granted, denied, default
  - User preferences: per notification type aan/uit (profiel instellingen)
- **PWA manifest**:
  - Service Worker push event handler
  - `beforeinstallprompt` event handling
  - Install banner: slim-bar na 2e bezoek, dismissable
  - Deep linking: notification click → specifieke pagina
- **Integration**: B17 (notification system), B62 (activity feed triggers), celery-beat (scheduled)

**Scope**: 🔧 **Backend Only** (Django app + REST API + Celery tasks + tests + README)
*PWA manifest en Service Worker vallen onder frontend (Roadmap #30)*

**API Endpoints**:
- `POST /api/v1/push/subscribe/` — Registreer push subscription (endpoint, keys)
- `DELETE /api/v1/push/unsubscribe/` — Verwijder subscription
- `GET /api/v1/push/vapid-key/` — Public VAPID key voor frontend
- `GET /api/v1/push/preferences/` — User notification preferences
- `PATCH /api/v1/push/preferences/` — Update preferences (per type aan/uit)
- `POST /api/v1/push/test/` — Stuur test-notificatie naar eigen devices (dev/debug)

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B63-push-notifications-and-pwa

[feature summary]
Web Push Notifications via VAPID for match reminders, content-ready alerts, approval requests, and lineup publications. Includes PWA install support backend.

[goals]
- PushSubscription model with multi-device support
- VAPID key management via environment variables
- 5+ Celery notification triggers: match reminder, content ready, approval, lineup, availability
- Delivery service with pywebpush, retry logic, batch sending
- Strategic permission flow (not at login, after first content)
- User preferences per notification type
- Public VAPID key endpoint for Service Worker

[non-goals]
- Native mobile app push (APNs/FCM) — web push only
- Email notification delivery (handled by B17)
- SMS notifications
- Service Worker implementation (frontend — Roadmap #30)

[dependencies]
- B17 (notification system — triggers)
- B62 (activity feed — event sources)
- Celery Beat (scheduled reminders)
- pywebpush + py_vapid libraries

[scope]
Backend only — Django app, REST API, Celery tasks, pytest tests, README
Frontend PWA/SW integration via Roadmap #30 H4
```
