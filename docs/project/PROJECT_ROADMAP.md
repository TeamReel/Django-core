# PROJECT_ROADMAP.md

## Purpose

This document provides a practical build sequence for the Django Core-App.
It helps humans and AI agents understand what to focus on next.

---

## Roadmap Overview

The roadmap is structured in **18 development phases** (Fase 1-18) spanning **71 modules** (001-071).

**Phase Structure:**
- **Fase 1-5**: Backend Core (modules 001-021) — 21 modules ✅ **COMPLETE**
- **Fase 6-7**: Frontend Core (modules 022-030) — 9 modules ✅ **COMPLETE**
- **Fase 8**: Demo Foundation (modules 031-033) — 3 modules 🚧 **IN PROGRESS** (F10 ✅, F10b-Database 🚧)
- **Fase 9**: Backend Infrastructure (modules 034-038) — 5 modules 📋 **PLANNED**
- **Fase 10**: Frontend & Visual Dev (modules 039-041) — 3 modules 📋 **PLANNED**
- **Fase 11**: Workflows & Payments (modules 042-044) — 3 modules 📋 **PLANNED**
- **Fase 12**: Advanced UI (modules 045-048) — 4 modules 📋 **PLANNED**
- **Fase 13**: Data Foundations Part 1 (modules 049-053) — 5 modules 📋 **PLANNED**
- **Fase 14**: Data Foundations Part 2 (modules 054-058) — 5 modules 📋 **PLANNED**
- **Fase 15**: ML/AI Platform (modules 059-064) — 6 modules 📋 **PLANNED**
- **Fase 16**: Platform Quality Gates (modules 065-069) — 5 modules 📋 **PLANNED**
- **Fase 17**: Integration Ecosystem (modules 070-071) — 2 modules 📋 **PLANNED**
- **Fase 18**: Operations & Resilience (module 072) — 1 module 📋 **PLANNED**

**Key Architecture Decisions:**
- **Fase 7 Module 029**: F08 reserved for future (placeholder, not F09 Visily.ai)
- **Fase 8 Split**: F10 Demo Shell complete, F10b-Database + F10b-Pages added for production-ready demo
- **Constitution Gates**: Distributed after Fases 8, 15, and 18 (not concentrated)
- **Quality Gates Lightweight**: P01-P05 show scorecards in F10 dashboard, no separate demo pages
- **Module Numbering**: 72 total modules (B01-B29, F01-F15, P01-P05, D01-D16, I01-I02, O01)
- **Current Status**: 30/72 modules complete (42%), Fase 8 in progress

---

## Fase 1 — Foundation & Governance (4 modules)

**Modules:** B01-B04 (001-004)

- **#001 B01** — Core Project Skeleton ✅
- **#002 B02** — Constitutional Enforcement Engine ✅
- **#003 B03** — Core Security Baseline ✅
- **#004 B04** — Core Internationalization Base ✅

**Outcome:** Secure, i18n-ready skeleton with governance and enforcement in place.

---

## Fase 2 — Identity & Multi-Tenancy (4 modules)

**Modules:** B05-B08 (005-008)

- **#005 B05** — Core Accounts & Authentication ✅
- **#006 B06** — Organizations ✅
- **#007 B07** — Projects / Workspaces ✅
- **#008 B08** — Hierarchical Access Control ✅

**Outcome:** Full identity and access model, ready for multi-tenant products.

---

## Fase 3 — Configuration, Audit & Transactions (4 modules)

**Modules:** B09-B12 (009-012)

- **#009 B09** — Audit Logging ✅
- **#010 B10** — Settings & Feature Flags ✅
- **#011 B11** — Core Transactions & Credits ✅
- **#012 B12** — i18n/l10n User & Org Preferences ✅

**Outcome:** Configurable and auditable foundation with usage/credits tracking.

---

## Fase 4 — Interfaces & Communication (5 modules)

**Modules:** B13-B17 (013-017)

- **#013 B13** — API Baseline ✅
- **#014 B14** — Web-UI Baseline ✅
- **#015 B15** — Tasks & Scheduling ✅
- **#016 B16** — Notifications Baseline ✅
- **#017 B17** — Contextual Notification Service ✅

**Outcome:** Backend can serve APIs, basic UI, async work and notifications.

---

## Fase 5 — Operationalization (4 modules)

**Modules:** B18-B21 (018-021)

- **#018 B18** — Observability ✅
- **#019 B19** — Deploy Templates ✅
- **#020 B20** — Scaffolding CLI ✅
- **#021 B21** — Docs & Examples ✅

**Outcome:** Ready to deploy, observe and extend as a platform.

---

## Fase 6 — Frontend Foundations (4 modules)

**Modules:** F01-F04 (022-025)

- **#022 F01** — Frontend Design System ✅
- **#023 F02** — Core Auth & Identity UI ✅
- **#024 F03** — Multi-Tenancy Context Switcher ✅
- **#025 F04** — Notifications Hub UI ✅

