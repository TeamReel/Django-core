# Implementation Plan: F05 Resource Display & Alerts

**Branch**: `027-resource-display-alerts` | **Date**: 2025-12-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/027-resource-display-alerts/spec.md`
**Package**: `@django-core/resource-alerts`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

F05 provides generic, reusable UI components for displaying resource usage states (credits, quotas, storage), system health indicators, and contextual alerts. Components are product-agnostic primitives built on F01 design system tokens, designed for composition in F06 layouts and downstream products. Key capabilities: resource usage progress bars with configurable thresholds, multi-severity alert banners (info/success/warning/critical), health status indicators, dismissible alerts with browser localStorage persistence, and optional data-fetching hooks for B11/B18 integration.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.x
**Primary Dependencies**:
  - @django-core/design-system (F01) - design tokens, base styles
  - @django-core/api-client - CSRF-protected fetch wrapper for optional polling hooks
  - React 18.x (peer dependency)
  - vanilla-extract or CSS modules (styling, following F01 pattern)
**Storage**: Browser localStorage (alert dismissal preferences only - non-sensitive data)
**Testing**: Vitest + React Testing Library (unit/integration), Chromatic (visual regression), axe-core (accessibility)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions)
**Project Type**: Frontend component library (monorepo package)
**Performance Goals**:
  - Bundle size: <20KB gzipped (entire package)
  - Component render: <16ms (60fps target)
  - Alert animation: 200-300ms fade (respects prefers-reduced-motion)
**Constraints**:
  - WCAG 2.1 AA compliance mandatory
  - No backend persistence (stateless components + localStorage only)
  - Product-agnostic (no hardcoded thresholds or business logic)
  - Alert positioning: page banners + inline only (no floating toasts - delegated to F04)
**Scale/Scope**:
  - 8-12 exported components (Alert, ResourceUsageBar, HealthStatus, Badge, ResourceCard, AlertStack, etc.)
  - 15-20 Storybook stories (per-component + 3-5 composition patterns)
  - 2-3 optional hooks (useResourceUsage, useHealthStatus, useAlertDismissal)

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
  - ✅ Components accept data via props; no hardcoded thresholds
  - ✅ Severity levels explicit (not calculated from business rules)
  - ✅ All styling via F01 tokens (no product-specific branding)
- [x] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
  - ✅ Provides generic observability/monitoring UI primitives
  - ✅ Integrates with B11 (credits) and B18 (health) via TypeScript interfaces only
- [x] **Downstream Extension**: Product-specific needs are handled via documented extension points
  - ✅ Products pass their own data and thresholds
  - ✅ Helper utilities provided (e.g., calculateSeverityFromUsage) but not baked into components

### II. Architecture and Modularity
- [x] **Single Responsibility**: Each component has one clear purpose
  - ✅ Alert: Display dismissible notifications
  - ✅ ResourceUsageBar: Visualize usage against limits
  - ✅ HealthStatus: Display service health state
  - ✅ ResourceCard: Compose resource info (compound component)
- [x] **Stable APIs**: Public interfaces are documented and stable
  - ✅ TypeScript interfaces for all props
  - ✅ Storybook serves as live documentation
  - ✅ Semantic versioning for breaking changes
- [x] **Minimal Dependencies**: Only necessary dependencies included
  - ✅ F01 (required - design tokens)
  - ✅ React 18 (peer dependency)
  - ✅ No heavyweight libraries (no Lodash, no Moment.js)
- [x] **No Circular Deps**: Dependency graph is acyclic
  - ✅ F05 depends on F01 only (no circular refs)
  - ✅ Optional hooks depend on @django-core/api-client
- [x] **No Downstream Imports**: Core does not import from product-specific projects
  - ✅ Zero imports from products; only F01/F06/api-client

### III. Code Quality and Style
- [x] **TypeScript 5.x**: Baseline version maintained (frontend package)
  - ✅ strict mode enabled in tsconfig.json
- [x] **Type Hints**: Core modules will use type hints throughout
  - ✅ All props interfaces typed
  - ✅ No `any` types except explicit escape hatches
- [x] **Prettier Formatting**: All code will be formatted with Prettier (frontend equivalent of Black)
  - ✅ Reuse monorepo prettier config
- [x] **ESLint Linting**: ESLint will be primary linter (frontend equivalent of Ruff)
  - ✅ Reuse monorepo eslint config (@typescript-eslint/recommended)
- [x] **No Dead Code**: Implementation removes unused code
  - ✅ Tree-shaking via Vite ensures no dead exports
- [x] **Readable Code**: Functions/components remain small and focused
  - ✅ Components <150 LOC, hooks <50 LOC
- [x] **Curated Dependencies**: New dependencies are justified and pinned
  - ✅ Only F01 + api-client added; peer deps explicit

### IV. Testing Strategy
- [x] **Vitest + React Testing Library**: Testing framework used (frontend equivalent)
  - ✅ Vitest config follows F01 pattern
- [x] **Test Coverage**: Tests included for all features
  - ✅ Unit tests for all components
  - ✅ Integration tests for compound components
  - ✅ Accessibility tests via axe-core
- [x] **Regression Tests**: Bug fixes include tests preventing recurrence
  - ✅ TDD workflow enforced via PR template
- [x] **Deterministic**: Tests are not flaky or environment-dependent
  - ✅ No timers without fake timers
  - ✅ No network calls (mocked via MSW if needed)
- [x] **Coverage Thresholds**: Coverage targets defined and enforced
  - ✅ >90% component logic
  - ✅ 100% localStorage utilities
- [x] **Integration Tests**: Key user flows have integration test coverage
  - ✅ Alert dismiss + localStorage persistence
  - ✅ Resource usage threshold visual changes
  - ✅ Keyboard navigation + screen reader announcements

### V. Security and Privacy
- [x] **Secure Defaults**: CSRF, secure cookies handled by consuming app (F05 is frontend-only)
  - ✅ No direct API calls in components
  - ✅ Optional hooks use @django-core/api-client (CSRF-aware)
- [x] **DEBUG Off**: N/A (no backend, no server-side rendering secrets)
- [x] **No Secrets**: No secrets committed; env vars/secret managers used
  - ✅ No API keys or tokens in package
- [x] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
  - ✅ npm audit + Dependabot enabled
- [x] **Centralized Auth**: Authentication/authorization uses core mechanisms
  - ✅ Components receive data via props (auth handled upstream)
- [x] **No Sensitive Logging**: Sensitive data not logged
  - ✅ Console logs are development-only
  - ✅ No user data in localStorage (only dismissal preferences)

### VI. Performance and Reliability
- [x] **No N+1 Queries**: N/A (frontend package, no database)
- [x] **Pagination**: N/A (components render passed data; pagination handled by consumer)
  - ✅ Alert stack limits to 5 visible (prevents DOM bloat)
- [x] **Explicit Caching**: Caching strategy documented if used
  - ✅ Optional hooks implement simple polling (configurable interval)
  - ✅ No complex caching (SWR-style left to consuming apps)
- [x] **Structured Logging**: Logging infrastructure in place
  - ✅ Development console.warn for prop validation errors
  - ✅ No production logging (errors bubble to parent boundary)
- [x] **Health Checks**: N/A (frontend package)
- [x] **Metrics Hooks**: Observability metrics captured
  - ✅ Components export data-testid for observability tooling
  - ✅ No built-in analytics (delegated to consuming apps)
- [x] **Graceful Degradation**: Failure handling strategy defined
  - ✅ Errors bubble to React error boundary
  - ✅ No localStorage = warnings shown, functionality degrades gracefully
  - ✅ Missing data = skeleton/empty states

### VII. UX and API Design
- [x] **DRF Required**: N/A (frontend package, no REST APIs)
- [x] **Consistent Responses**: Component prop interfaces standardized
  - ✅ TypeScript interfaces ensure consistency
  - ✅ Severity enum (info|success|warning|critical)
  - ✅ Status enum (operational|degraded|down|unknown)
- [x] **Versioning Strategy**: Breaking changes handled via versioning or deprecation
  - ✅ Semantic versioning (major for breaking changes)
  - ✅ Deprecation warnings in console.warn before removal
- [x] **Clear Errors**: Error messages clear and safe (no data leaks)
  - ✅ Prop validation errors provide actionable feedback
  - ✅ No user data in error messages
- [x] **Boundary Validation**: Validation in serializers/forms
  - ✅ TypeScript enforces prop types at build time
  - ✅ Runtime validation for critical props (severity values, etc.)

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Local environment setup documented and simple
  - ✅ `pnpm install` from monorepo root
  - ✅ `pnpm --filter @django-core/resource-alerts dev` starts Storybook
- [x] **Mandatory Tools**: Prettier, ESLint, TypeScript, Vitest configured (frontend equivalents)
  - ✅ Reuse monorepo configs
- [x] **Pre-commit Hooks**: Hooks match CI checks
  - ✅ Husky + lint-staged for type check + lint + format
- [x] **Type Checking**: TypeScript runs cleanly on all modules
  - ✅ `tsc --noEmit` passes in CI
- [x] **Task Scripts**: Common operations scripted
  - ✅ `pnpm build`, `pnpm test`, `pnpm storybook`, `pnpm lint`
- [x] **Developer Docs**: Setup and development docs exist
  - ✅ README.md in package root
  - ✅ Storybook Docs tab for each component

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Work occurs on `027-resource-display-alerts` branch
  - ✅ Worktree created at `.worktrees/027-resource-display-alerts`
- [x] **Linked to Spec**: PR will reference spec document
  - ✅ Spec at `kitty-specs/027-resource-display-alerts/spec.md`
- [x] **Focused PRs**: Changes remain small and focused
  - ✅ Single package addition, no other feature changes
- [x] **main Stable**: No direct commits to main
  - ✅ All work in feature branch, PR required

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Linting, formatting, type check, tests in CI
  - ✅ ESLint, Prettier, TypeScript, Vitest run on all PRs
  - ✅ Chromatic visual regression on PR
- [x] **Merge Gates**: All CI checks must pass before merge
  - ✅ Coverage thresholds enforced (>90%)
  - ✅ No TypeScript errors
  - ✅ All Chromatic snapshots approved
- [x] **Scripted Deployment**: Deployment process documented/automated
  - ✅ `pnpm build` produces dist/ for npm publishing
  - ✅ Package published to internal registry or npm

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: Documentation lives in repository
  - ✅ Package README.md
  - ✅ Storybook as live documentation
- [x] **Package README**: Package has README with installation and basic usage
  - ✅ Installation, peer dependencies, basic examples
- [x] **Getting Started**: Setup guide exists or will be updated
  - ✅ Quickstart in README
  - ✅ Storybook "Getting Started" story
- [x] **Extension Guide**: "How to extend" documentation exists or planned
  - ✅ Integration guide for B11/B18 data sources
  - ✅ Custom styling guide (F01 token overrides)
- [x] **Spec Sync**: Implementation keeps spec up to date
  - ✅ Spec updated if requirements change during implementation
- [x] **ADR Required**: Major architectural decisions documented (if applicable)
  - ✅ No major ADRs required (follows established F01 patterns)

### XII. Constitution Evolution
- [x] **No Constitution Changes**: This feature does not require constitution amendments
  - ✅ Follows all existing principles
- [x] **Template Updates**: No template changes required
  - ✅ Standard feature workflow

### Violations Requiring Justification

*No violations present.*

**Constitution Check Status**: ✅ **PASS** - All principles satisfied

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
packages/resource-display-alerts/
├── src/
│   ├── components/
│   │   ├── Alert/
│   │   │   ├── Alert.tsx
│   │   │   ├── Alert.module.css
│   │   │   ├── Alert.test.tsx
│   │   │   └── index.ts
│   │   ├── ResourceUsageBar/
│   │   │   ├── ResourceUsageBar.tsx
│   │   │   ├── ResourceUsageBar.test.tsx
│   │   │   └── index.ts
│   │   ├── HealthStatus/
│   │   │   ├── HealthStatus.tsx
│   │   │   ├── HealthStatus.test.tsx
│   │   │   └── index.ts
│   │   ├── Badge/
│   │   │   ├── Badge.tsx
│   │   │   ├── Badge.test.tsx
│   │   │   └── index.ts
│   │   ├── ResourceCard/
│   │   │   ├── ResourceCard.tsx        (compound component)
│   │   │   ├── ResourceCardHeader.tsx
│   │   │   ├── ResourceCardBody.tsx
│   │   │   ├── ResourceCardFooter.tsx
│   │   │   ├── ResourceCard.test.tsx
│   │   │   └── index.ts
│   │   └── AlertStack/
│   │       ├── AlertStack.tsx
│   │       ├── AlertStack.test.tsx
│   │       └── index.ts
│   ├── hooks/
│   │   ├── useResourceUsage.ts         (optional polling hook)
│   │   ├── useResourceUsage.test.ts
│   │   ├── useHealthStatus.ts          (optional polling hook)
│   │   ├── useHealthStatus.test.ts
│   │   ├── useAlertDismissal.ts        (localStorage integration)
│   │   └── useAlertDismissal.test.ts
│   ├── utils/
│   │   ├── localStorage.ts             (getItem/setItem/removeItem)
│   │   ├── localStorage.test.ts
│   │   ├── calculateSeverityFromUsage.ts (helper utility)
│   │   └── calculateSeverityFromUsage.test.ts
│   ├── types/
│   │   ├── Alert.ts                    (AlertSeverity enum, Alert interface)
│   │   ├── ResourceUsage.ts
│   │   ├── HealthStatus.ts             (HealthStatusType enum)
│   │   └── index.ts
│   └── index.ts                        (public exports)
├── stories/
│   ├── Alert.stories.tsx
│   ├── ResourceUsageBar.stories.tsx
│   ├── HealthStatus.stories.tsx
│   ├── Badge.stories.tsx
│   ├── ResourceCard.stories.tsx
│   ├── AlertStack.stories.tsx
│   └── ResourceMonitoring.stories.tsx  (composition patterns)
├── .storybook/
│   ├── main.ts
│   └── preview.ts
├── package.json
├── vite.config.ts                      (library mode)
├── tsconfig.json
├── tsconfig.node.json
├── .eslintrc.cjs
├── .prettierrc.json
└── README.md
```

