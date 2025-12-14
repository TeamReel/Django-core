# Research: Frontend-Backend Integration Guides

**Feature**: 030-frontend-backend-integration
**Date**: 2025-12-14
**Researcher**: AI Agent (Copilot)
**Status**: Complete

## Executive Summary

This research phase establishes the technical foundation for creating practical, executable integration guides that demonstrate how downstream products connect frontend modules (F01-F08) to Core-App backend APIs. The guides target three priority integration patterns: Authentication, Context Propagation, and Data Fetching.

**Key Decisions**:
1. Documentation infrastructure reuses existing MkDocs setup
2. Example code lives in dedicated pnpm workspace package
3. Validation integrates into existing CI pipeline
4. Interface-based patterns allow framework flexibility
5. HTTP-based caching guidance remains portable

---

## Decision Log

### D1: Documentation Tooling

**Decision**: Use plain Markdown within existing MkDocs setup

**Rationale**:
- Core-App already has mature MkDocs infrastructure (`docs/` + `mkdocs.yml`)
- Zero additional maintenance burden (no new doc generator to learn/maintain)
- Consistent navigation and search with existing docs
- MkDocs supports code highlighting, linking, and navigation out-of-box
- Team already familiar with MkDocs workflow

**Alternatives Considered**:
- **Docusaurus**: Rejected - requires Node.js build system, adds complexity
- **VitePress**: Rejected - modern but unfamiliar to team, migration cost
- **Plain Markdown only**: Rejected - loses search, navigation, theming benefits

