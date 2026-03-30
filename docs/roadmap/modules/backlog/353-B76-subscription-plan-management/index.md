# B76: Abonnement & Planbeheer

**Priority:** 🔥 Bouwen
**Phase:** —
**Status:** 📋 ROADMAP
**Module ID:** 353
**Category:** Backend + Frontend (Core Revenue)

## Description

## 353. B76 – Abonnement & Planbeheer

**Doel**: Zelf-service abonnementbeheer waarmee clubs een plan kiezen, upgraden/downgraden, en hun factuurhistorie bekijken. Het verdienmodel van TeamReel draait hierop.

**Waarom TeamReel**: Het businessplan beschrijft drie segmenten (kleine club €10-20/mnd, vereniging €100-300/mnd, partners op maat). Het bestaande credit-systeem (`credits` app) houdt verbruik bij, maar er is geen laag voor abonnementen, plan-limieten en recurring billing.

**Wat moet er gebeuren**:

### SubscriptionPlan Model
- **SubscriptionPlan model**:
  - Fields: name, slug, description, price_monthly, price_yearly
  - Limieten: max_teams, max_members, max_generations_per_month, max_storage_gb
  - Features: feature_flags (JSONField) — welke features beschikbaar zijn per plan
  - Zichtbaarheid: is_public, is_default, sort_order

### Subscription Model
- **Subscription model**:
  - Fields: organisation FK, plan FK, status (trial/active/past_due/cancelled/expired)
  - Billing: billing_cycle (monthly/yearly), current_period_start, current_period_end
  - Payment: stripe_subscription_id (nullable — voor B36 Payment Gateway koppeling)
  - Trial: trial_ends_at, converted_at

### UsageLimit Enforcement
- **Middleware/decorator** die bij elke generatie checkt:
  - Aantal generaties deze maand vs plan limiet
  - Aantal teams vs plan limiet
  - Storage gebruikt vs plan limiet
- **Graceful degradation**: zachte limieten met waarschuwing, harde limieten blokkeren
- **Usage counters**: maandelijks resettende tellers per organisatie

### Plan Selectie UI
- **Pricing pagina**: `/plans`
  - Vergelijkingstabel van alle plannen
  - Huidige plan highlight
  - Upgrade/downgrade knoppen
- **Checkout flow**: plan kiezen → bevestigen → (later: betaling via B36)
- **Trial banner**: "Je hebt nog X dagen proefperiode"

### Abonnement Dashboard
- **Abonnementpagina**: `/settings/subscription`
  - Huidig plan, status, volgende factuurdatum
  - Verbruik vs limieten (progress bars)
  - Factuurhistorie (koppeling met `transactions` app)
  - Upgrade/downgrade/annuleren acties

### Seed Data
- 3 standaard plannen: Starter (gratis/trial), Club (€19/mnd), Vereniging (€149/mnd)
- Feature matrix in seed

### Afhankelijkheden
- `credits` app (bestaand — usage tracking)
- `transactions` app (bestaand — factuur log)
- `organisations` app (Subscription koppelt aan Organisation)
- B36 Payment Gateway Adapters (toekomst — nu handmatig/trial)

### Scope & Effort
- **Effort**: ~50 uur
- **Lagen**: Backend models + middleware, Frontend pricing + dashboard, Seed data
- **Risico**: Plan-wisselingen mid-cycle → pro-rata berekening complexiteit. Start eenvoudig: wissel gaat in per volgende periode.
