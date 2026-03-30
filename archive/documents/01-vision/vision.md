# Project Vision

## 1. Mission

An **80/20 platform foundation** for modern, production-grade web applications built on Django — proven by TeamReel.

### The 80/20 Principle

**80% reusable foundation** → provided by the core platform
**20% custom business logic** → built per product

The core platform provides a comprehensive, production-ready foundation:

**Core Infrastructure:**
- **Secure multi-tenant architecture** with users → organisations → projects
- **Content & media management** with file handling (S3), processing, and AI generation
- **Real-time capabilities** with WebSockets, live updates and notifications
- **Background processing** with Celery tasks, scheduling, and queue management

**Intelligent Capabilities:**
- **AI content generation** via OpenAI and Google Generative AI
- **Video processing pipeline** via FFmpeg with platform-specific exports
- **Workflow orchestration** via LangGraph for multi-step AI tasks

**Quality & Developer Experience:**
- **Spec-Driven Development** with AI agents (Spec Kitty workflow)
- **Type-safe frontend** with TypeScript strict mode and design tokens
- **Monorepo packages** for shared functionality across frontend apps

### TeamReel: First Product Implementation

TeamReel is the first product built on this foundation, proving the 80/20 model works.

**What TeamReel adds (the 20%):**
- Sport-specific data: members, activities, participations, periods, competitions
- Brand identity system: club colors, logos, kit images, typography
- Content templates: match graphics, line-ups, social media posts
- AI-powered video generation: branded highlight reels, previews

**What the core provides (the 80%):**
- Multi-tenant organisation/project hierarchy with RBAC
- File management and S3 storage
- AI generation request/result pipeline
- Video job processing infrastructure
- Notification routing with user preferences
- Background task execution (Celery)
- Authentication, permissions, audit trail

---

## 2. Target Users

### TeamReel (current product)
- **Amateur sports clubs** needing branded content without design skills
- **Club administrators** managing teams, seasons, and member data
- **Content coordinators** generating match graphics, line-ups, and video

### Future products (80/20 model)
- **Any SaaS application** needing multi-tenant architecture, media handling, and AI capabilities
- **AI-assisted builders** using Spec Kitty and GitHub Copilot to build features
- **Development teams** wanting a production-grade Django+React foundation

---

## 3. What the Platform IS and IS NOT

### The platform **IS**
- A **production-grade multi-tenant architecture** with hierarchical access control
- A **complete content & media platform** with AI generation and video processing
- A **Spec-Driven Development platform** where AI agents build features under governance
- **Proven in production** — TeamReel runs on this foundation today

### The platform is **NOT**
- A basic SaaS starter template — it's a comprehensive production foundation
- A theoretical exercise — everything listed here is built and running
- A locked-in framework — products extend, not fork
- A replacement for cloud infrastructure — it runs on Railway/Vercel

---

## 4. Design Principles

1. **80/20 Architecture**
   - 80% of modern web app needs covered by Core-App foundation
   - 20% client-specific domain logic added as thin layer on top
   - Maximum reusability across diverse use cases (e-commerce, CRM, content, data apps)
   - Clear boundaries between platform and product

2. **Complete modern web platform**
   - **Content layer**: Rich text editing, file/media management, document generation
   - **Real-time layer**: WebSockets, live updates, activity streams, notifications
   - **Business layer**: Workflows, reporting, dashboards, credits/transactions
   - **Data layer**: Governance, cataloging, lineage, analytics, privacy enforcement
   - **Intelligence layer**: AI agents, ML operations, vector search (the enhancement, not the foundation)

3. **Design-to-code workflow**
   - Visily.ai-style wireframe-to-component pipeline
   - AI-generated designs integrate seamlessly with F01 design system
   - Rapid prototyping: describe UI → AI generates → deploy to Core-App
   - Designer-developer collaboration without friction
5. **Fully functional demo app**
   - Demo app is NOT mockups - it's a **production-ready reference implementation**
   - Complete database, seed data, pre-configured accounts
   - All features (001-068) work end-to-end for client demos
   - `docker-compose up demo` starts complete working application
   - Validates platform quality through real-world usage
