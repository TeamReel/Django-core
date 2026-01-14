"""
Fix orphaned activities pointing to old 'League' period.

Problem: 34 Ajax activities reference period '973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf' (old 'League' period)
         but the API doesn't return this period, causing match counts to show 0.

Solution: Update these activities to point to the correct 'Eredivisie' period instead.
"""

import psycopg2

conn_str = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    old_period_id = "973f8b1e-b8cf-4ee9-96b4-80983c5ca0cf"  # Old 'League' period
    new_period_id = "b0fec978-d537-4eef-8421-59fda7b6db21"  # Eredivisie period

    # First, check which activities will be affected
    print(f"\n🔍 Activities currently pointing to old 'League' period:")
    cur.execute(
        """
        SELECT id, title, activity_type, start_time::date
        FROM activities_activity
        WHERE period_id = %s
        ORDER BY start_time
        LIMIT 10
    """,
        (old_period_id,),
    )

    for act in cur.fetchall():
        print(f"   {act[1]:40} ({act[2]}) on {act[3]}")

    # Count total
    cur.execute("SELECT COUNT(*) FROM activities_activity WHERE period_id = %s", (old_period_id,))
    total = cur.fetchone()[0]
    print(f"\n📊 Total activities to update: {total}")

    # Confirm the new period exists and is correct
    cur.execute(
        """
        SELECT id, name, project_id, start_date, end_date
        FROM activities_period
        WHERE id = %s
    """,
        (new_period_id,),
    )

    new_period = cur.fetchone()
    if new_period:
        print(f"\n✅ Target period 'Eredivisie' found:")
        print(f"   ID: {new_period[0]}")
        print(f"   Name: {new_period[1]}")
        print(f"   Project: {new_period[2]} (Ajax 1)")
        print(f"   Season: {new_period[3]} to {new_period[4]}")
    else:
        print(f"\n❌ Target period not found! Aborting.")
        cur.close()
        conn.close()
        exit(1)

    # Ask for confirmation
    print(f"\n⚠️  This will UPDATE {total} activities to point to 'Eredivisie' period.")
    response = input("Continue? (yes/no): ")

    if response.lower() == "yes":
        # Perform the update
        cur.execute(
            """
            UPDATE activities_activity
            SET period_id = %s
            WHERE period_id = %s
        """,
            (new_period_id, old_period_id),
        )

        conn.commit()
        print(f"\n✅ Successfully updated {cur.rowcount} activities!")
        print(f"   Old period: {old_period_id}")
        print(f"   New period: {new_period_id}")

        # Optionally delete the old period
        print(f"\n🗑️  The old 'League' period can now be deleted if needed.")
    else:
        print("\n❌ Update cancelled.")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
    if "conn" in locals():
        conn.rollback()
