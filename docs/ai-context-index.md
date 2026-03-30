# AI Context Index

> Quick-reference for AI agents to find domain-specific documentation.
> All paths are relative to `docs/`.

---

## Product & Brand

| Topic | Document | Key Content |
|-------|----------|-------------|
| Vision & mission | [product/vision.md](product/vision.md) | 80/20 principle, target users, IS/IS NOT, long-term direction |
| Business context | [product/business.md](product/business.md) | Market opportunity, target audience, competitive positioning, revenue model |
| Brand identity | [product/brand.md](product/brand.md) | Colors, typography, tone of voice, logo system, design tokens |

## TeamReel (Product)

| Topic | Document | Key Content |
|-------|----------|-------------|
| Businessplan | [teamreel/businessplan.md](teamreel/businessplan.md) | Visie, markt, verdienmodel, groeistrategie |
| Functional design | [teamreel/functional-design.md](teamreel/functional-design.md) | Gebruikersrollen, modules, UX-flows, wedstrijd-fase content |
| Technical design | [teamreel/technical-design.md](teamreel/technical-design.md) | Architectuur, apps, data model, AI/video pipeline |
| Pitchdeck | [teamreel/pitchdeck.md](teamreel/pitchdeck.md) | Investor presentation |

## Core Platform (80/20)

| Topic | Document | Key Content |
|-------|----------|-------------|
| Platform overview | [coreapp/overview.md](coreapp/overview.md) | What core provides, design principles, 80/20 model |
| Core modules | [coreapp/modules.md](coreapp/modules.md) | All 22 core apps with models and capabilities |
| Extending the core | [coreapp/extending.md](coreapp/extending.md) | How to build a product on the platform |

## Architecture & Data

| Topic | Document | Key Content |
|-------|----------|-------------|
| System overview | [architecture/overview.md](architecture/overview.md) | Stack, 67 models, 40 ViewSets, Celery queues, service diagram |
| Tech stack | [architecture/stack.md](architecture/stack.md) | Django, React, PostgreSQL, Redis, Railway, Vercel |
| Data model | [architecture/data-model.md](architecture/data-model.md) | All 67 model definitions |
| Glossary | [architecture/glossary.md](architecture/glossary.md) | Domain terms and definitions |
| Constitution | [architecture/constitution.md](architecture/constitution.md) | Governance rules, quality standards, SDD principles |
| ADRs | [architecture/adr/](architecture/adr/) | Architecture Decision Records |

## Features

| Topic | Document | Key Content |
|-------|----------|-------------|
| Data hierarchy | [features/project-hierarchy.md](features/project-hierarchy.md) | Organisation → Project → Period → Activity nesting |
| RBAC permissions | [features/rbac-permissions.md](features/rbac-permissions.md) | Permission registry, roles, hierarchy |
| Workflow engine | [features/workflow-engine.md](features/workflow-engine.md) | State machine, transitions, approval flows |
| Branding tokens | [features/branding-tokens.md](features/branding-tokens.md) | BrandProfile, BrandAsset, identity tokens |
| Content templates | [features/content-templates.md](features/content-templates.md) | ContentTemplate, ContentField, content types |
| Notifications | [features/notification-routing.md](features/notification-routing.md) | Notification types, delivery channels |
| Members | [features/members-batch-actions.md](features/members-batch-actions.md) | Bulk operations, import/export |
| Member assets | [features/member-asset-save-flow.md](features/member-asset-save-flow.md) | Photo upload and processing flow |
| Media readiness | [features/media-readiness-card.md](features/media-readiness-card.md) | Dashboard card: media completeness, drill-down |
| Credits & billing | [features/credits-transactions.md](features/credits-transactions.md) | Credit balance, transactions, billing |
| Generation queue | [features/generation-queue.md](features/generation-queue.md) | Queue management for AI generation |
| Seeding | [features/seeding-guide.md](features/seeding-guide.md) | Development data seeding |
| API reference | [features/api-reference.md](features/api-reference.md) | ~130 endpoints, auth flow, permission patterns |
| Celery tasks | [features/celery-tasks.md](features/celery-tasks.md) | 33 production tasks, 4 queues, beat schedule |
| Functional flows | [features/functional-flows.md](features/functional-flows.md) | User roles, UX flows, match-phase content |
| Active context | [features/active-context.md](features/active-context.md) | Current build context |

## Frontend

