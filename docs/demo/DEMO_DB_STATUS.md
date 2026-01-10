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

### 4) Create organisation memberships (required for `/organisations/:slug/members/`)

This derives org memberships from project memberships:
```bash
python manage.py seed_org_memberships
```

Preview first:
```bash
python manage.py seed_org_memberships --dry-run
```

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
