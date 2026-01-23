# Research: Demo Shell & Playground Site (F10)
*Path: kitty-specs/031-demo-shell-playground/research.md*

**Phase**: 0 - Research & Unknowns Resolution
**Date**: 2025-12-14
**Status**: Complete

## Research Questions & Answers

### Q1: Why Vite + React 18 + TypeScript for the demo frontend?

**Context**: The spec mentions "modern frontend tooling" (A-004) but doesn't prescribe a specific stack. Planning Q1 explored Vite vs Next.js vs Create React App vs custom setup.

**Answer**: **Vite + React 18 + TypeScript** selected.

**Rationale**:
- **Alignment with existing patterns**: F07 (theme-system) and F09 (integration-guides) examples already use Vite + React 18 + TypeScript, ensuring consistency across documentation and demo code
- **Fast dev experience**: Vite's HMR (<100ms updates) and fast cold starts (<2s) support the FR-041 requirement ("local dev should start in <30 seconds")
- **Modern tooling**: Native ES modules, optimized builds, first-class TypeScript support without extra configuration
- **Simplicity**: Zero-config for React + TypeScript, no Next.js server complexity needed (demo is pure SPA consuming REST APIs)
- **Ecosystem maturity**: React 18 stable, Vite 5.x production-ready, large plugin ecosystem

**Alternatives considered**:
- **Next.js**: Rejected - too heavyweight for a pure client-side demo, introduces server-side rendering complexity unnecessary for FR-041-045 requirements
- **Create React App**: Rejected - slower build times, deprecated tooling (Webpack), not aligned with F07/F09 examples
- **Custom Webpack**: Rejected - maintenance burden, reinventing Vite's optimizations

**Impact on implementation**:
- `vite.config.ts`: React plugin, port 3000, proxy `/api` to backend (localhost:8000 in dev)
- `tsconfig.json`: Strict mode, paths alias for `@/` → `src/`
- Build output: `dist/` with static assets, served via nginx in Docker

---

### Q2: Why Playwright for E2E smoke tests instead of Cypress or HTTP-only tests?

**Context**: FR-038 requires "pytest + playwright (or similar)" for CI smoke tests. Planning Q2 evaluated Playwright vs Cypress vs pure HTTP integration tests.

**Answer**: **Playwright** selected.

**Rationale**:
- **Alignment with spec recommendation**: A-004 mentions Playwright as the preferred tool with fallback strategy
- **TypeScript-first**: Playwright test runner uses TypeScript natively, matches frontend stack (Vite + React 18 + TS)
- **Determinism features**: Built-in tracing, auto-wait, stable selectors reduce flakiness (FR-040: "tests must fail the build if contracts broken")
- **Browser coverage**: Single API for Chromium/Firefox/WebKit if needed (demo targets modern browsers per Technical Context)
- **Ecosystem fit**: No second test framework needed - Vitest for units, Playwright for E2E, pytest for backend seed data validation

**Alternatives considered**:
- **Cypress**: Rejected - requires separate test runner, more opinionated, less aligned with TypeScript-first stack
- **Pure HTTP tests (pytest + requests)**: Rejected - misses frontend behavior (routing, context switching UI, 403/404 pages), doesn't validate browser-level integration
- **Defer E2E tests**: Rejected - FR-038 mandates CI smoke tests, critical for validating core contracts (auth, context, permissions)

**Configuration decisions**:
- `playwright.config.ts`:
  - Base URL: `http://localhost:3000` (Vite dev server in CI)
  - Retries: 0 (determinism over flakiness masking)
  - Timeout: 30s per test (reasonable for auth + API calls)
  - Tracing: `retain-on-failure` (debug CI failures)
  - Browsers: Chromium only (sufficient for smoke tests, reduces CI time)
- Test structure: `tests/e2e/auth-flow.spec.ts`, `tests/e2e/context-permissions.spec.ts` (aligns with P1 user stories)

