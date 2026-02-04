# Database Hierarchy

> ⚠️ **Placeholder** - Run against production PostgreSQL to generate actual data

```powershell
# Set Railway DATABASE_URL
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"

# Generate hierarchy
python scripts/generate_demo_docs.py
```

---

## Expected Output

When run against production, this file will contain:

```
## 🏛️ KNVB
- Slug: `knvb`
- Country: NL

### 🏟️ AFC Ajax
- Slug: `afc-ajax`

#### ⚽ Ajax 1
- Slug: `ajax-1`
- Seasons:
  - **2024/2025**
    - Eredivisie
    - KNVB Beker
    - Champions League
```

---

See [glossary.md](../glossary.md) for naming conventions and canonical data.
