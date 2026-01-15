# Demo DB Status (TeamReel / KNVB)

This is the **current source-of-truth** status doc for the TeamReel demo database.

If core pages (club/project detail) show empty tabs for **Seasons / Competitions / Matches / Users**, that usually means the production DB is missing:
- Org-wide Periods (Seasons + Competitions)
- ProjectMemberships (players/staff)
- Organisation Memberships (for `/organisations/:slug/members/`)
- Activities (matches)

## Expected Minimum for “No Empty Tabs”

- `activities.Period`:
  - Root seasons for KNVB (org-wide): `organisation=knvb`, `parent_period=NULL`, `project=NULL`
  - Child competitions under those seasons
- `projects.ProjectMembership`:
  - Player/staff memberships per team scoped to the org-wide Season
- `organisations.Membership`:
  - Org memberships for the same users
- `activities.Activity`:
  - Match schedules (typically seeded from competitions + registered teams)

## Railway Production Seeding Runbook (Team-Scoped Hierarchy)

**Important**: The hierarchy doc specifies **team-scoped seasons** (`project=<team>`), not org-wide periods!
The best seeder for this is `seed_demo_activities` which creates team-scoped periods + matches.

All commands must be executed locally against Railway Postgres using `DATABASE_URL`.

### 1) Set `DATABASE_URL` to Railway public Postgres URL

PowerShell:
```powershell
$env:DATABASE_URL = "postgresql://..."
```

### 2) Seed complete activity hierarchy (team-scoped seasons + competitions + matches)

This creates:
- Seasons per team (`project=<team>`, `parent_period=NULL`)
- Competitions per team (`project=<team>`, `parent_period=<season>`)
- Matches per team + competition

```bash
python manage.py seed_demo_activities
```

Optional: only for specific league:
```bash
python manage.py seed_demo_activities --league "Eredivisie"
```

### 3) Create player/staff memberships (Users tab)

Option A: Seed users into teams for a specific org:
```bash
python manage.py seed_user_memberships --org knvb
```

Preview first:
```bash
python manage.py seed_user_memberships --org knvb --dry-run
```

### 3b) Ensure team admins can manage multiple teams (and teams multiple admins)

This seeds **management** memberships (role=`admin`, period=NULL) so:
- 1 user can manage multiple teams
- multiple users can manage the same team

```bash
python manage.py seed_team_manager_memberships --org knvb
```

Preview first:
```bash
python manage.py seed_team_manager_memberships --org knvb --dry-run
```

### 4) Create organisation memberships (required for `/organisations/:slug/members/`)

This derives org memberships from project memberships:
```bash
python manage.py seed_org_memberships
```

Preview first:
```bash
python manage.py seed_org_memberships --dry-run
```

### 5) Make credits usage non-empty (user wallet burn)

If you want the demo to show lots of credit usage while a small number of users manage many teams,
seed many **user-wallet** debit transactions:

```bash
python manage.py seed_user_credit_burn --org knvb --user admin@teamreel.demo
```

Tweak volume:
```bash
python manage.py seed_user_credit_burn --org knvb --user admin@teamreel.demo --topup 10000 --debit-amount 10 --debits-per-team 50
```

### 6) Configure payer routing (production-friendly, per org)

To make debits automatically fall back (Option B), store the routing strategy in B10 Settings:

```bash
python manage.py set_transactions_payer_routing --org knvb --value user_project_org
```

Allowed values:
- `explicit`
- `user_project_org` (user → team → club)
- `project_user_org` (team → user → club)

Optional: set a GLOBAL default (used when an org has no override):
```bash
python manage.py set_transactions_payer_routing --global --value explicit
```

### 6b) Optional: routing smoke verification (idempotent)

If you want a **minimal, deterministic** verification that routing fallback is working (including org fallback), run:

```bash
python manage.py seed_transactions_routing_smoke --settings=config.settings.production --org knvb
```

Notes:
- `--org knvb` is sufficient.
- `--team-id <project_id>` is **optional** and lets you target a specific team/project for reproducibility.
- The command is idempotent (it uses deterministic `idempotency_key`s). On re-run you may see `↻ exists ...` for already-created rows.
- It prints a short “wallet_scope per idempotency key” table by re-fetching transactions by `idempotency_key`, so verification still works on repeat runs.

### Alternative: Full Eredivisie history with CSV import

If you have the CSV files:
```bash
python manage.py seed_eredivisie_complete
```

### Debug: Check what's missing

```bash
python manage.py seed_demo_gaps --dry-run
```

## Legacy Status Doc

The older tracking doc lives at:
- `archive/docs/demo/DEMO_DB_STATUS.md`