5. **Security & multi-tenancy by default**
   - OWASP-ASVS baseline, brute-force protection, audit logging
   - Hierarchical tenant isolation: users → organisations → projects
   - CI-integrated security scanning and constitutional compliance checks
   - Strict vs advisory enforcement modes for different maturity stages

6. **Constitutional governance for non-programmers**
   - Constitution + Spec-Driven Development (SDD) as normative workflow
   - Constitutional Enforcement Engine prevents quality drift
   - AI agents build safely under strict governance rules
   - Every feature traceable: spec → plan → tasks → implementation → tests

7. **Modern, fast, flexible, high-quality**
   - **Modern**: Latest patterns (WebSockets, vector search, AI agents, design-to-code)
   - **Fast**: Real-time updates, async processing, optimized queries
   - **Flexible**: Domain-neutral modules adaptable to any business logic
   - **Quality**: Development dashboard with live metrics (coverage, security, performance)

8. **Progressive platform layers** (68 modules across 16 phases)
   - **Fase 1-5**: Backend core (security, multi-tenancy, APIs) — 21 modules
   - **Frontend phases 6–7** (Fase 6-7): Design system & UX → resources & integration (9 modules)
   - **Platform maturity 8–13** (Fase 8-13): Quality gates → data foundations → ML/AI → integration → hardening (25 modules)

9. **Developer Experience (DX)**
   - Predictable project structure and scaffolding CLI
   - Clear docs and examples
   - Fully functional demo app (`docker-compose up demo`) for instant validation
   - Opinionated but not suffocating: “guardrails, not walls”

---

## 5. High-Level Architecture

The Core-App is structured in **five major capability layers**, providing the 80% foundation for any modern web application:

### Layer 1: Backend Core (B01–B21) — Fase 1-5 — Foundation Infrastructure

**Foundation & Governance (B01–B04)**
- Project skeleton, security baseline, constitutional enforcement, internationalization

**Identity & Multi-Tenancy (B05–B08)**
- Users, organisations, projects/workspaces with hierarchical access control

**Configuration, Audit & Transactions (B09–B12)**
- Audit logging, feature flags, credits/usage tracking, user preferences

**Interfaces & Communication (B13–B17)**
- REST APIs, web UI baseline, background tasks, multi-channel notifications, WebSocket-ready

**Operationalisation (B18–B21)**
- Observability, deployment templates, scaffolding CLI, comprehensive docs

### Layer 2: Frontend Core (F01–F14) — Fase 6-7, 8-10 — User Experience & Interface

**Design System & UX (F01–F04)**
- Design tokens, auth flows, context switcher, notifications hub

**Resources & Integration (F05–F07, F08, F09)**
- Resource displays, page templates, theming, data visualization, frontend-backend integration guides

**Demo & Operations (F10–F14)**
- Demo shell + development dashboard, ops console UI, billing/usage UI, rich text editor, admin panel

**Design-to-Code Workflow (F09 @ Fase 8)**
- Visily.ai-style wireframe-to-component pipeline integrated early
- AI-generated designs use F01 design system tokens
- Rapid prototyping: describe UI → AI generates → deploy to Core-App
- Available from Fase 8 onward to design all future modules visually

### Layer 3: Modern Web Capabilities (B22–B28, F13) — Fase 8-10 — Content, Real-time & Business

**File & Media Management (B22)**
- Upload/download, storage adapters (S3, local, Azure), thumbnails, virus scanning

**Cache Layer (B25)**
- Redis-backed caching, decorator patterns, invalidation strategies

**Real-time Infrastructure (B23)**
- Django Channels, WebSocket support, live updates, activity streams, presence

**Full-text Search (B24)**
- PostgreSQL full-text search + optional Elasticsearch adapter

**Workflows (B27)**
- State machine patterns, approval flows, delegation

