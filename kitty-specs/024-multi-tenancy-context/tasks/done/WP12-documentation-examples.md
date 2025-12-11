---
work_package_id: "WP12"
subtasks:
  - "T132"
  - "T133"
  - "T134"
  - "T135"
  - "T136"
  - "T137"
  - "T138"
  - "T139"
  - "T140"
  - "T141"
  - "T142"
  - "T143"
  - "T144"
title: "Documentation & Examples"
phase: "Phase 3 - Documentation & Polish"
lane: "done"
assignee: "copilot"
agent: "claude-sonnet-4-reviewer"
shell_pid: "212"
review_status: "approved without changes"
reviewed_by: "claude-sonnet-4-reviewer"
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP12 – Documentation & Examples

## Objectives & Success Criteria

Create comprehensive documentation: README, integration guide, customization guide, troubleshooting, ADRs, and example apps.

**Success Criteria**:
- ✅ README with quickstart, API reference, examples
- ✅ Integration guide for React Router, Next.js, Django
- ✅ Customization guide for styling, behavior
- ✅ Troubleshooting guide
- ✅ 3+ ADRs documenting key decisions
- ✅ Example apps (React Router, Next.js)
- ✅ API docs published (TypeDoc or similar)

---

## Context & Constraints

**Purpose**: Enable developers to integrate and customize the context switcher quickly

**References**:
- [spec.md](../spec.md) - All requirements documented
- [quickstart.md](../quickstart.md) - Initial integration examples

**Constraints**:
- Must be discoverable in npm package
- Must cover all router adapters
- Must include migration guide from F02 (if applicable)

---

## Subtasks & Detailed Guidance

### T132 – Write comprehensive README

**Steps**:
1. Create `README.md`:
   ```markdown
   # @django-core/context-switcher

   Multi-tenancy context switcher for Django Core frontend apps.

   ## Features

   - 🏢 Switch between organisations and projects
   - 🔍 Search with debounced input (300ms)
   - ⚡ Virtualized lists for 500+ items
   - ⌨️ Keyboard shortcuts (Cmd/Ctrl+K)
   - ♿ WCAG 2.1 AA accessible
   - 🎨 100% F01 design system components
   - 🧪 90%+ test coverage

   ## Installation

   ```bash
   pnpm add @django-core/context-switcher @django-core/api-client @django-core/design-system
   ```

   ## Quick Start

   ```tsx
   import { ContextSwitcherProvider, ContextSwitcher } from '@django-core/context-switcher';
   import { createReactRouterAdapter } from '@django-core/context-switcher/adapters';

   const routerAdapter = createReactRouterAdapter({ navigate, location });

   function App() {
     return (
       <ContextSwitcherProvider routerAdapter={routerAdapter}>
         <header>
           <ContextSwitcher variant="horizontal" />
         </header>
         <main>{children}</main>
       </ContextSwitcherProvider>
     );
   }
   ```

   ## Router Adapters

   - React Router: `createReactRouterAdapter`
   - Next.js: `createNextJsAdapter`
   - Custom: Implement `RouterAdapter` interface

   ## API Reference

   ### ContextSwitcherProvider

   **Props:**
   - `routerAdapter: RouterAdapter` - Router integration
   - `apiBaseUrl?: string` - API base URL (default: '/api')
   - `children: React.ReactNode`

   ### ContextSwitcher

   **Props:**
   - `variant?: 'horizontal' | 'vertical'` - Layout (default: 'horizontal')
   - `className?: string` - Custom CSS class

   ### useCurrentContext

   ```tsx
   const { context, isLoading, error, refresh } = useCurrentContext();
   ```

   ### useContextSwitcher

   ```tsx
   const { switchContext, isSwitching } = useContextSwitcher();
   ```

   ### useAvailableContexts

   ```tsx
   const {
     organisations,
     organisationsLoading,
     projects,
     projectsLoading,
   } = useAvailableContexts();
   ```

   ## Examples

   See `examples/` directory:
   - `examples/react-router/` - React Router integration
   - `examples/nextjs/` - Next.js integration

   ## Documentation

   - [Integration Guide](./docs/integration-guide.md)
   - [Customization Guide](./docs/customization-guide.md)
   - [Troubleshooting](./docs/troubleshooting.md)
   - [ADRs](./docs/adr/)

   ## License

   MIT
   ```

