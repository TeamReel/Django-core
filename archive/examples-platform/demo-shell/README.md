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
- **F04**: Notifications hub (inbox, toasts) - **Mock demo** (see below)
- **F05**: Resource display & alerts (usage meters, banners) - **Mock demo** (see below)
- **F06**: Page templates (layouts, list/detail patterns)
- **F07**: Theme system (light/dark, brand variants)

**Backend APIs** (consumed, not modified):
- **B05**: Auth (/auth/login, /auth/logout)
- **B06**: Organisations (/api/organisations/)
- **B07**: Projects (/api/projects/)
- **B08**: Permissions (/api/permissions/current/)
- **B11**: Transactions/Credits (/api/organisations/{id}/credits/)
- **B16/B17**: Notifications (/api/notifications/)

### F04/F05 Integration (Mock Demonstration)

**Current Implementation**: Simplified mock demonstration showing integration points for notifications (F04) and resource alerts (F05).

**F04 Notifications Mock** (`TopNavigation.tsx`):
- Bell icon (🔔) with unread badge showing "1"
- Positioned between context switcher and user menu
- **Production Integration**: Replace with `<NotificationsProvider>` wrapping the app:
  ```tsx
  import { NotificationsProvider, UnreadBadge } from '@django-core/notifications-hub';

  // In App.tsx or main.tsx:
  <NotificationsProvider>
    <App />
  </NotificationsProvider>

  // In TopNavigation.tsx:
  import { useNotifications } from '@django-core/notifications-hub';
  const { unreadCount, openPanel } = useNotifications();

  <button onClick={openPanel}>
    🔔 <UnreadBadge count={unreadCount} />
  </button>
  ```

**F05 Resource Alerts Mock** (`DashboardPage.tsx`):
- Yellow warning banner for DataLab org (slug === 'datalab')
- Shows "75% credit usage (250/1000 remaining)"
- Mock data: DataLab org assumed to have low credits
- **Production Integration**: Replace with real API data:
  ```tsx
  import { Alert, useResourceUsage } from '@django-core/resource-display-alerts';

  // In DashboardPage.tsx:
  const { data: credits, loading } = useResourceUsage(context.organisation?.id);
  const showAlert = credits && (credits.used / credits.limit) >= 0.75;

  {showAlert && (
    <Alert
      severity="warning"
      title="Low Credits Warning"
      dismissible
      action={<button>Upgrade Plan</button>}
    >
      You're using {Math.round((credits.used / credits.limit) * 100)}% of your
      credit limit ({credits.remaining}/{credits.limit} remaining).
    </Alert>
  )}
  ```

**Why Mock Approach**:
- P3 priority task (nice-to-have demonstration)
- Shows integration points without backend complexity
- Full F04/F05 packages available in `packages/` for production use

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
- `src/pages/status/`: Status and debugging pages (dev mode only)

## Status Pages (Dev Mode Only)

**Available in development mode** (accessible via Sidebar → Status menu):

### Health Status (`/status/health`)
- Backend health check (database, cache, tasks)
- Component status with response times
- Frontend version and environment info
- Overall system health indicator

### Permissions Status (`/status/permissions`)
- Current user's permission matrix
- Global, organisation, and project permissions
- Real-time permission evaluation
- Useful for debugging access control issues

**Note**: Status pages are only visible in development mode (`pnpm dev`). They are hidden in production builds.

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

## Docker Deployment

### Staging Deployment

**Purpose**: Production-like environment for stakeholder review without local setup.

**Prerequisites**:
- Docker 20+ and Docker Compose installed
- `.env` file with required secrets (see below)

**Quick Deploy** (5 minutes):

1. **Create `.env` file** in project root:
   ```bash
   SECRET_KEY=your-secret-key-here
   DATABASE_PASSWORD=your-db-password
   REDIS_PASSWORD=your-redis-password
   ALLOWED_HOSTS=localhost,127.0.0.1
   CSRF_TRUSTED_ORIGINS=http://localhost,http://localhost:8080
   ```

