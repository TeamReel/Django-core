# TeamReel AI Context Index

> Quick-reference for AI agents to find domain-specific documentation.

## How to Use This File

Reference this file when you need to find the right documentation for a task. Each section maps a topic to its source document.

---

## Brand & Product

| Topic | Document | Key Content |
|-------|----------|-------------|
| Brand identity | [brand-identity.md](brand-identity.md) | Colors, typography, tone of voice, logo system, design tokens |
| Functional design | [functional-flows.md](features/functional-flows.md) | User roles, UX flows, match-phase content, AI workflows, data model overview |
| Business context | [business.md](../01-vision/business.md) | Market opportunity, target audience, competitive positioning, revenue model |

## Architecture & System Design

| Topic | Document | Key Content |
|-------|----------|-------------|
| Full system overview | [architecture.md](architecture.md) | Stack, 67 models, 40 ViewSets, Celery queues, service diagram |
| Data hierarchy | [project-hierarchy.md](features/project-hierarchy.md) | Organisation → Project → Period → Activity nesting |
| RBAC permissions | [rbac-permissions.md](features/rbac-permissions.md) | Permission registry, Role, RoleAssignment, hierarchy |
| Workflow engine | [workflow-engine.md](features/workflow-engine.md) | State machine, transitions, approval flows |
| Database tables | [tables.md](data/tables.md) | All 67 model definitions |
| Data counts | [counts.md](data/counts.md) | Current production data volumes |

## Frontend Design System

| Topic | Document | Key Content |
|-------|----------|-------------|
| Code conventions | [code-conventions.md](frontend-design/code-conventions.md) | File rules, naming, styling tree, quality gates, review checklist |
| Component library | [component-library.md](frontend-design/component-library.md) | 15 UI primitives with props and usage |
| CSS architecture | [css-architecture.md](frontend-design/css-architecture.md) | Layered system, all token values, utility classes |
| Theming | [theming.md](frontend-design/theming.md) | Light/dark, semantic tokens, brand colors |
| Mobile patterns | [mobile-patterns.md](frontend-design/mobile-patterns.md) | Breakpoints, touch targets, safe areas, gestures |
| UX flows | [ux-flows.md](frontend-design/ux-flows.md) | App shell, sidebar, navigation, all user flows |

## Content & Media

| Topic | Document | Key Content |
|-------|----------|-------------|
| Media architecture | [media-architecture.md](media/media-architecture.md) | 4-layer system: FileAsset → MediaItem → linking → VideoJob |
| Video processing | [video-processing.md](features/video-processing.md) | FFmpeg pipeline, VideoPreset, overlays, exports |
| Content templates | [content-templates.md](features/content-templates.md) | ContentTemplate, ContentField, content types |
| Lineup system | [lineup-architecture.md](media/lineup-architecture.md) | Lineup generation and rendering |

## AI & Generation

| Topic | Document | Key Content |
|-------|----------|-------------|
| Generative pipeline | [generative-pipeline.md](features/generative-pipeline.md) | Prompt → Provider → Result, LangGraph |
| AI models & pricing | [ai-models-pricing.md](media/ai-models-pricing.md) | OpenAI vs Gemini, costs, capabilities |
| AI providers | [ai-providers.md](media/ai-providers.md) | Provider configuration, fallbacks |
| Credits system | [credits-transactions.md](features/credits-transactions.md) | Credit balance, transactions, billing |

## Features & Flows

| Topic | Document | Key Content |
|-------|----------|-------------|
| Brand identity | [brand-identity.md](brand-identity.md) | Colors, typography, tone of voice, logo system |
| Branding (technical) | [branding-tokens.md](features/branding-tokens.md) | BrandProfile, BrandAsset, identity tokens |
| Notifications | [notification-routing.md](features/notification-routing.md) | Notification types, delivery channels |
| Member management | [members-batch-actions.md](features/members-batch-actions.md) | Bulk operations, import/export |
| Member assets | [member-asset-save-flow.md](features/member-asset-save-flow.md) | Photo upload and processing flow |
| Media readiness | [media-readiness-card.md](features/media-readiness-card.md) | Dashboard card: Club/Team/Member media completeness, drill-down navigation |
| Seeding | [seeding-guide.md](features/seeding-guide.md) | Development data seeding |

## Security & Access Control

| Topic | Document | Key Content |
|-------|----------|-------------|
| Security overview | [index.md](security/index.md) | Navigatie naar alle security/RBAC docs |
| Permission layers | [permission-layers.md](security/permission-layers.md) | 3-laags permissieketen: auth → membership → workflow |
| Permission testing | [permission-testing-guide.md](security/permission-testing-guide.md) | Herbruikbare testpatronen voor RBAC-endpoints |

## Infrastructure

| Topic | Document | Key Content |
|-------|----------|-------------|
| Railway deployment | [railway-services.md](infrastructure/railway-services.md) | Services, environment, scaling |
| API reference | [api-reference.md](features/api-reference.md) | ~130 endpoints, auth flow, permission patterns |
| Celery tasks | [celery-tasks.md](features/celery-tasks.md) | 33 production tasks, 4 queues, beat schedule |

## Plans & Analysis

| Topic | Document | Key Content |
|-------|----------|-------------|
| Mobile UX strategy | [mobile-ux-gamification-analyse.md](plans/mobile-ux-gamification-analyse.md) | Gamification, engagement features |
| Package audit | [package-audit-report.md](plans/package-audit-report.md) | Dependency analysis |
| Optimalisatie analyse | [optimalisatie-analyse.md](plans/optimalisatie-analyse.md) | Codebase health scan, code splitting, a11y, actieplan |
| Frontend optimalisatie 2026-03 | [optimalisatie-analyse-2026-03.md](plans/optimalisatie-analyse-2026-03.md) | Request waterfalls, deduplicatie, image loading |

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
