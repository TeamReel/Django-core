---
description: "Work package task list for Multi-Tenancy Context Switcher implementation"
---
*Path: kitty-specs/024-multi-tenancy-context/tasks.md*

# Work Packages: Multi-Tenancy Context Switcher

**Feature**: F03 Multi-Tenancy Context Switcher
**Branch**: `024-multi-tenancy-context`
**Inputs**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api-contracts.md](contracts/api-contracts.md), [quickstart.md](quickstart.md)

**Tests**: Unit, integration, and accessibility tests included (spec requires 90%+ coverage)

**Organization**: 12 work packages (WP01-WP12) covering shared API client, core context logic, UI components, search/virtualization, keyboard shortcuts, testing, and documentation.

**Constitutional Compliance**: All tasks align with Django Core-App Constitution principles (frontend adaptations: TypeScript vs Python, Jest vs pytest, Prettier vs Black, ESLint vs Ruff).

---

## Subtask Format: `[Txxx] [P?] Description`
- **[P]** indicates the subtask can proceed in parallel (different files/components).
- Precise file paths relative to `packages/` directory.

## Path Conventions
- **Frontend packages**: `packages/api-client/`, `packages/context-switcher/`, `packages/auth/`
- **Tests**: `packages/context-switcher/__tests__/`

---

## Work Package WP01: Shared API Client Package Setup (Priority: P0)

**Goal**: Create standalone `@django-core/api-client` package with CSRF-protected fetch wrapper and B13 error normalization, establishing reusable pattern for all frontend packages.

**Independent Test**: Package builds successfully, exports API client with CSRF handling, normalizes B13 error responses, passes unit tests with 90%+ coverage.

**Prompt**: `tasks/planned/WP01-shared-api-client-setup.md`

### Included Subtasks
- [ ] T001 Create package structure at `packages/api-client/` with package.json, tsconfig.json, vite.config.ts
- [ ] T002 [P] Configure TypeScript strict mode, ESLint, Prettier matching F01/F02 patterns
- [ ] T003 [P] Setup Jest + @testing-library configuration for unit tests
- [ ] T004 [P] Create `src/types.ts` with ApiClientConfig, RequestOptions, ApiResponse, ApiError types
- [ ] T005 Implement CSRF token extractor in `src/csrfToken.ts` (read from cookie, return string)
- [ ] T006 Implement fetch wrapper in `src/client.ts` with CSRF injection, JSON envelope handling, error mapping
- [ ] T007 Implement B13 error normalizer in `src/errorNormalizer.ts` (parse error envelope, extract user message)
- [ ] T008 Create public API exports in `src/index.ts`
- [ ] T009 [P] Write unit tests for CSRF token extraction (mock document.cookie)
- [ ] T010 [P] Write unit tests for fetch wrapper (mock global fetch, verify CSRF header)
- [ ] T011 [P] Write unit tests for error normalizer (401/403/404/500 scenarios)
- [ ] T012 Create package README with usage examples, API reference
- [ ] T013 Verify bundle size <10KB gzipped (excluding dependencies)

### Constitutional Alignment
- Principle II (Architecture): Reusable, single-purpose package (CSRF + error handling)
- Principle III (Code Quality): TypeScript strict mode, ESLint, Prettier
- Principle IV (Testing): 90%+ coverage, deterministic unit tests
- Principle V (Security): CSRF protection, no secrets in code, safe error messages
- Principle XI (Documentation): README with clear usage examples

### Implementation Notes
- CSRF token extraction: Parse `csrftoken` cookie, handle missing token gracefully
- Fetch wrapper: Inject `X-CSRFToken` header on POST/PUT/PATCH/DELETE, preserve existing headers
- Error normalizer: Extract `error.message` from B13 envelope, fallback to generic message for unknown formats
- Export types, functions, and createApiClient factory function

### Parallel Opportunities
- T002 (tooling config), T003 (test setup), T004 (types) can proceed in parallel
- T009-T011 (unit tests) can be written in parallel once implementation exists

### Dependencies
- None (foundational package)

### Risks & Mitigations
- CSRF token missing → Graceful error with actionable message: "CSRF token not found. Ensure backend sets csrftoken cookie."
- Fetch polyfill needed → Document browser compatibility (modern browsers only, no IE11)
- Bundle size creep → Use tree-shaking, avoid heavy dependencies

---

## Work Package WP02: F02 Refactoring to Use Shared API Client (Priority: P0)

**Goal**: Refactor `@django-core/auth` (F02) to use new shared `@django-core/api-client`, removing duplication and validating shared package works in production.

**Independent Test**: F02 auth package builds, all existing tests pass, bundle size unchanged or reduced, F02 continues to work in host apps.

**Prompt**: `tasks/planned/WP02-f02-api-client-refactor.md`

