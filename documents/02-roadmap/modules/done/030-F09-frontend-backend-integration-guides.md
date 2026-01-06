# F09: Frontend-Backend Integration Guides

**Phase:** 7
**Status:** ✅ Done
**Module ID:** 030
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description
Frontend-Backend Integration Guides (Phase 7)

## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Frontend-Backend Integration Guides

**Feature Branch**: `030-frontend-backend-integration`
**Created**: 2025-12-13
**Status**: Draft
**Input**: User description: "Provide practical, concrete integration guides that show how downstream products connect frontend modules (F01–F08) to Core-App backend APIs and core modules, using repeatable patterns instead of product-specific logic."

## User Scenarios & Testing

### User Story 1 - Authentication Integration (Priority: P1)

As a frontend developer integrating a new downstream product, I need a complete guide for implementing authentication and authenticated API calls so that I can securely connect to Core-App backend without guessing implementation details or creating security vulnerabilities.

**Why this priority**: Authentication is the foundation for all other integrations. Without proper auth patterns, teams create inconsistent security implementations, leading to vulnerabilities and poor UX (inconsistent 401/403 handling, token leaks, etc.).

**Independent Test**: Can be tested by following the auth guide to implement login, token/session handling, and make authenticated API calls. Delivers a working, secure authentication flow that teams can deploy independently before other features.

**Acceptance Scenarios**:

1. **Given** a new frontend application, **When** a developer follows the authentication guide, **Then** they can implement login with proper CSRF protection and session/token handling
2. **Given** an authenticated user session, **When** making API requests, **Then** credentials are automatically included via documented patterns (cookies, headers)
3. **Given** an expired or invalid token, **When** an API request receives 401, **Then** the guide's error handling pattern gracefully redirects to login
4. **Given** insufficient permissions, **When** an API request receives 403, **Then** the guide's pattern displays appropriate UI feedback without exposing internals
5. **Given** network failures during authentication, **When** retry logic executes, **Then** the documented retry pattern prevents credential leaks and maintains UX

---

### User Story 2 - Context Propagation (Priority: P1)

As a frontend developer, I need clear patterns for propagating organisation and project context through all API requests so that the UI state stays synchronized with backend expectations and users don't experience "wrong org/project" bugs.

**Why this priority**: Context drift (UI showing one org, API receiving another) is a critical bug class causing data leaks and user confusion. This must be solved early to prevent downstream products from implementing incompatible approaches.

**Independent Test**: Can be tested by implementing context providers and making multi-tenant API calls. Delivers consistent context handling that works independently and prevents context drift bugs.

**Acceptance Scenarios**:

1. **Given** a user selects an organisation, **When** any API request is made, **Then** the correct org ID is included in headers/params per documented convention
2. **Given** a user switches projects within an org, **When** subsequent API calls execute, **Then** all requests reflect the new project context without manual propagation
3. **Given** a page refresh or navigation, **When** context is restored, **Then** the guide's persistence pattern ensures UI and API context match
4. **Given** missing or invalid context, **When** an API request is attempted, **Then** the documented error handling prevents silent failures or wrong-tenant data access
5. **Given** multiple browser tabs with different contexts, **When** context changes in one tab, **Then** the documented isolation pattern prevents cross-tab contamination

---

### User Story 3 - Data Fetching Patterns (Priority: P1)

As a frontend developer, I need reference implementations for list→detail data fetching with proper loading, empty, error, and permission-denied states so that I can build consistent, resilient pages without duplicating requests or creating poor UX.

**Why this priority**: Fragmented state handling is causing duplicate API calls, inconsistent retry logic, and poor UX. Standardizing these patterns prevents technical debt and improves user experience across all downstream products.

**Independent Test**: Can be tested by implementing a list-detail page following the guide patterns. Delivers predictable page states, proper error handling, and efficient data fetching that works independently.

**Acceptance Scenarios**:

1. **Given** a list page loads, **When** fetching data, **Then** the documented loading pattern displays appropriate UI and prevents duplicate requests
2. **Given** an empty result set, **When** data loads, **Then** the guide's empty state pattern provides clear user feedback
3. **Given** a network error during list fetch, **When** retry logic executes, **Then** the documented retry pattern uses exponential backoff and user feedback
4. **Given** a user navigates to detail view, **When** the detail API call executes, **Then** optimistic navigation patterns (from guide) show immediate feedback while loading
5. **Given** insufficient permissions for a resource, **When** the API returns 403, **Then** the documented permission-denied pattern displays appropriate UI without exposing system details
6. **Given** paginated results, **When** users navigate pages, **Then** the guide's pagination pattern prevents data inconsistencies and maintains scroll position
7. **Given** stale data in cache, **When** the guide's cache policy is applied, **Then** data freshness is maintained without excessive re-fetching

