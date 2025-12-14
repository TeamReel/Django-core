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
