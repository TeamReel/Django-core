# Quickstart: Demo Shell & Playground Site (F10)
*Path: kitty-specs/031-demo-shell-playground/quickstart.md*

**Phase**: 1 - Design & Contracts
**Date**: 2025-12-14
**Target Audience**: Developers, maintainers, reviewers

## Overview

This guide helps you run the Demo Shell locally in **<5 minutes** (FR-041, S-001) to verify core integration contracts. The demo exercises F01-F09 frontend packages and B05-B18 backend APIs through realistic user flows.

**What you'll do**:
1. Seed minimal demo data (5 users, 2 orgs, 6 projects)
2. Start backend API server
3. Start frontend dev server
4. Verify auth, context switching, and permissions flows

---

## Prerequisites

- **Backend**: Python 3.12+, PostgreSQL running, migrations applied
- **Frontend**: Node.js 20+, pnpm 8+
- **Repository**: `django-core` cloned locally

**Check versions**:
```powershell
python --version  # Should show 3.12+
pnpm --version    # Should show 8.0+
psql --version    # Should show PostgreSQL 14+
```

---

## Step 1: Seed Demo Data (30 seconds)

Navigate to repository root and run the seed script:

```powershell
cd C:\Users\brian\Documents\django-core
python manage.py seed_demo_data
```

**Expected output**:
```
Creating users... ✓
Creating organisations... ✓
Creating projects... ✓
Creating memberships... ✓
Creating transactions... ✓
Creating notifications... ✓
Demo data seeded successfully!
```

**What was created**:
- **5 users**: admin@example.com (superuser), alice@example.com, bob@example.com, carol@example.com, dave@example.com
- **2 orgs**: TechCorp (alice=admin, bob=member), DataLab (carol=admin, dave=member)
- **6 projects**: 3 per org (2 active, 1 archived)
- **Credits**: TechCorp=1000/5000 (healthy), DataLab=250/1000 (low, triggers alert)
- **Notifications**: 2 unread (alice: "Welcome", carol: "Low credits")

**Default password** (all users): `demo1234` (set in seed script)

---

## Step 2: Start Backend API (30 seconds)

In a **new terminal**, start the Django dev server:

```powershell
cd C:\Users\brian\Documents\django-core
python manage.py runserver
```

**Expected output**:
```
System check identified no issues (0 silenced).
December 14, 2025 - 10:30:00
Django version 5.1.0, using settings 'config.settings.dev'
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

**Verify backend health**:
```powershell
curl http://localhost:8000/health/
# Should return: {"status": "healthy"}
```

---

## Step 3: Start Frontend Dev Server (60 seconds)

In a **new terminal**, navigate to demo app and start Vite:

```powershell
cd C:\Users\brian\Documents\django-core\examples\demo-shell
pnpm install  # First time only (~40 seconds)
pnpm dev
```

**Expected output**:
```
  VITE v5.0.0  ready in 1200 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

**Frontend is now running at**: `http://localhost:3000`

---

## Step 4: Verify Demo Flows (2 minutes)

### Flow 1: Authentication (P1 Story 1)

1. **Open browser**: Navigate to `http://localhost:3000`
2. **Expect redirect**: Should redirect to `/login`
3. **Login as Alice** (TechCorp admin):
   - Email: `alice@example.com`
   - Password: `demo1234`
   - Click **Sign In**
4. **Expect redirect**: Should redirect to `/dashboard`
5. **Verify UI**:
   - Top navigation shows: "Alice" (user name)
   - Context switcher shows: "TechCorp" (org name)
   - Dashboard shows: "Welcome, Alice!"

✅ **Auth flow verified** (FR-005-008)

---

### Flow 2: Context Switching (P1 Story 2)

1. **Open context switcher**: Click "TechCorp" dropdown in top navigation
2. **Verify org list**: Should show "TechCorp" (current), "DataLab"
3. **Switch to DataLab**: Click "DataLab"
4. **Expect context update**:
   - URL changes to `/orgs/datalab/dashboard`
   - Top navigation shows: "DataLab"
   - Dashboard shows: Alert banner "Low credits (25% remaining)"
5. **Open project list**: Click "Projects" in sidebar
6. **Verify projects**: Should show 3 projects (2 active, 1 archived)
7. **Select project**: Click "ML Pipeline"
8. **Expect project context**:
   - URL changes to `/orgs/datalab/projects/ml-pipeline/`
   - Breadcrumbs show: "DataLab > ML Pipeline"

✅ **Context switching verified** (FR-009-012)

---

### Flow 3: Permissions (P1 Story 3)

1. **Navigate to project detail**: `/orgs/techcorp/projects/web-platform/`
2. **Login as Alice** (admin):
   - Should see **Edit** button (has `projects.edit` permission)
   - Should see **Delete** button (has `projects.delete` permission)
3. **Logout**: Click "Logout" in top navigation
4. **Login as Bob** (member):
   - Email: `bob@example.com`
   - Password: `demo1234`
5. **Navigate to same project**: `/orgs/techcorp/projects/web-platform/`
6. **Verify restricted access**:
   - **Edit** button: **Hidden** (lacks `projects.edit`)
   - **Delete** button: **Hidden** (lacks `projects.delete`)
   - View-only mode active
