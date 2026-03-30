# TeamReel Web Application — Documentation

**Last Updated:** 2026-03-30
**Status:** v5.1

---

## Overview

Complete documentation for the TeamReel web application — brand identity, functional design, frontend design system, feature specs, media pipeline, infrastructure, and data reference.

---

## Documentation Map

### Brand & Product

| Document | Purpose |
|----------|---------|
| [brand-identity.md](brand-identity.md) | **Brand identity** — colors, typography, tone of voice, logo system, design tokens (verified against code) |

### Getting Started

| Document | Purpose |
|----------|---------|
| [getting-started.md](getting-started.md) | Integration guide, domain glossary, FK hierarchy, seeding patterns |

### Architecture

| Document | Purpose |
|----------|---------|
| [architecture.md](architecture.md) | **Full app architecture** — 33 apps, 67 models, 40 ViewSets, Celery tasks |

### Frontend Design System

| Document | Purpose |
|----------|---------|
| [frontend-design/index.md](frontend-design/index.md) | **Overview** — architecture diagram, key principles, quick reference |
| [frontend-design/css-architecture.md](frontend-design/css-architecture.md) | Tokens, utility classes, CSS Modules, file structure |
| [frontend-design/theming.md](frontend-design/theming.md) | Light/dark themes, semantic tokens, brand palette |
| [frontend-design/component-library.md](frontend-design/component-library.md) | 15 UI primitives catalog, usage patterns |
| [frontend-design/mobile-patterns.md](frontend-design/mobile-patterns.md) | Touch targets, gestures, safe areas, responsive layouts |
| [frontend-design/code-conventions.md](frontend-design/code-conventions.md) | Quality gates, review checklist, current metrics |
| [frontend-design/refactoring-status.md](frontend-design/refactoring-status.md) | **Refactoring eindstatus** — 6 roadmaps, 69 fases, alle metrieken |
| [frontend-design/mobile-app-blueprint.md](frontend-design/mobile-app-blueprint.md) | Mobile-first app design blueprint — richtlijnen vs huidige staat |
| [frontend-design/ux-flows.md](frontend-design/ux-flows.md) | **UX Flows** — complete route map, navigation shell, create wizards, user journeys |

### Features

| Document | Purpose |
|----------|---------|
| [features/functional-flows.md](features/functional-flows.md) | **Functional design** — user roles, UX flows, match-phase content, AI integration, data model overview |
| [features/generation-queue.md](features/generation-queue.md) | AI Generation Queue — GenerationJob lifecycle, Celery pipeline |
| [features/member-asset-save-flow.md](features/member-asset-save-flow.md) | Asset save flow + stale closure fix pattern |
| [features/members-batch-actions.md](features/members-batch-actions.md) | Batch operations on members + RBAC mapping |
| [features/seeding-guide.md](features/seeding-guide.md) | Idempotent seeding patterns + FK dependency order |
| [features/credits-transactions.md](features/credits-transactions.md) | Credits & Transactions — 3-tier balance, signed ledger, GenerationCreditService |
| [features/active-context.md](features/active-context.md) | UserActiveContext — 8-FK navigation state, cascade resolution, context-switcher |
| [features/generative-pipeline.md](features/generative-pipeline.md) | **AI generative engine** — 4 models, executor architecture, provider cascade, asset pipeline |
| [features/video-processing.md](features/video-processing.md) | **Video pipeline** — 7 job types, Builder→Composer, FFmpeg processors, content generators |
| [features/notification-routing.md](features/notification-routing.md) | **Notification routing** — 2-app event→routing→delivery pipeline, preferences, suppression |
| [features/branding-tokens.md](features/branding-tokens.md) | **Branding & tokens** — BrandProfile, DesignToken inheritance, auto-color extraction |
| [features/workflow-engine.md](features/workflow-engine.md) | **Workflow engine** — state machine, atomic transitions, validator/hook registries |
| [features/project-hierarchy.md](features/project-hierarchy.md) | **Project hierarchy** — club→team nesting, membership, invites, functional roles |
| [features/rbac-permissions.md](features/rbac-permissions.md) | **RBAC permissions** — Permission registry, role scopes, hierarchical evaluator |
| [features/content-templates.md](features/content-templates.md) | **Content templates** — 25+ subtypes, generation lifecycle, approval workflow |
| [features/media-readiness-card.md](features/media-readiness-card.md) | **Media readiness** — 3-tier completeness view, drill-down navigation |
| [features/api-reference.md](features/api-reference.md) | **API referentie** — ~130 endpoints, auth flow, common patterns |
| [features/celery-tasks.md](features/celery-tasks.md) | **Celery & async taken** — 33 production tasks, 4 queues, beat schedule |

### Media & AI Pipeline

| Document | Purpose |
|----------|---------|
| [media/media-architecture.md](media/media-architecture.md) | 4-layer media storage (FileAsset → MediaItem → BrandAsset → VideoJob) |
| [media/media-templates.md](media/media-templates.md) | Content generation templates (lineup, match updates, multi-sport) |
| [media/lineup-architecture.md](media/lineup-architecture.md) | Lineup video & flyer: modular pipeline, FFmpeg compositor |
| [media/rvm-alpha-pipeline.md](media/rvm-alpha-pipeline.md) | RVM background removal: MOV alpha → MP4 preview |
| [media/ai-providers.md](media/ai-providers.md) | Provider cascade architecture (MiniMax → Runway → Pika → Veo) |
| [media/ai-models-pricing.md](media/ai-models-pricing.md) | AI model pricing reference |

