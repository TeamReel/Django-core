import psycopg2
import os

# Production database URL
DATABASE_URL = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Find user tables
print("=== Finding User Tables ===")
cur.execute(
    """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%user%' 
    ORDER BY table_name
"""
)
tables = cur.fetchall()
print("User tables:")
for t in tables:
    print(f"  - {t[0]}")

# Check common table names
print("\n=== Checking User Counts ===")
for table_name in ["identity_user", "auth_user", "users_customuser", "customuser"]:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cur.fetchone()[0]
        print(f"✓ {table_name}: {count} users")

        # Get sample data
        cur.execute(f"SELECT id, email FROM {table_name} LIMIT 5")
        samples = cur.fetchall()
        for s in samples:
            print(f"    - {s[0]}: {s[1]}")
        break
    except psycopg2.errors.UndefinedTable:
        print(f"✗ {table_name}: table not found")
        conn.rollback()

# Check project memberships
print("\n=== Checking Project Memberships ===")
try:
    cur.execute("SELECT COUNT(*) FROM projects_membership")
    count = cur.fetchone()[0]
    print(f"Total project memberships: {count}")

    # Count distinct users
    cur.execute("SELECT COUNT(DISTINCT user_id) FROM projects_membership")
    distinct_users = cur.fetchone()[0]
    print(f"Distinct users with memberships: {distinct_users}")

    # Users per club
    cur.execute(
        """
        SELECT p.name, COUNT(DISTINCT pm.user_id) as user_count
        FROM projects_membership pm
        JOIN projects_project p ON pm.project_id = p.id
        GROUP BY p.name
        ORDER BY user_count DESC
        LIMIT 10
    """
    )
    clubs = cur.fetchall()
    print("\nTop 10 projects by member count:")
    for club in clubs:
        print(f"  - {club[0]}: {club[1]} users")

except Exception as e:
    print(f"Error checking memberships: {e}")

conn.close()