**Evidence**: [source-register.csv#1] MkDocs already configured in `mkdocs.yml` with extensions for code blocks, admonitions, and TOC

**Risk**: MkDocs limitations with interactive examples → Mitigated by linking to live CodeSandbox/StackBlitz if needed in future

---

### D2: Example Code Repository Structure

**Decision**: Create `examples/integration-guides/` as pnpm workspace package

**Rationale**:
- Core-App uses pnpm workspaces (`pnpm-workspace.yaml`, `packages/*`)
- Shared toolchain reduces duplication (TypeScript, ESLint, Prettier configs)
- Can import F01-F08 packages as workspace dependencies
- Single `pnpm install` at root covers all packages
- CI already configured to run checks across workspace

**Alternatives Considered**:
- **Inline code in Markdown**: Rejected - no automated validation possible
- **Separate standalone project**: Rejected - duplicates tooling, harder to keep deps in sync
- **Code in `docs/` directory**: Rejected - mixes concerns, harder to validate

**Evidence**: [source-register.csv#2] Existing `pnpm-workspace.yaml` includes `packages/*` and `examples/*` patterns

**Implementation Details**:
```json
{
  "name": "@django-core/integration-guides-examples",
  "private": true,
  "dependencies": {
    "@django-core/design-system": "workspace:*",
    "@django-core/auth": "workspace:*",
    "@django-core/context-switcher": "workspace:*",
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

### D3: Validation Approach

**Decision**: TypeScript type-check + lint + build validation in existing CI pipeline

**Rationale**:
- Team decision during clarification (Session 2025-12-14)
- Balances coverage (catches type errors, linting issues, build failures) with speed
- OpenAPI validation deferred until backend specs stable
- Existing pre-commit hooks + GitHub Actions already run similar checks
- Avoids heavyweight E2E testing for documentation feature

**Alternatives Considered**:
- **TypeScript only**: Rejected - misses linting issues, unvalidated builds
- **Full E2E with Playwright**: Rejected - overkill for docs, slow CI, high maintenance
- **Manual review only**: Rejected - doesn't scale, drift inevitable

**Evidence**: [source-register.csv#3] Spec FR-032/033/034 mandate TypeScript + lint + build; clarification session confirmed this scope

**Validation Script Approach**:
```bash
# In examples/integration-guides/package.json
{
  "scripts": {
    "validate": "tsc --noEmit && eslint . && tsc --build",
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "build": "tsc --build"
  }
}
```

---

### D4: Reference Stack Versions

**Decision**: TypeScript 5.x + React 18.x

**Rationale**:
- Matches existing F01-F08 frontend packages (confirmed in copilot-instructions.md)
- TypeScript 5.x provides latest type system features (const type parameters, satisfies)
- React 18.x is current LTS with concurrent features, Server Components foundation
- Ensures examples work with actual Core-App components without version conflicts

**Alternatives Considered**:
- **TypeScript 4.9 + React 17**: Rejected - unnecessary backward compatibility, missing features
- **Latest bleeding edge**: Rejected - unstable, may not match Core-App

**Evidence**: [source-register.csv#4] `.github/copilot-instructions.md` lists `TypeScript 5.x, React 18.x` for F01, F02, F03, F05, F06, F07

---

### D5: Cache Policy Guidance Scope

**Decision**: HTTP cache headers (Cache-Control, ETag, 304) + CachePolicy interface + optional reference implementation

**Rationale**:
- HTTP caching is portable across all HTTP clients (fetch, axios, etc.)
- Avoids prescribing specific client-side cache libraries (React Query, SWR, TanStack Query all work differently)
- CachePolicy interface lets teams plug in their chosen solution
- Optional reference implementation shows pattern without enforcing it

**Alternatives Considered**:
- **Principles only**: Rejected - too abstract, teams want concrete examples
- **Specific library (e.g., React Query)**: Rejected - locks teams into one approach
- **Full in-memory cache implementation**: Rejected - becomes maintenance burden, opinionated

**Evidence**: [source-register.csv#5] Clarification session 2025-12-14 confirmed "Interface + HTTP cache headers"

**Interface Design**:
```typescript
interface CachePolicy {
  shouldCache(request: Request): boolean;
  getCacheDuration(response: Response): number;
  shouldRevalidate(cachedAt: Date): boolean;
}
```

---

### D6: Manual Verification Checklist Strategy

**Decision**: Central `docs/integration-guides/checklist.md` with guide-specific sections

**Rationale**:
- Single source of truth reduces duplication
- Easier to maintain (update once vs per-guide)
- Guides link to relevant checklist sections
- Can add guide-specific items without full duplication

**Alternatives Considered**:
- **Per-guide checklists**: Rejected - duplication, divergence risk
- **Checklist in examples/**: Rejected - belongs with docs, not code
- **Inline in each guide**: Rejected - hard to maintain consistency

**Evidence**: [source-register.csv#6] Planning session 2025-12-14 confirmed central checklist approach

**Checklist Structure**:
```markdown
# Integration Guides Manual Verification Checklist

## Authentication Guide Verification
- [ ] Login flow completes without CSRF errors
- [ ] 401 responses redirect to login
- [ ] 403 responses show permission-denied UI
- [ ] Tokens are not logged or leaked in URLs

## Context Propagation Verification
- [ ] Org switch updates all subsequent API calls
- [ ] Context persists across page refresh
- [ ] No cross-user context contamination

## Data Fetching Verification
- [ ] Loading states display appropriately
- [ ] Empty states provide clear feedback
- [ ] Error retries use exponential backoff
- [ ] Permission-denied states don't expose internals
```

---

### D7: Guide Maintenance Workflow

**Decision**: Feature teams update guides when making changes; CI validates and blocks merge on failures

**Rationale**:
- Shift-left approach: catch drift at PR time, not months later
- Teams making changes have best context for updating docs
- CI validation creates forcing function (can't merge if examples break)
- Automatic ticket creation fallback if validation scripts fail to create ticket (optional)

**Alternatives Considered**:
- **Dedicated docs team quarterly review**: Rejected - docs drift for months, context lost
- **No enforcement**: Rejected - drift inevitable
- **CI warnings only**: Rejected - warnings get ignored

**Evidence**: [source-register.csv#7] Clarification session 2025-12-14: "Feature team updates, CI enforces"

**CI Integration Points**:
- `.pre-commit-config.yaml`: Add `cd examples/integration-guides && pnpm validate`
- `.github/workflows/ci.yml`: Add validation step for integration guides
- Merge protection: Require all checks passing

---

## Interface Design Decisions

### AuthProvider Interface

**Purpose**: Abstract authentication state management for team flexibility

```typescript
interface AuthProvider {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(credentials: Credentials): Promise<void>;
  logout(): Promise<void>;
  refreshToken(): Promise<void>;
}
```

**Design Rationale**:
- Minimal surface area (only essential auth operations)
- Promise-based for async flexibility
- Doesn't prescribe storage (cookies, localStorage, memory)
- Compatible with React Context, Zustand, Redux, or custom solutions

**References**: Auth guide will show vanilla implementation + React Context reference

---

### ContextProvider Interface

**Purpose**: Maintain and propagate org/project context

```typescript
interface ContextProvider {
  currentOrg: Organization | null;
  currentProject: Project | null;
  setOrg(orgId: string): Promise<void>;
  setProject(projectId: string): Promise<void>;
  clearContext(): void;
}
```

**Design Rationale**:
- Separates org and project (user can be in org without project)
- Async setters support API validation before context change
- Clear method prevents stale context on logout

**References**: Context guide will show storage patterns (localStorage + sessionStorage)

---

### ApiClient Interface

**Purpose**: Standardize authenticated, context-aware requests

```typescript
interface ApiClient {
  get<T>(url: string, options?: RequestOptions): Promise<Response<T>>;
  post<T>(url: string, body: any, options?: RequestOptions): Promise<Response<T>>;
  put<T>(url: string, body: any, options?: RequestOptions): Promise<Response<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<Response<T>>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

interface Response<T> {
  data: T;
  status: number;
  headers: Headers;
}
```

**Design Rationale**:
- Standard REST methods with TypeScript generics
- RequestOptions supports headers, query params, abort signals
- Response wrapper provides consistent error handling surface

**References**: Data fetching guide will show implementation with retry logic, error handling

---

### CachePolicy Interface

**Purpose**: Define cache behavior without prescribing implementation

```typescript
interface CachePolicy {
  shouldCache(request: Request): boolean;
  getCacheDuration(response: Response): number; // milliseconds
  shouldRevalidate(cachedAt: Date): boolean;
  invalidate(pattern: string): void;
}
```

**Design Rationale**:
- Request-level caching decisions (not all endpoints cacheable)
- Duration from response supports server-driven cache control
- Pattern-based invalidation (e.g., `/api/orgs/*`)

**References**: Data fetching guide will show HTTP cache header patterns + minimal in-memory reference

---

## Anti-Patterns Research

### Authentication Anti-Patterns

**AP-1: Storing tokens in localStorage**
- **Risk**: XSS attacks can steal tokens
- **Why Common**: Simple, persists across tabs
- **Correct Approach**: httpOnly cookies or memory + refresh tokens

**AP-2: Ignoring CSRF tokens**
- **Risk**: Cross-site request forgery attacks
- **Why Common**: Works in dev, breaks in production
- **Correct Approach**: Always include CSRF token from cookie/meta tag

**AP-3: Logging credentials or tokens**
- **Risk**: PII/credential leakage in logs
- **Why Common**: Debugging convenience
- **Correct Approach**: Redact sensitive fields, log request IDs only

**AP-4: Mixing 401 and 403 handling**
- **Risk**: Confusing UX (redirect vs permission denied)
- **Why Common**: Both are "auth failures"
- **Correct Approach**: 401 → login redirect; 403 → permission-denied UI

**Evidence**: [source-register.csv#8] Spec user stories identify "inconsistent 401/403 handling" as key pain point

---

### Context Propagation Anti-Patterns

**AP-5: Manual context propagation**
- **Risk**: Forgot to pass context to some API calls
- **Why Common**: Simple at first, scales poorly
- **Correct Approach**: Centralized API client that auto-injects context

**AP-6: Context drift (UI vs API mismatch)**
- **Risk**: User sees Org A, API receives Org B context
- **Why Common**: State updates don't trigger API client refresh
- **Correct Approach**: Single source of truth, context provider invalidates stale requests

**AP-7: Storing context in URL only**
- **Risk**: Lost on external navigation, can't be validated
- **Why Common**: Seems RESTful
- **Correct Approach**: URL + storage + validation on load

**AP-8: Cross-user context leakage**
- **Risk**: User B sees User A's org after shared device login
- **Why Common**: Context persists in localStorage across sessions
- **Correct Approach**: Clear context on logout, validate context matches user on load

**Evidence**: [source-register.csv#9] Spec identifies "context drift" and "storage conflicts" as major pain points

---

### Data Fetching Anti-Patterns

**AP-9: Duplicate requests**
- **Risk**: Poor performance, race conditions
- **Why Common**: Multiple components fetch same data
- **Correct Approach**: Request deduplication, shared state

**AP-10: N+1 request patterns**
- **Risk**: Waterfall requests, slow UX
- **Why Common**: Fetch list, then details one-by-one
- **Correct Approach**: Batch requests, pagination with embedded details

**AP-11: No retry logic**
- **Risk**: Transient failures break UX permanently
- **Why Common**: "Network should be reliable"
- **Correct Approach**: Exponential backoff with max retries

**AP-12: Cache inconsistencies**
- **Risk**: Stale data, updates not reflected
- **Why Common**: Forgot to invalidate cache on mutations
- **Correct Approach**: Optimistic updates + rollback, cache invalidation patterns

**AP-13: Poor error handling**
- **Risk**: Unclear feedback, exposed internals
- **Why Common**: Default error messages pass through
- **Correct Approach**: User-friendly errors, log technical details separately

**Evidence**: [source-register.csv#10] Spec identifies "fragmented state handling" and "duplicate calls" as key issues

---

## F01-F08 Module Touchpoints

### F01: Design System (@django-core/design-system)
- **Usage**: Loading states, error displays, empty states, buttons, forms
- **Examples Will Show**: `<Spinner />`, `<ErrorBoundary />`, `<EmptyState />`
- **Guide Coverage**: Data fetching guide

### F02: Auth UI (@django-core/auth)
- **Usage**: Login forms, auth state management patterns
- **Examples Will Show**: Integration with AuthProvider interface
- **Guide Coverage**: Authentication guide

### F03: Context Switcher (@django-core/context-switcher)
- **Usage**: Org/project selection UI
- **Examples Will Show**: Integration with ContextProvider interface
- **Guide Coverage**: Context propagation guide

### F04: Notifications Hub UI (deferred to release 2)
- **Usage**: TBD
- **Guide Coverage**: Future guide

### F05: Resource Display & Alerts (deferred to release 2)
- **Usage**: TBD
- **Guide Coverage**: Future guide

### F06: Page Templates (@django-core/page-templates)
- **Usage**: May reference layout patterns if relevant
- **Examples Will Show**: How layouts integrate with context/auth
- **Guide Coverage**: All guides (as layout context)

### F07: Theme System (@django-core/theme-system)
- **Usage**: Theme-aware components in examples
- **Examples Will Show**: Using semantic tokens for loading/error states
- **Guide Coverage**: Data fetching guide (state colors)

### F08: (Future)
- **Usage**: TBD
- **Guide Coverage**: TBD

**Evidence**: [source-register.csv#11] Spec FR-005/FR-010/FR-015/FR-017 reference F01-F03 explicitly

---

## Technology Stack Validation

### TypeScript 5.x Features Used
- **Const type parameters**: Improved inference in generic functions
- **satisfies operator**: Type checking without widening
- **Strict mode**: All strict flags enabled in tsconfig.json

### React 18.x Features Used
- **Hooks**: useState, useEffect, useContext, custom hooks
- **Strict Mode**: Development warnings
- **Concurrent features**: Not required, but examples work with them

### Validation Toolchain
- **TypeScript Compiler**: Type checking (`tsc --noEmit`)
- **ESLint**: Linting with existing config (likely `@typescript-eslint`)
- **Prettier**: Formatting (configured in workspace root)
- **Build**: `tsc --build` ensures buildable examples

**Evidence**: [source-register.csv#12] Clarification session + copilot-instructions.md confirm stack

---

## Risk Register

### R1: Documentation Drift (HIGH)
**Risk**: Guides become outdated as APIs evolve
**Mitigation**: CI validation + feature team update requirement (FR-038)
**Residual**: Manual verification checklist items may still drift
**Monitor**: Track validation failures in CI metrics

### R2: Framework Lock-In (MEDIUM)
**Risk**: React examples perceived as mandatory
**Mitigation**: Clear labeling ("reference only"), vanilla TS examples first
**Residual**: Teams may copy React patterns without understanding interfaces
**Monitor**: Feedback from downstream product teams

### R3: Validation Script Maintenance (MEDIUM)
**Risk**: Validation scripts break as toolchain evolves
**Mitigation**: Use standard TypeScript compiler, not custom tooling
**Residual**: Config drift between workspace packages
**Monitor**: CI failures on unrelated PRs signal drift

### R4: Guide Complexity (LOW)
**Risk**: Guides become too comprehensive, hard to navigate
**Mitigation**: Focus on 3 priority patterns, defer others to release 2
**Residual**: Teams request additional patterns (notifications, resource display)
**Monitor**: Support ticket volume, onboarding feedback

### R5: Anti-Pattern Staleness (LOW)
**Risk**: Anti-pattern list doesn't cover new mistakes
**Mitigation**: Living document, teams contribute observed patterns
**Residual**: Requires ongoing curation
**Monitor**: Bug tracker analysis for recurring integration issues

---

## Open Questions

### Q1: OpenAPI Schema Availability (RESOLVED)
**Question**: When will Core-App backend have stable OpenAPI specs for validation?
**Status**: DEFERRED - Validation deferred until specs stable (clarification session)
**Next Action**: Track schema availability, add validation in future release

### Q2: CI Ticket Automation (RESOLVED)
**Question**: Does CI workflow support auto-creating update tickets on validation failure?
**Status**: CONDITIONAL - Only if existing workflow supports it; otherwise manual ticket creation
**Next Action**: Check `.github/workflows/` for issue creation patterns during implementation

### Q3: MkDocs Custom Extensions (OPEN)
**Question**: Do any guides need interactive elements beyond MkDocs capabilities?
**Status**: MONITOR - Start with standard MkDocs, evaluate need for CodeSandbox/StackBlitz embeds
**Next Action**: Gather feedback from early users in Phase 3 (tasks)

---

## Evidence Audit Trail

See `research/source-register.csv` and `research/evidence-log.csv` for detailed source tracking.

**Key Sources**:
1. Feature spec (`spec.md`) - Requirements and success criteria
2. Clarification session (2025-12-14) - Validated planning decisions
3. Planning session (2025-12-14) - Documentation tooling, validation approach
4. Copilot instructions (`.github/copilot-instructions.md`) - F01-F08 tech stack
5. Existing workspace (`pnpm-workspace.yaml`, `mkdocs.yml`) - Infrastructure context
6. Constitution (`.kittify/memory/constitution.md`) - Compliance requirements

---

## Next Steps

1. ✅ Research complete - All major decisions documented
2. ⏭️ **Phase 1**: Create `data-model.md` (document interface patterns as entities)
3. ⏭️ **Phase 1**: Generate `contracts/` (TypeScript type definitions for interfaces)
4. ⏭️ **Phase 1**: Create `quickstart.md` (guide overview and quick navigation)
5. ⏭️ **Phase 2**: Run `/spec-kitty.tasks` to break down into work packages

**Status**: Research phase complete, ready for Phase 1 design artifacts.
