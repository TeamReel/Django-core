# Railway Configuration Guide

This guide helps you configure the backend on Railway.app.
The codebase (`src/config/settings/production.py`) has smart defaults, but you need to set a few variables for security and frontend integration.

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

## 3. Troubleshooting

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

## 4. Create Superuser (CLI)

Since you cannot run interactive commands easily in the cloud console, use the Railway CLI on your laptop:

1.  **Login** (if not already):
    ```powershell
    railway login
    ```

2.  **Link Project**:
    ```powershell
    railway link
    ```
    *Select your project from the list.*

3.  **Create Superuser**:
    ```powershell
    railway run python manage.py createsuperuser
    ```
    *Follow the prompts to set username and password.*

> **Note:** If this fails with a database connection error, you may need to temporarily enable "Public Networking" on your PostgreSQL service in Railway, or use the `DATABASE_PUBLIC_URL` variable.
