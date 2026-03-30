# Phase 8: Demo Foundation (031-033)

**Focus**: Fully functional demo app met production database, comprehensive seed data en 30+ demo pages voor alle modules 001-030

---

## [F10: Demo Shell (Basic)](../modules/done/031-F10-demo-shell-(basic).md)

**Goal**: Minimale reference applicatie die F01-F09 frontend packages en B05-B18 backend APIs end-to-end exercised. Living integration smoke test voor core platform contracts.

**Wat is geïmplementeerd** (✅ COMPLETE):
- Vite + React 18 + TypeScript SPA
- Seed data command: `python manage.py seed_demo_data`
  - 5 users, 2 orgs (TechCorp, DataLab), 6 projects
  - Demo accounts: admin@/alice@/bob@/carol@/dave@example.com (password: demo1234)
- Frontend integration:
  - **F01**: Design system (buttons, inputs, alerts)
  - **F02**: Auth UI (login/logout)
  - **F03**: Context switcher (org/project selector)
  - **F04/F05**: Mock notifications + resource alerts (UI only)
  - **F06**: Page templates (layouts, list/detail)
  - **F07**: Theme system (light/dark)
- Backend API consumption:
  - **B05**: Auth endpoints
  - **B06**: Organisations API
  - **B07**: Projects API
  - **B08**: Permissions API
  - **B11**: Credits/transactions API
  - **B16/B17**: Notifications API (mock)
- Docker Compose setup: backend + frontend + PostgreSQL
- Playwright E2E tests

**Demo Pages** (~10 pages):
- Dashboard (overview)
- Organisations list + detail
- Projects list + detail
- User profile
- Settings (basic)

**Status**: ✅ COMPLETE

**Note**: Modules 32-33 extend this naar production-ready demo app.

**Demo**: 🚀 Live at `http://localhost:3000` (na `pnpm dev` in `demo/`)

---

## 32. F10b-Database – Demo Production Database & Seed Data

**Goal**: Production-ready database setup + comprehensive seed data voor volledig werkende demo app die **alle modules 001-030 demonstreert**.

**Waarom dit kritisch is**:
- **Strategic Product Owner** kan alle features **zien werken** (niet alleen UI mockups)
- Developers kunnen **echte integration testen** met complete, realistic dataset
- Demo kan **gehost worden** (demo.djangocore.app) voor externe presentaties
- **Confidence building**: Visual proof dat platform werkt end-to-end
- **Alle nieuwe modules** (034-070) worden direct in demo geïntegreerd

**Wat moet er gebeuren**

### 1. Database Setup (Production-Ready)

**PostgreSQL** (Docker Compose primary):
- Connection pooling (pgbouncer integration ready)
- Read replica support (settings only, no physical replica yet)
- Performance indexes for demo queries
- Configured via `DEMO_DATABASE_URL`

**SQLite** (Fallback for lightweight local dev):
- Switchable via `DEMO_DATABASE=sqlite` environment variable
- Same seed data works for both backends
- Useful for CI/testing

### 2. Comprehensive Seed Data (`python manage.py seed_demo_data`)

**5 Organisations** (diverse real-world scenarios):

1. **TechCorp Startup**
   - 5 users (1 admin, 3 members, 1 viewer)
   - 15 projects (active development)
   - Credits: 1000 (medium usage)
   - Use case: Fast-growing tech startup

2. **DataLab Enterprise**
   - 8 users (2 admins, 5 members, 1 viewer)
   - 30 projects (large portfolio)
   - Credits: 5000 (heavy usage, enterprise tier)
   - Use case: Large enterprise with complex hierarchy

3. **MarketingHub Agency**
   - 4 users (1 admin, 2 members, 1 viewer)
   - 10 projects (client projects)
   - Credits: 200 (low usage)
   - Use case: Small agency, budget-conscious

4. **OpenSource Collective**
   - 2 users (1 admin, 1 member)
   - 5 projects (community projects)
   - Credits: 100 (trial mode)
   - Use case: Non-profit, minimal resources

