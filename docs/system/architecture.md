# ARCHITECTURE_OVERVIEW.md

## Purpose

This document provides a high-level architecture overview of the Django Core-App.

---

## 1. Layered Architecture

The Core-App is organised in **5 major layers** spanning **68 modules** across **16 development phases**:

### Layer 1: Backend Core (B01–B21) — Fase 1-5 ✅ COMPLETE
1. **Foundation & Governance** (B01–B04) — Fase 1
2. **Identity & Multi-Tenancy** (B05–B08) — Fase 2
3. **Configuration, Audit & Transactions** (B09–B12) — Fase 3
4. **Interfaces & Communication** (B13–B17) — Fase 4
5. **Operationalisation** (B18–B21) — Fase 5

### Layer 2: Frontend Core (F01–F07, F09) — Fase 6-7 ✅ COMPLETE
6. **Design System & User Experience** (F01–F04) — Fase 6
7. **Resources & Integration** (F05–F07, F09) — Fase 7

### Layer 3: Modern Web Capabilities (B22–B28, F08, F10–F14) — Fase 8-10 🚧 ROADMAP
8. **Demo & Visual Development** (F10, B22, F08, B25, F09) — Fase 8
   - Demo shell + dev dashboard, files/media, data viz, cache, Visily.ai
9. **Real-time, Search & Workflows** (B23, B24, F13, B27, B26) — Fase 9
   - WebSocket, search, rich text, workflows, payments
10. **Advanced UI & Documents** (B28, F14, F11, F12) — Fase 10
    - PDF/Excel generation, admin panel, ops console, billing UI

### Layer 4: Data & Intelligence Platform (D01–D16) — Fase 11-13 🚧 OPTIONAL POWER-UP
11. **Data Foundations Part 1** (D01–D05) — Fase 11
    - Storage adapters, ETL, datasets, streaming, versioning
12. **Data Foundations Part 2** (D06–D10) — Fase 12
    - Validation, tool logging, experiments, evaluations, annotations
13. **ML/AI Platform** (D11–D16) — Fase 13
    - Features, models, prompts, agents, vector search, monitoring

### Layer 5: Platform Quality & Integration (P01–P05, I01–I02, O01) — Fase 14-16 🚧 LIGHTWEIGHT
14. **Platform Quality Gates** (P01–P05) — Fase 14
    - Constitutional enforcement, security audit, ML governance, integration security, dependencies
15. **Integration Ecosystem** (I01–I02) — Fase 15
    - Connector framework & SDK, compliance exports
16. **Operations & Resilience** (O01) — Fase 16
    - Resilience testing, health validation

Each module is designed to be:

- domain-agnostic
- reusable
- independently specifiable and testable

---

## 2. Core Domain Concepts

**Backend Core (B01-B21):**
- **User** (B05): authentication, custom user model
- **Organisation** (B06): multi-tenant container
- **Project / Workspace** (B07): context within organisation
- **Permissions / Roles** (B08): hierarchical access control
- **Settings & Feature Flags** (B10): scoped configuration
- **Transactions & Credits** (B11): usage tracking, billable events
- **Notifications** (B16/B17): multi-channel messaging

**Extended Capabilities (B22-B28):**
- **File & Media** (B22): upload, storage, processing (S3/Azure/local)
- **Real-time** (B23): Django Channels, WebSocket, live updates
- **Search** (B24): PostgreSQL full-text search + Elasticsearch adapter
- **Cache** (B25): Redis caching with decorators, invalidation patterns
- **Payments** (B26): Stripe/PayPal adapters, webhook handling
- **Workflows** (B27): state machine, approval flows
- **Documents** (B28): PDF/Excel generation via templates

These concepts are the building blocks for downstream products.

---

## 3. Data and Context Flow

Typical request flow:

1. User authenticates via **B05** (core accounts)
2. Request context is enriched with:
   - user identity
   - organisation and project context (**B06/B07/B08**)
3. Settings, feature flags and preferences resolved:
   - global → org → project → user (**B10, B12**)
4. Domain logic executed:
   - may record audit events (**B09**)
   - may create transactions/credits (**B11**)
   - may trigger notifications (**B16/B17**)
   - may interact with files (**B22**), cache (**B25**), workflows (**B27**), payments (**B26**)
5. Response rendered via:
   - DRF API (**B13**), and/or
   - Web-UI templates (**B14**), and/or
   - Frontend SPA using **F01–F14**
