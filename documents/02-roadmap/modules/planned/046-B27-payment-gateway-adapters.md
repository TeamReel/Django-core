# Fase 12: Workflows & Payments

## 46. B27 – Payment Gateway Adapters

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
- **Integration**: B09 (audit), B11 (credits), B29 (receipts)

**Demo Requirements**:
- 💳 **Payment Page** (`/demo/payments`):
  - Credit packages (100/500/1000 credits, €10/€40/€80)
  - Stripe Elements card input (test mode: 4242 4242 4242 4242)
  - Payment button (intent → capture)
  - Success/error messages
  - Transaction history
  - Receipt download (PDF)
  - Tests: select package → enter test card → pay → verify credits

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B27-payment-gateway-adapters

[feature summary]
Multi-gateway payment integration (Stripe, PayPal) with webhook handling.

[goals]
- Payment gateway adapter pattern
- Stripe integration (primary)
- PayPal integration (optional)
- Webhook handling + signature verification
- Credit purchase flow (B11)

[demo requirements]
Demo page: /demo/payments
- Credit packages
- Stripe Elements card input
- Payment flow
- Transaction history
- Receipt download
- Tests: purchase → verify payment → check balance
```
