---
work_package_id: "WP11"
subtasks:
  - "T118"
  - "T119"
  - "T120"
  - "T121"
  - "T122"
  - "T123"
  - "T124"
  - "T125"
  - "T126"
  - "T127"
  - "T128"
  - "T129"
  - "T130"
  - "T131"
title: "Testing Suite & Coverage"
phase: "Phase 2 - Performance & Search"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP11 – Testing Suite & Coverage

## Objectives & Success Criteria

Achieve 90%+ test coverage with comprehensive unit, integration, accessibility, and E2E tests.

**Success Criteria**:
- ✅ 90%+ coverage (lines, branches, functions)
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ All accessibility tests pass (zero axe violations)
- ✅ E2E tests cover critical user flows
- ✅ CI pipeline runs all tests
- ✅ Coverage report published

---

## Context & Constraints

**Purpose**: Ensure robustness and maintainability for long-term use

**References**:
- [spec.md](../spec.md) - NFR-011 (90%+ coverage), NFR-012 (CI integration)
- Constitution Principle IV (Testing): Comprehensive automated test coverage

**Constraints**:
- Must use Jest + React Testing Library
- Must include MSW for API mocking
- Must run in CI (GitHub Actions assumed)

---

## Subtasks & Detailed Guidance

### T118 – Configure Jest coverage thresholds