### Included Subtasks
- [ ] T014 Add `@django-core/api-client` dependency to `packages/auth/package.json`
- [ ] T015 Remove `packages/auth/src/lib/apiClient.ts` (replaced by shared package)
- [ ] T016 Remove `packages/auth/src/lib/errorNormalizer.ts` (replaced by shared package)
- [ ] T017 Update imports in `packages/auth/src/` to use `@django-core/api-client`
- [ ] T018 Run F02 test suite, verify all tests pass with shared api-client
- [ ] T019 Run F02 integration tests against real backend (if available), verify CSRF/auth still works
- [ ] T020 Update F02 README to reference shared api-client package
- [ ] T021 Verify F02 bundle size unchanged or reduced

### Constitutional Alignment
- Principle II (Architecture): DRY principle, eliminate duplication
- Principle III (Code Quality): Code cleanup, remove dead code
- Principle IV (Testing): Existing test coverage maintained
- Principle XI (Documentation): README updated with shared package reference

### Implementation Notes
- Search for all imports of old apiClient/errorNormalizer, replace with shared package
- Verify no breaking changes to F02 public API
- If integration tests fail, debug CSRF token handling (may need to sync cookies across domains)
- Bundle size should decrease (shared code deduped by bundler)

### Parallel Opportunities
- None (sequential refactoring)

### Dependencies
- Depends on WP01 (shared api-client must be complete)

### Risks & Mitigations
- Breaking changes to F02 → Comprehensive test suite run before/after
- CSRF token domain mismatch → Document cookie domain requirements for shared api-client
- Bundle size increase → Tree-shaking verification, compare before/after

---

## Work Package WP03: Context Provider & Core State Management (Priority: P1)

**Goal**: Implement React Context provider, core hooks, and state management for multi-tenancy context switching.

**Independent Test**: Provider mounts without errors, `useCurrentContext` returns context from URL, `useContextSwitcher` switches context and updates URL, context memory persists last-visited project.

**Prompt**: `tasks/planned/WP03-context-provider-state.md`

### Included Subtasks
- [ ] T022 Create package structure at `packages/context-switcher/` with package.json, tsconfig.json, vite.config.ts
- [ ] T023 [P] Configure TypeScript strict mode, ESLint, Prettier matching F01/F02 patterns
- [ ] T024 [P] Setup Jest + React Testing Library + MSW for tests
- [ ] T025 [P] Create types in `src/types/index.ts` (re-export from data-model.md)
- [ ] T026 Create RouterAdapter interface in `src/types/router.ts`
- [ ] T027 Create ContextSwitcherConfig type in `src/types/config.ts`
- [ ] T028 Create ContextSwitcherContext in `src/context/ContextSwitcherContext.ts` (React.createContext)
- [ ] T029 Implement ContextSwitcherProvider in `src/context/ContextSwitcherProvider.tsx` (initialize state, expose context)
- [ ] T030 Implement useCurrentContext hook in `src/hooks/useCurrentContext.ts` (read context, refresh function)
- [ ] T031 Implement useContextSwitcher hook in `src/hooks/useContextSwitcher.ts` (switchContext, switchProject, isSwitching state)
- [ ] T032 Implement context memory utility in `src/utils/contextMemory.ts` (localStorage wrapper, last-visited project tracking)
- [ ] T033 [P] Write unit tests for ContextSwitcherProvider (mount, unmount, state updates)
- [ ] T034 [P] Write unit tests for useCurrentContext (returns context, refresh triggers refetch)
- [ ] T035 [P] Write unit tests for useContextSwitcher (switchContext updates state, calls routerAdapter.navigateTo)
- [ ] T036 [P] Write unit tests for contextMemory (read/write localStorage, handle missing data)

### Constitutional Alignment
- Principle II (Architecture): Clear separation of concerns (context, hooks, utilities)
- Principle III (Code Quality): TypeScript strict mode, readable code
- Principle IV (Testing): 90%+ coverage, deterministic tests with mocked localStorage
- Principle VI (Reliability): Graceful degradation if localStorage unavailable

### Implementation Notes
- ContextSwitcherProvider: Initialize from URL context, manage loading/error states, provide context value
- useCurrentContext: Simple hook to access context from ContextSwitcherContext
- useContextSwitcher: Implement onBeforeContextChange callback, update context state, trigger navigation
- Context memory: Use `@django-core/context-switcher:memory` key, validate schema version, invalidate if user changes
- All hooks must throw if used outside ContextSwitcherProvider (helpful error message)

### Parallel Opportunities
- T023-T027 (setup and types) can proceed in parallel
- T033-T036 (unit tests) can be written in parallel once implementation exists

### Dependencies
- Depends on WP01 (will integrate api-client in WP05 for backend calls)

### Risks & Mitigations
- Context initialization race conditions → Use useEffect with proper dependency array
- localStorage quota exceeded → Catch QuotaExceededError, fallback to memory-only
- Provider re-renders → Use useMemo/useCallback to stabilize context value

---

## Work Package WP04: Backend API Integration (Priority: P1)

**Goal**: Implement API client functions for fetching organisations, projects, and current context from backend B13 endpoints.