---

### User Story 4 - Validation Script Execution (Priority: P2)

As a maintainer, I need automated validation scripts that verify documentation examples remain correct as APIs and components evolve so that teams can trust the guides won't lead them to broken implementations.

**Why this priority**: Without validation, guides become outdated and teams waste time debugging example code. Automation prevents documentation drift and maintains trust.

**Independent Test**: Can be tested by running validation scripts against example code. Delivers confidence that guides are current and functional.

**Acceptance Scenarios**:

1. **Given** guide example code, **When** TypeScript validation runs, **Then** all examples type-check successfully against current Core-App types
2. **Given** interface definitions in guides, **When** build validation runs, **Then** all interface contracts compile without errors
3. **Given** API examples, **When** schema validation runs (if available), **Then** request/response shapes match current OpenAPI/backend contracts
4. **Given** a breaking API change, **When** validation runs in CI, **Then** failed checks block deployment and alert maintainers
5. **Given** manual verification checklist items, **When** documentation updates occur, **Then** checklist is reviewed and updated

---

### User Story 5 - Anti-Pattern Awareness (Priority: P2)

As a frontend developer, I need explicit anti-patterns and common mistakes documented in each guide so that I can avoid known pitfalls and understand why certain approaches are wrong.

**Why this priority**: Teams repeatedly make the same mistakes (e.g., storing tokens in localStorage, ignoring 401/403 differences, context drift). Documenting anti-patterns prevents wasted time and security issues.

**Independent Test**: Can be tested by reviewing guides for anti-pattern sections and verifying they address observed pain points. Delivers proactive error prevention.

**Acceptance Scenarios**:

1. **Given** the authentication guide, **When** a developer reads the anti-patterns section, **Then** common security mistakes (token storage, CSRF bypass) are explicitly called out
2. **Given** the context propagation guide, **When** a developer reads anti-patterns, **Then** context drift scenarios and manual propagation mistakes are documented
3. **Given** the data fetching guide, **When** a developer reads anti-patterns, **Then** duplicate request patterns and improper error handling are identified
4. **Given** any guide, **When** a developer encounters an anti-pattern, **Then** the guide explains why it's wrong and what to do instead

---

### User Story 6 - Copy-Paste Readiness (Priority: P3)

As a frontend developer under time pressure, I need copy-paste ready checklists and code snippets so that I can quickly integrate Core-App patterns correctly without reading entire guides.

**Why this priority**: Developers often need quick references. Checklists reduce cognitive load and ensure nothing is forgotten during integration.

**Independent Test**: Can be tested by following a checklist without reading the full guide and verifying it produces correct integration. Delivers fast onboarding.

**Acceptance Scenarios**:

1. **Given** an authentication integration, **When** following the copy-paste checklist, **Then** all critical steps (CSRF, tokens, error handling) are completed
2. **Given** context setup, **When** following the checklist, **Then** context providers are configured correctly
3. **Given** a data fetching implementation, **When** following the checklist, **Then** loading/error/empty states are handled

---

### Edge Cases

- **Offline/intermittent connectivity**: How do retry patterns handle prolonged network failures? (Document exponential backoff limits and user feedback)
- **Concurrent context switches**: What happens when a user rapidly switches between orgs/projects? (Document debouncing and request cancellation patterns)
- **Partial API responses**: How should clients handle 206 or incomplete data? (Document partial state handling and retry logic)
- **Token refresh during requests**: How do patterns handle token expiry mid-request? (Document refresh-before-expiry and request retry patterns)
- **CORS and preflight failures**: How do guides address CORS issues? (Document CORS requirements and debugging steps)
- **Stale cache during API changes**: How do cache policies handle breaking changes? (Document cache invalidation strategies)
- **Multi-window context conflicts**: How do patterns handle multiple browser windows with different contexts? (Document storage isolation strategies)

## Clarifications

### Session 2025-12-14

- Q: Validation Script Scope - which checks are mandatory vs nice-to-have for initial release? → A: TypeScript type-checking + linting + build (mandatory); OpenAPI schema validation deferred until specs stable and available
- Q: Reference Stack Versions - what are the baseline version requirements for the reference stack? → A: TypeScript 5.x + React 18.x (matches F01-F08 packages)
- Q: Cache Policy Scope - what level of caching guidance should guides provide? → A: Interface + HTTP cache headers (Cache-Control, ETag, 304, revalidation patterns); optional minimal in-memory example as "reference only" appendix without dictating client-side cache implementation
- Q: Guide Maintenance Responsibility - who updates guides when Core-App changes? → A: Feature team making the change updates relevant guides immediately; CI validation failure enforces this and creates update ticket as fallback
- Q: Example Repository Structure - where should executable example code live for validation? → A: Separate `examples/integration-guides/` directory for clean separation from docs, easy TypeScript validation/build, and direct linking from Markdown without extraction

