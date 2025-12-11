# django-core Development Guidelines
*Path: [templates/agent-file-template.md](templates/agent-file-template.md)*


Auto-generated from all feature plans. Last updated: 2025-11-23

## Active Technologies
- Python 3.12+ + Django 5.1+, gettext utilities (004-core-internationalization-base)
- Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, django-stubs (type hints) (005-core-accounts-authentication)
- PostgreSQL (custom user model, sessions, Django groups/permissions) (005-core-accounts-authentication)
- Redis + django-redis (rate limiting, caching) (006-organisation-management-multi)
- django-prometheus + prometheus-client (metrics, observability) (006-organisation-management-multi)
- PostgreSQL (Project model with foreign keys to Organisation and User, unique constraints, indexes) (007-projects-workspaces-management)
- Python 3.12+ + Django 5.1+, Django REST Framework 3.14+, Redis + django-redis (caching), pytest 8.0+, mypy 1.8+ (008-hierarchical-access-control)
- PostgreSQL (Role, Permission, RoleAssignment models with unique constraints, composite indexes) (008-hierarchical-access-control)
- Python 3.12+ + Django 5.1+, django-prometheus (metrics, signals), pytest 8.0+ (009-audit-logging-system)
- PostgreSQL (AuditEvent model with JSONField + GIN indexes for metadata queries, event type registry) (009-audit-logging-system)
- PostgreSQL (existing) (013-api-foundation-standards)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (015-tasks-scheduling-foundation)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (015-tasks-scheduling-foundation)
- Python 3.12+ + Celery 5.3+ with Redis broker, celery-beat for scheduling, pytest-celery for testing (015-tasks-scheduling-foundation)
- Redis (broker and lightweight result backend), PostgreSQL (B09 audit events only) (015-tasks-scheduling-foundation)
- N/A (no persistent data models; all observability data emitted to external systems) (018-platform-observability-foundation)
- Python 3.12+ + Django 5.1+, Jinja2 3.1+, Click 8.1+, PyYAML 6.0+, importlib.metadata (stdlib) (020-core-scaffolding-cli)
- File-based (YAML manifests, Jinja2 templates, generated code) - no database persistence required (020-core-scaffolding-cli)
- TypeScript 5.x, React 18.x + vanilla-extract 1.x, Vite 5.x, Storybook 8.x, Chromatic (022-frontend-design-system)
- N/A (frontend-only, no database) (022-frontend-design-system)
- TypeScript 5.x + React 18.x (024-multi-tenancy-context)
- N/A (frontend-only package; backend B06/B07 owns data) (024-multi-tenancy-context)
- N/A (frontend-only, consumes B13/B16/B17 REST APIs) (025-notifications-hub-ui)

## Project Structure
```
src/
tests/
```

## Commands
cd src; pytest; ruff check .

[IF SCRIPT_TYPE=powershell]
## PowerShell Syntax
**⚠️ IMPORTANT**: You are in a PowerShell environment. See [.kittify/templates/POWERSHELL_SYNTAX.md](.kittify/templates/POWERSHELL_SYNTAX.md) for correct syntax.

Quick reminders:
- Use `-Json` not `--json`
- Use `;` not `&&` for command chaining
- Use `.\.kittify\scripts\powershell\` not `./kittify/scripts/bash/`
[ENDIF]

## Code Style
Python 3.12+: Follow standard conventions

## Recent Changes
- 025-notifications-hub-ui: Added TypeScript 5.x, React 18.x
- 024-multi-tenancy-context: Added TypeScript 5.x + React 18.x
- 022-frontend-design-system: Added TypeScript 5.x, React 18.x + vanilla-extract 1.x, Vite 5.x, Storybook 8.x, Chromatic

<!-- MANUAL ADDITIONS START -->

## F03: Multi-Tenancy Context Switcher (024-multi-tenancy-context)

**New Packages**:
- `@django-core/api-client` - Shared CSRF-protected fetch wrapper + error normalizer
- `@django-core/context-switcher` - Multi-tenancy context UI (React components + hooks)

**Dependencies**:
- `@django-core/design-system` (F01) for all UI components
- `react-window` or `@tanstack/react-virtual` for list virtualization
- Backend: B06 (organisations), B07 (projects), B08 (authorization), B13 (API baseline)

**Key Patterns**:
- React Context + hooks for state management (no Zustand/Redux)
- RouterAdapter interface for router-agnostic navigation
- Search: 300ms debounce, 3-character minimum
- Keyboard shortcut: Ctrl/Cmd+K (configurable)
- Zero custom CSS - 100% F01 design tokens

**F02 Refactoring**:
- Extract api-client utilities from `@django-core/auth` to shared package
- Update F02 imports to use `@django-core/api-client`

<!-- MANUAL ADDITIONS END -->