2. **Start services**:
   ```powershell
   docker compose -f docker-compose.staging.yml up -d
   ```

   This will:
   - Build the demo-shell frontend (multi-stage Dockerfile)
   - Start PostgreSQL database
   - Start Redis cache
   - Run migrations
   - Start Django backend (gunicorn)
   - Start Nginx reverse proxy
   - Start Celery workers and beat
   - Start demo-shell on port 8080

3. **Load demo data**:
   ```powershell
   docker compose -f docker-compose.staging.yml exec web python manage.py seed_demo_data
   ```

4. **Access the demo**:
   - Demo Shell: `http://localhost:8080`
   - Backend API: `http://localhost/api/`
   - Backend Admin: `http://localhost/admin/`
   - Health Check: `http://localhost/health/`

5. **Login credentials**:
   - Email: `alice@example.com`
   - Password: `demo1234`

**Stop services**:
```powershell
docker compose -f docker-compose.staging.yml down
```

**Clean rebuild** (if needed):
```powershell
docker compose -f docker-compose.staging.yml down -v
docker compose -f docker-compose.staging.yml build --no-cache demo-shell
docker compose -f docker-compose.staging.yml up -d
```

### Docker Image Details

**Frontend (demo-shell)**:
- Multi-stage build (Node 20 → Nginx Alpine)
- Image size: ~50MB (optimized)
- Build time: ~2-3 minutes
- Health check: HTTP GET on port 80
- Environment variables:
  - `API_BASE_URL`: Backend API URL (default: `http://backend:8000`)
  - `VITE_API_URL`: Vite build-time API URL

**Nginx Configuration**:
- SPA routing: All routes → `index.html`
- API proxy: `/api/*` → backend:8000
- Gzip compression enabled
- Static asset caching (1 year)
- Security headers (X-Frame-Options, CSP, etc.)

### Production Considerations

**For production deployment**:

1. **Use external PostgreSQL/Redis** (not Docker-managed):
   ```yaml
   environment:
     - DATABASE_URL=postgresql://user:pass@external-db.example.com:5432/dbname
     - REDIS_URL=redis://:pass@external-redis.example.com:6379/0
   ```

2. **Enable HTTPS** (update nginx config):
   ```nginx
   listen 443 ssl http2;
   ssl_certificate /etc/nginx/certs/fullchain.pem;
   ssl_certificate_key /etc/nginx/certs/privkey.pem;
   ```

3. **Set secure cookies**:
   ```yaml
   environment:
     - SECURE_SSL_REDIRECT=True
     - SESSION_COOKIE_SECURE=True
     - CSRF_COOKIE_SECURE=True
   ```

4. **Configure CORS properly**:
   ```yaml
   environment:
     - ALLOWED_HOSTS=yourdomain.com
     - CSRF_TRUSTED_ORIGINS=https://yourdomain.com
   ```

5. **Add monitoring** (Sentry, Prometheus):
   ```yaml
   environment:
     - SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
     - PROMETHEUS_METRICS_ENABLED=True
   ```

### Troubleshooting Docker Deployment

**"demo-shell service unhealthy"**:
- Check logs: `docker compose -f docker-compose.staging.yml logs demo-shell`
- Common cause: Backend not ready yet
- Solution: Wait 30-60 seconds for backend health check to pass

**"Backend 502 Bad Gateway"**:
- Check web service logs: `docker compose -f docker-compose.staging.yml logs web`
- Common cause: Missing migrations or seed data
- Solution: Run migrations and seed_demo_data again

**"Login fails with CSRF token error"**:
- Check `CSRF_TRUSTED_ORIGINS` in `.env` includes frontend URL
- Ensure `ALLOWED_HOSTS` includes both backend and frontend domains

**"Static files not loading"**:
- Run collectstatic: `docker compose -f docker-compose.staging.yml exec web python manage.py collectstatic --noinput`
- Check nginx static volume mount

**Build fails**:
- Clear Docker build cache: `docker builder prune --all`
- Rebuild without cache: `docker compose -f docker-compose.staging.yml build --no-cache`

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