5. **AI Research Inc**
   - 6 users (1 admin, 4 members, 1 viewer)
   - 20 projects (research projects)
   - Credits: 3000 (ML-heavy workloads)
   - Use case: AI/ML research organization

**20 Users** (realistic role distribution):
- 3 superusers (platform admins) - for demo/testing
- 10 org admins (can manage org settings, projects, users)
- 7 members/viewers (project collaborators, read-only access)
- Distribution matches real-world usage patterns

**70+ Projects** (10-15 per organisation):
- Active projects (recently updated, notifications)
- Archived projects (completed, read-only)
- Projects with various permission levels (via B08)
- Projects ready for:
  - File management (B22 placeholders)
  - Real-time updates (B23 WebSocket)
  - Full-text search (B24 indexed)
  - Workflows (B37 state machines)

**Transactions & Credits** (B11):
- Historical transactions (purchases, usage, refunds)
- Credit balances reflecting usage patterns
- Low-credit alerts (for testing B16 notification triggers)
- Transaction history (last 90 days)

**Audit Events** (B09):
- 200+ audit log entries across all orgs
- Realistic event types:
  - Authentication (login, logout, password_reset)
  - CRUD operations (project_created, user_added, org_updated)
  - Financial (credits_purchased, transaction_created)
  - Security (permission_changed, role_assigned)
- Timestamps distributed over last 30 days
- Searchable and filterable

**Notifications** (B16/B17):
- Unread notifications for demo accounts (5-10 per user)
- Read notification history (50+ per org)
- Various notification types:
  - System (platform updates, maintenance)
  - Organisation (credit alerts, new members)
  - Project (status updates, mentions, assignments)
- Channels: in-app, email (logged, not sent in demo)

**Feature Flags** (B10):
- Enabled for demo orgs: `realtime_updates`, `advanced_search`, `file_uploads`
- Disabled for trial org (OpenSource): `premium_analytics`, `priority_support`
- Allows testing flag-based feature access

**Files & Media** (B22 - placeholder records):
- Sample file metadata ready for B22 implementation
- File paths, sizes, MIME types, timestamps
- Thumbnails placeholders for images
- No actual file uploads yet (module 34 will implement)

**User Preferences** (B12):
- Language preferences (en, nl, fr, de)
- Theme preferences (light, dark, auto)
- Notification preferences (email on/off, in-app frequency)
- Timezone preferences

### 3. Pre-configured Demo Accounts

**4 accounts covering all permission levels**:

| Email | Password | Role | Organisation | Access |
|-------|----------|------|--------------|--------|
| admin@demo.djangocore.app | Demo2024! | Superuser | (global) | Full platform access |
| user@demo.djangocore.app | Demo2024! | Member | TechCorp | Regular user, project access |
| manager@demo.djangocore.app | Demo2024! | Org Admin | DataLab | Org management, can add users |
| viewer@demo.djangocore.app | Demo2024! | Viewer | MarketingHub | Read-only, limited permissions |

**Additional 16 users** distributed across orgs for realistic multi-user scenarios.

### 4. Management Commands

**`python manage.py seed_demo_data`**
- Idempotent (safe to re-run, checks existing data)
- Creates all seed data (orgs, users, projects, transactions, etc.)
- Outputs summary (e.g., "Created 5 orgs, 20 users, 72 projects")
- Logs to console + optional `--verbose` flag

**`python manage.py reset_demo_data`**
- Deletes ALL demo data (confirmation required: `--force`)
- Re-seeds from scratch
- Useful for clean slate after testing

**`python manage.py validate_demo_data`**
- Integrity checks:
  - All orgs have at least 1 admin
  - Credit balances are non-negative
  - Audit events have valid org/user references
  - Projects have valid permissions
- Outputs report with any issues found

### 5. Docker Compose Profiles

