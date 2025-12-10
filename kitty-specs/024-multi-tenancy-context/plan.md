# Implementation Plan: Multi-Tenancy Context Switcher
*Path: kitty-specs/024-multi-tenancy-context/plan.md*

**Branch**: `024-multi-tenancy-context` | **Date**: 2025-12-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/024-multi-tenancy-context/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Implement a brand-agnostic multi-tenancy context switcher as a standalone React package (`@django-core/context-switcher`) that allows authenticated users to view and switch between organisations and projects they have access to. The switcher integrates with F01 design system components, works with F06 layouts, and communicates with B06/B07/B08 backend services via B13 APIs. Features include: always-visible context indicator, quick org/project switching, URL-based deep linking, search with debouncing, virtualized lists for 500+ items, keyboard shortcuts, and comprehensive error handling.

## Technical Context

**Language/Version**: TypeScript 5.x + React 18.x
**Primary Dependencies**:
  - `@django-core/design-system` (F01) - UI components and design tokens
  - `@django-core/api-client` (new shared package) - CSRF-protected fetch wrapper
  - `react-window` or `@tanstack/react-virtual` - List virtualization
  - React 18.x - Core UI library
**Storage**: N/A (frontend-only package; backend B06/B07 owns data)
**Testing**: Jest + React Testing Library + MSW (API mocking) + axe-core (accessibility)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) + mobile web
**Project Type**: Frontend workspace package (pnpm monorepo)
**Performance Goals**:
  - Context switch complete in <5 seconds (95th percentile)
  - Search filter with 300ms debounce, 3-char minimum
  - List virtualization for 500+ items maintains 60fps scrolling
**Constraints**:
  - Zero custom CSS (100% F01 design tokens)
  - Router-agnostic (adapter pattern for React Router, Next.js, Django templates)
  - WCAG 2.1 AA accessible
  - Bundle size: aim for <50KB gzipped (including dependencies)
**Scale/Scope**:
  - Support 500+ organisations per user
  - Support 100+ projects per organisation
  - 6 user stories (P1-P3 priority)
  - ~8-10 React components + 4-6 custom hooks
  - 90%+ test coverage target

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
  - ✅ Generic "Organisation" and "Project" terminology, no domain-specific concepts
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
  - ✅ Directly supports B06 (organisations) and B07 (projects) multi-tenancy
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points
  - ✅ `onBeforeContextChange` callback, custom labels via props, router adapter pattern

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each Django app has one clear purpose
  - ✅ N/A for frontend; package has single purpose: context switching UI
- [x] **Stable APIs**: Public interfaces are documented and stable
  - ✅ React component props, hook APIs, RouterAdapter interface will be documented
- [x] **Minimal Dependencies**: Only necessary dependencies included
  - ✅ F01 (design system), new shared api-client, react-window (virtualization only)
- [x] **No Circular Deps**: Dependency graph is acyclic
  - ✅ F03 depends on F01 and api-client; no circular references
- [x] **No Downstream Imports**: Core does not import from product-specific projects
  - ✅ No product-specific imports; purely generic multi-tenancy UI

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained
  - ✅ N/A (frontend); TypeScript 5.x used instead
- [x] **Type Hints**: Core modules will use type hints throughout
  - ✅ TypeScript strict mode enforced; all props, state, API responses typed
- [x] **Black Formatting**: All code will be formatted with Black
  - ✅ N/A (frontend); Prettier will be used for TypeScript/React
- [x] **Ruff Linting**: Ruff will be primary linter
  - ✅ N/A (frontend); ESLint will be primary linter (matching F01/F02)
- [x] **No Dead Code**: Implementation removes unused code
  - ✅ ESLint no-unused-vars enforced, tree-shaking via Vite
- [x] **Readable Code**: Functions/classes remain small and focused
  - ✅ React components <200 LOC, hooks <100 LOC, clear single responsibilities
