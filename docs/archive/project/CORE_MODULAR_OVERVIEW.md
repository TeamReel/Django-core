# Django Core-App — Complete Modular Overview

Deze pagina bevat een overzicht van alle 68 modules verspreid over 16 fases. Gedetailleerde specificaties per fase zijn te vinden in de fase-bestanden.

## Platform Stats

**Total Modules**: 71 modules
**Categories**: Backend (B01-B28), Frontend (F01-F15), Platform (P01-P05), Data (D01-D16), Integration (I01-I02), Operations (O01)
**Demo Pages**: ~30+ fully functional demo pages in `examples/demo-shell/`

---

## Fase Overzicht

### ✅ Fase 1-7: Foundation (Modules 001-030) — **Compleet**

**Backend Core (B01-B21)**: 21 modules
- Foundation, i18n, auth, multi-tenancy, audit, transactions, API, notifications, webhooks, background tasks, billing, CLI, observability, health checks

**Frontend Core (F01-F07, F09)**: 9 modules
- Design System, Auth UI, Context Switcher, Notifications Hub, Resource Display, Page Templates, Theme Support, Integration Guides

#### 📂 Phase Files (COMPLETE):
- 📄 [Fase 1: Foundation & Governance (B01-B04)](phases/done/fase-01-foundation-governance.md)
- 📄 [Fase 2: Identity & Multi-Tenancy (B05-B08)](phases/done/fase-02-identity-multi-tenancy.md)
- 📄 [Fase 3: Configuration, Audit & Transactions (B09-B12)](phases/done/fase-03-configuration-audit.md)
- 📄 [Fase 4: Interfaces & Communication (B13-B17)](phases/done/fase-04-interfaces-communication.md)
- 📄 [Fase 5: Operationalisation (B18-B21)](phases/done/fase-05-operationalisation.md)
- 📄 [Fase 6: Frontend Foundations (F01-F04)](phases/done/fase-06-frontend-foundations.md)
- 📄 [Fase 7: Frontend Resources & Integration (F05-F07, F09)](phases/done/fase-07-frontend-resources.md)

---

### 🚧 Fase 8-18: Extensions (Modules 031-071) — **Roadmap**

#### 📦 [Fase 8: Demo Foundation (3 modules)](phases/planned/fase-08-demo-foundation.md)
- F10: Demo Shell (Basic) ✅ COMPLETE
- F10b-Database: Demo Production Database & Seed Data
- F10b-Pages: 30+ Demo Pages voor alle modules 001-030
- 📋 **Constitution Gate** (Post Demo Foundation)

#### 📡 [Fase 9: Real-time, Search & Workflows (5 modules)](phases/planned/fase-09-realtime-search.md)
- B23: Real-time Infrastructure (WebSocket/Channels)
- B24: Full-text Search Foundation
- F13: Rich Text Editor Component
- B27: Workflow Engine & State Machine
- B26: Payment Gateway Adapters

#### 🖥️ [Fase 10: Advanced UI & Documents (4 modules)](phases/planned/fase-10-advanced-ui.md)
- B28: Document Generation (PDF/Excel)
- F14: Admin Panel Components
- F11: Operations Console UI
- F12: Billing & Usage UI

#### 📊 [Fase 11: Data Foundations - Part 1 (5 modules)](phases/planned/fase-11-data-foundations-1.md)
- D01: Data Storage Adapters
- D02: ETL & Data Pipeline Foundation
- D03: Dataset Management & Lineage
- D04: Streaming Data Adapters
- D05: Data Version Control

#### 🧪 [Fase 12: Data Foundations - Part 2 (5 modules)](phases/planned/fase-12-data-foundations-2.md)
- D06: Structured Output Validation
- D07: Tool-Call Logging Infrastructure
- D08: Prompt Experiment Tracking
- D09: Evaluation & Metrics Framework
- D10: Annotation & Labeling Tools

#### 🤖 [Fase 13: ML/AI Platform (6 modules)](phases/planned/fase-13-ml-ai-platform.md)
- D11: Feature Engineering Patterns
- D12: Model Registry
- D13: Prompt Template Library
- D14: Agent Operations & Orchestration
- D15: Vector Search & Retrieval Adapter
- D16: Model Monitoring & Feedback Loop
- 📋 **Constitution Gate** (Post ML & Agent Governance)

#### ✅ [Fase 14: Platform Quality Gates (5 modules)](phases/planned/fase-14-quality-gates.md)
- P01: Constitutional Enforcement Engine (Lightweight)
- P02: Security Audit & ASVS Compliance (Lightweight)
- P03: ML & Agent Governance Gate (Lightweight)
- P04: Integration Security Audit (Lightweight)
- P05: Stack & Dependency Validation (Lightweight)

#### 🔌 [Fase 15: Integration Ecosystem (2 modules)](phases/planned/fase-15-integration.md)
- I01: Connector Framework & SDK (Lightweight)
- I02: Compliance Exports (Lightweight)

#### 🛡️ [Fase 16: Operations & Resilience (1 module)](phases/planned/fase-16-operations.md)
- O01: Resilience Testing & Health Validation (Lightweight)
- 📋 **Constitution Gate** (Final Platform Validation)

---

## Backend — Fase 1: Fundament & Governance

### 1. B01 – Core Project Skeleton

**Doel**
Basale, production-ready Django projectstructuur met settingslagen, CI en modulaire apps.

**Waarom agnostisch**
Bevat alleen infrastructuur en conventies, geen domeinlogica.

**Wat moet er gebeuren**
- Folderstructuur en app-indeling neerzetten
- Base/dev/test/prod settings configureren
- Patterns voor secrets en environment-variabelen vastleggen
- CI-pipeline (testen, linting, type checks) inrichten
- Basis README en developer-onboarding documenteren
- Bestaande tests voor de projectstructuur en settings bijwerken of toevoegen zodat ze aansluiten op de nieuwe configuratie

**Specify Prompt**

/spec-kitty.specify feature=B01-core-project-skeleton

[feature summary]
Define a production-ready Django project skeleton with environment-based settings, CI/CD configuration, and a clean modular structure suitable for multiple products.

[goals and non-goals]
Goals:
- Provide a reusable, domain-agnostic Django project foundation
- Enable fast onboarding with clear conventions and documentation
- Integrate automated testing, linting and type checking into CI
- Support multiple deployment environments (local, staging, production)

Non-goals:
- Implement any product-specific domain logic
- Provide complex frontend or design system assets
- Solve infrastructure provisioning (servers, databases, networks)

[key user stories]
- As a developer, I can start a new Django-based product with minimal boilerplate work.
- As a tech lead, I can enforce consistent project structure and quality checks across teams.
- As a DevOps engineer, I can rely on predictable settings and CI behaviour when deploying.

[constraints and assumptions]
- Django 5.x, Python 3.12 as the primary stack
- CI based on GitHub Actions (or equivalent) with pytest, linting and type checks
- Environment configuration based on environment variables and 12-factor principles
- No assumptions about specific databases or cloud vendors

---

### 2. B02 – Constitutional Enforcement Engine

**Doel**
Handhaven van Spec-Driven Development (SDD)-principes, required files en quality gates.

**Waarom agnostisch**
Gaat over proces, workflow en repository-hygiëne, niet over domeinlogica.

**Wat moet er gebeuren**
- Rule engine voor project-, spec- en workflow-validatie
- Validators voor bestanden, mappen, naming en SDD-artefacten
- Configuratiemodel voor rule sets per project/repository
- CLI-tool en CI-integratie (pre-merge, pre-push, pipeline)
- Rapportage van overtredingen en nalevingsstatus
- Tests voor rules, validators, CLI en CI-integratie toevoegen of bijwerken zodat ze de constitutionele regels afdekken

**Specify Prompt**

/spec-kitty.specify feature=B02-constitutional-enforcement-engine

[feature summary]
Define a rule-based enforcement engine that validates repositories, specs and workflows against the project constitution and Spec-Driven Development process.

[goals and non-goals]
Goals:
- Provide a configurable rule engine for constitution and workflow enforcement
- Validate the presence and structure of core artefacts (specs, plans, tasks, docs)
- Integrate with CI pipelines and local CLI workflows
- Produce clear, actionable reports for violations and compliance status

Non-goals:
- Implement product-specific business rules
- Replace full-featured static analysis tools or security scanners
- Manage user permissions or access control directly

[key user stories]
- As a maintainer, I want all repositories to follow the same SDD structure and quality gates.
- As a developer, I get fast feedback when my branch violates constitutional rules.
- As a tech lead, I can configure which rules are mandatory vs advisory per project.

[constraints and assumptions]
- Implemented in Python, usable across multiple repositories
- Pluggable rule architecture for future rule sets and adapters
- CLI tool plus CI integration as primary interaction channels
- Works with Git-based workflows (branches, pull requests, tags)

---

### 3. B03 – Core Security Baseline

**Doel**
Hardened security settings (SECURE_*, CSRF, headers), brute-force bescherming en security reporting in combinatie met CI-scans.

**Waarom agnostisch**
Security-patterns zijn generiek en toepasbaar op elk product.

**Wat moet er gebeuren**
- Hardened Django settings (cookies, headers, SSL, CSRF)
- Brute-force/abuse bescherming (bijv. login rate-limiting/lockouts)
- Integratie met dependency- en SAST-scanners in CI
- Strict vs advisory modes voor enforcement
- Security-rapportage en baseline-documentatie
- Security- en regressietests toevoegen of bijwerken voor settings, rate-limiting en CI-scans

**Specify Prompt**

/spec-kitty.specify feature=B03-core-security-baseline

[feature summary]
Establish a comprehensive security baseline combining hardened Django runtime settings with CI-based security scanning and clear reporting, aligned with OWASP ASVS principles.

[goals and non-goals]
Goals:
- Provide secure-by-default Django runtime configuration (headers, cookies, CSRF, sessions)
- Implement brute-force and abuse protections for authentication and sensitive endpoints
- Integrate dependency scanning, static analysis and configuration checks into CI
- Offer strict vs advisory enforcement modes and human-readable security reports

Non-goals:
- Implement full IAM, roles or fine-grained authorization logic
- Replace dedicated enterprise security platforms or SIEM solutions
- Cover application-specific security logic beyond the core baseline

[key user stories]
- As a developer, I rely on secure defaults without needing custom security code for every project.
- As a security officer, I can see a concise report of security issues across builds and deployments.
- As a maintainer, I can switch between strict and advisory enforcement depending on maturity.

[constraints and assumptions]
- Django 5.x, Python 3.12, following OWASP ASVS-inspired guidelines
- CI integration with at least dependency and static code scanning tools
- Minimal performance overhead on runtime checks
- Works alongside the constitutional enforcement engine but is logically separate

---

### 4. B04 – Core Internationalisation Base

**Doel**
Basis i18n/l10n-laag voor server-side componenten: talen, locales, tijdzones en formatting.

**Waarom agnostisch**
Taal en locale-ondersteuning zijn infrastructuur en niet product-specifiek.

**Wat moet er gebeuren**
- gettext/l10n-configuratie en locale middleware
- Standaard taal, tijdzone en formatting instellen
- Structuur voor vertaalbare strings en message files
- Patterns documenteren voor gebruik in downstream apps
- Tests toevoegen of bijwerken voor i18n-configuratie, middleware en locale-resolutie

**Specify Prompt**

/spec-kitty.specify feature=B04-core-internationalisation-base

[feature summary]
Provide a base internationalisation and localisation layer for server-side components, including languages, locales, time zones and formatting, without user/org preferences yet.

[goals and non-goals]
Goals:
- Enable multi-language support for server-rendered content and messages
- Configure default locale, time zone and formatting rules
- Provide clear patterns for marking strings as translatable in downstream apps
- Keep the setup simple and reusable across products

Non-goals:
- Manage per-user or per-organisation language preferences
- Translate product-specific content or marketing copy
- Implement frontend i18n frameworks

[key user stories]
- As a user, I can see system messages in the default supported language.
- As a developer, I know exactly how to add translatable strings in new modules.
- As a product team, we can gradually add more languages without structural changes.

[constraints and assumptions]
- Based on Django’s built-in i18n/l10n capabilities
- Default language and time zone configured centrally in settings
- No assumptions about specific languages beyond a default base language
- Compatible with the later user/org preferences module (B12)

---

## Backend — Fase 2: Identiteit & Hiërarchie

