# Implementation Plan: Frontend-Backend Integration Guides
*Path: kitty-specs/030-frontend-backend-integration/plan.md*

**Branch**: `030-frontend-backend-integration` | **Date**: 2025-12-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/030-frontend-backend-integration/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Create practical, executable integration guides that demonstrate how downstream products connect frontend modules (F01-F08) to Core-App backend APIs using repeatable, framework-lean patterns. The implementation delivers three priority guides (Authentication, Context Propagation, Data Fetching) with validated TypeScript/React examples, anti-patterns documentation, and automated CI validation to prevent documentation drift.

## Technical Context

**Language/Version**: TypeScript 5.x + React 18.x (reference stack); Markdown (documentation)
**Primary Dependencies**:
- **Documentation**: MkDocs (existing django-core docs setup)
- **Examples Package**: TypeScript 5.x, React 18.x, @vanilla-extract (F01 dependencies), pnpm workspace
- **Validation**: TypeScript compiler, ESLint, Prettier, existing pre-commit hooks + GitHub Actions
**Storage**: File-based (Markdown guides in `docs/integration-guides/`, TypeScript examples in `examples/integration-guides/`)
**Testing**: TypeScript type-checking + linting + build validation (no runtime tests for documentation feature)
**Target Platform**: Web (guides target browser-based downstream products integrating with Core-App)
**Project Type**: Documentation + reference implementations (not traditional single/web/mobile)
**Performance Goals**:
- Validation scripts must complete in <2 minutes in CI
- Guides must load instantly in MkDocs (static Markdown)
- Example code must build without errors
**Constraints**:
- Must integrate seamlessly with existing MkDocs setup (no new tooling)
- Must work within existing pnpm workspace architecture
- CI validation must block PRs on failures
- Examples must be framework-agnostic (vanilla TS) + React reference implementations
- Zero product-specific logic in examples
**Scale/Scope**:
- 3 comprehensive guides (Auth, Context, Data Fetching) in Phase 1
- ~15-20 executable example files
- 1 central manual verification checklist
- 4 core interface patterns (AuthProvider, ContextProvider, ApiClient, CachePolicy)

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
- [x] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows (guides use neutral entities, no product branding)
- [x] **Core Focus**: Feature aligns with core concerns (guides document integration with core auth, organisations, projects APIs)
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points (interface patterns allow teams to implement with their stack choices)

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each Django app has one clear purpose (N/A - documentation feature, but guides focus on single integration patterns)
- [x] **Stable APIs**: Public interfaces are documented and stable (guides document interface patterns for downstream use)
- [x] **Minimal Dependencies**: Only necessary dependencies included (TypeScript + React match F01-F08, no new heavy deps)
- [x] **No Circular Deps**: Dependency graph is acyclic (examples import from F01-F08, never reverse)
- [x] **No Downstream Imports**: Core does not import from product-specific projects (guides are documentation, not code in core)

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline version maintained (N/A - TypeScript/Markdown feature, Python baseline unaffected)
- [x] **Type Hints**: Core modules will use type hints throughout (TypeScript strict mode enforced in examples)
- [x] **Black Formatting**: All code will be formatted with Black (Prettier used for TypeScript, matches team standards)
- [x] **Ruff Linting**: Ruff will be primary linter (ESLint used for TypeScript, pre-existing in workspace)
- [x] **No Dead Code**: Implementation removes unused code (validation enforces buildable examples only)
- [x] **Readable Code**: Functions/classes remain small and focused (guides emphasize readable patterns)
- [x] **Curated Dependencies**: New dependencies are justified and pinned (TypeScript 5.x + React 18.x match F01-F08)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Testing framework used (N/A - documentation feature uses TypeScript validation instead)
- [x] **Test Coverage**: Tests included for all features (100% of examples validated via TypeScript type-check + lint + build)
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence (CI validation catches documentation drift)
- [x] **Deterministic**: Tests are not flaky or environment-dependent (TypeScript compilation is deterministic)
- [x] **Coverage Thresholds**: Coverage targets defined and enforced (FR-032/033/034: all examples must pass validation)
- [x] **Integration Tests**: Key user flows have integration test coverage (manual verification checklist covers non-automatable flows)

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured (guides enforce CSRF protection, secure token storage)
- [x] **DEBUG Off**: DEBUG disabled in non-dev environments (N/A - documentation feature)
- [x] **No Secrets**: No secrets committed; env vars/secret managers used (examples use placeholders, anti-patterns warn against hardcoding)
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities (existing workspace scanning covers new example package)
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms (guides reference F02 and Core-App auth patterns)
- [x] **No Sensitive Logging**: Sensitive data not logged (anti-patterns section explicitly calls out logging vulnerabilities)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: Query optimization plan documented (guides document efficient pagination patterns, anti-patterns call out N+1 requests)
- [x] **Pagination**: APIs use pagination for unbounded data (FR-023: pagination patterns documented per Core-App conventions)
- [x] **Explicit Caching**: Caching strategy documented if used (FR-026/027/028: HTTP cache headers + CachePolicy interface documented)
- [x] **Structured Logging**: Logging infrastructure in place (N/A - documentation feature, but guides reference observability patterns)
- [x] **Health Checks**: Health check endpoints defined (N/A - documentation feature)
- [x] **Metrics Hooks**: Observability metrics captured (N/A - documentation feature)
- [x] **Graceful Degradation**: Failure handling strategy defined (guides document retry patterns, error handling for all states)

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework used for APIs (N/A - documentation feature, but guides reference Core-App DRF patterns)
- [x] **Consistent Responses**: API response format standardized (guides document Core-App API conventions)
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation (guides include "last validated" dates and version tracking)
- [x] **Clear Errors**: Error messages clear and safe (no data leaks) (guides document safe error handling, anti-patterns warn against leaks)
- [x] **Boundary Validation**: Validation in serializers/forms (guides show client-side validation before API calls)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple (guides themselves ARE the developer docs for integration)
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured (TypeScript + ESLint + Prettier for examples, integrated with existing tooling)
- [x] **Pre-commit Hooks**: Hooks match CI checks (validation scripts run in pre-commit + GitHub Actions)
- [x] **Type Checking**: mypy runs cleanly on core modules (TypeScript strict mode for examples)
- [x] **Task Scripts**: Common operations scripted (pnpm scripts for validation in example package)
- [x] **Developer Docs**: Setup and development docs exist (guides + README.md provide comprehensive setup)

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `feature/NNN-name` branch (currently on 030-frontend-backend-integration)
- [x] **Linked to Spec**: PR will reference spec document (spec.md in kitty-specs/030-frontend-backend-integration/)
- [x] **Focused PRs**: Changes remain small and focused (single feature: integration guides)
- [x] **main Stable**: No direct commits to main (all work via feature branch + PR)

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, mypy, pytest in CI (TypeScript validation added to existing pre-commit + GitHub Actions)
- [x] **Merge Gates**: All CI checks must pass before merge (FR-036: validation failures block PRs)
- [x] **Scripted Deployment**: Deployment process documented/automated (MkDocs deployment is existing process, no changes needed)

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository (docs/integration-guides/ + examples/integration-guides/)
- [x] **App README**: Each Django app has README (N/A - documentation feature; guides have central README.md)
- [x] **Getting Started**: Setup guide exists or will be updated (each guide includes prerequisites and setup steps)
- [x] **Extension Guide**: "How to extend" documentation exists or planned (guides ARE the extension documentation)
- [x] **Spec Sync**: Implementation keeps spec up to date (FR-038: teams update guides when making changes)
- [x] **ADR Required**: Major architectural decisions documented (interface patterns documented in guides as architectural decisions)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments (pure documentation feature)
- [x] **Template Updates**: No template changes required (uses existing spec-kitty workflow)

