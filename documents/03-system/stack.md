# Technology Stack

## Purpose

This document describes the technical stack used in the project.

---

## 1. Backend Stack

### Core Infrastructure

- **Language**: Python 3.12+
- **Web framework**: Django 5.x
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL (Railway)
- **Async tasks**: Celery + Redis
- **Caching**: Django cache framework with Redis backend
- **Environment configuration**: 12-factor (environment variables)

### Extended Capabilities

**File & Media Management (B22)**
- Pillow (image processing, thumbnails)
- boto3 (S3 storage)

**Real-time Infrastructure (B23)**
- Django Channels (WebSocket support, ASGI)
- Redis Channels layer

**Search (B24)**
- PostgreSQL full-text search (pg_trgm, GIN indexes)

**Workflows (B37)**
- Custom state machine implementation

**AI / Generative (B34)**
- OpenAI SDK (image + text generation)
- Google Generative AI SDK (Gemini)
- LangGraph SDK (workflow orchestration)
- Pydantic (structured data validation)

**Video Processing (B55)**
- FFmpeg (transcoding, overlays, exports)

---

## 2. Frontend Stack

### Core Infrastructure

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript (strict mode)
- **Data Fetching**: @tanstack/react-query
- **Routing**: react-router-dom
- **Styling**: CSS Modules (no Tailwind, no CSS-in-JS)
- **Icons**: lucide-react
- **Drag & Drop**: @dnd-kit
- **Virtualization**: react-window
- **Charts**: recharts

### Internal Packages (monorepo)

- `@django-core/design-system` — tokens, UI primitives
- `@django-core/api-client` — type-safe API wrapper
- `@django-core/auth-ui` — login/register components
- `@django-core/context-switcher` — org/project navigation
- `@django-core/page-templates` — layout templates
- `@django-core/theme-system` — light/dark theming

---

## 3. Infrastructure & Operations

- **Hosting**: Railway (backend, Celery workers, PostgreSQL, Redis)
- **Frontend hosting**: Vercel
- **Containerization**: Docker & Docker Compose (local dev)
- **CI/CD**: Manual deploy via Railway CLI (GitHub Actions planned)

### Observability

- **Logging**: Structured Python logging
- **Error Tracking**: Sentry (optional)

---

## 4. Testing & Quality

- **Backend Testing**: pytest, factory_boy, coverage.py
- **Frontend Testing**: Vitest, React Testing Library, Playwright (E2E)
- **Linting**: Ruff (Python), ESLint + Stylelint (frontend)
- **Type checking**: mypy (Python), TypeScript `--noEmit` (frontend)