### 5. B05 – Core Accounts

**Doel**
Custom user model, auth-flows en basisrollen/permissions als fundament voor multi-tenant SaaS.

**Waarom agnostisch**
Gebruikers en basisidentiteit komen in vrijwel elke applicatie voor.

**Wat moet er gebeuren**
- Custom User model (email-centric of configurable)
- Login, logout, password reset flows en endpoints/templates
- Baseline roles/permissions-structuur
- Integratie met security baseline (B03)
- Tests toevoegen of bijwerken voor user model, auth-flows en basispermissions (inclusief regressietests bij schemawijzigingen)

**Specify Prompt**

/spec-kitty.specify feature=B05-core-accounts

[feature summary]
Define a generic accounts module with a custom user model, authentication flows and base permissions suitable for multi-tenant SaaS products.

[goals and non-goals]
Goals:
- Provide a robust custom user model as the single identity source
- Implement secure authentication flows and session handling
- Offer a simple, extensible roles and permissions baseline
- Integrate with the core security baseline for hardened behaviour

Non-goals:
- Implement complex organization-specific roles or policies
- Provide social login or identity federation (OIDC/SAML) out of the box
- Handle billing or user provisioning workflows

[key user stories]
- As a user, I can sign in, sign out and reset my password securely.
- As an admin, I can see which users exist and manage their basic status.
- As a developer, I can extend the user model without breaking the core.

[constraints and assumptions]
- Builds on Django’s authentication framework with a custom user model
- Integrates with B03-core-security-baseline for security settings and brute-force protection
- Compatible with multi-tenancy modules (B06–B07)
- No assumptions about external identity providers initially

---

### 6. B06 – Organisations

**Doel**
Generiek organisatiemodel met membership-relaties tussen users en organisaties.

**Waarom agnostisch**
Organisaties (bedrijven, teams, clubs) zijn een universeel patroon.

**Wat moet er gebeuren**
- Organisation model met generieke velden
- Membership model (user ↔ organisation, rol/relatie)
- Admin, API en eenvoudige management-views/endpoints
- Integratie met accounts (B05) en audit logging (B09)
- Tests toevoegen of bijwerken voor organisation- en membership-modellen, API’s en integratie met accounts en audit logging

**Specify Prompt**

/spec-kitty.specify feature=B06-organisations

[feature summary]
Define a generic organisation module with membership relations and basic management flows.

[goals and non-goals]
Goals:
- Represent organisations in a reusable, domain-neutral way
- Model user membership and basic organisation roles
- Provide admin and API interfaces to manage organisations and members
- Lay the foundation for multi-tenant behaviour across the platform

Non-goals:
- Implement complex organisation-specific billing or contracts
- Model detailed org charts or HR structures
- Handle domain-specific organisational attributes

[key user stories]
- As an organisation admin, I can create and manage organisations.
- As an organisation admin, I can add, remove or change members and their roles.
- As a developer, I can associate resources with the correct organisation.

[constraints and assumptions]
- Depends on B05-core-accounts for user identities
- Should integrate with B09-audit-logging for critical changes
- Data model must allow multiple organisations per user and vice versa
- No assumption about paid vs free organisations at this level

---

### 7. B07 – Projects / Workspaces

**Doel**
Project/workspace-laag als contextcontainer binnen organisaties.

**Waarom agnostisch**
Projecten/workspaces zijn generieke contexten voor data en workflows.

**Wat moet er gebeuren**
- Project/workspace model gekoppeld aan organisation en users
- Basale statusvelden (active/archived) en metadata
- API- en admin-interfaces
- Integratie met audit logging en settings/modules
- Tests toevoegen of bijwerken voor project/workspace-modellen, lifecycle-acties en koppeling aan organisations/users

**Specify Prompt**

/spec-kitty.specify feature=B07-projects-workspaces

[feature summary]
Create a project/workspace model that acts as a reusable context container within organisations for resources, configuration and workflows.

[goals and non-goals]
Goals:
- Provide a generic project/workspace entity linked to organisations and users
- Support scoping of resources and configuration to projects/workspaces
- Offer simple lifecycle management (create, update, archive)
- Prepare for hierarchical access control and multi-tenancy behaviour

Non-goals:
- Implement complex project management features (tasks, sprints, Gantt)
- Enforce domain-specific workflows within projects
- Handle external integrations per project in this module

[key user stories]
- As a user, I can work within the correct project context for my resources.
- As an organisation admin, I can create and archive projects/workspaces as needed.
- As a developer, I can attach domain entities to a project/workspace safely.

[constraints and assumptions]
- Depends on B06-organisations and B05-core-accounts
- Integrates with B09-audit-logging for key events (create, archive, membership changes)
- Must be compatible with multi-tenancy/navigation in the frontend (F03)
- No assumption about billing or quotas at this level (delegated to B11)

---

### 8. B08 – Hierarchical Access Control

**Doel**
Hiërarchische toegangscontrole bovenop users, organisaties en projecten.

**Waarom agnostisch**
Role- en permission-hiërarchieën zijn generieke patronen, onafhankelijk van domein.

**Wat moet er gebeuren**
- Model voor roles/permissions op user/org/project-niveau
- Policy-evaluatie (inheritance, overrides)
- Integratie-hooks voor views, APIs en tasks
- Logging van access-denied/events (audit)
- Tests toevoegen of bijwerken voor role/permission-modellen, policy-evaluatie en integratie in views en APIs

**Specify Prompt**

/spec-kitty.specify feature=B08-hierarchical-access-control

[feature summary]
Define hierarchical access control across users, organisations and projects, enabling fine-grained and inheritance-based permission logic.

[goals and non-goals]
Goals:
- Model roles and permissions across multiple levels (global, organisation, project)
- Provide a clear policy evaluation mechanism with inheritance and overrides
- Integrate with Django views, DRF APIs and background tasks for authorization checks
- Produce meaningful audit entries for important access decisions

Non-goals:
- Implement UI for role management (handled by downstream products)
- Replace external IAM or SSO solutions
- Encode domain-specific rules beyond generic access control patterns

[key user stories]
- As an organisation admin, I can assign roles to users at organisation and project level.
- As a developer, I can use a simple API to check if a user may perform an action in a given context.
- As an auditor, I can see why access was granted or denied in sensitive cases.

[constraints and assumptions]
- Depends on B05-core-accounts, B06-organisations and B07-projects-workspaces
- Should integrate with B09-audit-logging for critical access events
- Designed to be compatible with external identity providers in the future
- Must impose low overhead on common permission checks

---

## Backend — Fase 3: Configuratie, Audit & Transacties

### 9. B09 – Audit Logging

**Doel**
Gestructureerde audit logs van belangrijke acties in het platform.

**Waarom agnostisch**
Audit logging is infrastructuur en van toepassing op alle domeinen.

**Wat moet er gebeuren**
- Audit-event model en opslagstructuur
- Hooks/signals voor belangrijke acties (auth, config, org/project)
- API en admin UI voor inspectie
- Bewaartermijn- en privacy-afwegingen vastleggen
- Tests toevoegen of bijwerken voor audit-event creatie, opslag, queries en retention-regels

**Specify Prompt**

/spec-kitty.specify feature=B09-audit-logging

[feature summary]
Provide a structured audit logging system for security-sensitive and configuration-sensitive actions across the platform.

[goals and non-goals]
Goals:
- Record who did what, when and in which context (user, organisation, project)
- Capture key events such as auth changes, configuration updates and access control decisions
- Provide query and retrieval interfaces for auditing and investigations
- Support configurable retention and export patterns

Non-goals:
- Replace full SIEM or log management solutions
- Log every minor event and noise-intensive telemetry
- Solve legal archiving or compliance obligations on its own

[key user stories]
- As an auditor, I can review important actions by user, organisation or project.
- As a security officer, I can quickly reconstruct critical security events.
- As a developer, I can easily register new events into the audit log.

[constraints and assumptions]
- Must integrate with B03-core-security-baseline and B08-hierarchical-access-control
- Designed for low to moderate write volume; not a high-frequency metrics system
- Data model should be flexible enough to attach custom metadata
- Needs clear guidelines for retention, PII and privacy concerns

---

### 10. B10 – Settings & Feature Flags

**Doel**
Configuratie-infrastructuur op globaal, org- en projectniveau plus feature flags.

**Waarom agnostisch**
Elk platform heeft toggles en configuratie die los van domeinlogica staan.

**Wat moet er gebeuren**
- Settingsmodel(len) voor global/org/project-niveau
- FeatureFlag model met enable/disable per scope
- Toegankelijke API om settings/flags te lezen
- Patterns voor safe rollouts en fallbacks documenteren
- Tests toevoegen of bijwerken voor settings-resolutie, feature-flag gedrag en API’s op alle scopes

**Specify Prompt**

/spec-kitty.specify feature=B10-settings-feature-flags

[feature summary]
Implement a flexible settings and feature flags system that supports global, organisation-level and project-level configuration without code changes.

[goals and non-goals]
Goals:
- Provide a structured way to store and resolve settings across scopes
- Allow safe enabling/disabling of features via flags
- Offer a simple API for application code to query settings and flags
- Support gradual rollouts and environment-specific overrides

Non-goals:
- Implement domain-specific configuration UIs
- Replace infrastructure configuration (e.g. Terraform, Kubernetes manifests)
- Manage secrets storage or rotation directly

[key user stories]
- As an admin, I can enable a new feature for one organisation before rolling it out globally.
- As a developer, I can read configuration and flags without hardcoding values.
- As an operator, I can disable a problematic feature quickly without redeploying.

[constraints and assumptions]
- Integrates with B09-audit-logging for critical configuration changes
- Designed to work in both monolith and multi-service contexts
- Must be cache-friendly and efficient under high read volume
- Compatible with later i18n and preference modules (B12)

---

### 11. B11 – Core Transactions & Credits

**Doel**
Generiek transactiemodel voor credits, usage en billable events op org/projectniveau.

**Waarom agnostisch**
Usage, credits en transacties zijn generieke patronen voor veel SaaS-producten.

**Wat moet er gebeuren**
- Transaction- en balance-modellen (org/project)
- Events voor usage/billing (abstract)
- Samenvattings-/saldo-API’s
- Afbakening met externe billing-systemen documenteren
- Tests toevoegen of bijwerken voor transacties, balances, idempotency en samenvattings-API’s

**Specify Prompt**

/spec-kitty.specify feature=B11-core-transactions-credits

[feature summary]
Introduce a generic transaction and credits engine to track usage, balances and billable events at organisation and project level.

[goals and non-goals]
Goals:
- Represent credit/usage balances and transactions in a generic way
- Record billable events with sufficient metadata for downstream billing systems
- Provide APIs for querying balances and recent activity
- Support basic integrity checks and idempotency of transaction writes

Non-goals:
- Implement a full billing or invoicing system
- Handle currency conversions, taxation or legal invoicing requirements
- Define product-specific pricing models

[key user stories]
- As an operator, I can see how many credits an organisation has left.
- As a product team, I can record usage events that might become billable later.
- As a developer, I can integrate domain events with the transaction engine safely.

[constraints and assumptions]
- Must integrate well with B06-organisations and B07-projects-workspaces
- Data model must support external export to billing/ERP systems
- Transaction writes should be robust against duplicate event delivery
- High read performance is more important than ultra-high write throughput

---

### 12. B12 – i18n/l10n User & Org Preferences

**Doel**
User- en org-specifieke taal-, locale- en tijdzonevoorkeuren bovenop de i18n-basis.

**Waarom agnostisch**
Voorkeursinstellingen voor taal/tijdzone zijn infrastructuur en productonafhankelijk.

**Wat moet er gebeuren**
- Modellen voor user/org language/locale/timezone
- Resolutie-logica (user > org > global default)
- Integratie met settings & middleware
- Admin/API om voorkeuren te beheren
- Tests toevoegen of bijwerken voor preference-modellen, resolutielogica en runtime-toepassing

**Specify Prompt**

/spec-kitty.specify feature=B12-i18n-l10n-user-org-preferences

[feature summary]
Extend the base i18n layer to support user and organisation-specific language, locale and time zone preferences integrated with the settings system.

[goals and non-goals]
Goals:
- Store language, locale and time zone preferences at user and organisation level
- Resolve effective preferences using a clear precedence model
- Integrate with Django’s i18n/l10n and middleware to apply preferences at runtime
- Expose APIs/admin to manage and inspect preferences