**Steps**:
1. Update `jest.config.js`:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'jsdom',
     coverageThreshold: {
       global: {
         lines: 90,
         branches: 90,
         functions: 90,
         statements: 90,
       },
     },
     collectCoverageFrom: [
       'src/**/*.{ts,tsx}',
       '!src/**/*.stories.tsx',
       '!src/**/*.d.ts',
       '!src/index.ts', // Re-exports only
     ],
     setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
   };
   ```

**Files**: `jest.config.js`

---

### T119 – Set up MSW for API mocking

**Steps**:
1. Create `__tests__/mocks/handlers.ts`:
   ```typescript
   import { rest } from 'msw';

   export const handlers = [
     rest.get('/api/organisations/', (req, res, ctx) => {
       return res(
         ctx.status(200),
         ctx.json({
           results: [
             { id: '1', name: 'Acme Corp', slug: 'acme' },
             { id: '2', name: 'Beta Inc', slug: 'beta' },
           ],
         })
       );
     }),

     rest.get('/api/organisations/:id/projects/', (req, res, ctx) => {
       const { id } = req.params;

       const projects = id === '1'
         ? [
             { id: 'p1', name: 'Web App', slug: 'web-app', organisationId: '1' },
             { id: 'p2', name: 'Mobile App', slug: 'mobile-app', organisationId: '1' },
           ]
         : [
             { id: 'p3', name: 'Dashboard', slug: 'dashboard', organisationId: '2' },
           ];

       return res(ctx.status(200), ctx.json({ results: projects }));
     }),

     rest.get('/api/context/', (req, res, ctx) => {
       return res(
         ctx.status(200),
         ctx.json({
           organisation: { id: '1', name: 'Acme Corp', slug: 'acme' },
           project: { id: 'p1', name: 'Web App', slug: 'web-app', organisationId: '1' },
         })
       );
     }),

     rest.post('/api/context/', (req, res, ctx) => {
       return res(ctx.status(200), ctx.json({ success: true }));
     }),
   ];
   ```

2. Create `__tests__/mocks/server.ts`:
   ```typescript
   import { setupServer } from 'msw/node';
   import { handlers } from './handlers';

   export const server = setupServer(...handlers);
   ```

3. Create `__tests__/setup.ts`:
   ```typescript
   import '@testing-library/jest-dom';
   import { server } from './mocks/server';

   beforeAll(() => server.listen());
   afterEach(() => server.resetHandlers());
   afterAll(() => server.close());
   ```

**Files**: `__tests__/mocks/handlers.ts`, `__tests__/mocks/server.ts`, `__tests__/setup.ts`

---

### T120 – Write comprehensive provider tests

**Steps**:
1. Create `__tests__/context/ContextSwitcherProvider.test.tsx`:
   ```typescript
   import React from 'react';
   import { render, waitFor } from '@testing-library/react';
   import { ContextSwitcherProvider } from '../../src/context/ContextSwitcherProvider';
   import { useCurrentContext } from '../../src/hooks/useCurrentContext';

   const TestComponent = () => {
     const { context, refresh } = useCurrentContext();
     return (
       <div>
         <div data-testid="org">{context.organisation?.name}</div>
         <div data-testid="project">{context.project?.name}</div>
         <button onClick={refresh}>Refresh</button>
       </div>
     );
   };

   describe('ContextSwitcherProvider', () => {
     it('fetches initial context on mount', async () => {
       const { getByTestId } = render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <TestComponent />
         </ContextSwitcherProvider>
       );

       await waitFor(() => {
         expect(getByTestId('org')).toHaveTextContent('Acme Corp');
         expect(getByTestId('project')).toHaveTextContent('Web App');
       });
     });

     it('provides context switching function', async () => {
       // Test switchContext hook
     });

     it('persists context to localStorage', async () => {
       // Test contextMemory integration
     });

     it('handles API errors gracefully', async () => {
       // Mock 500 error, verify error state
     });

     it('clears project when switching org', async () => {
       // Switch org, verify project reset
     });
   });
   ```

**Files**: `__tests__/context/ContextSwitcherProvider.test.tsx`

---

### T121 – Write comprehensive hook tests

**Steps**:
1. Verify all hooks have tests:
   - `__tests__/hooks/useCurrentContext.test.ts`
   - `__tests__/hooks/useContextSwitcher.test.ts`
   - `__tests__/hooks/useAvailableContexts.test.ts`
   - `__tests__/hooks/useDebouncedValue.test.ts` (from WP09)
   - `__tests__/hooks/useKeyboardShortcut.test.ts` (from WP10)

2. Each hook test should cover:
   - Happy path
   - Error states
   - Loading states
   - Edge cases (empty data, null values)

**Files**: `__tests__/hooks/*.test.ts`

---

### T122 – Write comprehensive component tests

**Steps**:
1. Verify all components have tests:
   - `__tests__/components/ContextIndicator.test.tsx` (from WP05)
   - `__tests__/components/OrganisationPicker.test.tsx` (from WP06)
   - `__tests__/components/ProjectPicker.test.tsx` (from WP07)
   - `__tests__/components/ContextSwitcher.test.tsx` (from WP08)
   - `__tests__/components/VirtualizedList.test.tsx` (from WP09)

2. Each component test should cover:
   - Rendering all states (loading, error, empty, data)
   - User interactions (click, keyboard, search)
   - Props variations
   - Accessibility attributes

**Files**: `__tests__/components/*.test.tsx`

---

### T123 – Write API client tests

**Steps**:
1. Create `__tests__/api/organisationsApi.test.ts`:
   ```typescript
   import { fetchOrganisations } from '../../src/api/organisationsApi';
   import { server } from '../mocks/server';
   import { rest } from 'msw';

   describe('organisationsApi', () => {
     it('fetches organisations successfully', async () => {
       const orgs = await fetchOrganisations();

       expect(orgs).toHaveLength(2);
       expect(orgs[0].name).toBe('Acme Corp');
     });

     it('handles 401 unauthorized', async () => {
       server.use(
         rest.get('/api/organisations/', (req, res, ctx) => {
           return res(ctx.status(401), ctx.json({ detail: 'Unauthorized' }));
         })
       );

       await expect(fetchOrganisations()).rejects.toThrow('Unauthorized');
     });

     it('handles 500 server error', async () => {
       server.use(
         rest.get('/api/organisations/', (req, res, ctx) => {
           return res(ctx.status(500), ctx.json({ detail: 'Server error' }));
         })
       );

       await expect(fetchOrganisations()).rejects.toThrow('Server error');
     });

     it('handles network error', async () => {
       server.use(
         rest.get('/api/organisations/', (req, res, ctx) => {
           return res.networkError('Network error');
         })
       );

       await expect(fetchOrganisations()).rejects.toThrow();
     });
   });
   ```

2. Duplicate for `projectsApi.test.ts` and `contextApi.test.ts`

**Files**: `__tests__/api/organisationsApi.test.ts`, `__tests__/api/projectsApi.test.ts`, `__tests__/api/contextApi.test.ts`

---

### T124 – Write utility tests

**Steps**:
1. Create `__tests__/utils/contextMemory.test.ts`:
   ```typescript
   import { contextMemory } from '../../src/utils/contextMemory';

   describe('contextMemory', () => {
     beforeEach(() => {
       localStorage.clear();
     });

     it('saves context to localStorage', () => {
       const context = {
         organisation: { id: '1', name: 'Acme', slug: 'acme' },
         project: null,
       };

       contextMemory.save(context);

       const stored = localStorage.getItem('django-core:context');
       expect(stored).toBeTruthy();
       expect(JSON.parse(stored!)).toEqual(context);
     });

     it('loads context from localStorage', () => {
       const context = {
         organisation: { id: '1', name: 'Acme', slug: 'acme' },
         project: { id: 'p1', name: 'Web', slug: 'web', organisationId: '1' },
       };

       localStorage.setItem('django-core:context', JSON.stringify(context));

       const loaded = contextMemory.load();
       expect(loaded).toEqual(context);
     });

     it('returns null when no context saved', () => {
       const loaded = contextMemory.load();
       expect(loaded).toBeNull();
     });

     it('clears context from localStorage', () => {
       contextMemory.save({ organisation: null, project: null });
       contextMemory.clear();

       expect(localStorage.getItem('django-core:context')).toBeNull();
     });

     it('handles corrupted localStorage data', () => {
       localStorage.setItem('django-core:context', 'invalid json');

       const loaded = contextMemory.load();
       expect(loaded).toBeNull();
     });
   });
   ```

**Files**: `__tests__/utils/contextMemory.test.ts`

---

### T125 [P] – Run coverage report

**Steps**:
1. Run tests with coverage:
   ```bash
   pnpm test -- --coverage
   ```

2. Generate HTML report:
   ```bash
   pnpm test -- --coverage --coverageReporters=html
   ```

3. Open `coverage/index.html` and verify:
   - Overall coverage ≥90%
   - All files ≥80% (allow exceptions for trivial files)
   - Identify untested branches

**Files**: N/A (test run)

**Parallel?**: Yes

---

### T126 [P] – Write E2E tests with Playwright

**Steps**:
1. Install Playwright:
   ```bash
   pnpm add -D @playwright/test
   npx playwright install
   ```

2. Create `e2e/context-switcher.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Context Switcher E2E', () => {
     test('switches organisation', async ({ page }) => {
       await page.goto('http://localhost:3000');

       await page.click('[aria-label="Change organisation"]');
       await page.click('text=Beta Inc');

       await expect(page.locator('[data-testid="org"]')).toHaveText('Beta Inc');
     });

     test('switches project', async ({ page }) => {
       await page.goto('http://localhost:3000');

       await page.click('[aria-label="Change project"]');
       await page.click('text=Mobile App');

       await expect(page.locator('[data-testid="project"]')).toHaveText('Mobile App');
     });

     test('searches organisations', async ({ page }) => {
       await page.goto('http://localhost:3000');

       await page.click('[aria-label="Change organisation"]');
       await page.fill('[placeholder="Search organisations..."]', 'acme');

       await expect(page.locator('text=Acme Corp')).toBeVisible();
       await expect(page.locator('text=Beta Inc')).not.toBeVisible();
     });

     test('uses keyboard shortcut Cmd+K', async ({ page }) => {
       await page.goto('http://localhost:3000');

       await page.keyboard.press('Meta+KeyK');

       await expect(page.locator('[role="listbox"]')).toBeVisible();
     });

     test('persists context on reload', async ({ page }) => {
       await page.goto('http://localhost:3000');

       await page.click('[aria-label="Change organisation"]');
       await page.click('text=Beta Inc');

       await page.reload();

       await expect(page.locator('[data-testid="org"]')).toHaveText('Beta Inc');
     });
   });
   ```

**Files**: `e2e/context-switcher.spec.ts`, `playwright.config.ts`

**Parallel?**: Yes

**Notes**: Requires running dev server; defer to CI

---

### T127 – Identify and test edge cases

**Steps**:
1. Create `__tests__/edge-cases/edge-cases.test.tsx`:
   ```typescript
   describe('Edge cases', () => {
     it('handles empty organisation list', async () => {
       // Mock empty results, verify EmptyState shown
     });

     it('handles organisation with no projects', async () => {
       // Mock org with no projects, verify ProjectPicker disabled or empty
     });

     it('handles extremely long names (100+ characters)', async () => {
       // Mock org with 150-char name, verify truncation
     });

     it('handles 1000+ organisations', async () => {
       // Mock 1000 orgs, verify virtualization activates, performance acceptable
     });

     it('handles rapid context switching', async () => {
       // Switch org 10 times rapidly, verify no race conditions
     });

     it('handles concurrent API calls', async () => {
       // Trigger multiple fetches simultaneously, verify correct state
     });

     it('handles localStorage quota exceeded', async () => {
       // Fill localStorage, verify graceful fallback
     });

     it('handles missing CSRF token', async () => {
       // Remove token, verify error handling
     });
   });
   ```

**Files**: `__tests__/edge-cases/edge-cases.test.tsx`

---

### T128 – Add smoke tests

**Steps**:
1. Create `__tests__/smoke/smoke.test.tsx`:
   ```typescript
   import React from 'react';
   import { render } from '@testing-library/react';
   import {
     ContextSwitcherProvider,
     ContextSwitcher,
     useCurrentContext,
     useContextSwitcher,
     useAvailableContexts,
   } from '../../src';

   describe('Smoke tests', () => {
     it('exports all public APIs', () => {
       expect(ContextSwitcherProvider).toBeDefined();
       expect(ContextSwitcher).toBeDefined();
       expect(useCurrentContext).toBeDefined();
       expect(useContextSwitcher).toBeDefined();
       expect(useAvailableContexts).toBeDefined();
     });

     it('renders without crashing', () => {
       render(
         <ContextSwitcherProvider routerAdapter={mockRouterAdapter}>
           <ContextSwitcher />
         </ContextSwitcherProvider>
       );
     });

     it('package builds successfully', async () => {
       // Run `pnpm build` in test, verify dist/ created
       // This is a CI test, not Jest
     });
   });
   ```

**Files**: `__tests__/smoke/smoke.test.tsx`

---

### T129 – Configure CI pipeline

**Steps**:
1. Create `.github/workflows/test.yml`:
   ```yaml
   name: Tests

   on:
     push:
       branches: [main, develop]
     pull_request:
       branches: [main, develop]

   jobs:
     test:
       runs-on: ubuntu-latest

       steps:
         - uses: actions/checkout@v3

         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'pnpm'

         - name: Install pnpm
           run: npm install -g pnpm

         - name: Install dependencies
           run: pnpm install --frozen-lockfile

         - name: Run tests
           run: pnpm test -- --coverage

         - name: Upload coverage
           uses: codecov/codecov-action@v3
           with:
             files: ./coverage/lcov.info
             flags: unittests
             name: context-switcher

         - name: Check coverage threshold
           run: |
             if ! pnpm test -- --coverage --coverageThreshold='{"global":{"lines":90}}'; then
               echo "Coverage below 90%"
               exit 1
             fi
   ```

**Files**: `.github/workflows/test.yml`

**Notes**: Adjust path if package is in monorepo

---

### T130 – Add test documentation

**Steps**:
1. Create `TESTING.md`:
   ```markdown
   # Testing Guide

   ## Running Tests

   ```bash
   # All tests
   pnpm test

   # With coverage
   pnpm test -- --coverage

   # Watch mode
   pnpm test -- --watch

   # Specific file
   pnpm test -- ContextSwitcher.test.tsx
   ```

   ## Test Structure

   - `__tests__/hooks/` - Hook tests
   - `__tests__/components/` - Component tests
   - `__tests__/api/` - API client tests
   - `__tests__/utils/` - Utility tests
   - `__tests__/accessibility/` - Accessibility tests
   - `__tests__/integration/` - Integration tests
   - `__tests__/edge-cases/` - Edge case tests
   - `e2e/` - E2E tests (Playwright)

   ## Coverage Requirements

   - Overall: 90%+
   - Per file: 80%+
   - CI fails if coverage drops below threshold

   ## Writing Tests

   - Use React Testing Library for component tests
   - Use MSW for API mocking
   - Use jest-axe for accessibility tests
   - Use Playwright for E2E tests

   ## CI Pipeline

   Tests run automatically on push to main/develop and on all PRs.
   ```

**Files**: `TESTING.md`

---

### T131 [P] – Review and fill coverage gaps

**Steps**:
1. Run coverage report (T125)
2. Identify files/branches below threshold
3. Write additional tests to reach 90%+
4. Focus on:
   - Error handling paths
   - Edge cases (empty data, long strings, large lists)
   - Conditional logic branches
   - Event handlers

**Files**: Various test files

**Parallel?**: Yes

---

## Risks & Mitigations

**Risk**: E2E tests flaky in CI
**Mitigation**: Use Playwright built-in retry, increase timeouts, mock backend

**Risk**: Coverage drops with new features
**Mitigation**: CI blocks merges if coverage <90%, enforce via branch protection

**Risk**: Tests slow (>5 minutes)
**Mitigation**: Parallelize tests, use `--maxWorkers=4`, cache dependencies

---

## Definition of Done Checklist

- [ ] Jest coverage thresholds configured (90%+)
- [ ] MSW set up for API mocking
- [ ] Comprehensive provider tests
- [ ] All hook tests complete
- [ ] All component tests complete
- [ ] API client tests (success + all error scenarios)
- [ ] Utility tests (contextMemory)
- [ ] Coverage report generated and reviewed
- [ ] E2E tests with Playwright
- [ ] Edge case tests
- [ ] Smoke tests
- [ ] CI pipeline configured
- [ ] Test documentation (TESTING.md)
- [ ] Coverage gaps filled (90%+ achieved)

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
