# SQL Query Library

Ready-to-use SQL queries for debugging and data analysis on Railway PostgreSQL.

## 📋 Usage

### With Python (psycopg2)

```python
import psycopg2

conn = psycopg2.connect("postgresql://postgres:PASSWORD@switchback.proxy.rlwy.net:17304/railway")
cur = conn.cursor()

# Read SQL file
with open('scripts/sql/check-period-existence.sql', 'r') as f:
    query = f.read()

# Execute
cur.execute(query, ('period-id-here',))
for row in cur.fetchall():
    print(row)

cur.close()
conn.close()
```

### With psql

```powershell
$env:PGPASSWORD="PASSWORD"
psql -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway -f scripts/sql/ajax-overview.sql
```

## 📁 Available Queries

| File | Description |
|------|-------------|
| `check-period-existence.sql` | Check if a specific period exists with full details |
| `find-orphaned-activities.sql` | Find activities referencing non-existent periods |
| `ajax-overview.sql` | Complete Ajax data hierarchy (clubs, teams, periods) |
| `count-by-organisation.sql` | Count projects, periods, activities per federation |
| `find-duplicate-periods.sql` | Find periods with duplicate names in same project |
| `active-memberships.sql` | Show current team memberships per organisation |

## 🔧 Query Parameters

Most queries use placeholders that need to be replaced:

- `$PERIOD_ID` - UUID of a period
- `$PROJECT_ID` - Integer ID of a project
- `$ORG_ID` - UUID of an organisation
- `%SEARCH%` - Text search pattern (e.g., '%Ajax%')

**With psycopg2:** Use `%s` and pass tuple of values:
```python
cur.execute(query, (period_id, project_id))
```

**With psql:** Replace manually before running.

## 📖 Related Documentation

- [database-queries.md](../../documents/06-workflow/database-queries.md) - How to connect and run queries
- [railway-setup.md](../../documents/06-workflow/railway-setup.md) - Railway configuration
- [teamreel-data-structure.md](../../documents/05-demo/teamreel-data-structure.md) - Database schema
