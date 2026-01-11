"""
Fix ALL orphaned activities pointing to old duplicate 'League' periods.

Problem: Multiple teams (Ajax, Feyenoord, PSV) have activities pointing to old 'League' periods
         instead of the proper 'Eredivisie' competition period.

Solution: Update all affected activities to point to the correct competition period.
"""

import psycopg2

conn_str = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    # Find all teams with orphaned activities in old 'League' periods
    print("\n🔍 Finding teams with activities in old 'League' periods:\n")

    cur.execute(
        """
        WITH league_periods_with_activities AS (
            SELECT
                p.id as period_id,
                p.project_id,
                proj.name as project_name,
                (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) as activities_count
            FROM activities_period p
            JOIN projects_project proj ON p.project_id = proj.id
            WHERE p.name = 'League'
              AND EXISTS (
                  SELECT 1 FROM activities_period p2
                  WHERE p2.project_id = p.project_id
                    AND p2.name = 'League'
                  GROUP BY p2.project_id
                  HAVING COUNT(*) > 1
              )
              AND (SELECT COUNT(*) FROM activities_activity WHERE period_id = p.id) > 0
        )
        SELECT * FROM league_periods_with_activities
        ORDER BY project_id
    """
    )

    orphaned_periods = cur.fetchall()

    if not orphaned_periods:
        print("✅ No orphaned activities found!")
        cur.close()
        conn.close()
        exit(0)

    print(f"Found {len(orphaned_periods)} 'League' periods with activities:\n")
    total_activities = 0
    for period_id, project_id, project_name, activities_count in orphaned_periods:
        print(
            f"   {project_name:20} (Project {project_id:3}): {activities_count:3} activities in period {period_id[:8]}..."
        )
        total_activities += activities_count

    print(f"\n📊 Total activities to fix: {total_activities}")

    # Now find the correct target periods (Eredivisie) for each team
    print("\n🔍 Finding target 'Eredivisie' periods for each team:\n")

    fixes_to_apply = []

    for period_id, project_id, project_name, activities_count in orphaned_periods:
        # Find the Eredivisie period for this project
        cur.execute(
            """
            SELECT id, name
            FROM activities_period
            WHERE project_id = %s
              AND name = 'Eredivisie'
            LIMIT 1
        """,
            (project_id,),
        )

        target_period = cur.fetchone()

        if target_period:
            target_id, target_name = target_period
            print(
                f"   ✅ {project_name:20}: {period_id[:8]}... → {target_id[:8]}... ({target_name})"
            )
            fixes_to_apply.append(
                (period_id, target_id, project_id, project_name, activities_count)
            )
        else:
            print(f"   ❌ {project_name:20}: No 'Eredivisie' period found!")

    if not fixes_to_apply:
        print("\n❌ No valid target periods found. Aborting.")
        cur.close()
        conn.close()
        exit(1)

    # Confirm
    print(
        f"\n⚠️  This will update {len(fixes_to_apply)} period(s), affecting {total_activities} activities total."
    )
    response = input("\nContinue? (yes/no): ")

    if response.lower() != "yes":
        print("\n❌ Update cancelled.")
        cur.close()
        conn.close()
        exit(0)

    # Apply fixes
    print("\n🔧 Applying fixes...\n")

    for old_period_id, new_period_id, project_id, project_name, activities_count in fixes_to_apply:
        cur.execute(
            """
            UPDATE activities_activity
            SET period_id = %s
            WHERE period_id = %s
        """,
            (new_period_id, old_period_id),
        )

        updated = cur.rowcount
        print(f"   ✅ {project_name:20}: Updated {updated:3} activities")

    conn.commit()

    print(f"\n✅ Successfully fixed all orphaned activities!")
    print(f"\n💡 Note: You can now delete the old 'League' periods if they have no activities.")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
    if "conn" in locals():
        conn.rollback()