**Independent Test**: API functions fetch data from mocked MSW endpoints, handle 401/403/404/500 errors gracefully, normalize B13 error responses.

**Prompt**: `tasks/planned/WP04-backend-api-integration.md`

### Included Subtasks
- [ ] T037 Create API client in `src/api/organisationsApi.ts` (fetchOrganisations function)
- [ ] T038 Create API client in `src/api/projectsApi.ts` (fetchProjects function)
- [ ] T039 Create API client in `src/api/contextApi.ts` (fetchCurrentContext, setCurrentContext functions)
- [ ] T040 Integrate `@django-core/api-client` for CSRF-protected requests
- [ ] T041 [P] Setup MSW handlers in `__tests__/mocks/handlers.ts` (mock /api/organisations/, /api/organisations/{id}/projects/)
- [ ] T042 [P] Write unit tests for fetchOrganisations (success, 401, 403, 500, network error)
- [ ] T043 [P] Write unit tests for fetchProjects (success, 403, 404, network error)
- [ ] T044 [P] Write unit tests for fetchCurrentContext/setCurrentContext (success, error scenarios)
- [ ] T045 Update ContextSwitcherProvider to call fetchOrganisations on mount
- [ ] T046 Update ContextSwitcherProvider to call fetchProjects when org context changes
- [ ] T047 Update ContextSwitcherProvider to call fetchCurrentContext if backend provides endpoint
- [ ] T048 Update useContextSwitcher to call setCurrentContext after successful switch (if backend endpoint available)

### Constitutional Alignment
- Principle II (Architecture): API layer separated from UI components
- Principle IV (Testing): MSW for deterministic API testing, 90%+ coverage
- Principle V (Security): All auth decisions deferred to backend, CSRF tokens used
- Principle VI (Reliability): Graceful error handling, retry actions for network failures

### Implementation Notes
- All API functions use shared api-client for CSRF handling
- fetchOrganisations: GET /api/organisations/, return Organisation[]
- fetchProjects: GET /api/organisations/{orgId}/projects/, return Project[]
- fetchCurrentContext: GET /api/context/current/, return { organisationId?, projectId? }
- setCurrentContext: POST /api/context/set/, body: { organisationId, projectId? }
- MSW handlers return realistic B13-compliant JSON responses
- Error handling: 401 → throw AuthError (trigger login redirect), 403/404 → throw ContextError (show safe message), 500/network → throw ApiError (show retry action)

### Parallel Opportunities
- T037-T039 (API functions) can be written in parallel
- T041-T044 (tests) can be written in parallel once MSW setup exists

### Dependencies
- Depends on WP01 (shared api-client)
- Depends on WP03 (context provider exists to integrate API calls)

### Risks & Mitigations
- Backend API changes → Freeze contract with backend team, version API endpoints
- CORS issues in local dev → Document CORS configuration for Django backend
- Rate limiting → Implement exponential backoff for retries (defer to future if not required for MVP)

---

## Work Package WP05: Context Indicator Component (Priority: P1)

**Goal**: Implement always-visible context indicator component showing current organisation and project, using 100% F01 design system components.

**Independent Test**: Component renders org/project names, truncates long names with ellipsis, shows loading/error states, accessible via keyboard/screen reader.

**Prompt**: `tasks/planned/WP05-context-indicator-component.md`

### Included Subtasks
- [ ] T049 Create ContextIndicator component in `src/components/ContextIndicator.tsx`
- [ ] T050 Integrate F01 Typography component for org/project names
- [ ] T051 Integrate F01 Skeleton component for loading state
- [ ] T052 Integrate F01 ErrorBanner component for error state
- [ ] T053 Implement text truncation with CSS (ellipsis, max-width, hover shows full name)
- [ ] T054 Add ARIA labels for screen reader support (aria-label, role="status")
- [ ] T055 [P] Write unit tests for ContextIndicator (renders org name, renders org+project, loading state, error state)
- [ ] T056 [P] Write accessibility tests with axe-core (keyboard navigation, screen reader labels)
- [ ] T057 Create Storybook story for ContextIndicator (all variants: org-only, org+project, loading, error)

### Constitutional Alignment
- Principle II (Architecture): Presentational component, depends on F01 only
- Principle III (Code Quality): Zero custom CSS (100% F01 tokens)
- Principle IV (Testing): Unit + accessibility tests, 90%+ coverage
- Principle VII (UX): Clear, always-visible context indicator

