# Technology Stack

## Purpose

This document describes the technical stack and tools used in the Django Core-App project (**72 modules** across **18 development phases**).

---

## 1. Backend Stack

### Core Infrastructure (Phases 1-5)

- **Language**: Python 3.12+
- **Web framework**: Django 5.x
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL (primary target, SQLite allowed for dev/tests)
- **Async tasks**: Celery + Redis (or compatible broker)
- **Caching**: Django cache framework with Redis backend (B25)
- **Environment configuration**: 12-factor (environment variables as primary interface)

### Extended Capabilities (Phases 9, 11)

**File & Media Management (B22)**
- Pillow (image processing, thumbnails)
- Storage adapters: S3 (boto3), Azure Blob Storage, local filesystem
- Optional: ClamAV integration for virus scanning

**Real-time Infrastructure (B23)**
- Django Channels (WebSocket support, ASGI)
- Redis Channels layer (or alternative channel layer)
- Daphne or Uvicorn (ASGI server)

**Search (B24)**
- PostgreSQL full-text search (pg_trgm, GIN indexes)
- Optional: Elasticsearch adapter (elasticsearch-py)

**Workflows (B28)**
- django-fsm or custom state machine implementation

**Payments (B27)**
- Stripe SDK (stripe-python)
- Optional: PayPal SDK, Braintree adapters

**Document Generation (B29)**
- WeasyPrint (HTML-to-PDF, CSS Paged Media)
- ReportLab (programmatic PDF generation)
- openpyxl or xlsxwriter (Excel generation)

### Data & AI Platform (Phases 13-15)

**Data Processing (D01-D05)**
- Pandas / Polars (data manipulation)
- SQLAlchemy (advanced data loading)
- Apache Arrow (efficient data interchange)

**AI & Agents (D11-D16)**
- LangChain / LangGraph (agent orchestration)
- OpenAI SDK / Anthropic SDK (LLM integration)
- Pydantic (structured data validation)
- Vector DB adapters (pgvector, Pinecone, Weaviate)

---

## 2. Frontend Stack

### Core Infrastructure (Phases 6-7)

- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **State Management**: React Query (server state), Zustand/Context (client state)
- **Routing**: React Router
- **Styling**: Tailwind CSS + Headless UI / Radix UI
- **Forms**: React Hook Form + Zod (validation)

### Visual Development (Phase 10)

- **Design-to-Code**: Visily.ai integration
- **Component Library**: Storybook

---

## 3. DevOps & Operations

### Infrastructure (Phase 5, 18)

- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Orchestration**: Kubernetes (optional, via Helm charts) or PaaS (Railway/Render)

### Observability (Phase 5)

- **Logging**: Structured JSON logging
- **Metrics**: Prometheus / Grafana (optional)
- **Tracing**: OpenTelemetry (optional)
- **Error Tracking**: Sentry (optional)

---

## 4. Testing & Quality

- **Backend Testing**: pytest, factory_boy, coverage.py
- **Frontend Testing**: Vitest, React Testing Library, Playwright (E2E)
- **Linting/Formatting**: Ruff (Python), ESLint/Prettier (JS/TS)
- **Security**: Bandit, Safety, OWASP ZAP (Phase 16)
