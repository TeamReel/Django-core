# Django Core-App — Complete Modular Overview

Deze pagina bevat:
- De volledige moduleplanning
- Per module: doel, waarom agnostisch, wat moet er gebeuren
- Een kant-en-klare `/spec-kitty.specify` prompt voor elke module

---

# 1. Core Project Skeleton
**Doel:** Basale Django projectstructuur, settingslagen, CI.
**Waarom agnostisch:** Pure infrastructuur.

### Wat moet er gebeuren
- Folderstructuur neerzetten
- Base/settings/dev/prod configuratie
- Environments + secrets pattern
- CI setup (pytest, ruff, mypy)

### Specify Prompt
```
/spec-kitty.specify feature=001-core-project-skeleton

[feature summary]
Define a production-ready Django project skeleton with environment-based settings, CI configuration, and a clean modular structure.

[goals and non-goals]
Provide a reusable, domain-agnostic foundation; no domain logic.

[key user stories]
- As a developer, I can start a new Django app with minimal setup.

[constraints and assumptions]
Django 5.x, Python 3.12, CI with GitHub Actions.
```

---

# 2. Constitutional Enforcement Engine
**Doel:** Handhaven van SDD-principes, required files, quality gates.
**Waarom agnostisch:** Gaat over proces, niet over domein.

### Wat moet er gebeuren
- Rule engine
- Validators voor projectstructuur
- CI-integratie
- Configuratiebestand

### Specify Prompt
```
/spec-kitty.specify feature=002-constitutional-enforcement-engine

[feature summary]
Define a rule-based engine enforcing Spec Kitty workflow and architectural principles.

[goals and non-goals]
Goals: rule engine, validators, CI integration.
Non-goals: domain-specific rules.

[key user stories]
- As a maintainer, I want consistent project quality.

[constraints and assumptions]
Python-only, plug-in architecture.
```

---

# 3. Core Security Baseline
**Doel:** Hardened settings, secure cookies, CSRF, headers, brute-force bescherming.
**Waarom agnostisch:** Security is universeel.

### Wat moet er gebeuren
- SECURITY settings
- CSRF + session hardening
- Django SECURE_* flags
- Django-axes of custom brute-force bescherming

### Specify Prompt
```
/spec-kitty.specify feature=010-core-security-baseline

[feature summary]
Create a security baseline including hardened settings and brute-force protection.

[goals and non-goals]
Goals: secure defaults, reusable security patterns.

[key user stories]
- As a developer, I rely on secure defaults without custom code.

[constraints and assumptions]
Django 5.x, no domain logic.
```

---

# 4. Core Accounts
**Doel:** Custom user model + auth flows.
**Waarom agnostisch:** Gebruikers bestaan in elke app.

### Wat moet er gebeuren
- Custom User model
- Permissions baseline
- Login/logout/reset endpoints/templates

### Specify Prompt
```
/spec-kitty.specify feature=011-core-accounts

[feature summary]
Define a generic accounts module with a custom user model and authentication flows.

[goals and non-goals]
Goals: generic identity.
Non-goals: domain roles.

[key user stories]
- As a user, I can authenticate securely.

[constraints and assumptions]
Must integrate with security baseline.
```

---

# 5. Core Internationalisation (i18n/l10n)
**Doel:** Meertaligheid, tijdzones, formatting.
**Waarom agnostisch:** Taal is infrastructuur.

### Wat moet er gebeuren
- gettext activatie
- Locale middleware
- Timezone defaults
- Formatting configuratie

### Specify Prompt
```
/spec-kitty.specify feature=012-core-internationalisation

[feature summary]
Provide multi-language and localisation support for the Core-App.

[goals and non-goals]
Goals: i18n, l10n, formatting.

[key user stories]
- As a user, I can use the platform in my preferred language.

[constraints and assumptions]
No domain text content.
```

---

# 6. Organisations
**Doel:** Organisatiemodel + membership.
**Waarom agnostisch:** Universeel patroon.

### Wat moet er gebeuren
- Organisation model
- Membership model
- Admin + API endpoints

### Specify Prompt
```
/spec-kitty.specify feature=020-core-organisations

[feature summary]
Define a generic organisation model with membership relations.

[goals and non-goals]
Goals: multi-tenant base.

[key user stories]
- As an organisation admin, I manage members.

[constraints and assumptions]
No product-specific fields.
```

---

# 7. Projects / Workspaces
**Doel:** Contextcontainer voor data.
**Waarom agnostisch:** Breed inzetbaar.

### Wat moet er gebeuren
- Project model
- Link met organisation + users

### Specify Prompt
```
/spec-kitty.specify feature=021-core-projects

[feature summary]
Create a project/workspace model for multi-context environments.

[goals and non-goals]
Goals: reusable context unit.

[key user stories]
- As a user, I can work in the correct project context.

[constraints and assumptions]
Must integrate with organisations.
```

---

# 8. Audit Logging
**Doel:** Loggen van belangrijke acties.
**Waarom agnostisch:** Audit is infra.

### Wat moet er gebeuren
- Audit model
- Logging hooks (signals)
- API endpoints voor audit retrieval