Non-goals:
- Translate domain-specific content automatically
- Manage complex regional compliance rules (e.g. per-country legal texts)
- Implement frontend-only i18n frameworks

[key user stories]
- As a user, I can set my preferred language and time zone.
- As an organisation admin, I can define default language and time zone for members.
- As a developer, I can easily access the effective locale for each request.

[constraints and assumptions]
- Depends on B04-core-internationalisation-base and B10-settings-feature-flags
- Precedence model: user > organisation > global default
- Must work in both API and server-rendered contexts
- Minimal performance overhead for resolving preferences per request

---

## Backend — Fase 4: Interfaces & Communicatie

### 13. B13 – API Baseline

**Doel**
Standaard API-patterns, authenticatie, paginering, foutafhandeling en throttling.

**Waarom agnostisch**
API-structuur en -conventies zijn generiek, los van domein.

**Wat moet er gebeuren**
- API root en standaard response-structuren
- Auth-mechanismen (tokens/sessions) definiëren
- Paginering, error-handling en throttling policies
- Basis-versionering en schema-publicatie
- API- en integratietests toevoegen of bijwerken voor auth, paginering, errors en throttling

**Specify Prompt**

/spec-kitty.specify feature=B13-api-baseline

[feature summary]
Define a DRF-based API baseline with consistent authentication, pagination, error handling and versioning, exposing core entities in a stable way.

[goals and non-goals]
Goals:
- Provide a consistent API surface for core entities (users, organisations, projects)
- Standardise authentication, pagination, error formats and throttling behaviour
- Enable clear API versioning and discoverability
- Serve as a foundation for product-specific APIs

Non-goals:
- Implement complex domain-specific endpoints
- Provide GraphQL or alternative API styles out of the box
- Handle client SDK generation (can be added separately)

[key user stories]
- As an API client developer, I can rely on predictable responses and error formats.
- As a backend developer, I can expose new resources following a standard pattern.
- As an operator, I can limit abusive API usage through throttling.

[constraints and assumptions]
- Based on Django REST Framework (DRF)
- Integrates with B03-core-security-baseline and B05/B06/B07 entities
- Error formats and pagination patterns should be documented and stable
- Prepared for future versioning and deprecation strategies

---

### 14. B14 – Web-UI Baseline

**Doel**
Backend-gedreven template- en layoutbasis voor een neutrale web-UI.

**Waarom agnostisch**
Levert generieke HTML-structuur en layout, zonder branding of domeinlogica.

**Wat moet er gebeuren**
- Base templates en layout skeleton (header, nav, content)
- Standaard bouwstenen voor formulieren en lijsten
- Basic navigatie (organisaties, projecten, account)
- Documentatie voor downstream producten
- Tests toevoegen of bijwerken voor template-rendering, navigatiestructuren en basisflows

**Specify Prompt**

/spec-kitty.specify feature=B14-web-ui-baseline

[feature summary]
Provide a backend-driven web UI baseline with templates, layout hooks and navigation stubs that is neutral and can be used with or without a dedicated SPA frontend.

[goals and non-goals]
Goals:
- Offer a minimal, clean HTML layout suitable for default admin-like UIs
- Provide reusable template blocks for navigation, content and messages
- Integrate with authentication and core entities (organisations, projects)
- Remain unbranded and easy to customise in downstream products

Non-goals:
- Implement a full component design system (handled in F01)
- Deliver product-specific pages or dashboards
- Enforce a particular CSS framework or branding theme

[key user stories]
- As a developer, I can build simple server-rendered pages using the baseline templates.
- As a maintainer, I can navigate core entities through a minimal UI without extra setup.
- As a product team, I can layer branding and richer UX on top of this baseline.

[constraints and assumptions]
- Built using Django templates and static files
- Integrates with B05/B06/B07 for core navigation structures
- Compatible with future SPA or hybrid frontends (e.g. by exposing layout hooks)
- Accessibility and semantic HTML should be respected where feasible

---

### 15. B15 – Tasks & Scheduling

**Doel**
Asynchrone taken en periodieke jobs (bijv. Celery) voor background processing.

**Waarom agnostisch**
Taken en schedulers zijn generiek voor elk platform.

**Wat moet er gebeuren**
- Celery (of vergelijkbare) configuratie
- Broker- en backend-configuratiepatroon
- Support voor periodieke jobs (beat/scheduler)
- Patterns voor error-handling en retries
- Tests toevoegen of bijwerken voor task-uitvoering, retries en scheduled jobs

**Specify Prompt**

/spec-kitty.specify feature=B15-tasks-scheduling

[feature summary]
Integrate asynchronous tasks and scheduling to run background jobs and periodic maintenance safely.

[goals and non-goals]
Goals:
- Provide a standard way to run asynchronous and scheduled tasks
- Integrate with the Core-App’s settings, logging and notifications
- Offer patterns for retries, error handling and observability of tasks
- Support both ad-hoc jobs and recurring maintenance tasks

Non-goals:
- Implement domain-specific task logic
- Replace external schedulers or workflow engines
- Provide a UI for task management (beyond basic introspection)

[key user stories]
- As a developer, I can offload heavy work to background tasks.
- As an operator, I can see whether recurring jobs run successfully.
- As a security officer, I can ensure tasks handling sensitive data follow policies.

[constraints and assumptions]
- Likely based on Celery with a pluggable broker (e.g. Redis)
- Integrates with B18-observability for logging and metrics
- Should work well with B16-notifications-baseline (e.g. sending emails)
- Deployment and scaling patterns documented in B19-deploy-templates

---

### 16. B16 – Notifications Baseline

**Doel**
Generiek notificatieframework voor e-mail, in-app en andere kanalen.

**Waarom agnostisch**
Communicatie-infrastructuur is generiek, ongeacht het domein.

**Wat moet er gebeuren**
- Notification-model(len) en delivery-status
- E-mailbackend en templatestructuur
- Integratie met tasks (async delivery)
- Hooks voor andere kanalen (webhooks, in-app)
- Tests toevoegen of bijwerken voor notification creatie, kanaalafhandeling en delivery-status

**Specify Prompt**

/spec-kitty.specify feature=B16-notifications-baseline

[feature summary]
Implement a generic notifications framework for sending and storing notifications across channels (email, in-app, webhooks) with delivery state tracking.

[goals and non-goals]
Goals:
- Represent notifications as first-class entities with status and metadata
- Support multiple channels (at least email, optionally webhooks/in-app)
- Integrate with B15-tasks-scheduling for asynchronous delivery
- Provide a simple API for triggering notifications from domain logic

Non-goals:
- Implement complex notification templates or campaign tooling
- Provide end-user preference UIs (can be added by products)
- Deliver channel-specific advanced features (e.g. SMS, push) by default

[key user stories]
- As a user, I receive important system notifications reliably.
- As a developer, I can trigger notifications using a simple, consistent API.
- As an operator, I can inspect the status of notifications and diagnose failures.

[constraints and assumptions]
- Depends on B15-tasks-scheduling for asynchronous processing
- Integrates with B09-audit-logging for critical notification events as needed
- Must be extensible to new channels with minimal changes to callers
- Templates should be minimal and unbranded by default

---

### 17. B17 – Contextual Notification Service

**Doel**
Slimme routering en targeting van notificaties op basis van user/org/project en eventtype.

**Waarom agnostisch**
Contextuele logica rond notificaties is patroonherhaalbaar over verschillende domeinen.

**Wat moet er gebeuren**
- Service-laag bovenop notifications-baseline
- Rules voor doelgroepen, kanalen en frequentie
- Integratie met settings/feature flags (mute, opt-in/out)
- Logging en debugmogelijkheden voor routering
- Tests toevoegen of bijwerken voor routeringsregels, voorkeuren en integratie met settings/feature flags

**Specify Prompt**

/spec-kitty.specify feature=B17-contextual-notification-service

[feature summary]
Add a higher-level contextual notification service that routes, filters and targets notifications based on user, organisation, project and event type.

[goals and non-goals]
Goals:
- Provide routing rules for which users receive which notifications via which channels
- Respect per-user and per-organisation notification preferences and feature flags
- Reduce noise by aggregating or suppressing redundant notifications
- Expose simple integration points for domain events to trigger contextual notifications

Non-goals:
- Implement rich campaign or marketing automation logic
- Replace external customer engagement tools
- Provide complex analytics dashboards for notification performance

[key user stories]
- As a user, I receive relevant notifications without being spammed.
- As an organisation admin, I can configure notification behaviour at org level.
- As a developer, I can emit high-level events and let the service decide how to notify whom.

[constraints and assumptions]
- Depends on B16-notifications-baseline and B10-settings-feature-flags
- Should integrate with B12 preferences where applicable
- Must be designed to avoid excessive complexity in rule configuration
- Logging should allow debugging of routing decisions for support/security

---

## Backend — Fase 5: Operationeel & Afronding

### 18. B18 – Observability

**Doel**
Health checks, structured logging en hooks voor metrics.

**Waarom agnostisch**
Monitoring en observability zijn infrastructuur en productonafhankelijk.

**Wat moet er gebeuren**
- Health-, readiness- en liveness-endpoints
- Gestandaardiseerde structured logging
- Hooks voor metrics-export (bijv. Prometheus)
- Documentatie van log- en metricsconventies
- Tests toevoegen of bijwerken voor health endpoints, loggingformaten en metrics hooks

**Specify Prompt**

/spec-kitty.specify feature=B18-observability

[feature summary]
Provide observability primitives such as health checks, readiness probes, structured logging and metric hooks to monitor platform health.

[goals and non-goals]
Goals:
- Expose health endpoints for load balancers and orchestration systems
- Standardise logging formats for easier analysis and correlation
- Offer basic metrics hooks for latency, errors and key operations
- Make it easy for downstream products to extend observability

Non-goals:
- Implement a full monitoring or alerting stack
- Provide complex tracing setup across multiple services
- Replace external logging/metrics infrastructure

[key user stories]
- As an operator, I can quickly see whether the application is healthy.
- As a developer, I can log important events in a structured, machine-readable format.
- As a reliability engineer, I can integrate metrics with existing dashboards and alerts.

[constraints and assumptions]
- Should work with containers and orchestration platforms (e.g. Kubernetes)
- Must integrate with B15-tasks-scheduling for task-level observability
- Logging should avoid leaking sensitive information by default
- Performance overhead must be minimal and well-understood

---

### 19. B19 – Deploy Templates

**Doel**
Referentietemplates voor staging/production-deployments (Docker, env-templates, configs).

**Waarom agnostisch**
Deploymentconfiguratie is grotendeels domeinonafhankelijk.

**Wat moet er gebeuren**
- Dockerfiles en docker-compose voorbeelden
- Environment-variable templates (.env.example)
- Basisconfiguratievoorbeelden voor typische cloud-setups
- Uitleg over aanpasbare parameters en extensies
- Tests of smoke-checks toevoegen of bijwerken voor basisdeployments en health van de templates

**Specify Prompt**

/spec-kitty.specify feature=B19-deploy-templates

[feature summary]
Offer reference deployment templates and configuration examples (containers, environment variables, infra hints) for typical cloud setups.

[goals and non-goals]
Goals:
- Provide ready-to-use deployment templates for common scenarios
- Document required environment variables and configuration knobs
- Demonstrate integration with observability, tasks and security baselines
- Lower the barrier for teams to run the Core-App in staging and production

Non-goals:
- Manage infrastructure provisioning or IaC templates in depth
- Guarantee compatibility with every hosting provider or PaaS
- Provide highly optimised production setups for specific vendors

[key user stories]
- As a developer, I can run the Core-App in a local or staging environment quickly.
- As an operator, I have clear examples for configuring the app in our infra.
- As a tech lead, I can use the templates as a starting point for production hardening.

[constraints and assumptions]
- Container-based deployment (Docker) as the primary reference pattern
- Integrates with B03, B15 and B18 requirements
- Templates should be environment-agnostic but easily customisable
- Security best practices (e.g. non-root containers) should be respected where feasible

---

### 20. B20 – Scaffolding CLI

**Doel**
CLI voor het genereren van nieuwe modules/apps en projecten volgens Core-conventies.

**Waarom agnostisch**
Genereert structuur en boilerplate, geen domeinlogica.

