# Implementation Plan: F02 Core Auth Identity UI
*Path: kitty-specs/023-core-auth-identity/plan.md*

**Branch**: `023-core-auth-identity` | **Date**: 2025-12-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/kitty-specs/023-core-auth-identity/spec.md`

## Summary

F02 provides a lightweight, reusable React authentication UI package for sign-in, password reset, sign-out, and profile management flows. Built with React Context + hooks for state management, it integrates with B05 Core Accounts APIs via B13 baseline and F01 design system components. Supports dual deployment: Django-rendered templates (per-page React roots) and standalone SPAs. Targets ~10-15KB bundle size (excluding F01), WCAG 2.1 AA accessibility, and production-ready validation/error handling.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x
**Primary Dependencies**:
- React 18.x (peer dependency)
- F01 Design System (internal, buttons/inputs/alerts/cards/spinners)
- No external state libraries (Redux/Zustand/TanStack Query)
**Storage**: N/A (frontend-only; state managed via React Context)
**Testing**: Jest + React Testing Library (from F01 setup), Chromatic visual regression
**Target Platform**: Modern browsers (ES2020+), dual deployment (Django templates + standalone SPA)
**Project Type**: Web frontend package (NPM package in monorepo workspace)
**Performance Goals**:
- Bundle size: ~10-15KB gzipped (excluding F01 components)
- Time to Interactive: <2s on 3G (Lighthouse metric)
- First Contentful Paint: <1.5s
**Constraints**:
- Must work without client-side routing (Django per-page mounting)
- HTTP-only cookies for sessions (no localStorage auth tokens)
- WCAG 2.1 AA accessibility compliance
- No breaking F01 design system abstractions
**Scale/Scope**:
- 5 authentication flows (sign-in, password reset request/confirm, sign-out, profile management)
- ~8-10 exported components (4 pages + 4 forms + AuthProvider)
- 5 custom hooks (useAuth, useAuthStatus, useCurrentUser, useSignIn, useSignOut, etc.)

### Architecture Decisions (from Planning Interrogation)

**Q1: State Management**
- **Decision**: React Context + hooks
- **Implementation**: `<AuthProvider>` component with `useAuth()`, `useAuthStatus()`, `useCurrentUser()` hooks
- **Internal State**: authenticated/unauthenticated/loading/error states, minimal user profile (id, displayName, email, roles)
- **Session Verification**: `/auth/me` endpoint called on initialization and relevant route changes
- **Error Handling**: 401/403 responses clear auth state and redirect to login with `?next=` parameter
- **Rationale**: Lightweight (<5KB), no heavy dependencies, composable with F01 components, works in both Django templates and SPAs

**Q2: Component Structure**
- **Decision**: Hybrid (page components + form primitives)
- **Page Components** (primary integration path):
  - `<SignInPage />`
  - `<RequestPasswordResetPage />`
  - `<ConfirmPasswordResetPage />`
  - `<ProfilePage />`
  - Built with F01 components (layout, typography, buttons, inputs, alerts)
  - Handle auth state/context integration, backend calls, redirects, error/success states
- **Form Primitives** (advanced use cases):
  - `<SignInForm />`
  - `<RequestPasswordResetForm />`
  - `<ConfirmPasswordResetForm />`
  - `<ProfileForm />`
  - Expose form logic + UI without layout/routing, allow custom composition
- **Routing Responsibility**: F02 does NOT own routing; host app (Django or SPA) wires pages into React Router or mounts per-page in templates
- **Rationale**: Fast integration via pages, flexibility via primitives, no router dependency lock-in

**Q3: API Integration & Error Handling**
- **Decision**: Custom hooks per endpoint + internal `apiClient` utility
- **Internal `apiClient`** (not exported):
  - Wraps `fetch()` with `credentials: 'include'` for cookie-based auth
  - Reads base URL from `AuthProvider` config
  - Centralizes JSON parsing, status handling
  - Normalizes errors into `{ status, fieldErrors, formErrors }` shape
- **Public Hooks**:
  - `useSignIn()`, `useSignOut()`, `useRequestPasswordReset()`, `useConfirmPasswordReset()`, `useUpdateProfile()`
  - Return `{ mutate, loading, error, data }` API
  - Manage loading/success/error state
  - Integrate with `AuthProvider` (update user, clear state on 401/403)
- **Error Handling Patterns**:
  - **401/403**: Trigger auth reset + redirect to login with `?next=...`
  - **Validation errors (4xx)**: Normalize to `fieldErrors` (per-field) + `formErrors` (global), render via F01 Alert/input error states
  - **Network/unknown errors**: Generic `formErrors` entry ("Something went wrong. Please try again.") via F01 Alert
- **Rationale**: Lightweight (~3-4KB for client + hooks), consistent error handling, clear B05/B13 contract boundary, easy to test (mock apiClient), no React Query/TanStack dependency

**Q4: Configuration & Environment Integration**
- **Decision**: Props on `<AuthProvider>` (no global singletons)
- **Configuration Type**:
  ```tsx
  type AuthConfig = {
    apiBaseUrl: string;                // e.g., "/api/v1"
    endpoints: {
      signIn: string;                  // e.g., "/auth/login"
      signOut: string;                 // e.g., "/auth/logout"
      requestPasswordReset: string;    // e.g., "/auth/password-reset/request"
      confirmPasswordReset: string;    // e.g., "/auth/password-reset/confirm"
      me: string;                      // e.g., "/auth/me"
      updateProfile: string;           // e.g., "/auth/profile"
    };
    routes: {
      login: string;                   // e.g., "/auth/login"
      defaultAfterLogin: string;       // e.g., "/app" (fallback if backend doesn't provide redirect_url)
      afterLogout: string;             // e.g., "/"
    };
    security?: {
      showSessionExpiryMessage?: boolean; // default: false - show "Your session has expired" message on 401/403
      enableSessionPolling?: boolean;     // default: false - periodic /auth/me calls
      sessionPollingInterval?: number;    // default: 300000 (5 minutes in ms)
    };
  };
  ```
- **Usage**: `<AuthProvider config={authConfig}>{children}</AuthProvider>`
- **Host Responsibilities**:
  - **SPA**: Construct config at root (e.g., from env vars), pass to `<AuthProvider>`
  - **Django**: Inject values into HTML (data-attributes or inline script), pass as props when mounting React root
- **Internal Behavior**:
  - `apiClient` reads all URLs from `config.apiBaseUrl` + `config.endpoints.*`
  - Redirects use `config.routes.*` and `?next=` parameter logic
  - No global mutable state; all behavior driven by passed config
- **Rationale**: Testable (different configs per test), works for Django per-page mounting + SPA single root, no hidden globals or process.env reliance inside F02

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
- [x] **Product-Agnostic**: ✅ F02 contains NO product-specific logic; provides core authentication UI primitives (sign-in, password reset, profile management) usable by any downstream product
- [x] **Core Focus**: ✅ Authentication flows are core concern (B05 Core Accounts integration)
- [x] **Downstream Extension**: ✅ Product-specific flows (e.g., custom profile fields, org-specific workflows) handled via form primitive composition

### II. Architecture and Modularity
- [x] **Single Responsibility**: ✅ F02 has one clear purpose: authentication UI
- [x] **Stable APIs**: ✅ Public exports documented (`<AuthProvider>`, page components, form primitives, hooks, `AuthConfig` type)
- [x] **Minimal Dependencies**: ✅ Only React 18.x (peer) + F01 design system (internal); no Redux/Zustand/TanStack
- [x] **No Circular Deps**: ✅ F02 → F01 → React (linear dependency chain)
- [x] **No Downstream Imports**: ✅ F02 is frontend package; no downstream imports apply

### III. Code Quality and Style
- [x] **Python 3.12+**: N/A (TypeScript/React package)
- [x] **Type Hints**: ✅ TypeScript 5.x with strict mode, all exports typed
- [x] **Black Formatting**: N/A (using Prettier for TypeScript)
- [x] **Ruff Linting**: N/A (using ESLint for TypeScript)
- [x] **No Dead Code**: ✅ Implementation will remove unused code
- [x] **Readable Code**: ✅ Functions/components remain small, single-responsibility
- [x] **Curated Dependencies**: ✅ No new dependencies beyond React 18.x (peer) + F01 (internal)

### IV. Testing Strategy
- [x] **pytest + pytest-django**: N/A (Jest + React Testing Library for frontend)
- [x] **Test Coverage**: ✅ Unit tests for hooks, integration tests for components, visual regression via Chromatic
- [x] **Regression Tests**: ✅ Bug fixes will include tests
- [x] **Deterministic**: ✅ Tests mock `apiClient`, no network calls
- [x] **Coverage Thresholds**: ✅ Target 80%+ coverage (Jest config)
- [x] **Integration Tests**: ✅ Full auth flows tested (sign-in → redirect, password reset flow, profile update)

### V. Security and Privacy
- [x] **Secure Defaults**: ✅ HTTP-only cookies (no localStorage tokens), `credentials: 'include'` for CORS
- [x] **DEBUG Off**: N/A (frontend package; Django handles DEBUG setting)
- [x] **No Secrets**: ✅ No secrets in F02; all endpoints passed via `AuthConfig`
- [x] **Dependency Scanning**: ✅ CI scans npm dependencies (Dependabot/Snyk)
- [x] **Centralized Auth**: ✅ F02 integrates with B05 Core Accounts via B13 API baseline
- [x] **No Sensitive Logging**: ✅ No logging of passwords/tokens; errors sanitized before display

### VI. Performance and Reliability
- [x] **No N+1 Queries**: N/A (frontend; backend responsibility)
- [x] **Pagination**: N/A (F02 does not handle lists/unbounded data)
- [x] **Explicit Caching**: ✅ No caching layer; `/auth/me` called on mount/route changes (documented)
- [x] **Structured Logging**: N/A (frontend; errors surfaced via F01 Alert components)
- [x] **Health Checks**: N/A (frontend package)
- [x] **Metrics Hooks**: ✅ Performance metrics captured via Lighthouse CI (bundle size, TTI, FCP)
- [x] **Graceful Degradation**: ✅ Network errors show generic message, form remains functional

### VII. UX and API Design
- [x] **DRF Required**: N/A (F02 is frontend; B05 uses DRF)
- [x] **Consistent Responses**: ✅ F02 normalizes B13 responses into `{ status, fieldErrors, formErrors }`
- [x] **Versioning Strategy**: ✅ Breaking changes handled via semver (F02 v1.x → v2.x)
- [x] **Clear Errors**: ✅ Validation errors displayed per-field + global (F01 Alert), no data leaks
- [x] **Boundary Validation**: ✅ Client-side validation (required fields, email format) + server-side validation (B05/B13)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: ✅ `pnpm install` + Storybook for component development
- [x] **Mandatory Tools**: ✅ Prettier, ESLint, TypeScript strict mode, Jest
- [x] **Pre-commit Hooks**: ✅ Husky + lint-staged (Prettier, ESLint, TypeScript check)
- [x] **Type Checking**: ✅ TypeScript strict mode, all exports typed
- [x] **Task Scripts**: ✅ `pnpm build`, `pnpm test`, `pnpm storybook`, `pnpm lint`
- [x] **Developer Docs**: ✅ README with setup, Storybook examples, quickstart.md (Phase 1)

### IX. Branching and Git Workflow
- [x] **Feature Branch**: ✅ Work on `023-core-auth-identity` branch
- [x] **Linked to Spec**: ✅ PR will reference `kitty-specs/023-core-auth-identity/spec.md`
- [x] **Focused PRs**: ✅ Single feature (F02 auth UI package)
- [x] **main Stable**: ✅ No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: ✅ ESLint, Prettier, TypeScript check, Jest, Chromatic visual regression
- [x] **Merge Gates**: ✅ All CI checks must pass (Code Quality, Design System CI, Tests)
- [x] **Scripted Deployment**: ✅ NPM package build via Vite library mode, published to internal registry

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: ✅ Documentation in `packages/auth/README.md` + `kitty-specs/023-core-auth-identity/quickstart.md`
- [x] **App README**: ✅ `packages/auth/README.md` with API reference, usage examples
- [x] **Getting Started**: ✅ quickstart.md (Phase 1) with setup, basic usage, Django integration
- [x] **Extension Guide**: ✅ Documentation for form primitive composition, custom validation
- [x] **Spec Sync**: ✅ Implementation keeps spec.md up to date
- [x] **ADR Required**: N/A (no major architectural decisions beyond planning interrogation)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: ✅ This feature does not require constitution amendments
- [x] **Template Updates**: ✅ No template changes required

### Violations Requiring Justification

*No violations detected. All Constitution checks pass.*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/023-core-auth-identity/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan with architecture decisions)
├── research.md          # Phase 0 output (codebase analysis, B05/B13 contracts, F01 component inventory)
├── data-model.md        # Phase 1 output (auth state shape, AuthConfig type, error normalization schema)
├── quickstart.md        # Phase 1 output (setup guide, basic usage, Django integration examples)
├── contracts/           # Phase 1 output (B13 endpoint contracts, error response formats)
│   ├── b13-auth-login.md
│   ├── b13-auth-logout.md
│   ├── b13-auth-me.md
│   ├── b13-password-reset-request.md
│   ├── b13-password-reset-confirm.md
│   └── b13-profile-update.md
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created by /spec-kitty.plan)
```

