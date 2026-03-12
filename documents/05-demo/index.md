# TeamReel Web Application — Documentation

**Last Updated:** 2026-03-12
**Status:** v4.5

---

## Overview

Complete documentation for the TeamReel web application — frontend design system, feature specs, media pipeline, infrastructure, and data reference.

---

## Documentation Map

### Getting Started

| Document | Purpose |
|----------|---------|
| [getting-started.md](getting-started.md) | Integration guide, domain glossary, FK hierarchy, seeding patterns |

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

### Features & Architecture

| Document | Purpose |
|----------|---------|
| [features/application-architecture.md](features/application-architecture.md) | **Full app architecture** — 33 apps, 67 models, 40 ViewSets, Celery tasks |
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

### Media & AI Pipeline

| Document | Purpose |
|----------|---------|
| [media/media-architecture.md](media/media-architecture.md) | 4-layer media storage (FileAsset → MediaItem → BrandAsset → VideoJob) |
| [media/media-templates.md](media/media-templates.md) | Content generation templates (lineup, match updates, multi-sport) |
| [media/lineup-architecture.md](media/lineup-architecture.md) | Lineup video & flyer: modular pipeline, FFmpeg compositor |
| [media/rvm-alpha-pipeline.md](media/rvm-alpha-pipeline.md) | RVM background removal: MOV alpha → MP4 preview |
| [media/ai-providers.md](media/ai-providers.md) | Provider cascade architecture (MiniMax → Runway → Pika → Veo) |
| [media/ai-models-pricing.md](media/ai-models-pricing.md) | AI model pricing reference |

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

### Plans

| Document | Purpose |
|----------|---------|
| [plans/package-audit-report.md](plans/package-audit-report.md) | Package relevance audit (keep/archive) |
| [plans/mobile-ux-gamification-analyse.md](plans/mobile-ux-gamification-analyse.md) | Mobile UX analysis + gamification recommendations |

---

## Folder Structure

```
05-demo/
├── index.md                  # This file
├── getting-started.md        # Integration guide + domain glossary
├── frontend-design/          # Frontend design system (8 docs)
│   ├── index.md
│   ├── css-architecture.md
│   ├── theming.md
│   ├── component-library.md
│   ├── mobile-patterns.md
│   ├── mobile-app-blueprint.md
│   ├── refactoring-status.md
│   └── code-conventions.md
├── features/                 # Features & architecture (15 docs)
│   ├── application-architecture.md
│   ├── generation-queue.md
│   ├── member-asset-save-flow.md
│   ├── members-batch-actions.md
│   ├── seeding-guide.md
│   ├── credits-transactions.md
│   ├── active-context.md
│   ├── generative-pipeline.md
│   ├── video-processing.md
│   ├── notification-routing.md
│   ├── branding-tokens.md
│   ├── workflow-engine.md
│   ├── project-hierarchy.md
│   ├── rbac-permissions.md
│   └── content-templates.md
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
├── plans/                    # Active plans (2 docs)
│   ├── package-audit-report.md
│   └── mobile-ux-gamification-analyse.md
└── archive/                  # Historical reference
```

---

## Regenerating Auto-Generated Docs

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@maglev.proxy.rlwy.net:32345/railway"
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
| 4.5.0 | 2026-03-12 | 8 new feature docs: generative pipeline, video processing, notifications, branding, workflows, projects, RBAC, content templates |
| 4.4.0 | 2026-03-12 | Data docs regenerated (maglev DB), credits-transactions + active-context feature docs, Laag 5 alignment fixed, infra apps expanded |
| 4.3.0 | 2026-03-12 | Deep audit: phantom models fixed, 33 apps/40 ViewSets/~35 tasks verified, seeding-guide→features/, frontend-integration→archive/, stale markers |
| 4.2.0 | 2026-03-12 | Docs-hygiene: dead code verwijderd, metrics 179→276 CSS Modules, xrefs fixed, plans/features gereorganiseerd |
| 4.1.0 | 2026-03-12 | Added refactoring-status.md, updated metrics post-hardening+hygiene |
| 4.0.0 | 2026-03-04 | Reorganized: 7 root files → 2, merged schema+seeding+state → data/, added features/ |
| 3.0.0 | 2026-03-04 | Added frontend-design/ (6 docs), archived 6 obsolete plans |
| 2.0.0 | 2026-02-04 | Complete restructure: README, glossary, schema/, seeding/, state/ |
| 1.x | 2026-01 | Original structure with teamreel-*.md files |

---

**Navigation**: [← Back to Documentation Home](../index.md)