**Wat moet er gebeuren**
- CLI-commando’s voor nieuwe apps/modules en downstream projecten
- Templates die Core-structuur, security en i18n meenemen
- Integratie met constitutional enforcement engine
- Documentatie en voorbeelden van gebruik
- Tests toevoegen of bijwerken voor CLI-commando’s en de gegenereerde output

**Specify Prompt**

/spec-kitty.specify feature=B20-scaffolding-cli

[feature summary]
Create a scaffolding CLI to generate new apps, modules and downstream products following the Core-App conventions and security baselines.

[goals and non-goals]
Goals:
- Speed up creation of new apps/modules with consistent structure
- Ensure new code respects the project skeleton, security and i18n conventions
- Provide templates for common patterns (API module, service module, UI-backed module)
- Integrate with the constitutional enforcement engine where useful

Non-goals:
- Replace full-featured project generators beyond the Core-App context
- Offer deep customisation of every scaffolding detail
- Implement domain-specific business templates

[key user stories]
- As a developer, I can scaffold a new module in minutes instead of hours.
- As a maintainer, I know that scaffolded modules follow our standards by default.
- As a tech lead, I can roll out new patterns via updated templates.

[constraints and assumptions]
- CLI likely implemented as a Python console script or Django management command
- Must align with B01 skeleton structure and B03 security baseline
- Templates should be versioned and testable themselves
- Works across multiple downstream products built on the Core-App

---

### 21. B21 – Docs & Examples

**Doel**
Documentatie en voorbeeldimplementaties voor de Core-App.

**Waarom agnostisch**
Geldt als basis voor elk toekomstig product dat op de Core-App bouwt.

**Wat moet er gebeuren**
- Getting started gidsen en architectuuroverzicht
- Voorbeeldapps (mini-producten)
- Contribution guide en coding standards
- Relatie met Spec Kitty workflow documenteren
- Tests of voorbeeld-scripts toevoegen of bijwerken die verifiëren dat de documentatievoorbeelden daadwerkelijk werken

**Specify Prompt**

/spec-kitty.specify feature=B21-docs-examples

[feature summary]
Deliver documentation and example projects that demonstrate how to use and extend the Core-App in downstream products and teams.

[goals and non-goals]
Goals:
- Provide clear onboarding material for new developers and teams
- Document architecture, modules and key design decisions
- Offer example implementations that showcase typical integration patterns
- Explain how to use Spec Kitty and the SDD workflow with the Core-App

Non-goals:
- Replace product-specific documentation for downstream applications
- Document every minor internal detail exhaustively
- Provide non-technical marketing materials

[key user stories]
- As a new developer, I can understand and run the Core-App quickly.
- As a contributor, I know how to propose changes and follow the workflow.
- As a product team, I can copy patterns from example apps into our own product.

[constraints and assumptions]
- Documentation primarily in Markdown, versioned alongside the code
- Examples should be minimal but realistic and kept up to date
- Integrates with B02 constitutional enforcement and Spec Kitty workflow
- Documentation style should be consistent and straightforward

---

## Frontend — Fase 6: Frontend Fundament

### 22. F01 – Frontend Design System

**Doel**
Agnostisch design system met tokens, core UI-componenten, theming en motion-principes.

**Waarom agnostisch**
Definieert visuele taal en componenten zonder product-specifieke branding.

**Wat moet er gebeuren**
- Design tokens (kleuren, spacing, typography, radius, z-index, etc.)
- Basiscomponenten (buttons, inputs, cards, alerts, navigation items)
- Theming model (light/dark, extensible)
- Motion/interaction guidelines (focus states, transitions)
- Frontend-unit- en visuele regressietests toevoegen of bijwerken voor tokens en kerncomponenten

**Specify Prompt**

/spec-kitty.specify feature=F01-frontend-design-system

[feature summary]
Define an agnostic frontend design system with design tokens, core UI components, theming and motion foundations reusable across multiple products.

[goals and non-goals]
Goals:
- Provide a coherent visual language via design tokens
- Offer a small but robust set of foundational UI components
- Support theming (e.g. light/dark and future brand themes)
- Document interaction and motion patterns for consistency

Non-goals:
- Implement product-specific branding or marketing visuals
- Deliver every possible UI component upfront
- Tie the design system to a single frontend framework irreversibly

[key user stories]
- As a frontend developer, I can build screens faster using standard components.
- As a product designer, I can ensure consistent look and feel across products.
- As a product team, we can apply our own branding without rewriting components.

[constraints and assumptions]
- Target a modern component-based frontend stack (e.g. React) but remain conceptually agnostic
- Tokens should be exportable to multiple runtimes (CSS, JS, design tools)
- Accessibility (contrast, focus, keyboard navigation) must be considered from the start
- Integration with backend layout (B14) should be possible where needed

---

## Frontend — Fase 7: Auth & Identity

### 23. F02 – Core Auth & Identity UI

**Doel**
Frontend-authflows (login, logout, reset, profiel) in lijn met Core Accounts en security baseline.

**Waarom agnostisch**
Auth-flows zijn generiek en in vrijwel elke applicatie nodig.

**Wat moet er gebeuren**
- Sign-in/sign-out/password reset schermen
- Basic profielpagina (naam, e-mail, wachtwoord)
- Error- en successstates consistent met design system
- Integratie met B05-core-accounts en B03-security
- Frontend-tests toevoegen of bijwerken voor auth-flows, foutafhandeling en integratie met backend-API’s

**Specify Prompt**

/spec-kitty.specify feature=F02-core-auth-identity-ui

[feature summary]
Provide frontend authentication and identity flows (sign-in, sign-out, password reset, basic profile) consistent with Core Accounts and the security baseline.

[goals and non-goals]
Goals:
- Implement accessible, secure and user-friendly auth screens
- Integrate cleanly with backend endpoints exposed by B05-core-accounts
- Surface errors and edge cases gracefully (lockouts, invalid tokens, etc.)
- Respect design system components and interaction patterns

Non-goals:
- Implement advanced identity management (MFA, device management) by default
- Provide social login or third-party identity provider UIs initially
- Handle complex account lifecycle flows (invites, approvals)

[key user stories]
- As a user, I can log in and out safely and reliably.
- As a user, I can reset my password if I forget it.
- As a developer, I can customise the auth UI without breaking the flows.

[constraints and assumptions]
- Uses F01 design system components as building blocks
- Talks to backend endpoints from B05-core-accounts over the API baseline B13
- Must handle security feedback from B03 (e.g. lockouts, security messages)
- Designed to work in both monolithic and separate frontend deployments

---

## Frontend — Fase 8: Multi-Tenancy & Navigatie

### 24. F03 – Multi-Tenancy Context Switcher

**Doel**
UI-componenten om te wisselen tussen organisaties en projecten/workspaces.

**Waarom agnostisch**
Contextswitching tussen tenants en projecten is een generiek SaaS-patroon.

**Wat moet er gebeuren**
- Context switcher component (org/project selector)
- Duidelijke indicatie van huidige context
- Integratie met router, API en permissies
- UX-patronen voor beperkte toegang (alleen zichtbare orgs/projects)
- Frontend-tests toevoegen of bijwerken voor contextwisselgedrag, toegangsbeperkingen en routing-integratie

**Specify Prompt**

/spec-kitty.specify feature=F03-multi-tenancy-context-switcher

[feature summary]
Implement a multi-tenancy context switcher UI that lets users switch between organisations and projects in a predictable and safe manner.

[goals and non-goals]
Goals:
- Clearly indicate the current organisation/project context at all times
- Allow users with access to multiple contexts to switch quickly and safely
- Integrate with routing and backend APIs to load context-specific data
- Respect hierarchical access control and hide inaccessible contexts

Non-goals:
- Implement organisation or project management UIs themselves
- Provide cross-tenant data aggregation or reporting
- Replace backend authorization decisions

[key user stories]
- As a user, I always know which organisation and project I am currently working in.
- As a user, I can switch between contexts without losing my place or state unexpectedly.
- As an admin, I can be confident users only see contexts they have access to.

[constraints and assumptions]
- Depends on B06-organisations and B07-projects-workspaces data via B13 APIs
- Uses F01 design system and integrates with F06 layouts
- Must handle large numbers of organisations/projects gracefully (search, grouping)
- Authorization is enforced by backend (B08), frontend only reflects allowed options

---

## Frontend — Fase 9: Communicatie & Workflow

### 25. F04 – Notifications Hub UI

**Doel**
Frontend-notificatiehub (toasts, inbox, badges) die backend-notificaties zichtbaar maakt.

**Waarom agnostisch**
Notificatiepatronen (inbox, badges, toasts) zijn generiek toepasbaar.

**Wat moet er gebeuren**
- Toasts/snackbars voor inline feedback
- Notificatie-inbox/overzicht en badges/counters
- Integratie met B16/B17 notification services
- Filters en basic read/unread-status
- Frontend-tests toevoegen of bijwerken voor toasts, inbox, badges en integratie met backend-notificaties

**Specify Prompt**

/spec-kitty.specify feature=F04-notifications-hub-ui

[feature summary]
Build the frontend notifications hub (toasts, inbox, badges) that surfaces notifications from the backend notification services in a usable way.

[goals and non-goals]
Goals:
- Display real-time (or near real-time) notifications in context
- Provide an inbox-style view for browsing and managing notifications
- Use badges and indicators in the layout to show unread counts
- Integrate with contextual rules from B17 where applicable

Non-goals:
- Implement complex notification preference management UIs
- Replace email or other external channels as primary communication
- Provide advanced analytics on notification engagement

[key user stories]
- As a user, I can see when something important happens without leaving my current page.
- As a user, I can review past notifications in an inbox-style view.
- As a developer, I can map backend notification types to frontend display patterns.

[constraints and assumptions]
- Uses F01 design system components and F06 layouts
- Consumes notifications from B16/B17 via B13 APIs or real-time channels
- Should degrade gracefully if real-time updates are not available
- Must handle large numbers of notifications with pagination or lazy loading

---

## Backend — Security & ACL Hardening (Module 26 within Fase 2)

### 26. B08 – Permissions & ACL Security Refactor

**Doel**
Beveiligingsgerichte refactor om ACL-bypasses te sluiten, B08-permissiebeslissingen te koppelen aan B09-audit, en een herbruikbare frontend-permissielaag te bieden voor toekomstige modules (F05–F09) en downstream-producten.

**Waarom agnostisch**
Gaat over generieke multi-tenant rechtenafhandeling (ACL, audit, 403-fouten, permission-checks in UI), zonder productspecifieke logica of rollen.

**Wat moet er gebeuren**
- Centrale `evaluate_permission()` in B08 die permissiebeslissing én B09-auditlog doet (met veilige fallback naar Django-logging).
- ACL-bypasses sluiten in B11-transactions/credits, B16-notifications, B17-routing service en relevante settings-API’s.
- Nieuwe permissie-endpoint `/api/permissions/current/` met hiërarchische structuur (`global`, `organization`, `project`) voor de actieve context.
- Gestandaardiseerde 403-response met gestructureerde velden (o.a. `error`, `permission`, `detail`), met staged rollout via `@django-core/api-client`.
- Nieuwe frontend-package `@django-core/permissions` met:
  - `PermissionsProvider` (via `@django-core/api-client` + F02-auth + F03-context),
  - `usePermissions()` hook,
  - `PermissionGate` component (`mode="hide" | "disable"`, default „hide”),
  - `checkPermission()` utility.
- Uitgebreide tests en security-checks (unit + integratie + „bypass attempts”) zodat B08/B11/B16/B17 en de permissie-UI aantoonbaar voldoen aan de constitution.

**Specify Prompt**

/spec-kitty.specify feature=B08-permissions-acl-refactor

[feature summary]
Define a security-focused refactor that centralises ACL decisions in B08, integrates permission checks with the B09 audit backend, closes ACL bypasses in B11/B16/B17/settings APIs, and introduces a reusable frontend permissions layer (`@django-core/permissions`) for future features (F05–F09) and downstream products.

[goals and non-goals]
Goals:
- Ensure all critical tenant-scoped APIs (balances, notifications, settings) consistently enforce ACL via B08.
- Emit structured audit events for all permission decisions through B09, with a safe logging fallback.
- Provide a hierarchical permissions endpoint (`/api/permissions/current/`) for the active user/context.
- Offer a reusable permissions package with `PermissionsProvider`, `usePermissions`, `PermissionGate` and `checkPermission`.
- Improve test coverage and add security-focused tests around ACL and 403 handling.

