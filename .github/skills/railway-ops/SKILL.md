````skill
---
name: railway-ops
description: "Runs Django management commands on Railway, seeds data, monitors logs, and diagnoses production issues. Use when deploying, seeding data, checking logs, running migrations on Railway, or diagnosing production errors."
compatibility: "Requires Railway CLI (`railway`), PowerShell. Some commands need PostgreSQL public proxy URL."
metadata:
  author: teamreel
  argument-hint: "What to do (e.g. 'seed app backgrounds', 'check logs for errors', 'run migrations')"
---

# Railway Operations Skill

Execute management commands, seed data, monitor services, and diagnose production issues on Railway.

## Prerequisites

Before ANY Railway operation:
1. Ensure Railway CLI is installed: `Get-Command railway`
2. Link to the correct service (usually `backend`): `railway link`
3. Verify linking: `railway status`

> **IMPORTANT**: Railway CLI on Windows/PowerShell does NOT support `--tail` or `--num` flags.
> Always use PowerShell piping (`Select-Object`, `Select-String`) to filter output.

## Step 1: Determine the Operation Type

| Request | Service to link | Command pattern |
|---------|----------------|-----------------|
| Seed data | `backend` | `railway run python manage.py seed_*` |
| Run migrations | `backend` | `railway run python manage.py migrate` |
| Check migrations | `backend` | `railway run python manage.py showmigrations` |
| Django shell | `backend` | `railway run python manage.py shell` |
| Check health | `backend` | `railway run python manage.py check` |
| View backend logs | `backend` | `railway logs 2>&1 \| Select-Object -First 100` |
| View frontend logs | `frontend` | `railway logs 2>&1 \| Select-Object -First 100` |
| Check env vars | any service | `railway variables` |

## Step 2: Link to the Correct Service

```powershell
# Interactive — select project and service
railway link
# → Select project: teamreel-backend
# → Select service: backend (for most operations)

# Verify
railway status
```

## Step 3: Execute the Command

### CRITICAL: `railway run` Limitation

`railway run` injects Railway's **internal** `DATABASE_URL` (`postgres.railway.internal`) which is NOT reachable from your local machine. For commands that need DB access, use the **local execution approach** instead:

### Method A: Local Execution with Public DB URL (RECOMMENDED)

Use `config.settings.seeding` (extends production, disables Celery) and the **public proxy URL**:

```powershell
# Step 1: Get credentials from Railway
railway link -s Postgres  # Link to Postgres to see vars
railway variables          # Note DATABASE_PUBLIC_URL
railway link -s backend    # Link back to backend for other vars
railway variables          # Note AWS_* vars

# Step 2: Set env vars and run locally
$env:DATABASE_URL = "<DATABASE_PUBLIC_URL from Postgres service>"
$env:DJANGO_SETTINGS_MODULE = "config.settings.seeding"
$env:AWS_ACCESS_KEY_ID = "<from backend service>"
$env:AWS_SECRET_ACCESS_KEY = "<from backend service>"
$env:AWS_S3_BUCKET_NAME = "<from backend service>"
$env:AWS_S3_REGION = "<from backend service>"
python manage.py <command> [options]

# Step 3: Clean up env vars after
$env:DATABASE_URL = ""; $env:DJANGO_SETTINGS_MODULE = ""
$env:AWS_ACCESS_KEY_ID = ""; $env:AWS_SECRET_ACCESS_KEY = ""
$env:AWS_S3_BUCKET_NAME = ""; $env:AWS_S3_REGION = ""
```

### Method B: `railway run` (only for read-only/non-DB commands)

```powershell
# These work because they don't need the DB, or Railway infrastructure resolves internally:
railway run python manage.py check
railway run python manage.py showmigrations --list
```

> **When in doubt**: Use Method A. It always works.

### Viewing Logs

> **IMPORTANT**: Railway has TWO log streams. You must check BOTH.
> - `railway logs` = **runtime/access logs** (request URLs + status codes, no tracebacks)
> - `railway logs -d` = **deploy logs** (build output, startup, Django exceptions, tracebacks)

> **WARNING**: Railway labels most Django log output as `[ERRO]`, even INFO-level access logs.
> Do NOT trust Railway's log level labels. Filter for actual error patterns instead.

```powershell
$rw = "C:\Users\brian\AppData\Roaming\npm\railway.cmd"

# Always save to files for reliable analysis:
cmd /c "$rw logs -d 2>&1" | Out-File railway_deploy.txt -Encoding UTF8
cmd /c "$rw logs 2>&1" | Out-File railway_runtime.txt -Encoding UTF8

# Filter for REAL errors (not Railway's fake [ERRO]):
Select-String -Path railway_runtime.txt -Pattern '"[^"]*" 500'
Select-String -Path railway_deploy.txt -Pattern 'Traceback|Exception|Error:|Internal Server Error|status_code=500'

# Extract formatted tracebacks from deploy logs:
python -c "
import re
with open('railway_deploy.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
for m in re.finditer(r'exc_info=\"(Traceback[^\"]+)\"', content):
    tb = m.group(1).replace('\\n', '\n')
    print('='*60)
    print(tb)
    print()
"

# Search for specific patterns
cmd /c "$rw logs 2>&1" | Select-String "api/v1/branding"
```

### Database Access

```powershell
# Via Railway internal network
railway run python manage.py dbshell
railway run python manage.py shell

# Direct access via public proxy URL (from local machine)
psql "postgresql://postgres:<password>@switchback.proxy.rlwy.net:17304/railway"
```

## Step 4: Verify Success

After running a command:
1. Check the output for success/error messages
2. For seed commands: verify data was created via Django shell or API
3. For migrations: verify with `showmigrations`
4. For log checks: summarize findings

## Seed Command Catalog

**Full catalog**: See [references/seed-catalog.md](references/seed-catalog.md) for all 40+ seed commands organized by domain.

**Quick reference** — core setup order for fresh DB:

| Order | Command | What it does |
|-------|---------|-------------|
| 1 | `seed_sports` | Sport configuration |
| 2 | `seed_demo_data` | 5 orgs, 20 users, 80 projects |
| 3 | `seed_default_roles` | RBAC permissions and roles |
| 4 | `seed_branding` | Brand profiles and design tokens |
| 5 | `seed_app_backgrounds` | Sport-linked video backgrounds (S3) |

## S3 Requirements

Commands that upload files (e.g. `seed_app_backgrounds`) need these env vars on the `backend` service:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`

These are already configured on the Railway `backend` service.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError` | Wrong import path | Use bare imports: `from branding.models` not `from src.branding.models` |
| `ConnectionRefused` (DB) | Not using `railway run` | Prefix with `railway run` or use public proxy URL |
| `No sports found` | Sports not seeded | Run `seed_sports` or `seed_teamreel_sports` first |
| `No organisation found` | Empty DB | Run `seed_demo_data` first |
| `S3 permission error` | Missing AWS env vars | Check `railway variables` for `AWS_*` |
| `railway link` hangs | Service not selected | Use interactive prompt, select `teamreel-backend` → `backend` |

## Safety Rules

- **NEVER** run destructive operations without `--force` flag
- **NEVER** expose environment variable values in output
- **ALWAYS** link to `backend` service before running management commands
- **ALWAYS** verify the linked service with `railway status` before running

````