**Structure Decision**: Monorepo frontend package following F01 design system pattern. Components in `src/components/`, optional data-fetching hooks in `src/hooks/`, shared TypeScript interfaces in `src/types/`. Storybook stories organized per-component with additional composition pattern examples.

**Key Design Decisions**:
- **Compound Components**: ResourceCard uses React.createContext for flexible composition
- **CSS Modules**: Minimal CSS for layout only; colors/spacing via F01 tokens
- **Hook Isolation**: Optional data-fetching hooks separate from pure components
- **Type Safety**: All props interfaces exported from types/ directory
- **Testing Co-location**: Each component has adjacent .test.tsx file

## Complexity Tracking

*No violations present - no complexity justification required.*

---

## Phase 0: Research

**Objective**: Gather technical information required for implementation without writing production code.

**Deliverables**:
- [x] `research.md` - Documented research findings
- [x] `data-model.md` - Entity definitions (Alert, ResourceUsageData, HealthStatus, AlertPreference)
- [x] `research/evidence-log.csv` - Findings audit trail
- [x] `research/source-register.csv` - Reference tracking

**Research Tasks**:

1. **F01 Design System Integration**
   - Review F01 token system (colors, spacing, typography, animations)
   - Identify tokens for alert severity colors (info, warning, error, success)
   - Document spacing scale for component padding/margins
   - Verify animation token availability (transition durations, easing)
   - Document how to import and use tokens in React components