### Specify Prompt
```
/spec-kitty.specify feature=030-core-audit-logging

[feature summary]
Provide a structured audit logging system.

[goals and non-goals]
Goals: track critical changes.

[key user stories]
- As an auditor, I can review important actions.

[constraints and assumptions]
Low performance impact.
```

---

# 9. Settings & Feature Flags
**Doel:** Configuratie op platformniveau.
**Waarom agnostisch:** Elke app heeft toggles.

### Wat moet er gebeuren
- Global + per-org settings
- FeatureFlag model
- Toggle middleware/hooks

### Specify Prompt
```
/spec-kitty.specify feature=031-core-settings-and-feature-flags

[feature summary]
Define a settings and feature-flag infrastructure for the Core-App.

[goals and non-goals]
Goals: dynamic config, no code changes required.

[key user stories]
- As an admin, I can enable features safely.

[constraints and assumptions]
No app-specific settings.
```

---

# 10. API Baseline (DRF)
**Doel:** Standaard API patterns + API throttling.
**Waarom agnostisch:** API structuur is generiek.

### Wat moet er gebeuren
- API root
- Pagination, error-handling
- Throttling policies

### Specify Prompt
```
/spec-kitty.specify feature=040-core-api-baseline

[feature summary]
Define the API baseline including authentication, pagination, errors, and API throttling.

[goals and non-goals]
Goals: reusable API foundation.

[key user stories]
- As a client, I get predictable API behaviour.

[constraints and assumptions]
DRF-based.
```

---

# 11. Web-UI Baseline
**Doel:** Templates, layout, navigatie.
**Waarom agnostisch:** UI basis zonder branding.

### Wat moet er gebeuren
- Base templates
- Layout components
- Static structure

### Specify Prompt
```
/spec-kitty.specify feature=041-core-web-ui-baseline

[feature summary]
Define the template and layout baseline for the Core-App.

[goals and non-goals]
Goals: consistent UI foundation.

[key user stories]
- As a user, I navigate consistently.

[constraints and assumptions]
No branding.
```

---

# 12. Tasks & Scheduling
**Doel:** Celery + Redis.
**Waarom agnostisch:** Taken bestaan overal.

### Wat moet er gebeuren
- Celery configuratie
- Periodieke job setup

### Specify Prompt
```
/spec-kitty.specify feature=050-core-tasks-and-scheduling

[feature summary]
Enable task execution and scheduling via Celery.

[goals and non-goals]
Goals: async execution.

[key user stories]
- As a developer, I run jobs asynchronously.

[constraints and assumptions]
Requires Redis.
```

---

# 13. Notifications / Messaging Baseline
**Doel:** E-mail/push/notifications.
**Waarom agnostisch:** Communicatie-infra is generiek.

### Wat moet er gebeuren
- Notification model
- Email backend
- Template system
- Celery integratie

### Specify Prompt
```
/spec-kitty.specify feature=051-core-notifications

[feature summary]
Define a messaging framework for email and notifications.

[goals and non-goals]
Goals: reusable messaging infra.

[key user stories]
- As a user, I receive system notifications.

[constraints and assumptions]
Uses tasks module.
```

---

# 14. Observability
**Doel:** Logging, health endpoints, metrics.
**Waarom agnostisch:** Monitoring is infra.

### Wat moet er gebeuren
- Health endpoints
- Structured logs
- Metrics hooks

### Specify Prompt
```
/spec-kitty.specify feature=060-core-observability

[feature summary]
Add observability features including health checks and structured logging.

[goals and non-goals]
Goals: transparency and debugging.

[key user stories]
- As an operator, I diagnose issues quickly.

[constraints and assumptions]
Low overhead.
```

---

# 15. Deploy Templates
**Doel:** Staging/production referenties.
**Waarom agnostisch:** Deployment is domeinonafhankelijk.

### Wat moet er gebeuren
- Docker templates
- Env templates
- Example configs

### Specify Prompt
```
/spec-kitty.specify feature=061-core-deploy-templates

[feature summary]
Provide deployment reference templates.

[goals and non-goals]
Goals: reproducible deploys.

[key user stories]
- As a developer, I deploy consistently.

[constraints and assumptions]
Environment-agnostic.
```

---

# 16. Scaffolding CLI
**Doel:** Genereren van nieuwe modules/apps.
**Waarom agnostisch:** Produceert structuur, geen domein.

### Wat moet er gebeuren
- CLI commands
- Templates voor modules
- Integratie met enforcement engine

### Specify Prompt
```
/spec-kitty.specify feature=070-core-scaffolding-cli

[feature summary]
Define a scaffolding CLI for generating new modules and apps.

[goals and non-goals]
Goals: speed up development.

[key user stories]
- As a developer, I can scaffold modules quickly.

[constraints and assumptions]
Must follow core conventions.
```

---

# 17. Docs & Examples
**Doel:** Documentatie en voorbeelden.
**Waarom agnostisch:** Geldt voor elk toekomstig product.

### Wat moet er gebeuren
- Getting started
- Example apps
- Contribution guide

### Specify Prompt
```
/spec-kitty.specify feature=071-core-docs-and-examples

[feature summary]
Produce documentation and example implementations for the Core-App.

[goals and non-goals]
Goals: clarity and onboarding.

[key user stories]
- As a contributor, I understand the system quickly.

[constraints and assumptions]
Markdown-based.
```
