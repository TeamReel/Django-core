import psycopg2

# Public Railway connection
conn_str = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    period_id = "973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf"

    # Check period details with project info
    cur.execute(
        """
        SELECT p.id, p.name, p.project_id, proj.name as project_name, proj.organisation_id
        FROM activities_period p
        LEFT JOIN projects_project proj ON p.project_id = proj.id
        WHERE p.id = %s
    """,
        (period_id,),
    )
    period = cur.fetchone()

    if period:
        print(f"\n✅ Period EXISTS:")
        print(f"   ID: {period[0]}")
        print(f"   Name: {period[1]}")
        print(f"   Project ID: {period[2]}")
        print(f"   Project Name: {period[3]}")
        print(f"   Organisation ID: {period[4]}")
    else:
        print(f"\n❌ Period NOT FOUND")

    # Check Project ID 93 details
    if period and period[2]:
        print(f"\n🔍 Checking Project ID {period[2]}:")
        cur.execute(
            """
            SELECT id, name, slug, parent_project_id, organisation_id
            FROM projects_project WHERE id = %s
        """,
            (period[2],),
        )
        proj = cur.fetchone()
        if proj:
            print(f"   Name: {proj[1]}")
            print(f"   Slug: {proj[2]}")
            print(f"   Parent: {proj[3]}")
            print(f"   Org ID: {proj[4]}")

    # Count activities
    cur.execute("SELECT COUNT(*) FROM activities_activity WHERE period_id = %s", (period_id,))
    count = cur.fetchone()[0]
    print(f"\n📊 Activities: {count}")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