2. **localStorage Best Practices**
   - Research browser localStorage API (getItem, setItem, removeItem)
   - Error handling patterns for quota exceeded errors
   - JSON serialization/deserialization patterns
   - Privacy considerations (no sensitive data)
   - Testing strategies for localStorage (mocking in Vitest)

3. **ARIA Live Regions**
   - Research `aria-live` attribute (`polite` vs `assertive`)
   - When to use `role="alert"` vs `role="status"`
   - Screen reader announcement patterns for dynamic content
   - Verify WCAG 2.1 AA compliance for alert announcements

4. **prefers-reduced-motion Implementation**
   - CSS media query syntax: `@media (prefers-reduced-motion: reduce)`
   - React implementation patterns (CSS-in-JS vs CSS modules)
   - Verify F01 provides utilities for motion preferences
   - Fallback strategies when motion disabled

5. **Compound Component Patterns**
   - Research React.createContext + useContext pattern
   - Component composition best practices (Header/Body/Footer pattern)
   - TypeScript typing for compound components
   - Review F06 layout primitives for existing compound component examples

6. **Chromatic Configuration**
   - Review Chromatic setup in monorepo
   - Snapshot testing best practices (viewports, themes)
   - CI integration for visual regression
   - Approval workflow for snapshot changes

7. **B11/B18 API Response Shapes**
   - Document expected shape of B11 credit usage responses
   - Document expected shape of B18 health status responses
   - Identify data fields needed for components (value, max, label, status)
   - Define TypeScript interfaces for API contracts

