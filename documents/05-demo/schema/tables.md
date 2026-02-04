# Database Schema

> ⚠️ **Placeholder** - Run against production PostgreSQL to generate actual data

```powershell
# Set Railway DATABASE_URL
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"

# Generate schema
python scripts/generate_demo_docs.py
```

---

## FK Relationship Summary (Expected)

When run against production, this file will contain:

| Model | FK Field | Target |
|-------|----------|--------|
| activities.Activity | `period` | activities.Period |
| activities.Period | `project` | projects.Project |
| activities.Period | `parent_period` | activities.Period |
| projects.Project | `organisation` | organisations.Organisation |
| projects.Project | `parent_project` | projects.Project |

---

## Quick Reference: Core FK Relations

```
┌──────────────┐
│ Organisation │
└──────┬───────┘
       │ 1:N (organisation_id)
┌──────▼───────┐
│  Project     │──┐
│  (Club)      │  │ parent_project_id (self-ref)
└──────┬───────┘  │
       │ 1:N      │
┌──────▼───────┐◄─┘
│  Project     │
│  (Team)      │
└──────┬───────┘
       │ 1:N (project_id)
┌──────▼───────┐
│   Period     │──┐
│  (Season)    │  │ parent_period_id (self-ref)
└──────┬───────┘  │
       │ 1:N      │
┌──────▼───────┐◄─┘
│   Period     │
│ (Competition)│
└──────┬───────┘
       │ 1:N (period_id)
┌──────▼───────┐
│   Activity   │
│   (Match)    │
└──────────────┘
```

---

See [glossary.md](../glossary.md) for naming conventions and canonical data.