### Implementation Notes
- Component receives context via useCurrentContext hook
- Use F01 Typography with variant="body" for names, variant="caption" for labels
- Truncation: `max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
- Hover: Show full name in F01 Tooltip (or title attribute as fallback)
- Loading state: Skeleton shimmer effect using F01 Skeleton component
- Error state: Inline ErrorBanner with retry action (calls refresh from useCurrentContext)
- Responsive: On mobile, allow indicator to wrap to two lines if needed

### Parallel Opportunities
- T055-T057 (tests and storybook) can proceed once component exists

### Dependencies
- Depends on WP03 (useCurrentContext hook)
- Depends on F01 design system (Typography, Skeleton, ErrorBanner)

### Risks & Mitigations
- Long names break layout → Use fixed max-width, test with 100+ character names
- Tooltip not accessible → Use F01 Tooltip component with proper ARIA attributes
- Color contrast fails WCAG → Use F01 color tokens (already compliant)

---

## Work Package WP06: Organisation Picker Component (Priority: P1)

**Goal**: Implement organisation picker UI (dropdown/modal) with search, list rendering, and selection handling.

**Independent Test**: Picker opens on click, lists organisations from API, filters on search input (300ms debounce, 3-char min), handles selection, accessible via keyboard.

**Prompt**: `tasks/planned/WP06-organisation-picker-component.md`

### Included Subtasks
- [ ] T058 Create OrganisationPicker component in `src/components/OrganisationPicker.tsx`
- [ ] T059 Integrate F01 Dropdown component for desktop (popover positioning)
- [ ] T060 Integrate F01 Modal component for mobile (full-screen sheet)
- [ ] T061 Integrate F01 SearchField component for search input
- [ ] T062 Integrate F01 List/ListItem components for org list
- [ ] T063 Integrate F01 EmptyState component for "No organisations" / "No search results"
- [ ] T064 Implement search filter logic (case-insensitive substring match on name and slug)
- [ ] T065 Integrate useDebouncedValue hook for 300ms debounce, 3-char minimum (implement in WP09)
- [ ] T066 Handle organisation selection (call useContextSwitcher.switchContext)
- [ ] T067 Add keyboard navigation (ArrowUp/Down, Enter, Escape)
- [ ] T068 Add ARIA attributes (role="listbox", aria-activedescendant, aria-labelledby)
- [ ] T069 [P] Write unit tests (opens on trigger, renders org list, search filters, selection calls switchContext)
- [ ] T070 [P] Write accessibility tests (axe-core, keyboard-only navigation)
- [ ] T071 Create Storybook story (empty state, few orgs, 100+ orgs, loading, error)

### Constitutional Alignment
- Principle III (Code Quality): Zero custom CSS, 100% F01 components
- Principle IV (Testing): Unit + integration + accessibility tests
- Principle VI (Performance): Debounced search, efficient re-renders
- Principle VII (UX): Clear search, keyboard shortcuts, mobile-friendly

### Implementation Notes
- Desktop: Use F01 Dropdown with Button trigger, position below context indicator
- Mobile: Use F01 Modal with full-screen sheet, close button in header
- Search: Real-time filter, no backend calls (all orgs fetched upfront)
- List: Render all items (virtualization added in WP09 if needed)
- Selection: Close picker, call useContextSwitcher.switchContext(org)
- Keyboard: Trap focus inside picker, ArrowUp/Down navigate list, Enter selects, Escape closes
- Loading state: Show F01 Spinner if organisations still fetching
- Error state: Show F01 ErrorBanner with retry action

### Parallel Opportunities
- T069-T071 (tests and storybook) can proceed once component exists

### Dependencies
- Depends on WP03 (useContextSwitcher hook)
- Depends on WP04 (organisations list from API)
- Depends on WP09 (useDebouncedValue hook)
- Depends on F01 (Dropdown, Modal, SearchField, List, EmptyState)

### Risks & Mitigations
- 500+ orgs lag on render → Implement virtualization in WP09 before shipping
- Search input loses focus → Use autofocus on modal open, maintain focus in Dropdown
- Mobile keyboard covers picker → Use Modal with auto-scroll to keep search visible

---

## Work Package WP07: Project Picker Component (Priority: P2)

**Goal**: Implement project picker UI (dropdown/modal) with search, list rendering, and selection handling.

**Independent Test**: Picker opens on click, lists projects for current org, filters on search, handles selection, accessible via keyboard.

**Prompt**: `tasks/planned/WP07-project-picker-component.md`

### Included Subtasks
- [ ] T072 Create ProjectPicker component in `src/components/ProjectPicker.tsx`
- [ ] T073 Integrate F01 Dropdown component for desktop
- [ ] T074 Integrate F01 Modal component for mobile
- [ ] T075 Integrate F01 SearchField component for search input
- [ ] T076 Integrate F01 List/ListItem components for project list
- [ ] T077 Integrate F01 EmptyState component for "No projects" / "No search results"
- [ ] T078 Implement search filter logic (case-insensitive substring match on name and slug)
- [ ] T079 Integrate useDebouncedValue hook for 300ms debounce, 3-char minimum
- [ ] T080 Handle project selection (call useContextSwitcher.switchProject)
- [ ] T081 Add keyboard navigation (ArrowUp/Down, Enter, Escape)
- [ ] T082 Add ARIA attributes (role="listbox", aria-activedescendant, aria-labelledby)
- [ ] T083 [P] Write unit tests (opens on trigger, renders project list, search filters, selection calls switchProject)
- [ ] T084 [P] Write accessibility tests (axe-core, keyboard-only navigation)
- [ ] T085 Create Storybook story (empty state, few projects, 100+ projects, loading, error)

### Constitutional Alignment
- Principle III (Code Quality): Zero custom CSS, 100% F01 components
- Principle IV (Testing): Unit + integration + accessibility tests
- Principle VI (Performance): Debounced search, efficient re-renders
- Principle VII (UX): Consistent with OrganisationPicker, keyboard shortcuts

### Implementation Notes
- Identical implementation pattern to OrganisationPicker (WP06)
- Desktop: F01 Dropdown, mobile: F01 Modal
- Search: Real-time filter, no backend calls (all projects for current org fetched)
- List: Render all items (virtualization added in WP09 if needed)
- Selection: Close picker, call useContextSwitcher.switchProject(project)
- If no org selected, picker should be disabled or show "Select an organisation first" message
- Show archived projects grayed out (metadata.isArchived = true), optionally filter by default

### Parallel Opportunities
- T083-T085 (tests and storybook) can proceed once component exists

### Dependencies
- Depends on WP03 (useContextSwitcher hook)
- Depends on WP04 (projects list from API)
- Depends on WP09 (useDebouncedValue hook)
- Depends on F01 (Dropdown, Modal, SearchField, List, EmptyState)

### Risks & Mitigations
- 100+ projects lag on render → Implement virtualization in WP09 before shipping
- Archived projects confuse users → Add toggle to hide/show archived projects
- No projects in org → EmptyState with helpful message: "This organisation has no projects yet"

---

## Work Package WP08: Main Context Switcher Component (Priority: P1)

**Goal**: Implement main ContextSwitcher component that composes ContextIndicator, OrganisationPicker, and ProjectPicker into unified UI.

**Independent Test**: Component renders indicator, opens pickers on click, handles context switches, works in header/sidebar/standalone variants.

**Prompt**: `tasks/planned/WP08-main-context-switcher.md`

### Included Subtasks
- [ ] T086 Create ContextSwitcher component in `src/components/ContextSwitcher.tsx`
- [ ] T087 Compose ContextIndicator (always visible), OrganisationPicker (opens on org click), ProjectPicker (opens on project click)
- [ ] T088 Implement variant prop: "header" (compact), "sidebar" (vertical), "standalone" (card-style)
- [ ] T089 Add showLogo prop (optional org logo/avatar display)
- [ ] T090 Wire up keyboard shortcut (Ctrl/Cmd+K) to open OrganisationPicker
- [ ] T091 Integrate useKeyboardShortcut hook (from WP10)
- [ ] T092 Handle loading state (show skeleton during initial context fetch)
- [ ] T093 Handle error state (show error banner with retry action)
- [ ] T094 [P] Write unit tests (renders indicator, opens pickers, switches context, keyboard shortcut)
- [ ] T095 [P] Write integration tests (full context switch flow: open picker → search → select → URL updates)
- [ ] T096 Create Storybook story (header variant, sidebar variant, standalone variant, with/without logo)

### Constitutional Alignment
- Principle II (Architecture): Composition pattern, clear component hierarchy
- Principle III (Code Quality): Readable, maintainable, well-documented
- Principle IV (Testing): Integration tests cover user stories (P1 flows)
- Principle VII (UX): Consistent, predictable behavior across variants

### Implementation Notes
- Header variant: Horizontal layout, compact spacing, dropdown pickers
- Sidebar variant: Vertical layout, more padding, modal pickers
- Standalone variant: Card with border, extra padding, centered content
- Logo: Use F01 Avatar component if logo URL provided, fallback to initials (first letter of org name)
- Keyboard shortcut: Focus search field in OrganisationPicker when Ctrl+K pressed
- Loading: Replace indicator with F01 Skeleton, disable pickers
- Error: Show F01 ErrorBanner above indicator, still allow picker access (may be stale data)

### Parallel Opportunities
- T094-T096 (tests and storybook) can proceed once component exists

### Dependencies
- Depends on WP05 (ContextIndicator)
- Depends on WP06 (OrganisationPicker)
- Depends on WP07 (ProjectPicker)
- Depends on WP10 (useKeyboardShortcut hook)

### Risks & Mitigations
- Variant styling inconsistent → Use F01 layout tokens (spacing, padding) consistently
- Component too complex → Break into sub-components if >200 LOC
- Keyboard shortcut conflicts → Document shortcut in quickstart, allow override via config

---

## Work Package WP09: Search & Virtualization Utilities (Priority: P1)

**Goal**: Implement useDebouncedValue hook for search debouncing and integrate react-window for list virtualization.

**Independent Test**: Hook debounces input with 300ms delay, 3-char minimum enforced, virtualized lists render only visible items and scroll smoothly at 60fps.

**Prompt**: `tasks/planned/WP09-search-virtualization.md`

### Included Subtasks
- [ ] T097 Create useDebouncedValue hook in `src/hooks/useDebouncedValue.ts` (300ms debounce, 3-char minimum)
- [ ] T098 [P] Write unit tests for useDebouncedValue (debounce timing, minimum char enforcement, immediate updates on clear)
- [ ] T099 Install react-window (or @tanstack/react-virtual) as dependency
- [ ] T100 Create VirtualizedList component in `src/components/VirtualizedList.tsx` (wraps react-window with F01 styling)
- [ ] T101 Integrate VirtualizedList into OrganisationPicker (threshold: 50+ items)
- [ ] T102 Integrate VirtualizedList into ProjectPicker (threshold: 50+ items)
- [ ] T103 [P] Write unit tests for VirtualizedList (renders visible items, scrolls correctly, handles dynamic heights)
- [ ] T104 [P] Write performance tests (measure render time for 500+ items, verify 60fps scrolling with React DevTools Profiler)
- [ ] T105 Create Storybook story for VirtualizedList (100 items, 500 items, 1000 items)

### Constitutional Alignment
- Principle III (Code Quality): Small, focused hooks and components
- Principle IV (Testing): Unit + performance tests, deterministic timing
- Principle VI (Performance): Meets spec requirements (<5s switch, 60fps scroll)

### Implementation Notes
- useDebouncedValue: Use useEffect + setTimeout, clean up on value change or unmount
- Minimum 3-char enforcement: Return empty string if input.length < 3
- VirtualizedList: Use react-window FixedSizeList or VariableSizeList (for dynamic heights)
- Integrate F01 List styling: Apply F01 tokens for item height, padding, hover colors
- Virtualization threshold: Only apply if items.length > 50, otherwise render all items normally
- Performance test: Load 500 orgs, open picker, scroll to bottom, measure frame rate (use Chrome DevTools Performance tab)

### Parallel Opportunities
- T097-T098 (debounce hook) independent of T099-T105 (virtualization)
- T103-T105 (tests and storybook) can proceed in parallel

### Dependencies
- Depends on WP06 (OrganisationPicker exists)
- Depends on WP07 (ProjectPicker exists)

### Risks & Mitigations
- react-window adds bundle weight → Tree-shake, verify <5KB gzipped
- Dynamic item heights break scrolling → Use VariableSizeList with accurate height calculation
- Search feels laggy → Tune debounce (test with users, may reduce to 200ms if needed)

---

## Work Package WP10: Keyboard Shortcuts & Accessibility (Priority: P2)

**Goal**: Implement useKeyboardShortcut hook for Ctrl/Cmd+K support, ensure WCAG 2.1 AA compliance across all components.

**Independent Test**: Keyboard shortcut opens picker, all components keyboard-navigable, screen reader announces context changes, axe-core reports zero violations.

**Prompt**: `tasks/planned/WP10-keyboard-accessibility.md`

### Included Subtasks
- [ ] T106 Create useKeyboardShortcut hook in `src/hooks/useKeyboardShortcut.ts` (listen for Ctrl/Cmd+K, configurable, disable-able)
- [ ] T107 [P] Write unit tests for useKeyboardShortcut (captures shortcut, respects input focus, cleans up listener)
- [ ] T108 Integrate hook into ContextSwitcher component (open OrganisationPicker on Ctrl+K)
- [ ] T109 Add aria-keyshortcuts attribute to ContextIndicator (announce "Ctrl+K to open picker")
- [ ] T110 Verify tab order: ContextIndicator → OrganisationPicker → ProjectPicker
- [ ] T111 Add focus trap to OrganisationPicker modal (Escape closes, Tab cycles within)
- [ ] T112 Add focus trap to ProjectPicker modal
- [ ] T113 Verify ARIA live regions announce context changes (aria-live="polite" on success message)
- [ ] T114 Run axe-core audits on all components (ContextIndicator, pickers, ContextSwitcher)
- [ ] T115 Fix any axe-core violations (color contrast, missing labels, keyboard traps)
- [ ] T116 Manual screen reader testing (NVDA on Windows, VoiceOver on macOS, JAWS if available)
- [ ] T117 Document keyboard shortcuts in quickstart.md (Ctrl/Cmd+K, Arrow keys, Enter, Escape)

### Constitutional Alignment
- Principle III (Code Quality): Clean hook implementation, clear naming
- Principle IV (Testing): Unit tests for hook, axe-core audits for components
- Principle VII (UX & Accessibility): WCAG 2.1 AA compliance mandatory
- Principle XI (Documentation): Keyboard shortcuts documented in quickstart

### Implementation Notes
- useKeyboardShortcut: Listen for keydown event, check event.ctrlKey || event.metaKey, ignore if inside input/textarea
- Hook should accept config: { key: 'k', ctrlOrCmd: true, callback: () => void, enabled: boolean }
- Focus trap: Use react-focus-lock or custom implementation (Tab cycles through picker items only)
- ARIA live region: Add hidden div with aria-live="polite", update text on context switch ("Switched to Acme Corp")
- Screen reader testing: Verify context indicator announces "Currently in Acme Corp, Website Redesign project"
- Axe-core: Run in Jest tests, fail build if violations found

### Parallel Opportunities
- T106-T107 (hook) independent of T108-T117 (integration and audits)
- T114-T116 (accessibility audits) can proceed in parallel

### Dependencies
- Depends on WP08 (ContextSwitcher component exists)

### Risks & Mitigations
- Shortcut conflicts with browser/OS → Document known conflicts, allow override via config
- Focus trap breaks navigation → Test with keyboard-only, ensure Escape always exits
- Screen reader inconsistencies → Test with multiple screen readers, document quirks

---

## Work Package WP11: Testing Suite & Coverage (Priority: P1)

**Goal**: Complete test coverage to 90%+, add integration tests for P1 user stories, ensure deterministic and fast tests.

**Independent Test**: All tests pass, coverage reports 90%+ for statements/branches/functions/lines, integration tests validate user stories 1-4.

**Prompt**: `tasks/planned/WP11-testing-suite-coverage.md`

### Included Subtasks
- [ ] T118 Configure Jest coverage thresholds (90% statements, branches, functions, lines)
- [ ] T119 [P] Write integration test: User Story 1 - View Current Context (context visible on load)
- [ ] T120 [P] Write integration test: User Story 2 - Switch Organisations (picker opens, org selected, URL updates)
- [ ] T121 [P] Write integration test: User Story 4 - URL-Based Context (deep link loads correct context)
- [ ] T122 [P] Write integration test: Edge Case - 403 on org switch (graceful error, fallback to safe context)
- [ ] T123 [P] Write integration test: Edge Case - Network failure (error banner, retry action)
- [ ] T124 Setup MSW server lifecycle (beforeAll, afterEach, afterAll)
- [ ] T125 Create MSW handlers for all B13 endpoints (success, 401, 403, 404, 500 variants)
- [ ] T126 [P] Write unit tests for all untested utilities (pathBuilder, contextMemory, type guards)
- [ ] T127 Run coverage report, identify gaps, add missing tests
- [ ] T128 Verify all tests are deterministic (no flakiness, no time-based failures)
- [ ] T129 Verify all tests are fast (<5s total test suite execution)
- [ ] T130 Add test:coverage script to package.json
- [ ] T131 Configure CI to run tests and enforce coverage gates

### Constitutional Alignment
- Principle IV (Testing): 90%+ coverage, integration tests for P1 user stories, deterministic tests
- Principle X (CI/CD): Coverage gates in CI, tests must pass before merge

### Implementation Notes
- Integration tests: Use React Testing Library + MSW, render full ContextSwitcherProvider + ContextSwitcher
- User Story 1: Assert context indicator visible with org/project name
- User Story 2: Click org name, see picker, click different org, verify navigateTo called with new path
- User Story 4: Initialize with URL `/acme-corp/tasks`, verify context loaded from URL
- Edge cases: Mock MSW to return 403, verify error banner shown and safe fallback triggered
- MSW handlers: Create reusable handlers in `__tests__/mocks/handlers.ts`, export setupServer
- Coverage gaps: Focus on error paths, edge cases, conditional branches
- Deterministic: Mock Date.now(), localStorage, setTimeout (use fake timers)
- Fast: Use fake timers, avoid real network calls, mock expensive operations

### Parallel Opportunities
- T119-T123 (integration tests) can be written in parallel
- T126 (utility tests) independent of integration tests

### Dependencies
- Depends on WP01-WP10 (all implementation complete)

### Risks & Mitigations
- Flaky tests → Use fake timers, mock all async operations, seed random data
- Slow tests → Profile with --detectLeaks, optimize heavy tests, parallelize with --maxWorkers
- Coverage false positives → Manual review of coverage report, ensure critical paths tested

---

## Work Package WP12: Documentation & Examples (Priority: P2)

**Goal**: Create comprehensive documentation for package usage, integration, customization, and troubleshooting.

**Independent Test**: Documentation is clear, accurate, and complete; quickstart scenario executes successfully in example app.

**Prompt**: `tasks/planned/WP12-documentation-examples.md`

### Included Subtasks
- [ ] T132 Create package README in `packages/context-switcher/README.md` (overview, installation, usage, API reference)
- [ ] T133 Create integration guide (expand quickstart.md with more examples)
- [ ] T134 Create customization guide (RouterAdapter examples, onBeforeContextChange patterns, custom labels)
- [ ] T135 Create troubleshooting guide (common issues, debug tips, FAQ)
- [ ] T136 Create ADR for router adapter pattern (why adapter, alternatives considered, decision rationale)
- [ ] T137 Create ADR for shared api-client extraction (why shared, impact on F02, benefits)
- [ ] T138 [P] Update Copilot instructions (already done in Phase 1, verify completeness)
- [ ] T139 [P] Create example app: React Router integration (full working example in `examples/context-switcher-react-router/`)
- [ ] T140 [P] Create example app: Next.js integration (full working example in `examples/context-switcher-nextjs/`)
- [ ] T141 Validate quickstart scenario end-to-end (follow quickstart.md step-by-step, verify it works)
- [ ] T142 Add JSDoc comments to all public APIs (types, hooks, components)
- [ ] T143 Generate TypeScript API docs (use typedoc or similar)
- [ ] T144 Update main project README with link to context-switcher package

### Constitutional Alignment
- Principle VIII (Developer Experience): Easy setup, clear documentation, helpful examples
- Principle XI (Documentation): README, integration guide, customization guide, ADRs
- Principle XII (Constitution Evolution): ADRs document major architectural decisions

### Implementation Notes
- README: Keep concise, link to other docs for details, include quick install + basic usage
- Integration guide: Show React Router, Next.js, Django templates examples (from quickstart.md)
- Customization guide: onBeforeContextChange callback examples (unsaved changes, analytics), custom labels for i18n
- Troubleshooting: Common issues (CSRF token missing, 403 errors, keyboard shortcut conflicts)
- ADRs: Use standard format (Context, Decision, Consequences), store in `kitty-specs/024-multi-tenancy-context/adr/`
- Example apps: Minimal working examples, README with setup instructions, demonstrate all key features
- JSDoc: Use TSDoc format, include @example blocks for complex APIs
- Quickstart validation: Run through every step, ensure no missing dependencies or broken links

### Parallel Opportunities
- T132-T137 (documentation) can be written in parallel
- T139-T140 (example apps) can be built in parallel

### Dependencies
- Depends on WP01-WP11 (all implementation and testing complete)

### Risks & Mitigations
- Documentation drift → Keep docs in same repo, review in PRs
- Example apps break → Add CI job to build/test example apps
- API docs outdated → Automate generation with typedoc, run in CI

---

## Dependency & Execution Summary

**Sequence**:
1. **Phase 0 (P0)**: WP01 → WP02 (foundational packages)
2. **Phase 1 (P1)**: WP03 → WP04 → WP05 → WP06 → WP07 → WP08 (core context + UI)
3. **Phase 2 (P1/P2)**: WP09 → WP10 → WP11 (performance, accessibility, testing)
4. **Phase 3 (P2)**: WP12 (documentation and examples)

**Parallelization**:
- WP05, WP06, WP07 can proceed in parallel once WP03/WP04 complete (different components)
- WP09 (search/virtualization) independent of WP10 (keyboard/a11y)
- WP11 (testing) can start early with unit tests, integration tests near end

**MVP Scope** (User Stories 1, 2, 4):
- WP01-WP08 (shared api-client, context provider, all core components)
- WP09 (search/virtualization required for perf spec)
- WP11 (testing required for quality spec)
- Optional for MVP: WP07 (ProjectPicker - if product doesn't use projects), WP10 (keyboard shortcuts - nice-to-have), WP12 (docs - can lag)

**Minimum Viable Release**: WP01 + WP02 + WP03 + WP04 + WP05 + WP06 + WP08 + WP09 (partial) + WP11 (partial)

---

## Subtask Index (Reference)

| Subtask ID | Summary | Work Package | Priority | Parallel? |
|------------|---------|--------------|----------|-----------|
| T001-T013 | Shared api-client package setup | WP01 | P0 | Partial |
| T014-T021 | F02 refactoring to use api-client | WP02 | P0 | No |
| T022-T036 | Context provider & state management | WP03 | P1 | Partial |
| T037-T048 | Backend API integration | WP04 | P1 | Partial |
| T049-T057 | Context indicator component | WP05 | P1 | Partial |
| T058-T071 | Organisation picker component | WP06 | P1 | Partial |
| T072-T085 | Project picker component | WP07 | P2 | Partial |
| T086-T096 | Main context switcher component | WP08 | P1 | Partial |
| T097-T105 | Search & virtualization utilities | WP09 | P1 | Partial |
| T106-T117 | Keyboard shortcuts & accessibility | WP10 | P2 | Partial |
| T118-T131 | Testing suite & coverage | WP11 | P1 | Partial |
| T132-T144 | Documentation & examples | WP12 | P2 | Partial |

---

## Next Steps

1. **Review this task breakdown** with team, confirm work package scope and sequencing
2. **Generate prompt files** for each work package (WP01-WP12) in `tasks/planned/` directory
3. **Begin implementation** with WP01 (shared api-client), then WP02 (F02 refactor)
4. **Track progress** in this file by checking off subtasks as completed
5. **Run tests iteratively** as each work package completes (don't wait until end)

---

> All work packages align with Django Core-App Constitution (frontend adaptations). Zero custom CSS (100% F01 design system). 90%+ test coverage. WCAG 2.1 AA accessible. Router-agnostic via adapter pattern. Backend as source of truth for all authorization.