**Success Criteria**:
- All research questions answered in `research.md`
- Zero ambiguities about F01 token usage
- Clear understanding of accessibility requirements
- API contract shapes documented for Phase 1

**Estimated Effort**: 2-3 hours

---

## Phase 1: Design & Contracts

**Objective**: Define data models, API contracts, and component interfaces before implementation.

**Deliverables**:
- [x] `data-model.md` - Entity definitions (4 entities: Alert, ResourceUsageData, HealthStatus, AlertPreference)
- [x] `contracts/B11-billing-credits.ts` - TypeScript interfaces for B11 API (with normalization utilities + mock data)
- [x] `contracts/B18-health-status.ts` - TypeScript interfaces for B18 API (with normalization utilities + mock data)
- [x] `quickstart.md` - Quick start guide for integrators (installation, basic usage, advanced patterns)

**Tasks**:

### 1. Data Model (`data-model.md`)

Define entities used by components:

**Alert Entity**:
```typescript
interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  dismissible: boolean;
  neverShowAgain?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**ResourceUsageData Entity**:
```typescript
interface ResourceUsageData {
  value: number;
  max: number;
  label: string;
  unit?: string;
  lastUpdated?: Date;
}
```

**HealthStatus Entity**:
```typescript
interface HealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  details?: string;
  lastChecked: Date;
}
```

**AlertPreference Entity** (localStorage):
```typescript
interface AlertPreference {
  alertId: string;
  dismissed: boolean;
  timestamp: Date;
  neverShowAgain: boolean;
}
```

### 2. API Contracts (`contracts/`)

Create TypeScript interfaces matching B11/B18 API responses:

**`contracts/B11-billing-credits.ts`**:
```typescript
export interface CreditUsageResponse {
  credits: {
    used: number;
    limit: number;
    currency: string;
  };
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    timestamp: string;
  }>;
  lastUpdated: string;
}
```

**`contracts/B18-health-status.ts`**:
```typescript
export interface HealthStatusResponse {
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    message?: string;
    lastCheck: string;
  }>;
  overall: 'healthy' | 'degraded' | 'down';
}
```

### 3. Component Prop Interfaces

Define public API for all components (documented in `data-model.md`):

- `AlertProps`
- `ResourceUsageBarProps`
- `HealthStatusProps`
- `BadgeProps`
- `ResourceCardProps` (compound component context)
- `AlertStackProps`

### 4. Quick Start Guide (`quickstart.md`)

Create integration guide:
- Installation: `pnpm add @django-core/resource-alerts`
- Peer dependencies: React 18.x, @django-core/design-system
- Basic usage examples (Alert, ResourceUsageBar, HealthStatus)
- Advanced usage (ResourceCard compound component)
- Data fetching with optional hooks (useResourceUsage, useHealthStatus)
- Alert dismissal with localStorage (useAlertDismissal)
- Styling customization via F01 tokens

**Success Criteria**:
- All entities documented with TypeScript interfaces
- API contracts match B11/B18 backend specifications (validated with backend team)
- Component prop interfaces complete and type-safe
- Quick start guide covers common use cases

**Estimated Effort**: 3-4 hours

---

## Phase 2: Agent Context Update

**Objective**: Update AI agent context so GitHub Copilot understands F05 structure and requirements.

**Deliverables**:
- [ ] `.github/copilot-instructions.md` updated with F05 context

**Tasks**:

### 1. Run Agent Context Update Script

```powershell
.\.kittify\scripts\powershell\update-agent-context.ps1 -AgentType copilot
```

This script automatically:
- Scans `kitty-specs/027-resource-display-alerts/spec.md`
- Extracts technology stack, dependencies, constraints
- Updates `.github/copilot-instructions.md`

### 2. Verify Context Update

Manually verify `.github/copilot-instructions.md` includes:
- **Feature Number**: 027-resource-display-alerts (F05)
- **Package Location**: `packages/resource-display-alerts/`
- **Technology Stack**: TypeScript 5.x, React 18.x, Vite, Vitest, Storybook
- **Dependencies**: F01 (design-system - required), F06 (layouts - optional), @django-core/api-client
- **Component Patterns**: Mixed (props-based for primitives, compound for ResourceCard)
- **Testing Requirements**: >90% coverage, Vitest + RTL, Chromatic visual regression, axe-core accessibility
- **Accessibility**: WCAG 2.1 AA, aria-live regions, keyboard navigation
- **Performance**: <20KB bundle, <16ms render, 200-300ms animations
- **Storage**: localStorage for alert dismissal preferences only

### 3. Add Manual Context (if needed)

If script doesn't capture all details, manually add to `.github/copilot-instructions.md`:

```markdown
## F05: Resource Display & Alerts (027-resource-display-alerts)