- [x] **Curated Dependencies**: New dependencies are justified and pinned
  - ✅ react-window justified for perf; new api-client shared across packages

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used
  - ✅ N/A (frontend); Jest + React Testing Library used instead
- [x] **Test Coverage**: Tests included for all features
  - ✅ 90%+ coverage target for all components and hooks
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence
  - ✅ Test-driven approach for bug fixes enforced
- [x] **Deterministic**: Tests are not flaky or environment-dependent
  - ✅ MSW for API mocking ensures deterministic tests
- [x] **Coverage Thresholds**: Coverage targets defined and enforced
  - ✅ Jest coverage gates configured (90% statements/branches/functions/lines)
- [x] **Integration Tests**: Key user flows have integration test coverage
  - ✅ P1 user stories will have integration tests (org switch, project switch, URL-based context)

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
  - ✅ Shared api-client handles CSRF tokens via F02 pattern
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments
  - ✅ N/A (frontend); no debug flags in production builds
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
  - ✅ API endpoints configured via environment variables
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
  - ✅ npm audit / pnpm audit in CI pipeline
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms
  - ✅ All authorization decisions deferred to backend (B08); frontend never enforces access
- [x] **No Sensitive Logging**: Sensitive data not logged
  - ✅ Only org/project IDs and names (non-sensitive) logged

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented
  - ✅ N/A (frontend); backend APIs expected to be optimized (B13 responsibility)
- [x] **Pagination**: APIs use pagination for unbounded data
  - ✅ Frontend handles large lists via virtualization; backend pagination expected
- [x] **Explicit Caching**: Caching strategy documented if used
  - ✅ No aggressive caching; fresh data fetched on context switch
- [x] **Structured Logging**: Logging infrastructure in place
  - ✅ Analytics events for context switches, error logging with context
- [x] **Health Checks**: Health check endpoints defined
  - ✅ N/A (frontend package; backend health checks in B13)
- [x] **Metrics Hooks**: Observability metrics captured
  - ✅ Context switch events, error rates, search usage tracked
- [x] **Graceful Degradation**: Failure handling strategy defined
  - ✅ Comprehensive error states: API failures, 403/404, network errors with retry actions

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs
  - ✅ N/A (frontend); backend APIs (B13) expected to follow DRF standards
- [x] **Consistent Responses**: API response format standardized
  - ✅ Frontend expects B13-compliant JSON envelopes with error normalization
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation
  - ✅ Component API follows semantic versioning; deprecation warnings for breaking changes
- [x] **Clear Errors**: Error messages clear and safe (no data leaks)
  - ✅ Error normalizer extracts safe user-facing messages from backend responses
- [x] **Boundary Validation**: Validation in serializers/forms
  - ✅ Backend validation trusted; frontend performs basic UX-only validation (3-char search minimum)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple
  - ✅ Package README with installation, usage examples, API docs
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
  - ✅ N/A (frontend); Prettier, ESLint, TypeScript, Jest configured
- [x] **Pre-commit Hooks**: Hooks match CI checks
  - ✅ Husky hooks run linting, formatting, type-checking
- [x] **Type Checking**: mypy runs cleanly on core modules
  - ✅ N/A (frontend); TypeScript strict mode enforced
- [x] **Task Scripts**: Common operations scripted
  - ✅ pnpm scripts for dev, build, test, lint, typecheck
- [x] **Developer Docs**: Setup and development docs exist
  - ✅ README + integration guide + customization guide planned

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `feature/NNN-name` branch
  - ✅ Currently on `024-multi-tenancy-context`
- [x] **Linked to Spec**: PR will reference spec document
  - ✅ PR will link to spec.md and plan.md
- [x] **Focused PRs**: Changes remain small and focused
  - ✅ Implementation broken into work packages (WP01-WP12)
- [x] **main Stable**: No direct commits to main
  - ✅ All work via feature branch + PR

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI
  - ✅ ESLint, Prettier, TypeScript, Jest in CI (matching F01/F02 patterns)
