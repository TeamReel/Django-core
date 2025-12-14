# Work Packages: Frontend-Backend Integration Guides

**Feature**: F09-frontend-backend-integration-guides
**Branch**: `030-frontend-backend-integration`
**Created**: 2025-12-14

## Overview

This feature delivers practical, executable integration guides showing how downstream products connect frontend modules (F01-F08) to Core-App backend APIs. Implementation focuses on three priority integration patterns (Authentication, Context Propagation, Data Fetching) with TypeScript contracts, validated examples, and automated CI checks.

**Total Work Packages**: 6
**Total Subtasks**: 35
**Estimated Effort**: 8-10 engineering days

---

## Work Package Summary

| WP ID | Title | Priority | Status | Subtasks | Dependencies |
|-------|-------|----------|--------|----------|--------------|
| WP01 | TypeScript Contracts & Package Setup | P0 | Planned | 6 | None (foundational) |
| WP02 | Authentication Guide & Examples | P1 | Planned | 7 | WP01 |
| WP03 | Context Propagation Guide & Examples | P1 | Planned | 7 | WP01 |
| WP04 | Data Fetching Guide & Examples | P1 | Planned | 8 | WP01, WP02, WP03 |
| WP05 | Integration Checklist & Anti-Patterns | P2 | Planned | 4 | WP02, WP03, WP04 |
| WP06 | CI Validation & Documentation | P2 | Planned | 3 | WP01-WP05 |

---

## Subtask Register

### Foundational (WP01)
- [ ] T001: Create `examples/integration-guides/` package structure [P]
- [ ] T002: Configure TypeScript strict mode + ESLint [P]
- [ ] T003: Create contracts/types.ts (RequestState, User, Organization, errors)
- [ ] T004: Create contracts/auth.ts (AuthProvider interface)
- [ ] T005: Create contracts/context.ts (ContextProvider interface)
- [ ] T006: Create contracts/api-client.ts (ApiClient interface)
- [ ] T007: Create contracts/cache.ts (CachePolicy interface)
- [ ] T008: Create contracts/index.ts (barrel export)

### Authentication (WP02)
- [ ] T009: Create docs/integration-guides/auth-api.md (guide structure + overview)
- [ ] T010: Document login/logout flows with CSRF protection
- [ ] T011: Document 401/403 error handling patterns
- [ ] T012: Document retry patterns + token refresh
- [ ] T013: Create examples/auth-example/ vanilla TypeScript implementation
- [ ] T014: Create examples/auth-example/ React Context implementation
- [ ] T015: Document anti-patterns (token storage, credential leakage)

### Context Propagation (WP03)
- [ ] T016: Create docs/integration-guides/context-propagation.md (guide structure)
- [ ] T017: Document organization/project context representation
- [ ] T018: Document context persistence patterns (localStorage, cookies)
- [ ] T019: Document context validation and error handling
- [ ] T020: Create examples/context-example/ vanilla TypeScript implementation
- [ ] T021: Create examples/context-example/ React Context implementation
- [ ] T022: Document anti-patterns (context drift, manual propagation)

### Data Fetching (WP04)
- [ ] T023: Create docs/integration-guides/data-fetching.md (guide structure)
- [ ] T024: Document list→detail navigation patterns
- [ ] T025: Document pagination patterns (cursor vs offset)
- [ ] T026: Document loading/error/empty state handling
- [ ] T027: Document HTTP cache headers (Cache-Control, ETag, 304)
- [ ] T028: Create examples/api-client-example/ fetch-based implementation
- [ ] T029: Create examples/cache-example/ SWR-based CachePolicy
- [ ] T030: Document anti-patterns (duplicate requests, N+1, cache inconsistencies)

### Integration Support (WP05)
- [ ] T031: Create docs/integration-guides/checklist.md (deployment checklist)
- [ ] T032: Create docs/integration-guides/anti-patterns.md (consolidated anti-patterns)
- [ ] T033: Create docs/integration-guides/troubleshooting.md (debug guide)
- [ ] T034: Create quickstart.md (guide navigation + quick start examples)

