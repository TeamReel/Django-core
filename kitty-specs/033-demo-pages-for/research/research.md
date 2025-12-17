# Research Notes - Feature 033: Demo Pages for Modules 001-030

**Feature Branch**: 033-demo-pages-for
**Research Date**: 2025-12-17
**Status**: Complete

---

## Research Questions & Decisions

### 1. Sidebar Navigation Structure

**Question**: How should 24 demo pages be organized in collapsible sidebar navigation?

**Decision**: Collapsible accordion groups where active category is expanded, others collapsed by default, with manual toggle capability.

**Rationale**:
- Reduces cognitive load for 24+ navigation items
- Modern pattern seen in GitHub, VS Code, Stripe, Vercel docs
- Keyboard accessible (↑↓ navigate, → expand, ← collapse)
- State can persist in localStorage
- Scalable to 50+ pages if needed

**Alternatives Considered**:
- Always-expanded flat list: Too long, poor UX with 24 items
- Two-level hierarchy with non-clickable headers: Less interactive, harder to collapse
- Manual refresh only: Misses "live dashboard" effect

**Implementation Notes**:
- Use F01 Accordion component if available, or build with disclosure pattern
- Store expansion state in localStorage key `demo-sidebar-state`
- Default: expand category matching current route

---

### 2. Observability Dashboard Polling Interval

**Question**: What refresh rate should observability metrics use?

**Decision**: 30-second polling interval for automatic metric updates.

**Rationale**:
- Balanced approach for demo environment (not too aggressive, not too stale)
- Industry standard for non-critical dashboards (Grafana/Datadog use 30s-1min)
- Good UX: User sees changes within acceptable time without questioning if it's working
- Server-friendly: Not intensive for development PostgreSQL/Redis setup
- Demo-appropriate: Shows "live" capability without production monitoring overhead

**Alternatives Considered**:
- 5 seconds: Too aggressive for demo, feels like production monitoring, higher server load
- 60 seconds: Too slow, feels stale, poor demo experience
- Manual refresh only: Loses "live dashboard" demonstration value

**Implementation Notes**:
- Use `setInterval` with 30000ms in useEffect
- Clear interval on component unmount
- Show "Last updated: X seconds ago" timestamp
- Provide manual refresh button for immediate updates

---

### 3. Page-Specific State Management

**Question**: How should page-specific UI state (filters, sorting, pagination) be managed?

**Decision**: URL query params using React Router v6 `useSearchParams` hook.

**Rationale**:
- **Shareable links**: Stakeholders can share filtered views (e.g., "Look at these audit events")
- **Browser navigation**: Back/forward button works intuitively
- **React Router native**: Built-in hook, zero additional dependencies
- **Modern pattern**: Standard in GitHub, Linear, Notion, Vercel dashboards
- **Demo-appropriate**: URLs show intent clearly (e.g., `/audit?type=authentication&date=last-7-days`)
- **Simple**: No extra state management libraries needed

**Alternatives Considered**:
- Local component state (useState): Doesn't work with refresh, no shareable URLs
- React contexts per feature: Overkill for demo, adds unnecessary complexity
- Module 031 existing pattern: Likely doesn't have list filtering yet (basic shell)

**Implementation Notes**:
- Use `useSearchParams()` hook from react-router-dom
- Parse query params on component mount
- Update URL when filters change (replace, not push, to avoid polluting history)
- Provide sensible defaults if query params are invalid/missing

**Example**:
```typescript
const [searchParams, setSearchParams] = useSearchParams();
const eventType = searchParams.get('type') || 'all';
const dateRange = searchParams.get('date') || 'last-7-days';

// Update filter
const handleFilterChange = (type: string) => {
  setSearchParams({ type, date: dateRange });
};
```

---

### 4. File System Organization

**Question**: How should 24 demo pages be organized in the file system?

**Decision**: Grouped by category matching sidebar structure (identity/, config/, platform/, frontend/, docs/).

**Rationale**:
- **Scalable**: Easier to find pages as count grows (identity/ has 6 pages, not 24 in one folder)
- **Mirrors navigation**: Developer mental model matches sidebar groups
- **Modern pattern**: Standard in Next.js, Remix, enterprise React apps
- **Clear ownership**: Each category can have dedicated tests, README, types
- **Supports lazy loading**: Can code-split by category easily

**Alternatives Considered**:
- Flat structure: Works for <10 pages, becomes unwieldy at 24+
- Grouped by module (b06-organisations/): Couples to backend numbering, less intuitive
- Hybrid (flat + groups): Inconsistent, harder to maintain conventions