**Impact on FR-038/FR-040**:
- CI workflow `.github/workflows/ci-demo-smoke.yml`: Install deps → Start backend → Start frontend → Run Playwright → Upload trace artifacts
- Build failure if tests fail (GitHub Actions: `if: failure()` uploads traces for debugging)

---

### Q3: Why Docker Compose for staging deployment instead of Vercel/Netlify or K8s?

**Context**: FR-042 mentions "using existing B19 deployment templates (Docker, docker-compose)". Planning Q3 evaluated Docker Compose vs separate static hosting vs Kubernetes.

**Answer**: **Docker Compose** selected.

**Rationale**:
- **Alignment with B19 templates**: Existing `docker-compose.staging.yml` provides proven patterns for backend services; demo extends this with frontend service
- **Consistency**: Same container images used in local dev (`docker-compose.demo.yml`), CI, and staging - eliminates "works on my machine" issues
- **Zero local setup for reviewers**: FR-043 requires "staging accessible to reviewers without local setup" - single staging URL (e.g., `https://demo-staging.example.com`) achieves this
- **Simplicity**: No CORS complexity (nginx proxies `/api` to backend), no separate hosting platform API keys, no cross-domain cookie issues
- **Integration validation**: Staging deployment validates full stack (frontend build → nginx → backend APIs → PostgreSQL) in production-like environment

**Alternatives considered**:
- **Vercel/Netlify/Cloudflare Pages**: Rejected - requires CORS configuration, separate backend deployment, adds hosting platform dependency, doesn't leverage B19 templates
- **Kubernetes**: Rejected - overkill for demo (no high availability needed), higher complexity than Docker Compose, violates "minimal scope" principle (Gate 31.5)
- **Manual staging setup**: Rejected - doesn't meet FR-043 (reviewers need URL, not `docker compose up` instructions)

**Implementation details**:
- **Multi-stage Dockerfile**:
  ```dockerfile
  # Stage 1: Build frontend
  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY package.json pnpm-lock.yaml ./
  RUN corepack enable && pnpm install --frozen-lockfile
  COPY . .
  RUN pnpm build

  # Stage 2: Serve with nginx
  FROM nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  ```

- **docker-compose.staging.yml update**:
  ```yaml
  services:
    demo-shell:
      build:
        context: ./examples/demo-shell
        dockerfile: Dockerfile
      ports:
        - "8080:80"
      depends_on:
        - backend
      environment:
        - API_BASE_URL=http://backend:8000
      networks:
        - app-network
  ```

- **nginx.conf**:
  - Serve `/` → static files from `/usr/share/nginx/html`
  - Proxy `/api/*` → `http://backend:8000/api/` (backend service in Docker Compose network)
  - SPA fallback: All unmatched routes → `index.html` (client-side routing)

**Impact on FR-042/FR-043**:
- Local dev: `cd examples/demo-shell && pnpm dev` (Vite dev server, backend on localhost:8000)
- CI: `docker compose -f docker-compose.demo.yml up` (full stack for Playwright tests)
- Staging: `docker compose -f docker-compose.staging.yml up demo-shell` (reviewers access via stable URL)

---

## Best Practices & Patterns

### Frontend Architecture Patterns (from F07/F09)

**F09 Integration Guides**: Examples show Vite + React 18 + TypeScript as reference implementation. Demo follows same patterns to serve as "living integration guide" (A-007).

**Key patterns to follow**:

1. **Auth integration** (F02 + B05):
   - `@django-core/auth` exports `AuthProvider`, `useAuth`, `ProtectedRoute`
   - Demo wraps `<App>` with `<AuthProvider apiClient={...}>`
   - Login page uses `useAuth()` hook: `const { login, error, isLoading } = useAuth()`
   - Protected routes use `<ProtectedRoute>` component (redirects to `/login` if unauthenticated)

