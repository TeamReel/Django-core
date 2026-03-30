# Railway Configuration & Connection Guide

This guide helps you configure the backend on Railway.app and connect to it locally for management tasks.

For **staging environment setup** (to run the full test suite safely), see [railway-staging-setup.md](railway-staging-setup.md).

## 1. Critical Variables (Required)

| Variable | Value | Description |
|----------|-------|-------------|
| `SECRET_KEY` | `<random-string>` | **Required**. Generate a long random string. If missing, sessions will break on every restart. |
| `CORS_ALLOWED_ORIGINS` | `https://your-frontend.vercel.app,https://another-domain.com` | **Required for Frontend**. Comma-separated list of domains that can access the API. |
| `CSRF_TRUSTED_ORIGINS` | `https://your-frontend.vercel.app` | **Required for Login**. Must include the full URL with `https://` of your frontend. |

## 2. Optional / Auto-Configured Variables

| Variable | Default (if not set) | Description |
|----------|----------------------|-------------|
| `ALLOWED_HOSTS` | `.railway.app`, `localhost`, `.teamreel.app` | Controls which domains can serve the backend. Usually not needed unless you use a custom backend domain. |
| `DATABASE_URL` | (Auto-set by Plugin) | Connection string for PostgreSQL. |
| `REDIS_URL` | (Auto-set by Plugin) | Connection string for Redis. |
| `DJANGO_LOG_LEVEL` | `INFO` | Set to `DEBUG` only for temporary troubleshooting. |

## 3. Remote Connection (Running Commands Locally)

**Crucial:** You cannot use the internal `RAILWAY_PRIVATE_DOMAIN` from your local machine. You MUST use the **Public Connection URL**.

### Step 1: Get the Public Connection URL
1.  Go to your **Railway Dashboard**.
2.  Click on the **PostgreSQL** service card.
3.  Go to the **Connect** tab.
4.  Under "Public Networking", ensure it is **Enabled**.
5.  Copy the URL labeled **PostgreSQL Connection URL**.
    *   *Format:* `postgresql://postgres:PASSWORD@roundhouse.proxy.rlwy.net:12345/railway`

### Step 2: Run the Command
Set the `DATABASE_URL` environment variable temporarily for the command execution.

**PowerShell (Windows):**
```powershell
# 1. Set the variable (use the Public Connection URL from Railway)
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"

# 2. Run the command
python manage.py migrate

# Example: Rebuild search index
python manage.py rebuild_search_index
```

**Bash (Mac/Linux):**
```bash
# Run command with inline variable
DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway" python manage.py migrate
```

> **Warning:** Be careful when running commands against production data. Ensure you do not commit real credentials to version control.

## 4. Troubleshooting

### "Network Error" or CORS Issues
- **Symptom**: Frontend cannot fetch data, console shows "CORS policy" errors.
- **Fix**: Add your frontend domain (e.g., `https://my-app.vercel.app`) to `CORS_ALLOWED_ORIGINS`.
- **Note**: Ensure no trailing slashes (e.g., use `https://app.com`, not `https://app.com/`).

### "Forbidden (403) - CSRF verification failed"
- **Symptom**: Login fails, or POST requests fail.
- **Fix**: Add your frontend domain to `CSRF_TRUSTED_ORIGINS`.
- **Important**: Must include `https://`.

### "Application Error" or Deploy Failed
- **Check Logs**: Look at the "Deploy Logs" in Railway.
- **Health Check Failure**: If the logs show the app started but then "Health check failed", ensure `ALLOWED_HOSTS` includes `localhost` (it does by default).

### Database Error: "FATAL: sorry, too many clients already"
This error occurs when the PostgreSQL database has reached its maximum number of concurrent connections. This often happens if `CONN_MAX_AGE` is set too high or if many local commands are run without closing connections.

**Solution:**
1.  **Restart the Database:** Go to the Railway Dashboard, select the PostgreSQL service, and click "Restart".
2.  **Restart the Backend:** Restarting the backend service will also close its open connections.
3.  **Check Configuration:** Ensure `CONN_MAX_AGE` in `src/config/settings/production.py` is set to a reasonable value (e.g., `60`).

## 5. Create Superuser (CLI)

**Important:** You do not have access to the Railway Shell in the browser. All management commands must be run from your local terminal using the Railway CLI or by connecting directly to the database via the Public URL (see Section 3).

**Option A: Using Railway CLI**
1.  **Login** (if not already):
    ```powershell
    railway login
    ```
2.  **Link Project**:
    ```powershell
    railway link
    ```
3.  **Create Superuser**:
    ```powershell
    railway run python manage.py createsuperuser
    ```

**Option B: Using Public URL (Without CLI)**
1.  Set `$env:DATABASE_URL` as described in **Section 3**.
2.  Run: `python manage.py createsuperuser`

## 5b. Production validation (recommended)

Do **not** run `pytest` against the production DB.

Instead:
- Run full test suites against **staging** (see [railway-staging-setup.md](railway-staging-setup.md))
- For prod verification, run the production-safe smoke checks

### Full test suite on staging

Create a Railway **staging environment** with its own Postgres, deploy the same code, and run pytest there:

```powershell
railway ssh -e staging -- bash -c "DJANGO_SETTINGS_MODULE=config.settings.test python -m pytest --no-cov -q"
```

See [railway-staging-setup.md](railway-staging-setup.md) for complete setup steps.

### Smoke checks on production

Because the production DB URL inside Railway is often an **internal hostname** (e.g. `postgres.railway.internal`), you generally cannot rely on `railway run` from your local machine.

Instead, run the smoke script locally using the **Public Connection URL** (Section 3):

```powershell
# Set the variable (use the Public Connection URL from Railway)
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"

# Minimal key so production settings can load
$env:SECRET_KEY="smoke-check"

# Read-only checks
python scripts/dev-utils/smoke_production.py --mode read
```

After you’ve deployed a version that includes the smoke script, you can also run it *inside* the container:

```powershell
railway login
railway link
railway ssh python scripts/dev-utils/smoke_production.py --mode read
```

Runbook: `documents/07-operations/production-validation.md`

## 6. Setting Up Celery Beat Worker (Optional - For Cache Metrics)

**Purpose:** Celery Beat collects cache performance metrics every 10 minutes for the `/demo/performance` dashboard.

**Without this:** Cache dashboard works, but historical chart remains empty (real-time benchmark still works).

**Setup Steps:**

1. **In Railway Dashboard**, go to your project
2. Click **"+ New"** → **"Empty Service"**
3. Name it: `celery-beat`
4. **Settings** → **Source** → Link to the same GitHub repo
5. **Settings** → **Deploy** → **Custom Start Command**:
   ```bash
   celery -A config beat --loglevel=info
   ```
6. **Variables** → Share all variables from the `backend` service:
   - `DATABASE_URL` (link to PostgreSQL)
   - `REDIS_URL` (link to Redis)
   - `SECRET_KEY` (same as backend)
   - `DJANGO_SETTINGS_MODULE=config.settings.production`

7. **Deploy** the service

**Verification:**
- Check logs: Should see "Scheduler: Sending due task..."
- After 10 minutes, refresh `/demo/performance` → Historical chart shows data

**Cost:** Celery Beat is lightweight (~50MB RAM), adds minimal cost to Railway plan.
