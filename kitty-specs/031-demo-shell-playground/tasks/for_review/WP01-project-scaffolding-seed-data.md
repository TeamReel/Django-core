---
work_package_id: WP01
title: Project Scaffolding & Seed Data
lane: "for_review"
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
  - T007
  - T008
  - T009
  - T010
priority: P0
dependencies: []
agent: "claude"
shell_pid: "36848"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: Initial work package prompt generated from tasks.md
---

# WP01: Project Scaffolding & Seed Data

## Objective

Scaffold the `examples/demo-shell/` directory structure, install all frontend dependencies (Vite, React 18, F01-F09 packages, Playwright), configure build tooling (Vite, TypeScript), and create the backend seed data script (`seed_demo_data.py`) that populates minimal demo fixtures (5 users, 2 orgs, 6 projects, credits, notifications).

**Success Criterion**: Running `python manage.py seed_demo_data` populates the database with exactly 5 users, 2 orgs, 6 projects, and `pnpm dev` starts the Vite dev server on localhost:3000 within 30 seconds.

---

## Context

**Feature**: F10 - Demo Shell & Playground Site (Module 031)
**Phase**: 1 - Setup & Foundational
**Priority**: P0 (Blocker for all other work packages)

**Why This Matters**:
- This is the **first work package** - nothing else can start until scaffolding is complete
- Establishes project structure, tooling, and seed data foundation for all subsequent work
- Validates that F01-F09 packages are available and installable (mitigates dependency risk)
- Creates reproducible demo environment (seed script ensures consistent test data)

**Design Documents**:
- `plan.md`: Technical context (TypeScript 5.x + React 18 + Vite stack)
- `data-model.md`: Seed data design (User/Org/Project/Membership/Transaction/Notification entities)
- `quickstart.md`: Target <5 min local verification time (S-001)
- `research.md`: Vite configuration patterns, seed data idempotency strategy

**Planning Decisions**:
- **Frontend Stack**: Vite + React 18 + TypeScript (Planning Q1)
- **E2E Testing**: Playwright (Planning Q2)
- **Deployment**: Docker Compose (Planning Q3)

---

## Detailed Guidance

### T001: Create Directory Structure

**Goal**: Establish standard Vite project layout in `examples/demo-shell/`.

**Steps**:
1. Navigate to repository root: `cd C:\Users\brian\Documents\django-core`
2. Create base directory: `mkdir examples\demo-shell`
3. Create subdirectories:
   ```powershell
   mkdir examples\demo-shell\src
   mkdir examples\demo-shell\src\pages
   mkdir examples\demo-shell\src\components
   mkdir examples\demo-shell\src\hooks
   mkdir examples\demo-shell\src\lib
   mkdir examples\demo-shell\tests
   mkdir examples\demo-shell\tests\unit
   mkdir examples\demo-shell\tests\e2e
   mkdir examples\demo-shell\public
   ```

**Expected Structure**:
```
examples/demo-shell/
├── src/
│   ├── pages/      # Page components (Login, Dashboard, etc.)
│   ├── components/ # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   └── lib/        # Utilities (API client, etc.)
├── tests/
│   ├── unit/       # Vitest unit tests
│   └── e2e/        # Playwright E2E tests
└── public/         # Static assets
```

**Verification**: `ls examples\demo-shell` shows all subdirectories created.

---

### T002: Initialize package.json

**Goal**: Create `package.json` with pnpm workspace member config and all scripts.

**Steps**:
1. Create `examples/demo-shell/package.json`:
   ```json
   {
     "name": "@django-core/demo-shell",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview",
       "test": "vitest",
       "test:unit": "vitest run",
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui",
       "lint": "eslint src --ext ts,tsx",
       "type-check": "tsc --noEmit"
     },
     "dependencies": {
       "react": "^18.2.0",
       "react-dom": "^18.2.0",
       "react-router-dom": "^6.20.0"
     },
     "devDependencies": {
       "@playwright/test": "^1.40.0",
       "@types/react": "^18.2.0",
       "@types/react-dom": "^18.2.0",
       "@vitejs/plugin-react": "^4.2.0",
       "typescript": "^5.3.0",
       "vite": "^5.0.0",
       "vitest": "^1.0.0"
     }
   }
   ```

