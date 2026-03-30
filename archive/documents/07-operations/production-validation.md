# Production validation (best practice)

We do **not** run `pytest` against the production database.

Reasons:
- Tests may write data, assume isolation, or depend on seeded fixtures.
- Test runners often run migrations / create schemas / flush tables.
- Even “read-only” tests tend to drift over time.

Instead, use one of the safe patterns below.

## Option A (recommended): Staging / clone → run full suite

1. Create a **staging environment** (or clone the production DB into staging).
2. Deploy the exact build you intend to ship.
3. Run:
   - `python manage.py migrate --check` (or confirm migrations are applied)
   - `pytest` (full suite)
4. Promote the build to production.

Pros: closest to production, safe for prod data.

## Option B: Production-safe smoke checks

Use a conservative smoke script that:
- Connects to the DB
- Verifies expected migrations are applied
- Exercises tiny ORM queries / critical endpoints
- Avoids destructive actions

Script: [scripts/dev-utils/smoke_production.py](../../scripts/dev-utils/smoke_production.py)

### Read-only mode (default)

Run inside a production shell (Railway/Render/etc.) with the usual environment variables:

- `python scripts/dev-utils/smoke_production.py --mode read`

Optional (if you know a user email that exists):
- `python scripts/dev-utils/smoke_production.py --mode read --user-email you@example.com`

### Write mode (opt-in)

This performs a minimal write (set+clear active context) for a specific user. It is intentionally opt-in:

- `python scripts/dev-utils/smoke_production.py --mode write --user-email you@example.com`

Notes:
- It runs in a DB transaction and is **explicitly rolled back** (no persistent changes).
- Use this only if you want to validate the write path safely.

## Railway

Important nuance:
- `railway run ...` runs the command **locally** with Railway variables injected.
- In production, Railway often injects an **internal** `DATABASE_URL` host (e.g. `postgres.railway.internal`) which is **not resolvable from your laptop**.

### Option 1: Run locally using the **Public Connection URL** (recommended)

1. Get the PostgreSQL **Public Connection URL** (proxy URL) from Railway.
2. Run locally:
   - PowerShell:
     - `$env:DATABASE_URL="<public postgres url>"`
     - `$env:SECRET_KEY="smoke-check"`
     - `python scripts/dev-utils/smoke_production.py --mode read`

### Option 2: Run inside the container via `railway ssh` (after deploy)

Once the backend has been deployed with this script included, you can run it inside the service container:

- `railway ssh python scripts/dev-utils/smoke_production.py --mode read`

Railway setup guide: [railway-setup.md](../06-workflow/railway-setup.md)

## What differences exist between local and production?

Usually:
- **Settings**: local uses `DEBUG=True`, different auth/session/CSRF behavior.
- **DB engine & size**: local SQLite/small Postgres vs production Postgres with real data.
- **Caching/background jobs**: may be off locally.

That’s why the best practice is: full tests on staging/clone + smoke checks on production.