Non-goals:
- Introduce new domain-specific roles or product-specific permission rules.
- Rewrite the entire ACL or audit system from scratch.
- Perform a full redesign of F03/F04; only minimal integration to validate the new permissions primitives.

[key user stories]
- As a platform/security engineer, I want all access to tenant-scoped resources to go through a single ACL layer and be fully audited.
- As a backend developer, I want a clear, documented way to enforce permissions so I cannot accidentally bypass ACL.
- As a frontend developer, I want simple, reusable primitives to show/hide or disable UI based on permissions.
- As a tenant admin, I want to be sure users only see data for organisations/projects they are allowed to access.

[constraints and assumptions]
- Must comply with `constitution.md` v1.1.0 and `refactor-plan-core-app-v1.1.0.md` (WP-R01).
- Repository-aware: reuse existing B08/B09, F02/F03, and `@django-core/api-client` patterns; no parallel ACL systems.
- No schema changes; only behaviour and API/response-shape changes.
- 403-format change follows a staged, backward-compatible rollout via the api-client.
- Backend and frontend coverage targets: ≥90% for B08 audit/evaluator, ≥85% for `@django-core/permissions`.

---

## Frontend — Fase 10: Resource Bewustzijn

### 27. F05 – Resource Display & Alerts

**Doel**
Generieke UI-patronen voor resource-overzichten (usage, credits, limits) en alerts.

**Waarom agnostisch**
Weergave van usage, limieten en alerts is een generiek SaaS-patroon.

**Wat moet er gebeuren**
- Componenten voor KPI tiles, usage bars, statusbadges
- Alerts voor waarschuwingen en fouten (banners, inline alerts)
- Integratie met B11-transactions-credits en observability-gegevens
- Documentatie van best practices voor signaal vs ruis
- Frontend-tests toevoegen of bijwerken voor resource-displays en alertcomponenten

**Specify Prompt**

/spec-kitty.specify feature=F05-resource-display-alerts

[feature summary]
Provide generic UI patterns for displaying key resource states (usage, credits, limits, health) and surfacing alerts and warnings.

[goals and non-goals]
Goals:
- Visualise usage and limits clearly
- Offer reusable components for alerts, warnings and status indicators
- Integrate with backend data from B11 and B18 where relevant
Non-goals:
- Implement domain-specific analytics or dashboards
- Replace full observability dashboards used by operators

[key user stories]
- As a user, I can see how close I am to important limits (credits, quotas).
- As an admin, I get clear visual signals when something needs attention.
- As a developer, I can reuse the same components across multiple pages and products.

[constraints and assumptions]
- Uses F01 design system visual language and is composable in F06 layouts
- Consumes data from B11 and B18 where relevant
- Must support accessibility for color-blind users and screen readers

---

## Frontend — Fase 11: Theming & Page Patterns

### 28. F07 – Theme Support & Brand

**Doel**
Thema-ondersteuning (light/dark en brandvarianten) op basis van design tokens.

**Waarom agnostisch**
Theming is generiek en deelbaar over meerdere producten.

**Wat moet er gebeuren**
- Themamodel op tokens (light/dark, extensible)
- Optionele runtime theme switch
- Brand varianten en customization patterns
- Koppeling met preferences waar relevant
- Documentatie van theming best practices
- Frontend-tests voor thematische varianten en switching

**Specify Prompt**

/spec-kitty.specify feature=F07-theme-support-brand

[feature summary]
Implement theme support (light/dark and brand variants) driven by design tokens with extensibility for downstream products.

[goals and non-goals]
Goals:
- Token-driven themes with clear states
- Optional runtime switching
- Brand customization without component rewrites
Non-goals:
- Theme editors or per-component micro-theming tooling
- Hard-coded brand-specific values in core

[key user stories]
- As a user, I can use light or dark mode when enabled.
- As a product team, we can apply branding without rewriting components.
- As a developer, I can extend themes for specific products.

[constraints and assumptions]
- Builds on F01 design tokens
- Accessibility and contrast must remain acceptable
- Compatible with F06 layouts when implemented

---

### 29. F06 – Reusable Page Templates

**Doel**
Herbruikbare paginatemplates (dashboards, lijst/detail, settings, wizards) met layouts en navigatie.

**Waarom agnostisch**
Veel SaaS-producten gebruiken dezelfde paginapatronen en layout-structuren.

**Wat moet er gebeuren**
- App shell component met sidebar/topbar structuur
- Templates voor dashboards, lijst/detail, settings en wizards
- Navigatielijsten en breadcrumbs
- Responsive layout gedrag
- Compositie van F01-componenten met consistente layouts
- Integratie met F03 context switcher en F07 theming
- Richtlijnen voor hiërarchie, responsiviteit en states
- Voorbeeldimplementaties met dummy data
- Frontend-tests voor templatestructuren, layouts en navigatie

**Specify Prompt**

/spec-kitty.specify feature=F06-reusable-page-templates

[feature summary]
Offer reusable page templates and layout components (app shell, navigation, dashboards, list/detail, settings, wizards) built on top of design system components.

[goals and non-goals]
Goals:
- Provide consistent layout structure and navigation patterns across products
- Offer out-of-the-box page structures for common SaaS scenarios
- Enable responsive and accessible navigation patterns
- Integrate with theming and context switching
Non-goals:
- Product-specific flows, navigation items or complex bespoke widgets
- Complex mega-menu structures

[key user stories]
- As a frontend developer, I can ship standard pages with consistent navigation quickly.
- As a designer, I can rely on consistent page structure and layout patterns.
- As a user, I can navigate reliably across different sections.
- As a product team, I can extend layouts without breaking core patterns.

[constraints and assumptions]
- Composes F01 design system components
- Integrates with F03 context switcher, F02 auth state and F07 theming
- Must remain neutral and unbranded by default
- Responsive and accessible design is mandatory

---

### 30. F09 – Integratiehandleidingen Frontend–Backend

**Doel**
Praktische handleidingen en voorbeelden voor integratie tussen frontend-modules en backend-API’s.

**Waarom agnostisch**
Beschrijft herbruikbare patronen en best practices voor meerdere producten.

**Wat moet er gebeuren**
- Documenteer API-consumptiepatronen (auth, context, notificaties, usage)
- End-to-end voorbeelden (login → context → data → notificaties)
- Richtlijnen voor error-handling, loading states en caching
- Koppeling met Spec Kitty workflow en modulestructuur
- Verifieerbare voorbeeldscripts of tests voor beschreven flows

**Specify Prompt**

/spec-kitty.specify feature=F09-frontend-backend-integration-guides

[feature summary]
Document concrete patterns and examples for integrating frontend modules with backend APIs and core modules.

[goals and non-goals]
Goals:
- Step-by-step guides for common flows
- Robust error handling and caching guidance
Non-goals:
- Document every edge case exhaustively
- Enforce one frontend state library

[key user stories]
- As a developer, I can follow a guide to integrate correctly with the Core-App.
- As a tech lead, I can standardise integration decisions across teams.

[constraints and assumptions]
- Docs in Markdown and/or storybook-style examples
- Kept in sync with evolving APIs and components

---

## Frontend — Fase 8: Demo Foundation & File Management

### 31. F10 – Demo Shell & Development Dashboard

**Doel**
Een minimale demo-site om de Core end-to-end te kunnen zien en uitproberen, als integratie en smoke test.

**Waarom agnostisch**
Het is geen product, maar een generieke demo die core-flows valideert en contracten zichtbaar maakt.

**Wat moet er gebeuren**
- Kleine demo-app in de repo (bijv. `apps/demo/` of `examples/demo-shell/`)
- Kernflows: login → context switch → permissions probe → list/detail template pagina’s
- Toon states: loading, empty, error, forbidden (403) en not found (404)
- Integratie met notifications en alerts waar beschikbaar
- Optioneel: eenvoudige developer-only statuspagina’s (health/permissions)
- Seed fixtures of mock-data strategie zodat demo reproduceerbaar is
- Smoke-test suite: 1–2 kritieke journeys die CI kan draaien

**Specify Prompt**

/spec-kitty.specify feature=F10-demo-shell-playground-site

[feature summary]
Create a minimal demo shell application to exercise core flows end-to-end and act as a living integration smoke test.

[goals and non-goals]
Goals:
- Provide a click-through experience for core authentication, context, permissions, and error handling
- Validate frontend-backend contracts early and continuously
- Keep the demo small, reproducible, and CI-friendly

Non-goals:
- Build a customer-facing product
- Add domain pages or dashboards
- Introduce breaking core changes just to satisfy the demo

[key user stories]
- As a maintainer, I can verify core modules still work together after changes.
- As a reviewer, I can validate integration behaviour quickly via the demo.

[constraints and assumptions]
- Must reuse existing packages (auth, context switching, permissions, design system)
- Must not become a product; keep scope intentionally minimal

---

## 📋 Constitution Update Gate (Post Core v1 + Demo)

**Doel**
Update `constitution.md` om de demo shell als integratie smoke surface te formaliseren en te anticiperen op de upcoming platform fases (Fase 9-13: data, ML, agents).

**Waarom nu**
- Core v1 (B01-B21, F01-F09) is compleet
- Demo shell (F10) valideert end-to-end integratie
- Voor data/ML/agent modules starten, moeten governance-principes helder zijn

**Wat moet er gebeuren**
- **Demo shell discipline**: Formaliseer demo app als CI smoke test, blijft minimaal en test kerncontracts
- **Adapter-first principe**: Voorkom vendor lock-in, externe systemen altijd achter interfaces
- **Redaction by default**: Geen secrets of sensitive content in logs, traces, exports, tool-call logs
- **Privacy en retention**: Classificatie, retention enforcement, safe export surfaces overal
- **Quality gates**: Evaluaties en promotion gates voor models en agent templates
- **Operational hardening cadence**: Definieer wanneer repository-wide sanity/refactor gates gebeuren
- **CI determinisme**: Flaky tests en nondeterministische builds zijn blocking issues voor gate modules

**Constitution Prompt**

/spec-kitty.constitution update-post-core-v1

[project summary]
Update constitution.md to cover the demo shell integration surface and prepare for upcoming platform phases (Fase 9-13: data, ML, agents) while staying domain-agnostic and consistent with existing repository standards.

[core principles to add or sharpen]
- **Demo shell discipline**: Demo app stays minimal and acts as CI smoke test for core contracts
- **Adapter-first**: Prevent vendor lock-in, keep external systems behind interfaces
- **Redaction by default**: No secrets or sensitive content in logs, traces, exports, tool-call logs
- **Privacy and retention**: Classification, retention enforcement, safe export surfaces everywhere
- **Quality gates**: Evaluations and promotion gates for models and agent templates
- **Operational hardening cadence**: Define when repository-wide refactor and sanity gates happen and what they must cover
- **CI determinism**: Flaky tests and nondeterministic builds are treated as blocking issues for gate modules

[non-goals]
- No domain-specific rules or product-specific policies
- No architectural rewrite of existing modules

[acceptance criteria]
- Constitution changes are small, explicit, and referenceable by review and accept phases
- Checklist alignment: gate modules must reference the updated constitution sections
- No breaking changes introduced solely by constitution text changes

---

## Platform — Fase 13: Core v1 Hardening & Quality Gates

### 32. P01 – Repository Sanity Check Gate (Core v1)

**Doel**
Korte stabilisatie- en opschoonsprint na de eerste complete core, inclusief demo-shell smoke checks.

**Waarom agnostisch**
Repo-hygiëne en engineering-kwaliteit, geen productlogica.

**Wat moet er gebeuren**
- Repo-brede sanity run: lint, type checks, tests, security scans
- Demo shell smoke journeys draaien als contract-check
- Dead code, duplicatie en inconsistenties opruimen
- Module boundaries controleren en documenteren
- Flaky tests fixen en CI determinisme verbeteren
- Kleine refactor backlog (max 1–2 WPs) uitvoeren

**Specify Prompt**

/spec-kitty.specify feature=P01-repository-sanity-check-core-v1

[feature summary]
Stabilise and refactor the repository after Core v1 to ensure consistency, maintainability, deterministic CI, and working demo-shell smoke flows.

[goals and non-goals]
Goals:
- Keep CI green and deterministic
- Reduce duplication and improve boundaries
- Keep demo shell smoke flows working

Non-goals:
- Add new platform capabilities
- Large architectural rewrites

