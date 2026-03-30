# PROJECT_ROADMAP.md

## Purpose

This document provides a practical build sequence for the Django Core-App.
It helps humans and AI agents understand what to focus on next.

---

## Roadmap Overview

The roadmap is structured in development phases spanning **83+ modules**.

**Phase Structure:**
- **Fase 1-5**: Backend Core (modules 001-021) — 21 modules ✅ **COMPLETE**
- **Fase 6-7**: Frontend Core (modules 022-030) — 9 modules ✅ **COMPLETE**
- **Fase 8**: Demo Foundation (modules 031-033) — 3 modules ✅ **COMPLETE**
- **Fase 9**: Backend Infrastructure (modules 034-038) — 5 modules ✅ **COMPLETE**
- **Fase 10**: Content Engine Core (modules 039-044) — 6 modules ✅ **COMPLETE**
- **Accelerated**: Out-of-phase modules (045-049) — 5 modules ✅ **COMPLETE** (B39, B40, B41, B37, B55)
- **Fase 11**: Frontend & Visual Dev — 3 modules 📋 **PLANNED**
- **Fase 12**: Workflows & Payments — 2 remaining modules 🚧 **PARTIALLY COMPLETE** (B37 ✅, B36/B38 📋)
- **Fase 13**: Advanced UI — 4 modules 📋 **PLANNED**
- **Fase 14**: Data Foundations Part 1 — 5 modules 📋 **PLANNED**
- **Fase 15**: Data Foundations Part 2 — 5 modules 📋 **PLANNED**
- **Fase 16**: ML/AI Platform — 6 modules 📋 **PLANNED**
- **Fase 17**: Platform Quality Gates — 5 modules 📋 **PLANNED**
- **Fase 18**: Integration Ecosystem — 2 modules 📋 **PLANNED**
- **Fase 19**: Operations & Resilience — 1 module 📋 **PLANNED**

**Key Architecture Decisions:**
- **Fase 7 Module 029**: F08 reserved for future (placeholder, not F09 Visily.ai)
- **Fase 8 Split**: F10 Demo Shell complete, F10b-Database + F10b-Pages added for production-ready demo
- **Fase 10 Expansion**: Added B31 (Content Templates) and B32 (Sport Configuration) for TeamReel support
- **Accelerated Modules**: B39/B40/B41 (search, performance, navigation) + B37 (workflows) + B55 (video) completed ahead of phase schedule
- **Constitution Gates**: Distributed after Fases 8, 15, and 18 (not concentrated)
- **Quality Gates Lightweight**: P01-P05 show scorecards in F10 dashboard, no separate demo pages
- **Current Status**: 49 modules complete, Fases 1-10 done, accelerated modules done, Fase 11+ planned

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
- **#032 F10b-Database** — Demo Production Database & Seed Data ✅
- **#033 F10b-Pages** — Demo Pages for Modules 001-030 ✅
- **✅ Constitution Gate** (Post Demo Foundation)

**Outcome:** Production-ready demo app with complete seed data and 30+ pages showcasing all modules 001-030.

**Details:** See [phase-08-demo-foundation.md](fases/done/phase-08-demo-foundation.md)

---

## Fase 9 — Backend Infrastructure (5 modules)

**Modules:** B22, B23, B24, B25, B26 (034-038)

- **#034 B22** — File & Media Management ✅
- **#035 B23** — Real-time Infrastructure ✅
- **#036 B24** — Full-text Search Foundation ✅
- **#037 B25** — Cache Layer & Patterns ✅
- **#038 B26** — Project-Level Access Control ✅

**Demo Pages:** `/demo/files`, `/demo/realtime`, `/demo/search`, `/demo/cache-test`, `/demo/project-access`

**Outcome:** Core backend infrastructure voor files, real-time, search, caching en project access operational.

**Details:** See [phase-09-backend-infrastructure.md](fases/done/phase-09-backend-infrastructure.md)

---

## Fase 10 — Content Engine Core (6 modules)

**Modules:** B30-B35 (039-044)

- **#039 B30** — Generic Activities & Periods ✅
- **#040 B31** — Content Templates & Generation ✅ **🆕 TeamReel Critical**
- **#041 B32** — Sport Configuration & Templates ✅ **🆕 TeamReel Critical**
- **#042 B33** — Brand Identity Manager ✅
- **#043 B34** — Generative Pipelines ✅
- **#044 B35** — Smart Asset Library ✅

