# Research: Multi-Tenancy Context Switcher
*Path: kitty-specs/024-multi-tenancy-context/research.md*

**Feature**: F03 Multi-Tenancy Context Switcher
**Date**: 2025-12-09
**Phase**: Phase 0 - Outline & Research

## Overview

This document consolidates research findings and architectural decisions made during planning for the context switcher implementation.

## Planning Questions & Decisions

### Q1: Package Structure & Composition Model

**Decision**: New standalone package `@django-core/context-switcher`

**Rationale**:
- F01 (design system) stays pure with no tenant/domain logic
- F03 is a feature-level package that depends on F01 and backend contracts (B06/B07/B08/B13)
- Better separation of concerns than embedding in design system or coupling to F06 layouts
- Allows independent versioning and deployment

**Alternatives Considered**:
- Extension of F01: Rejected because design system should remain generic, no business logic
- Part of F06 shell package: Rejected because context switching is reusable across different layouts
- Embedded in each consuming app: Rejected due to duplication and inconsistent UX

---

### Q2: State Management & Routing Integration

**Decision**: React Context + custom hooks with RouterAdapter prop

**Rationale**:
- Matches lightweight pattern from F02 (auth package)
- Keeps F03 router-agnostic: works with React Router, Next.js, Django-rendered templates
- No additional state library dependency (Zustand/Jotai) needed for this scope
- Adapter pattern provides flexibility without hard-coding router implementation

**Implementation**:
```typescript
type RouterAdapter = {
  getCurrentPath(): string;
  navigateTo(path: string): void;
  buildPathForContext(ctx: { orgSlug: string; projectSlug?: string }, options?: { preservePath?: boolean }): string;
};
```

**Alternatives Considered**:
- Zustand/Jotai: Rejected as overkill for single-feature state
- Direct React Router dependency: Rejected to maintain router-agnostic design
- Global state in F06: Rejected to keep F03 independent and reusable

---

### Q3: Backend API Integration & Error Handling

**Decision**: Extract shared `@django-core/api-client` package

**Rationale**:
- Prevents duplication between F02 and F03
- Establishes reusable pattern for future frontend features
- Small, focused, well-tested API client improves maintainability
- Framework-agnostic design (no auth/context-specific logic in shared client)

**Refactoring Impact**:
- F02 (`@django-core/auth`) will refactor to use shared api-client
- F03 will build context-specific endpoints on top of shared client
- Future packages can reuse without reinventing CSRF/error handling

**Alternatives Considered**:
- F03 reaches into F02 internals: Rejected due to tight coupling
- Duplicate fetch wrapper in F03: Rejected due to maintenance burden
- Third-party library (React Query, SWR): Rejected as over-engineering for current needs

---

### Q4: Search & Virtualization Implementation

**Decision**: Use `react-window` or `@tanstack/react-virtual` with custom debounce hook

**Rationale**:
- Virtualization required from start to meet perf spec (500+ items)
- `react-window` and `@tanstack/react-virtual` are battle-tested, lightweight, bundle-friendly
- Custom `useDebouncedValue` hook keeps implementation simple and testable
- No heavy data-fetching libraries (React Query/SWR) needed

**Implementation Details**:
- Debounce: 300ms, 3-character minimum before filtering/network calls
- Virtualization threshold: Apply when list exceeds 50-100 items
- All UI uses F01 components (SearchField, List, EmptyState)
- Full keyboard accessibility and screen-reader support maintained

**Alternatives Considered**:
- Defer virtualization: Rejected because perf requirements explicit in spec
- @tanstack/react-virtual over react-window: Either acceptable; choose based on bundle size analysis
- Build custom virtualization: Rejected as reinventing battle-tested solutions

---

### Q5: Keyboard Shortcuts & Global Event Management

**Decision**: Build custom `useKeyboardShortcut` hook

**Rationale**:
- Small, focused hook (~30-50 LOC) easier to maintain than external library
- Configurable and disable-able via props (host app can override/turn off)
- No external keyboard library needed (react-hotkeys-hook adds unnecessary weight)
- If F06 introduces central shortcut manager later, hook can delegate to it

**Implementation Details**:
- Default shortcut: Ctrl/Cmd+K (cross-platform)
- Respects input focus contexts (ignores when typing in input/textarea)
- Cleans up event listeners on unmount
- Configurable via `<ContextSwitcherProvider shortcut="..." disableShortcut={bool} />`

**Alternatives Considered**:
- react-hotkeys-hook library: Rejected as overkill for single shortcut
- Central shortcut manager in F06: Deferred to future; F03 stays self-contained for now
- No keyboard shortcuts: Rejected because spec explicitly requires this for power users

---

## Technology Stack Summary

| Category | Technology | Justification |
|----------|------------|---------------|
| **UI Framework** | React 18.x | Existing stack, hooks-based, concurrent features |
| **Type System** | TypeScript 5.x strict mode | Type safety, developer experience, spec requirement |
| **Design System** | F01 (`@django-core/design-system`) | Consistent UI, zero custom CSS constraint |
| **State Management** | React Context + hooks | Lightweight, sufficient for scope, matches F02 pattern |
| **Routing** | Adapter pattern (no hard dependency) | Works with React Router, Next.js, Django templates |
| **API Client** | New shared `@django-core/api-client` | CSRF-protected fetch, error normalization, reusable |
| **Virtualization** | `react-window` or `@tanstack/react-virtual` | Battle-tested, lightweight, meets perf requirements |
| **Testing** | Jest + React Testing Library + MSW + axe-core | Unit, integration, API mocking, accessibility |
| **Build Tool** | Vite | Fast, modern, consistent with F01/F02 |
| **Linting** | ESLint + Prettier | Code quality, consistency with existing packages |