- [x] **Merge Gates**: All CI checks must pass before merge
  - ✅ GitHub Actions workflow with required status checks
- [x] **Scripted Deployment**: Deployment process documented/automated
  - ✅ Package published to npm registry (or internal registry) via CI

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
  - ✅ Package README, integration guide, API docs in packages/context-switcher/
- [x] **App README**: Each Django app has README
  - ✅ N/A (frontend); package README will cover all usage
- [x] **Getting Started**: Setup guide exists or will be updated
  - ✅ Quickstart guide will be created in Phase 1
- [x] **Extension Guide**: "How to extend" documentation exists or planned
  - ✅ Customization guide for RouterAdapter, onBeforeContextChange, custom labels
- [x] **Spec Sync**: Implementation keeps spec up to date
  - ✅ Spec clarifications already integrated; plan tracks implementation
- [x] **ADR Required**: Major architectural decisions documented (if applicable)
  - ✅ ADR planned for router adapter pattern and backend-as-source-of-truth decision

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
  - ✅ No changes needed; frontend features follow adapted principles
- [x] **Template Updates**: No template changes required (or changes documented)
  - ✅ No template changes needed

### Violations Requiring Justification

*No violations present*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/024-multi-tenancy-context/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Architecture research and decisions
├── data-model.md        # Phase 1: Entity/type definitions
├── quickstart.md        # Phase 1: Integration guide
├── contracts/           # Phase 1: API contracts and TypeScript interfaces
│   ├── api-contracts.md # Backend API endpoint specs (B13 integration)
│   └── types.ts         # TypeScript type definitions
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Spec quality checklist (completed)
└── tasks.md             # Phase 2: Work package breakdown (created by /spec-kitty.tasks)
```

### Source Code (repository root)

```
packages/
├── api-client/                      # NEW: Shared API client package
│   ├── src/
│   │   ├── index.ts                 # Public API exports
│   │   ├── client.ts                # CSRF-protected fetch wrapper
│   │   ├── errorNormalizer.ts      # B13 error envelope parser
│   │   └── types.ts                 # Request/response types
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── context-switcher/                # NEW: F03 context switcher package
│   ├── src/
│   │   ├── index.ts                 # Public API exports
│   │   ├── components/              # React components
│   │   │   ├── ContextSwitcher.tsx  # Main switcher component
│   │   │   ├── ContextIndicator.tsx # Current context display
│   │   │   ├── OrganisationPicker.tsx # Org selection UI
│   │   │   ├── ProjectPicker.tsx    # Project selection UI
│   │   │   └── ContextPickerModal.tsx # Mobile full-screen picker
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useCurrentContext.ts # Get current org/project
│   │   │   ├── useAvailableContexts.ts # Get accessible orgs/projects
│   │   │   ├── useContextSwitcher.ts # Context switch actions
│   │   │   ├── useDebouncedValue.ts # Search debouncing
│   │   │   └── useKeyboardShortcut.ts # Keyboard shortcut handler
│   │   ├── context/                 # React Context providers
│   │   │   ├── ContextSwitcherProvider.tsx # Main provider
│   │   │   └── ContextSwitcherContext.ts # Context definition
│   │   ├── api/                     # Backend API integration
│   │   │   ├── organisationsApi.ts  # B06 org endpoints
│   │   │   ├── projectsApi.ts       # B07 project endpoints
│   │   │   └── contextApi.ts        # Current context endpoints
│   │   ├── types/                   # TypeScript types
│   │   │   ├── index.ts             # Type exports
│   │   │   ├── context.ts           # Context data types
│   │   │   ├── router.ts            # RouterAdapter interface
│   │   │   └── config.ts            # Config types
│   │   └── utils/                   # Utility functions
│   │       ├── pathBuilder.ts       # URL path construction
│   │       └── contextMemory.ts     # Last-visited tracking
│   ├── __tests__/                   # Tests
│   │   ├── unit/                    # Component/hook unit tests
│   │   ├── integration/             # Integration tests (P1 flows)
│   │   ├── accessibility/           # axe-core accessibility tests
│   │   └── setup.ts                 # Test setup (MSW handlers)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts               # Build configuration
│   └── README.md                    # Package documentation
│
├── design-system/                   # EXISTING: F01 (dependency)
│   └── ...
│
└── auth/                            # EXISTING: F02 (refactor to use api-client)
    ├── src/
    │   └── lib/                     # UPDATED: Use shared api-client
    │       ├── apiClient.ts         # REFACTOR: Import from @django-core/api-client
    │       └── errorNormalizer.ts   # REFACTOR: Import from @django-core/api-client
    └── ...