**Payments (B26)**
- Multi-gateway adapters (Stripe first, PayPal), webhook handling, transaction logging

**Documents (B28)**
- PDF/Excel generation via templates (WeasyPrint, ReportLab), reports, invoices

**Rich Text Editing (F13)**
- WYSIWYG editor (TipTap/Quill), content sanitization, markdown support

### Layer 4: Data & Intelligence Platform (D01–D16) — Fase 11-13 — Optional Power-ups

**Data Foundations (D01–D05)**
- Storage adapters, ETL pipelines, dataset management, streaming data, version control

**Data Quality & Experiments (D06–D10)**
- Structured output validation, tool-call logging, prompt experiments, evaluations, annotations

**ML/AI Platform (D11–D16) — The Cherry on Top**
- Feature engineering, model registry, prompt templates, agent operations, vector search, monitoring

### Layer 5: Platform Quality & Integration (P01–P05, I01–I02, O01) — Fase 14-16 — Governance & Extensions

**Quality Gates (P01–P05) — Lightweight**
- Constitutional enforcement, security audit (ASVS), ML governance, integration security, dependency validation
- All gates show scorecards in F10 development dashboard

**Integration (I01–I02) — Lightweight**
- Connector framework & SDK, compliance exports (GDPR, audit bundles)

**Operations (O01) — Lightweight**
- Resilience testing, circuit breakers, graceful degradation validation

---

## 6. Why This Architecture Matters for the 80/20 Model

Each layer provides **production-ready infrastructure** so any type of client application can focus on their unique 20%:

**Layer 1 (Backend Core)** → Security, multi-tenancy, APIs and observability work out-of-the-box
**Layer 2 (Frontend Core)** → Design system with Visily.ai-style design-to-code workflow
**Layer 3 (Content & Business)** → Rich text, file handling, workflows and real-time features ready to use
**Layer 4 (Data & Intelligence)** → Optional AI agents and ML capabilities for advanced use cases
**Layer 5 (Quality & Dashboard)** → Development dashboard and constitutional enforcement guarantee quality

**Client applications add only:**
- **E-commerce**: Product catalog schema, checkout flow, payment integration (20%)
- **CRM**: Lead/deal workflows, custom sales pipeline, reporting dashboards (20%)
- **Content platform**: Publishing workflows, content types, editorial calendars (20%)
- **Data app**: Domain-specific data models, analysis logic, AI agent prompts (20%)

---

## 7. Phased Roadmap: Building the 80% Foundation

The Core-App is built in **13 development phases** spanning **55 modules**. Each phase adds a layer of the 80% foundation that client applications will build upon.

### Fase 1-5: Backend Core (21 modules) — The Foundation

### Phase 1 — Foundation & Governance

- **B01-core-project-skeleton**
  Baseline project structure, settings, CI and test harness.

- **B02-constitutional-enforcement-engine**
  Rule engine that enforces the project constitution and SDD process on repositories and workflows.

- **B03-core-security-baseline**
  Security hardening (settings, headers, brute-force protection) plus CI security scanning and reporting.

- **B04-core-internationalisation-base**
  Server-side i18n/l10n primitives (locales, translations, formatting, time zones).

**Outcome:** a secured, internationalisation-ready skeleton with governance and enforcement in place.

---

### Phase 2 — Identity & Hierarchy

- **B05-core-accounts**
  Custom user model, core auth flows, roles and permissions.

- **B06-organisations**
  Domain-neutral organisation model with user memberships.

- **B07-projects-workspaces**
  Context containers within organisations for resources and workflows.

- **B08-hierarchical-access-control**
  Permission model and evaluation across global, organisation and project scopes.

**Outcome:** multi-tenant identity and access model that everything else can rely on.

---

### Phase 3 — Configuration, Audit & Transactions

- **B09-audit-logging**
  Structured audit logs for important security and configuration events.

- **B10-settings-feature-flags**
  Scoped configuration (global/org/project) and toggles for features.

- **B11-core-transactions-credits**
  Generic transactions engine for credits, usage and billable events.