6. Real-time updates pushed via:
   - Django Channels (**B23**) WebSocket connections

---

## 4. Asynchronous and Notifications

- **Background work:**
  - queued via **B15** (tasks-scheduling) using Celery + Redis
  - monitored via **B18** (observability)
- **Notifications:**
  - created via **B16** (notifications-baseline)
  - routed via **B17** (contextual-notification-service)
  - surfaced in frontend via **F04** (notifications-hub-ui)
- **Real-time updates:**
  - Django Channels (**B23**) broadcasts live events
  - Frontend receives via WebSocket connections
  - Activity streams, presence, collaborative editing patterns

---

## 5. Frontend Integration

The frontend uses:

**Core Foundation (Fase 6-7):**
- **F01**: design system (tokens, components, vanilla-extract)
- **F02**: auth UI (login, signup, password reset)
- **F03**: multi-tenancy context switcher (org/project selection)
- **F04**: notifications hub UI
- **F05**: resource display & alerts (usage, credits, limits)
- **F06**: reusable page templates (dashboard, list, detail, settings, wizard)
- **F07**: theme support (light/dark modes, brand variants)
- **F09**: frontend-backend integration guides (auth, context, data fetching, caching, error handling)

**Extended Capabilities (Fase 8-10):**
- **F08**: data visualization components (charts, metrics, dashboards via recharts)
- **F09**: design-to-code workflow (Visily.ai-style AI design integration)
- **F10**: demo shell + development dashboard (real-time platform health, test coverage, CI status, scorecards)
- **F11**: operations console UI (monitoring jobs, imports, workflows, agent runs)
- **F12**: billing & usage UI (usage charts, buy credits flow, transaction history)
- **F13**: rich text editor component (TipTap/Quill WYSIWYG)
- **F14**: admin panel components (users/orgs/projects CRUD, bulk actions)

Frontend integration patterns are documented in [F09-frontend-backend-integration-guides](../modules/frontend/F09-frontend-backend-integration-guides.md).

---

## 6. Spec and Governance Integration

- Every module Bxx/Fxx is backed by:
  - Spec Kitty spec (`/spec-kitty.specify`)
  - plan and tasks
- The **Constitutional Enforcement Engine** (B02) ensures:
  - required files and structures exist (spec/plan/tasks/docs)
  - repo and workflow-quality rules are applied consistently

---

## 7. Extension Model

Downstream products:

- add domain-specific apps on top of the Core-App
- reuse:
  - identity and multi-tenancy (B05–B08)
  - configuration and notifications (B10, B16–B17)
  - design system and layouts (F01, F06)
  - data platform (D01–D16)
  - integration connectors (I01–I02)
- may:
  - add new modules
  - override templates
  - plug into existing APIs and events
  - extend the data catalog and ML registry

---

## 8. Module Categories (68 Total)

**B (Backend)**: 28 modules (B01–B28)
- **Core** (B01-B21): Foundation, security, identity, configuration, APIs, tasks, notifications, observability
- **Extensions** (B22-B28): Files, real-time, search, cache, payments, workflows, documents

**F (Frontend)**: 14 modules (F01–F14)
- **Core** (F01-F07, F09): Design system, auth, context, notifications, resources, templates, theme, integration guides
- **Extensions** (F08, F10-F14): Data viz, demo+dashboard, ops console, billing UI, rich text, admin panel

**P (Platform Gates)**: 5 modules (P01–P05) — Lightweight quality checks
- Constitutional enforcement, security audit (ASVS), ML governance, integration security, dependencies

**D (Data & ML Platform)**: 16 modules (D01–D16) — Optional power-up
- **Data** (D01-D10): Storage, ETL, datasets, streaming, versioning, validation, tool logging, experiments, evaluations, annotations
- **ML/AI** (D11-D16): Features, model registry, prompts, agents, vector search, monitoring

**I (Integration)**: 2 modules (I01–I02) — Lightweight
- Connector framework & SDK, compliance exports

**O (Operations)**: 1 module (O01) — Lightweight
- Resilience testing & health validation

**P (Platform Gates)**: Quality assurance modules (P01–P04) for repository sanity, testing coverage, security refactoring, and release readiness.

**D (Data & ML)**: Data platform modules (D01–D16) covering data management, ingestion, quality, analytics, ML lifecycle, and agent runtime.

**I (Integration)**: External integration modules (I01–I02) for connectors and compliance exports.

**O (Operations)**: Operational gates (O01) for platform-wide sanity checks and refactoring.

---
