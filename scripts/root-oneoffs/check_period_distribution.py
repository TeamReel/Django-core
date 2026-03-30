import os

import psycopg2


DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise SystemExit(
        "DATABASE_URL is not set.\n"
        "Set DATABASE_URL to your Railway Postgres connection string and re-run.\n"
        "Never hardcode credentials in this repository."
    )

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Check period distribution
    query = """
    SELECT period_id, COUNT(*) as user_count 
    FROM projects_membership 
    WHERE project_id IN ('7', '125', '126', '127', '128') 
    AND deleted_at IS NULL 
    GROUP BY period_id 
    ORDER BY user_count DESC 
    LIMIT 10;
    """

    cur.execute(query)
    results = cur.fetchall()

    print("Period distribution for Go Ahead Eagles:")
    print("period_id | user_count")
    print("-" * 40)
    for row in results:
        print(f"{row[0]} | {row[1]}")

    # Also check total unique users
    cur.execute(
        """
    SELECT COUNT(DISTINCT user_id) 
    FROM projects_membership 
    WHERE project_id IN ('7', '125', '126', '127', '128') 
    AND deleted_at IS NULL;
    """
    )
    total = cur.fetchone()[0]
    print(f"\nTotal unique users: {total}")

    # Check NULL periods
    cur.execute(
        """
    SELECT COUNT(*) 
    FROM projects_membership 
    WHERE project_id IN ('7', '125', '126', '127', '128') 
    AND deleted_at IS NULL 
    AND period_id IS NULL;
    """
    )
    null_period = cur.fetchone()[0]
    print(f"Users with NULL period: {null_period}")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Error: {e}")