### Validation & CI (WP06)
- [ ] T035: Create validation script (TypeScript type-check + lint + build)
- [ ] T036: Integrate validation into pre-commit hooks
- [ ] T037: Add CI workflow for example validation

---

## WP01: TypeScript Contracts & Package Setup

**Priority**: P0 (Foundational)
**Status**: Planned
**Prompt File**: [`tasks/planned/WP01-typescript-contracts-package-setup.md`](tasks/planned/WP01-typescript-contracts-package-setup.md)

### Summary

Establish the TypeScript contracts package with strict mode configuration and core interface definitions (AuthProvider, ContextProvider, ApiClient, CachePolicy). This work package provides the type foundation that all examples and guides reference.

### Subtasks

- [ ] T001: Create `examples/integration-guides/` package structure [P]
- [ ] T002: Configure TypeScript strict mode + ESLint [P]
- [ ] T003: Create contracts/types.ts (RequestState, User, Organization, errors)
- [ ] T004: Create contracts/auth.ts (AuthProvider interface)
- [ ] T005: Create contracts/context.ts (ContextProvider interface)
- [ ] T006: Create contracts/api-client.ts (ApiClient interface)
- [ ] T007: Create contracts/cache.ts (CachePolicy interface)
- [ ] T008: Create contracts/index.ts (barrel export)

### Implementation Sketch

1. **Package Setup (T001-T002)**: Create package.json with TypeScript 5.x, React 18.x, configure tsconfig.json with strict mode, add ESLint + Prettier configs matching workspace standards
2. **Core Types (T003)**: Define RequestState discriminated union, User/Organization/Project types, error classes (ApiError, PermissionDeniedError, etc.)
3. **Interface Definitions (T004-T007)**: Create each interface file with comprehensive JSDoc comments, examples, and operation signatures
4. **Barrel Export (T008)**: Create index.ts that re-exports all contracts for clean imports

### Parallel Opportunities

- T001-T002 can proceed independently
- T003-T007 are sequential (types depend on core types)

### Dependencies

None (foundational work package)

### Success Criteria

- [ ] Package compiles with TypeScript strict mode (no errors)
- [ ] All interface files include JSDoc examples
- [ ] Barrel export works: `import { AuthProvider, ApiClient } from './contracts'`
- [ ] No linting errors

### Risks

- **Low**: Contract definitions already created in Phase 1, just need package integration

---

## WP02: Authentication Guide & Examples

**Priority**: P1 (User Story 1)
**Status**: Planned
**Prompt File**: [`tasks/planned/WP02-authentication-guide-examples.md`](tasks/planned/WP02-authentication-guide-examples.md)

### Summary

Deliver comprehensive authentication integration guide covering login/logout flows, CSRF protection, session management, and 401/403 error handling. Includes vanilla TypeScript and React reference implementations demonstrating AuthProvider pattern.

### Subtasks

- [ ] T009: Create docs/integration-guides/auth-api.md (guide structure + overview)
- [ ] T010: Document login/logout flows with CSRF protection
- [ ] T011: Document 401/403 error handling patterns
- [ ] T012: Document retry patterns + token refresh
- [ ] T013: Create examples/auth-example/ vanilla TypeScript implementation
- [ ] T014: Create examples/auth-example/ React Context implementation
- [ ] T015: Document anti-patterns (token storage, credential leakage)

### Implementation Sketch

1. **Guide Foundation (T009)**: Create auth-api.md with sections: Overview, Prerequisites, Login Flow, Logout Flow, Error Handling, Retry Patterns, Anti-Patterns
2. **Flow Documentation (T010-T012)**: Document each pattern with code snippets, diagrams, and security considerations (CSRF token injection, httpOnly cookies, token refresh before expiry)
3. **Vanilla Example (T013)**: Implement AuthProvider with fetch API, demonstrate CSRF token extraction from meta tag/cookie, show 401 retry logic
4. **React Example (T014)**: Wrap vanilla implementation in React Context, add hooks (useAuth), show component integration
5. **Anti-Patterns (T015)**: Document common mistakes: localStorage token storage, missing CSRF, credential logging, ignoring 401/403 differences