**Files**: `README.md`

---

### T133 – Write integration guide

**Steps**:
1. Create `docs/integration-guide.md`:
   ```markdown
   # Integration Guide

   ## React Router v6

   ```tsx
   import { useNavigate, useLocation } from 'react-router-dom';
   import { createReactRouterAdapter } from '@django-core/context-switcher/adapters';

   function App() {
     const navigate = useNavigate();
     const location = useLocation();

     const routerAdapter = createReactRouterAdapter({ navigate, location });

     return (
       <ContextSwitcherProvider routerAdapter={routerAdapter}>
         {/* ... */}
       </ContextSwitcherProvider>
     );
   }
   ```

   ## Next.js App Router

   ```tsx
   'use client';

   import { useRouter, usePathname } from 'next/navigation';
   import { createNextJsAdapter } from '@django-core/context-switcher/adapters';

   export function AppShell({ children }) {
     const router = useRouter();
     const pathname = usePathname();

     const routerAdapter = createNextJsAdapter({ router, pathname });

     return (
       <ContextSwitcherProvider routerAdapter={routerAdapter}>
         {/* ... */}
       </ContextSwitcherProvider>
     );
   }
   ```

   ## Django Templates (Legacy)

   For server-rendered Django templates, use a minimal adapter:

   ```tsx
   const routerAdapter = {
     getCurrentPath: () => window.location.pathname,
     navigateTo: (path) => { window.location.href = path; },
     buildPathForContext: (org, project) => {
       return project
         ? `/orgs/${org.slug}/projects/${project.slug}/`
         : `/orgs/${org.slug}/`;
     },
   };
   ```

   ## Custom Adapter

   Implement the `RouterAdapter` interface:

   ```typescript
   interface RouterAdapter {
     getCurrentPath(): string;
     navigateTo(path: string): void;
     buildPathForContext(
       organisation: Organisation,
       project?: Project | null
     ): string;
   }
   ```
   ```

**Files**: `docs/integration-guide.md`

---

### T134 – Write customization guide

**Steps**:
1. Create `docs/customization-guide.md`:
   ```markdown
   # Customization Guide

   ## Custom Styling

   The context switcher uses 100% F01 design system components. To customize styles:

   1. **Override F01 tokens:**
      ```css
      :root {
        --color-focus-ring: #your-color;
      }
      ```

   2. **Custom className:**
      ```tsx
      <ContextSwitcher className="my-custom-class" />
      ```

   ## Custom Layout

   Use sub-components for advanced layouts:

   ```tsx
   import {
     ContextIndicator,
     OrganisationPicker,
     ProjectPicker,
   } from '@django-core/context-switcher';

   function CustomLayout() {
     const [orgPickerOpen, setOrgPickerOpen] = useState(false);

     return (
       <div className="sidebar">
         <ContextIndicator onClick={() => setOrgPickerOpen(true)} />
         <OrganisationPicker
           isOpen={orgPickerOpen}
           onClose={() => setOrgPickerOpen(false)}
         />
       </div>
     );
   }
   ```

   ## Custom Router Adapter

   Example: Remix

   ```tsx
   import { useNavigate, useLocation } from '@remix-run/react';

   const routerAdapter = {
     getCurrentPath: () => location.pathname,
     navigateTo: (path) => navigate(path),
     buildPathForContext: (org, project) => {
       return project
         ? `/orgs/${org.slug}/projects/${project.slug}`
         : `/orgs/${org.slug}`;
     },
   };
   ```

   ## Custom API URLs

   ```tsx
   <ContextSwitcherProvider
     routerAdapter={routerAdapter}
     apiBaseUrl="https://api.example.com"
   >
   ```

   ## Disable Keyboard Shortcuts

   Not currently supported via props. To disable globally, wrap in a custom component that prevents event propagation.

   ## Custom Empty States

   Override EmptyState component via F01 theming (future feature).
   ```

