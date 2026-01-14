import psycopg2
from collections import defaultdict

conn_str = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("\n🔍 Finding Duplicate Players:\n")

    # Find users with same first_name, last_name in same club
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
                m.created_at
            FROM projects_membership m
            JOIN projects_project p ON m.project_id = p.id
            JOIN projects_project parent ON p.parent_project_id = parent.id
            JOIN accounts_user u ON m.user_id = u.id
            WHERE parent.parent_project_id IS NULL
        )
        SELECT
            first_name,
            last_name,
            club_name,
            COUNT(*) as count,
            ARRAY_AGG(user_id ORDER BY created_at) as user_ids,
            ARRAY_AGG(email ORDER BY created_at) as emails,
            ARRAY_AGG(membership_id ORDER BY created_at) as membership_ids
        FROM club_members
        GROUP BY first_name, last_name, club_name
        HAVING COUNT(*) > 1
        ORDER BY club_name, count DESC, first_name, last_name
    """
    )

    duplicates = cur.fetchall()

    if not duplicates:
        print("✅ No duplicate players found!")
        conn.close()
        exit(0)

    print(f"Found {len(duplicates)} sets of duplicate players:\n")

    total_to_remove = 0
    by_club = defaultdict(list)

    for first_name, last_name, club_name, count, user_ids, emails, membership_ids in duplicates:
        by_club[club_name].append(
            {
                "name": f"{first_name} {last_name}",
                "count": count,
                "emails": emails,
                "user_ids": user_ids,
                "membership_ids": membership_ids,
            }
        )
        total_to_remove += count - 1  # Keep first, remove rest

    for club_name, players in sorted(by_club.items()):
        print(f"📍 {club_name}: {len(players)} duplicate sets")
        for player in players[:5]:  # Show first 5
            print(f"   • {player['name']} (x{player['count']})")
            for email in player["emails"]:
                print(f"      - {email}")
        if len(players) > 5:
            print(f"   ... and {len(players) - 5} more sets")
        print()

    print(f"💡 Total: {len(duplicates)} duplicate sets across {len(by_club)} clubs")
    print(f"   Will remove {total_to_remove} duplicate memberships (keeping oldest per player)")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
finally:
    if "conn" in locals():
        conn.close()
