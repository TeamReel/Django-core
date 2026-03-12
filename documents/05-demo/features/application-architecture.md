# TeamReel Application Architecture

> Last updated: 2026-03-12

## Overview

TeamReel is an AI-powered content platform for amateur sports clubs. It generates professional branded content (videos, visuals, line-ups, match graphics) in the club's own style — automatically.

**Stack:** Django 5 + DRF (backend) · React 18 + TypeScript + Vite (frontend) · PostgreSQL · Redis · Celery · S3 · FFmpeg

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│  React 18 + TypeScript + Vite  (Vercel)                        │
│  demo/src/                                                      │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST API (JWT auth)
┌───────────────────────▼─────────────────────────────────────────┐
│                      Backend API                                │
│  Django 5 + DRF  (Railway)                                      │
│  /api/v1/  — 40 ViewSets, 67 models                           │
├─────────────────────────────────────────────────────────────────┤
│  Celery Workers (4 queues, 3 workers)                           │
│  celery-worker · video-worker · worker-ai                       │
│  ~35 background tasks                                           │
├──────────┬──────────────┬───────────────────────────────────────┤
│ PostgreSQL│    Redis     │         Amazon S3                    │
│ (Railway) │  (Railway)   │  FileAsset storage                  │
└──────────┴──────────────┴───────────────────────────────────────┘
```

## Data Hierarchy

```
Organisation (federation: KNVB, DFB, etc.)
 └── Project (club: AFC Ajax)
      ├── BrandProfile (colors, logo, kits, tokens)
      └── Project (team: Ajax 1)  ← nested via parent_project
           └── Period (season: 2024/2025)
                └── Period (competition: Eredivisie)  ← nested via parent_period
                     └── Activity (match, training, event)
                          └── Participation → ProjectMembership
