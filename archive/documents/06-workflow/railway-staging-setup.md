# Railway Staging Environment Setup

This guide helps you create a **staging environment** on Railway for running the full test suite safely before deploying to production.

## Why Staging?

- **Full test suite** (`pytest`) creates/destroys test databases and runs migrations—you should **never** do this against production.
- A staging environment lets you validate the exact code you intend to deploy, under production-like conditions, without risking production data.

## Setup Steps

### 1. Create Staging Environment

1. Go to your Railway project dashboard
2. Click the environment dropdown (top right, currently shows "production")
3. Click **"+ New Environment"**
4. Name it: `staging`

### 2. Add PostgreSQL Plugin (Staging DB)

1. In the `staging` environment, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway creates a new Postgres instance (separate from production)
3. Note: this DB is isolated; nothing you do here affects production

### 3. Configure Backend Service for Staging

1. Go to your **backend** service settings
2. Under **Variables**, ensure the staging environment has:
   - `DATABASE_URL` — automatically linked to the staging Postgres plugin
   - `REDIS_URL` — if you have Redis, link it or share from production (read-only usage is fine)
   - `SECRET_KEY` — copy from production or generate a new one (doesn't need to match prod for staging)
   - `DJANGO_SETTINGS_MODULE=config.settings.production` (default; we'll override for tests)
   - `CORS_ALLOWED_ORIGINS` — optional; can be empty for staging if you don't need frontend access
   - `CSRF_TRUSTED_ORIGINS` — optional; same as above

3. Railway automatically deploys the same code to staging when you push to the linked branch (usually `main`).

### 4. Run Migrations on Staging

Once deployed:

```powershell
railway login
railway link
railway environment -e staging
railway ssh -e staging python manage.py migrate
```

Or seed demo data:

```powershell
railway ssh -e staging python manage.py seed_demo
```

## Running the Full Test Suite on Staging

### Option 1: SSH into staging service and run pytest

```powershell
# Force test settings and run pytest inside staging container
railway ssh -e staging -- bash -c "DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest --no-cov -q"
```

Notes:
- This runs against the staging Postgres (creates a temporary test DB, runs migrations, then destroys it).
- `--no-cov` skips coverage to speed up.
- `-q` is quiet mode; remove for verbose output.

### Option 2: Run locally against staging DB (not recommended)

You could set `DATABASE_URL` locally to the staging **Public Connection URL** and run pytest, but this is slower due to network latency. Prefer running inside the container.

## Verification Workflow (Recommended)

Before promoting a build to production:

1. **Local**: run `pytest` (fast feedback loop)
2. **Staging**: deploy to staging, run full suite via `railway ssh`
3. **Staging smoke**: run read-only smoke checks against staging:
   - `railway ssh -e staging python scripts/dev-utils/smoke_production.py --mode read`
4. **Promote to production**: if all green, deploy the same commit to production
5. **Production smoke**: run read-only smoke checks against production (see [railway-setup.md](railway-setup.md))

## Cost Notes

- Staging Postgres is a **separate database** and adds cost to your Railway plan.
- The smallest Postgres plan is usually sufficient for staging (~$5/month shared).
- You can delete the staging environment when not actively testing to save cost, but it's useful to keep it running for CI/pre-deploy checks.

## Troubleshooting

### "Application Error" in staging
- Check deploy logs: `railway logs -e staging`
- Ensure `DATABASE_URL` is linked to the staging Postgres plugin

### Tests fail with "too many clients"
- Staging Postgres has connection limits; reduce `CONN_MAX_AGE` or restart the staging DB

### Migrations not applied
- Run `railway ssh -e staging python manage.py migrate` manually

## Next Steps

- Set up **CI/CD** to automatically run `pytest` on staging before production deploy (GitHub Actions or Railway build hooks).
- Add staging smoke checks to your deploy checklist.
