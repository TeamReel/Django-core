import psycopg2

conn_str = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("\n🔍 Finding Duplicate Memberships to Remove:\n")

    # Find duplicate memberships (keep oldest, remove rest)
    cur.execute(
        """
        WITH club_members AS (
            SELECT
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                parent.id as club_id,
                parent.name as club_name,
                m.id as membership_id,
                m.created_at,
                ROW_NUMBER() OVER (
                    PARTITION BY u.first_name, u.last_name, parent.id
                    ORDER BY m.created_at
                ) as rn
            FROM projects_membership m
            JOIN projects_project p ON m.project_id = p.id
            JOIN projects_project parent ON p.parent_project_id = parent.id
            JOIN accounts_user u ON m.user_id = u.id
            WHERE parent.parent_project_id IS NULL
        )
        SELECT
            membership_id,
            first_name,
            last_name,
            email,
            club_name
        FROM club_members
        WHERE rn > 1
        ORDER BY club_name, first_name, last_name
    """
    )

    to_remove = cur.fetchall()

    if not to_remove:
        print("✅ No duplicate memberships found!")
        conn.close()
        exit(0)

    print(f"Found {len(to_remove)} duplicate memberships to remove:\n")

    # Group by club for display
    by_club = {}
    for membership_id, first_name, last_name, email, club_name in to_remove:
        if club_name not in by_club:
            by_club[club_name] = []
        by_club[club_name].append(
            {"membership_id": membership_id, "name": f"{first_name} {last_name}", "email": email}
        )

    for club_name, members in sorted(by_club.items()):
        print(f"   {club_name}: {len(members)} duplicate memberships")
        for member in members[:3]:  # Show first 3
            print(f"      - {member['name']} ({member['email']})")
        if len(members) > 3:
            print(f"      ... and {len(members) - 3} more")

    print(f"\n💡 Total: {len(to_remove)} duplicate memberships across {len(by_club)} clubs")

    # Confirm before deleting
    confirm = (
        input(f"\n⚠️  Delete {len(to_remove)} duplicate memberships? (yes/no): ").strip().lower()
    )
    if confirm != "yes":
        print("❌ Aborted")
        conn.close()
        exit(0)

    print("\n🗑️  Deleting duplicate memberships...\n")

    # Delete duplicate memberships
    deleted_count = 0
    for membership_id, first_name, last_name, email, club_name in to_remove:
        cur.execute("DELETE FROM projects_membership WHERE id = %s", (membership_id,))
        deleted_count += 1
        if deleted_count <= 10 or deleted_count % 50 == 0:
            print(f"   ✓ Deleted {first_name} {last_name} duplicate from {club_name}")

    # Commit changes
    conn.commit()

    print(f"\n✅ Successfully deleted {deleted_count} duplicate memberships!")
    print(f"   Each player now has only 1 membership (oldest one kept)")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
    if "conn" in locals():
        conn.rollback()
finally:
    if "conn" in locals():
        conn.close()