**Implementation Notes**:
- Structure:
  ```
  examples/demo-shell/src/pages/
  ├── identity/
  │   ├── OrganisationsPage.tsx
  │   ├── OrganisationDetailPage.tsx
  │   ├── ProjectsPage.tsx
  │   ├── ProjectDetailPage.tsx
  │   ├── PermissionsPage.tsx
  │   └── ProfilePage.tsx
  ├── config/
  │   ├── AuditLogPage.tsx
  │   ├── FeatureFlagsPage.tsx
  │   ├── CreditsPage.tsx
  │   └── PreferencesPage.tsx
  ├── platform/
  │   ├── HealthCheckPage.tsx
  │   ├── ConstitutionPage.tsx
  │   ├── SecurityPage.tsx
  │   ├── ObservabilityPage.tsx
  │   ├── ApiDocsPage.tsx
  │   └── DashboardPage.tsx
  ├── frontend/
  │   ├── DesignSystemPage.tsx
  │   ├── AuthFlowsPage.tsx
  │   ├── ContextSwitcherPage.tsx
  │   ├── ResourceDisplayPage.tsx
  │   ├── TemplatesPage.tsx
  │   ├── ThemePage.tsx
  │   └── IntegrationPatternsPage.tsx
  └── docs/
      ├── DeploymentPage.tsx
      ├── DocumentationPage.tsx
      └── I18nDemoPage.tsx
  ```
- E2E tests mirror structure: `tests/e2e/identity/organisations.spec.ts`
- Barrel exports per category: `identity/index.ts` exports all identity pages

---

## Technology Stack Confirmation

### Frontend (Already Decided in Spec)

- **React 18.2.0**: UI framework (module 031 baseline)
- **TypeScript 5.6.2**: Type safety (module 031 baseline)
- **React Router v6**: Client-side routing with useSearchParams (module 031 baseline)
- **Vite 5.4.8**: Build tool with code-splitting (module 031 baseline)
- **Chart.js 4.x**: Canvas-based charting (~60KB gzipped)
- **react-chartjs-2 5.x**: React wrapper (~5KB gzipped)

### Frontend Packages (All ✅ COMPLETE)

- **F01 Design System**: All UI primitives (Button, Input, Card, Table, Alert, Badge, etc.)
- **F06 Page Templates**: AppShell, PageHeader, PageContent, Sidebar, Breadcrumbs
- **F03 Context Switcher**: Organisation/project selector with header propagation
- **F07 Theme System**: Light/dark mode toggle, theme persistence
- **F09 Integration Patterns**: Error boundaries, API client utilities
- **F05 Resource Display**: List views, detail views, empty states

### Backend (All ✅ COMPLETE)

- **B01-B04**: Health, constitution, security, i18n APIs
- **B05**: Authentication (session-based)
- **B06-B07**: Organisations, projects APIs
- **B08**: Authorization (viewer/member/admin roles)
- **B09-B12**: Audit, feature flags, credits, preferences APIs
- **B13-B18**: API docs, dashboard, tasks, notifications, observability
- **B19, B21**: Deployment, documentation metadata
- **Module 032**: Seed data (5 orgs, 20 users, 80 projects, 200+ events)

### Testing

- **Playwright**: E2E testing framework (module 031 baseline)
- **@playwright/test**: Test runner with auto-waiting, retry logic

---

## Best Practices Research

### React Router v6 useSearchParams Patterns

**Source**: React Router v6 official docs, enterprise React patterns

**Key Patterns**:
1. **Controlled filters**:
   ```typescript
   const [searchParams, setSearchParams] = useSearchParams();
   const filter = searchParams.get('status') || 'all';

   // Replace, don't push (avoid history pollution)
   setSearchParams({ status: 'active' }, { replace: true });
   ```

2. **Multiple params**:
   ```typescript
   const updateFilters = (updates: Record<string, string>) => {
     const newParams = new URLSearchParams(searchParams);
     Object.entries(updates).forEach(([key, value]) => {
       if (value) newParams.set(key, value);
       else newParams.delete(key);
     });
     setSearchParams(newParams, { replace: true });
   };
   ```

3. **Validation**:
   ```typescript
   const validEventTypes = ['login', 'logout', 'auth', 'all'];
   const eventType = validEventTypes.includes(searchParams.get('type') || '')
     ? searchParams.get('type')
     : 'all';
   ```

### Chart.js 4.x Integration

**Source**: Chart.js v4 docs, react-chartjs-2 GitHub

