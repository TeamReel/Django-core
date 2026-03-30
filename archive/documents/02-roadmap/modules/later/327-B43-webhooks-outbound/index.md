# B43: Webhooks Outbound

**Priority:** ❌ Te vroeg
**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 327
**Category:** Backend

## Description

## 283. B43 – Webhooks Outbound

**Doel**: Event-driven webhook system voor het pushen van events naar externe systemen.

**Waarom agnostisch**: Webhooks zijn essentieel voor integraties met Zapier, n8n, Make, custom systems.

**Wat moet er gebeuren**:
- **WebhookEndpoint model**:
  - Fields: url, secret, events (list), is_active, organisation/project FK
  - Headers: custom headers support
  - Authentication: HMAC signature, bearer token, basic auth
- **WebhookEvent model**:
  - Fields: endpoint FK, event_type, payload (JSON), status
  - Delivery tracking: attempts, last_attempt, next_retry
  - Response logging: status_code, response_body, duration_ms
- **Event types registry**:
  - Decorator-based event registration
  - Categories: content.*, user.*, payment.*, etc.
- **Delivery system**:
  - Async delivery via Celery
  - Retry with exponential backoff (max 5 attempts)
  - Dead letter queue for failed webhooks
- **Security**:
  - HMAC-SHA256 signature in header
  - Timestamp to prevent replay attacks
  - IP allowlist (optional)
- **Testing tools**:
  - Webhook delivery logs in admin
  - Manual retry button
  - Test ping endpoint
- **Integration**: B15 (Celery), B09 (audit), B18 (observability)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/webhooks/` - List webhook endpoints
- `POST /api/v1/webhooks/` - Create webhook endpoint
- `PATCH /api/v1/webhooks/{id}/` - Update endpoint
- `DELETE /api/v1/webhooks/{id}/` - Delete endpoint
- `POST /api/v1/webhooks/{id}/test/` - Send test ping
- `GET /api/v1/webhooks/{id}/deliveries/` - List delivery attempts

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B43-webhooks-outbound

[feature summary]
Event-driven webhook system for pushing events to external systems (Zapier, n8n, Make, custom).

[goals]
- WebhookEndpoint model with URL, secret, event subscription
- WebhookEvent delivery tracking with retry logic
- Decorator-based event type registry
- Async delivery via Celery with exponential backoff
- HMAC-SHA256 signature security
- Admin tools: delivery logs, manual retry, test ping

[non-goals]
- Inbound webhooks (receiving from external systems)
- GraphQL subscriptions
- WebSocket-based event streaming

[dependencies]
- B15 (Celery for async delivery)
- B09 (audit logging)
- B18 (observability for delivery metrics)

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```

## Notes
<!-- Add progress notes here -->

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