[key user stories]
- As a maintainer, I trust the repo before adding new platform fases.
- As a reviewer, I can confirm integration behaviour quickly via the demo.

[constraints and assumptions]
- Must align with the updated constitution
- Changes must be small, reviewable, and test-backed

---

### 33. P02 – Testing & Coverage Gate (Core v1)

**Doel**
Verhoog test coverage en elimineer kritieke gaps voordat nieuwe platform-fases starten.

**Waarom agnostisch**
Test-kwaliteit is een platformfundament, niet domein-specifiek.

**Wat moet er gebeuren**
- Coverage target: ≥90% voor B01-B21 core modules, ≥85% voor F01-F10
- Identificeer en fix kritieke test gaps (auth, ACL, audit, transactions)
- Voeg edge-case tests toe voor multi-tenancy scenarios
- Regression tests voor alle bekende bugs/fixes
- Integration tests voor cross-module flows
- Demo shell smoke tests als CI gate

**Specify Prompt**

/spec-kitty.specify feature=P02-testing-coverage-gate-core-v1

[feature summary]
Achieve comprehensive test coverage across Core v1 modules to ensure stability before adding new platform capabilities.

[goals and non-goals]
Goals:
- Reach ≥90% coverage for backend core, ≥85% for frontend
- Cover critical multi-tenancy and security scenarios
- Establish regression test suite for known issues

Non-goals:
- Achieve 100% coverage at all costs
- Add tests for experimental or deprecated code

[key user stories]
- As a maintainer, I trust core modules won't regress when adding features.
- As a reviewer, I can verify behaviour via comprehensive test suite.

[constraints and assumptions]
- Must not break existing functionality
- Tests must be fast and deterministic
- Coverage reports integrated in CI

---

### 34. P03 – ACL & Security Refactor Gate (Core v1)

**Doel**
Herijking van permissions, tenancy-scoping en security-randen, gevalideerd via demo-shell scenario’s.

**Waarom agnostisch**
Tenant-isolatie en consistente denial-behaviour zijn platformfundamenten.

**Wat moet er gebeuren**
- Tenant-scoping sanity check (org, project, leakage risico’s)
- Consistentie in permission evaluation en 403/404 strategie
- Demo shell: permissions probe en denial UX valideren
- Test coverage upgrade voor kritieke auth/ACL flows
- Performance sanity op hot paths (N+1, query patterns)
- Golden path docs voor auth + context + ACL

**Specify Prompt**

/spec-kitty.specify feature=P03-acl-security-refactor-core-v1

[feature summary]
Perform an ACL and security hardening pass to prevent cross-tenant leakage and permission drift, validated via demo-shell scenarios.

[goals and non-goals]
Goals:
- Confirm tenant isolation and consistent denial behaviour
- Improve tests and performance on permission hot paths
- Keep demo shell permission scenarios correct

Non-goals:
- Introduce new authorization features
- Replace the existing ACL model

[key user stories]
- As security, I can verify isolation with confidence.
- As a developer, I can apply one clear permission pattern everywhere.

[constraints and assumptions]
- Backward compatible unless explicitly documented
- CI must remain green throughout

---

### 35. P04 – Release Readiness & Operational Hardening (Core v1)

**Doel**
Eind-tot-eind readiness check voor observability, deploy, docs en DX, met demo-shell „works as written”.

**Waarom agnostisch**
Operationalisatie en adoptie-kwaliteit zijn platformwaarden voor elk downstream product.

**Wat moet er gebeuren**
- End-to-end sanity: API, tasks, notifications, observability, docs werken samen
- Demo shell als snelle acceptatie-check voor kernflows
- Dependency en security scan cleanup (pinning, policies, false positives)
- Cross-module integration points vereenvoudigen (service boundaries, adapters)
- Docs “works as written” valideren met scripts/tests
- Release discipline: changelog, tags, versioning afspraken

**Specify Prompt**

/spec-kitty.specify feature=P04-release-readiness-operational-hardening-core-v1

[feature summary]
Hardening gate to ensure the Core v1 platform is operationally ready, documented, stable for downstream adoption, and validated via demo-shell smoke flows.

[goals and non-goals]
Goals:
- Validate end-to-end workflows and operational hooks
- Improve DX and documentation reliability
- Keep demo shell aligned with documented integration patterns

Non-goals:
- Add new core features
- Large-scale rewrites

[key user stories]
- As a downstream team, I can adopt Core v1 with minimal surprises.
- As an operator, I can diagnose failures quickly.

[constraints and assumptions]
- Must align with the updated constitution and checklists
- Prefer small refactors with clear rollback strategy

---

## Backend — Fase 14: Data Foundations

### 36. D01 – Data Assets & Catalog

**Doel**
Catalogus voor data assets met metadata, ownership en lifecycle, scoped op org en project.

**Waarom agnostisch**
Metadata en governance zijn universeel; geen domeininhoud in de Core.

**Wat moet er gebeuren**
- DataAsset model met owner, tags, source, status
- Sensitivity en retention labels (koppelt met policies)
- Tenant scoping en ACL enforcement
- API endpoints (list, detail, search, lifecycle)
- Audit events en basis admin beheer

**Specify Prompt**

/spec-kitty.specify feature=D01-data-assets-catalog

[feature summary]
Introduce a tenant-scoped Data Assets Catalog to register datasets/resources with governance metadata and lifecycle.

[goals and non-goals]
Goals:
- Reusable metadata layer for data-like resources
- Lifecycle management and discoverability

Non-goals:
- Store domain-specific schemas or business meaning
- Build a warehouse/BI system

[key user stories]
- As an admin, I can register datasets used across products.
- As an auditor, I can trace metadata changes.

[constraints and assumptions]
- Org/project scoped with centralized ACL evaluation
- Stores references and metadata only

---

### 37. D02 – Ingestion & Connectors (Light)

**Doel**
Definieer ingests en runs (file, webhook, schedule) met status, fouten en retries.

**Waarom agnostisch**
Orchestratie is herbruikbaar; inhoudelijke ETL blijft downstream.

**Wat moet er gebeuren**
- ConnectorDefinition en IngestionRun modellen
- Triggers: file drop, webhook, scheduled pull
- Async execution en retries via job patterns
- Observability hooks en audit events
- Credential references via D08

**Specify Prompt**

/spec-kitty.specify feature=D02-ingestion-connectors-light

[feature summary]
Provide a lightweight ingestion framework to define and run connector-based imports with consistent run tracking.

[goals and non-goals]
Goals:
- Standardise run status, retries, timings, errors
- Support common intake modes

Non-goals:
- Full ETL designer or transformation engine
- Vendor-specific pipelines in core

[key user stories]
- As an operator, I can see why an import failed and retry safely.
- As a product team, I can plug in connectors without core rewrites.

[constraints and assumptions]
- Secrets handled via D08 references
- Must be safe and tenant-isolated by default

---

### 38. D03 – Data Quality & Validation

**Doel**
Configureerbare kwaliteitschecks met resultaten per ingest run.

**Waarom agnostisch**
Validatiepatronen zijn generiek; regels zijn configuratie.

**Wat moet er gebeuren**
- RuleSet en Rule modellen (nulls, ranges, schema)
- Execution gekoppeld aan ingestion runs en assets
- Resultaten opslaan (pass/warn/fail) met details
- Policies: block vs warn
- Metrics en audit voor failures

**Specify Prompt**

/spec-kitty.specify feature=D03-data-quality-validation

[feature summary]
Add configurable data quality validation that runs alongside ingestion and asset workflows and produces auditable results.

[goals and non-goals]
Goals:
- Reusable validation patterns and clear outcomes
- Policy-driven blocking vs warning

Non-goals:
- Domain-specific correctness rules in core
- Full data observability platform

[key user stories]
- As a user, I get clear feedback when data fails validation.
- As an operator, I can monitor recurring failures.

[constraints and assumptions]
- Integrates with D02 run lifecycle and D01 assets
- Must be performant and fail-safe

---

### 39. D04 – Schema Registry & Data Contracts

**Doel**
Versiebeheer van schema’s en contracts met compatibiliteitschecks.

**Waarom agnostisch**
Contractbeheer is infrastructuur rond datastromen, niet domeinlogica.

**Wat moet er gebeuren**
- Schema versions en status (draft, active, deprecated)
- Compatibiliteitsregels (backward/forward/full)
- Koppeling naar assets en ingestion checks
- Documenteer contract lifecycle
- Consumer API voor schema discovery

**Specify Prompt**

/spec-kitty.specify feature=D04-schema-registry-data-contracts

[feature summary]
Introduce schema and data contract versioning to manage change safely across ingestion and consumers.

[goals and non-goals]
Goals:
- Versioned contracts and compatibility checks
- Prevent breaking changes across products

Non-goals:
- Enforce one data format everywhere
- Replace enterprise schema registry products

[key user stories]
- As a producer, I can publish a new schema version safely.
- As a consumer, I can discover the active contract quickly.

[constraints and assumptions]
- Tenant scoped and permission governed
- Format-agnostic via adapters

---

### 40. D05 – Lineage & Provenance

**Doel**
Lineage vastleggen tussen inputs en outputs (datasets, reports, models, agents).

**Waarom agnostisch**
Herkomstregistratie is governance en auditability.

**Wat moet er gebeuren**
- LineageEdge model (input_ref, output_ref, type, actor, timestamp)
- Integratiepunten in ingestion, reports en model/agent lifecycle
- Query endpoints: upstream, downstream, impact analysis
- Audit logging voor lineage updates
- Metrics voor lineage capture coverage

**Specify Prompt**

/spec-kitty.specify feature=D05-lineage-provenance

[feature summary]
Add a generic lineage graph to track provenance across ingestion, reporting, and ML/agent artifacts.

[goals and non-goals]
Goals:
- Traceability and impact analysis
- Consistent, auditable lineage capture

Non-goals:
- Full graph analytics engine
- Automatic SQL lineage inference without adapters

[key user stories]
- As an auditor, I can trace origins of outputs.
- As a developer, I can register lineage from my workflows.

[constraints and assumptions]
- Reference-based, not content-based
- Must fail-safe without breaking flows

---

### 41. D06 – Privacy, Retention & Access Policies

**Doel**
Policies voor classificatie, retention, masking en veilige export/logging.

**Waarom agnostisch**
Privacy en retention zijn universele platformeisen.

**Wat moet er gebeuren**
- Policy modellen voor classification, retention en masking
- Retention scheduler (archive/purge) met bewijsbare logs
- Redaction hooks voor logs, exports en tool-call traces
- Integratie met ACL en audit
- Defaults + override pattern documenteren

**Specify Prompt**

/spec-kitty.specify feature=D06-privacy-retention-access-policies

[feature summary]
Provide tenant-scoped privacy and retention policies with masking/redaction across data and agent surfaces.

[goals and non-goals]
Goals:
- Centralise retention and masking rules
- Prevent sensitive leakage by default

Non-goals:
- Replace legal/compliance tooling
- Hardcode industry-specific privacy categories

[key user stories]
- As compliance, I can enforce retention and masking consistently.
- As a user, I see masked content where required.

[constraints and assumptions]
- Must apply to exports and logs everywhere
- Safe-by-default redaction

---

### 42. D07 – Webhooks & Outbox Events

**Doel**
Betrouwbare outbox en webhooks met retries, signing en replay.

**Waarom agnostisch**
Eventing is een generiek patroon voor plugbare integraties.

**Wat moet er gebeuren**
- Outbox model + delivery worker (idempotent)
- Webhook subscriptions per tenant met signing
- Retry, dead-letter en replay tooling
- Baseline event types (ingest.completed, report.ready, model.released, agent.run.completed)
- Observability + audit voor deliveries

**Specify Prompt**

/spec-kitty.specify feature=D07-webhooks-outbox-events

[feature summary]
Implement a reliable outbox and webhook delivery mechanism for integrations and platform extensibility.

[goals and non-goals]
Goals:
- Reliable, auditable, replayable delivery
- Safe defaults (signing, retries, backoff)

Non-goals:
- Replace message brokers
- Streaming semantics beyond webhooks

[key user stories]
- As an integrator, I can subscribe to events and verify signatures.
- As an operator, I can replay failed deliveries safely.

[constraints and assumptions]
- Signing secrets via D08 references
- Must be tenant scoped and permission governed

---

### 43. D08 – Secrets & External Credentials Management

**Doel**
Credential governance (scopes, rotatie, audit) zonder zelf een vault te worden.

