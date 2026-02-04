# B43: Webhooks Outbound

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 283
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

## Notes
<!-- Add progress notes here -->