- **B12-i18n-l10n-user-org-preferences**
  Language, locale and timezone settings per user/organisation.

**Outcome:** fully observable and configurable core with the ability to track usage and credits.

---

### Phase 4 — Interfaces & Communication (Backend)

- **B13-api-baseline**
  DRF-based API conventions, auth, pagination, error handling, versioning.

- **B14-web-ui-baseline**
  Minimal server-rendered web UI with navigation and layout hooks.

- **B15-tasks-scheduling**
  Async tasks and cron-like scheduling (e.g. Celery + broker).

- **B16-notifications-baseline**
  Multi-channel notification model and delivery framework.

- **B17-contextual-notification-service**
  Higher-level routing and filtering of notifications per context.

**Outcome:** the Core-App can talk to the outside world (APIs, UI, emails) and react asynchronously.

---

### Phase 5 — Operationalisation & Finalisation (Backend)

- **B18-observability**
  Health checks, logging standards, metrics hooks.

- **B19-deploy-templates**
  Docker and configuration templates for typical deployments.

- **B20-scaffolding-cli**
  CLI for generating new apps/modules and downstream products.

- **B21-docs-examples**
  Comprehensive docs and example projects connecting all the pieces.

**Outcome:** the Core-App is ready to be used as a serious platform in real environments.

---

### Fase 6-7: Frontend Core (9 modules) — The User Experience

**Fase 6**: Design system & user experience (F01-F04)
**Fase 7**: Resources & integration (F05-F07, F09)

**Why it matters:** Client apps get a production-ready UI foundation with:
- **Visily.ai-style design-to-code workflow**: Wireframes → components using F01 design system
- Auth flows, context switching, notifications, theming
- Page templates for dashboards, lists, settings, wizards
- Integration guides for frontend-backend patterns

**Outcome:** Polished, accessible and themeable UI. Designers can rapidly prototype with AI tools (Visily.ai) and deploy directly to the platform.

---

### Fase 8: Platform Validation (5 modules) — Quality Assurance

**Demo Shell & Development Dashboard (F10)** + **Quality Gates (P01-P04)**

**Why it matters:** Before adding advanced capabilities, the platform is hardened and validated:
- **Development dashboard** provides real-time insights: module status, test coverage, CI health, security scans, performance metrics
- **Quality gates** ensure constitutional compliance: ≥90% backend coverage, ≥85% frontend coverage, zero flaky tests
- **Platform hardening** through comprehensive security refactoring and release readiness checks

**Outcome:** The 80% foundation is production-grade, fully observable, and ready for advanced capabilities. Developers can track progress through the live dashboard.

---

### Fase 9-10: Data Foundations (10 modules) — Data & Analytics Platform (Optional Power-up)

**Fase 9**: Data assets, ingestion, quality, schema, lineage (D01-D05)
**Fase 10**: Privacy, webhooks, secrets, analytics, reports (D06-D10)

**Why it matters:** For data-intensive applications (analytics dashboards, BI tools, data-driven decision systems):
- Data governance, cataloging, lineage and privacy enforcement built-in
- Advanced analytics and custom reporting capabilities
- The 20% is domain-specific data models and analysis logic

**When to use:** Client apps that need advanced data governance, compliance exports, or analytics beyond basic CRUD.

**Outcome:** Production-grade data governance, compliance and analytics infrastructure for data-centric applications.

---

### Fase 11-12: ML & AI Platform (8 modules) — Intelligence Layer (The Cherry on Top)

**Fase 11**: Experiment tracking, model registry, compute, agent operations (D11-D14)
**Fase 12**: Vector search, evaluation, connectors, compliance (D15-D16, I01-I02)

**Why it matters:** For applications that need intelligent automation or AI-powered features:
- **AI agents** can automate workflows, answer questions, perform tasks
- **ML operations** support custom models with experiment tracking, versioning and compute
- **Vector search** enables RAG patterns for knowledge-intensive applications
- The 20% is domain-specific agent prompts, tool definitions and model fine-tuning

