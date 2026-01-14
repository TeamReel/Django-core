import psycopg2

conn_str = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    cur.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE '%user%'
        ORDER BY table_name
    """
    )

    print("\nUser-related tables:")
    for (table_name,) in cur.fetchall():
        print(f"  - {table_name}")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
