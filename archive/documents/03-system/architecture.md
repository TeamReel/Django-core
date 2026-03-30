# System Architecture

## 1. Architecture Layers

The platform is organized into **4 layers**. Higher layers build on the stable foundation of lower layers.

### Layer 1: Backend Core (Foundation)
The non-negotiable infrastructure required by every product on this platform.

| App | Purpose |
|-----|---------|
| `accounts` | User management, authentication |
| `organisations` | Multi-tenant root, org hierarchy |
| `projects` | Project/team structure (nested via `parent_project`) |
| `permissions` | RBAC, role-based access control |
| `security_baseline` | Security settings, rate limiting |
| `audit` | Audit logging for security events |
| `settings` | Configuration management per org/project |
| `api` | DRF API standards, pagination, versioning |
| `notifications` | Notification creation and persistence |
| `contextual_notifications` | Smart routing with user preferences |
| `tasks` | Celery task management and scheduling |
| `i18n_preferences` | Internationalization preferences |
| `config` | Django settings per environment |

### Layer 2: Frontend Core (UX)
The React frontend consuming Layer 1 APIs. Monorepo packages for reusability.

| Package / Area | Purpose |
|----------------|---------|
| `@django-core/design-system` | Tokens, components, layouts |
| `@django-core/auth-ui` | Login, registration, password flows |
| `@django-core/context-switcher` | Org/project switching |
| `@django-core/page-templates` | Standard page layouts |
| `@django-core/theme-system` | Brand-aware theming |
| `@django-core/api-client` | Typed API client with React Query |

### Layer 3: Extended Capabilities (Application)
Rich features beyond basic CRUD — content, media, AI, video, workflows.

| App | Purpose |
|-----|---------|
| `files` | File management, S3 storage (FileAsset) |
| `medialib` | Media library with semantic metadata (MediaItem) |
| `branding` | Brand profiles — colors, logos, kits, tokens |
| `content_generation` | Content templates with field definitions |
| `generative` | AI generation pipeline (OpenAI, Gemini, LangGraph) |
| `video` | FFmpeg video processing and platform exports |
| `workflows` | State machine workflow engine |
| `credits` | Credits system for AI generation |
| `transactions` | Transaction tracking |
| `search` | Full-text search |
| `rtc_websockets` | Real-time WebSocket updates |
| `activity_feed` | Organisation activity feed |
| `trash` | Soft-delete with restore |
| `navigation` | Admin navigation configuration |
| `web_ui` | Server-rendered admin pages |

### Layer 4: Product Layer (TeamReel)
Domain-specific business logic for the first product.

| App | Purpose |
|-----|---------|
| `activities` | Matches, trainings, events within periods |
| `sport_configuration` | Sport-specific rules, positions, formations |
| Members (via `projects`) | Players, coaches, staff linked to projects |
| Periods (via `projects`) | Seasons → competitions (nested hierarchy) |

---

## 2. Module Design Principles

1.  **Self-Contained**: Apps manage their own models and logic.
2.  **Loosely Coupled**: Communication via defined service interfaces.
3.  **Org-Scoped**: All querysets filtered by organisation — no data leaks.
4.  **Extensible**: Configurable via settings without forking.

## 3. Data Flow

```
Client (React) → API (DRF ViewSet) → Serializer (validation) → Service (business logic) → Model (ORM) → Database
                                                                  ↓
                                                          Celery Task (async: email, video, AI)
                                                                  ↓
                                                          Audit Log / Notification
```

## 4. Infrastructure

| Service | Technology | Hosting |
|---------|-----------|---------|
| Backend API | Django 5 + DRF | Railway |
| Frontend | React 18 + Vite | Vercel |
| Database | PostgreSQL | Railway |
| Cache + Broker | Redis | Railway |
| Workers | Celery (3 queues) | Railway |
| Storage | S3 | AWS |
| Scheduler | Celery Beat | Railway |

See [Stack](stack.md) for the full technology stack.