```

**Structure Decision**: Frontend workspace package structure selected. Two new packages will be created:

1. **`@django-core/api-client`**: Shared low-level API utilities extracted from F02, providing CSRF-protected fetch and B13 error normalization for all frontend packages.

2. **`@django-core/context-switcher`**: Main F03 package with React components, hooks, and context provider for multi-tenancy UI.

F02 (`@django-core/auth`) will be refactored to depend on the new shared api-client package, removing duplication.

## Complexity Tracking

*No violations - Constitution Check passed*

---

## Phase 0: Research & Decisions ✅ COMPLETE

**Status**: Complete
**Artifacts Generated**:
- ✅ `research.md` - All planning questions answered and documented
- ✅ Planning decisions validated and recorded

**Key Decisions**:
1. Package structure: Standalone `@django-core/context-switcher` + shared `@django-core/api-client`
2. State management: React Context + hooks (matches F02 pattern)
3. Router integration: Adapter pattern (supports React Router, Next.js, Django templates)
4. Backend integration: Shared api-client extracted from F02
5. Search/virtualization: Custom debounce hook + react-window/react-virtual
6. Keyboard shortcuts: Custom `useKeyboardShortcut` hook

---

## Phase 1: Design & Contracts ✅ COMPLETE

**Status**: Complete
**Artifacts Generated**:
- ✅ `data-model.md` - TypeScript type definitions for all entities and interfaces
- ✅ `contracts/api-contracts.md` - Backend API endpoint specifications (B13 integration)
- ✅ `quickstart.md` - Integration guide with React Router, Next.js, and Django examples
- ✅ `.github/copilot-instructions.md` - Updated with F03 packages and patterns

**Key Outputs**:
1. **Data Model**: Organisation, Project, UserContext, RouterAdapter, ContextSwitcherConfig types
2. **API Contracts**: 4 B13 endpoints (2 required, 2 optional) with CSRF/auth requirements
3. **Integration Guide**: Setup examples for React Router, Next.js, and Django templates
4. **Agent Context**: Copilot instructions updated with new packages and dependencies

---

## Phase 2: Task Breakdown

**Status**: Pending
**Next Command**: `/spec-kitty.tasks`

This phase will break down the implementation into work packages (WP01-WP12), covering:
- Shared api-client package setup and F02 refactoring
- Core context provider and hooks
- UI components (switcher, pickers, indicators)
- Search and virtualization
- Keyboard shortcuts
- Testing (unit, integration, accessibility)
- Documentation and examples

---

## Summary

**Planning Complete**: ✅ All gates passed, ready for task breakdown

**What's Been Done**:
1. ✅ Engineering alignment confirmed (5 planning questions answered)
2. ✅ Constitution Check passed (all 12 principles validated)
3. ✅ Phase 0 Research complete (architecture decisions documented)
4. ✅ Phase 1 Design complete (types, contracts, quickstart created)
5. ✅ Agent context updated (Copilot knows about new packages)

**Next Steps**:
1. Run `/spec-kitty.tasks` to generate `tasks.md` with work package breakdown
2. Begin implementation following WP01-WP12 sequence
3. Iteratively implement, test, and review each work package

**Branch**: `024-multi-tenancy-context`
**Spec**: [spec.md](spec.md)
**Plan**: This file
