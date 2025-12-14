---
work_package_id: "WP02"
subtasks:
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
  - "T015"
title: "Authentication Guide & Examples"
phase: "Phase 2 - Core Guides"
lane: "done"
assignee: "GitHub Copilot"
agent: "github-copilot-reviewer"
shell_pid: "36848"
review_status: "approved without changes"
reviewed_by: "github-copilot-reviewer"
history:
  - timestamp: "2025-12-14T08:32:00Z"
    event: "workflow_init"
    note: "Moved WP02 to doing lane, initialized task execution"
  - timestamp: "2025-12-14T09:15:00Z"
    event: "implementation_complete"
    note: "All 7 subtasks completed: docs/integration-guides/auth-api.md (400+ lines), examples/auth-example/vanilla.ts (framework-agnostic), examples/auth-example/react.tsx (React wrapper), all validations passing (type-check + lint), moved to for_review"
  - timestamp: "2025-12-14T10:30:00Z"
    event: "code_review_complete"
    lane: "done"
    agent: "github-copilot-reviewer"
    shell_pid: "36848"
    note: "✅ Review passed: All requirements met (5 anti-patterns, CSRF protection in all examples, type-check + lint passing, comprehensive guide with checklist)"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-14T10:00:00Z"
    lane: "doing"
    agent: "copilot"
    shell_pid: "36848"
    action: "Started implementation"
---

# Work Package Prompt: WP02 – Authentication Guide & Examples

## Objectives & Success Criteria

Deliver comprehensive authentication integration guide covering login/logout flows, CSRF protection, session management, and 401/403 error handling. Includes vanilla TypeScript and React reference implementations demonstrating AuthProvider pattern.

**Success Metrics**:
- Guide covers all FR-007 to FR-013 requirements from spec
- Examples compile and type-check successfully
- Examples demonstrate CSRF protection with concrete code
- Anti-patterns section includes at least 5 concrete examples
- Guide includes copy-paste checklist
- Can follow guide to implement working auth without external documentation

---

## Context & Constraints

**Prerequisites**: WP01 (requires AuthProvider interface and package structure)

**Related Documents**:
- Spec: FR-007 to FR-013 (authentication requirements)
- Data Model: AuthProvider entity definition
- Research: D4 (interface patterns), AP-1 to AP-4 (auth anti-patterns)

**Architectural Constraints**:
- Must document both meta tag and cookie approaches for CSRF tokens
- Must use httpOnly cookies for token storage (anti-pattern: localStorage)
- Examples must work with Core-App backend (B05 authentication module)
- React example should integrate with F02 Auth UI components

---

## Subtasks & Detailed Guidance

### T009: Create docs/integration-guides/auth-api.md (guide structure + overview)

**Purpose**: Establish guide foundation with clear structure and navigation.

**Steps**:
1. Create file with sections: Overview, Prerequisites, Login Flow, Logout Flow, Error Handling, Retry Patterns, Token Refresh, Anti-Patterns, Checklist
2. Write Overview: What this guide covers, who should use it, related guides (Context, Data Fetching)
3. Write Prerequisites: Required backend setup (B05 auth), frontend deps (React 18.x, TypeScript 5.x)

**Files**: `docs/integration-guides/auth-api.md`

---

### T010: Document login/logout flows with CSRF protection

**Purpose**: Show complete auth flows with security best practices.

**Steps**:
1. Document login flow:
   - Extract CSRF token from meta tag: `<meta name="csrf-token" content="...">`
   - Or from cookie: `document.cookie`
   - Make POST /api/auth/login with credentials + X-CSRFToken header
   - Handle response (set session cookie httpOnly, return user)
2. Document logout flow:
   - POST /api/auth/logout with CSRF token
   - Clear local user state immediately (optimistic)
   - Handle errors gracefully
3. Provide code snippets for both vanilla JS and React

**Files**: `docs/integration-guides/auth-api.md`

---

### T011: Document 401/403 error handling patterns

**Purpose**: Distinguish unauthenticated vs forbidden scenarios.

**Steps**:
1. Explain 401 (Unauthenticated):
   - Session expired or missing
   - Action: Redirect to login, clear user state
   - Show retry pattern: attempt token refresh first, then redirect
