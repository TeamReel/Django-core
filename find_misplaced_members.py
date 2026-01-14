import psycopg2

conn_str = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)

# Email domain to team mapping
DOMAIN_TO_TEAM = {
    "ajax.demo": "Ajax",
    "jongajax.demo": "Ajax",
    "ajaxvrouwen.demo": "Ajax",
    "ajaxo21.demo": "Ajax",
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
}

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("\n🔍 Finding Misplaced Members:\n")

    # Get all Ajax team memberships with user details
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
        LEFT JOIN projects_project parent ON p.parent_project_id = parent.id
        WHERE parent.id = 2 OR p.id = 2  -- Ajax club (ID 2)
        ORDER BY u.email
    """
    )

    members = cur.fetchall()

    misplaced = []

    for (
        user_id,
        email,
        fname,
        lname,
        membership_id,
        team_id,
        team_name,
        club_id,
        club_name,
    ) in members:
        # Extract domain from email
        domain = email.split("@")[1] if "@" in email else ""
        expected_club = DOMAIN_TO_TEAM.get(domain, "Unknown")

        # Check if user is in wrong club
        if expected_club != "Ajax" and expected_club != "Unknown":
            misplaced.append(
                {
                    "user_id": user_id,
                    "email": email,
                    "full_name": f"{fname} {lname}",
                    "membership_id": membership_id,
                    "current_team_id": team_id,
                    "current_team": team_name,
                    "current_club": club_name or "Ajax (direct)",
                    "expected_club": expected_club,
                }
            )
            print(f"❌ {fname} {lname} ({email})")
            print(f"   Current: {club_name or 'Ajax (direct)'} - {team_name}")
            print(f"   Expected: {expected_club}")
            print()

    print(f"\n📊 Summary: Found {len(misplaced)} misplaced members")

    if misplaced:
        print("\n" + "=" * 80)
        print("\n🔧 Can I create a fix script? (y/n)")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
