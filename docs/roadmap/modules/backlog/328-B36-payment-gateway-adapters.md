# 328 — B36 — Payment Gateway Adapters

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (Revenue) |
| Impact | 🟢 nice-to-have (te vroeg) |
| Effort | ~35 uur |

## Wat

Multi-gateway payment integratie met adapter pattern: Stripe (primair), PayPal en Mollie (toekomst). Payment Intents API, webhook handling met signature verification, idempotency, Customer management, en credit purchase flow gekoppeld aan het bestaande credit systeem.

## Waarom belangrijk

Zonder betaling is er geen revenue. Het credit systeem bestaat al, maar er is geen manier om credits te kopen. Stripe is de standaard voor SaaS-betalingen in Europa. Het adapter pattern maakt het mogelijk om later Mollie (populair in NL) of PayPal toe te voegen zonder refactoring.

## Past in TeamReel / CoreApp

- **TeamReel**: Het businessplan beschrijft drie segmenten met maandelijkse prijzen. Credits worden nu handmatig toegekend — payment gateway maakt self-service mogelijk. Mollie-ondersteuning is belangrijk voor de Nederlandse markt (iDEAL).
- **CoreApp**: Payment gateway met adapter pattern is herbruikbaar. Het Stripe-integratie pattern (webhook, idempotency, retry) is industriestandaard.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B36-payment-gateway-adapters

We bouwen payment gateway integratie in de Django 5 + DRF backend.

[feature summary]
Multi-gateway payment met Stripe (primair), webhook handling, credit purchase flow, en adapter pattern voor toekomstige gateways.

[goals]
- Payment gateway adapter pattern: BasePaymentGateway abstract class
- Stripe integratie: Payment Intents API, Elements, Customer management
- Webhook handling: signature verification, idempotency keys
- Transaction model: gateway, transaction_id, amount, currency, status
- Credit purchase flow: package selectie → betaling → credit toevoeging
- Refund support: gedeeltelijk en volledig

[non-goals]
- Subscription billing (dat is B76)
- Invoice generatie (simpele receipts wel)
- Multi-currency support (EUR only voor nu)
- PayPal/Mollie implementatie (alleen interface, later invullen)

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Credits: bestaand credit systeem (src/credits/)
- Stripe: stripe Python SDK
- Webhooks: endpoint met signature verification
- Tests: pytest + stripe mock/test mode
```

### Plan

```
/spec-kitty.plan feature=B36-payment-gateway-adapters

[tech choices]
- Adapter: BasePaymentGateway ABC met create_payment, capture, refund, handle_webhook
- Stripe: stripe Python SDK (officieel, goed getest)
- Webhooks: Django view met stripe.Webhook.construct_event (signature check)
- Idempotency: idempotency_key in Stripe API calls + dedup in webhook handler
- Transactions: immutable Transaction model (log, nooit wijzigen)
- Settings: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET als env vars

[models]
- Transaction: user FK, org FK, gateway (enum), transaction_id, amount, currency, status (pending/completed/failed/refunded), metadata (JSON)
- PaymentPackage: name, credits_amount, price_cents, currency, is_active

[api endpoints]
- GET /api/v1/payments/packages/ — beschikbare credit packages
- POST /api/v1/payments/create-intent/ — Stripe PaymentIntent aanmaken
- POST /api/v1/payments/webhook/ — Stripe webhook endpoint
- GET /api/v1/payments/transactions/ — transactie geschiedenis

[files to create]
- src/payments/ — nieuwe Django app
- src/payments/gateways/ — adapter per gateway
- src/payments/webhooks.py — webhook handler
- tests/test_payments/
```

### Research

```
/spec-kitty.research feature=B36-payment-gateway-adapters

Onderzoek de volgende punten:

1. Hoe werkt het bestaande credit systeem? Check src/credits/ voor modellen en logica.
2. Welke transaction-achtige models bestaan er al? Check src/ voor Transaction of Payment models.
3. Is Stripe al geconfigureerd als dependency of environment variable?
4. Hoe worden webhooks afgehandeld in het project? Is er al een webhook endpoint pattern?
5. Wat zijn de typische credit packages/prijzen volgens het businessplan?
```