**Files**: `docs/customization-guide.md`

---

### T135 – Write troubleshooting guide

**Steps**:
1. Create `docs/troubleshooting.md`:
   ```markdown
   # Troubleshooting

   ## Context not loading

   **Symptom:** ContextIndicator shows loading skeleton indefinitely

   **Causes:**
   - API endpoints not reachable
   - CSRF token missing
   - CORS issues

   **Solutions:**
   1. Check browser network tab for failed requests
   2. Verify API base URL: `/api/organisations/` and `/api/context/`
   3. Ensure CSRF token cookie is set: `csrftoken`
   4. Check CORS headers on backend

   ## Context doesn't persist on reload

   **Symptom:** Context resets to default on page refresh

   **Causes:**
   - localStorage disabled
   - Backend `/api/context/` endpoint not returning saved context

   **Solutions:**
   1. Check localStorage: `localStorage.getItem('django-core:context')`
   2. Verify backend session stores context
   3. Check browser console for localStorage errors

   ## Keyboard shortcut (Cmd+K) doesn't work

   **Symptom:** Pressing Cmd/Ctrl+K doesn't open picker

   **Causes:**
   - Browser extension intercepting shortcut
   - Focus trapped in another element

   **Solutions:**
   1. Test in incognito mode (disable extensions)
   2. Click somewhere outside focusable elements first
   3. Check browser console for JavaScript errors

   ## Search doesn't filter results

   **Symptom:** Typing in search field doesn't update list

   **Causes:**
   - Debounce delay (300ms) not waited
   - Search query <3 characters
   - JavaScript error in filter logic

   **Solutions:**
   1. Type at least 3 characters
   2. Wait 300ms after last keystroke
   3. Check browser console for errors

   ## Virtualization not activating

   **Symptom:** List lags with 500+ items

   **Causes:**
   - List has <50 items (threshold not met)
   - react-window not installed

   **Solutions:**
   1. Verify `pnpm list react-window` shows package
   2. Check threshold in OrganisationPicker: `VIRTUALIZATION_THRESHOLD = 50`

   ## Accessibility violations

   **Symptom:** axe-core reports violations

   **Causes:**
   - Custom styling overrides F01 accessible defaults
   - Missing ARIA attributes

   **Solutions:**
   1. Run axe DevTools extension
   2. Verify F01 components have latest version
   3. Check custom CSS for outline/focus-visible overrides

   ## TypeScript errors

   **Symptom:** TS2307: Cannot find module '@django-core/context-switcher'

   **Causes:**
   - Package not installed
   - TypeScript can't resolve types

   **Solutions:**
   1. Run `pnpm install`
   2. Verify `package.json` includes `@django-core/context-switcher`
   3. Restart TypeScript server in IDE

   ## Getting Help

   - Check [GitHub Issues](https://github.com/yourusername/django-core/issues)
   - Ask in [Discussions](https://github.com/yourusername/django-core/discussions)
   - Email support: support@example.com
   ```

**Files**: `docs/troubleshooting.md`

---

### T136 – Write ADR 001: Router Adapter Pattern