**When to use:** Client apps that need intelligent assistants, automated decision-making, or advanced search capabilities.

**This is the cherry on top, not the cake itself.** Most client apps won't need this layer, but when they do, it's production-ready.

**Outcome:** Complete AI/ML platform for intelligent applications with built-in safety rails, evaluation and monitoring.

---

### Fase 13: Operations & Hardening (3 modules) — Production Readiness

**Ops console UI (F11)**, **Frontend packaging (F12)**, **Platform extensions gate (O01)**

**Why it matters:** Final operational polish for production deployment. Client apps inherit a battle-tested platform with ops tooling, frontend optimization and extension validation.

**Outcome:** The 80% foundation is complete, hardened and ready for client applications.

---

## 8. Constitutional Governance: Quality Without Programming Expertise

The Core-App uses **Spec-Driven Development (SDD)** with **constitutional enforcement** to guarantee quality even when built by non-programmers using AI agents:

### The Constitutional Workflow

1. **Constitution** — Defines non-negotiable quality rules (security, testing, accessibility, performance)
2. **Constitutional Enforcement Engine (B02)** — Validates every change against the constitution automatically
3. **Spec-Driven Development** — Every feature starts with a spec, not code
4. **AI Agents Build** — GitHub Copilot, ChatGPT and Spec Kitty implement under strict rules
5. **Quality Gates** — Automated checks prevent merging anything that violates standards
6. **Platform Gates (P01-P04)** — Periodic hardening sprints validate the entire platform

### Why This Matters for Non-Programmers

**Without constitutional governance:** AI agents can produce working but insecure, untestable or unmaintainable code.

**With constitutional governance:**
- AI agents cannot bypass security rules (enforced in CI)
- Test coverage requirements prevent untested code from merging
- Accessibility and performance standards are validated automatically
- Platform gates catch architectural drift before it becomes technical debt

**Result:** Quality is structurally guaranteed, not dependent on individual expertise.

---

## 9. Quality Standards for the 80% Foundation

The Core-App's 80% foundation must meet production-grade standards so client applications inherit quality by default:

### 1. Security & Privacy
- **OWASP ASVS baseline** enforced through B03 security baseline and P03 ACL refactor gate
- **Tenant isolation** validated in every quality gate (P01-P04)
- **Privacy by design**: D06 retention policies, redaction by default in logs/traces
- **Secrets management**: D08 external credentials, never hardcoded

### 2. Modern Web Capabilities
- **Real-time updates** via WebSockets for live dashboards and collaboration
- **Rich content editing** for CMS and content-heavy applications
- **File/media management** with upload, processing and CDN-ready patterns
- **Workflow engine** for approval processes and business logic
- **Advanced reporting** with custom dashboards and saved queries

### 3. Data & ML Governance (Optional Layer)
- **Data cataloging & lineage** (D01, D05) for data-intensive apps
- **Quality validation** (D03) before data processing
- **Schema contracts** (D04) prevent breaking changes
- **Model evaluation** (D16) before ML model deployment (if using AI layer)
- **Agent monitoring** (D16) for LLM safety and performance (if using AI layer)

### 4. Performance & Scalability
- **Async processing** (B15) for heavy workloads and background jobs
- **Real-time infrastructure** for WebSocket connections
- **Horizontal scaling** via containerization (B19)
- **Caching strategies** documented in integration guides (F09)
- **Compute orchestration** (D13) for ML training at scale (optional)

### 5. Observability & Developer Experience
- **Development dashboard** (F10) with real-time platform health, test coverage, CI status
- **Health checks** (B18) for all critical services
- **Audit logging** (B09) for security events
- **Metrics & tracing** for backend, tasks, real-time connections and optional ML pipelines
- **Error tracking** and alerting integrated in frontend (F04-F05)
- **Design-to-code workflow** (Visily.ai integration) for rapid UI prototyping