**Package**: `@django-core/resource-alerts`

**Dependencies**:
- F01 (design-system) - required for all UI components
- F06 (layout primitives) - optional for composition
- @django-core/api-client - for optional polling hooks

**Key Patterns**:
- Components accept data via props (stateless by default)
- Optional hooks: useResourceUsage, useHealthStatus (polling), useAlertDismissal (localStorage)
- Compound component: ResourceCard (React.createContext pattern)
- Zero custom CSS - 100% F01 design tokens
- Animations: 200-300ms fade, respects prefers-reduced-motion

**Testing Strategy**:
- Unit tests: Vitest + React Testing Library (>90% coverage)
- Integration tests: Alert dismiss flow, resource threshold changes, keyboard navigation
- Visual regression: Chromatic (all Storybook stories)
- Accessibility: axe-core (zero critical violations)

**Component API Examples**:
- Alert: `<Alert severity="warning" title="Low Credits" dismissible />`
- ResourceUsageBar: `<ResourceUsageBar value={80} max={100} label="API Credits" />`
- HealthStatus: `<HealthStatus name="Database" status="healthy" />`
- ResourceCard: Compound component with Header/Body/Footer
```

**Success Criteria**:
- GitHub Copilot suggests F05-compliant code when working in `packages/resource-display-alerts/`
- Copilot understands component API patterns (props vs compound)
- Copilot recommends F01 tokens over custom CSS
- Copilot suggests appropriate test patterns (Vitest + RTL)

**Estimated Effort**: 30 minutes

---

## Next Steps (Phase 3+)

After completing Phases 0-2, the implementation plan is ready. Next phases:

**Phase 3: Implementation** (not part of `/spec-kitty.plan` workflow)
- Create package scaffold
- Implement components following data model and contracts
- Write unit tests (TDD approach)
- Create Storybook stories

**Phase 4: Integration Testing**
- Test with B11/B18 API mocks
- Verify localStorage persistence
- Accessibility audit with axe-core
- Chromatic visual regression

**Phase 5: Documentation & Merge**
- Complete package README
- Update docs/features/ with F05 guide
- PR review and approval
- Merge to main

Use `/spec-kitty.tasks` command to generate detailed task breakdown for Phase 3 implementation.
