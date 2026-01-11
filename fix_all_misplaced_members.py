import psycopg2

conn_str = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)

# Comprehensive mapping of email domains to correct club names
DOMAIN_TO_CLUB = {
    # Dutch Eredivisie Clubs (no hyphens - demo users)
    "ajax.demo": "Ajax",
    "psv.demo": "PSV",
    "feyenoord.demo": "Feyenoord",
    "az.demo": "AZ",
    "fcutrecht.demo": "FC Utrecht",
    "fctwente.demo": "FC Twente",
    "peczwolle.demo": "PEC Zwolle",
    "scheerenveen.demo": "SC Heerenveen",
    "fcgroningen.demo": "FC Groningen",
    "spartarotterdam.demo": "Sparta Rotterdam",
    "goaheadeagles.demo": "Go Ahead Eagles",
    "nec.demo": "NEC",
    "fortunasittard.demo": "Fortuna Sittard",
    "heraclesalmelo.demo": "Heracles Almelo",
    "rkcwaalwijk.demo": "RKC Waalwijk",
    "nacbreda.demo": "NAC Breda",
    "willemii.demo": "Willem II",
    "almerecity.demo": "Almere City",
    # Dutch Eredivisie Clubs (with hyphens - real players)
    "fc-utrecht.demo": "FC Utrecht",
    "fc-twente.demo": "FC Twente",
    "pec-zwolle.demo": "PEC Zwolle",
    "sc-heerenveen.demo": "SC Heerenveen",
    "fc-groningen.demo": "FC Groningen",
    "sparta-rotterdam.demo": "Sparta Rotterdam",
    "go-ahead-eagles.demo": "Go Ahead Eagles",
    "fortuna-sittard.demo": "Fortuna Sittard",
    "heracles-almelo.demo": "Heracles Almelo",
    "rkc-waalwijk.demo": "RKC Waalwijk",
    "nac-breda.demo": "NAC Breda",
    "willem-ii.demo": "Willem II",
    "almere-city.demo": "Almere City",
    # International Clubs (no hyphens)
    "arsenal.demo": "Arsenal",
    "chelsea.demo": "Chelsea",
    "liverpool.demo": "Liverpool",
    "manchestercity.demo": "Manchester City",
    "manchesterunited.demo": "Manchester United",
    "tottenhamhotspur.demo": "Tottenham Hotspur",
    "bayernmunchen.demo": "Bayern München",
    "borussiadortmund.demo": "Borussia Dortmund",
    "rbleipzig.demo": "RB Leipzig",
    "bayerleverkusen.demo": "Bayer Leverkusen",
    "vfbstuttgart.demo": "VfB Stuttgart",
    "eintrachtfrankfurt.demo": "Eintracht Frankfurt",
    "juventus.demo": "Juventus",
    "intermilan.demo": "Inter Milan",
    "acmilan.demo": "AC Milan",
    "napoli.demo": "Napoli",
    "asroma.demo": "AS Roma",
    "atalanta.demo": "Atalanta",
    # International Clubs (with hyphens - real players)
    "manchester-city.demo": "Manchester City",
    "manchester-united.demo": "Manchester United",
    "tottenham-hotspur.demo": "Tottenham Hotspur",
    "bayern-munchen.demo": "Bayern München",
    "borussia-dortmund.demo": "Borussia Dortmund",
    "rb-leipzig.demo": "RB Leipzig",
    "bayer-leverkusen.demo": "Bayer Leverkusen",
    "vfb-stuttgart.demo": "VfB Stuttgart",
    "eintracht-frankfurt.demo": "Eintracht Frankfurt",
    "inter-milan.demo": "Inter Milan",
    "ac-milan.demo": "AC Milan",
    "as-roma.demo": "AS Roma",
}

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("\n🔍 Finding ALL Misplaced Members in Database:\n")

    # Get all memberships that don't match their email domain
    cur.execute(
        """
        SELECT
            u.id as user_id,
            u.email,
            u.first_name,
            u.last_name,
            m.id as membership_id,
            p.id as current_team_id,
            p.name as current_team_name,
            parent.id as current_club_id,
            parent.name as current_club_name
        FROM accounts_user u
        JOIN projects_membership m ON u.id = m.user_id
        JOIN projects_project p ON m.project_id = p.id
        JOIN projects_project parent ON p.parent_project_id = parent.id
        WHERE parent.parent_project_id IS NULL  -- parent is a club (top-level under org)
        ORDER BY parent.name, u.email
        """
    )

    all_memberships = cur.fetchall()

    # Find mismatched memberships and their correct clubs
    to_fix = []
    for row in all_memberships:
        (
            user_id,
            email,
            first_name,
            last_name,
            membership_id,
            current_team_id,
            current_team_name,
            current_club_id,
            current_club_name,
        ) = row

        # Extract domain from email
        if "@" not in email:
            continue
        domain = email.split("@")[1]

        # Check if domain maps to a different club
        correct_club_name = DOMAIN_TO_CLUB.get(domain)
        if not correct_club_name:
            continue  # Unknown domain, skip

        if correct_club_name != current_club_name:
            to_fix.append(
                {
                    "user_id": user_id,
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "membership_id": membership_id,
                    "current_club": current_club_name,
                    "correct_club": correct_club_name,
                }
            )

    if not to_fix:
        print("✅ No misplaced members found! All members are in correct clubs.")
        conn.close()
        exit(0)

    print(f"Found {len(to_fix)} misplaced memberships:\n")

    # Group by correct club for display
    by_correct_club = {}
    for item in to_fix:
        club = item["correct_club"]
        if club not in by_correct_club:
            by_correct_club[club] = []
        by_correct_club[club].append(item)

    # Display summary
    for club, items in sorted(by_correct_club.items()):
        print(f"   {club}: {len(items)} members")
        for item in items[:3]:  # Show first 3
            print(f"      - {item['first_name']} {item['last_name']} ({item['email']})")
            print(f"        Currently in: {item['current_club']}")
        if len(items) > 3:
            print(f"      ... and {len(items) - 3} more")
        print()

    # Confirm before proceeding
    confirm = input(f"\n⚠️  Update {len(to_fix)} memberships? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("❌ Aborted")
        conn.close()
        exit(0)

    print("\n📝 Updating memberships...\n")

    # For each misplaced member, find the correct club and move them
    updated_count = 0
    for item in to_fix:
        correct_club_name = item["correct_club"]
        membership_id = item["membership_id"]

        # Find the correct club's first team (or any team)
        cur.execute(
            """
            SELECT p.id
            FROM projects_project p
            JOIN projects_project parent ON p.parent_project_id = parent.id
            WHERE parent.name = %s AND parent.parent_project_id IS NULL
            ORDER BY p.name
            LIMIT 1
            """,
            (correct_club_name,),
        )
        result = cur.fetchone()
        if not result:
            print(
                f"   ⚠️  Could not find team for club '{correct_club_name}' - skipping {item['email']}"
            )
            continue

        correct_team_id = result[0]

        # Update the membership to the correct team
        cur.execute(
            """
            UPDATE projects_membership
            SET project_id = %s
            WHERE id = %s
            """,
            (correct_team_id, membership_id),
        )

        updated_count += 1
        print(f"   ✓ {item['first_name']} {item['last_name']} → {correct_club_name}")

    # Commit changes
    conn.commit()

    print(f"\n✅ Successfully updated {updated_count} memberships!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
finally:
    if "conn" in locals():
        conn.close()