**Outcome:** Shared design system, auth flows, context switching and notification UI.

---

## Fase 7 — Frontend Resources & Integration (5 modules)

**Modules:** F05-F09 (026-030)

- **#026 F05** — Resource Display & Alerts ✅
- **#027 F06** — Reusable Page Templates ✅
- **#028 F07** — Theme Support & Brand Variants ✅
- **#029 F08** — (RESERVED FOR FUTURE) 📋
- **#030 F09** — Frontend-Backend Integration Guides ✅

**Outcome:** Brandable, reusable UI with clear frontend-backend integration patterns.

---

## Fase 8 — Demo Foundation (3 modules)

**Modules:** F10, F10b-Database, F10b-Pages (031-033)

- **#031 F10** — Demo Shell (Basic) ✅
- **#032 F10b-Database** — Demo Production Database & Seed Data 🚧
- **#033 F10b-Pages** — Demo Pages for Modules 001-030 📋
- **📋 Constitution Gate** (Post Demo Foundation)

**Outcome:** Production-ready demo app with complete seed data and 30+ pages showcasing all modules 001-030.

**Details:** See [phases/planned/fase-08-demo-foundation.md](phases/planned/fase-08-demo-foundation.md)

---

## Fase 9 — Backend Infrastructure (5 modules)

**Modules:** B22, B23, B24, B25, B26 (034-038)

- **#034 B22** — File & Media Management 📋
- **#035 B23** — Real-time Infrastructure 📋
- **#036 B24** — Full-text Search Foundation 📋
- **#037 B25** — Cache Layer & Patterns 📋
- **#038 B26** — Project-Level Access Control 📋

**Demo Pages:** `/demo/files`, `/demo/realtime`, `/demo/search`, `/demo/cache-test`, `/demo/project-access`

**Outcome:** Core backend infrastructure voor files, real-time, search, caching en project access operational.

**Details:** See [phases/planned/fase-09-backend-infrastructure.md](phases/planned/fase-09-backend-infrastructure.md)

---

## Fase 10 — Frontend & Visual Development (3 modules)

**Modules:** F08, F09, F13 (039-041)

- **#039 F08** — Data Visualization Components 📋
- **#040 F09** — Design-to-Code Pipeline (Visily.ai Integration) 📋
- **#041 F13** — Rich Text Editor Component 📋

**Demo Pages:** `/demo/charts`, `/demo/visily`, `/demo/editor`

**Outcome:** Visual development workflow operational, data viz ready, rich text editing enabled.

**Details:** See [phases/planned/fase-10-frontend-visual-dev.md](phases/planned/fase-10-frontend-visual-dev.md)

---

## Fase 11 — Workflows & Payments (3 modules)

**Modules:** B27, B28, B29 (042-044)

- **#042 B27** — Payment Gateway Adapters 📋
- **#043 B28** — Workflow Engine & State Machine 📋
- **#044 B29** — Advanced Reporting & Exports 📋

**Demo Pages:** `/demo/payments`, `/demo/workflows/approval`, PDF export buttons

**Outcome:** Payment processing, workflow automation, document generation ready.

**Details:** See [phases/planned/fase-11-workflows-payments.md](phases/planned/fase-11-workflows-payments.md)

---

## Fase 12 — Advanced UI (4 modules)

**Modules:** F14, F11, F12, F15 (045-048)

- **#045 F14** — Admin Panel Components 📋
- **#046 F11** — Operations Console UI 📋
- **#047 F12** — Billing & Usage UI 📋
- **#048 F15** — Frontend Form Components 📋

**Demo Pages:** `/admin`, `/ops`, `/billing`, `/demo/forms`

**Outcome:** Admin panel, ops console, billing UI and advanced forms ready.

**Details:** See [phases/planned/fase-12-advanced-ui.md](phases/planned/fase-12-advanced-ui.md)

---

## Fase 13 — Data Foundations Part 1 (5 modules)

**Modules:** D01-D05 (049-053)

- **#049 D01** — Data Storage Adapters 📋
- **#050 D02** — ETL & Data Pipeline Foundation 📋
- **#051 D03** — Dataset Management & Lineage 📋
- **#052 D04** — Streaming Data Adapters 📋
- **#053 D05** — Data Version Control 📋

**Demo Pages:** `/demo/storage`, `/demo/pipelines`, `/demo/datasets`, `/demo/streams`, `/demo/datasets/{id}/versions`

**Outcome:** Data storage, ETL, lineage, streaming and versioning infrastructure operational.

**Details:** See [phases/planned/fase-13-data-foundations-1.md](phases/planned/fase-13-data-foundations-1.md)

---

## Fase 14 — Data Foundations Part 2 (5 modules)

**Modules:** D06-D10 (054-058)

- **#054 D06** — Structured Output Validation 📋
- **#055 D07** — Tool-Call Logging Infrastructure 📋
- **#056 D08** — Prompt Experiment Tracking 📋
- **#057 D09** — Evaluation & Metrics Framework 📋
- **#058 D10** — Annotation & Labeling Tools 📋