## Requirements

### Functional Requirements

**Documentation Structure:**

- **FR-001**: Guides MUST be organized in `docs/integration-guides/` with a clear README/index page linking to individual guides
- **FR-002**: Executable example code MUST live in `examples/integration-guides/` directory, separate from documentation, for clean separation and easy validation
- **FR-003**: Markdown guides MUST link directly to example files in `examples/integration-guides/` without requiring code extraction
- **FR-004**: Each guide MUST include: overview, prerequisites, step-by-step instructions, code examples (vanilla TS + React), anti-patterns section, copy-paste checklist
- **FR-005**: Guides MUST link to relevant Core-App modules (F01-F08, backend APIs) without duplicating their documentation
- **FR-006**: Examples MUST use neutral, domain-agnostic entities (e.g., "Resource", "Item", "Organization") without product-specific logic

**Authentication Guide (P1):**

- **FR-007**: Guide MUST cover login flow with CSRF protection, session/token handling, and secure credential storage patterns
- **FR-008**: Guide MUST document both 401 (unauthenticated) and 403 (forbidden) error handling patterns with appropriate UI responses
- **FR-009**: Guide MUST provide vanilla TypeScript + fetch implementation of authenticated requests
- **FR-010**: Guide MUST show React integration using F02 (Auth UI) components and patterns
- **FR-011**: Guide MUST define AuthProvider interface for teams to implement with their state management choice
- **FR-012**: Guide MUST document retry patterns for failed auth requests (network errors, token refresh)
- **FR-013**: Guide MUST include anti-patterns section covering: token storage vulnerabilities, CSRF bypass attempts, credential leakage in logs/URLs

**Context Propagation Guide (P1):**

- **FR-014**: Guide MUST document how org/project context is represented (headers, query params, request body) per Core-App conventions
- **FR-015**: Guide MUST provide ContextProvider interface pattern for maintaining current org/project state
- **FR-016**: Guide MUST show vanilla TypeScript implementation of context-aware API client
- **FR-017**: Guide MUST show React integration using F03 (Context Switcher) and context hooks
- **FR-018**: Guide MUST document context persistence patterns (localStorage, sessionStorage, cookies) with security considerations
- **FR-019**: Guide MUST document context validation and error handling for missing/invalid contexts
- **FR-020**: Guide MUST include anti-patterns section covering: context drift, manual propagation mistakes, storage conflicts, context leakage between users

**Data Fetching Guide (P1):**

- **FR-021**: Guide MUST document list→detail flow with proper state management (loading, success, error, empty)
- **FR-022**: Guide MUST provide ApiClient interface pattern with request/response typing
- **FR-023**: Guide MUST document pagination patterns consistent with Core-App API conventions (cursor vs offset)
- **FR-024**: Guide MUST show handling of loading, empty, error, and permission-denied states with appropriate UI feedback
- **FR-025**: Guide MUST document retry patterns with exponential backoff and user feedback
- **FR-026**: Guide MUST document optimistic updates and rollback patterns
- **FR-027**: Guide MUST define CachePolicy interface for teams to implement caching strategies
- **FR-028**: Guide MUST document HTTP cache header patterns (Cache-Control, ETag, 304 Not Modified, revalidation) for portable caching guidance
- **FR-029**: Guide MAY include optional minimal in-memory cache example as "reference only" appendix without prescribing specific client-side cache implementation
- **FR-030**: Guide MUST provide vanilla TypeScript fetch examples and React integration with F01 components (loading states, error displays)
- **FR-031**: Guide MUST include anti-patterns section covering: duplicate requests, improper error handling, cache inconsistencies, N+1 request patterns

**Validation & Maintenance (P2):**