---

## Key Integration Points

### F01 Design System Components Used

- **Button** - Open picker, select org/project
- **Dropdown/Popover** - Desktop picker UI
- **Modal/Sheet** - Mobile full-screen picker
- **List/ListItem** - Org/project list display
- **SearchField** - Search/filter input
- **Typography** - Org/project names, labels
- **Avatar/Badge** - Org logos (optional)
- **EmptyState** - No orgs/projects, no search results
- **ErrorBanner** - API failures, auth errors
- **Spinner/LoadingState** - Data fetching

### B13 API Endpoints Expected

```
GET /api/organisations/
  → List of organisations user has access to
  Response: { organisations: [ { id, name, slug, logo?, metadata? } ] }

GET /api/organisations/{org_id}/projects/
  → List of projects in organisation
  Response: { projects: [ { id, name, slug, orgId, metadata? } ] }

GET /api/context/current/
  → User's current/default context (optional endpoint)
  Response: { organisationId?, projectId? }

POST /api/context/set/
  → Set user's current context (optional endpoint for server-side memory)
  Body: { organisationId, projectId? }
  Response: { success: true }
```

All endpoints must:
- Follow B13 API baseline (JSON envelopes, error format)
- Enforce B08 authorization (only return accessible orgs/projects)
- Handle CSRF tokens via Django middleware

---

## Performance Considerations

### Metrics & Targets

- **Context switch time**: <5 seconds (95th percentile, from click to new page loaded)
- **Search filter latency**: 300ms debounce, <100ms local filter
- **List render performance**: 60fps scrolling for 500+ items (virtualization)
- **Bundle size**: <50KB gzipped (including react-window, excluding React/F01)
- **Initial load**: Context data fetched in <2 seconds (network dependent)

### Optimization Strategies

1. **Virtualized Lists**: Only render visible items (50-100 item buffer)
2. **Debounced Search**: Reduce filter/network calls, improve responsiveness
3. **Memoization**: `useMemo` for filtered lists, `useCallback` for event handlers
4. **Lazy Loading**: Code-split mobile picker modal
5. **Context Memory**: Remember last-visited project per org (reduce navigation friction)

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

- **Keyboard Navigation**: Tab, Enter, Escape, Arrow keys functional
- **Screen Reader**: All interactive elements labeled, context announced
- **Color Contrast**: All text meets 4.5:1 minimum (enforced by F01)
- **Focus Management**: Clear focus indicators, logical tab order
- **ARIA**: Proper roles (combobox, listbox, option), live regions for dynamic updates

### Testing Strategy

- **Automated**: axe-core in Jest tests (zero violations gate)
- **Manual**: Keyboard-only navigation, screen reader testing (NVDA, JAWS, VoiceOver)
- **Integration**: Verify with F01 components (Button, Dropdown, List already a11y-compliant)

---

## Security Considerations

### Trust Boundaries

- **Backend is source of truth**: All authorization decisions in B08
- **Frontend never enforces access**: Only displays what backend allows
- **URL validation**: Backend validates org/project IDs on every request
- **CSRF Protection**: All API calls use shared api-client with CSRF tokens

### Error Handling

- **401 Unauthorized**: Redirect to login (auth session expired)
- **403 Forbidden**: Show "No Access" error, navigate to safe fallback
- **404 Not Found**: Org/project deleted or revoked, show error with fallback link
- **500 Server Error**: Show retry action, log error context

### Data Minimization

- **No sensitive data in localStorage**: Only org/project IDs and names (public within user's access)
- **No aggressive caching**: Fresh data on context switch to avoid stale authorization
- **Logging**: Only IDs and names logged, no PII

---

## Open Questions & Future Enhancements

### Deferred to Future

- **Quick-switch shortcuts**: Keyboard shortcuts to cycle recent orgs (beyond Ctrl+K to open picker)
- **Pinned/favorite orgs**: Backend support for user-pinned organisations
- **Org/project search API**: Server-side search if lists grow beyond 1000+ items
- **Cross-org analytics**: Dashboard showing data across multiple contexts (explicitly non-goal)
- **Offline support**: Complex sync logic deferred (network-dependent for now)

### Assumptions Requiring Backend Validation

- B13 APIs return org/project lists without pagination (virtualization handles client-side)
- "Current context" endpoint exists (optional; graceful fallback if not implemented)
- Backend provides org/project slugs suitable for URL routing (e.g. `acme-corp`, `website-redesign`)
- Backend ensures unique slugs per org/project (no collision handling needed)

---

## Next Steps

- **Phase 1**: Generate data-model.md (TypeScript types for Context, Organisation, Project)
- **Phase 1**: Generate API contracts (OpenAPI/TypeScript interfaces for B13 endpoints)
- **Phase 1**: Generate quickstart.md (integration guide for host apps)
- **Phase 1**: Update Copilot context with new packages and dependencies
- **Phase 2**: Break down into work packages (WP01-WP12) via `/spec-kitty.tasks`
