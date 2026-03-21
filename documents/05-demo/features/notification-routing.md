# Notification Routing System

> Last updated: 2026-03-12

## Overview

Twee apps, gescheiden verantwoordelijkheid:

| App | Laag | Doel |
|-----|------|------|
| `contextual_notifications` | **Routing** | Event → routing rules → preferences → suppression → handoff |
| `notifications` | **Delivery** | Notification records → kanaal dispatch → retry → audit |

**Pipeline:** Domain event → B17 routing → B16 delivery → gebruiker.

---

## Data Model

### notifications (4 models — Delivery)

**Notification** — Core notification entity (één per delivery per kanaal).

| Veld | Type | Doel |
|------|------|------|
| `type` | FK → NotificationType | Categorie |
| `channel` | choices | `email`, `in_app`, `webhook` |
| `recipient` | str | Email of user ID |
| `recipient_user` | FK → User | Nullable |
| `payload` | JSON | Titel, body, metadata |
| `status` | choices | `pending → sent / failed` |
| `read_at` | datetime | In-app gelezen status |

Custom QuerySet: `.pending()`, `.sent()`, `.failed()`, `.for_user()`, `.unread()`, `.by_type()`, `.by_channel()`.

**NotificationType** — Categorieën (bijv. `password_reset`, `system_event`, `default`).

**RetryPolicy** — Configureerbare retry per type.

| Veld | Default | Doel |
|------|---------|------|
| `max_attempts` | 3 | 1–20 pogingen |
| `retry_window_seconds` | 3600 | Max window voor alle retries |
| `backoff_strategy` | exponential | `exponential` of `linear` |
| `backoff_multiplier` | 5.0 | Exponentiële factor |
| `initial_delay_seconds` | 60 | Eerste retry delay |

**DeliveryAttempt** — Audit trail per poging (outcome, HTTP/SMTP status, duration_ms).

### contextual_notifications (3 models — Routing)

**RoutingRule** — Welke events → welke rollen → welk kanaal.

| Veld | Type | Doel |
|------|------|------|
| `event_type` | str | Geïndexeerd patroon |
| `scope` | choices | `global`, `org`, `project` |
| `target_role` | str | Rol-gebaseerde targeting |
| `priority` | 0–3 | low / normal / high / urgent |
| `channel` | choices | `in_app`, `email`, `push` |
| `is_enabled` | bool | Aan/uit |

**NotificationPreference** — Per-user opt-out (unique per user + event_type + channel). Afwezigheid = enabled.

**OrganisationNotificationPolicy** — Org-level quiet hours + rate limiting.

| Veld | Type | Doel |
|------|------|------|
| `quiet_hours_enabled` | bool | |
| `quiet_hours_start/end` | TimeField | Timezone-aware |
| `quiet_hours_rate_limit` | int | Max per minuut (default 10) |

---

## Event → Routing → Delivery Pipeline

```
Domain Code
  │
  ▼
EventService.emit_event(event_type, context, payload)
  │ ← Validatie (<5ms), queued naar Celery
  ▼
route_event_task (Celery, autoretry max 3)
  │
  ├─ 1. RoutingService.route_event()
  │     └─ Query RoutingRules (project → org → global scope, priority ordered)
  │     └─ Resolve target users via RoleAssignment
  │     └─ Returns: [(user_id, channel)]
  │
  ├─ 2. PreferenceService.check_preferences()
  │     └─ Bulk query NotificationPreference voor opt-outs
  │     └─ Verwijdert disabled (user, event_type, channel)
  │
  ├─ 3. PolicyService.should_deliver_now()
  │     └─ Quiet hours detectie (timezone-aware)
  │     └─ Rate limiting via Redis (per-minuut bucket)
  │
  ├─ 4. SuppressionService.check_suppression()
  │     └─ Redis SETNX dedup (key: user+event+resource+channel, TTL: 5 min)
  │     └─ Fails open (Redis down → notification gaat door)
  │
  ├─ 5. NotificationHandoffService.dispatch_to_b16()
  │     └─ Maakt Notification records (één per user+channel)
  │     └─ Push channel → fallback naar in_app
  │
  └─ AuditService.log_routing_decision()
        └─ Schrijft naar AuditEvent met volledige besluittrail

──── B17/B16 grens ────

B16 Delivery (Celery tasks):
  ├─ deliver_email_notification → Django send_mail via SMTP
  │   └─ DeliveryAttempt per poging
  │   └─ RetryService berekent backoff
  │
  ├─ InAppChannel.send() → synchrone status update
  │
  └─ WebhookChannel.send() → HTTP POST met HMAC-SHA256 signature
      └─ 2xx=success, 5xx=transient retry, 4xx=permanent fail
```

---

## Service Architecture

### Routing (contextual_notifications — 7 services)

| Service | Doel |
|---------|------|
| **EventService** | Public API entry point. Valideert event, queued naar Celery |
| **RoutingService** | Query RoutingRules per scope hiërarchie, resolve users via RoleAssignment |
| **PreferenceService** | Bulk opt-out check. API voor user preferences beheer |
| **SuppressionService** | Redis dedup (SETNX, TTL 300s). Fails open bij Redis errors |
| **PolicyService** | Quiet hours (timezone-aware) + rate limiting (Redis INCR per-minuut) |
| **NotificationHandoffService** | Bridge naar B16: maakt Notification records per (user, channel) |
| **AuditService** | Schrijft routing-besluit metadata naar AuditEvent |

### Delivery (notifications — 5 services)

| Service | Doel |
|---------|------|
| **notification_service** | Helper functies: `notify_project_created()`, `notify_member_role_changed()` |
| **RetryService** | Backoff berekening (exponential/linear), window check |
| **TemplateService** | Email templates renderen via Django template engine |
| **NotificationAuditService** | Lifecycle logging (created/sent/failed/read). PII hashing (SHA-256) |
| **WebhookSignatureService** | HMAC-SHA256 signing + verificatie (5-min replay prevention) |

---

## API Endpoints

### notifications (B16)

| Methode | Endpoint | Doel |
|---------|----------|------|
| GET | `/notifications/` | Lijst (filterable: status, channel, type, datum) |
| GET/PATCH | `/user-notifications/` | User's in-app notificaties (read/unread) |
| POST | `/user-notifications/mark-all-read/` | Alles gelezen markeren |
| GET | `/notifications/health/` | SMTP + Celery health check |

### contextual_notifications (B17)

| Methode | Endpoint | Doel |
|---------|----------|------|
| CRUD | `/routing-rules/` | Routing rules beheren |
| CRUD | `/preferences/` | User notification preferences |
| GET | `/routing-logs/` | Audit logs (read-only) |
| GET | `/org-policies/organization/{id}/` | Org notification policy |

---

## Gerelateerde docs

- [workflow-engine.md](workflow-engine.md) — Workflows triggeren notificaties bij state changes
- [architecture.md](../architecture.md) — App overzicht
