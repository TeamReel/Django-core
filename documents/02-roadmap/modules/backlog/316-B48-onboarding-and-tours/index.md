# B48: Onboarding & Tours

**Priority:** 🔥 Bouwen
**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 316
**Category:** Backend

## Description

## 288. B48 – Onboarding & Tours

**Doel**: First-time user experience met guided tours, checklists, en progressive disclosure.

**Waarom agnostisch**: User onboarding is universeel - reduces churn, improves activation.

**Wat moet er gebeuren**:
- **OnboardingFlow model**:
  - Fields: name, slug, steps (JSON), target_audience
  - Conditions: trigger_on (signup, first_login, role_change)
  - Status: is_active, priority
- **OnboardingStep model**:
  - Fields: flow FK, order, title, content, action_type
  - Action types: tooltip, modal, highlight, redirect
  - Target: CSS selector or route path
  - Completion: auto (action taken) or manual (dismiss)
- **UserOnboardingProgress model**:
  - Fields: user FK, flow FK, current_step, completed_steps (JSON)
  - Status: in_progress, completed, skipped
  - Timestamps: started_at, completed_at
- **Checklist system**:
  - Onboarding checklist items (e.g., "Complete profile", "Create first project")
  - Progress percentage
  - Rewards/badges on completion (optional)
- **Feature tours**:
  - Triggered on new feature release
  - "What's new" modal or guided tour
  - Dismissable, remembers state
- **A/B testing ready**:
  - Multiple flows per trigger
  - Random assignment
  - Completion rate tracking
- **Integration**: B10 (feature flags), B49 (analytics), B17 (notifications)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `GET /api/v1/onboarding/active/` - Get active flows for current user
- `GET /api/v1/onboarding/flows/{slug}/` - Get flow details
- `POST /api/v1/onboarding/flows/{slug}/start/` - Start flow
- `POST /api/v1/onboarding/flows/{slug}/step/{n}/complete/` - Complete step
- `POST /api/v1/onboarding/flows/{slug}/skip/` - Skip flow
- `GET /api/v1/onboarding/checklist/` - Get onboarding checklist

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B48-onboarding-and-tours

[feature summary]
First-time user experience with guided tours, checklists, and progressive disclosure.

[goals]
- OnboardingFlow model with steps, triggers, target audience
- OnboardingStep with action types: tooltip, modal, highlight, redirect
- UserOnboardingProgress tracking per user/flow
- Checklist system with progress percentage
- Feature tours for new releases
- A/B testing ready (multiple flows per trigger)

[non-goals]
- Interactive tutorials with code execution
- Video-based onboarding
- Gamification/rewards system

[dependencies]
- B10 (feature flags for flow targeting)
- B49 (analytics for completion tracking)
- B17 (notifications for reminders)

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
