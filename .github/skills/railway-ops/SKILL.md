````skill
---
name: railway-ops
description: "Run Django management commands on Railway, seed data, monitor logs, diagnose issues — all Railway operational tasks"
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

### ⚠️ CRITICAL: `railway run` Limitation

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

```powershell
# Get recent logs
railway logs 2>&1 | Select-Object -First 50

# Search for errors
railway logs 2>&1 | Select-String -Pattern "error|exception|traceback|500"

# Search for specific patterns
railway logs 2>&1 | Select-String "api/v1/branding"
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

### Core Setup (run in order for fresh DB)

| Order | Command | What it does |
|-------|---------|-------------|
| 1 | `seed_sports` | Sport configuration (football, hockey, etc.) |
| 2 | `seed_demo_data` | 5 orgs, 20 users, 80 projects, events, transactions |
| 3 | `seed_default_roles` | RBAC permissions and roles |
| 4 | `seed_branding` | Brand profiles and design tokens |
| 5 | `seed_app_backgrounds` | Sport-linked video backgrounds (S3 upload) |

### By Domain

#### Organisations & Structure
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_demo_data` (accounts) | Full demo: 5 orgs, 20 users, 80 projects | ✅ |
| `seed_demo_data` (organisations) | Basic org demo data | ❌ |
| `seed_admins` | Admin memberships for coaches/directors | ❌ |
| `seed_level_1_users` | 5 demo users | ❌ |
| `seed_level_2_organisations` | 5 European football federations | ❌ |
| `seed_level_3_clubs` | 92 European clubs | ❌ |
| `seed_level_4_teams` | 220 teams | ❌ |
| `seed_level_5_seasons` | 50 seasons | ❌ |
| `seed_level_6_competitions` | 350 competitions | ❌ |
| `seed_level_9_players` | Players and coaching staff | ❌ |
| `seed_teamreel_demo` | Full hierarchical football data | ❌ |
| `seed_teamreel_production` | Complete production demo | ❌ |

#### Sports & Configuration
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_sports` | Sport categories and variants | ❌ |
| `seed_teamreel_sports` | Sport assignments + outfits for clubs | ❌ |

#### Branding & Visual
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_branding` | Brand profiles and design tokens | ❌ |
| `seed_club_branding` | Club-specific brand profiles | ❌ |
| `seed_app_backgrounds` | Sport-linked video backgrounds (S3) | ✅ |

#### Activities & Matches
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_demo_activities` | Periods, Activities, Participations | ❌ |
| `seed_knvb_matches` | KNVB matches (Ajax pattern) | ❌ |
| `seed_match_activity_events` | Match events (goals/assists) | ✅ |
| `seed_match_participations` | Match lineup participations | ❌ |
| `seed_eredivisie_complete` | Full Eredivisie data | ❌ |
| `seed_cup_matches` | KNVB Beker knock-out | ❌ |

#### Permissions & RBAC
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_default_roles` | Default permissions and roles | ✅ |
| `seed_teamreel_rbac` | TeamReel hierarchical RBAC | ❌ |
| `seed_rbac_memberships` | Demo RBAC memberships | ❌ |

#### Content & Templates
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_content_templates` | Global content templates | ❌ |
| `seed_lineup_433_modern` | 4-3-3 Modern video template | ❌ |
| `seed_templates` | Generation templates per org | ❌ |
| `seed_video_presets` | Video presets and platform exports | ❌ |

#### Transactions & Credits
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_credit_transactions` | Credit transactions | ❌ |
| `seed_teamreel_transactions` | Deterministic transactions | ❌ |
| `seed_teamreel_contentgen_demo` | Content-gen usage events | ❌ |

#### Settings & Notifications
| Command | Description | `--force` |
|---------|-------------|-----------|
| `seed_feature_flags` | dark_theme feature flag | ❌ |
| `seed_theme_settings` | Theme settings per org | ❌ |
| `seed_notifications` | Demo notifications | ❌ |
| `seed_teamreel_notifications` | TeamReel notifications (idempotent) | ❌ |

## S3 Requirements

Commands that upload files (e.g. `seed_app_backgrounds`) need these env vars on the `backend` service:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_STORAGE_BUCKET_NAME`

These are already configured on the Railway `backend` service. Running via `railway run` automatically uses them.

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