### Parallel Opportunities

- T009-T012 (documentation) can proceed in parallel with T013-T014 (examples)
- T015 can be drafted early and refined after T013-T014

### Dependencies

- **Required**: WP01 (needs AuthProvider interface definition)

### Success Criteria

- [ ] Guide covers all FR-007 to FR-013 requirements
- [ ] Examples compile and type-check successfully
- [ ] Examples demonstrate CSRF protection with concrete code
- [ ] Anti-patterns section includes at least 5 concrete examples
- [ ] Guide includes copy-paste checklist

### Risks

- **Medium**: CSRF token extraction may vary by backend setup → Document both meta tag and cookie approaches

---

## WP03: Context Propagation Guide & Examples

**Priority**: P1 (User Story 2)
**Status**: Planned
**Prompt File**: [`tasks/planned/WP03-context-propagation-guide-examples.md`](tasks/planned/WP03-context-propagation-guide-examples.md)

### Summary

Deliver context propagation guide showing how to maintain and inject organization/project context into all API requests. Includes ContextProvider pattern with persistence, validation, and React integration.

### Subtasks

- [ ] T016: Create docs/integration-guides/context-propagation.md (guide structure)
- [ ] T017: Document organization/project context representation
- [ ] T018: Document context persistence patterns (localStorage, cookies)
- [ ] T019: Document context validation and error handling
- [ ] T020: Create examples/context-example/ vanilla TypeScript implementation
- [ ] T021: Create examples/context-example/ React Context implementation
- [ ] T022: Document anti-patterns (context drift, manual propagation)

### Implementation Sketch

1. **Guide Foundation (T016)**: Create context-propagation.md with sections: Overview, Context Structure, Selection Flow, Persistence, Validation, Anti-Patterns
2. **Context Representation (T017)**: Document header format (X-Organization-ID, X-Project-ID), show when/how to inject, explain backend validation
3. **Persistence (T018)**: Show localStorage pattern for cross-session, sessionStorage for tab-specific, discuss security implications
4. **Validation (T019)**: Document context restoration on app mount, error handling for invalid/deleted orgs, clearing context on logout
5. **Vanilla Example (T020)**: Implement ContextProvider with storage abstraction, show setOrg/setProject with API validation
6. **React Example (T021)**: Wrap in React Context, add hooks (useContext), show integration with F03 Context Switcher
7. **Anti-Patterns (T022)**: Document context drift scenarios, manual propagation mistakes, multi-tab conflicts

### Parallel Opportunities

- T016-T019 (documentation) can proceed in parallel with T020-T021 (examples)
- T022 can be drafted early

### Dependencies

- **Required**: WP01 (needs ContextProvider interface)
- **Soft**: WP02 (context clearing on logout ties to auth patterns)

### Success Criteria

- [ ] Guide covers all FR-014 to FR-020 requirements
- [ ] Examples demonstrate header injection with ApiClient integration
- [ ] Context validation includes API calls to verify access
- [ ] Anti-patterns section includes context drift scenarios
- [ ] Guide includes copy-paste checklist

### Risks

- **Medium**: Multi-tab context conflicts may require complex solutions → Keep simple, document trade-offs

---

## WP04: Data Fetching Guide & Examples

**Priority**: P1 (User Story 3)
**Status**: Planned
**Prompt File**: [`tasks/planned/WP04-data-fetching-guide-examples.md`](tasks/planned/WP04-data-fetching-guide-examples.md)

### Summary

Deliver comprehensive data fetching guide covering list→detail navigation, pagination, loading/error states, caching strategies, and retry patterns. Includes ApiClient and CachePolicy implementations with SWR integration example.

### Subtasks

