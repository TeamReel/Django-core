# Seeding Guide

> **Purpose**: Production-safe, idempotent data seeding patterns for TeamReel.

---

## 🎯 Core Principle: Idempotency

Every seed script MUST be **idempotent** - running it 10 times should have the same result as running it once.

### ✅ Correct Pattern: `update_or_create`

```python
from organisations.models import Organisation

org, created = Organisation.objects.update_or_create(
    slug="knvb",  # Natural key (unique identifier)
    defaults={
        "name": "KNVB",
        "country_code": "NL",
        "description": "Koninklijke Nederlandse Voetbalbond",
    }
)

if created:
    print(f"✅ Created: {org.name}")
else:
    print(f"🔄 Updated: {org.name}")
```

### ❌ Wrong Pattern: `create`

```python
# ❌ NEVER DO THIS - Creates duplicates on re-run
Organisation.objects.create(
    slug="knvb",
    name="KNVB",
)
```

### ❌ Wrong Pattern: `get_or_create` for evolving data

```python
# ❌ AVOID for data that might change
# get_or_create doesn't update existing records
org, created = Organisation.objects.get_or_create(
    slug="knvb",
    defaults={"name": "KNVB"}  # Won't update if exists!
)
```

---

## 📁 Seed Script Template

```python
#!/usr/bin/env python
"""
Seed: {Module Name}
Description: {What this seeds}
Author: {Name}
Date: {YYYY-MM-DD}
"""

import os
import sys

# Django setup
sys.path.insert(0, "src")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

import django
django.setup()

# Safety check - ensure PostgreSQL for production data
from django.db import connection
if os.getenv("REQUIRE_POSTGRES") and connection.vendor != "postgresql":
    raise SystemExit("❌ REQUIRE_POSTGRES set but not connected to PostgreSQL")


def seed_data():
    """Main seeding logic."""
    from myapp.models import MyModel

    data = [
        {"natural_key": "item-1", "name": "Item One"},
        {"natural_key": "item-2", "name": "Item Two"},
    ]

    created_count = 0
    updated_count = 0

    for item in data:
        obj, created = MyModel.objects.update_or_create(
            natural_key=item["natural_key"],
            defaults={"name": item["name"]}
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    print(f"✅ Created: {created_count}, Updated: {updated_count}")


if __name__ == "__main__":
    seed_data()
```

---

## 🔗 Seeding with FK Dependencies

When your model has foreign keys, seed in dependency order:

### 1. Resolve FK First

```python
from organisations.models import Organisation
from projects.models import Project

# 1. Ensure parent exists
org, _ = Organisation.objects.update_or_create(
    slug="knvb",
    defaults={"name": "KNVB"}
)

# 2. Create child with FK
club, created = Project.objects.update_or_create(
    slug="afc-ajax",
    organisation=org,  # FK resolved
    parent_project=None,  # Root project (club)
    defaults={"name": "AFC Ajax"}
)
```

### 2. Use `get()` for Required Parents

```python
from organisations.models import Organisation
from projects.models import Project

# Fail fast if parent doesn't exist
try:
    org = Organisation.objects.get(slug="knvb")
except Organisation.DoesNotExist:
    raise SystemExit("❌ Organisation 'knvb' must be seeded first!")

# Now safe to create child
club, _ = Project.objects.update_or_create(
    slug="afc-ajax",
    organisation=org,
    defaults={"name": "AFC Ajax"}
)
```

---

## 📊 Seeding Hierarchy (Dependency Order)

Seed in this order to respect FK constraints:

```
1. Organisation       (no dependencies)
2. User               (no dependencies)
3. Project (Club)     (FK: Organisation)
4. Project (Team)     (FK: Organisation, parent_project)
5. Period (Season)    (FK: Project)
6. Period (Competition) (FK: Project, parent_period)
7. Activity           (FK: project, period — activity_type: "match", "training", "event")
8. ActivityParticipation (FK: activity, membership)
```

> **Note:** Eerdere versie refereerde `Match`, `MatchTemplate`, `Roster`, `RosterEntry` — deze modellen bestaan niet. Gebruik `Activity` (met `activity_type`) en `ActivityParticipation` in plaats.

---

## 🌍 Environment Configuration

### Local Development (SQLite)
```powershell
# Uses SQLite by default
python scripts/seed_organisations.py
```

### Production (Railway PostgreSQL)
```powershell
# Set DATABASE_URL to Railway
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"

# Optional: Require PostgreSQL (safety check)
$env:REQUIRE_POSTGRES="1"

python scripts/seed_organisations.py
```

---

## 🛡️ Safety Patterns

### 1. Dry Run Mode

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--dry-run", action="store_true")
args = parser.parse_args()

if args.dry_run:
    print("🧪 DRY RUN - No changes will be made")
    # Use transaction rollback
    from django.db import transaction
    with transaction.atomic():
        seed_data()
        transaction.set_rollback(True)
else:
    seed_data()
```

### 2. Confirmation Prompt for Production

```python
from django.db import connection

if connection.vendor == "postgresql":
    confirm = input("⚠️  Connected to PostgreSQL. Continue? [y/N]: ")
    if confirm.lower() != "y":
        raise SystemExit("Aborted")
```

### 3. Count Before/After

```python
from myapp.models import MyModel

before = MyModel.objects.count()
seed_data()
after = MyModel.objects.count()

print(f"📊 Before: {before}, After: {after}, Delta: {after - before}")
```

---

## 📋 Available Seed Commands

| Script | Seeds | Dependencies |
|--------|-------|--------------|
| `scripts/seed_organisations.py` | KNVB, DFB, FIGC, The FA | None |
| `scripts/seed_clubs.py` | Ajax, Feyenoord, PSV, etc. | Organisations |
| `scripts/seed_teams.py` | Ajax 1, Ajax U21, etc. | Clubs |
| `scripts/seed_seasons.py` | 2024/2025, 2023/2024 | Teams |
| `scripts/seed_competitions.py` | Eredivisie, KNVB Beker | Seasons |

---

## 🔄 Management Commands

For repeated use, create Django management commands:

```python
# src/myapp/management/commands/seed_myapp.py
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = "Seed MyApp with initial data"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        if options["dry_run"]:
            self.stdout.write("🧪 DRY RUN")
        # ... seeding logic
```

Usage:
```bash
python manage.py seed_myapp --dry-run
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial guide |

---

## Gerelateerde docs

- [architecture.md](../architecture/overview.md) — Overzicht alle apps en models
- [project-hierarchy.md](project-hierarchy.md) — Project/club/team structuur
- [data-model.md](../architecture/data-model.md) — Database schema + FK relaties
