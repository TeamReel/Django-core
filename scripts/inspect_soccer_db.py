"""
Inspect European Soccer Database structure and sample data.
"""

import sqlite3
import sys
from pathlib import Path

# Path to database
db_path = Path(__file__).parent.parent / "documents" / "05-demo" / "database.sqlite"

if not db_path.exists():
    print(f"❌ Database not found at: {db_path}")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 80)
print("EUROPEAN SOCCER DATABASE - STRUCTURE & SAMPLE DATA")
print("=" * 80)

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]

print(f"\n📊 Found {len(tables)} tables:\n")

for table in tables:
    print(f"\n{'=' * 80}")
    print(f"TABLE: {table}")
    print("=" * 80)

    # Get schema
    cursor.execute(f"PRAGMA table_info({table})")
    columns = cursor.fetchall()

    print(f"\n📋 Columns ({len(columns)}):")
    for col in columns:
        col_id, name, type_, notnull, default, pk = col
        pk_marker = " 🔑" if pk else ""
        null_marker = " NOT NULL" if notnull else ""
        print(f"  - {name:<30} {type_:<15}{null_marker}{pk_marker}")

    # Get row count
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"\n📈 Total rows: {count:,}")

    # Get sample data (first 3 rows)
    if count > 0:
        cursor.execute(f"SELECT * FROM {table} LIMIT 3")
        rows = cursor.fetchall()
        col_names = [col[1] for col in columns]

        print(f"\n🔍 Sample data (first 3 rows):")
        for i, row in enumerate(rows, 1):
            print(f"\n  Row {i}:")
            for col_name, value in zip(col_names, row):
                # Truncate long values
                value_str = str(value)
                if len(value_str) > 60:
                    value_str = value_str[:57] + "..."
                print(f"    {col_name:<25} = {value_str}")

conn.close()

print("\n" + "=" * 80)
print("✅ Inspection complete!")
print("=" * 80)
