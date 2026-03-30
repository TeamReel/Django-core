# Database Query Guide - Railway PostgreSQL

**Last Updated:** 2026-01-11
**Purpose:** How to query the Railway production database directly for debugging and data analysis

---

## 📋 Connection Setup

### Get Database Credentials

```powershell
# View all Railway variables
railway variables --service backend

# The DATABASE_URL shows internal hostname (postgres.railway.internal)
# For local connections, you need the PUBLIC URL
```

**Public Connection URL** (see railway-setup.md):
```
postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway
```

⚠️ **Important:** Always use the **PUBLIC** proxy URL (`switchback.proxy.rlwy.net`), NOT the internal hostname. The internal hostname only works from within Railway's network.

---

## 🔧 Query Methods

### Method 1: Direct Python Script with psycopg2 (Recommended)

**Why:** Fast, simple, no Django imports needed, works from any directory.

```python
import psycopg2

# Public connection URL
conn_str = "postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway"

conn = psycopg2.connect(conn_str)
cur = conn.cursor()

# Execute query
cur.execute("SELECT id, name FROM activities_period LIMIT 5")

# Fetch results
for row in cur.fetchall():
    print(f"ID: {row[0]}, Name: {row[1]}")

# Always close
cur.close()
conn.close()
```

**Install psycopg2:**
```powershell
pip install psycopg2-binary
```

### Method 2: Django ORM via manage.py shell

```powershell
# Set environment variables
$env:DATABASE_URL="postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway"
$env:DJANGO_SETTINGS_MODULE="config.settings.production"

# Change to src directory (where Django can find modules)
cd src

# Run Django shell
python ../manage.py shell
```

Then in Python shell:
```python
from activities.models import Period, Activity
from projects.models import Project

# Query using Django ORM
periods = Period.objects.filter(name__icontains="Ajax")
print(f"Found {periods.count()} periods")
```

**Disadvantages:**
- Requires correct directory and Python path
- Slower than raw SQL
- More setup complexity

### Method 3: psql Command Line

```powershell
# Set password environment variable
$env:PGPASSWORD="PASSWORD"

# Connect and run query
psql -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway -c "SELECT COUNT(*) FROM activities_period;"

# Interactive mode
psql -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway
```

**Requires:** PostgreSQL client tools installed locally.

---

## 📚 Database Schema Reference

### Main Tables

| Django Model | PostgreSQL Table | Purpose |
|---|---|---|
| `Organisation` | `organisations_organisation` | Federations (KNVB, DFB, etc.) |
| `Project` | `projects_project` | Clubs and Teams |
| `Period` | `activities_period` | Seasons, Competitions |
| `Activity` | `activities_activity` | Matches, Training, etc. |
| `ProjectMembership` | `projects_membership` | Players/Staff assignments |
| `User` | `auth_user` | User accounts |
| `AuditEvent` | `audit_events` | Audit log |

### Common Columns

**projects_project:**
- `id` (integer)
- `name` (varchar)
- `slug` (varchar, unique per org)
- `parent_project_id` (integer, nullable) - NULL = Club, value = Team
- `organisation_id` (uuid)

**activities_period:**
- `id` (uuid)
- `name` (varchar)
- `project_id` (integer) - Links to team
- `parent_period_id` (uuid, nullable) - Competitions have parent Season
- `organisation_id` (uuid)
- `start_date`, `end_date` (date)

**activities_activity:**
- `id` (uuid)
- `title` (varchar)
- `activity_type` (varchar) - 'match', 'training', etc.
- `project_id` (integer) - Links to team
- `period_id` (uuid) - Links to competition/season
- `start_time` (timestamptz)

---

## 📁 Useful SQL Queries

See `scripts/sql/` directory for ready-to-use queries:
- `check-period-existence.sql` - Verify period exists
- `find-orphaned-activities.sql` - Find activities with missing periods
- `ajax-overview.sql` - Complete Ajax data structure
- `count-by-organisation.sql` - Data volume per federation

---

## ⚠️ Common Issues & Solutions

### Problem: "No module named 'periods'"
**Cause:** Django shell can't find modules (wrong directory).
**Solution:** Use Method 1 (direct psycopg2) instead.

### Problem: "could not translate host name"
**Cause:** Using internal Railway hostname.
**Solution:** Use PUBLIC URL (`switchback.proxy.rlwy.net`).

### Problem: PowerShell Variable Issues
**Cause:** `$host` and `$port` are reserved PowerShell variables.
**Solution:** Use different names (`$pgHost`, `$dbPort`) or embed in string directly.

### Problem: "Column does not exist"
**Cause:** Using Django model field names instead of database column names.
**Solution:** Check actual table schema or use Django ORM instead.

---

## 🔒 Security Notes

- **Never commit real passwords** to version control
- Use environment variables or separate config files
- For shared scripts, use placeholder: `PASSWORD` or `YOUR_PASSWORD_HERE`
- Check current password with: `railway variables --service backend | Select-String DATABASE_URL`

---

## 📖 Related Documentation

- [railway-setup.md](railway-setup.md) - Railway deployment and configuration
- [tables.md](../05-demo/data/tables.md) - Database schema and hierarchy
- [scripts/sql/](../../scripts/sql/) - Ready-to-use SQL queries

---

## 🎯 Quick Start Example

```python
# Save as: check_database.py
import psycopg2

# Connection string (get from Railway)
conn_str = "postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    # Quick health check
    cur.execute("SELECT COUNT(*) FROM activities_period")
    print(f"Total periods: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM activities_activity")
    print(f"Total activities: {cur.fetchone()[0]}")

    cur.execute("SELECT COUNT(*) FROM projects_project")
    print(f"Total projects: {cur.fetchone()[0]}")

    cur.close()
    conn.close()
    print("\n✅ Database connection successful!")

except Exception as e:
    print(f"❌ Error: {e}")
```

Run it:
```powershell
python check_database.py
```
