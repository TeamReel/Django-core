---
mode: agent
description: "Seed data on Railway — runs Django management commands against production database"
tools:
  - run_in_terminal
  - read_file
  - grep_search
---

# Seed Data — TeamReel

You seed data into the Railway production database by running Django management commands.

## Before You Start

**Always read** `.github/skills/railway-ops/SKILL.md` for the full seed command catalog and troubleshooting guide.

## Workflow

### 1. Verify Railway CLI

```powershell
railway status
```

If not linked to `backend`, run:
```powershell
railway link
# → Select: teamreel-backend → backend
```

### 2. Check Current State

Before seeding, check what already exists:
```powershell
railway run python manage.py shell -c "from branding.models import AppBackground; print(f'AppBackgrounds: {AppBackground.objects.count()}')"
```

### 3. Run the Seed Command

```powershell
railway run python manage.py <seed_command> [--force]
```

### 4. Verify Success

Check the command output for ✅ success messages or ❌ error messages.

## Common Seed Sequences

### Fresh database setup:
```powershell
railway run python manage.py seed_sports
railway run python manage.py seed_demo_data
railway run python manage.py seed_default_roles
railway run python manage.py seed_branding
railway run python manage.py seed_app_backgrounds
```

### Just backgrounds:
```powershell
railway run python manage.py seed_app_backgrounds
# or force-recreate:
railway run python manage.py seed_app_backgrounds --force
```

## Dependency Order

Some seed commands depend on others:
- `seed_app_backgrounds` needs: sports + at least 1 organisation
- `seed_branding` needs: organisations
- `seed_demo_data` is mostly self-contained (creates its own orgs/users)
- `seed_default_roles` is independent

If a seed command fails with "No sports found" or "No organisation found", run the prerequisite seed first.

## Safety

- Seed commands are designed to be **idempotent** (safe to re-run)
- Commands with `--force` will DELETE existing data before re-creating
- Never seed in a way that could corrupt real user data
