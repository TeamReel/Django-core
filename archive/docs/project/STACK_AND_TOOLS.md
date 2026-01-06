# STACK_AND_TOOLS.md

## Purpose

This document describes the technical stack and tools used in the Django Core-App project (**68 modules** across **16 development phases**).
It is meant for both human developers and AI coding/review agents (Spec Kitty, GitHub Copilot, ChatGPT).

---

## Backend Stack

### Core Infrastructure (Fase 1-7)

- **Language**: Python 3.12+
- **Web framework**: Django 5.x
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL (primary target, SQLite allowed for dev/tests)
- **Async tasks**: Celery + Redis (or compatible broker)
- **Caching**: Django cache framework with Redis backend (B25)
- **Environment configuration**: 12-factor (environment variables as primary interface)

### Extended Capabilities (Fase 8-13)

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

**Workflows (B27)**
- django-fsm or custom state machine implementation

**Payments (B26)**
- Stripe SDK (stripe-python)
- Optional: PayPal SDK, Braintree adapters

**Document Generation (B28)**
- WeasyPrint (HTML-to-PDF, CSS Paged Media)
- ReportLab (programmatic PDF generation)
- openpyxl or xlsxwriter (Excel generation)

**Data Platform (D01-D16) — Optional Power-up**
- pandas, pyarrow (ETL, data processing)
- Redis Streams (streaming data adapter)
- SQLAlchemy (data lineage, multi-database support)
- Pydantic (structured output validation)
- mlflow or custom registry (model/experiment tracking)
- PostgreSQL pgvector or Pinecone (vector search, RAG)
- langchain or custom agents (agent orchestration)

---

## Frontend Stack

### Core (Fase 6-7)

- **Conceptual model**: Component-based SPA/MPA
- **Reference stack**: React 18.x + TypeScript 5.x (Next.js for examples)
- **Styling**: vanilla-extract (zero-runtime CSS), design-system-driven (F01 tokens)
- **Build tooling**: Vite 5.x (fast dev server, optimized builds)
- **Testing**: Vitest, React Testing Library, Chromatic (visual regression)

### Extended Capabilities (Fase 8-10)

**Data Visualization (F08)**
- recharts (React charting library)
- Alternative: Chart.js, D3.js adapters

**Rich Text Editor (F13)**
- TipTap (headless WYSIWYG, extensible)
- Alternative: Quill, Slate.js

**Design-to-Code Workflow (F09)**
- Visily.ai-style AI design tools integration
- Generates components using F01 design system tokens
- Figma plugin compatibility (optional)

**UI State Management**
- React Context (multi-tenancy context, theme)
- Optional: Zustand, Jotai for complex state

**Forms & Validation**
- React Hook Form
- Zod (schema validation, TypeScript integration)

---

## Infrastructure and Deployment

- **Containerisation**: Docker as primary reference
- **Orchestration**: Kubernetes or equivalent (not required for local dev)
- **CI/CD**: GitHub Actions (reference implementation)
- **Secrets**: Environment variables or secret management per environment (no secrets in repo)

---

## Testing, Quality & Security Tools

- **Testing**: pytest (unit, integration), pytest-django
- **Linting**: ruff / flake8 (Python), isort-style import ordering
- **Type checking**: mypy (or equivalent)
- **Security**:
  - Dependency scanning (e.g. pip-audit or SCA tooling in CI)
  - Static analysis (e.g. bandit or equivalent)
  - Configuration checks where possible

---

## AI and Spec Tools

- **Spec framework**: Spec Kitty (Spec-Driven Development)
- **Coding agent**: GitHub Copilot Agent in VS Code
- **Assistant**: ChatGPT with project files attached (vision, modules, workflow, etc.)

### General rules for AI usage

- Specs and plans in English, concise and structured.
- Code changes always reference:
  - feature ID (Bxx/Fxx),
  - spec document or Spec Kitty feature,
  - related tasks (WPxx/Txxx).
- AI-generated code must:
  - include tests where relevant,
  - pass linting and type checks,
  - follow the Engineering Constitution.

---
