# 321 — B63 — Push Notifications & PWA

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (TeamReel Product Feature) |
| Impact | 🔴 critical |
| Effort | ~30 uur |

## Wat

Web Push Notifications via VAPID zodat coaches en spelers herinneringen krijgen voor wedstrijden, content-goedkeuringen en teamupdates — zelfs als de app niet open staat. PushSubscription model met multi-device support, VAPID key management, 5+ Celery notification triggers, delivery service met pywebpush, en user preferences per notification type.

## Waarom belangrijk

Retentie is de grootste uitdaging voor SaaS-producten gericht op vrijwilligers. Clubvrijwilligers openen de app sporadisch — pas als er een wedstrijd is. Push notifications herinneren coaches tijdig: "Heren 1 speelt over 2 uur — line-up nog niet ingevuld." Zonder push notifications is TeamReel afhankelijk van email (wordt genegeerd) of handmatige actie (wordt vergeten).

## Past in TeamReel / CoreApp

- **TeamReel**: Essentieel voor retentie. Match reminders, content-ready alerts, approval requests, beschikbaarheids-deadlines — allemaal tijdkritische meldingen die push notifications vereisen.
- **CoreApp**: Push notifications (VAPID/Web Push) is een standaard web capability. Het pattern (subscription management, delivery service, preference per type) is herbruikbaar voor elk product.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B63-push-notifications-and-pwa

We bouwen Web Push Notifications backend in Django 5 + DRF.

[feature summary]
VAPID-based Web Push backend met subscription management, notification triggers, delivery service, en user preferences.

[goals]
- PushSubscription model: user FK, endpoint, p256dh, auth, multi-device support
- VAPID key management via environment variables
- 5+ Celery triggers: match_reminder (2u voor), content_ready, approval_request, lineup_published, availability_reminder
- Delivery service: pywebpush, retry logic (max 3, exponential backoff), batch sending
- Permission flow: strategisch moment (na eerste content, niet bij login)
- User preferences: per notification type aan/uit
- Cleanup: inactive subscriptions na 3+ delivery failures

[non-goals]
- Native mobile push (APNs/FCM) — web push only
- Email delivery (dat is B17)
- SMS notifications
- Service Worker implementatie (frontend concern)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery, celery-beat
- Libraries: pywebpush, py_vapid
- Notifications: B17 (als beschikbaar) voor event sources
- Activities: bestaand Activity model voor wedstrijddata
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B63-push-notifications-and-pwa

[tech choices]
- VAPID: py_vapid voor key generation, pywebpush voor delivery
- Storage: PushSubscription model met encrypted keys (django-fernet-fields of similar)
- Triggers: Celery tasks per notification type
- Scheduling: celery-beat voor match reminders (check upcoming matches)
- Batch: verzamel subscriptions per notification, stuur in bulk
- Error handling: 410 Gone → delete subscription, 429 → respecteer rate limit

[models]
- PushSubscription: user FK, endpoint, p256dh, auth, browser, os, is_active, last_used_at, failure_count
- PushPreference: user FK, notification_type (enum), is_enabled (bool)

[api endpoints]
- POST /api/v1/push/subscribe/ — registreer subscription
- DELETE /api/v1/push/unsubscribe/ — verwijder subscription
- GET /api/v1/push/vapid-key/ — public VAPID key
- GET/PATCH /api/v1/push/preferences/ — notification voorkeuren
- POST /api/v1/push/test/ — test-notificatie (dev only)

[files to create]
- src/push_notifications/ — nieuwe Django app
- src/push_notifications/tasks.py — Celery triggers
- src/push_notifications/delivery.py — WebPush delivery service
- tests/test_push_notifications/
```

### Research

```
/spec-kitty.research feature=B63-push-notifications-and-pwa

Onderzoek de volgende punten:

1. Welke notification-achtige functionaliteit bestaat er al? Check src/ voor notification models/signals.
2. Hoe werkt celery-beat in het project? Check de configuratie (settings, schedule).
3. Welke Activity model velden zijn relevant voor match reminders (datum, status, team)?
4. Is er al een Service Worker in de frontend (demo/public/)?
5. Hoe worden secrets/environment variables beheerd? Check settings.py voor env var patterns.
```