**Full Demo** (`docker-compose --profile demo up`):
- PostgreSQL (primary database)
- Redis (cache + channels)
- Django backend (gunicorn)
- Frontend (Vite dev server or nginx for prod build)
- Startup time: <60 seconds (including migrations + seed)

**Lite Demo** (`docker-compose --profile demo-lite up`):
- SQLite (no PostgreSQL container)
- Redis (still needed for cache)
- Django backend
- Frontend
- Startup time: <30 seconds (faster, no DB container)

**Environment Variables** (`.env.demo.example`):
```env
DEMO_DATABASE=postgresql  # or sqlite
DEMO_DATABASE_URL=postgresql://demo:demo@localhost:5432/demo
DEMO_AUTO_SEED=true  # Auto-run seed_demo_data on startup
DEMO_RESET_ON_START=false  # Danger: wipes DB on start
DEMO_READONLY=false  # Future: disable mutations for hosted demo
```

### 6. Performance Targets

- **Startup time**: <60 seconds (PostgreSQL + migrations + seed)
- **Seed generation**: <30 seconds (all 20 users, 70+ projects, 200+ events)
- **Database size**: ~50MB (with all seed data, no actual files)
- **API response times**: <100ms for common queries (cached via B25)
- **Page load**: <2 seconds for demo pages (including API calls)

### 7. Hosted Demo (Future - Optional)

**Demo URL**: `demo.djangocore.app`

**Features**:
- Public access (no signup required, pre-configured accounts)
- Automated daily reset (cron job at 00:00 UTC)
- Read-only mode option (disable POST/PUT/DELETE for external users)
- Session recording for support (optional, privacy-compliant)
- CDN for frontend assets (CloudFront/CloudFlare)
- Monitoring (uptime, response times, errors)