- [ ] T023: Create docs/integration-guides/data-fetching.md (guide structure)
- [ ] T024: Document list→detail navigation patterns
- [ ] T025: Document pagination patterns (cursor vs offset)
- [ ] T026: Document loading/error/empty state handling
- [ ] T027: Document HTTP cache headers (Cache-Control, ETag, 304)
- [ ] T028: Create examples/api-client-example/ fetch-based implementation
- [ ] T029: Create examples/cache-example/ SWR-based CachePolicy
- [ ] T030: Document anti-patterns (duplicate requests, N+1, cache inconsistencies)

### Implementation Sketch

1. **Guide Foundation (T023)**: Create data-fetching.md with sections: Overview, List Patterns, Detail Patterns, Pagination, State Management, Caching, Anti-Patterns
2. **Navigation Patterns (T024)**: Show list→detail flow, optimistic navigation, prefetching strategies
3. **Pagination (T025)**: Document cursor vs offset pagination, infinite scroll, page navigation, URL param synchronization
4. **State Handling (T026)**: Show RequestState pattern for loading/success/error/empty, error boundaries, retry UI
5. **Caching (T027)**: Document HTTP cache headers (Cache-Control, ETag, If-None-Match), revalidation patterns, cache invalidation after mutations
6. **ApiClient Example (T028)**: Implement fetch-based ApiClient with CSRF, auth, context injection, error normalization, request/response interceptors
7. **Cache Example (T029)**: Implement SWR-based CachePolicy showing shouldCache, getCacheDuration, shouldRevalidate, invalidate operations
8. **Anti-Patterns (T030)**: Document duplicate requests, N+1 queries, missing error states, cache inconsistencies, no loading feedback

### Parallel Opportunities

- T023-T027 (documentation) can proceed in parallel with T028-T029 (examples)
- T030 can be drafted early

### Dependencies

- **Required**: WP01 (needs ApiClient, CachePolicy interfaces)
- **Soft**: WP02, WP03 (ApiClient integrates auth and context patterns)

### Success Criteria

- [ ] Guide covers all FR-021 to FR-031 requirements
- [ ] ApiClient example demonstrates CSRF + auth + context header injection
- [ ] CachePolicy example integrates with SWR (or similar library)
- [ ] Guide shows concrete HTTP cache header usage
- [ ] Anti-patterns section includes at least 6 concrete examples
- [ ] Guide includes copy-paste checklist

### Risks

- **Medium**: Cache invalidation patterns may vary by library → Focus on interface, show one reference implementation
- **Low**: SWR integration may be unfamiliar → Provide clear setup instructions

---

## WP05: Integration Checklist & Anti-Patterns

**Priority**: P2 (Support)
**Status**: Planned
**Prompt File**: [`tasks/planned/WP05-integration-checklist-antipatterns.md`](tasks/planned/WP05-integration-checklist-antipatterns.md)

### Summary

Create consolidated integration checklist, anti-patterns guide, troubleshooting guide, and quickstart navigation document. These support materials help developers quickly find patterns and avoid common mistakes.

### Subtasks

- [ ] T031: Create docs/integration-guides/checklist.md (deployment checklist)
- [ ] T032: Create docs/integration-guides/anti-patterns.md (consolidated anti-patterns)
- [ ] T033: Create docs/integration-guides/troubleshooting.md (debug guide)
- [ ] T034: Create quickstart.md (guide navigation + quick start examples)

### Implementation Sketch

1. **Checklist (T031)**: Create pre-deployment checklist covering: auth configured, CSRF enabled, context propagation working, loading states present, error handling complete, cache invalidation after mutations, types match backend
2. **Anti-Patterns (T032)**: Consolidate anti-patterns from WP02-WP04, organize by category (security, context, data fetching), provide "do this instead" for each
3. **Troubleshooting (T033)**: Create debug guide with common issues: CSRF failures, 401 loops, context drift, cache stale data, provide diagnostic steps and solutions
4. **Quickstart (T034)**: Create navigation document with guide links, quick code examples, decision tree for "which guide do I need?"

### Parallel Opportunities