2. Verify pnpm workspace member: Check root `pnpm-workspace.yaml` includes `examples/*`.

**Verification**: `pnpm install` at repo root recognizes demo-shell as workspace member.

---

### T003: Install Frontend Dependencies

**Goal**: Install Vite, React, Playwright, Vitest via pnpm.

**Steps**:
1. From repo root:
   ```powershell
   cd examples\demo-shell
   pnpm add react react-dom react-router-dom
   pnpm add -D @vitejs/plugin-react vite typescript vitest @playwright/test
   pnpm add -D @types/react @types/react-dom
   ```

2. Install Playwright browsers:
   ```powershell
   pnpm exec playwright install chromium
   ```

**Expected Result**: `node_modules/` populated, `pnpm-lock.yaml` updated.

**Verification**: `pnpm list` shows all packages installed without errors.

---

### T004: Install F01-F09 Packages

**Goal**: Install @django-core design system and feature packages.

**Steps**:
1. From `examples/demo-shell/`:
   ```powershell
   pnpm add @django-core/design-system
   pnpm add @django-core/auth
   pnpm add @django-core/context-switcher
   pnpm add @django-core/notifications-hub
   pnpm add @django-core/resource-display-alerts
   pnpm add @django-core/page-templates
   pnpm add @django-core/theme-system
   ```

2. Check for missing packages: If any package doesn't exist, note in implementation log (e.g., `@django-core/permissions` may not be available per research.md Unknown 1).

**Expected Result**: All available F01-F09 packages installed.

**Verification**: `pnpm list | grep @django-core` shows 7 packages.

**Risk Mitigation**: If `@django-core/permissions` not found, proceed anyway (WP04 will create shim).

---

### T005: Create vite.config.ts

**Goal**: Configure Vite with React plugin, proxy, and path alias.

**Steps**:
1. Create `examples/demo-shell/vite.config.ts`:
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
         '/auth': {
           target: 'http://localhost:8000',
           changeOrigin: true,
         },
       },
     },
     build: {
       outDir: 'dist',
       sourcemap: true,
     },
   });
   ```

**Configuration Notes**:
- Port 3000: Demo dev server (FR-041)
- Proxy `/api` and `/auth` to backend localhost:8000 (avoids CORS in dev)
- Alias `@/` → `src/` for clean imports

**Verification**: File created, no syntax errors.

---

### T006: Create tsconfig.json

**Goal**: Configure TypeScript in strict mode with path aliases.

**Steps**:
1. Create `examples/demo-shell/tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "useDefineForClassFields": true,
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "skipLibCheck": true,
       "moduleResolution": "bundler",
       "allowImportingTsExtensions": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx",
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,
       "paths": {
         "@/*": ["./src/*"]
       }
     },
     "include": ["src"],
     "references": [{ "path": "./tsconfig.node.json" }]
   }
   ```

2. Create `examples/demo-shell/tsconfig.node.json`:
   ```json
   {
     "compilerOptions": {
       "composite": true,
       "skipLibCheck": true,
       "module": "ESNext",
       "moduleResolution": "bundler",
       "allowSyntheticDefaultImports": true
     },
     "include": ["vite.config.ts"]
   }
   ```

**Configuration Notes**:
- Strict mode enabled (all flags true)
- Path alias matches Vite config (`@/` → `src/`)

**Verification**: `pnpm type-check` runs without errors (will fail until actual code exists).

---

### T007: Create index.html

**Goal**: Create Vite HTML entry point with root div.

**Steps**:
1. Create `examples/demo-shell/index.html`:
   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>Django Core-App Demo Shell</title>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.tsx"></script>
     </body>
   </html>
   ```

**Notes**:
- `src/main.tsx` is the React entry point (created in WP02)
- Title can be updated later with branding

