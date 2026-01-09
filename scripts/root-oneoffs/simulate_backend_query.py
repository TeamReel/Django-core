import psycopg2
from django.db.models import Q

DATABASE_URL = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

project_id = 7  # Go Ahead Eagles

print(f"=== Simulating Backend Query for project_id={project_id} ===\n")

# Step 1: Find the project and its children
cur.execute(
    """
    SELECT id, name, parent_project_id
    FROM projects_project
    WHERE id = %s
""",
    (project_id,),
)
proj = cur.fetchone()

if proj:
    print(f"Found project: ID={proj[0]}, Name={proj[1]}, Parent={proj[2]}")

    # Step 2: Find child projects
    cur.execute(
        """
        SELECT id, name
        FROM projects_project
        WHERE parent_project_id = %s
    """,
        (project_id,),
    )
    children = cur.fetchall()

    project_ids = [project_id]
    if children:
        print(f"\nChild projects:")
        for child in children:
            print(f"  - ID {child[0]}: {child[1]}")
            project_ids.append(child[0])

    print(f"\nAll project IDs to check: {project_ids}")

    # Step 3: Find users via ProjectMembership
    placeholders = ",".join(["%s"] * len(project_ids))
    cur.execute(
        f"""
        SELECT DISTINCT u.id, u.email, u.is_active
        FROM accounts_user u
        JOIN projects_membership pm ON u.id = pm.user_id
        WHERE pm.project_id IN ({placeholders})
        AND pm.deleted_at IS NULL
        AND u.is_active = true
        ORDER BY u.email
    """,
        project_ids,
    )

    users = cur.fetchall()
    print(f"\n=== Query Result ===")
    print(f"Total users found: {len(users)}")

    if users:
        print(f"\nFirst 5 users:")
        for user in users[:5]:
            print(f"  - {user[1]} (ID: {user[0]}, Active: {user[2]})")

            # Check which projects this user belongs to
            cur.execute(
                """
                SELECT p.name
                FROM projects_membership pm
                JOIN projects_project p ON pm.project_id = p.id
                WHERE pm.user_id = %s AND pm.deleted_at IS NULL
            """,
                (user[0],),
            )
            user_projects = cur.fetchall()
            print(f"    Projects: {[p[0] for p in user_projects]}")
else:
    print(f"Project {project_id} not found")

conn.close()
