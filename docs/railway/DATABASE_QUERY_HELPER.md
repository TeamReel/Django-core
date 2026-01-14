# Database Query Helper - Railway PostgreSQL

**Last Updated:** 2026-01-11
**Purpose:** Quick reference for querying Railway production database directly

---

## 📋 Connection Details

### Public Connection URL
```
postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway
```

**Important:** Use the **PUBLIC** URL (`switchback.proxy.rlwy.net`), NOT the internal hostname (`postgres.railway.internal`). The internal hostname only works from within Railway's network.

---

## 🔧 Quick Query Methods

### Method 1: Direct Python Script (Recommended)

```python
import psycopg2

conn_str = "postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway"
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

cur.execute("SELECT id, name FROM activities_period LIMIT 5")
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
```

**Advantages:**
- ✅ No Django imports needed
- ✅ Fast and simple
- ✅ Works from any directory
- ✅ Can use raw SQL

### Method 2: Django Management Command (from `src/` dir)

```powershell
cd src
$env:DATABASE_URL="postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway"
$env:DJANGO_SETTINGS_MODULE="config.settings.production"
python ../manage.py shell
```

Then in Python shell:
```python
from periods.models import Period
Period.objects.filter(name__icontains="Ajax").count()
```

**Disadvantages:**
- ❌ Requires Django setup
- ❌ Must be in correct directory
- ❌ Slower than direct SQL

### Method 3: psql (PowerShell)

```powershell
# Note: Requires psql installed locally
$env:PGPASSWORD="<PASSWORD>"
psql -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway -c "SELECT COUNT(*) FROM activities_period;"
```

---

## 📚 Common Queries

### Check Period Existence
```python
import psycopg2

conn = psycopg2.connect("postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway")
cur = conn.cursor()

period_id = "973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf"
cur.execute("SELECT id, name, project_id FROM activities_period WHERE id = %s", (period_id,))
result = cur.fetchone()

if result:
    print(f"Period: {result[1]} (Project: {result[2]})")
else:
    print("Period not found")

cur.close()
conn.close()
```

### Count Activities by Period
```python
cur.execute("SELECT COUNT(*) FROM activities_activity WHERE period_id = %s", (period_id,))
count = cur.fetchone()[0]
print(f"Activities: {count}")
```

### Find Projects by Name
```python
cur.execute("""
    SELECT id, name, slug, parent_project_id, organisation_id
    FROM projects_project
    WHERE name ILIKE %s
    ORDER BY id
""", ('%Ajax%',))

for proj in cur.fetchall():
    print(f"ID: {proj[0]}, Name: {proj[1]}, Slug: {proj[2]}")
```

### Check Data Integrity (Orphaned FKs)
```python
# Find activities referencing non-existent periods
cur.execute("""
    SELECT a.id, a.title, a.period_id
    FROM activities_activity a
    LEFT JOIN activities_period p ON a.period_id = p.id
    WHERE a.period_id IS NOT NULL AND p.id IS NULL
    LIMIT 10
""")
```

---

## 🗄️ Database Table Names

| Django Model | PostgreSQL Table | Common Columns |
|---|---|---|
| `Organisation` | `organisations_organisation` | id, name, slug |
| `Project` | `projects_project` | id, name, slug, parent_project_id, organisation_id |
| `Period` | `activities_period` | id, name, project_id, parent_period_id, organisation_id |
| `Activity` | `activities_activity` | id, title, activity_type, project_id, period_id |
| `ProjectMembership` | `projects_membership` | id, user_id, project_id, period_id |
| `User` | `auth_user` | id, email, username |

---

## ⚠️ Common Pitfalls

### Problem: "No module named 'periods'"
**Cause:** Running Django shell from wrong directory or without proper Python path.
**Solution:** Use direct psycopg2 connection instead (Method 1).

### Problem: "could not translate host name"
**Cause:** Using internal Railway hostname (`postgres.railway.internal`).
**Solution:** Use PUBLIC URL (`switchback.proxy.rlwy.net:17304`).

### Problem: PowerShell Variable Conflicts
**Cause:** `$host` and `$port` are reserved PowerShell variables.
**Solution:** Use `$pgHost`, `$pgPort` or embed directly in connection string.

---

## 🔍 Real-World Example: Mystery Period Investigation

**Problem:** Match counts showing 0 in frontend despite activities existing.

**Investigation Steps:**

1. **Check console logs** - Found activities reference period `973f8b1e-...`
2. **Check API response** - Period NOT in API response (636 periods checked)
3. **Query database directly:**

```python
import psycopg2

conn = psycopg2.connect("postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway")
cur = conn.cursor()

# Check period existence
cur.execute("""
    SELECT p.id, p.name, p.project_id, proj.name, proj.parent_project_id
    FROM activities_period p
    JOIN projects_project proj ON p.project_id = proj.id
    WHERE p.id = '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf'
""")
result = cur.fetchone()
print(f"Period: {result[1]} for Project: {result[3]}")  # "League" for "Ajax 1"

# Count affected activities
cur.execute("SELECT COUNT(*) FROM activities_activity WHERE period_id = %s", (result[0],))
print(f"Orphaned activities: {cur.fetchone()[0]}")  # 34 activities

cur.close()
conn.close()
```

**Root Cause:** Old duplicate "League" period not returned by API, but activities still reference it.

**Solution:** Update activities to point to correct period (Eredivisie) or delete old period.

---

## 🚀 Quick Copy-Paste Scripts

### Minimal Test Connection
```python
import psycopg2
conn = psycopg2.connect("postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway")
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM activities_period")
print(f"Total periods: {cur.fetchone()[0]}")
cur.close()
conn.close()
```

### Find All Ajax Data
```python
import psycopg2
conn = psycopg2.connect("postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway")
cur = conn.cursor()

print("Ajax Projects:")
cur.execute("SELECT id, name, slug FROM projects_project WHERE name ILIKE '%Ajax%' ORDER BY id")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} ({row[2]})")

print("\nAjax Periods:")
cur.execute("""
    SELECT p.id, p.name, proj.name
    FROM activities_period p
    JOIN projects_project proj ON p.project_id = proj.id
    WHERE proj.name ILIKE '%Ajax%'
    LIMIT 10
""")
for row in cur.fetchall():
    print(f"  {row[1]} for {row[2]}")

cur.close()
conn.close()
```

---

## 📝 Notes

- **Always use parameterized queries** (`%s`) to prevent SQL injection
- **Use transactions** for data modifications: `conn.commit()` or `conn.rollback()`
- **Close connections** properly to avoid connection pool exhaustion
- **Check Railway variables** if password changes: `railway variables --service backend`

**Security:** Never commit actual passwords to git. Use environment variables or separate config files.