### 6. Accessibility & Internationalization
- **WCAG 2.1 AA compliance** in frontend design system (F01)
- **Multi-language support** (B04, B12) for global deployment
- **Responsive design** in page templates (F06)
- **Keyboard navigation** and screen reader compatibility

### 7. Constitutional Compliance (Quality Without Expertise)
- **≥90% test coverage** for backend core (P02 testing gate)
- **≥85% test coverage** for frontend (P02 testing gate)
- **Zero flaky tests** in CI (constitution requirement)
- **Security scans pass** before merge (B03 + P03)
- **Development dashboard** shows compliance in real-time (F10)
- **Demo shell validates** core contracts (F10 + P04)

---

## 10. Long-Term Vision: The 80/20 Platform Economy

### The Future State

The Django Core-App becomes the **foundation for an entire ecosystem of modern web applications**, where:

**For clients:**
- Starting any modern web app (e-commerce, CRM, content platform, data tool) takes days, not months
- 80% of infrastructure is pre-built: security, real-time, content, workflows, reporting
- AI/ML capabilities available as optional power-ups when needed
- Focus shifts from "building a platform" to "building domain value"
- Quality and security are guaranteed through constitutional enforcement

**For builders (AI-assisted non-programmers):**
- **Visily.ai-style design workflow**: Wireframes → production components seamlessly
- **Spec Kitty + AI agents** handle implementation under strict governance
- **Development dashboard** provides real-time visibility into platform health and progress
- **Constitutional Enforcement Engine** prevents quality drift automatically
- Platform gates ensure the foundation stays production-grade
- Documentation is LLM-optimized for easy consumption

**For the platform:**
- Every client application proves and improves the 80% foundation
- New patterns discovered in client apps can be promoted to the Core
- The platform becomes battle-tested across diverse domains
- Constitutional evolution happens through clear governance updates

### The North Star

**Starting a client application becomes:**

> "Clone the Core-App → Design in Visily.ai → Add 20% domain logic → Deploy a production-grade modern web application with built-in security, real-time features, content management, and optional AI/ML capabilities."

### Scope Boundaries

**In scope for Core-App (the 80%):**
- Multi-tenant infrastructure and security
- Content management, real-time features, workflow engine
- Advanced reporting and analytics
- Reusable UI components with Visily.ai-style design-to-code workflow
- Development dashboard and constitutional quality enforcement
- **Optional power-ups**: Data governance, ML operations and AI agent runtime

**Out of scope (the 20% client layer):**
- Domain-specific business logic (e-commerce checkout rules, CRM sales processes, etc.)
- Industry-specific workflows (healthcare compliance, financial reporting standards)
- Custom branding and marketing pages
- Product-specific integrations (external APIs are integrated via I01 SDK patterns)

**Example 80/20 splits:**

**E-commerce app:**
- ✅ 80% Core-App: Auth, products catalog (D01), file uploads, transactions (B11), real-time inventory, reporting
- ✅ 20% Custom: Checkout flow, payment gateway integration, shipping calculations, product recommendations

**CRM platform:**
- ✅ 80% Core-App: Auth, contacts/deals catalog (D01), workflows, notifications, dashboards, activity streams
- ✅ 20% Custom: Sales pipeline stages, lead scoring logic, email campaign integration, custom reports

**Content platform:**
- ✅ 80% Core-App: Auth, rich text editing, file/media management, publishing workflows, commenting, notifications
- ✅ 20% Custom: Content types, editorial calendar, SEO optimization, content recommendations

**AI-powered data tool:**
- ✅ 80% Core-App: Everything above + data governance (D01-D10) + AI agents (D14-D16)
- ✅ 20% Custom: Domain-specific data models, analysis logic, AI agent prompts, custom dashboards

This document is the **north star** for all decisions:
- ✅ If a change makes the 80% foundation more powerful or client applications easier to build → in scope
- ✅ If a change improves developer experience (design-to-code, dashboard insights) → in scope
- ❌ If a change adds domain-specific logic or product features → belongs in a client application
- ⚠️ If a change reduces reusability or breaks constitutional governance → rejected

---