2. **Context switching** (F03 + B06/B07):
   - `@django-core/context-switcher` exports `ContextProvider`, `useContext`, `ContextSwitcher` component
   - Demo nests `<ContextProvider>` inside `<AuthProvider>` (auth required for context)
   - Top navigation shows `<ContextSwitcher />` component (org/project dropdown)
   - Context changes trigger URL updates: `/orgs/{orgId}/projects/{projectId}/...`
   - API client automatically sends `X-Organization-ID`, `X-Project-ID` headers (F09 pattern)

3. **Permissions** (F03 + B08 - pending from module 26 refactor):
   - `@django-core/permissions` exports `PermissionsProvider`, `usePermissions`, `PermissionGate`
   - Demo wraps app with `<PermissionsProvider>` (fetches `/api/permissions/current/`)
   - Conditional rendering: `<PermissionGate permission="projects.delete">{...}</PermissionGate>`
   - Hook usage: `const { hasPermission } = usePermissions(); if (hasPermission('orgs.admin')) {...}`

4. **Notifications** (F04 + B16/B17):
   - `@django-core/notifications-hub` exports `NotificationsProvider`, `useNotifications`, `NotificationInbox`
   - Demo adds `<NotificationInbox />` to top navigation (badge with unread count)
   - Toast notifications: `const { showToast } = useNotifications(); showToast({ type: 'success', message: 'Saved!' })`

5. **Resource display** (F05 + B11):
   - `@django-core/resource-display-alerts` exports `UsageMeter`, `AlertBanner`, `StatusBadge`
   - Demo dashboard shows: `<UsageMeter current={org.credits_used} max={org.credits_limit} />`
   - Alerts: `<AlertBanner type="warning" message="Low credits" />`

6. **Page templates** (F06):
   - `@django-core/page-templates` exports `AppShell`, `DashboardLayout`, `ListDetailLayout`, `SettingsLayout`
   - Demo pages use: `<AppShell sidebar={<Nav />} header={<TopBar />}>{content}</AppShell>`
   - Consistent navigation, breadcrumbs, responsive behavior across all pages

7. **Theming** (F07):
   - `@django-core/theme-system` exports `ThemeProvider`, `useTheme`, `ThemeToggle`
   - Demo wraps app with `<ThemeProvider initialTheme="light">`
   - Settings page shows: `<ThemeToggle />` (light/dark switcher)
   - All F01 components automatically respect theme tokens

**Why these patterns matter for the demo**:
- **FR-046**: "Demo MUST use F01-F09 packages directly without modification" - following F09 integration patterns ensures correct usage
- **FR-052**: "Demo MUST NOT introduce new abstraction patterns" - reusing F01-F09 primitives avoids custom wrappers
- **A-007**: "Demo serves as living integration guide" - matching F09 examples validates those examples are correct

### Seed Data Strategy

**Goal**: Create minimal, realistic data that exercises all demo flows without bloat (FR-036, S-005).

**Seed data structure** (`src/core/management/commands/seed_demo_data.py`):

```python
# 5 users with different roles
users = [
    {"email": "admin@example.com", "is_superuser": True},  # Global admin
    {"email": "alice@example.com"},  # Org admin (TechCorp)
    {"email": "bob@example.com"},    # Org member (TechCorp)
    {"email": "carol@example.com"},  # Org admin (DataLab)
    {"email": "dave@example.com"},   # Org member (DataLab)
]

# 2 organisations
organisations = [
    {"name": "TechCorp", "slug": "techcorp"},
    {"name": "DataLab", "slug": "datalab"},
]

# 3 projects per org (6 total)
projects = [
    {"name": "Web Platform", "org": "techcorp", "status": "active"},
    {"name": "Mobile App", "org": "techcorp", "status": "active"},
    {"name": "Legacy API", "org": "techcorp", "status": "archived"},
    {"name": "ML Pipeline", "org": "datalab", "status": "active"},
    {"name": "Data Warehouse", "org": "datalab", "status": "active"},
    {"name": "Analytics Dashboard", "org": "datalab", "status": "archived"},
]

# Memberships & permissions (B08 hierarchical ACL)
memberships = [
    {"user": "alice@example.com", "org": "techcorp", "role": "admin"},
    {"user": "bob@example.com", "org": "techcorp", "role": "member"},
    {"user": "carol@example.com", "org": "datalab", "role": "admin"},
    {"user": "dave@example.com", "org": "datalab", "role": "member"},
]

# Usage/credits (B11 transactions)
credits = [
    {"org": "techcorp", "balance": 1000, "limit": 5000},
    {"org": "datalab", "balance": 250, "limit": 1000},  # Low credits (triggers alert)
]

# Notifications (B16/B17)
notifications = [
    {"user": "alice@example.com", "type": "info", "message": "Welcome to TechCorp!", "read": False},
    {"user": "carol@example.com", "type": "warning", "message": "Low credits warning", "read": False},
]
```