| Topic | Document | Key Content |
|-------|----------|-------------|
| Code conventions | [frontend/code-conventions.md](frontend/code-conventions.md) | File rules, naming, styling, quality gates |
| Component library | [frontend/component-library.md](frontend/component-library.md) | 15 UI primitives with props and usage |
| CSS architecture | [frontend/css-architecture.md](frontend/css-architecture.md) | Layered system, all token values, utility classes |
| Theming | [frontend/theming.md](frontend/theming.md) | Light/dark, semantic tokens, brand colors |
| Mobile patterns | [frontend/mobile-patterns.md](frontend/mobile-patterns.md) | Breakpoints, touch targets, safe areas |
| UX flows | [frontend/ux-flows.md](frontend/ux-flows.md) | App shell, sidebar, navigation, all user flows |

## Media & AI

| Topic | Document | Key Content |
|-------|----------|-------------|
| Media architecture | [media/media-architecture.md](media/media-architecture.md) | 4-layer system: FileAsset → MediaItem → linking → VideoJob |
| Video processing | [features/video-processing.md](features/video-processing.md) | FFmpeg pipeline, VideoPreset, overlays, exports |
| Lineup system | [media/lineup-architecture.md](media/lineup-architecture.md) | Lineup generation and rendering |
| Media templates | [media/media-templates.md](media/media-templates.md) | Template definitions for media generation |
| Generative pipeline | [features/generative-pipeline.md](features/generative-pipeline.md) | Prompt → Provider → Result, LangGraph |
| AI models & pricing | [media/ai-models-pricing.md](media/ai-models-pricing.md) | OpenAI vs Gemini, costs, capabilities |
| AI providers | [media/ai-providers.md](media/ai-providers.md) | Provider configuration, fallbacks |
| RVM pipeline | [media/rvm-alpha-pipeline.md](media/rvm-alpha-pipeline.md) | Background removal pipeline |

## Security

| Topic | Document | Key Content |
|-------|----------|-------------|
| Security overview | [security/index.md](security/index.md) | Navigation to all security docs |
| Permission layers | [security/permission-layers.md](security/permission-layers.md) | 3-layer chain: auth → membership → workflow |
| Permission testing | [security/permission-testing-guide.md](security/permission-testing-guide.md) | Reusable test patterns for RBAC endpoints |

## Infrastructure

| Topic | Document | Key Content |
|-------|----------|-------------|
| Railway services | [infrastructure/railway-services.md](infrastructure/railway-services.md) | Services, environment, scaling |
| Database | [infrastructure/database.md](infrastructure/database.md) | PostgreSQL setup, queries, optimization |
| Observability | [infrastructure/observability.md](infrastructure/observability.md) | Monitoring, logging, alerting |

## Guides

| Topic | Document | Key Content |
|-------|----------|-------------|
| Getting started | [guides/getting-started.md](guides/getting-started.md) | Development environment setup |
| Spec Kitty | [guides/spec-kitty.md](guides/spec-kitty.md) | Spec-Driven Development workflow |
| Extending core | [guides/extending-core.md](guides/extending-core.md) | Adding modules to the platform |
| Git workflow | [guides/git-workflow.md](guides/git-workflow.md) | Branching, commits, PR process |
| Testing | [guides/testing.md](guides/testing.md) | Test strategy and patterns |
| CI/CD | [guides/cicd.md](guides/cicd.md) | Pipeline configuration |

## Roadmap

| Topic | Document | Key Content |
|-------|----------|-------------|
| Roadmap overview | [roadmap/roadmap.md](roadmap/roadmap.md) | Phases, priorities, module status |
| Module specs | [roadmap/modules/](roadmap/modules/) | backlog/, ready/, active/, done/, quick/, later/ |

---

## Quick Data Model Reference

```
Organisation (multi-tenant root)
 └─ Membership (user ↔ org, role)
 └─ Project (club or team, nested via parent_project)
     └─ ProjectMembership (user ↔ project, role)
     └─ BrandProfile (identity: colors, logo, kits, tokens)
         └─ BrandAsset (logo, kit image, etc.)
     └─ Period (season or competition, nested via parent_period)
         └─ Activity (match, training, event)
             └─ ActivityParticipation (member + role in activity)
     └─ Member (player, coach, staff — sport-specific metadata)
         └─ MediaItem (photos, assets)
```

## Quick Pipeline Reference

```
Content Creation:
  BrandProfile → ContentTemplate → GenerationRequest → AI Provider → GenerationResult

Video Pipeline:
  GenerationResult → VideoJob → FFmpeg → VideoPreset → Export (platform-specific)

Media Flow:
  Upload → FileAsset (S3) → MediaItem (metadata) → BrandAsset/Relation (semantic link)
```