**Key Patterns**:
1. **Lazy loading**:
   ```typescript
   const LazyObservabilityPage = React.lazy(() => import('./platform/ObservabilityPage'));

   // In routes
   <Route path="/observability" element={
     <Suspense fallback={<SkeletonLoader />}>
       <LazyObservabilityPage />
     </Suspense>
   } />
   ```

2. **Theme-aware charts**:
   ```typescript
   import { useTheme } from '@django-core/theme-system';

   const { theme } = useTheme();
   const chartOptions = {
     ...baseOptions,
     scales: {
       x: { ticks: { color: theme === 'dark' ? '#fff' : '#000' } },
       y: { ticks: { color: theme === 'dark' ? '#fff' : '#000' } }
     }
   };
   ```

3. **Auto-updating data**:
   ```typescript
   useEffect(() => {
     const interval = setInterval(async () => {
       const data = await fetchMetrics();
       setChartData(data);
     }, 30000); // 30 seconds

     return () => clearInterval(interval);
   }, []);
   ```

### Playwright E2E Testing for Multi-Page Apps

**Source**: Playwright docs, enterprise test patterns

**Key Patterns**:
1. **Page Object Model** (optional for simple demo pages):
   ```typescript
   // tests/e2e/pages/OrganisationsPage.ts
   export class OrganisationsPage {
     constructor(private page: Page) {}

     async navigate() {
       await this.page.goto('/organisations');
     }

     async getOrgCount() {
       return await this.page.locator('[data-testid="org-card"]').count();
     }
   }
   ```

2. **Role-based fixtures**:
   ```typescript
   // tests/e2e/fixtures.ts
   export const test = base.extend({
     adminPage: async ({ page }, use) => {
       await page.goto('/login');
       await page.fill('[name="email"]', 'admin@demo.djangocore.app');
       await page.fill('[name="password"]', 'demo123');
       await page.click('button[type="submit"]');
       await use(page);
     }
   });
   ```

3. **Seed data validation**:
   ```typescript
   test('displays 5 seed organisations', async ({ page }) => {
     await page.goto('/organisations');

     // Wait for data to load
     await page.waitForSelector('[data-testid="org-card"]');

     // Verify count
     const count = await page.locator('[data-testid="org-card"]').count();
     expect(count).toBe(5);

     // Verify specific org exists
     await expect(page.locator('text=TechCorp')).toBeVisible();
   });
   ```

---

## Architecture Decisions

### AD-001: Collapsible Accordion Navigation

**Context**: 24 demo pages need intuitive navigation without overwhelming the sidebar.

**Decision**: Use collapsible accordion groups with active category expanded by default.

**Consequences**:
- ✅ Scalable to 50+ pages
- ✅ Reduces cognitive load
- ✅ Modern UX pattern
- ⚠️ Requires localStorage for state persistence
- ⚠️ Needs keyboard navigation implementation (↑↓→←)

**Status**: Accepted

---

### AD-002: URL Query Params for Page State

**Context**: Pages need filters, sorting, pagination that should be shareable and browser-navigation-friendly.

**Decision**: Use React Router v6 `useSearchParams` for all page-specific UI state.

**Consequences**:
- ✅ Shareable filtered views
- ✅ Browser back/forward works correctly
- ✅ Zero additional dependencies
- ⚠️ URL can become long with many filters (acceptable for demo)
- ⚠️ Requires validation of query params

**Status**: Accepted

---

### AD-003: Category-Based File Organization

**Context**: 24 pages need logical file system organization for developer navigation.

**Decision**: Group pages by sidebar category (identity/, config/, platform/, frontend/, docs/).

**Consequences**:
- ✅ Mirrors user-facing navigation structure
- ✅ Scales to 50+ pages
- ✅ Clear ownership boundaries
- ⚠️ Slightly deeper import paths
- ⚠️ Requires barrel exports per category

**Status**: Accepted

---

### AD-004: 30-Second Polling for Observability

**Context**: Observability dashboard needs to show "live" metrics without overloading demo backend.

**Decision**: Use 30-second polling interval with manual refresh button.

**Consequences**:
- ✅ Demonstrates live dashboard capability
- ✅ Balanced server load
- ✅ Industry-standard interval
- ⚠️ Not truly real-time (acceptable for demo)
- ⚠️ Requires cleanup on unmount

**Status**: Accepted

---

## Open Questions

None - all planning questions resolved during discovery.

---

## Next Steps

1. ✅ Research complete
2. ⏭️ Generate data-model.md (entity mapping)
3. ⏭️ Generate API contracts (OpenAPI specs already exist in B13)
4. ⏭️ Create quickstart.md (developer onboarding)
5. ⏭️ Update agent context with planning decisions