**Verification**: File created at root of `examples/demo-shell/`.

---

### T008: Create seed_demo_data.py

**Goal**: Create idempotent Django management command to seed minimal demo data.

**Steps**:
1. Create `src/core/management/commands/seed_demo_data.py`:
   ```python
   from django.core.management.base import BaseCommand
   from apps.accounts.models import User
   from apps.organisations.models import Organisation, OrganisationMembership
   from apps.projects.models import Project, ProjectMembership
   from apps.transactions.models import Transaction
   from apps.notifications.models import Notification

   class Command(BaseCommand):
       help = "Seed minimal demo data (5 users, 2 orgs, 6 projects)"

       def handle(self, *args, **options):
           # Create users
           admin, _ = User.objects.get_or_create(
               email="admin@example.com",
               defaults={
                   "is_superuser": True,
                   "first_name": "Admin",
               }
           )
           admin.set_password("demo1234")
           admin.save()

           alice, _ = User.objects.get_or_create(
               email="alice@example.com",
               defaults={"first_name": "Alice"}
           )
           alice.set_password("demo1234")
           alice.save()

           bob, _ = User.objects.get_or_create(
               email="bob@example.com",
               defaults={"first_name": "Bob"}
           )
           bob.set_password("demo1234")
           bob.save()

           carol, _ = User.objects.get_or_create(
               email="carol@example.com",
               defaults={"first_name": "Carol"}
           )
           carol.set_password("demo1234")
           carol.save()

           dave, _ = User.objects.get_or_create(
               email="dave@example.com",
               defaults={"first_name": "Dave"}
           )
           dave.set_password("demo1234")
           dave.save()

           # Create organisations
           techcorp, _ = Organisation.objects.get_or_create(
               slug="techcorp",
               defaults={"name": "TechCorp"}
           )

           datalab, _ = Organisation.objects.get_or_create(
               slug="datalab",
               defaults={"name": "DataLab"}
           )

           # Create memberships
           OrganisationMembership.objects.get_or_create(
               user=alice,
               organisation=techcorp,
               defaults={"role": "admin"}
           )

           OrganisationMembership.objects.get_or_create(
               user=bob,
               organisation=techcorp,
               defaults={"role": "member"}
           )

           OrganisationMembership.objects.get_or_create(
               user=carol,
               organisation=datalab,
               defaults={"role": "admin"}
           )

           OrganisationMembership.objects.get_or_create(
               user=dave,
               organisation=datalab,
               defaults={"role": "member"}
           )

           # Create projects
           Project.objects.get_or_create(
               slug="web-platform",
               organisation=techcorp,
               defaults={"name": "Web Platform", "status": "active"}
           )

           Project.objects.get_or_create(
               slug="mobile-app",
               organisation=techcorp,
               defaults={"name": "Mobile App", "status": "active"}
           )

           Project.objects.get_or_create(
               slug="legacy-api",
               organisation=techcorp,
               defaults={"name": "Legacy API", "status": "archived"}
           )

           Project.objects.get_or_create(
               slug="ml-pipeline",
               organisation=datalab,
               defaults={"name": "ML Pipeline", "status": "active"}
           )

           Project.objects.get_or_create(
               slug="data-warehouse",
               organisation=datalab,
               defaults={"name": "Data Warehouse", "status": "active"}
           )

           Project.objects.get_or_create(
               slug="analytics-dashboard",
               organisation=datalab,
               defaults={"name": "Analytics Dashboard", "status": "archived"}
           )

           # Create transactions (credits)
           Transaction.objects.get_or_create(
               organisation=techcorp,
               defaults={
                   "type": "credit",
                   "amount": 1000,
                   "balance_after": 1000,
                   "metadata": {"limit": 5000}
               }
           )

           Transaction.objects.get_or_create(
               organisation=datalab,
               defaults={
                   "type": "credit",
                   "amount": 250,
                   "balance_after": 250,
                   "metadata": {"limit": 1000}  # Low credits (25%)
               }
           )

           # Create notifications
           Notification.objects.get_or_create(
               user=alice,
               defaults={
                   "type": "info",
                   "message": "Welcome to TechCorp!",
                   "read": False
               }
           )

           Notification.objects.get_or_create(
               user=carol,
               defaults={
                   "type": "warning",
                   "message": "Low credits warning (25% remaining)",
                   "read": False
               }
           )

           self.stdout.write(
               self.style.SUCCESS("Demo data seeded successfully!")
           )
   ```