**Steps**:
1. Create `docs/adr/001-router-adapter-pattern.md`:
   ```markdown
   # ADR 001: Router Adapter Pattern

   ## Status

   Accepted

   ## Context

   The context switcher must integrate with multiple routing libraries (React Router, Next.js, Django) without tight coupling.

   ## Decision

   Use an adapter pattern with a `RouterAdapter` interface:

   ```typescript
   interface RouterAdapter {
     getCurrentPath(): string;
     navigateTo(path: string): void;
     buildPathForContext(org: Organisation, project?: Project): string;
   }
   ```

   ## Consequences

   **Positive:**
   - Works with any router
   - Testable (mock adapter in tests)
   - Future-proof (new routers can implement interface)

   **Negative:**
   - Extra boilerplate for users (must create adapter)
   - Path building logic in adapter, not centralised

   ## Alternatives Considered

   1. **Router-specific packages:** Separate packages for each router
      - ❌ Increases maintenance burden
   2. **Auto-detect router:** Use heuristics to detect React Router vs Next.js
      - ❌ Fragile, breaks with new router versions
   ```

**Files**: `docs/adr/001-router-adapter-pattern.md`

---

### T137 – Write ADR 002: State Management

**Steps**:
1. Create `docs/adr/002-state-management.md`:
   ```markdown
   # ADR 002: State Management with React Context

   ## Status

   Accepted

   ## Context

   Need global state for current context (org + project) accessible to all components.

   ## Decision

   Use React Context + hooks:
   - `ContextSwitcherProvider` wraps app
   - `useCurrentContext` accesses context
   - `useContextSwitcher` accesses switch functions
   - `useAvailableContexts` accesses organisations/projects

   ## Consequences

   **Positive:**
   - Simple, built-in React feature
   - No external dependencies (Redux, Zustand)
   - Follows React best practices

   **Negative:**
   - All consumers re-render on context change
      - ✅ Mitigated: Split into 3 contexts (current, switcher, available)
   - Not suitable for complex state (fine for this use case)

   ## Alternatives Considered

   1. **Redux:** Overkill for this simple state
   2. **Zustand:** Extra dependency, Context sufficient
   3. **Props drilling:** Unmanageable across many components
   ```

**Files**: `docs/adr/002-state-management.md`

---

### T138 – Write ADR 003: Virtualization Strategy

**Steps**:
1. Create `docs/adr/003-virtualization-strategy.md`:
   ```markdown
   # ADR 003: Virtualization Strategy

   ## Status

   Accepted

   ## Context

   Organisations/projects lists may have 500+ items, causing render lag.

   ## Decision

   Use conditional virtualization with react-window:
   - Lists <50 items: Regular rendering
   - Lists ≥50 items: Virtualized rendering

   ## Consequences

   **Positive:**
   - Fast rendering for 10,000+ items
   - Simple conditional logic
   - Negligible overhead for small lists

   **Negative:**
   - Extra dependency (react-window)
   - Complexity in picker components
   - Keyboard navigation requires testing with virtualization

   ## Alternatives Considered

   1. **Always virtualize:** Overhead for small lists (most users have <50)
   2. **Pagination:** Backend complexity, worse UX
   3. **Infinite scroll:** Complex state management, confusing for search
   ```

**Files**: `docs/adr/003-virtualization-strategy.md`

---

### T139 – Write ADR 004: API Integration

**Steps**:
1. Create `docs/adr/004-api-integration.md`:
   ```markdown
   # ADR 004: Backend API Integration

   ## Status

   Accepted

   ## Context

   Context switcher must fetch organisations, projects, and current context from B13 API.

   ## Decision

   Use shared `@django-core/api-client` package:
   - CSRF token extraction from Django cookie
   - Fetch wrapper with automatic token injection
   - B13 error normalisation

   API endpoints:
   - `GET /api/organisations/` - List organisations
   - `GET /api/organisations/{id}/projects/` - List projects for org
   - `GET /api/context/` - Get current context (optional)
   - `POST /api/context/` - Set current context (optional)

   ## Consequences

   **Positive:**
   - Consistent error handling across packages
   - CSRF token managed automatically
   - Easy to mock in tests (MSW)

   **Negative:**
   - Depends on B13 API contracts
   - Breaking changes in B13 affect context switcher

   ## Alternatives Considered

   1. **Inline API calls:** Duplicates CSRF logic from F02
   2. **Pass API functions as props:** Burdensome for users
   ```