### Source Code (repository root)

```
packages/auth/                              # F02 Core Auth Identity UI package
├── src/
│   ├── index.ts                           # Public exports (components, hooks, types)
│   ├── components/
│   │   ├── AuthProvider.tsx              # Context provider with AuthConfig
│   │   ├── pages/
│   │   │   ├── SignInPage.tsx            # Full sign-in page component
│   │   │   ├── RequestPasswordResetPage.tsx
│   │   │   ├── ConfirmPasswordResetPage.tsx
│   │   │   └── ProfilePage.tsx           # User profile management page
│   │   └── forms/
│   │       ├── SignInForm.tsx            # Sign-in form primitive
│   │       ├── RequestPasswordResetForm.tsx
│   │       ├── ConfirmPasswordResetForm.tsx
│   │       └── ProfileForm.tsx           # Profile update form primitive
│   ├── hooks/
│   │   ├── useAuth.ts                    # Access full auth context
│   │   ├── useAuthStatus.ts              # Access auth status (authenticated/loading/error)
│   │   ├── useCurrentUser.ts             # Access current user data
│   │   ├── useSignIn.ts                  # Sign-in mutation hook
│   │   ├── useSignOut.ts                 # Sign-out mutation hook
│   │   ├── useRequestPasswordReset.ts    # Password reset request mutation
│   │   ├── useConfirmPasswordReset.ts    # Password reset confirm mutation
│   │   └── useUpdateProfile.ts           # Profile update mutation
│   ├── lib/
│   │   ├── apiClient.ts                  # Internal fetch wrapper (not exported)
│   │   ├── errorNormalizer.ts            # Normalize B13 errors to { status, fieldErrors, formErrors }
│   │   └── redirectHelper.ts             # Handle ?next= parameter logic, 401/403 redirects
│   ├── types/
│   │   ├── AuthConfig.ts                 # Configuration type (apiBaseUrl, endpoints, routes)
│   │   ├── AuthState.ts                  # Auth context state shape
│   │   ├── User.ts                       # User profile type
│   │   └── ApiError.ts                   # Normalized error types
│   └── __tests__/
│       ├── components/
│       │   ├── AuthProvider.test.tsx
│       │   ├── SignInPage.test.tsx
│       │   └── SignInForm.test.tsx
│       ├── hooks/
│       │   ├── useAuth.test.ts
│       │   ├── useSignIn.test.ts
│       │   └── useSignOut.test.ts
│       └── lib/
│           ├── apiClient.test.ts
│           └── errorNormalizer.test.ts
├── package.json                           # Package config (type: module, exports, peerDependencies)
├── tsconfig.json                          # TypeScript strict mode config
├── vite.config.ts                         # Vite library mode build config
├── README.md                              # API reference, usage examples, integration guide
└── .storybook/                            # Storybook config (inherited from F01 setup)

packages/design-system/                     # F01 Design System (dependency)
├── src/
│   └── components/
│       ├── Button/
│       ├── Input/
│       ├── Alert/
│       ├── Card/
│       ├── Spinner/
│       └── ...

tests/integration/                          # Integration tests (if cross-package tests needed)
└── auth-flows.test.tsx                    # E2E auth flow tests (sign-in → redirect, password reset flow)
```