2. Explain 403 (Forbidden):
   - User authenticated but lacks permission
   - Action: Show permission denied UI, don't redirect
   - Log permission check for observability
3. Provide error handling code examples

**Files**: `docs/integration-guides/auth-api.md`

---

### T012: Document retry patterns + token refresh

**Purpose**: Handle transient failures and token expiry gracefully.

**Steps**:
1. Document refresh pattern:
   - Detect token expiry before it happens (expiry timestamp in token)
   - Proactively refresh in background
   - Retry failed request after successful refresh
2. Document retry logic for network errors:
   - Exponential backoff (1s, 2s, 4s, max 3 retries)
   - Don't retry 4xx errors (except 401 for refresh attempt)
   - Show abort controller for user-initiated cancellation
3. Provide code examples

**Files**: `docs/integration-guides/auth-api.md`

---

### T013: Create examples/auth-example/ vanilla TypeScript implementation

**Purpose**: Provide reference implementation without framework coupling.

**Steps**:
1. Create `examples/integration-guides/auth-example/vanilla.ts`
2. Implement AuthProvider interface:
   - State stored in memory (user object, loading flag)
   - login(): fetch POST with CSRF token from meta tag
   - logout(): fetch POST, clear state
   - refresh(): fetch GET /api/auth/session
   - hasPermission(): check user.permissions array
3. Implement CSRF token extraction helper
4. Export factory function: `createAuthProvider()`

**Files**: `examples/integration-guides/auth-example/vanilla.ts`

**Notes**: Must compile with TypeScript strict mode, no React dependencies

---

### T014: Create examples/auth-example/ React Context implementation

**Purpose**: Show React-specific integration wrapping vanilla implementation.

**Steps**:
1. Create `examples/integration-guides/auth-example/react.tsx`
2. Implement:
   - AuthContext using React.createContext
   - AuthProvider component wrapping vanilla implementation
   - useAuth hook returning AuthProvider interface
   - Show integration with React Router for protected routes
3. Provide usage example component

**Files**: `examples/integration-guides/auth-example/react.tsx`

**Notes**: Can import and wrap vanilla.ts implementation to avoid duplication

---

### T015: Document anti-patterns (token storage, credential leakage)

**Purpose**: Prevent common security mistakes.

**Steps**:
1. Document anti-patterns with "Why it's wrong" + "Do this instead":
   - ❌ Storing tokens in localStorage (XSS vulnerability) → ✅ Use httpOnly cookies
   - ❌ Bypassing CSRF protection ("it's just a test") → ✅ Always include CSRF token
   - ❌ Logging credentials or tokens → ✅ Redact in logging utilities
   - ❌ Not distinguishing 401 vs 403 → ✅ Handle separately
   - ❌ Exposing sensitive error details to users → ✅ Generic messages, log details server-side
2. Provide code examples for each

**Files**: `docs/integration-guides/auth-api.md` (Anti-Patterns section)

---

## Definition of Done Checklist

- [ ] Guide covers all sections (Overview, Login, Logout, Errors, Retry, Refresh, Anti-Patterns, Checklist)
- [ ] Code examples compile: `pnpm --filter @django-core/integration-guides-examples type-check`
- [ ] Examples lint cleanly: `pnpm --filter @django-core/integration-guides-examples lint`
- [ ] CSRF protection demonstrated in vanilla and React examples
- [ ] Anti-patterns section has 5+ examples
- [ ] Copy-paste checklist included at end of guide
- [ ] Guide links to AuthProvider contract definition
- [ ] `tasks.md` updated: WP02 subtasks marked complete

---

## Review Guidance

**Key Checkpoints**:
1. Security: Verify CSRF token injection shown in all mutating requests
2. Error Handling: Confirm 401/403 distinction is clear
3. Examples: Run type-check and lint on auth-example files
4. Completeness: All FR-007 to FR-013 requirements addressed

---

## Activity Log

- 2025-12-14T08:32:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-14T08:54:00Z – copilot – shell_pid=36848 – lane=done – Approved and moved to done lane