### Violations Requiring Justification

*No violations - all Constitution principles satisfied*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/[###-feature]/
├── plan.md              # This file (/spec-kitty.plan command output)
├── research.md          # Phase 0 output (/spec-kitty.plan command)
├── data-model.md        # Phase 1 output (/spec-kitty.plan command)
├── quickstart.md        # Phase 1 output (/spec-kitty.plan command)
├── contracts/           # Phase 1 output (/spec-kitty.plan command)
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
docs/
└── integration-guides/           # NEW: Integration documentation
    ├── README.md                 # Index and navigation
    ├── authentication.md         # Auth + authenticated API calls guide
    ├── context-propagation.md    # Org/project context guide
    ├── data-fetching.md          # List→detail patterns guide
    └── checklist.md              # Central manual verification checklist

examples/
└── integration-guides/           # NEW: Executable example code (pnpm workspace package)
    ├── package.json              # TypeScript 5.x + React 18.x deps
    ├── tsconfig.json             # Strict TypeScript configuration
    ├── .eslintrc.js              # Linting rules
    ├── README.md                 # Example setup and validation instructions
    ├── auth/                     # Authentication examples
    │   ├── vanilla/              # Vanilla TypeScript + fetch
    │   │   ├── csrf-token.ts
    │   │   ├── authenticated-fetch.ts
    │   │   └── error-handling.ts
    │   └── react/                # React integration examples
    │       ├── AuthProvider.tsx   # Reference implementation
    │       ├── useAuth.ts
    │       └── LoginForm.tsx
    ├── context/                  # Context propagation examples
    │   ├── vanilla/
    │   │   ├── context-aware-client.ts
    │   │   └── context-storage.ts
    │   └── react/
    │       ├── ContextProvider.tsx  # Reference implementation
    │       ├── useContext.ts
    │       └── ContextSwitcher.tsx
    ├── data-fetching/            # Data fetching patterns
    │   ├── vanilla/
    │   │   ├── api-client.ts
    │   │   ├── pagination.ts
    │   │   ├── caching.ts
    │   │   └── retry-logic.ts
    │   └── react/
    │       ├── useFetch.ts
    │       ├── useList.ts
    │       ├── ListPage.tsx
    │       └── DetailPage.tsx
    ├── reference/                # Shared interfaces and types
    │   ├── types.ts              # RequestState, CachePolicy, etc.
    │   └── interfaces.ts         # AuthProvider, ApiClient, ContextProvider
    └── scripts/
        ├── validate.ts           # TypeScript + lint + build validation
        └── check-examples.sh     # CI script wrapper

.github/
└── workflows/
    └── ci.yml                    # UPDATED: Add validation for examples/integration-guides/

.pre-commit-config.yaml           # UPDATED: Add TypeScript validation hook

mkdocs.yml                        # UPDATED: Add integration-guides to nav
```

**Structure Decision**: Documentation feature with dual-repository approach:
- **Documentation** (`docs/integration-guides/`): Plain Markdown guides integrated into existing MkDocs setup
- **Examples** (`examples/integration-guides/`): Standalone pnpm workspace package for validated, executable code
- **Validation**: Integrated into existing pre-commit hooks and GitHub Actions CI pipeline
- This structure allows guides to reference examples via relative links while keeping validation concerns separate and automatable

## Complexity Tracking

*No complexity violations - straightforward documentation feature*

**Key Simplicity Wins**:
- Reuses existing MkDocs setup (no new doc generator)
- Integrates with existing pnpm workspace (no separate build system)
- Leverages existing CI/pre-commit infrastructure (no new workflows)
- Framework-lean guidance via interfaces (no state management lock-in)
- Validation via standard TypeScript toolchain (no custom verification system)