**Why this data set**:
- **Multi-tenancy validation**: Alice/Bob in TechCorp, Carol/Dave in DataLab (no cross-tenant leaks)
- **Permission scenarios**: Admins can edit projects, members cannot (P1 story 3)
- **Context switching**: Users can switch between orgs/projects in UI (P1 story 2)
- **Resource display**: TechCorp has healthy credits, DataLab triggers low-credit alert (P2 story 6)
- **Notifications**: Unread badges visible in inbox (P3 story 7)

**Idempotency**: `seed_demo_data.py` uses `get_or_create()` to allow re-running without duplicates.

---

## Unknowns & Risks

### Unknown 1: F03 @django-core/permissions package availability

**Status**: ⚠️ DEPENDENCY RISK

**Context**: Planning references `@django-core/permissions` from module 26 (B08 refactor), but this package may not be fully implemented yet.

**Mitigation**:
1. **Phase 1 verification**: Check if `packages/permissions/` exists in repository
2. **If exists**: Use `PermissionsProvider`, `usePermissions`, `PermissionGate` as planned
3. **If not exists**: Create minimal facade in `examples/demo-shell/src/lib/permissions.tsx`:
   ```typescript
   // Temporary shim until @django-core/permissions ships
   export const usePermissions = () => {
     const { user } = useAuth();
     const { currentOrg } = useContext();
     return {
       hasPermission: (permission: string) => {
         // Simple role-based check until hierarchical ACL available
         return user.role === 'admin' || user.permissions.includes(permission);
       }
     };
   };
   ```
4. **Document assumption**: A-010 in spec mentions "B08 exposes `/api/permissions/current/`" - verify endpoint exists in B08 implementation

**Impact**: Low - demo can work with basic permission checks initially, migrate to full `@django-core/permissions` when available.

---

### Unknown 2: Staging environment URL and SSL configuration

**Status**: ⚠️ DEPLOYMENT DETAIL

**Context**: FR-043 requires "staging accessible to reviewers without local setup" but doesn't specify staging domain or SSL termination.

**Questions to resolve in Phase 1**:
1. What is the staging domain? (e.g., `demo-staging.example.com`, `staging.django-core.app`)
2. Is SSL termination handled by nginx, external load balancer, or Cloudflare?
3. Do we need Let's Encrypt cert automation in docker-compose.staging.yml?

**Mitigation**:
1. **Check existing staging setup**: Review `docker-compose.staging.yml` for current backend staging configuration
2. **Align with B19 patterns**: If backend staging uses nginx + Let's Encrypt, demo follows same pattern
3. **Document in quickstart.md**: Staging URL and access instructions for reviewers

**Impact**: Low - affects staging deployment instructions only, doesn't block local dev or CI implementation.

---

### Unknown 3: CI environment constraints (GitHub Actions runner specs)

**Status**: ⚠️ CI OPTIMIZATION

**Context**: FR-038 requires smoke tests complete in <10 minutes. Playwright tests involve backend + frontend + browser automation.

**Variables affecting CI time**:
- GitHub Actions runner: 2-core, 7 GB RAM (standard tier)
- Cold start overhead: pnpm install, Docker image pulls, database migrations
- Playwright browser download: ~200 MB Chromium binary

