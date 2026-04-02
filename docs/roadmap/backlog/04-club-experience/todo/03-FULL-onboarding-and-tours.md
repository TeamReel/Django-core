# 316 — B48 — Onboarding & Tours

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (User Experience) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

First-time user experience met guided tours, onboarding checklists, en progressive disclosure. OnboardingFlow model met stappen (tooltip, modal, highlight, redirect), progress tracking per user, completion checklists ("Profiel compleet", "Eerste project aangemaakt"), en A/B testing support voor meerdere flows.

## Waarom belangrijk

De grootste churn bij SaaS-producten is in de eerste 7 dagen. Een clubvrijwilliger die niet begrijpt waar te beginnen, haakt af. Guided onboarding verlaagt de drempel: "Stap 1: Upload je clublogo, Stap 2: Maak je eerste team aan." Completion checklists geven een gevoel van progressie.

## Past in TeamReel / CoreApp

- **TeamReel**: Een nieuwe club moet: logo uploaden, kleuren instellen, teams aanmaken, leden toevoegen, eerste content genereren. Zonder begeleiding duurt dit 30 minuten en haken mensen af. Met onboarding tours: 5 minuten en een gevoel van succes.
- **CoreApp**: Onboarding is universeel — elk multi-user product profiteert van guided tours en checklists. Het model (flows, steps, progress) is herbruikbaar.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B48-onboarding-and-tours

We bouwen een onboarding systeem in de Django 5 + DRF backend.

[feature summary]
Backend voor guided onboarding flows, checklists, en progressive disclosure met A/B testing support.

[goals]
- OnboardingFlow model: name, steps (JSON), trigger_on (signup, first_login, role_change)
- OnboardingStep: order, title, content, action_type (tooltip, modal, highlight, redirect)
- UserOnboardingProgress: tracking per user per flow (current_step, completed_steps)
- Checklist systeem met progress percentage
- Feature tours voor nieuwe features ("What's new")
- A/B testing ready: meerdere flows per trigger met random assignment

[non-goals]
- Interactive tutorials met code execution
- Video-based onboarding
- Gamification/rewards systeem

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Auth: bestaand user model (src/accounts/)
- Notifications: bestaand of toekomstig B17
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B48-onboarding-and-tours

[tech choices]
- Models: OnboardingFlow, OnboardingStep, UserOnboardingProgress
- Step types: enum (tooltip, modal, highlight, redirect)
- Flow targeting: JSON conditions (new_user, role=coach, etc.)
- A/B: random flow assignment, stored in UserOnboardingProgress
- Admin: Django Admin voor flow management
- Cache: Redis voor active flows (weinig flows, vaak gelezen)

[models]
- OnboardingFlow: name, slug, steps config, trigger_on, is_active, priority
- OnboardingStep: flow FK, order, title, content, action_type, target_selector, completion_type
- UserOnboardingProgress: user FK, flow FK, current_step, completed_steps (JSON), status, timestamps

[api endpoints]
- GET /api/v1/onboarding/active/ — actieve flows voor huidige user
- GET /api/v1/onboarding/flows/{slug}/ — flow details met steps
- POST /api/v1/onboarding/flows/{slug}/start/ — start flow
- POST /api/v1/onboarding/flows/{slug}/step/{n}/complete/ — stap afronden
- POST /api/v1/onboarding/flows/{slug}/skip/ — flow overslaan
- GET /api/v1/onboarding/checklist/ — onboarding checklist status

[files to create]
- src/onboarding/ — nieuwe Django app
- tests/test_onboarding/
```

### Research

```
/spec-kitty.research feature=B48-onboarding-and-tours

Onderzoek de volgende punten:

1. Is er al een onboarding flow in de frontend? Check demo/src/ voor wizard/onboarding patterns.
2. Welke "eerste stappen" moet een nieuwe club doorlopen? Wat is het huidige signup-to-value pad?
3. Zijn er feature flags (B10) beschikbaar voor flow targeting?
4. Welke user model velden zijn relevant (date_joined, last_login, profile completeness)?
5. Hoe worden notificaties nu afgehandeld? Is B17 beschikbaar?
```