**Key Design Decisions**:
- **Idempotent**: Uses `get_or_create()` to allow re-running without errors
- **Minimal data**: 5 users, 2 orgs, 6 projects (meets FR-036, S-005)
- **Realistic scenarios**:
  - TechCorp: Healthy credits (1000/5000 = 20%)
  - DataLab: Low credits (250/1000 = 25%, triggers alert)
  - Alice/Carol are admins, Bob/Dave are members (permission test scenarios)
- **Default password**: `demo1234` (consistent, easy to remember for reviewers)

**Verification**:
```powershell
python manage.py seed_demo_data
```

Expected output: `Demo data seeded successfully!`

**Verification Queries** (optional, in Django shell):
```python
python manage.py shell
>>> from apps.accounts.models import User
>>> from apps.organisations.models import Organisation
>>> from apps.projects.models import Project
>>> print(f"Users: {User.objects.count()}, Orgs: {Organisation.objects.count()}, Projects: {Project.objects.count()}")
# Should print: Users: 5, Orgs: 2, Projects: 6
```

---

### T009: Create .env.example

**Goal**: Document required environment variables for demo.

**Steps**:
1. Create `examples/demo-shell/.env.example`:
   ```
   # Backend API base URL (used in production Docker builds)
   API_BASE_URL=http://backend:8000

   # Vite frontend environment variables (dev only, proxied via vite.config.ts)
   VITE_API_URL=http://localhost:8000
   ```

**Notes**:
- `API_BASE_URL`: Used in Docker nginx config (WP09)
- `VITE_API_URL`: Dev fallback (proxy handles this in vite.config.ts)

**Verification**: File created (no .env file needed for local dev, proxy handles it).

---

### T010: Create examples/demo-shell/README.md

**Goal**: Document setup, usage, and architecture for demo reviewers.

