# Demo DB Fix: Team-Scoped Seasons (TeamReel Hierarchy)

## Problem

Club detail pages show empty tabs because **production DB has NO data**:
- No Periods (seasons/competitions)
- No ProjectMemberships (users/players)
- No Activities (matches)
- No Organisation Memberships

## Root Cause

According to `documents/05-demo/teamreel-webapp-hierarchy.md`, the TeamReel demo uses **team-scoped periods**:
- Season: `project=<team>`, `parent_period=NULL`
- Competition: `project=<team>`, `parent_period=<season>`
- Match: `project=<team>`, `period=<competition>`

The existing seeder `seed_demo_activities` creates this structure correctly.

## Fix (Run Locally Against Railway DB)

### 1. Set Railway DATABASE_URL

PowerShell:
```powershell
$env:DATABASE_URL = "postgresql://postgres:<password>@<host>:<port>/<db>"
```

Get the URL from Railway project → Postgres plugin → Public URL.

### 2. Seed Team-Scoped Periods + Matches

This creates:
- Seasons per team
- Competitions per season per team
- Matches per competition per team

```bash
python manage.py seed_demo_activities
```

Or for specific league only:
```bash
python manage.py seed_demo_activities --league "Eredivisie"
```

### 3. Seed Player/Staff Memberships

This creates users + team memberships (season-scoped):

```bash
python manage.py seed_user_memberships --org knvb
```

Preview first:
```bash
python manage.py seed_user_memberships --org knvb --dry-run
```

### 4. Seed Organisation Memberships

Required for `/organisations/:slug/members/` (Users tab):

```bash
python manage.py seed_org_memberships
```

Preview first:
```bash
python manage.py seed_org_memberships --dry-run
```

## Verification

After seeding, check:
1. `/organisations/knvb/projects/almere-city` → Teams tab should show 4 teams
2. `/organisations/knvb/projects/almere-city` → Seasons tab should show team seasons
3. `/organisations/knvb/projects/almere-city` → Users tab should show players/staff
4. `/organisations/knvb/projects/almere-city` → Matches tab should show team matches

## Notes

- `seed_demo_activities` is **idempotent** (safe to run multiple times)
- `seed_user_memberships` checks for existing memberships before creating
- `seed_org_memberships` derives org memberships from project memberships

For questions, see:
- `docs/demo/DEMO_DB_STATUS.md` - Current seeding runbook
- `documents/05-demo/teamreel-webapp-hierarchy.md` - TeamReel hierarchy spec
