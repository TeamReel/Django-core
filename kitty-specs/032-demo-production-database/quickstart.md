# Quickstart (Demo Production Database & Seed Data)

## Profiles
- **demo**: PostgreSQL primary, Redis, backend+frontend. Auto-seed enabled by default.
- **demo-lite**: SQLite + Redis, backend+frontend. Seed manually (faster startup).

## Environment
Create `.env.demo.local` (or export env vars):
- `DEMO_DATABASE=postgresql` (or `sqlite` for lite)
- `DEMO_DATABASE_URL=postgresql://demo:demo@localhost:5432/demo` (ignored for sqlite)
- `DEMO_AUTO_SEED=true` (only for demo profile)
- `DEMO_RESET_ON_START=false` (danger: wipes DB if true)
- `DEMO_RANDOM_SEED=42` (optional for deterministic runs)

## Start
```bash
# Full demo (auto-seed)
docker-compose --profile demo up --build

# Lite demo (manual seed)
docker-compose --profile demo-lite up --build
```

## Management Commands

### Seed Demo Data
```bash
# Basic seed (idempotent - safe to rerun)
python manage.py seed_demo_data

# Force recreation (deletes existing demo data)
python manage.py seed_demo_data --force

# Verbose output with progress details
python manage.py seed_demo_data --verbose

# JSON output for automation
python manage.py seed_demo_data --json
```

**Sample Output** (JSON):
```json
{
  "status": "success",
  "organisations": 5,
  "superusers": 3,
  "org_admins": 10,
  "members_viewers": 7,
  "demo_accounts": 6,
  "users_additional": 14,
  "projects": 80,
  "audit_events_count": 250,
  "transactions_count": 150,
  "notifications_count": 200,
  "feature_flags_count": 15,
  "elapsed_seconds": 12.5
}
```

### Validate Data Integrity
```bash
# Basic validation with human-readable output
python manage.py validate_demo_data

# JSON output for CI/CD pipelines
python manage.py validate_demo_data --json
```

**Sample Output** (JSON - Pass):
```json
{
  "status": "pass",
  "violations_count": 0,
  "violations": [],
  "elapsed_seconds": 0.8,
  "db_size_mb": 52
}
```

**Sample Output** (JSON - Fail):
```json
{
  "status": "fail",
  "violations_count": 2,
  "violations": [
    {
      "check": "org_admins",
      "message": "Organisation 'TechCorp' has no admins"
    },
    {
      "check": "credit_balances",
      "message": "Organisation 'StartupLabs' has negative balance: -500"
    }
  ],
  "elapsed_seconds": 1.2,
  "db_size_mb": 52
}
```

### Reset Demo Data
```bash
# Reset and reseed (requires --force for safety)
python manage.py reset_demo_data --force

# Reset without reseeding (only wipe data)
python manage.py reset_demo_data --force --no-seed

# JSON output
python manage.py reset_demo_data --force --json

# Verbose progress messages
python manage.py reset_demo_data --force --verbose
```

**Sample Output** (JSON):
```json
{
  "status": "success",
  "wipe": {
    "deleted": {
      "projects": 80,
      "memberships": 20,
      "users": 20,
      "organisations": 5,
      "audit_events": 250,
      "transactions": 150,
      "notifications": 200
    },
    "elapsed_seconds": 2.3
  },
  "seed": {
    "skipped": false,
    "elapsed_seconds": 12.1
  },
  "total_elapsed_seconds": 14.4
}
```

## Expected Dataset
- 5 organisations; 20 users; 80 projects (15/30/10/5/20); audit events 200-300 seeded; transactions last 30 days; notifications 5-10 unread per demo account.

## Verification Checklist

### Automated Checks
```bash
# 1. Data integrity validation (should pass)
python manage.py validate_demo_data
# Expected: "✓ Validation passed - all checks OK"

# 2. Check counts with JSON output
python manage.py validate_demo_data --json
# Expected: status: "pass", violations_count: 0

# 3. Verify idempotency (rerun should skip)
python manage.py seed_demo_data
# Expected: "Demo data already exists... Skipping"

# 4. Test reset and reseed
python manage.py reset_demo_data --force --json
# Expected: status: "success", wipe and seed completed
```

### Manual Verification
- **Login as superuser**: `admin@demo.djangocore.app` (Demo2024!) → see 5 orgs in org switcher
- **Login as org admin**: `admin@datalab.djangocore.app` (Demo2024!) → DataLab shows 30 projects
- **Check audit log**: Shows 200-300 events over last 30 days
- **Check notifications**: 5-10 unread for each demo account
- **Performance**: Seed rerun <5s when data exists; full startup <60s; seed <30s
- **Database size**: ~50MB after full seed

### Docker Profile Verification
```bash
# Demo profile (PostgreSQL + auto-seed)
docker-compose --profile demo up
# Expected: Starts in <60s with auto-seeded data

# Demo-lite profile (SQLite + manual seed)
docker-compose --profile demo-lite up
docker exec -it <container> python manage.py seed_demo_data
# Expected: Starts in <30s, manual seed completes successfully

# Health check
curl http://localhost:8080/health/live
# Expected: HTTP 200

# Container logs should show:
# - Database connection successful
# - Migrations applied
# - Demo data seeded (demo profile only)
# - Static files collected
# - Server started successfully
```

### Expected Counts
| Entity | Count | Verification Command |
|--------|-------|----------------------|
| Organizations | 5 | `python manage.py shell -c "from organisations.models import Organisation; print(Organisation.objects.count())"` |
| Users | 20 | `python manage.py shell -c "from accounts.models import User; print(User.objects.count())"` |
| Projects | 80 | `python manage.py shell -c "from projects.models import Project; print(Project.all_objects.count())"` |
| Audit Events | 200-300 | Inspect via admin or API |
| Transactions | Variable | Last 30 days, inspect via admin |
| Notifications | Variable | 5-10 unread per account |
