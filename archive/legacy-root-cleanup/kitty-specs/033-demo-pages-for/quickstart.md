# Quickstart Guide - Feature 033: Demo Pages for Modules 001-030

**Feature Branch**: 033-demo-pages-for
**Target Audience**: Developers implementing or reviewing this feature
**Estimated Setup Time**: 15 minutes

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Module 031 (F10 Demo Shell)** complete and running locally
- ✅ **Module 032 (F10b-Database)** seed data loaded (5 orgs, 20 users, 80 projects)
- ✅ **Backend modules B01-B21** running and accessible at `http://localhost:8000`
- ✅ **Frontend packages F01-F09** published to pnpm workspace
- ✅ Node.js 18+ and pnpm 8+ installed
- ✅ PostgreSQL and Redis running locally

---

## Quick Setup

### 1. Navigate to Demo Shell

```powershell
cd examples/demo-shell
```

### 2. Install Dependencies (if not already done)

```powershell
pnpm install
```

This will install Chart.js 4.x and react-chartjs-2 5.x (new dependencies for this feature).

### 3. Verify Backend is Running

```powershell
# In a separate terminal, from repo root
cd src
python manage.py runserver
```

Visit [http://localhost:8000/api/health/](http://localhost:8000/api/health/) - should return `{"status": "healthy"}`.

### 4. Verify Seed Data Loaded

```powershell
# From repo root
cd src
python manage.py check_seed_data
```

Expected output:
```
✓ 5 organisations found
✓ 20 users found
✓ 80 projects found
✓ 200+ audit events found
Seed data is ready!
```

If seed data is missing, run:
```powershell
python manage.py seed_demo_data
```

### 5. Start Frontend Dev Server

```powershell
# From examples/demo-shell
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173) (Vite default port).

### 6. Login with Demo Account

Navigate to [http://localhost:5173/login](http://localhost:5173/login):

**Admin Account** (full access to all pages):
- Email: `admin@demo.djangocore.app`
- Password: `demo123`

**Viewer Account** (limited access, for permission testing):
- Email: `viewer@demo.djangocore.app`
- Password: `demo123`

---

## Development Workflow

### Project Structure

```
examples/demo-shell/
├── src/
│   ├── pages/                  # ⭐ Demo pages (your work goes here)
│   │   ├── identity/           # P1: Organisations, Projects, Permissions, Profile
│   │   ├── config/             # P1: Audit, Flags, Credits, Preferences
│   │   ├── platform/           # P2: Health, Constitution, Security, Observability, API Docs, Dashboard
│   │   ├── frontend/           # P2: Design System, Auth, Context, Resources, Templates, Theme, Integration
│   │   └── docs/               # P3: Deployment, Documentation, i18n Demo
│   ├── components/             # Shared components (minimal, prefer F01 primitives)
│   ├── hooks/                  # Custom hooks (e.g., useQueryParams)
│   ├── routes/                 # React Router v6 route definitions
│   └── App.tsx                 # Main app with F06 AppShell
├── tests/
│   └── e2e/                    # ⭐ Playwright E2E tests
│       ├── identity/           # Tests for identity pages
│       ├── config/             # Tests for config pages
│       ├── platform/           # Tests for platform pages
│       ├── frontend/           # Tests for frontend pages
│       └── docs/               # Tests for docs pages
├── package.json
├── vite.config.ts
└── playwright.config.ts
```

### Implementation Order

Follow the **Phased Approach** from spec:

**Phase 1: P1 Pages (Critical, Implement First)**
1. `/organisations` (list view)
2. `/organisations/:id` (detail view)
3. `/projects` (list view)
4. `/projects/:id` (detail view)
5. `/permissions` (permissions dashboard)
6. `/profile` (current user profile)
7. `/audit` (audit log with filters)
8. `/features` (feature flags)
9. `/credits` (credits dashboard - WITHOUT chart initially)
10. `/preferences` (user preferences)

**Phase 2: P2 Pages (Important, Implement Second)**
11. `/health` (health check)
12. `/constitution` (constitution dashboard)
13. `/security` (security scorecard)
14. `/observability` (metrics dashboard - WITHOUT charts initially)
15. `/api-docs` (Swagger UI embed)
16. `/dashboard` (main dashboard)
17. `/design-system` (F01 showcase)
18. `/auth-flows` (F02 demo)
19. `/context` (F03 demo)
20. `/resources` (F05 demo)
21. `/templates` (F06 demo)
22. `/theme` (F07 demo)
23. `/integration` (F09 demo)

**Phase 3: P3 Pages (Nice-to-have, Implement Third)**
24. `/tasks` (background tasks)
25. `/notifications` (notifications hub)
26. `/deployment` (deployment status)
27. `/docs` (documentation browser)
28. `/i18n` (i18n demo)

**Phase 4: Chart.js Integration**
29. Add Chart.js to `/credits` page (usage line chart)
30. Add Chart.js to `/observability` page (response times, error rates, connections)

---

## Code Examples

### Creating a New Demo Page

**File**: `src/pages/identity/OrganisationsPage.tsx`

```typescript
import React from 'react';
import { useApi } from '@django-core/integration-patterns';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { Card, Table, Spinner, Alert } from '@django-core/design-system';
import { useSearchParams } from 'react-router-dom';

interface Organisation {
  id: string;
  name: string;
  member_count: number;
  project_count: number;
  credits_balance: number;
}

export function OrganisationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = searchParams.get('sort') || 'name';
  const order = searchParams.get('order') || 'asc';

  const { data, loading, error } = useApi<Organisation[]>(
    `/api/organisations/?sort=${sortBy}&order=${order}`
  );

  if (loading) return <Spinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  return (
    <>
      <PageHeader
        title="Organisations"
        subtitle="View all organisations in the demo environment"
      />
      <PageContent>
        <Card>
          <Table
            columns={[
              { key: 'name', label: 'Name', sortable: true },
              { key: 'member_count', label: 'Members', sortable: true },
              { key: 'project_count', label: 'Projects', sortable: true },
              { key: 'credits_balance', label: 'Credits', sortable: true },
            ]}
            data={data || []}
            onSort={(column, direction) => {
              setSearchParams({ sort: column, order: direction });
            }}
          />
        </Card>
      </PageContent>
    </>
  );
}
```

### Adding Route

**File**: `src/routes/index.tsx`

```typescript
import { Routes, Route } from 'react-router-dom';
import { OrganisationsPage } from '../pages/identity/OrganisationsPage';
// ... other imports

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/organisations" element={<OrganisationsPage />} />
      {/* ... other routes */}
    </Routes>
  );
}
```

### Creating E2E Test

**File**: `tests/e2e/identity/organisations.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Organisations Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@demo.djangocore.app');
    await page.fill('[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('displays 5 seed organisations', async ({ page }) => {
    await page.goto('/organisations');

    // Wait for data to load
    await page.waitForSelector('[data-testid="org-card"]');

    // Verify count
    const count = await page.locator('[data-testid="org-card"]').count();
    expect(count).toBe(5);

    // Verify specific org exists
    await expect(page.locator('text=TechCorp')).toBeVisible();
    await expect(page.locator('text=DataLab Enterprise')).toBeVisible();
  });

  test('allows sorting by member count', async ({ page }) => {
    await page.goto('/organisations');

    // Click "Members" column header
    await page.click('th:has-text("Members")');

    // URL should update
    expect(page.url()).toContain('sort=member_count');

    // First row should have highest member count (DataLab: 8)
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toContainText('DataLab');
  });
});
```

---

## Common Tasks

### Add New Navigation Link

**File**: `src/App.tsx` (or wherever sidebar is configured)

```typescript
const navigationGroups = [
  {
    id: 'identity',
    label: 'Identity',
    expanded: true, // Active category
    items: [
      { id: 'organisations', label: 'Organisations', path: '/organisations', icon: BuildingIcon },
      { id: 'projects', label: 'Projects', path: '/projects', icon: FolderIcon },
      // Add new page here
    ],
  },
  // ... other groups
];
```

### Use URL Query Params

```typescript
import { useSearchParams } from 'react-router-dom';

function MyPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read param
  const filter = searchParams.get('filter') || 'all';

  // Update param (replace mode to avoid history pollution)
  const updateFilter = (newFilter: string) => {
    setSearchParams({ filter: newFilter }, { replace: true });
  };

  return (
    <select value={filter} onChange={(e) => updateFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="active">Active</option>
    </select>
  );
}
```

### Lazy Load Chart.js

```typescript
import React, { Suspense, lazy } from 'react';
import { Spinner } from '@django-core/design-system';

// Lazy load chart component (Chart.js bundle only loads when this page is visited)
const CreditsChart = lazy(() => import('../components/CreditsChart'));

export function CreditsPage() {
  return (
    <>
      <PageHeader title="Credits Dashboard" />
      <PageContent>
        <Suspense fallback={<Spinner />}>
          <CreditsChart />
        </Suspense>
      </PageContent>
    </>
  );
}
```

### Handle Permissions

```typescript
import { useAuth } from '@django-core/auth';

export function PermissionsPage() {
  const { currentUser, hasPermission } = useAuth();

  if (!hasPermission('admin')) {
    return <Alert variant="error">Admin access required</Alert>;
  }

  return (
    <>
      <PageHeader title="Permissions Dashboard" />
      {/* ... admin-only content */}
    </>
  );
}
```

---

## Testing

### Run E2E Tests

```powershell
# Run all tests
pnpm test:e2e