**Steps**:
1. Create `examples/demo-shell/README.md`:
   ````markdown
   # Django Core-App Demo Shell

   **Purpose**: Minimal reference application that exercises F01-F09 frontend packages and B05-B18 backend APIs end-to-end. Serves as a living integration smoke test for core platform contracts.

   **Module**: 031-demo-shell-playground (F10)
   **Branch**: `031-demo-shell-playground`

   ## Quick Start (Local Development)

   **Prerequisites**:
   - Python 3.12+, PostgreSQL running, migrations applied
   - Node.js 20+, pnpm 8+
   - Repository cloned: `git clone https://github.com/TeamReel/Django-core.git`

   **Setup (5 minutes)**:

   1. **Seed demo data** (30 seconds):
      ```powershell
      cd C:\Users\brian\Documents\django-core
      python manage.py seed_demo_data
      ```

      Creates: 5 users, 2 orgs (TechCorp, DataLab), 6 projects, credits, notifications

   2. **Start backend** (30 seconds):
      ```powershell
      python manage.py runserver
      ```

      Backend now running at `http://localhost:8000`

   3. **Start frontend** (60 seconds):
      ```powershell
      cd examples\demo-shell
      pnpm install  # First time only (~40 seconds)
      pnpm dev
      ```

      Frontend now running at `http://localhost:3000`

   4. **Verify**: Open browser to `http://localhost:3000`
      - Login: `alice@example.com` / `demo1234`
      - Should redirect to dashboard showing "Welcome, Alice!"

   ## Demo Accounts

   | Email | Password | Organisation | Role | Notes |
   |-------|----------|--------------|------|-------|
   | admin@example.com | demo1234 | (global) | Superuser | Full access |
   | alice@example.com | demo1234 | TechCorp | Admin | Can edit projects |
   | bob@example.com | demo1234 | TechCorp | Member | Read-only |
   | carol@example.com | demo1234 | DataLab | Admin | Low credits (triggers alert) |
   | dave@example.com | demo1234 | DataLab | Member | Read-only |

   ## Architecture

   **Frontend**: Vite + React 18 + TypeScript
   - **F01**: Design system primitives (buttons, inputs, alerts)
   - **F02**: Auth UI (login, logout, session)
   - **F03**: Context switcher (org/project selector)
   - **F04**: Notifications hub (inbox, toasts)
   - **F05**: Resource display & alerts (usage meters, banners)
   - **F06**: Page templates (layouts, list/detail patterns)
   - **F07**: Theme system (light/dark, brand variants)

   **Backend APIs** (consumed, not modified):
   - **B05**: Auth (/auth/login, /auth/logout)
   - **B06**: Organisations (/api/organisations/)
   - **B07**: Projects (/api/projects/)
   - **B08**: Permissions (/api/permissions/current/)
   - **B11**: Transactions/Credits (/api/organisations/{id}/credits/)
   - **B16/B17**: Notifications (/api/notifications/)

   ## Available Scripts

   ```powershell
   pnpm dev           # Start Vite dev server (localhost:3000)
   pnpm build         # Build production bundle
   pnpm preview       # Preview production build
   pnpm test          # Run Vitest unit tests (watch mode)
   pnpm test:unit     # Run unit tests once
   pnpm test:e2e      # Run Playwright E2E smoke tests
   pnpm test:e2e:ui   # Run E2E tests with Playwright UI
   pnpm lint          # Lint TypeScript files
   pnpm type-check    # TypeScript type checking
   ```

   ## Key Files

   - `src/main.tsx`: React entry point, provider setup
   - `src/App.tsx`: React Router configuration
   - `vite.config.ts`: Vite config (proxy, alias)
   - `playwright.config.ts`: E2E test configuration
   - `src/lib/api-client.ts`: Fetch wrapper with CSRF handling

   ## Testing

   **Unit Tests** (Vitest):
   - `tests/unit/`: Component tests, hook tests

   **E2E Tests** (Playwright):
   - `tests/e2e/auth-flow.spec.ts`: Login → Dashboard → Logout
   - `tests/e2e/context-permissions.spec.ts`: Org switch → Project → Permission check

   **Run E2E tests**:
   ```powershell
   pnpm test:e2e
   ```

   Expected: 2 tests pass in ~10 seconds

   ## Troubleshooting

   **"Unable to connect to backend"**:
   - Ensure backend is running: `python manage.py runserver`
   - Check proxy in `vite.config.ts` points to `http://localhost:8000`

   **"Login fails with 401"**:
   - Run seed script: `python manage.py seed_demo_data`
   - Verify password is `demo1234`

   **"Playwright timeout"**:
   - Ensure backend running before starting tests
   - Check `playwright.config.ts` webServer config

   ## Deployment

   **Docker Compose** (local):
   ```powershell
   docker compose -f docker-compose.demo.yml up
   ```

   Access at `http://localhost:8080`

   **Staging**:
   Deployed via `docker-compose.staging.yml`. Access at staging URL (check with ops team).

   ## Success Criteria

   - ✅ Local verification <5 minutes (S-001)
   - ✅ CI smoke tests <10 minutes (S-002)
   - ✅ Staging accessible (S-003)
   - ✅ <1500 LOC (S-004)
   - ✅ Minimal seed data: 5 users, 2 orgs, 6 projects (S-005)

   ## Related Documentation

   - **Spec**: `kitty-specs/031-demo-shell-playground/spec.md`
   - **Plan**: `kitty-specs/031-demo-shell-playground/plan.md`
   - **Quickstart**: `kitty-specs/031-demo-shell-playground/quickstart.md`
   - **API Contracts**: `kitty-specs/031-demo-shell-playground/contracts/`

   ## License

   Internal use only (Django Core-App project)
   ````