```

---

## Backend Apps (33 Django apps in `src/`)

### Core Platform

| App | Purpose | Key Models |
|-----|---------|-----------|
| **organisations** | Multi-tenancy: orgs + memberships | `Organisation`, `Membership` |
| **projects** | Club/team hierarchy, memberships, invites | `Project`, `ProjectMembership`, `ProjectInvite` |
| **accounts** | User auth (JWT), custom User model | `User`, `UserActiveContext` |
| **permissions** | Hierarchical RBAC | `Permission`, `Role`, `RoleAssignment` |
| **activities** | Periods (seasons/competitions) + activities | `Period`, `Activity`, `Participation` |

### Content & Media

| App | Purpose | Key Models |
|-----|---------|-----------|
| **branding** | Brand identity — colors, logos, kits, tokens | `BrandProfile`, `DesignToken`, `BrandAsset` |
| **content_generation** | Content templates + items + approvals | `ContentTemplate`, `ContentItem`, `ContentApproval` |
| **generative** | AI generation pipeline (prompt → provider → output) | `GenerationTemplate`, `GenerationRequest`, `GenerationOutput`, `GenerationJob` |
| **video** | FFmpeg pipeline — transcode, compose, lineup | `VideoJob`, `VideoPreset`, `PlatformExport`, `VideoOverlay` |
| **medialib** | Rich media library with search, tags, collections | `MediaItem`, `MediaTag`, `Collection` |
| **files** | Low-level S3 storage (org-scoped, soft-delete) | `FileAsset` |

### Communication & Collaboration

| App | Purpose | Key Models |
|-----|---------|-----------|
| **notifications** | Notification delivery with channels + retry | `Notification`, `NotificationType`, `DeliveryAttempt` |
| **contextual_notifications** | Smart routing with per-user preferences | `RoutingRule`, `NotificationPreference` |
| **workflows** | State machine for approval flows | `WorkflowTemplate`, `WorkflowInstance`, `TransitionHistory` |
| **navigation** | User navigation state (recents + favorites) | `UserRecent`, `UserFavorite` |

### Platform Services

| App | Purpose | Key Models |
|-----|---------|-----------|
| **search** | Hierarchical search engine | `SearchEntry` |
| **credits** | Credit system for AI generation | `CreditsBalance`, `ProjectCreditsBalance` |
| **transactions** | Usage events, transactions, balance policies | `UsageEvent`, `Transaction`, `BalancePolicy` |
| **settings** | Feature flags + key-value settings | `FeatureFlag`, `Setting` |
| **sport_configuration** | Sport → variant → positions, formations | `Sport`, `Formation`, `OutfitConfiguration` |
| **audit** | Audit logging for all business actions | `AuditEvent` |
| **observability** | Platform metrics, Prometheus integration | `SystemMetric` |

### Infrastructure

| App | Purpose |
|-----|---------|
| **api** | API foundation — v1 routing, optimistic create mixin |
| **config** | Django settings, URLs, middleware |
| **common** | Shared utilities, health check |
| **core** | Core utilities shared across apps |
| **tasks** | Celery task framework — base classes, monitoring |
| **i18n_preferences** | Hierarchical language/locale/timezone preferences (user → org → global fallback). Middleware auto-activates per request. Models: uses `settings.Setting` |
| **rtc_websockets** | Django Channels WebSocket infra — authenticated connections, channel subscriptions (user/org/project), presence tracking, rate limiting, Redis channel layer. Models: `WebSocketConnection`, `RealtimeMessage`, `PresenceStatus` |
| **web_ui** | Server-rendered HTML pages |
| **scaffolding** | CLI code generator (`django-core-scaffold`) — scaffolds apps/modules via Jinja2 templates, atomic generation with rollback, conflict detection, constitutional naming validation |
| **constitution_engine** | Standalone static analysis engine — runs mypy, Ruff, test coverage, custom rules via plugin pipeline. No Django models (pure Python dataclasses). Outputs: console, JSON, GitHub Actions annotations |
| **security_baseline** | Security enforcement via registry of declarative rules (Django settings, sessions, CSRF, headers, passwords). Mapped to OWASP ASVS references. Integrates with constitution_engine as plugin. API: rules viewer + ASVS coverage |

---

## API Surface

All APIs under `/api/v1/`, authenticated via JWT (`SimpleJWT`).

**40 ViewSets** organized by domain:

| Domain | Endpoints | Key operations |
|--------|-----------|----------------|
| **Auth** | `auth/token/` | Obtain, refresh, verify JWT tokens |
| **Users** | `users/` | CRUD, profile, active context switch |
| **Organisations** | `organisations/`, `memberships/` | Org management, member roles |
| **Projects** | `projects/`, `memberships/`, `invites/` | Club/team CRUD, invite flows |
| **Activities** | `activities/`, `periods/` | Match/event management, seasons |
| **Branding** | `branding/` | Brand profiles, design tokens, assets |
| **Content** | `content-generation/` | Templates, items, approvals |
| **Generative AI** | `generative/` | Templates, requests, outputs, jobs |
| **Video** | `video/` | Jobs, presets, platform exports |
| **Media** | `media/`, `media-library/` | Items, tags, collections |
| **Files** | `files/` | S3 upload/download |
| **Workflows** | `workflows/` | Templates, instances, transitions |
| **Notifications** | `notifications/`, `contextual-notifications/` | Delivery, routing, preferences |
| **Settings** | `settings/` | Feature flags, key-value store |
| **Sports** | `sports/` | Sports, formations, outfits, validation |
| **Search** | `search/` | Hierarchical search |
| **Navigation** | `navigation/` | Recents, favorites |
| **Credits** | `credits/` | Org/project/user balances |
| **Transactions** | `transactions/` | Usage events, balance policies |

---

## Background Processing (Celery)

Four queues on Railway, served by three workers:

| Worker | Queue | Tasks |
|--------|-------|-------|
| **celery-worker** | default | Notifications, search indexing, cleanup |
| **video-worker** | video | FFmpeg transcode, compose, thumbnail, lineup |
| **worker-ai** | ai | AI generation, content generation |

### Key task categories (~35 tasks)

| Category | Tasks | Examples |
|----------|-------|---------|
| **Video processing** | 10 | `process_video_job`, `compose_video`, `process_lineup_video`, `auto_crop_*` |
| **AI generation** | 4 | `process_generation_request`, `recover_stale_generation_jobs` |
| **Content** | 2 | `generate_content_task`, `cleanup_expired_content` |
| **Media** | 2 | `process_media_item`, `generate_media_thumbnails` |
| **Notifications** | 3 | `deliver_email_notification`, `route_event_task` |
| **Maintenance** | 4 | `cleanup_deleted_files`, `collect_system_metrics`, `reprocess_stuck_assets_periodic` |

---

## Content Generation Pipeline

The core business flow:

```
User selects template (ContentTemplate)
  → AI generates content (GenerationRequest → GenerationJob)
    → Provider cascade: MiniMax → Runway → Pika → Veo
      → Output saved (GenerationOutput → MediaItem)
        → Workflow approval (WorkflowInstance)
          → Video processing (VideoJob → FFmpeg)
            → Platform export (PlatformExport)
```

See [media/](media/) for detailed pipeline documentation.

---

## Frontend Structure (`demo/src/`)

| Folder | Purpose |
|--------|---------|
| `pages/` | Route-level pages (dashboard, projects, activities, identity, studio, etc.) |
| `components/` | Shared UI: AppShell, Sidebar, MobileBottomNav, SearchBar |
| `components/ui/` | 15 UI primitives (Card, Badge, Avatar, Modal, etc.) |
| `providers/` | React context: Auth, Season, Theme, Organisation |
| `adapters/` | API client layer (fetch wrappers) |
| `hooks/` | Shared hooks (useApi, useDebounce, useHapticFeedback, etc.) |
| `styles/` | Global CSS: tokens, theme, utilities, layouts, responsive |

See [frontend-design/](frontend-design/) for complete design system documentation.