7. **Attempt restricted action**: Manually navigate to `/orgs/datalab/projects/ml-pipeline/` (Carol's project)
8. **Expect 403 error**:
   - URL: `/403`
   - Page shows: "Access Denied - You don't have permission to view this project"

✅ **Permissions verified** (FR-013-016)

---

## Step 5: Run Smoke Tests (Optional, 2 minutes)

To validate that E2E tests pass (FR-038):

```powershell
cd C:\Users\brian\Documents\django-core\examples\demo-shell
pnpm test:e2e
```

**Expected output**:
```
Running 2 tests using 1 worker

  ✓  tests/e2e/auth-flow.spec.ts:3:1 › Auth flow: login → dashboard → logout (5s)
  ✓  tests/e2e/context-permissions.spec.ts:3:1 › Context + permissions: switch org → select project → verify ACL (7s)

  2 passed (12.3s)
```

✅ **Smoke tests pass** (S-002: <10 minutes CI time)

---

## Common Issues & Troubleshooting

### Issue 1: "Unable to connect to backend" in frontend

**Symptom**: Frontend shows "Network error" on login.

**Cause**: Backend not running or wrong port.

**Fix**:
1. Verify backend is running: `curl http://localhost:8000/health/`
2. Check Vite proxy config in `vite.config.ts`:
   ```typescript
   server: {
     proxy: {
       '/api': 'http://localhost:8000',  // Must match backend port
     },
   }
   ```

---

### Issue 2: "Seed data script fails with IntegrityError"

**Symptom**: `django.db.utils.IntegrityError: duplicate key value violates unique constraint`.

**Cause**: Seed data already exists (script ran previously).

**Fix**: Seed script uses `get_or_create()` for idempotency. Error means data exists. Skip re-seeding or flush database:
```powershell
python manage.py flush --no-input
python manage.py seed_demo_data
```

---

### Issue 3: "Login fails with 401 Unauthorized"

**Symptom**: Login form shows "Invalid email or password" for valid credentials.

**Cause**: User password not set correctly in seed script.

**Fix**: Verify seed script sets passwords:
```python
user.set_password("demo1234")
user.save()
```

Reset password manually:
```powershell
python manage.py shell
>>> from apps.accounts.models import User
>>> user = User.objects.get(email="alice@example.com")
>>> user.set_password("demo1234")
>>> user.save()
```

---

### Issue 4: "Playwright tests fail with timeout"

**Symptom**: E2E tests fail with "page.goto: Timeout 30000ms exceeded".

**Cause**: Frontend or backend not running during test.

**Fix**: Playwright config includes `webServer` that auto-starts frontend. Ensure backend is running separately:
```powershell
# Terminal 1: Backend
python manage.py runserver

# Terminal 2: Playwright (auto-starts frontend)
pnpm test:e2e
```

---

## Next Steps

### Local Development Workflow

1. **Make changes** to demo pages in `examples/demo-shell/src/pages/`
2. **See changes instantly** (Vite HMR updates <100ms)
3. **Run unit tests**: `pnpm test` (Vitest)
4. **Run E2E tests**: `pnpm test:e2e` (Playwright)
5. **Commit**: Follow standard PR process (linting, CI checks)

---

### Staging Deployment

To deploy demo to staging (FR-042-043):

```powershell
cd C:\Users\brian\Documents\django-core
docker compose -f docker-compose.staging.yml up demo-shell
```

**Access staging**: `https://demo-staging.example.com` (reviewers can access without local setup)

---

### Reset Demo Data

To start fresh:

```powershell
python manage.py flush --no-input  # Clear all data
python manage.py migrate           # Re-apply migrations
python manage.py seed_demo_data    # Re-seed demo data
```

---

## Success Criteria Validation

After completing this quickstart:

- ✅ **S-001**: Local verification took <5 minutes (measured from seed to verified flows)
- ✅ **S-002**: CI smoke tests complete in <10 minutes (if you ran `pnpm test:e2e`)
- ✅ **S-003**: Staging accessible (if you deployed via Docker Compose)
- ✅ **S-005**: Seed data minimal (5 users, 2 orgs, 6 projects - count verified in DB)

**Verification queries** (optional):
```powershell
python manage.py shell
>>> from apps.accounts.models import User
>>> from apps.organisations.models import Organisation
>>> from apps.projects.models import Project
>>> print(f"Users: {User.objects.count()}, Orgs: {Organisation.objects.count()}, Projects: {Project.objects.count()}")
# Should print: Users: 5, Orgs: 2, Projects: 6
```

---

## Phase 1 Checklist (Quickstart)

- [x] Prerequisites documented
- [x] Step-by-step instructions (<5 min local verification)
- [x] All 3 core flows covered (auth, context, permissions)
- [x] Troubleshooting guide for common issues
- [x] Next steps (dev workflow, staging, reset data)
- [x] Success criteria validation steps

**Planning Phase Complete**: Ready for Phase 2 (Task Breakdown via `/spec-kitty.tasks`)
