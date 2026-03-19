# B36: Payment Gateway Adapters

**Priority:** ❌ Te vroeg
**Phase:** 12
**Status:** 📋 ROADMAP
**Module ID:** 328
**Category:** Backend

## Description

## 326. B36 – Payment Gateway Adapters

**Doel**: Multi-gateway payment integration (Stripe first, PayPal adapter) met webhook handling.

**Waarom agnostisch**: Payment processing is universeel - subscriptions, credits purchase, invoicing.

**Wat moet er gebeuren**:
- **Payment gateway adapter pattern**: Interface met multiple implementations
  - Implementations: StripeGateway, PayPalGateway, MollieGateway (future)
  - Methods: create_payment_intent, capture_payment, refund_payment
- **Stripe integration** (primary):
  - Stripe Elements (card input)
  - Payment Intents API
  - Webhook handling (success, failure, refund)
  - Customer management
- **PayPal integration** (optional):
  - PayPal SDK
  - Express Checkout
- **Transaction model**: Payment metadata storage
  - Fields: gateway, transaction_id, amount, currency, status
  - Foreign keys: user, organisation
- **Webhook security**: Signature verification, idempotency
- **Credit purchase flow**: Package selection → payment → credit addition (B11)
- **Integration**: B09 (audit), B11 (credits), B38 (receipts)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B36-payment-gateway-adapters

[feature summary]
Multi-gateway payment integration (Stripe, PayPal) with webhook handling.

[goals]
- Payment gateway adapter pattern
- Stripe integration (primary)
- PayPal integration (optional)
- Webhook handling + signature verification
- Credit purchase flow (B11)

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
