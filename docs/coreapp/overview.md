# Core Platform Overview

> De 80% foundation die elk modern web platform nodig heeft.

---

## 1. Wat het Core Platform IS

Een **productieklare, multi-tenant web applicatie foundation** gebouwd op Django + React die het volgende biedt:

- **Multi-tenancy** — Organisaties → Projecten → Leden met hiërarchische toegang
- **Authenticatie & RBAC** — JWT, rollen, permissies, org-scoped queries
- **File Management** — S3 opslag, thumbnails, metadata
- **AI Pipeline** — Generation requests → AI providers → Results
- **Video Processing** — FFmpeg jobs, presets, overlays, platform-specifieke exports
- **Notificaties** — Multi-channel (in-app, email), gebruikersvoorkeuren
- **Background Processing** — Celery met 4 queues, scheduling, monitoring
- **Credits & Transactions** — Verbruiksbeheer, balans, transactiehistorie
- **Workflows** — State machine, approval flows, transitions
- **Search** — Full-text via PostgreSQL
- **Audit Trail** — Alle wijzigingen gelogd
- **Design System** — CSS tokens, component library, responsive, dark mode ready

---

## 2. Wat het Core Platform NIET is

- Geen starter template — het is een complete, productie-draaiende foundation
- Geen abstract framework — alles is bewezen in productie (TeamReel)
- Geen locked-in systeem — producten extenden, niet forken
- Geen vervanging voor cloud infra — het draait op Railway/Vercel

---

## 3. Design Principles

### 80/20 Architectuur
Het core platform dekt 80% van wat een moderne web app nodig heeft. Een product voegt de resterende 20% toe als dunne laag: domain-specifieke models, templates, en business logic.

### Convention over Configuration
- Org-scoped querysets op alle ViewSets
- `permission_classes` op alle endpoints
- `select_related`/`prefetch_related` — geen N+1
- Design tokens only — geen hardcoded CSS values
- TypeScript strict mode — geen `any`

### Spec-Driven Development
Features worden gebouwd via specs → AI agents (Spec Kitty workflow) → quality-checked code. De constitution.md definieert de governance regels.

---

## 4. Architectuur

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React 18 + TypeScript + Vite + CSS Modules │
│  Design tokens · Component library          │
└──────────────────┬──────────────────────────┘
                   │ REST API (/api/v1/)
┌──────────────────┴──────────────────────────┐
│                  Backend                     │
│  Django 5 + Django REST Framework            │
│  JWT auth · RBAC · Org-scoping              │
├─────────────────────────────────────────────┤
│  Background Processing                       │
│  Celery · 4 queues · Redis broker            │
├─────────────────────────────────────────────┤
│  Storage & Data                              │
│  PostgreSQL · S3 · Redis cache               │
└─────────────────────────────────────────────┘
```

---

## 5. Hoe het 80/20 Model Werkt

### Core levert (80%)
| Capability | Apps |
|-----------|------|
| Identity & Access | accounts, organisations, projects, permissions |
| Data & Storage | files, search, trash, audit |
| Communication | notifications, contextual_notifications |
| Processing | tasks (Celery), video (FFmpeg), generative (AI) |
| Commerce | credits, transactions |
| Operations | observability, settings, navigation |
| Governance | constitution_engine, security_baseline |

### Product voegt toe (20%)
TeamReel voegt sport-specifieke apps toe:
- `activities` — wedstrijden, trainingen, events
- `branding` — clubidentiteit (kleuren, logo, kits)
- `content_generation` — templates en velden
- `sport_configuration` — sport types, posities
- `activity_feed` — timeline per team
- `medialib` — semantische media laag
- `workflows` — goedkeuringsflows

### Een nieuw product zou toevoegen:
- Domain-specifieke models (bijv. e-commerce: products, orders, carts)
- Custom templates en content types
- Industry-specifieke business logic
- Eigen branding en identity regels

---

## 6. Referenties

| Onderwerp | Document |
|-----------|----------|
| Alle core modules in detail | [modules.md](modules.md) |
| Een product bouwen op het core | [extending.md](extending.md) |
| Systeem architectuur | [../architecture/overview.md](../architecture/overview.md) |
| Data model (120 models) | [../architecture/data-model.md](../architecture/data-model.md) |
| Tech stack | [../architecture/stack.md](../architecture/stack.md) |
| API endpoints | [../features/api-reference.md](../features/api-reference.md) |
| Frontend design system | [../frontend/css-architecture.md](../frontend/css-architecture.md) |
| Infrastructure | [../infrastructure/railway-services.md](../infrastructure/railway-services.md) |
