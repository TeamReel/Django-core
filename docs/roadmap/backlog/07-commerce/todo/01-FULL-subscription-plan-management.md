# 353 — B76 — Subscription Plan Management

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend + Frontend (Core Revenue) |
| Impact | 🔴 critical |
| Effort | ~50 uur |

## Wat

Zelf-service abonnementbeheer: SubscriptionPlan model met plan-limieten (teams, members, generaties, storage), Subscription model per organisatie met status-tracking (trial/active/past_due/cancelled), UsageLimit enforcement middleware, pricing pagina met vergelijkingstabel, abonnement dashboard met verbruik vs limieten, en seed voor 3 standaard plannen.

## Waarom belangrijk

Zonder abonnementen is er geen verdienmodel. Het businessplan beschrijft drie segmenten: kleine club (€10-20/mnd), vereniging (€100-300/mnd), partners (op maat). Het credit systeem houdt verbruik bij, maar er is geen laag voor plannen, limieten en billing cycles. Dit is de basis van de revenue engine.

## Past in TeamReel / CoreApp

- **TeamReel**: Direct revenue. Plan-limieten sturen clubs naar hogere tiers: "Je hebt 5 teams maar je Starter plan ondersteunt er 3 — upgrade naar Club." Trial-naar-conversie tracking meetbaar maken.
- **CoreApp**: Subscription management is universeel voor elk SaaS-product met tiered pricing. Het model (plans + subscriptions + usage limits + enforcement) is het standaard SaaS-pattern.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B76-subscription-plan-management

We bouwen abonnement en planbeheer in Django 5 + DRF + React 18.

[feature summary]
Subscription plans met limieten, usage enforcement, pricing pagina, en abonnement dashboard.

[goals]
- SubscriptionPlan model: name, prices (monthly/yearly), limieten (teams, members, generations, storage), feature_flags
- Subscription model: org FK, plan FK, status (trial/active/past_due/cancelled/expired), billing cycle, period dates
- UsageLimit enforcement: middleware/decorator die limieten checkt bij generatie/team-aanmaak
- Graceful degradation: zachte limieten met waarschuwing, harde limieten blokkeren
- Maandelijks resettende usage counters per organisatie
- Pricing pagina /plans: vergelijkingstabel, huidige plan highlight, upgrade/downgrade
- Dashboard /settings/subscription: verbruik vs limieten, factuurhistorie, plan acties
- Seed: 3 plannen (Starter gratis/trial, Club €19/mnd, Vereniging €149/mnd)

[non-goals]
- Stripe/payment integratie (dat is B36)
- Invoice generatie
- Pro-rata berekeningen (plan wissel gaat in per volgende periode)
- Multi-currency

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Credits: bestaand credit systeem (src/credits/)
- Organisations: bestaand model (src/organisations/)
- Transactions: bestaand model (als aanwezig)
- Frontend: React 18, TypeScript, CSS Modules
- Tests: pytest + factory_boy (backend), Playwright (pricing flow)
```

### Plan

```
/spec-kitty.plan feature=B76-subscription-plan-management

[tech choices]
- Plan limieten: JSONField met schema validatie
- Usage counters: maandelijkse UsageCounter model (auto-reset via celery-beat)
- Enforcement: @check_subscription_limit decorator op ViewSet actions
- Graceful: soft_limit (80% waarschuwing) vs hard_limit (100% blokkade)
- Frontend: static pricing pagina + dynamic dashboard met react-query

[models]
- SubscriptionPlan: name, slug, description, price_monthly, price_yearly, limits (JSON), feature_flags (JSON), is_public, is_default, sort_order
- Subscription: org FK, plan FK, status (enum), billing_cycle (enum), current_period_start/end, trial_ends_at, stripe_subscription_id (nullable)
- UsageCounter: org FK, period (date, monthly), metric (enum: teams/members/generations/storage), current_value

[api endpoints]
- GET /api/v1/plans/ — beschikbare plannen
- GET /api/v1/subscription/ — huidige subscription + usage
- POST /api/v1/subscription/change-plan/ — up/downgrade
- POST /api/v1/subscription/cancel/ — opzeggen
- GET /api/v1/subscription/usage/ — verbruik detail

[frontend]
- demo/src/pages/PricingPage.tsx — vergelijkingstabel
- demo/src/pages/SubscriptionDashboard.tsx — verbruik + beheer
- demo/src/components/subscription/UsageBar.tsx — verbruik visualisatie
- demo/src/components/subscription/PlanCard.tsx — plan vergelijking

[files to create]
- src/subscriptions/ — nieuwe Django app
- src/subscriptions/enforcement.py — limit checking decorator/middleware
- src/subscriptions/tasks.py — usage counter reset
- demo/src/pages/PricingPage.tsx + .module.css
- demo/src/pages/SubscriptionDashboard.tsx + .module.css
- tests/test_subscriptions/
```

### Research

```
/spec-kitty.research feature=B76-subscription-plan-management

Onderzoek de volgende punten:

1. Hoe werkt het credit systeem? Check src/credits/ voor balance/usage tracking.
2. Welke limieten zijn er nu al? Zijn er max_teams of max_members velden op Organisation?
3. Bestaat er al een transactions/billing model? Check src/ voor payment-gerelateerde models.
4. Hoe worden organisaties aangemaakt? Is er een signup flow die een trial-plan moet toekennen?
5. Wat zijn de exacte plan-limieten uit het businessplan?
```
