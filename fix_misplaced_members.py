import psycopg2

conn_str = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)

# Email domain to club name mapping
DOMAIN_TO_CLUB = {
    "feyenoord.demo": "Feyenoord",
    "psv.demo": "PSV",
    "fcutrecht.demo": "FC Utrecht",
    "peczwolle.demo": "PEC Zwolle",
    "rbleipzig.demo": "RB Leipzig",
    "scheerenveen.demo": "SC Heerenveen",
    "fctwente.demo": "FC Twente",
    "napoli.demo": "Napoli",
    "goaheadeagles.demo": "Go Ahead Eagles",
    "nacbreda.demo": "NAC Breda",
    "fortunasittard.demo": "Fortuna Sittard",
    "rkcwaalwijk.demo": "RKC Waalwijk",
    "atalanta.demo": "Atalanta",
    "intermilan.demo": "Inter Milan",
    "vfbstuttgart.demo": "VfB Stuttgart",
    "bayerleverkusen.demo": "Bayer Leverkusen",
    "fcgroningen.demo": "FC Groningen",
    "bayernmunchen.demo": "Bayern München",
    "heraclesalmelo.demo": "Heracles Almelo",
    "az.demo": "AZ",
}

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("\n🔍 Finding Misplaced Ajax Members and Their Correct Teams:\n")

    # Get all Ajax team memberships
    cur.execute(
        """
        SELECT
            u.id as user_id,
            u.email,
            u.first_name,
            u.last_name,
            m.id as membership_id,
            p.id as current_team_id,
            p.name as current_team_name
        FROM accounts_user u
        JOIN projects_membership m ON u.id = m.user_id
        JOIN projects_project p ON m.project_id = p.id
        LEFT JOIN projects_project parent ON p.parent_project_id = parent.id
        WHERE parent.id = 2 OR p.id = 2  -- Ajax club (ID 2)
        ORDER BY u.email
    """
    )

    ajax_members = cur.fetchall()

    # Find their correct target teams
    updates = []

    for user_id, email, fname, lname, membership_id, team_id, team_name in ajax_members:
        domain = email.split("@")[1] if "@" in email else ""
        expected_club = DOMAIN_TO_CLUB.get(domain)

        if expected_club:
            # Find first team (with lowest ID) of the expected club
            cur.execute(
                """
                SELECT p.id, p.name, parent.name as club_name
                FROM projects_project p
                LEFT JOIN projects_project parent ON p.parent_project_id = parent.id
                WHERE (parent.name = %s OR p.name = %s)
                  AND p.parent_project_id IS NOT NULL  -- Must be a team, not a club
                ORDER BY p.id ASC
                LIMIT 1
            """,
                (expected_club, expected_club),
            )

            target_team = cur.fetchone()

            if target_team:
                target_team_id, target_team_name, target_club_name = target_team
                updates.append(
                    {
                        "membership_id": membership_id,
                        "user_id": user_id,
                        "full_name": f"{fname} {lname}",
                        "email": email,
                        "from_team_id": team_id,
                        "from_team": team_name,
                        "to_team_id": target_team_id,
                        "to_team": target_team_name,
                        "to_club": target_club_name,
                    }
                )

    print(f"Found {len(updates)} memberships to move:\n")

    for i, update in enumerate(updates, 1):
        print(f"{i:2}. {update['full_name']:30} ({update['email']:40})")
        print(f"    FROM: Ajax - {update['from_team']}")
        print(f"    TO:   {update['to_club']} - {update['to_team']}")
        print()

    if not updates:
        print("✅ No misplaced members found!")
        cur.close()
        conn.close()
        exit()

    print("=" * 80)
    print(f"\n⚠️  This will UPDATE {len(updates)} membership records")
    print("   Moving users from Ajax teams to their correct clubs\n")

    confirm = input("Proceed with updates? (yes/no): ").strip().lower()

    if confirm == "yes":
        print("\n🔧 Updating memberships...\n")

        for update in updates:
            try:
                cur.execute(
                    """
                    UPDATE projects_membership
                    SET project_id = %s
                    WHERE id = %s
                """,
                    (update["to_team_id"], update["membership_id"]),
                )

                print(f"✅ {update['full_name']} → {update['to_club']}")

            except Exception as e:
                print(f"❌ Failed to move {update['full_name']}: {e}")

        conn.commit()
        print(f"\n✅ Successfully moved {len(updates)} members!")

    else:
        print("\n❌ Update cancelled")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback

    traceback.print_exc()