**Structure Decision**:
F02 is implemented as a new NPM package (`packages/auth/`) in the existing pnpm workspace. This follows the established monorepo pattern from F01 (`packages/design-system/`). The package exports:
- **Components**: `<AuthProvider>`, 4 page components, 4 form primitives
- **Hooks**: `useAuth()`, `useAuthStatus()`, `useCurrentUser()`, 5 mutation hooks
- **Types**: `AuthConfig`, `AuthState`, `User`, `ApiError`

Internal utilities (`apiClient`, `errorNormalizer`, `redirectHelper`) are NOT exported. The package is built with Vite in library mode, targeting ES modules for modern bundlers. Tests use Jest + React Testing Library (inherited from F01 setup). Storybook provides component development environment and visual regression testing via Chromatic.

## Complexity Tracking

*No violations or complexity additions detected.*

This feature maintains simplicity:
- **No new project structure**: F02 fits into existing `packages/` monorepo pattern established by F01
- **No repository patterns**: Direct `fetch()` calls via internal `apiClient`, no ORM/data access layer
- **No heavy abstractions**: React Context + hooks (native React patterns), no Redux/Zustand/TanStack dependencies
- **Minimal API surface**: 13 public exports (1 provider, 8 components, 4 hooks + types)
- **Clear boundaries**: F02 → F01 → React (linear dependency chain), B05/B13 integration via documented contracts only
