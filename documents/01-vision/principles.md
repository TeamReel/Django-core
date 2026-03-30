# Design Principles

These 8 principles guide every architectural and product decision.

## 1. 80/20 Architecture
*   **80% of modern web app needs** are covered by the core platform.
*   **20% of unique business logic** is added per product (TeamReel proves this).
*   Clear boundaries between platform and product code.

## 2. Complete Modern Web Platform
*   **Content & media layer**: File management (S3), AI generation, video processing (FFmpeg).
*   **Real-time layer**: WebSockets, live updates, notifications with preference routing.
*   **Background processing**: Celery tasks, scheduled jobs, queue management.

## 3. Production-First
*   TeamReel runs in production on this platform today.
*   Every module is validated through real-world usage, not demos.
*   Infrastructure proven: Railway (backend), Vercel (frontend), S3 (storage).

## 4. Security & Multi-Tenancy by Default
*   Organisation-scoped querysets on every ViewSet.
*   RBAC with `permission_classes` on all endpoints.
*   Audit logging for security events.
*   No hardcoded secrets — environment-based configuration.

## 5. Spec-Driven Development
*   Spec Kitty workflow: specs → AI agents → quality-checked implementation.
*   Every feature traceable: spec → plan → tasks → implementation → tests.
*   AI agents (GitHub Copilot, etc.) build under governance rules.

## 6. Quality Without Compromise
*   Tests for every feature and bugfix (pytest backend, Playwright E2E).
*   Type safety: TypeScript strict mode (frontend), type hints (Python backend).
*   `select_related`/`prefetch_related` — no N+1 queries.
*   WCAG 2.1 AA accessibility baseline.

## 7. Design Tokens Over Hardcoded Values
*   CSS design tokens for all visual properties.
*   Mobile-first responsive design.
*   No hardcoded colors, spacing, or typography values.

## 8. Developer Experience
*   Predictable project structure following Django/React conventions.
*   Monorepo packages for shared frontend functionality.
*   Convention-based: “guardrails, not walls”.
