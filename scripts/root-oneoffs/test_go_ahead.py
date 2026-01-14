import psycopg2

DATABASE_URL = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("=== Go Ahead Eagles Projects ===")
cur.execute(
    """
    SELECT id, name, parent_project_id
    FROM projects_project
    WHERE name LIKE '%Go Ahead%'
    ORDER BY name
"""
)
projects = cur.fetchall()
for p in projects:
    print(f"  ID: {p[0]}, Name: {p[1]}, Parent: {p[2]}")

club_id = None
team_ids = []
for p in projects:
    if p[2] is None:  # Parent project (club)
        club_id = p[0]
        print(f"\n✓ Club ID: {club_id}")
    else:
        team_ids.append(p[0])

if club_id:
    print(f"\n=== Users in Go Ahead Eagles (Club ID {club_id}) ===")

    # Count users directly in club
    cur.execute(
        """
        SELECT COUNT(DISTINCT user_id)
        FROM projects_membership
        WHERE project_id = %s AND deleted_at IS NULL
    """,
        (club_id,),
    )
    direct_users = cur.fetchone()[0]
    print(f"Direct users in club: {direct_users}")

    # Count users in teams
    if team_ids:
        placeholders = ",".join(["%s"] * len(team_ids))
        cur.execute(
            f"""
            SELECT p.name, COUNT(DISTINCT pm.user_id) as user_count
            FROM projects_membership pm
            JOIN projects_project p ON pm.project_id = p.id
            WHERE pm.project_id IN ({placeholders})
            AND pm.deleted_at IS NULL
            GROUP BY p.name
            ORDER BY user_count DESC
        """,
            team_ids,
        )
        team_users = cur.fetchall()
        print(f"\nUsers per team:")
        total = 0
        for team in team_users:
            print(f"  - {team[0]}: {team[1]} users")
            total += team[1]
        print(f"\nTotal users in teams: {total}")

    # Total unique users (club + teams)
    all_ids = [club_id] + team_ids
    placeholders = ",".join(["%s"] * len(all_ids))
    cur.execute(
        f"""
        SELECT COUNT(DISTINCT user_id)
        FROM projects_membership
        WHERE project_id IN ({placeholders})
        AND deleted_at IS NULL
    """,
        all_ids,
    )
    total_unique = cur.fetchone()[0]
    print(f"\nTotal unique users (club + teams): {total_unique}")

conn.close()