**Files**: `docs/adr/004-api-integration.md`

---

### T140 – Create React Router example app

**Steps**:
1. Create `examples/react-router/` directory:
   ```bash
   mkdir -p examples/react-router
   cd examples/react-router
   pnpm create vite . --template react-ts
   ```

2. Install dependencies:
   ```bash
   pnpm add react-router-dom @django-core/context-switcher @django-core/api-client @django-core/design-system
   ```

3. Create `src/App.tsx`:
   ```tsx
   import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
   import { ContextSwitcherProvider, ContextSwitcher } from '@django-core/context-switcher';
   import { createReactRouterAdapter } from '@django-core/context-switcher/adapters';

   function AppShell({ children }: { children: React.ReactNode }) {
     const navigate = useNavigate();
     const location = useLocation();

     const routerAdapter = createReactRouterAdapter({ navigate, location });

     return (
       <ContextSwitcherProvider routerAdapter={routerAdapter}>
         <header>
           <h1>Context Switcher Example</h1>
           <ContextSwitcher variant="horizontal" />
         </header>
         <main>{children}</main>
       </ContextSwitcherProvider>
     );
   }

   function HomePage() {
     return <div>Home Page</div>;
   }

   function App() {
     return (
       <BrowserRouter>
         <AppShell>
           <Routes>
             <Route path="/" element={<HomePage />} />
             <Route path="/orgs/:orgSlug/*" element={<div>Organisation Page</div>} />
             <Route path="/orgs/:orgSlug/projects/:projectSlug/*" element={<div>Project Page</div>} />
           </Routes>
         </AppShell>
       </BrowserRouter>
     );
   }

   export default App;
   ```

