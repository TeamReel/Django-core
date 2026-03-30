# Glossary

Key terms used in the platform. Shared vocabulary for humans and AI agents.

---

## Core Terms

- **Core Platform**
  The 80/20 foundation: multi-tenant architecture, content management, AI generation, video processing, background tasks — all reusable across products.

- **80/20 Principle**
  The core provides 80% reusable infrastructure. Products add 20% domain-specific logic.

- **TeamReel**
  The first product built on the core platform. AI-powered content platform for amateur sports clubs — generates branded videos, match graphics, and line-ups.

- **Spec-Driven Development (SDD)**
  Workflow where features are specified, planned, and broken into tasks before implementation. Managed via the Spec Kitty workflow.

- **Spec Kitty**
  The governance workflow for building features with AI agents. Ensures traceability from spec → plan → implementation → tests.

---

## Data Hierarchy

- **Organisation**
  Multi-tenant root. All data is scoped to an organisation. Represents a club or federation.

- **Project**
  A team or club within an organisation. Can nest via `parent_project` (club → team).

- **Period**
  A season or competition. Can nest via `parent_period` (season → competition).

- **Activity**
  A match, training, or event within a period.

- **Member**
  A person linked to a project (player, coach, staff). Has sport-specific metadata.

- **BrandProfile**
  Club identity — colors, logo, kit images, typography tokens. Linked to a project.

---

## Content & Media

- **FileAsset**
  S3-stored file with metadata. All uploads go through this model.

- **MediaItem**
  Semantic wrapper around FileAsset (photo, video, document).

- **ContentTemplate**
  Defines what content can be generated — fields, layout type, output format.

- **GenerationRequest**
  A user request for AI to generate content from template + brand + data.

- **GenerationResult**
  The output of an AI generation — text, image, or video parameters.

- **VideoJob**
  FFmpeg pipeline that turns generation results into platform-specific video exports.

---

## Frontend

- **Design System** (`@django-core/design-system`)
  Design tokens, components, and layouts used across the frontend.

- **Context Switcher** (`@django-core/context-switcher`)
  UI element for switching between organisations and projects.

- **Page Templates** (`@django-core/page-templates`)
  Standard page layouts: list, detail, form, dashboard.

- **Theme System** (`@django-core/theme-system`)
  Brand-aware theming that applies BrandProfile tokens to the UI.

---

## Infrastructure

- **Railway**
  Hosting platform for backend, Celery workers, PostgreSQL, and Redis.

- **Vercel**
  Hosting platform for the React frontend.

- **Celery**
  Background task processing. Three worker types: general, AI, and beat (scheduler).

- **Redis**
  Cache layer and Celery message broker.

---

## Workflow

- **Bouwer**
  AI agent that builds features, fixes bugs, and writes tests.

- **Quick Item (Q-item)**
  Small improvement (≤4 hours, 1-3 files). Uses simplified workflow: `todo/ → doing/ → review/ → done/`.

- **Module ID**
  Identifier for a feature module. Backend: `Bxx`, Frontend: `Fxx`, Quick: `Qxxx`.

- **Conventional Commits**
  Git commit format: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