**Waarom agnostisch**
Iedere integratie heeft secrets; veilige omgang is platformbreed herbruikbaar.

**Wat moet er gebeuren**
- Credential model (type, scope, owner, expiry, status)
- Encryptie at rest en redaction by default
- Rotatie flow en expiratie signalen
- Integraties met connectors en webhooks
- Tests voor access control en redaction

**Specify Prompt**

/spec-kitty.specify feature=D08-secrets-credentials-management

[feature summary]
Add a secure, auditable credentials layer for external integrations with scoped access and rotation support.

[goals and non-goals]
Goals:
- Prevent accidental secret leakage
- Enable rotation and auditing

Non-goals:
- Full vault replacement
- Secret distribution system

[key user stories]
- As an admin, I can rotate a key without breaking flows.
- As security, I can audit credential changes and access.

[constraints and assumptions]
- Must integrate with centralized ACL evaluation
- Redact secrets in all logs and responses

---

## 📋 Constitution Update Gate (Post Data Foundations)

**Doel**

Update constitution.md to formalize data governance principles now that core data infrastructure (B15 exports, B16 lineage, B17 webhooks, B18 event bus, B19 batch jobs, B20 cron scheduling, B21 lifecycle hooks, D15 notification routing, I01 connector SDK, D08 secrets) is in place and before analytics/ML modules (D09-D16) depend on it.

**Waarom nu**

Data Foundations (modules 35-42) are complete: exports, lineage, webhooks, event bus, batch processing, cron scheduling, lifecycle hooks, notification routing, connector SDK, and secrets management. Next phase (Analytics & Reporting, modules 44-47) will generate insights from this data, and ML & Agent Governance (modules 48-50) will consume/transform it. We must formalize data governance *now* to prevent privacy leaks, retention violations, and compliance gaps before analytics and ML start operating on production data.

**Wat moet er gebeuren**

Add or sharpen these 7 core principles in constitution.md:

1. **Privacy Classification Everywhere**: All data must have a privacy tier (public, internal, sensitive, restricted). Enforcement at query, export, and logging boundaries.
2. **Retention Policies by Default**: Every data asset (tables, events, exports, webhook payloads) must declare retention. Automated purges per classification.
3. **Lineage Capture**: B16 lineage tracking is mandatory for all transformations, exports, and cross-tenant data flows. Impact analysis before schema changes.
4. **Export Safety and Redaction Hooks**: B15 exports must redact sensitive fields by default. Explicit opt-in for full data exports with audit logging.
5. **Masking in Logs and Observability**: All logs, traces, and webhook payloads must mask PII/secrets by default (aligns with Gate 31.5 redaction principle).
6. **Schema Contract Versioning**: Breaking schema changes require versioning and deprecation notices. Connectors and webhooks must declare supported versions.
7. **Webhook Signing and Replay Safety**: All outbound webhooks (D07) must be signed (HMAC-SHA256) with replay protection (timestamp validation). Secrets via D08.

**Constitution Prompt**

```
/spec-kitty.constitution update-post-data-foundations

[project summary]
Django-core platform with completed data foundations (exports, lineage, webhooks, event bus, batch jobs, cron scheduling, lifecycle hooks, notification routing, connector SDK, secrets management). Next: analytics, reporting, ML, and agent modules will generate insights and transformations. We need to formalize data governance principles now to prevent privacy leaks, retention violations, and compliance gaps.

[core principles to add or sharpen]
- Privacy Classification Everywhere: All data must have a privacy tier (public, internal, sensitive, restricted). Enforcement at query, export, and logging boundaries. No unclassified data in production.
- Retention Policies by Default: Every data asset (tables, events, exports, webhook payloads) must declare retention period. Automated purges per classification tier. No indefinite storage without explicit justification.
- Lineage Capture: B16 lineage tracking is mandatory for all transformations, exports, cross-tenant data flows. Impact analysis required before schema changes. Lineage visible in admin UI.
- Export Safety and Redaction Hooks: B15 exports must redact sensitive fields by default. Explicit opt-in for full data exports with audit logging (B09). Export formats include redaction metadata.
- Masking in Logs and Observability: All logs, traces, webhook payloads must mask PII/secrets by default (aligns with Gate 31.5 redaction principle). Structured logging with field-level classification.
- Schema Contract Versioning: Breaking schema changes require versioning and deprecation notices. Connectors (I01) and webhooks (B17) must declare supported versions. Migrations include backward-compatibility period.
- Webhook Signing and Replay Safety: All outbound webhooks must be signed (HMAC-SHA256) with replay protection (timestamp validation). Secrets via D08. Recipients verify signatures before processing.

[non-goals]
- Full DLP (Data Loss Prevention) suite - we rely on infrastructure controls
- Legal compliance automation - classification informs compliance but doesn't guarantee it
- Multi-region data residency - classification supports it but infrastructure handles enforcement

[acceptance criteria]
- Constitution section "Data Governance" exists with all 7 principles
- Each principle has enforcement guidance (where/how/when checked)
- Examples reference B15/B16/B17/B18/D08 modules
- Cross-references to Gate 31.5 redaction principle
- Checklist for data module implementations (D01-D16, I01-I02)
```

---

## Backend — Fase 15: Analytics & Reporting Capabilities

### 44. D09 – Analytics Events & Metrics (Product Analytics)

**Doel**
Event-schema en opslag voor product events, met export en privacy guardrails.

**Waarom agnostisch**
Events zijn generieke bouwstenen; dashboards blijven downstream.

**Wat moet er gebeuren**
- Event ingest endpoint(s) met tenant scoping
- PII guardrails via policies
- Retention en export endpoints (batch)
- Observability: volume/latency/errors
- Audit trail voor export en config wijzigingen

**Specify Prompt**

/spec-kitty.specify feature=D09-analytics-events-metrics

[feature summary]
Provide a generic product analytics events pipeline for capturing and exporting events safely.

[goals and non-goals]
Goals:
- Consistent event capture with governance
- Export for downstream analysis

Non-goals:
- Dashboards or KPI definitions in core

[key user stories]
- As a product owner, I capture consistent events across apps.
- As compliance, I control fields and retention.

[constraints and assumptions]
- Integrates with D06 retention/masking
- Low overhead on user flows

---

### 45. D10 – Saved Queries & Reports

**Doel**
Opslag van report definities met parameters, scheduling en export artifacts via adapters.

**Waarom agnostisch**
Core levert governance en workflow; execution engine is pluggable.

**Wat moet er gebeuren**
- Report definitions + parameters + permissions
- Run tracking (status, outputs, retries)
- Scheduling integratie
- Execution adapter interface
- Exports respecteren policies en audit

**Specify Prompt**

/spec-kitty.specify feature=D10-saved-queries-reports

[feature summary]
Introduce scheduled reports with parameterisation, run tracking, and export artifacts via pluggable execution adapters.

[goals and non-goals]
Goals:
- Reusable reporting workflow across products
- Pluggable execution backends

Non-goals:
- BI UI or complex visualisations in core

[key user stories]
- As an admin, I schedule a recurring report with parameters.
- As a user, I download the latest output safely.

[constraints and assumptions]
- Uses job patterns and observability standards
- Exports must respect D06 policies

---

## Backend — Fase 16: DS & ML Governance

### 46. D11 – Experiment Tracking (Runs)

**Doel**
Run tracking voor experiments: params, metrics en artifact references, gekoppeld aan assets en lineage.

**Waarom agnostisch**
Reproduceerbaarheid is generiek; compute en frameworks blijven extern.

**Wat moet er gebeuren**
- ExperimentRun model + artifact references
- API voor log_params/log_metrics/attach_artifact
- Koppeling aan assets en lineage
- Tenant scoping + ACL
- Retention en export hooks

**Specify Prompt**

/spec-kitty.specify feature=D11-experiment-tracking-runs

[feature summary]
Add experiment run tracking with metrics, parameters, and artifact references linked to assets and lineage.

[goals and non-goals]
Goals:
- Reproducible, auditable run history
- Artifact references without storing binaries

Non-goals:
- Notebook environments or compute execution

[key user stories]
- As a data scientist, I log runs and compare results over time.
- As an auditor, I trace who ran what and when.

[constraints and assumptions]
- Tenant scoped with centralized permissions
- References only for large artifacts

---

### 47. D12 – Model Registry & Releases

**Doel**
Modelversies beheren met stages, approvals, rollbacks en rollout metadata.

**Waarom agnostisch**
Registratie en governance zijn generiek; model payload blijft pointer-based.

**Wat moet er gebeuren**
- Model + ModelVersion + stage transitions
- Approval en promotion hooks met audit trail
- Link naar evaluation en lineage
- Controlled rollout hooks (bijv. feature flags)
- Consumer API voor current prod version

**Specify Prompt**

/spec-kitty.specify feature=D12-model-registry-releases

[feature summary]
Introduce a model registry with versioning, staging, approvals, and controlled release workflows.

[goals and non-goals]
Goals:
- Safe promotions with auditability
- Reliable “current production” references

Non-goals:
- Inference serving inside core
- Framework lock-in

[key user stories]
- As an ML lead, I promote models safely with approvals.
- As a developer, I fetch the current prod model reference reliably.

[constraints and assumptions]
- Integrates with evaluation and audit
- Must remain vendor/framework agnostic

---

### 48. D13 – Compute Job Runner (Training, Batch Inference)

**Doel**
Generiek jobtype voor zware compute-runs via adapters, met status, retries en resource hints.

**Waarom agnostisch**
Orchestratie is platform; uitvoering draait extern.

**Wat moet er gebeuren**
- Compute job spec + run tracking
- Execution adapter interface
- Retries, cancellation, idempotency
- Observability: queue time, latency, failures
- Credential access via D08 references

**Specify Prompt**

/spec-kitty.specify feature=D13-compute-job-runner

[feature summary]
Provide a compute job abstraction for training and batch inference, executed via adapters with reliable tracking.

[goals and non-goals]
Goals:
- Standardise heavy job orchestration and monitoring
- Pluggable execution backends

Non-goals:
- Cluster scheduling logic in core
- Replace workflow engines

[key user stories]
- As an operator, I see which jobs run and why they fail.
- As a developer, I plug in an external runner adapter.

[constraints and assumptions]
- Must enforce tenant isolation
- Must be observable and fail-safe

---

## Backend — Fase 17: Agent Runtime Governance

### 49. D14 – Agent Operations (AI Agents)

**Doel**
Control plane voor agent runs: templates, sessions, tool-call logs, policies en rate limits.

**Waarom agnostisch**
Governance rond agents is generiek en provider-onafhankelijk.

**Wat moet er gebeuren**
- PromptTemplate registry met versiebeheer
- AgentRun sessions met tool-call logging en redaction
- Policy engine per context en rol
- Rate limiting en budget hooks
- Audit trail en metrics voor agent runs

**Specify Prompt**

/spec-kitty.specify feature=D14-agent-operations

[feature summary]
Add a vendor-agnostic agent operations control plane: templates, sessions, tool-call logs, and policy enforcement.

[goals and non-goals]
Goals:
- Traceable, governed agent activity
- Safe template rollouts and rollbacks

Non-goals:
- Build a proprietary agent framework
- Hard-code one LLM provider

[key user stories]
- As security, I can restrict what agents may do per tenant and role.
- As an admin, I can audit agent tool usage.

[constraints and assumptions]
- Redact sensitive content by default
- Integrates with centralized permissions and audit

---

### 50. D15 – Vector Search & Retrieval Adapter

**Doel**
Adapterlaag voor embeddings en vector search (RAG/semantic search), tenant-scoped.

**Waarom agnostisch**
Retrieval is capability; Core blijft adapter-only en voorkomt lock-in.

**Wat moet er gebeuren**
- Interfaces voor embed/index/search/delete
- Tenant namespaces en lifecycle integratie
- Policy checks en redaction voor index inputs
- Observability voor latency/errors/usage
- Documentatie en example adapter contract

**Specify Prompt**

/spec-kitty.specify feature=D15-vector-search-retrieval-adapter

[feature summary]
Provide a vendor-agnostic retrieval adapter for embeddings and vector search with tenant isolation and policy enforcement.

[goals and non-goals]
Goals:
- Enable RAG via swappable backends
- Prevent sensitive data leakage into indices

Non-goals:
- Bundle a specific vector database
- Advanced ranking features beyond adapter scope

