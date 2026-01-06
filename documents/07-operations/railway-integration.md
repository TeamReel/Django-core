# Railway Integration Guide

## Overview
The Django Core-App is deployed to **Railway** using a multi-service architecture. This document explains how the repository integrates with Railway's platform.

## Architecture on Railway

The application runs as **3 separate Railway services**:

1.  **Web Service** (Primary)
    *   **Process:** `web` from `Procfile`
    *   **Command:** `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
    *   **Purpose:** Handles HTTP requests (Django API + Web UI).
    *   **Auto-Deployed:** Yes (connects to GitHub).

2.  **Beat Service** (Scheduler)
    *   **Process:** `beat` from `Procfile`
    *   **Command:** `celery -A config beat --loglevel=info`
    *   **Purpose:** Runs periodic tasks (e.g., cache metrics every 10 minutes).
    *   **Setup:** Manual service creation in Railway Dashboard.

3.  **Worker Service** (Optional)
    *   **Process:** `worker` (commented in `Procfile`)
    *   **Command:** `celery -A config worker --loglevel=info`
    *   **Purpose:** Processes async tasks (emails, file processing).
    *   **Setup:** Create if async task processing is needed.

## Configuration Files

### `railway.json`
Tells Railway to use **Nixpacks** builder and defines restart policy.

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": { "numReplicas": 1, "restartPolicyType": "ON_FAILURE" }
}
```

### `Procfile`
Defines process types. Railway automatically runs the `web` process. Other processes require manual service creation.

### Environment Variables (Railway Dashboard)
Railway automatically provides:
*   `DATABASE_URL`: PostgreSQL connection string (from Railway Postgres service).
*   `REDIS_URL`: Redis connection string (from Railway Redis service).
*   `PORT`: The port Railway expects the web server to bind to.

**Custom Variables to Set:**
*   `SECRET_KEY`: Django secret (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
*   `ALLOWED_HOSTS`: Your Railway domain (e.g., `your-app.up.railway.app`).
*   `CSRF_TRUSTED_ORIGINS`: `https://your-app.up.railway.app`.

## Deployment Workflow

1.  **Push to GitHub:** Code is committed to the main branch.
2.  **Railway Trigger:** Railway detects the push and starts a build.
3.  **Build Phase:** Nixpacks builds the Docker image using `Dockerfile`.
4.  **Deploy Phase:** Railway starts the `web` process.
5.  **Health Checks:** Railway monitors `/health/live` for liveness.

## Database Access

Railway provides a **Public TCP Proxy** for connecting to the database from local scripts:

```bash
postgresql://postgres:<password>@switchback.proxy.rlwy.net:17304/railway
```

**Usage in Scripts:**
```python
import os
os.environ['DATABASE_URL'] = 'postgresql://...'
import django
django.setup()
```

## Logs & Monitoring

*   **Logs:** View in Railway Dashboard under "Deployments" tab.
*   **Metrics:** Railway provides CPU/Memory graphs.
*   **Custom Metrics:** The app exposes `/metrics/` for Prometheus scraping (not yet configured in Railway).

## Common Issues

### "502 Bad Gateway"
*   **Cause:** Web process didn't bind to `$PORT`.
*   **Fix:** Ensure Gunicorn command uses `--bind 0.0.0.0:$PORT`.

### "Database connection failed"
*   **Cause:** `DATABASE_URL` not set or incorrect.
*   **Fix:** Check Railway Dashboard -> Variables.

### "CSRF Verification Failed"
*   **Cause:** `CSRF_TRUSTED_ORIGINS` not set.
*   **Fix:** Add your Railway domain to the environment variable.

## Scaling

*   **Horizontal:** Increase `numReplicas` in `railway.json` (requires Railway Pro plan).
*   **Vertical:** Railway automatically allocates resources based on usage.

## Next Steps

*   [ ] Configure custom domain (CNAME record).
*   [ ] Set up Prometheus scraping for `/metrics/`.
*   [ ] Enable Railway's built-in backups for PostgreSQL.