**Optimization strategies**:
1. **Cache pnpm store**: `.github/workflows/ci-demo-smoke.yml` uses `actions/setup-node@v4` with `cache: 'pnpm'`
2. **Parallel install**: `pnpm install --frozen-lockfile --prefer-offline` (uses cache first)
3. **Docker layer caching**: Use `docker/build-push-action` with BuildKit cache
4. **Single browser**: Chromium only (no Firefox/WebKit) reduces Playwright install time by ~60%
5. **Selective tests**: Tag smoke tests `@smoke`, run only critical journeys (auth + context), skip P2/P3 stories in CI

**Measurement plan**:
- Phase 1 implementation: Add basic CI workflow
- Phase 2 optimization: If >10 min, apply caching/parallelization strategies above
- Success criteria S-002: "CI smoke tests complete in <10 minutes" - validate in PR

**Impact**: Medium - may require CI workflow iteration if initial runs exceed time budget.

---

## Research Artifacts

### Vite Configuration Research

**Source**: Vite documentation, F07 theme-system example

**Key findings**:
- React plugin: `@vitejs/plugin-react` enables Fast Refresh (HMR)
- Proxy config: `server.proxy['/api']` forwards API requests to Django backend (avoids CORS in dev)
- Build optimization: `build.rollupOptions.output.manualChunks` splits F01-F09 packages into separate chunks (improves caching)

**Example vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'design-system': ['@django-core/design-system'],
          'features': [
            '@django-core/auth',
            '@django-core/context-switcher',
            '@django-core/notifications-hub',
            '@django-core/resource-display-alerts',
            '@django-core/page-templates',
            '@django-core/theme-system',
          ],
        },
      },
    },
  },
});
```

---

### Playwright Configuration Research

**Source**: Playwright documentation, Chromatic visual testing patterns

**Key findings**:
- `baseURL`: Allows test URLs like `await page.goto('/')` instead of hardcoded `http://localhost:3000/`
- `retries: 0`: Enforces test determinism (flaky tests fail immediately, forcing fixes)
- `trace: 'retain-on-failure'`: Saves trace files only when tests fail (reduces artifact size)
- `use.viewport`: Fixed viewport size (1280x720) ensures consistent screenshots/assertions

**Example playwright.config.ts**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run serially (demos share backend state)
  forbidOnly: !!process.env.CI, // Disallow .only() in CI
  retries: 0, // No retries (determinism over flakiness masking)
  workers: 1, // Single worker (avoid race conditions with seed data)
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Vite cold start
  },
});
```

---

### Docker Compose Research

**Source**: B19 deployment templates, existing `docker-compose.staging.yml`

**Key findings**:
- Multi-stage Dockerfile: Build stage (Node + pnpm) → Runtime stage (nginx) reduces image size
- Health checks: `healthcheck` directive ensures frontend is ready before dependent services start
- Environment variables: `API_BASE_URL` injected at runtime (allows same image for dev/staging/prod)

**Example service definition**:
```yaml
services:
  demo-shell:
    build:
      context: ./examples/demo-shell
      dockerfile: Dockerfile
      cache_from:
        - type=registry,ref=ghcr.io/yourorg/demo-shell:cache
    image: demo-shell:latest
    ports:
      - "${DEMO_PORT:-8080}:80"
    environment:
      - API_BASE_URL=${API_BASE_URL:-http://backend:8000}
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80/"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - app-network
    restart: unless-stopped
```

---

## Phase 0 Completion Checklist

- [x] Planning questions answered (Vite/Playwright/Docker Compose)
- [x] Tech stack decisions documented with rationale
- [x] Best practices researched (F09 integration patterns, seed data strategy)
- [x] Unknowns identified with mitigation plans (permissions package, staging URL, CI time)
- [x] Research artifacts collected (Vite/Playwright/Docker configs)
- [x] No critical blockers for Phase 1 (Design & Contracts)

**Next Phase**: Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)
