# django-core Development Guidelines
*Path: [templates/agent-file-template.md](templates/agent-file-template.md)*

Auto-generated from all feature plans. Last updated: 2025-12-15

## Stakeholder Profile

**Primary User: Strategic Product Owner (Non-Technical)**
- Knows the **big picture** and where the product should go
- Understands **business value** and **user needs**
- Does NOT know all technical implementation details of web applications
- Needs **visual validation** to build confidence (hence demo-first approach)
- Values **clear explanations** over technical jargon
- Appreciates **concrete examples** and **visual feedback**

**When communicating with this stakeholder:**
- Explain **WHY** decisions matter in business terms
- Show **visual demos** for every feature
- Use **analogies** to explain technical concepts
- Ask clarifying questions about **business goals**, not technical preferences
- Provide **options** with clear trade-offs (not just technical details)
- Confirm understanding with **examples** and **demos**

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
- 035-real-time-websocket: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 034-file-media-management: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 028-theme-support-brand: Added TypeScript 5.x, React 18.x, vanilla-extract (@vanilla-extract/css), Vitest + React Testing Library, Chromatic

<!-- MANUAL ADDITIONS START -->

## F07: Theme Support & Brand Variants (028-theme-support-brand)

**New Package**: `@django-core/theme-system`

**Core Technologies**:
- vanilla-extract (theme contracts, zero-runtime CSS custom properties)
- TypeScript 5.x strict mode (100% type coverage for public APIs)
- React 18.x (ThemeProvider context, hooks)
- Vitest + React Testing Library (unit/integration tests)
- Chromatic (visual regression testing)
- axe-core (accessibility validation)

**Dependencies**:
- `@django-core/design-system` (F01) - primitive tokens foundation (critical)
- `@django-core/api-client` (optional, for B12 integration)

**Key Architecture Patterns**:
- **Token System**: Semantic tokens (background.surface, text.primary, state.error) map to F01 primitives via vanilla-extract theme contracts
- **Theme Switching**: `data-theme` and `data-brand` attributes on `<html>`, CSS variable scoping, zero React re-renders
- **Brand Variants**: Hierarchical inheritance via typed helpers, brands override accent tokens while inheriting base mode tokens
- **Storage**: `ThemeStorage` interface abstraction with cookie (SSR), localStorage (fallback), and optional B12 adapter
- **SSR**: Inline boot script sets theme attributes before React hydration, prevents visual flash
- **Accessibility**: Pre-compilation `validateThemeContrast()` validates WCAG 2.1 AA compliance, fails CI if core themes don't meet 4.5:1 (normal text) or 3:1 (large text/UI)

**Package Structure**:
```
packages/theme-system/
├── src/
│   ├── components/        # ThemeProvider, ThemeToggle
│   ├── hooks/             # useTheme, useThemeStorage
│   ├── themes/            # light.css.ts, dark.css.ts, contract.css.ts, brand-helpers.ts
│   ├── storage/           # ThemeStorage interface, adapters (Cookie, LocalStorage, B12, Composed)
│   ├── validation/        # validateContrast.ts, WCAG utilities
│   ├── ssr/               # boot-script.ts, getServerTheme.ts
│   └── types/             # TypeScript definitions
├── tests/
│   ├── unit/              # Hooks, storage, validation
│   ├── integration/       # Theme switching, persistence, SSR
│   └── visual/            # Chromatic stories
└── scripts/
    └── validate-themes.ts # CI script for contrast validation
```

**Performance Constraints**:
- Core bundle <10KB gzipped
- Theme switching <100ms (no forced reflows)
- Build-time contrast validation <5 seconds
- Zero runtime overhead (CSS custom properties only)

**Integration Points**:
- F01 components should migrate to semantic tokens (e.g., `themeVars.background.surface` instead of `primitives.color.white`)
- F05 resource display components use semantic state tokens (success/warning/error)
- F06 layouts provide optional theme toggle slot
- B12 backend (optional): `GET/POST /api/preferences/theme` for server-side persistence

