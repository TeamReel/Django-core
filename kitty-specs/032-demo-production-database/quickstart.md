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

## Seed / Reset / Validate
```bash
# Manual seed (use for demo-lite or reruns)
python manage.py seed_demo_data

# Reset (dangerous; use --force)
python manage.py reset_demo_data --force

# Validate integrity
python manage.py validate_demo_data
```

## Expected Dataset
- 5 organisations; 20 users; 80 projects (15/30/10/5/20); audit events 200-300 seeded; transactions last 30 days; notifications 5-10 unread per demo account.

## Verification Checklist
- Login as `admin@demo.djangocore.app` (Demo2024!) → see 5 orgs.
- Login as `manager@demo.djangocore.app` → DataLab shows 30 projects, 5000 credits.
- Audit log shows 200-300 events over last 30 days.
- Notifications show 5-10 unread for each demo account.
- Seed rerun finishes <5s when data exists (idempotent).
- Full demo startup <60s; seed <30s; DB ~50MB.