- All tasks (T031-T034) can proceed in parallel once WP02-WP04 complete

### Dependencies

- **Required**: WP02, WP03, WP04 (consolidates patterns from these guides)

### Success Criteria

- [ ] Checklist includes all critical integration points
- [ ] Anti-patterns guide has at least 15 concrete examples
- [ ] Troubleshooting guide addresses observed pain points
- [ ] Quickstart provides clear navigation to all guides

### Risks

- **Low**: May need to iterate on checklist after real-world usage feedback

---

## WP06: CI Validation & Documentation

**Priority**: P2 (Infrastructure)
**Status**: Planned
**Prompt File**: [`tasks/planned/WP06-ci-validation-documentation.md`](tasks/planned/WP06-ci-validation-documentation.md)

### Summary

Implement automated validation for example code (TypeScript type-check + lint + build) and integrate into pre-commit hooks and CI pipeline. Ensures examples remain valid as Core-App evolves.

### Subtasks

- [ ] T035: Create validation script (TypeScript type-check + lint + build)
- [ ] T036: Integrate validation into pre-commit hooks
- [ ] T037: Add CI workflow for example validation

### Implementation Sketch

1. **Validation Script (T035)**: Create `scripts/validate-examples.sh` (or .ps1) that runs: `pnpm --filter @django-core/integration-guides-examples type-check && pnpm --filter @django-core/integration-guides-examples lint && pnpm --filter @django-core/integration-guides-examples build`
2. **Pre-commit (T036)**: Add validation script to `.pre-commit-config.yaml` to run on example file changes
3. **CI Integration (T037)**: Add GitHub Actions workflow step that runs validation script, fails PR if validation fails

### Parallel Opportunities

- All tasks (T035-T037) are sequential

### Dependencies

- **Required**: WP01 (needs package structure), WP02-WP04 (needs example code)

### Success Criteria

- [ ] Validation script runs in <2 minutes
- [ ] Pre-commit hook blocks commits with invalid examples
- [ ] CI fails PRs with invalid examples
- [ ] Validation output is clear and actionable

### Risks

- **Low**: Existing CI may need configuration updates → Use existing patterns from workspace

---

## Implementation Strategy

### Phase 1: Foundation (Week 1)
- **Goal**: Establish contracts and package structure
- **Work Packages**: WP01
- **Parallel Work**: None (foundational)
- **Outcome**: TypeScript contracts compiled, ready for examples

### Phase 2: Core Guides (Week 1-2)
- **Goal**: Deliver priority integration guides with examples
- **Work Packages**: WP02, WP03, WP04
- **Parallel Work**: WP02 and WP03 can proceed simultaneously, WP04 follows after
- **Outcome**: Auth, Context, and Data Fetching guides complete with validated examples

### Phase 3: Support & Polish (Week 2)
- **Goal**: Add support materials and automation
- **Work Packages**: WP05, WP06
- **Parallel Work**: Both can proceed simultaneously once WP02-WP04 complete
- **Outcome**: Checklist, troubleshooting, CI validation live

### MVP Scope
**Recommended**: WP01 + WP02 + WP03
**Rationale**: Auth and Context are foundational patterns required by all downstream products. Can ship these first, add Data Fetching in follow-up release.

---

## Testing Notes

**No traditional tests required** per FR-032/033/034 and clarification session. Validation strategy:
- **Automated**: TypeScript type-check + lint + build for all examples (mandatory, CI enforced)
- **Manual**: Verification checklist for non-automatable aspects (auth flows, permission scenarios)
- **Deferred**: OpenAPI schema validation (until backend specs stable)

---

## Progress Tracking

**Last Updated**: 2025-12-14
**Total Subtasks**: 37
**Completed**: 0
**In Progress**: 0
**Blocked**: 0

Track progress by checking off subtasks above and moving work package prompts through task lanes:
- `tasks/planned/` → Work not started
- `tasks/doing/` → Work in progress
- `tasks/for_review/` → Work complete, awaiting review
- `tasks/done/` → Work reviewed and merged