[key user stories]
- As a developer, I can switch vector backends without rewrites.
- As security, I can control what content is indexable.

[constraints and assumptions]
- Integrates with privacy policies and retention rules
- Must respect centralized permissions

---

### 51. D16 – Evaluation & Monitoring (Models & Agents)

**Doel**
Evaluatiesets, regressie checks en quality gates voor model- en agentversies.

**Waarom agnostisch**
Kwaliteitsborging is generiek; evaluatiecontent is configureerbaar.

**Wat moet er gebeuren**
- EvaluationSuite en EvaluationRun modellen
- Quality gates voor model promotions en template releases
- Baseline monitoring hooks (quality/drift signals)
- Audit logging voor promotions en failures
- API voor evaluation status en reports

**Specify Prompt**

/spec-kitty.specify feature=D16-evaluation-monitoring

[feature summary]
Introduce evaluation suites and quality gates for models and agent templates to prevent regressions.

[goals and non-goals]
Goals:
- Repeatable evaluations with scored outcomes
- Gate promotions based on policies and thresholds

Non-goals:
- Full MLOps monitoring product
- One mandatory evaluation methodology

[key user stories]
- As an ML lead, I block promotion if evaluation regresses.
- As a product team, I run lightweight agent template regressions.

[constraints and assumptions]
- Integrates with model registry and agent operations
- Extensible evaluators via adapters

---

## 📋 Constitution Update Gate (Post ML & Agent Governance)

**Doel**

Update constitution.md to formalize ML and Agent governance principles now that core ML/Agent infrastructure (D12 model registry, D13 prompt templates, D14 agent operations, D11 prompt experiments, D13 agent job scheduling, D15 vector search, D06 structured output validation, D07 tool-call logging, D15 RAG pipelines, D16 evaluation & monitoring) is in place and before integration ecosystem (I01-I02) and platform extensions (P01-P04, O01) depend on it.

**Waarom nu**

ML & Agent Governance (modules 48-50) are complete: model registry, prompt templates, agent operations, prompt experiments, agent job scheduling, vector search, structured output validation, tool-call logging, RAG pipelines, and evaluation/monitoring. Next phase (Integration Ecosystem, modules 52-53) will expose connectors and data ingestion that may invoke models/agents, and Platform Extensions (modules 54-56) will add billing and advanced features. We must formalize ML/Agent governance *now* to prevent quality regressions, privacy leaks via tool calls, and uncontrolled model usage before external integrations and billing start operating.

**Wat moet er gebeuren**

Add or sharpen these 7 core principles in constitution.md:

1. **Evaluation Gates for Model Promotions**: No model/agent template promotion without passing D16 evaluation suite. Quality thresholds configurable per use case.
2. **Agent Template Versioning and Approvals**: All prompt templates (D13) must be versioned. Production agent templates require approval workflow with audit trail (B09).
3. **Vector Search Privacy and Tenant Isolation**: D15 vector embeddings must respect tenant boundaries and privacy classification (from Gate 42.5). No cross-tenant leakage in similarity search.
4. **Tool-Call Logging with Redaction**: D07 tool-call logs must redact sensitive parameters by default (aligns with Gate 31.5 and 42.5 redaction principles). Full logs only in secure audit contexts.
5. **Model Registry Stage Transitions**: D12 model registry enforces stage gates (dev→staging→production). No direct production deployments without staging validation.
6. **Compute Job Resource Policies**: D13 agent job scheduling must enforce resource limits (CPU, memory, timeout) per tenant and job type. Prevent runaway compute costs.
7. **Quality Monitoring and Drift Detection**: D16 evaluation monitoring must run continuously in production. Alert on quality degradation or distribution drift before user impact.

**Constitution Prompt**

```
/spec-kitty.constitution update-post-ml-agent-governance

[project summary]
Django-core platform with completed ML & Agent Governance modules (model registry, prompt templates, agent operations, prompt experiments, agent job scheduling, vector search, structured output validation, tool-call logging, RAG pipelines, evaluation/monitoring). Next: integration ecosystem (connectors, data ingestion) and platform extensions (billing, advanced features) will expose models/agents to external systems. We need to formalize ML/Agent governance principles now to prevent quality regressions, privacy leaks via tool calls, and uncontrolled compute costs.

[core principles to add or sharpen]
- Evaluation Gates for Model Promotions: No model/agent template promotion without passing D16 evaluation suite. Quality thresholds configurable per use case. Regressions block deployment.
- Agent Template Versioning and Approvals: All prompt templates (D13) must be versioned with semantic versioning. Production agent templates require approval workflow with audit trail (B09). No cowboy deployments.
- Vector Search Privacy and Tenant Isolation: D15 vector embeddings must respect tenant boundaries and privacy classification (from Gate 42.5). No cross-tenant leakage in similarity search. Embeddings inherit data classification.
- Tool-Call Logging with Redaction: D07 tool-call logs must redact sensitive parameters by default (aligns with Gate 31.5 and 42.5 redaction principles). Full logs only in secure audit contexts with explicit permission.
- Model Registry Stage Transitions: D12 model registry enforces stage gates (dev→staging→production). No direct production deployments without staging validation. Rollback procedures documented.
- Compute Job Resource Policies: D13 agent job scheduling must enforce resource limits (CPU, memory, timeout) per tenant and job type. Prevent runaway compute costs. Quotas in billing (P01).
- Quality Monitoring and Drift Detection: D16 evaluation monitoring must run continuously in production. Alert on quality degradation or distribution drift before user impact. Automated rollback on severe regressions.

[non-goals]
- Full MLOps platform - we integrate with existing tools
- One-size-fits-all evaluation methodology - evaluators are pluggable
- Real-time drift detection - batch monitoring is sufficient for most use cases

[acceptance criteria]
- Constitution section "ML & Agent Governance" exists with all 7 principles
- Each principle has enforcement guidance (where/how/when checked)
- Examples reference D12/D13/D14/D04/D05/D07/D15/D16 modules
- Cross-references to Gate 31.5 (redaction) and Gate 42.5 (privacy classification)
- Checklist for ML/Agent module implementations
- Integration with billing (P01) for compute quotas
```

---

## Backend — Fase 18: Integratie Ecosysteem

### 52. I01 – Connector SDK & Marketplace Registry

**Doel**
Standaard contract om connectors te beschrijven, te versionen en te registreren.

**Waarom agnostisch**
Connectors zijn integratiebouwstenen; Core borgt governance en compatibiliteit.

**Wat moet er gebeuren**
- Connector manifest schema en registry endpoints
- Capability model (pull, push, webhook, file intake)
- Health checks en smoke-test hooks
- Integratie met D08 credentials en D02 ingestion
- Documentatie en minimaal voorbeeldconnector contract

**Specify Prompt**

/spec-kitty.specify feature=I01-connector-sdk-marketplace-registry

[feature summary]
Provide a connector SDK contract and registry for managing integration connectors safely across tenants.

[goals and non-goals]
Goals:
- Standardise connector manifests and capabilities
- Enable governance, versioning, and health checks

Non-goals:
- Ship many vendor connectors in core
- Full marketplace UI or commercial flows

[key user stories]
- As a developer, I register a connector with a clear capability contract.
- As an operator, I verify connector health and troubleshoot failures.

[constraints and assumptions]
- Must enforce tenant isolation and permissions
- Credentials handled via D08 references

---

### 53. I02 – Compliance Exports (Audit, DSAR, Evidence Packs)

**Doel**
Gestandaardiseerde exports voor compliance: audit bundles, config snapshots en evidence packs.

**Waarom agnostisch**
Compliance exportpatronen zijn generiek en herbruikbaar.

**Wat moet er gebeuren**
- Export job definitions en artifact references
- Templates voor audit export en evidence packs
- Masking/redaction via D06 policies
- Approval hooks en secure access control
- Testfixtures en docs voor compliance flows

**Specify Prompt**

/spec-kitty.specify feature=I02-compliance-exports

[feature summary]
Provide standardized compliance exports with policy-driven masking and auditable access controls.

[goals and non-goals]
Goals:
- Repeatable, auditable exports for compliance needs
- Ensure privacy policies are respected in every export

Non-goals:
- Replace legal/compliance management systems
- Industry-specific compliance logic hardcoded in core

[key user stories]
- As compliance, I generate an evidence pack for audits.
- As an admin, I approve and control access to sensitive exports.

[constraints and assumptions]
- Tenant scoped and permission controlled
- Exports must be safe-by-default with redaction

---

## Frontend — Fase 18: Integration & Operations

### 54. F11 – Ops Console UI (Jobs, Imports, Runs, Agents)

**Doel**
Neutrale beheer UI om runs, failures, retries, logs en ownership te bekijken over modules heen.

**Waarom agnostisch**
Operators hebben overal dezelfde behoefte aan status en acties.

**Wat moet er gebeuren**
- Overzichtspagina’s voor ingests, jobs, reports, experiments, models en agent runs
- Detailpagina’s met status, timings, errors en acties (retry/cancel)
- Filters op tenant, project, owner, status en tijd
- Integratie met design system en layouts
- Frontend tests voor list → detail → actie flows

**Specify Prompt**

/spec-kitty.specify feature=F11-ops-console-ui

[feature summary]
Provide a generic Ops Console UI to inspect and operate imports, jobs, reports, experiments, model releases, and agent runs.

[goals and non-goals]
Goals:
- Operational visibility across multiple backend modules
- Safe operator actions with clear confirmations

Non-goals:
- Replace full observability dashboards
- Provide product-specific analytics

[key user stories]
- As an operator, I quickly find failed runs and retry safely.
- As an admin, I filter by tenant and see what needs attention.

[constraints and assumptions]
- Must show redacted logs and respect privacy policies
- Must enforce backend permissions strictly

---

## Frontend — Fase 19: Platform Hardening & Extensions

### 55. F12 – Frontend Packaging & Integration Hardening

**Doel**
Stabiliseer packages, builds, tests en backend-contracts na ops-console en extensions UI.

**Waarom agnostisch**
Package-consistentie en contract-stabiliteit zijn platformbreed herbruikbaar.

**Wat moet er gebeuren**
- Build/publish sanity: exports, types, versioning, peer deps
- Contract check met backend (auth, context, permissions, errors)
- Flaky tests en performance regressies fixen
- A11y polish op kernflows en ops flows
- Integratie-docs bijwerken voor downstream adoptie

**Specify Prompt**

/spec-kitty.specify feature=F12-frontend-packaging-integration-hardening

[feature summary]
Stabilise the frontend package ecosystem and backend integration contracts for reliable downstream adoption.

[goals and non-goals]
Goals:
- Consistent builds, exports, and type safety across packages
- Verified integration contracts with core backend APIs

Non-goals:
- Introduce new frontend feature modules
- Rebuild the design system

[key user stories]
- As a downstream team, I can adopt packages without build surprises.
- As a developer, I trust contract behaviour across updates.

[constraints and assumptions]
- Must follow established design system and accessibility rules
- Must avoid breaking changes unless clearly documented

---

## Platform — Fase 19: Platform Hardening & Extensions (continued)

### 56. O01 – Platform Extensions Sanity & Refactor (Post D01–D08)

**Doel**
Consolideer en harden de extension-modules: policies, adapters, run tracking, lineage en exports.

**Waarom agnostisch**
Borgt dat de control plane stabiel blijft, zonder lock-in en zonder data-leakage.

**Wat moet er gebeuren**
- Boundary check: core vs adapters (geen vendor lock-in)
- Policy/redaction sanity op logs, exports, tool-call traces
- Run tracking consistentie over ingest, reports, experiments, agents, evaluations
- Lineage coverage sanity en dubbelingen opruimen
- Kleine refactor uitvoering (1–2 WPs) met regressietests

**Specify Prompt**

/spec-kitty.specify feature=O01-platform-extensions-hardening-gate

[feature summary]
Consolidate and harden platform extension modules to ensure consistent governance, policy enforcement, and operational behaviour.

[goals and non-goals]
Goals:
- Consistent policy and redaction behaviour everywhere
- Reduce duplication across adapters and run tracking

Non-goals:
- Add new extension capabilities
- Expand into a full analytics/MLOps platform

[key user stories]
- As security, I trust sensitive data is redacted everywhere by default.
- As a maintainer, I can extend adapters without breaking patterns.

[constraints and assumptions]
- Must keep CI green and maintain backward compatibility where feasible
- Must be observable and auditable by default