**Demo Pages:** `/demo/validation`, `/demo/tool-calls`, `/demo/experiments/prompts`, `/demo/evaluations`, `/demo/labeling`

**Outcome:** Validation, tool logging, experiments, evaluations and annotation tools ready.

**Details:** See [phases/planned/fase-14-data-foundations-2.md](phases/planned/fase-14-data-foundations-2.md)

---

## Fase 15 — ML/AI Platform (6 modules)

**Modules:** D11-D16 (059-064)

- **#059 D11** — Feature Engineering Patterns 📋
- **#060 D12** — Model Registry 📋
- **#061 D13** — Prompt Template Library 📋
- **#062 D14** — Agent Operations & Orchestration 📋
- **#063 D15** — Vector Search & Retrieval Adapter 📋
- **#064 D16** — Model Monitoring & Feedback Loop 📋
- 📋 **Constitution Gate** (Post ML & Agent Governance)

**Demo Pages:** `/demo/features`, `/demo/models`, `/demo/prompts`, `/demo/agents`, `/demo/vector-search`, `/demo/monitoring/models`

**Outcome:** Complete ML/AI platform with features, models, prompts, agents, vector search and monitoring.

**Details:** See [phases/planned/fase-15-ml-ai-platform.md](phases/planned/fase-15-ml-ai-platform.md)

---

## Fase 16 — Platform Quality Gates (5 modules) — Lightweight

**Modules:** P01-P05 (065-069)

- **#065 P01** — Constitutional Enforcement Engine 📋
- **#066 P02** — Security Audit & ASVS Compliance (Lightweight) 📋
- **#067 P03** — ML & Agent Governance Gate (Lightweight) 📋
- **#068 P04** — Integration Security Audit (Lightweight) 📋
- **#069 P05** — Stack & Dependency Validation 📋

**Demo Pages:** ⚠️ NONE - All scorecards shown in F10 Development Dashboard

**Outcome:** Lightweight quality gates operational, all results visible in F10 dashboard.

**Details:** See [phases/planned/fase-16-quality-gates.md](phases/planned/fase-16-quality-gates.md)

---

## Fase 17 — Integration Ecosystem (2 modules) — Lightweight

**Modules:** I01-I02 (070-071)

- **#070 I01** — Connector Framework & SDK (Lightweight) 📋
- **#071 I02** — Compliance Exports (Lightweight) 📋

**Demo Pages:** `/demo/connectors`, `/demo/compliance/exports`

**Outcome:** Connector framework and compliance export templates ready.

**Details:** See [phases/planned/fase-17-integration.md](phases/planned/fase-17-integration.md)

---

## Fase 18 — Operations & Resilience (1 module) — Lightweight

**Module:** O01 (072)

- **#072 O01** — Resilience Testing & Health Validation (Lightweight) 📋
- 📋 **Constitution Gate** (Final Platform Validation)

**Demo Pages:** ⚠️ NONE - Scorecard in F10 Development Dashboard

**Outcome:** Complete platform validation, all 72 modules operational, production-ready.

**Details:** See [phases/planned/fase-18-operations.md](phases/planned/fase-18-operations.md)

---

## Roadmap Usage

**When starting a new feature:**
1. Pick the next module from the current fase
2. Run `/spec-kitty.specify` for that module
3. Follow the SDD workflow until merged

**AI agents should always consider:**
- Current fase (Fase 1-13)
- Current module (B01-B21, F01-F12, P01-P04, D01-D16, I01-I02, O01)
- Development dashboard status (via F10 when available)

## Module Categories

**Backend Core (B01-B21)**: Foundation, security, identity, configuration, APIs, tasks, notifications, observability, deployment.

**Backend Extensions (B22-B28)**: Files/media (B22), real-time/WebSocket (B23), search (B24), cache (B25), payments (B26), workflows (B27), reporting (B28).

**Frontend Core (F01-F07, F09)**: Design system (F01), auth UI (F02), context switching (F03), notifications UI (F04), resource displays (F05), page templates (F06), theming (F07), integration guides (F09).

**Frontend Extensions (F08, F10-F15)**: Data viz (F08), demo shell + database + pages (F10/F10b), ops console (F11), billing UI (F12), rich text editor (F13), admin panel (F14), form components (F15).

**Platform Gates (P01-P05)**: Constitutional enforcement, security audit, ML governance, integration security, dependency validation (all lightweight, show in F10 dashboard).

**Data & ML Platform (D01-D16)**: Storage adapters, ETL, datasets, streaming, versioning, validation, tool logging, experiments, evaluations, annotations, features, model registry, prompts, agents, vector search, monitoring.

**Integration (I01-I02)**: Connector framework & SDK, compliance exports (lightweight).

**Operations (O01)**: Resilience testing & health validation (lightweight).

---