**Deployment**:
- AWS/Azure/DigitalOcean (Docker Compose or Kubernetes)
- Auto-scaling (2-4 instances based on load)
- Backups (daily snapshots, 7-day retention)
- SSL certificate (Let's Encrypt)

**Cost estimate**: €50-100/month (depending on hosting + traffic)

### 8. CI/CD Integration

**GitHub Actions** (`.github/workflows/demo-deploy.yml`):
- Build Docker images on main branch push
- Run seed_demo_data + validate_demo_data
- Deploy to demo.djangocore.app (if configured)
- Smoke tests (Playwright) against live demo
- Slack notification on deployment success/failure

**Pre-commit hooks**:
- Validate seed data structure (YAML schema)
- Check for hardcoded credentials
- Ensure demo accounts use secure passwords

**Status**: 🚧 ROADMAP

**Demo**: 🚀 After implementation: `docker-compose --profile demo up` → `http://localhost:8080`

**Specify Prompt**

```
/spec-kitty.specify feature=F10b-demo-production-database

[feature summary]
Production-ready database setup + comprehensive seed data for fully functional demo app demonstrating all modules 001-030.

[stakeholder context]
Strategic Product Owner (non-technical) needs:
- Visual proof that features work (not just code)
- Realistic demo data for confidence building
- Easy setup (<60 seconds) for quick reviews
- Hosted option for client presentations

[goals]
- PostgreSQL primary + SQLite fallback
- 5 diverse organisations (startup, enterprise, agency, non-profit, research)
- 20 users (3 superusers, 10 org admins, 7 members/viewers)
- 70+ projects with realistic data
- 200+ audit events, transactions, notifications, preferences
- 4 pre-configured demo accounts (admin, user, manager, viewer)
- Management commands (seed, reset, validate)
- Docker Compose profiles (demo, demo-lite)
- <60 second startup, <30 second seed
- Optional hosted demo (demo.djangocore.app)

[seed data details]
- TechCorp Startup: 5 users, 15 projects, 1000 credits
- DataLab Enterprise: 8 users, 30 projects, 5000 credits
- MarketingHub Agency: 4 users, 10 projects, 200 credits
- OpenSource Collective: 2 users, 5 projects, 100 credits (trial)
- AI Research Inc: 6 users, 20 projects, 3000 credits

[demo accounts]
- admin@demo.djangocore.app (superuser, full access)
- user@demo.djangocore.app (member, TechCorp)
- manager@demo.djangocore.app (org admin, DataLab)
- viewer@demo.djangocore.app (read-only, MarketingHub)
- Password: Demo2024! (all accounts)

[management commands]
- seed_demo_data: idempotent, creates all data, outputs summary
- reset_demo_data: wipe + reseed (requires --force)
- validate_demo_data: integrity checks, outputs report

[docker profiles]
- demo: PostgreSQL + Redis + Django + Frontend (<60s startup)
- demo-lite: SQLite + Redis + Django + Frontend (<30s startup)

[hosted demo (future)]
- URL: demo.djangocore.app
- Daily auto-reset (00:00 UTC)
- Optional read-only mode
- CI/CD via GitHub Actions
- Cost: €50-100/month

[performance targets]
- Startup: <60s (migrations + seed)
- Seed generation: <30s
- Database size: ~50MB
- API response: <100ms (cached)
- Page load: <2s

[constraints]
- Must use existing B01-B21 models (no schema changes)
- Seed data must be realistic (no Lorem Ipsum)
- Idempotent commands (safe to re-run)
- Works with both PostgreSQL and SQLite
- No actual file uploads yet (B22 placeholders only)
```

---

## 33. F10b-Pages – Demo Pages for Modules 001-030

**Goal**: 30+ fully functional demo pages die **alle geïmplementeerde modules** (B01-B21, F01-F09) demonstreren met echte backend integratie.

**Waarom dit kritisch is**:
- **Visual validation** voor stakeholders: zie elke module in actie
- **Integration testing**: verify module contracts end-to-end
- **Developer onboarding**: reference implementations voor alle patterns
- **Confidence building**: proof dat platform Complete werkt
- **Future-proof**: template voor modules 034-070 (elke module voegt 1 demo page toe)

**Architectuur Principes**

1. **1 Demo Page per Module** (waar toepasbaar):
   - Backend modules (B01-B28): Demo page toont API + logic
   - Frontend modules (F01-F14): Demo page toont UI components
   - Platform modules (P01-P05): Dashboard indicators only (niet user-facing)
   - Data modules (D01-D16): Dashboard indicators + sample queries

2. **Real Backend Integration** (niet alleen mockups):
   - Alle API calls naar echte Django endpoints
   - Database queries via seed data (module 32)
   - Authentication via B05 (real session management)
   - Permissions via B08 (real ACL checks)

3. **Consistent Layout** (via F06 templates):
   - Navigation (top nav + sidebar)
   - Breadcrumbs
   - Page header (title, actions)
   - Content area
   - Footer

4. **Reusable Patterns** (voor modules 034-070):
   - List/detail pattern (orgs, projects, users)
   - Form pattern (create, edit, delete)
   - Dashboard pattern (metrics, charts)
   - Settings pattern (preferences, configuration)

### Demo Pages Overzicht (30+ pages)

#### **Core Foundation** (B01-B04)

**B01: Project Structure**
- `/demo/health` - Health check page
  - Database status (PostgreSQL connection)
  - Redis status (cache layer)
  - Django version, Python version
  - Dependencies health
  - Tests: verify green status

**B02: Constitutional Enforcement**
- `/demo/constitution` - Constitution dashboard
  - Active rules count
  - Recent violations (if any)
  - Rule categories (governance, security, architecture)
  - Tests: verify no active violations

**B03: Security Foundation**
- `/demo/security` - Security scorecard
  - ASVS compliance status (from constitution checks)
  - Active security policies
  - Recent security events (from B09 audit log)
  - Tests: verify HTTPS, CSP headers

**B04: Internationalization**
- `/demo/i18n` - Language switcher demo
  - Current language indicator
  - Language dropdown (EN, NL, FR, DE)
  - Sample translated content (page titles, button labels)
  - Tests: switch language → verify UI updates

#### **Identity & Multi-tenancy** (B05-B08)

**B05: Authentication**
- `/demo/auth/login` - Login page (already implemented)
- `/demo/auth/profile` - User profile
  - Display current user (name, email, role)
  - Edit profile button
  - Change password button
  - Tests: login → view profile → verify data

**B06: Organisations**
- `/demo/organisations` - Organisation list
  - Grid/list view of all accessible orgs
  - Search/filter (via B24 later)
  - Create organisation button (if admin)
  - Tests: verify 5 seed orgs visible

- `/demo/organisations/:id` - Organisation detail
  - Org info (name, credits, members count)
  - Members list (with roles)
  - Projects list (org's projects)
  - Settings button (if admin)
  - Tests: verify DataLab has 8 members

**B07: Projects**
- `/demo/projects` - Project list
  - Grid/list view of accessible projects
  - Filter by org (context switcher)
  - Create project button
  - Tests: verify TechCorp has 15 projects

- `/demo/projects/:id` - Project detail
  - Project info (name, description, status)
  - Team members (with permissions)
  - Activity feed (recent events)
  - Files placeholder (B22 future)
  - Tests: verify permissions (viewer can't edit)

**B08: Hierarchical Access Control**
- `/demo/permissions` - Permissions dashboard
  - Current user's permissions list
  - Role assignments (org, project scopes)
  - Permission matrix (resource × action)
  - Tests: verify admin has all permissions

#### **Configuration & Audit** (B09-B12)

**B09: Audit Logging**
- `/demo/audit` - Audit log viewer
  - Recent events table (200+ seed events)
  - Filter by: event type, user, org, date range
  - Search (via B24 later)
  - Export button (CSV download)
  - Tests: verify login events exist

**B10: Feature Flags**
- `/demo/features` - Feature flags dashboard
  - Active flags list (with org scope)
  - Toggle switches (if admin)
  - Rollout percentage indicator
  - Tests: verify TechCorp has `realtime_updates` enabled

**B11: Transactions & Credits**
- `/demo/credits` - Credits dashboard
  - Current balance (per org)
  - Usage chart (last 30 days)
  - Transaction history table
  - Purchase button (if admin)
  - Low-balance alert (if <100 credits)
  - Tests: verify MarketingHub shows low-balance alert

**B12: User Preferences**
- `/demo/preferences` - Preferences page
  - Language preference (dropdown)
  - Theme preference (light/dark/auto)
  - Notification settings (email, in-app)
  - Timezone selector
  - Tests: change theme → verify UI updates

#### **API & Communication** (B13-B17)

**B13: API Foundation**
- `/demo/api-docs` - API documentation
  - OpenAPI/Swagger UI (interactive)
  - Authentication guide (JWT)
  - Rate limits info
  - Example requests
  - Tests: verify /api/organisations/ endpoint

**B14: Web UI Foundation**
- `/demo/` - Main dashboard (home)
  - Welcome message
  - Quick stats (orgs, projects, users)
  - Recent activity (from B09)
  - Quick actions (create project, invite user)
  - Tests: verify dashboard loads

**B15: Background Tasks**
- `/demo/tasks` - Background tasks monitor
  - Active tasks count
  - Completed tasks (last 24h)
  - Failed tasks (with error messages)
  - Retry button (if admin)
  - Tests: trigger task → verify completion

**B16/B17: Notifications**
- `/demo/notifications` - Notifications hub (F04 integrated)
  - Unread count badge
  - Notification list (in-app)
  - Mark as read button
  - Filter by type (system, org, project)
  - Email preferences link (B12)
  - Tests: verify demo accounts have unread notifications

#### **Observability** (B18)

**B18: Observability**
- `/demo/observability` - Platform metrics dashboard
  - Response time chart (P99, P95, median)
  - Error rate chart (4xx, 5xx)
  - Active connections gauge
  - Cache hit rate (B25 later)
  - Database query performance
  - Tests: verify all metrics have data

#### **Deployment & Docs** (B19, B21)

**B19: Production Deployment**
- `/demo/deployment` - Deployment status
  - Current environment (dev/staging/prod)
  - Docker containers status
  - Kubernetes pods (if applicable)
  - Health check results
  - Tests: verify all containers running

**B21: Technical Documentation**
- `/demo/docs` - Documentation browser
  - Link to MkDocs site
  - Quick links (API docs, architecture, contributing)
  - Module status matrix (B01-B21 ✅, B22+ 🚧)
  - Tests: verify links work

#### **Frontend Modules** (F01-F09)

**F01: Design System**
- `/demo/design-system` - Component showcase
  - All primitive components (Button, Input, Card, Alert, etc.)
  - Color palette
  - Typography scale
  - Spacing system
  - Interactive demos
  - Tests: verify components render

**F02: Authentication UI**
- `/demo/auth` - Auth flows (already implemented)
  - Login, logout, password reset
  - Session management
  - Tests: verify login flow

**F03: Context Switcher**
- `/demo/context` - Context switcher demo
  - Organisation selector (dropdown)
  - Project selector (dropdown)
  - Context propagation test (API headers)
  - Tests: switch context → verify API uses correct org/project

**F04: Notifications Hub**
- `/demo/notifications` - Already covered in B16/B17

**F05: Resource Display & Alerts**
- `/demo/resources` - Resource usage demo
  - Credits meter (B11 integration)
  - Storage meter (B22 placeholder)
  - Bandwidth meter (future)
  - Low-resource alerts
  - Tests: verify MarketingHub shows low-credits alert

**F06: Page Templates**
- `/demo/templates` - Layout showcase
  - Empty state template
  - List page template
  - Detail page template
  - Form page template
  - Dashboard template
  - Tests: verify responsive layouts

**F07: Theme System**
- `/demo/themes` - Theme demo
  - Light theme preview
  - Dark theme preview
  - Brand variant showcase (if custom brands exist)
  - Theme toggle button
  - Tests: toggle theme → verify CSS variables update

**F09: Integration Guides**
- `/demo/integration` - Integration patterns showcase
  - Auth + API client example
  - Context propagation example
  - Error handling example
  - Caching example
  - Tests: verify patterns work end-to-end

### Implementation Guidelines

**Routing** (`demo/src/App.tsx`):
```typescript
<Routes>
  <Route path="/" element={<Dashboard />} />

  {/* B05-B08: Identity */}
  <Route path="/auth/login" element={<Login />} />
  <Route path="/auth/profile" element={<Profile />} />
  <Route path="/organisations" element={<OrgList />} />
  <Route path="/organisations/:id" element={<OrgDetail />} />
  <Route path="/projects" element={<ProjectList />} />
  <Route path="/projects/:id" element={<ProjectDetail />} />
  <Route path="/permissions" element={<PermissionsDashboard />} />

  {/* B09-B12: Config & Audit */}
  <Route path="/audit" element={<AuditLog />} />
  <Route path="/features" element={<FeatureFlags />} />
  <Route path="/credits" element={<CreditsDashboard />} />
  <Route path="/preferences" element={<Preferences />} />

  {/* B13-B18: API & Observability */}
  <Route path="/api-docs" element={<ApiDocs />} />
  <Route path="/tasks" element={<BackgroundTasks />} />
  <Route path="/notifications" element={<NotificationsHub />} />
  <Route path="/observability" element={<ObservabilityDashboard />} />

  {/* F01-F09: Frontend */}
  <Route path="/design-system" element={<DesignSystemShowcase />} />
  <Route path="/context" element={<ContextSwitcherDemo />} />
  <Route path="/resources" element={<ResourceDisplay />} />
  <Route path="/templates" element={<TemplateShowcase />} />
  <Route path="/themes" element={<ThemeDemo />} />
  <Route path="/integration" element={<IntegrationGuides />} />

  {/* Platform modules (dashboard indicators) */}
  <Route path="/health" element={<HealthCheck />} />
  <Route path="/constitution" element={<ConstitutionDashboard />} />
  <Route path="/security" element={<SecurityScorecard />} />
  <Route path="/i18n" element={<I18nDemo />} />
  <Route path="/deployment" element={<DeploymentStatus />} />
  <Route path="/docs" element={<DocsBrowser />} />
</Routes>
```

**API Integration Pattern** (all demo pages follow this):
```typescript
// Use F09 integration patterns
const { data, loading, error } = useApiQuery<Organisation[]>('/api/organisations/');

if (loading) return <Skeleton />;
if (error) return <ErrorBoundary error={error} />;

return (
  <PageTemplate title="Organisations">
    <OrgGrid organisations={data} />
  </PageTemplate>
);
```

**Navigation** (`DemoShell.tsx`):
```typescript
<Sidebar>
  <NavGroup title="Identity">
    <NavLink to="/organisations">Organisations</NavLink>
    <NavLink to="/projects">Projects</NavLink>
    <NavLink to="/permissions">Permissions</NavLink>
  </NavGroup>

  <NavGroup title="Configuration">
    <NavLink to="/audit">Audit Log</NavLink>
    <NavLink to="/features">Feature Flags</NavLink>
    <NavLink to="/credits">Credits</NavLink>
    <NavLink to="/preferences">Preferences</NavLink>
  </NavGroup>

  <NavGroup title="Platform">
    <NavLink to="/observability">Observability</NavLink>
    <NavLink to="/tasks">Background Tasks</NavLink>
    <NavLink to="/notifications">Notifications</NavLink>
  </NavGroup>

  <NavGroup title="Frontend">
    <NavLink to="/design-system">Design System</NavLink>
    <NavLink to="/themes">Themes</NavLink>
    <NavLink to="/templates">Templates</NavLink>
  </NavGroup>
</Sidebar>
```

**Testing** (`demo/tests/e2e/`):
- Each demo page has Playwright E2E test
- Tests verify:
  - Page loads without errors
  - Data from seed database appears
  - Permissions work correctly
  - Forms submit successfully
  - Navigation works
- Example: `organisations.spec.ts` verifies 5 seed orgs appear

**Performance**:
- All demo pages use F06 templates (consistent layout, no duplicate renders)
- API calls cached via B25 (when implemented)
- Lazy loading for charts/heavy components
- Target: <2 second page load (including API calls)

**Status**: 🚧 ROADMAP

**Demo**: 🚀 After implementation: 30+ pages at `http://localhost:3000/demo/*`

**Specify Prompt**

```
/spec-kitty.specify feature=F10b-demo-pages-modules-001-030

[feature summary]
30+ fully functional demo pages demonstrating all implemented modules (B01-B21, F01-F09) with real backend integration.

[stakeholder context]
Strategic Product Owner needs:
- Visual proof for every module
- Click-through experience (not just docs)
- Realistic demo data (not Lorem Ipsum)
- Easy navigation (sidebar grouped by category)

[goals]
- 1 demo page per module (where applicable)
- Real backend integration (no mocks)
- Consistent layout (F06 templates)
- Reusable patterns for modules 034-070
- E2E tests for all pages
- <2 second page load

[demo pages by category]

**Identity (B05-B08)**: 6 pages
- /auth/login, /auth/profile
- /organisations (list), /organisations/:id (detail)
- /projects (list), /projects/:id (detail)
- /permissions (dashboard)

**Configuration (B09-B12)**: 4 pages
- /audit (log viewer)
- /features (flags dashboard)
- /credits (usage + transactions)
- /preferences (user settings)

**Platform (B13-B18)**: 6 pages
- /api-docs (Swagger UI)
- / (main dashboard)
- /tasks (background jobs)
- /notifications (hub)
- /observability (metrics)
- /health, /constitution, /security (indicators)

**Frontend (F01-F09)**: 6 pages
- /design-system (components)
- /context (switcher demo)
- /resources (usage meters)
- /templates (layouts)
- /themes (light/dark)
- /integration (patterns)

**Docs (B19, B21)**: 2 pages
- /deployment (status)
- /docs (browser)

[architecture patterns]

**List/Detail Pattern** (orgs, projects):
- List: grid/list view, search, create button
- Detail: info, members, activity, settings

**Dashboard Pattern** (credits, observability):
- KPI cards, charts, tables, actions

**Form Pattern** (preferences, create org):
- Validation, error handling, success toast

**Settings Pattern** (preferences, feature flags):
- Grouped settings, save button, undo

[routing]
- React Router v6
- Nested routes (e.g., /organisations/:id/settings)
- Protected routes (auth required)
- Permission-based routes (admin only)

[navigation]
- Sidebar (grouped by category)
- Breadcrumbs (auto-generated from route)
- Context switcher (top nav)
- User menu (top right)

[testing]
- Playwright E2E tests
- Test per demo page
- Verify: page loads, data appears, permissions work
- CI runs all tests on PR

[performance]
- F06 templates (no duplicate renders)
- API caching (B25 when available)
- Lazy loading (charts, heavy components)
- Target: <2s page load

[constraints]
- Must use F01-F07 components (no custom CSS)
- Must integrate with B05-B21 APIs (real backend)
- Must respect B08 permissions (no hardcoded admin access)
- Must show seed data from module 32 (5 orgs, 20 users, 70+ projects)
```

---

## 📋 Constitution Gate (Post Demo Foundation)

**Timing**: Na Phase 8 (modules 031-033 Complete)

**Waarom nu**:
- Demo app is **volledig functioneel** (niet alleen UI mockups)
- Database setup is **production-ready** (PostgreSQL + fallback)
- **Alle modules 001-030 zijn zichtbaar** in demo pages
- **Stakeholder confidence** is hoog (visual proof platform werkt)

Voor modules 034+ (backend utilities, data foundations, ML/AI), moeten governance principes helder zijn:
- **Demo Discipline**: Elke nieuwe module voegt max 1 demo page toe
- **Database Integrity**: Seed data blijft realistisch (no garbage data)
- **Performance Baselines**: Demo blijft <60s startup, <2s page load
- **Integration Testing**: Alle demo pages hebben E2E tests

**Constitution Updates Needed**:

1. **Demo Discipline** (Section 7):
   - Each module 034-070 MUST add 1 demo page (if user-facing)
   - Demo pages MUST use real backend APIs (no mocks)
   - Demo pages MUST respect B08 permissions
   - Demo data MUST remain realistic (no test/garbage data)
   - Demo startup MUST remain <60 seconds

2. **Database Integrity** (Section 7):
   - Seed data MUST be idempotent (safe to re-run)
   - Seed data MUST match production schema
   - Seed data MUST include edge cases (low credits, archived projects)
   - NO hardcoded secrets in seed data (use env vars)

3. **Performance Baselines** (Section 6):
   - Demo startup: <60 seconds (PostgreSQL + seed)
   - Demo page load: <2 seconds (including API calls)
   - API response: <100ms (cached queries via B25)
   - Database size: <100MB (even with 100+ projects)

4. **Integration Testing** (Section 9):
   - All demo pages MUST have Playwright E2E tests
   - Tests MUST verify real backend integration (not mocks)
   - Tests MUST verify permissions (viewer vs admin)
   - CI MUST run all E2E tests on PR (blocking)

5. **Hosted Demo** (Section 10 - future):
   - IF hosted (demo.djangocore.app), MUST auto-reset daily
   - IF hosted, MUST use read-only mode for external users
   - IF hosted, MUST monitor uptime (99.9% target)
   - IF hosted, MUST have SSL certificate

---

**Phase 8 Complete**: 3 modules (F10, F10b-Database, F10b-Pages)
**Next**: Phase 9 - Backend Infrastructure (B22-B25)
