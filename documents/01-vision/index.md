# Vision & Mission

## 1. Mission: The 80/20 Principle

The core platform provides a **production-grade 80% foundation** for modern web applications on Django.

**80% reusable foundation** → provided by the core
**20% custom business logic** → built per product (TeamReel is the first)

The core includes:

*   **Infrastructure**: Secure multi-tenant architecture (users → organisations → projects), RBAC permissions, audit logging.
*   **Content & Media**: File management (S3), media processing, AI content generation, video pipeline (FFmpeg).
*   **Real-time**: WebSockets, live updates, notifications with preference-based routing.
*   **Operations**: Celery background tasks, caching, full-text search.

## 2. What the Core IS and IS NOT

### The Core **IS**
*   A **production-grade multi-tenant architecture** with hierarchical access control.
*   A **complete content & media platform** with AI generation and video processing.
*   A **Spec-Driven Development platform** where AI agents build features under governance (Spec Kitty workflow).
*   **Proven by TeamReel** — the first product running in production.

### The Core is **NOT**
*   A basic SaaS starter template.
*   A theoretical exercise — everything listed here is built and running.
*   A locked-in framework — products extend, not fork.

## 3. Architecture Layers

1.  **Backend Core** (B01-B26): Security, multi-tenancy, APIs, notifications, tasks.
2.  **Frontend Core** (F01-F05): Design system, auth UI, navigation, theming.
3.  **Extended Capabilities** (B30-B55): Content templates, brand identity, AI generation, video processing, workflow engine.
4.  **Product Layer**: Domain-specific business logic. For TeamReel: members, activities, sport configuration.

## 4. Detailed Vision

*   **[Full Vision Document](vision.md)**: Complete vision with aspirational targets.
*   **[Design Principles](principles.md)**: The 9 rules that guide every decision.
*   **[Target Users](users.md)**: Who we build for.
*   **[Governance](governance.md)**: Spec Kitty workflow and quality enforcement.
*   **[Future](future.md)**: Long-term platform evolution.
*   **[Constitutional Governance](governance.md)**: How we guarantee quality without relying on individual expertise.
*   **[Quality Standards](quality.md)**: The specific metrics for the 80% foundation.
*   **[Long-Term Future](future.md)**: The platform economy vision.