# Run tests for specific category
pnpm test:e2e tests/e2e/identity/

# Run tests in headed mode (see browser)
pnpm test:e2e --headed

# Run tests with retries
pnpm test:e2e --retries=3
```

### Debug E2E Test

```powershell
# Use Playwright inspector
pnpm test:e2e --debug tests/e2e/identity/organisations.spec.ts
```

---

## Performance Monitoring

### Check Bundle Size

```powershell
# Build production bundle
pnpm build

# Analyze bundle (uses rollup-plugin-visualizer)
pnpm analyze
```

Expected results:
- Base bundle (without Chart.js): ~150KB gzipped
- Chart.js chunk (lazy loaded): ~65KB gzipped
- Total: ~215KB gzipped

### Measure Page Load Time

```typescript
// Add to page component for development
useEffect(() => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`Page loaded in ${end - start}ms`);
  };
}, []);
```

Target: <2000ms (95th percentile)

---

## Troubleshooting

### Backend API not responding

**Symptom**: `Failed to fetch` errors in console

**Solution**:
1. Verify backend is running: `curl http://localhost:8000/api/health/`
2. Check CORS settings in Django (should allow `http://localhost:5173`)
3. Check PostgreSQL/Redis are running

### Seed data missing

**Symptom**: Empty lists, "No organisations found"

**Solution**:
```powershell
cd src
python manage.py seed_demo_data
```

### Permission errors (403)

**Symptom**: "Access denied" errors for certain pages

**Solution**:
1. Verify you're logged in: Check `/api/users/me/` returns current user
2. Check user role: Admin sees all, viewer sees limited pages
3. Clear cookies and re-login if session is stale

### Chart.js not loading

**Symptom**: Charts don't render, or bundle is too large

**Solution**:
1. Verify lazy loading: Check Network tab, `chartjs.chunk.js` should only load when visiting chart page
2. Tree-shake unused Chart.js components: Only import what you need
   ```typescript
   import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';
   Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);
   ```

### E2E tests flaky

**Symptom**: Tests pass locally but fail in CI

**Solution**:
1. Add explicit waits: `await page.waitForSelector('[data-testid="org-card"]')`
2. Use Playwright auto-retry: `await expect(locator).toBeVisible({ timeout: 10000 })`
3. Run serially not parallel: `pnpm test:e2e --workers=1`

---

## Next Steps

1. ✅ Read this quickstart guide
2. ⏭️ Set up local environment
3. ⏭️ Implement Phase 1 pages (P1 priority)
4. ⏭️ Write E2E tests for each page
5. ⏭️ Implement Phase 2 pages (P2 priority)
6. ⏭️ Implement Phase 3 pages (P3 priority)
7. ⏭️ Add Chart.js integration
8. ⏭️ Run performance validation (<2s load, <100KB bundle increase)
9. ⏭️ Submit PR with all 24 pages + tests

---

## Useful Links

- **Spec**: [kitty-specs/033-demo-pages-for/spec.md](../spec.md)
- **Plan**: [kitty-specs/033-demo-pages-for/plan.md](../plan.md)
- **Data Model**: [research/data-model.md](../research/data-model.md)
- **API Contracts**: [contracts/README.md](../contracts/README.md)
- **F01 Design System**: `packages/design-system/README.md`
- **F06 Page Templates**: `packages/page-templates/README.md`
- **Module 031**: `examples/demo-shell/README.md`
- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)

---

## Support

If you encounter issues:
1. Check [troubleshooting section](#troubleshooting) above
2. Review spec [edge cases](../spec.md#edge-cases)
3. Check existing module 031 implementation for patterns
4. Ask in #demo-foundation Slack channel