**Demo Pages:** `/demo/activities`, `/demo/content/*`, `/demo/sport-config/*`, `/demo/brand`, `/demo/pipelines`, `/demo/library`

**Outcome:** Generic event planning, **content generation with approval workflow**, **sport-specific configuration**, brand identity, AI pipelines, and smart media library operational.

**Details:** See [phase-10-content-engine-core.md](fases/planned/phase-10-content-engine-core.md)

---

## Accelerated Modules — Completed Out-of-Phase (5 modules)

**Modules:** B39, B40, B41, B37, B55 (045-049)

These modules were prioritized ahead of their original phase schedule due to TeamReel product needs.

- **#045 B39** — Hierarchical Search Navigation & Related Results ✅
- **#046 B40** — Incremental Frontend Performance & Fetch Guardrails ✅
- **#047 B41** — User Navigation State (Recents & Favorites) ✅
- **#048 B37** — Workflow Engine & State Machine ✅
- **#049 B55** — Video Processing Pipeline ✅

**Outcome:** Advanced search hierarchy, performance guardrails, user navigation persistence, workflow automation, and video processing all operational.

---

## Fase 11 — Frontend & Visual Development (3 modules)

**Modules:** F08, F09, F13

- **#045 F08** — Data Visualization Components 📋
- **#046 F09** — Design-to-Code Pipeline (Visily.ai Integration) 📋
- **#047 F13** — Rich Text Editor Component 📋

**Demo Pages:** `/demo/charts`, `/demo/visily`, `/demo/editor`

**Outcome:** Visual development workflow operational, data viz ready, rich text editing enabled.

**Details:** See [phase-11-frontend-and-visual-development.md](fases/planned/phase-11-frontend-and-visual-development.md)

---

## Fase 12 — Workflows & Payments (3 modules)

**Modules:** B36-B38 (048-050)

- **#048 B36** — Payment Gateway Adapters 📋
- **#049 B37** — Workflow Engine & State Machine ✅ *(completed in Accelerated Modules)*
- **#050 B38** — Advanced Reporting & Exports 📋

**Demo Pages:** `/demo/payments`, `/demo/workflows/approval`, PDF export buttons

**Outcome:** Payment processing, workflow automation, document generation ready.

**Details:** See [phase-12-workflows-and-payments.md](fases/planned/phase-12-workflows-and-payments.md)

---

## Fase 13 — Advanced UI (4 modules)

**Modules:** F14, F11, F12, F15 (049-052)

- **#045 F14** — Admin Panel Components 📋
- **#046 F11** — Operations Console UI 📋
- **#047 F12** — Billing & Usage UI 📋
- **#048 F15** — Frontend Form Components 📋

**Demo Pages:** `/admin`, `/ops`, `/billing`, `/demo/forms`

**Outcome:** Admin panel, ops console, billing UI and advanced forms ready.

**Details:** See [phase-13-advanced-ui.md](fases/planned/phase-13-advanced-ui.md)

---

## Fase 14 — Data Foundations Part 1 (5 modules)

**Modules:** D01-D05 (049-053)

- **#049 D01** — Data Storage Adapters 📋
- **#050 D02** — ETL & Data Pipeline Foundation 📋
- **#051 D03** — Dataset Management & Lineage 📋
- **#052 D04** — Streaming Data Adapters 📋
- **#053 D05** — Data Version Control 📋

**Demo Pages:** `/demo/storage`, `/demo/pipelines`, `/demo/datasets`, `/demo/streams`, `/demo/datasets/{id}/versions`

**Outcome:** Data storage, ETL, lineage, streaming and versioning infrastructure operational.

**Details:** See [phase-14-data-foundations-part-1.md](fases/planned/phase-14-data-foundations-part-1.md)

---

## Fase 15 — Data Foundations Part 2 (5 modules)

**Modules:** D06-D10 (054-058)

- **#054 D06** — Structured Output Validation 📋
- **#055 D07** — Tool-Call Logging Infrastructure 📋
- **#056 D08** — Prompt Experiment Tracking 📋
- **#057 D09** — Evaluation & Metrics Framework 📋
- **#058 D10** — Annotation & Labeling Tools 📋