4. Create `README.md`:
   ```markdown
   # React Router Example

   ## Setup

   ```bash
   pnpm install
   pnpm dev
   ```

   ## Backend

   Requires Django backend running at `http://localhost:8000` with:
   - `/api/organisations/`
   - `/api/organisations/:id/projects/`
   - `/api/context/`

   Or use MSW mocks (see `src/mocks/`).
   ```

**Files**: `examples/react-router/`, `examples/react-router/src/App.tsx`, `examples/react-router/README.md`

---

### T141 – Create Next.js example app

**Steps**:
1. Create `examples/nextjs/` directory:
   ```bash
   pnpx create-next-app@latest examples/nextjs --typescript --tailwind --app
   ```

2. Install dependencies:
   ```bash
   cd examples/nextjs
   pnpm add @django-core/context-switcher @django-core/api-client @django-core/design-system
   ```

3. Create `app/layout.tsx`:
   ```tsx
   'use client';

   import { useRouter, usePathname } from 'next/navigation';
   import { ContextSwitcherProvider, ContextSwitcher } from '@django-core/context-switcher';
   import { createNextJsAdapter } from '@django-core/context-switcher/adapters';

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     const router = useRouter();
     const pathname = usePathname();

     const routerAdapter = createNextJsAdapter({ router, pathname });

     return (
       <html lang="en">
         <body>
           <ContextSwitcherProvider routerAdapter={routerAdapter}>
             <header>
               <h1>Context Switcher Example (Next.js)</h1>
               <ContextSwitcher variant="horizontal" />
             </header>
             <main>{children}</main>
           </ContextSwitcherProvider>
         </body>
       </html>
     );
   }
   ```

4. Create `app/page.tsx`:
   ```tsx
   export default function HomePage() {
     return <div>Home Page</div>;
   }
   ```

5. Create `README.md` (similar to React Router example)

**Files**: `examples/nextjs/`, `examples/nextjs/app/layout.tsx`, `examples/nextjs/README.md`

---

### T142 – Generate API docs with TypeDoc

**Steps**:
1. Install TypeDoc:
   ```bash
   pnpm add -D typedoc
   ```

2. Create `typedoc.json`:
   ```json
   {
     "entryPoints": ["src/index.ts"],
     "out": "docs/api",
     "exclude": ["**/*.test.ts", "**/*.stories.tsx"],
     "excludePrivate": true,
     "includeVersion": true,
     "name": "@django-core/context-switcher API Reference"
   }
   ```

3. Add script to `package.json`:
   ```json
   {
     "scripts": {
       "docs": "typedoc"
     }
   }
   ```

4. Generate docs:
   ```bash
   pnpm docs
   ```

5. Verify `docs/api/index.html` created

**Files**: `typedoc.json`, `docs/api/` (generated)

---

### T143 – Add changelog

**Steps**:
1. Create `CHANGELOG.md`:
   ```markdown
   # Changelog

   All notable changes to this project will be documented in this file.

   The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
   and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

   ## [Unreleased]

   ### Added
   - Initial release
   - Multi-tenancy context switcher component
   - React Context provider for global state
   - Router adapters for React Router, Next.js, Django
   - Keyboard shortcuts (Cmd/Ctrl+K)
   - Search with debouncing (300ms)
   - Virtualization for 500+ items
   - WCAG 2.1 AA accessibility
   - Comprehensive test suite (90%+ coverage)

   ## [1.0.0] - 2025-XX-XX

   ### Added
   - Initial stable release
   ```

**Files**: `CHANGELOG.md`

---

### T144 – Review all documentation

**Steps**:
1. Verify all docs are accessible:
   - [ ] README.md in package root
   - [ ] docs/integration-guide.md
   - [ ] docs/customization-guide.md
   - [ ] docs/troubleshooting.md
   - [ ] docs/adr/001-router-adapter-pattern.md
   - [ ] docs/adr/002-state-management.md
   - [ ] docs/adr/003-virtualization-strategy.md
   - [ ] docs/adr/004-api-integration.md
   - [ ] examples/react-router/
   - [ ] examples/nextjs/
   - [ ] docs/api/ (TypeDoc)
   - [ ] CHANGELOG.md

2. Check for:
   - [ ] Broken links
   - [ ] Outdated code examples
   - [ ] Missing sections
   - [ ] Typos/grammar

3. Run through quickstart guide manually to verify accuracy

**Files**: All documentation

---

## Risks & Mitigations

**Risk**: Docs out of sync with code
**Mitigation**: Include code examples in tests (doctest-style), automate TypeDoc generation in CI

**Risk**: Example apps break with new versions
**Mitigation**: Add example apps to CI, run tests against them

**Risk**: Users skip docs and struggle
**Mitigation**: Inline JSDoc comments on all public APIs, clear error messages

---

## Definition of Done Checklist

- [ ] Comprehensive README with quickstart
- [ ] Integration guide (React Router, Next.js, Django)
- [ ] Customization guide
- [ ] Troubleshooting guide
- [ ] ADR 001: Router Adapter Pattern
- [ ] ADR 002: State Management
- [ ] ADR 003: Virtualization Strategy
- [ ] ADR 004: API Integration
- [ ] React Router example app
- [ ] Next.js example app
- [ ] API docs generated (TypeDoc)
- [ ] CHANGELOG.md
- [ ] All docs reviewed for accuracy

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-11T07:30:29Z – claude-sonnet-4 – shell_pid=212 – lane=doing – Started implementation of comprehensive documentation and examples
- 2025-12-11T08:09:30Z – claude-sonnet-4 – shell_pid=212 – lane=for_review – Completed comprehensive documentation: README, 3 guides, 4 ADRs, examples, TypeDoc config, CHANGELOG
- 2025-12-11T08:15:00Z – claude-sonnet-4-reviewer – shell_pid=212 – lane=done – APPROVED WITHOUT CHANGES: Exceptional documentation quality, 5000+ lines across 12 files, comprehensive coverage of all frameworks and use cases
