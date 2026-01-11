import psycopg2

conn_str = (
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()

    print("\n✅ Verification: Ajax Member Cleanup\n")

    # Total Ajax members
    cur.execute(
        """
        SELECT COUNT(*)
        FROM projects_membership m
        JOIN projects_project p ON m.project_id = p.id
        WHERE p.parent_project_id = 2 OR p.id = 2
    """
    )
    ajax_total = cur.fetchone()[0]

    # Ajax members with @ajax emails
    cur.execute(
        """
        SELECT COUNT(*)
        FROM projects_membership m
        JOIN projects_project p ON m.project_id = p.id
        JOIN accounts_user u ON m.user_id = u.id
        WHERE (p.parent_project_id = 2 OR p.id = 2)
          AND u.email LIKE '%ajax%'
    """
    )
    ajax_correct = cur.fetchone()[0]

    print(f"📊 Ajax members:")
    print(f"   Total: {ajax_total}")
    print(f"   With @ajax emails: {ajax_correct} ({round(ajax_correct/ajax_total*100,1)}%)")
    print(f"   Non-Ajax emails: {ajax_total - ajax_correct}")

    if ajax_total - ajax_correct > 0:
        print(f"\n⚠️  Still {ajax_total - ajax_correct} non-Ajax members found!")

        # Show remaining non-Ajax members
        cur.execute(
            """
            SELECT u.email, u.first_name, u.last_name, p.name as team_name
            FROM projects_membership m
            JOIN projects_project p ON m.project_id = p.id
            JOIN accounts_user u ON m.user_id = u.id
            WHERE (p.parent_project_id = 2 OR p.id = 2)
              AND u.email NOT LIKE '%ajax%'
            ORDER BY u.email
            LIMIT 10
        """
        )

        print("\nRemaining non-Ajax members:")
        for email, fname, lname, team in cur.fetchall():
            print(f"   - {fname} {lname} ({email}) in {team}")
    else:
        print("\n✅ All Ajax members now have correct @ajax emails!")

    cur.close()
    conn.close()

except Exception as e:
    print(f"\n❌ Error: {e}")