**Demo Pages:** `/demo/validation`, `/demo/tool-calls`, `/demo/experiments/prompts`, `/demo/evaluations`, `/demo/labeling`

**Outcome:** Validation, tool logging, experiments, evaluations and annotation tools ready.

**Details:** See [phase-15-data-foundations-part-2.md](fases/planned/phase-15-data-foundations-part-2.md)

---

## Fase 16 — ML/AI Platform (6 modules)

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

**Details:** See [phase-16-ml-ai-platform.md](fases/planned/phase-16-ml-ai-platform.md)

---

## Fase 17 — Platform Quality Gates (5 modules) — Lightweight

**Modules:** P01-P05 (065-069)

- **#065 P01** — Constitutional Enforcement Engine 📋
- **#066 P02** — Security Audit & ASVS Compliance (Lightweight) 📋
- **#067 P03** — ML & Agent Governance Gate (Lightweight) 📋
- **#068 P04** — Integration Security Audit (Lightweight) 📋
- **#069 P05** — Stack & Dependency Validation 📋

**Demo Pages:** ⚠️ NONE - All scorecards shown in F10 Development Dashboard

**Outcome:** Lightweight quality gates operational, all results visible in F10 dashboard.

**Details:** See [phase-17-platform-quality-gates.md](fases/planned/phase-17-platform-quality-gates.md)

---

## Fase 18 — Integration Ecosystem (2 modules) — Lightweight

**Modules:** I01-I02 (070-071)

- **#070 I01** — Connector Framework & SDK (Lightweight) 📋
- **#071 I02** — Compliance Exports (Lightweight) 📋

**Demo Pages:** `/demo/connectors`, `/demo/compliance/exports`

**Outcome:** Connector framework and compliance export templates ready.

**Details:** See [phase-18-integration-ecosystem.md](fases/planned/phase-18-integration-ecosystem.md)

---

## Fase 19 — Operations & Resilience (1 module) — Lightweight

**Module:** O01 (072)

- **#072 O01** — Resilience Testing & Health Validation (Lightweight) 📋
- 📋 **Constitution Gate** (Final Platform Validation)

**Demo Pages:** ⚠️ NONE - Scorecard in F10 Development Dashboard

**Outcome:** Complete platform validation, all 72 modules operational, production-ready.

**Details:** See [phase-19-operations-and-resilience.md](fases/planned/phase-19-operations-and-resilience.md)

---

## Roadmap Usage

**When starting a new feature:**
1. Pick the next module from the current fase
2. Run `/spec-kitty.specify` for that module
3. Follow the SDD workflow until merged

**AI agents should always consider:**
- Current fase (Fase 1-19)
- Current module (B01-B21, F01-F12, P01-P04, D01-D16, I01-I02, O01)
- Development dashboard status (via F10 when available)

## Module Categories

**Backend Core (B01-B21)**: Foundation, security, identity, configuration, APIs, tasks, notifications, observability, deployment.

**Backend Extensions (B22-B38)**: Files/media (B22), real-time/WebSocket (B23), search (B24), cache (B25), payments (B26), workflows (B37), reporting (B38), content templates (B31), sport config (B32), brand identity (B33), generative pipelines (B34), asset library (B35), payment gateways (B36).

**Frontend Core (F01-F07, F09)**: Design system (F01), auth UI (F02), context switching (F03), notifications UI (F04), resource displays (F05), page templates (F06), theming (F07), integration guides (F09).

**Frontend Extensions (F08, F10-F15)**: Data viz (F08), demo shell + database + pages (F10/F10b), ops console (F11), billing UI (F12), rich text editor (F13), admin panel (F14), form components (F15).

**Platform Gates (P01-P05)**: Constitutional enforcement, security audit, ML governance, integration security, dependency validation (all lightweight, show in F10 dashboard).

**Data & ML Platform (D01-D16)**: Storage adapters, ETL, datasets, streaming, versioning, validation, tool logging, experiments, evaluations, annotations, features, model registry, prompts, agents, vector search, monitoring.

**Integration (I01-I02)**: Connector framework & SDK, compliance exports (lightweight).

**Operations (O01)**: Resilience testing & health validation (lightweight).

---
