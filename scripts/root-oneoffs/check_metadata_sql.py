#!/usr/bin/env python
"""Check metadata with raw SQL."""
import psycopg2
import json

conn = psycopg2.connect(
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
cur = conn.cursor()

# Count total memberships
cur.execute(
    """
    SELECT COUNT(*)
    FROM projects_membership pm
    JOIN activities_period p ON pm.period_id = p.id
    WHERE p.name = 'Season 2024/2025'
"""
)
total = cur.fetchone()[0]
print(f"✓ Total memberships for Season 2024/2025: {total}")

# Check Ajax 1 squad
cur.execute(
    """
    SELECT
        u.first_name || ' ' || u.last_name as name,
        pm.metadata,
        pm.role
    FROM projects_membership pm
    JOIN projects_project proj ON pm.project_id = proj.id
    JOIN activities_period p ON pm.period_id = p.id
    JOIN accounts_user u ON pm.user_id = u.id
    WHERE proj.name = 'Ajax 1'
    AND p.name = 'Season 2024/2025'
    ORDER BY (pm.metadata->>'shirt_number')::int NULLS LAST
    LIMIT 10
"""
)

print(f"\nAjax 1 squad (first 10):")
print(f"{'#':<3} {'Name':<30} {'Position':<15} {'Role'}")
print("-" * 70)

for row in cur.fetchall():
    name, metadata, role = row
    meta = metadata if isinstance(metadata, dict) else {}
    num = meta.get("shirt_number", "N/A")
    pos = meta.get("position", "N/A")
    print(f"{num!s:<3} {name:<30} {pos:<15} {role}")

# Count metadata coverage
cur.execute(
    """
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN pm.metadata->'position' IS NOT NULL THEN 1 END) as with_position
    FROM projects_membership pm
    JOIN projects_project proj ON pm.project_id = proj.id
    JOIN activities_period p ON pm.period_id = p.id
    WHERE proj.name = 'Ajax 1'
    AND p.name = 'Season 2024/2025'
"""
)
total, with_pos = cur.fetchone()
print(f"\n✓ Memberships with position metadata: {with_pos}/{total}")

conn.close()
