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

**Important:** You do not have access to the Railway Shell in the browser. All management commands must be run from your local terminal using the Railway CLI or by connecting directly to the database via the Public URL.

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

## 5. Running Management Commands Locally

To run management commands (like `rebuild_search_index` or `migrate`) from your local machine against the production database, you need to use the **Public URL** because the internal private URL is not accessible outside Railway's network.

1.  **Get the Public URL**:
    - Go to Railway Dashboard -> PostgreSQL Service -> Connect -> Public Networking.
    - Copy the `PostgreSQL Connection URL`.

2.  **Run the command**:
    Set the `DATABASE_URL` environment variable to the public URL before running the command.

    **PowerShell:**
    ```powershell
    # Note: Replace 'postgres.railway.internal' with the Public Domain from Railway Dashboard if running locally
    $env:DATABASE_URL="postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway"
    python manage.py rebuild_search_index
    ```

    **Bash:**
    ```bash
    # Note: Replace 'postgres.railway.internal' with the Public Domain from Railway Dashboard if running locally
    DATABASE_URL="postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway" python manage.py rebuild_search_index
    ```

> **Warning:** Be careful when running commands against production data. Ensure you do not commit real credentials to version control.

## 6. Troubleshooting

### Database Error: "FATAL: sorry, too many clients already"
This error occurs when the PostgreSQL database has reached its maximum number of concurrent connections. This often happens if `CONN_MAX_AGE` is set too high or if many local commands are run without closing connections.

**Solution:**
1.  **Restart the Database:** Go to the Railway Dashboard, select the PostgreSQL service, and click "Restart".
2.  **Restart the Backend:** Restarting the backend service will also close its open connections.
3.  **Check Configuration:** Ensure `CONN_MAX_AGE` in `production.py` is set to a reasonable value (e.g., `60`).