**Verification**: File created with comprehensive setup/usage documentation.

---

## Parallel Opportunities

**Can Run Simultaneously**:
- T001-T004: Structure + Dependencies (different concerns, no conflicts)
- T008-T010: Seed script + Documentation (independent from frontend setup)

**Sequential Requirements**:
- T002 → T003-T004: Must create package.json before installing deps
- T005-T007: Can run in any order after T002-T004 complete

**Suggested Order**:
1. **Batch 1** (parallel): T001, T002, T009, T010 (structure, package.json, .env, README)
2. **Batch 2** (parallel): T003, T004, T008 (install deps, seed script)
3. **Batch 3** (parallel): T005, T006, T007 (configs: vite, tsconfig, html)

**Time Estimate**: 30-40 minutes solo, 20-25 minutes if parallelized

---

## Definition of Done

- [ ] **T001-T007 Complete**: Directory structure, package.json, dependencies, configs all created
- [ ] **pnpm install** runs without errors from repo root
- [ ] **pnpm dev** starts Vite dev server on localhost:3000 (shows blank page with root div)
- [ ] **T008 Complete**: seed_demo_data.py created and tested
- [ ] **python manage.py seed_demo_data** populates database:
  - 5 users (`SELECT COUNT(*) FROM accounts_user` = 5)
  - 2 orgs (`SELECT COUNT(*) FROM organisations_organisation` = 2)
  - 6 projects (`SELECT COUNT(*) FROM projects_project` = 6)
- [ ] **All users** can login with password `demo1234`
- [ ] **T009-T010 Complete**: .env.example and README.md created
- [ ] **No errors** when running `pnpm type-check` (will show "no input files" until WP02 adds code)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| F01-F09 packages not in pnpm workspace | Medium | High (blocks demo) | Check root `pnpm-workspace.yaml` includes `packages/*` |
| Missing `@django-core/permissions` | Medium | Low (can create shim in WP04) | Note in implementation log, proceed anyway |
| Seed script conflicts with existing data | Low | Low | `get_or_create()` handles idempotency |
| Vite port 3000 already in use | Low | Low | Change port in vite.config.ts |

---

## Reviewer Guidance

**What to Check**:
1. **File Structure**: Verify all directories and files exist per T001-T010
2. **Dependencies**: Run `pnpm list` in `examples/demo-shell/`, confirm F01-F09 packages installed
3. **Configs**: Review `vite.config.ts`, `tsconfig.json` for correctness (proxy, strict mode)
4. **Seed Script**: Run `python manage.py seed_demo_data`, query DB to verify counts
5. **Dev Server**: Run `pnpm dev`, access `http://localhost:3000` (should show blank page with "root" div)

**Acceptance Criteria**:
- ✅ All T001-T010 subtasks marked complete
- ✅ `pnpm dev` starts without errors
- ✅ Seed script creates exactly 5 users, 2 orgs, 6 projects (idempotent, can re-run)
- ✅ README.md clear and accurate (<5 min setup guide)

**Next Work Package**: WP02 (Core Authentication Flow) - builds on this scaffolding to implement login/logout.

---

## Related Files

- **Spec**: `kitty-specs/031-demo-shell-playground/spec.md` (P1 Story 1-3)
- **Plan**: `kitty-specs/031-demo-shell-playground/plan.md` (Technical Context)
- **Data Model**: `kitty-specs/031-demo-shell-playground/data-model.md` (Seed data design)
- **Research**: `kitty-specs/031-demo-shell-playground/research.md` (Vite config patterns)

---

**Status**: Ready for implementation
**Lane**: `planned`
**Move to**: `doing` when starting work, `for_review` when complete, `done` after approval

## Activity Log

- 2025-12-14T11:22:10Z – claude – shell_pid=36848 – lane=doing – Started WP01 implementation
- 2025-12-14T12:33:13Z – claude – shell_pid=36848 – lane=for_review – WP01 complete: All scaffolding and seed data tasks (T001-T010) implemented