### Security & Access Control

| Document | Purpose |
|----------|---------|
| [security/index.md](security/index.md) | Security overzicht — navigatie naar alle RBAC/auth docs |
| [security/permission-layers.md](security/permission-layers.md) | 3-laags permissieketen: auth → membership → workflow |
| [security/permission-testing-guide.md](security/permission-testing-guide.md) | Herbruikbare testpatronen voor RBAC-endpoints |

### Infrastructure

| Document | Purpose |
|----------|---------|
| [infrastructure/railway-services.md](infrastructure/railway-services.md) | Railway production: 6 services, worker queues, environment |

### Data Reference

| Document | Purpose | Auto-generated |
|----------|---------|----------------|
| [data/tables.md](data/tables.md) | Database schema + FK relations | ✅ |
| [data/counts.md](data/counts.md) | Model counts snapshot | ✅ |
| [data/hierarchy-compact.md](data/hierarchy-compact.md) | Org → Club → Team hierarchy | ✅ |

### Plans & Analyses

| Document | Purpose |
|----------|---------|
| [plans/package-audit-report.md](plans/package-audit-report.md) | Package relevance audit (keep/archive) |
| [plans/mobile-ux-gamification-analyse.md](plans/mobile-ux-gamification-analyse.md) | Mobile UX analysis + gamification recommendations |
| [plans/optimalisatie-analyse.md](plans/optimalisatie-analyse.md) | **Optimalisatie analyse** — codebase health scan, code splitting, a11y, actieplan |
| [plans/optimalisatie-analyse-2026-03.md](plans/optimalisatie-analyse-2026-03.md) | **Frontend optimalisatie maart 2026** — request waterfalls, deduplicatie, image loading |

---

## Folder Structure

```
05-demo/
├── index.md                  # This file
├── architecture.md           # Full app architecture overview
├── getting-started.md        # Integration guide + domain glossary
├── ai-context-index.md       # AI agent quick-reference
├── frontend-design/          # Frontend design system + UX (9 docs)
│   ├── index.md
│   ├── css-architecture.md
│   ├── theming.md
│   ├── component-library.md
│   ├── mobile-patterns.md
│   ├── mobile-app-blueprint.md
│   ├── refactoring-status.md
│   ├── code-conventions.md
│   └── ux-flows.md
├── features/                 # Feature specs (15 docs)
│   ├── active-context.md
│   ├── api-reference.md
│   ├── branding-tokens.md
│   ├── celery-tasks.md
│   ├── content-templates.md
│   ├── credits-transactions.md
│   ├── generation-queue.md
│   ├── generative-pipeline.md
│   ├── media-readiness-card.md
│   ├── member-asset-save-flow.md
│   ├── members-batch-actions.md
│   ├── notification-routing.md
│   ├── project-hierarchy.md
│   ├── rbac-permissions.md
│   ├── seeding-guide.md
│   ├── video-processing.md
│   └── workflow-engine.md
├── security/                 # Access control & auth (3 docs)
│   ├── index.md
│   ├── permission-layers.md
│   └── permission-testing-guide.md
├── media/                    # Media & AI pipeline (6 docs)
│   ├── media-architecture.md
│   ├── media-templates.md
│   ├── lineup-architecture.md
│   ├── rvm-alpha-pipeline.md
│   ├── ai-providers.md
│   └── ai-models-pricing.md
├── infrastructure/           # Deployment & ops (1 doc)
│   └── railway-services.md
├── data/                     # Data reference — auto-generated (3 docs)
│   ├── tables.md
│   ├── counts.md
│   └── hierarchy-compact.md
├── plans/                    # Plans & analyses (4 docs)
│   ├── package-audit-report.md
│   ├── mobile-ux-gamification-analyse.md
│   ├── optimalisatie-analyse.md
│   └── optimalisatie-analyse-2026-03.md
└── archive/                  # Historical reference
```

---

## Regenerating Auto-Generated Docs

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python scripts/generate_demo_docs.py
```

---

## Archive

Archived docs in [archive/](archive/) — implemented plans, superseded data dumps, legacy docs.

---

## Related

- [../02-roadmap/](../02-roadmap/) — Planned modules
- [../04-modules/](../04-modules/) — Module-specific documentation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.5.0 | 2026-03-12 | 8 new feature docs, data docs regenerated from switchback (production), cross-refs added to all docs, broken links fixed |
| 4.4.0 | 2026-03-12 | Data docs regenerated, credits-transactions + active-context feature docs, Laag 5 alignment fixed, infra apps expanded |
| 4.3.0 | 2026-03-12 | Deep audit: phantom models fixed, 33 apps/40 ViewSets/~35 tasks verified, seeding-guide→features/, frontend-integration→archive/, stale markers |
| 4.2.0 | 2026-03-12 | Docs-hygiene: dead code verwijderd, metrics 179→276 CSS Modules, xrefs fixed, plans/features gereorganiseerd |
| 4.1.0 | 2026-03-12 | Added refactoring-status.md, updated metrics post-hardening+hygiene |
| 4.0.0 | 2026-03-04 | Reorganized: 7 root files → 2, merged schema+seeding+state → data/, added features/ |
| 3.0.0 | 2026-03-04 | Added frontend-design/ (6 docs), archived 6 obsolete plans |
| 2.0.0 | 2026-02-04 | Complete restructure: README, glossary, schema/, seeding/, state/ |
| 1.x | 2026-01 | Original structure with teamreel-*.md files |

---

**Navigation**: [← Back to Documentation Home](../index.md)
