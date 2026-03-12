# Getting Started — TeamReel Demo Integration

> Last updated: 2026-03-04

## Quick Start

### Accessing TeamReel

| Environment | URL |
|-------------|-----|
| **Live Demo** | [https://demo.teamreel.app](https://demo.teamreel.app) |
| **API Root** | [https://api.teamreel.app/api/v1/](https://api.teamreel.app/api/v1/) |
| **Local Dev** | `pnpm dev` (frontend) + `python manage.py runserver` (backend) |

### Key API Endpoints

| Endpoint | Resource |
|----------|----------|
| `/api/v1/organisations/` | Football federations |
| `/api/v1/projects/` | Clubs and teams |
| `/api/v1/periods/` | Seasons and competitions |
| `/api/v1/activities/` | Matches and events |
| `/api/v1/project-memberships/` | Players and staff |

---

## Integrating a New Module

When building a new module (e.g., Match Events, Formation Models), follow this checklist:

### 1. Understand the Hierarchy

```
Organisation (KNVB, DFB, etc.)
└── Project (Club: "AFC Ajax")
    └── Project (Team: "Ajax 1")
        └── Period (Season: "2024/2025")
            └── Period (Competition: "Eredivisie")
                └── Activity (match, training, event)
                     └── ActivityParticipation → ProjectMembership
```

### 2. Check FK Dependencies

1. Open [data/tables.md](data/tables.md) — schema + FK relations
2. Verify target tables have data: [data/counts.md](data/counts.md)

### 3. Write Idempotent Seeds

All seeds MUST be production-safe:

```python
# ✅ CORRECT — Idempotent
obj, created = MyModel.objects.update_or_create(
    natural_key="unique-identifier",
    defaults={"field": "value"}
)

# ❌ WRONG — Creates duplicates
MyModel.objects.create(natural_key="unique-identifier", field="value")
```

See [features/seeding-guide.md](features/seeding-guide.md) for full patterns.

### 4. Test Against Real Data

```powershell
# Set Railway DATABASE_URL
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"

# Run your seed
python scripts/seed_my_module.py

# Verify
python manage.py shell
>>> from myapp.models import MyModel
>>> MyModel.objects.count()
```

---

## Production Safety Rules

1. **NEVER DROP TABLES** — use migrations with `update_or_create`
2. **NEVER DELETE DATA** — soft-delete with `is_active=False`
3. **ALWAYS USE NATURAL KEYS** — for idempotent seeds (`slug`, `external_id`)
4. **TEST LOCALLY FIRST** — run seeds against local DB before Railway

---

## Domain Glossary

### Organisation

A top-level entity — typically a football federation (KNVB, DFB) but can represent any sporting organisation or club.

| Name | Country | Code |
|------|---------|------|
| KNVB | Netherlands | NL |
| DFB | Germany | DE |
| FIGC | Italy | IT |
| The FA | England | GB |

**Naming**: use official abbreviation (`KNVB`, not "Dutch Football Association").

### Project — Club vs Team

| Type | `parent_project` | Example |
|------|-------------------|---------|
| **Club** (root) | `null` | AFC Ajax |
| **Team** (child) | points to club | Ajax 1, Ajax U21 |

**Club naming**: official name with suffix — "AFC Ajax", not "Ajax".
**Team naming**: `{ClubShort} {Designation}` — "Ajax 1", "Ajax U21".

### Period — Season vs Competition

| Type | `parent_period` | Example |
|------|-----------------|---------|
| **Season** (root) | `null` | 2024/2025 |
| **Competition** (child) | points to season | Eredivisie, KNVB Beker |

**Season format**: always `YYYY/YYYY` — "2024/2025", never "24/25".

### Match

Display: `{Home} vs {Away}` — "Ajax 1 vs Feyenoord 1".

### FK Relationship Map

```
Organisation
  └── Project (Club)
        └── Project (Team)          ← parent_project self-ref
              └── Period (Season)
                    └── Period (Competition)  ← parent_period self-ref
                          └── Match
```

### Natural Keys for Seeding

| Model | Natural Key |
|-------|-------------|
| Organisation | `slug` |
| Project (Club) | `slug` + `organisation` |
| Project (Team) | `slug` + `parent_project` |
| Period (Season) | `slug` + `project` |
| Period (Competition) | `slug` + `parent_period` |
| Activity | `external_id` OR `slug` + `period` |
| User | `email` |

### External IDs

Store external IDs in `metadata` JSON when multiple sources apply:

```python
metadata = {
    "transfermarkt_id": 12345,
    "whoscored_id": 67890
}
```