- **FR-032**: Repository MUST include validation scripts that TypeScript-check all example code in `examples/integration-guides/` (mandatory)
- **FR-033**: Validation scripts MUST verify example code passes linting rules (mandatory)
- **FR-034**: Validation scripts MUST verify all examples build successfully without errors (mandatory)
- **FR-035**: OpenAPI/schema validation is deferred until Core-App backend specs are stable and available (nice-to-have for future releases)
- **FR-036**: Validation scripts MUST run in CI and block deployment on failures
- **FR-037**: CI validation failures MUST automatically create update tickets if guides are not updated by feature team
- **FR-038**: Feature teams MUST update relevant integration guides when making changes to Core-App APIs or frontend modules (F01-F08)
- **FR-039**: Guide repository MUST include manual verification checklist for aspects not automatable (e.g., auth flows, permission scenarios)
- **FR-040**: Guides MUST include "last validated" dates and script version references

**Reference Implementations:**

- **FR-041**: Repository MUST include minimal React Context reference implementations for AuthProvider, ContextProvider in `examples/integration-guides/`, clearly labeled "reference only"
- **FR-042**: Reference implementations MUST NOT enforce specific state management libraries
- **FR-043**: All code examples MUST be executable and validated by automated scripts (TypeScript type-check + lint + build)
- **FR-044**: All examples MUST use TypeScript 5.x and React 18.x baselines (matching F01-F08 frontend packages)

### Key Entities

**Note**: This is a documentation feature, so "entities" are conceptual patterns rather than data models.

- **AuthProvider**: Interface pattern for managing authentication state (user, tokens, login/logout methods)
- **ApiClient**: Interface pattern for making authenticated, context-aware HTTP requests
- **ContextProvider**: Interface pattern for managing and propagating org/project context
- **CachePolicy**: Interface pattern defining cache invalidation and freshness strategies
- **RequestState**: Type representing async operation states (idle, loading, success, error) with typed data/error payloads

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products (guides are framework-agnostic with portable patterns)
- [x] Extension points are clearly documented (interface patterns allow teams to implement with their tech choices)

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering (documentation references but doesn't duplicate F01-F08 and backend module docs)
- [x] No circular dependencies introduced (guides consume, don't modify, Core-App modules)
- [x] Extension points are stable and documented (interface patterns are versioned with guides)

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained (N/A - documentation feature)
- [x] Type hints will be used in core modules (TypeScript examples use strict typing)
- [x] Code will be formatted with Black and linted with Ruff (validation scripts use Prettier/ESLint for TS examples)

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests (N/A - documentation feature uses validation scripts instead)
- [x] Coverage targets defined (100% of example code must pass TypeScript/build validation)
- [x] Integration tests planned for key flows (manual verification checklist covers non-automatable scenarios)

### Security & Privacy (Principle V)
- [x] Secure defaults maintained (guides enforce CSRF protection, secure token storage, no credential leakage)
- [x] No secrets in code (examples use placeholders, guide warns against hardcoding)
- [x] Authentication/authorization handled through centralized mechanisms (guides reference F02 and Core-App auth patterns)
- [x] No sensitive data will be logged (anti-patterns section explicitly calls out logging vulnerabilities)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (data fetching guide documents pagination and efficient loading patterns)
- [x] Pagination implemented for unbounded responses (FR-021 requires pagination documentation)
- [x] Structured logging and metrics hooks included (guides reference observability patterns without prescribing implementation)
- [x] Graceful degradation strategy defined (error handling and retry patterns documented in all guides)

### API Design (Principle VII)
- [x] DRF standards followed (guides reference Core-App API conventions without redefining them)
- [x] API responses are consistent and documented (guides link to Core-App API baseline docs)
- [x] Breaking changes use versioning or deprecation paths (guides include versioning and "last validated" dates)
- [x] Validation occurs at boundary (examples show client-side validation before API calls)

### Documentation (Principle XI)
- [x] Feature documentation plan included (this spec defines complete documentation deliverables)
- [x] Extension guide updates identified (guides ARE the extension documentation for frontend integration)
- [x] ADR planned if major architectural decision involved (guides document interface patterns as architectural decisions)

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: Frontend developers can implement authentication integration in under 2 hours by following the guide (measured via onboarding feedback)
- **SC-002**: Context drift bugs (wrong org/project in API requests) are reduced by 80% in downstream products adopting the guide (measured via bug tracker analysis)
- **SC-003**: 90% of validation script checks pass on first run after guide updates (measured via CI results)
- **SC-004**: Teams report consistent 401/403 handling across products using the guides (measured via code review audits)
- **SC-005**: Duplicate API request patterns are eliminated in codebases following data fetching guide (measured via code analysis tools detecting request duplication)
- **SC-006**: Onboarding time for new frontend developers integrating with Core-App is reduced by 50% (measured via time-to-first-PR metrics)
- **SC-007**: Support tickets related to authentication, context, or data fetching integration issues decrease by 60% (measured via support ticket categorization)