**Key Rules**:
- All core themes (light/default, dark/default) MUST meet WCAG 2.1 AA (enforced in CI)
- Public API follows semver; breaking changes require major version bump
- Storage failures are non-blocking (graceful degradation: cookie→B12→localStorage→system→default)
- Theme preference is non-sensitive data (no PII, safe to log mode/brand)

<!-- MANUAL ADDITIONS END -->

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

## F09: Frontend-Backend Integration Guides (030-frontend-backend-integration)

**New Package**: `examples/integration-guides`

**Core Technologies**:
- TypeScript 5.x strict mode (type definitions for interface contracts)
- MkDocs (documentation integration with existing site)
- pnpm workspace (example implementations)
- React 18.x (example code uses React, but patterns are framework-agnostic)

**Dependencies**:
- F01 (Design System) - UI components in examples
- F02 (Auth UI) - authentication patterns
- F03 (Context Switcher) - multi-tenancy context
- F06 (Page Templates) - layout examples
- F07 (Theme System) - theming integration
- Backend: B04 (i18n), B05 (auth), B06 (orgs), B07 (projects), B08 (authorization), B13 (API baseline)

**Key Architecture Patterns**:
- **Interface Contracts**: TypeScript interfaces define patterns without framework lock-in
  - `AuthProvider` - Authentication state + operations (login, logout, refresh, hasPermission)
  - `ContextProvider` - Multi-tenancy context (currentOrg, currentProject, setOrg, setProject, clear)
  - `ApiClient` - HTTP client (get, post, put, delete + interceptors) with CSRF, auth, context headers
  - `CachePolicy` - Client-side caching (shouldCache, getCacheDuration, shouldRevalidate, invalidate)
  - `RequestState<T>` - Discriminated union (idle | loading | success | error) for async ops
- **Validation**: TypeScript type-check + ESLint + build validation in CI (no runtime checks)
- **Cache Strategy**: HTTP Cache-Control headers + interface-based client-side policy
- **Maintenance**: Feature teams own guides (Constitution P10), CI ensures currency

**Documentation Structure**:
```
docs/integration-guides/
├── auth-api.md              # Priority 1: Auth + authenticated API calls
├── context-propagation.md   # Priority 2: Org/project context via headers
├── data-fetching.md         # Priority 3: List→detail, pagination, caching
├── error-handling.md        # Error boundaries, notifications
├── form-validation.md       # Frontend validation + backend error mapping
├── realtime.md              # WebSocket/polling patterns
├── file-uploads.md          # Multipart, progress, chunked uploads
├── theming.md               # F07 integration with backend preferences
├── checklist.md             # Pre-deployment integration checklist
├── decisions.md             # Architecture Decision Records
├── anti-patterns.md         # Common mistakes to avoid
└── troubleshooting.md       # Debug guide
```

**Contract Location**:
```
examples/integration-guides/
├── contracts/               # TypeScript interface contracts (stable API)
│   ├── types.ts            # RequestState, User, Organization, errors
│   ├── auth.ts             # AuthProvider interface
│   ├── context.ts          # ContextProvider interface
│   ├── api-client.ts       # ApiClient interface + interceptors
│   ├── cache.ts            # CachePolicy interface
│   └── index.ts            # Barrel export
├── auth-example/           # React Context-based AuthProvider
├── context-example/        # React Context-based ContextProvider
├── api-client-example/     # Fetch-based ApiClient with interceptors
└── cache-example/          # SWR-based CachePolicy
```

**Integration Points**:
- All frontend modules (F01-F08) use these patterns for backend communication
- B13 API baseline provides OpenAPI specs that inform TypeScript types
- B04 i18n patterns integrated into error messages
- B08 authorization patterns drive `hasPermission()` checks

**Key Rules**:
- Interface contracts MUST remain framework-agnostic (no React/Vue/Angular specifics in types)
- Examples use React but guides explain adaptation to other frameworks
- All guides include TypeScript example code + anti-patterns section
- Cache invalidation MUST occur after mutations (POST/PUT/DELETE)
- CSRF tokens MUST be injected in all mutating requests
- Context headers (X-Organization-ID, X-Project-ID) MUST propagate when context is set

<!-- MANUAL ADDITIONS END -->
