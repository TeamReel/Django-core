import psycopg2, json

conn = psycopg2.connect('postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway')
cur = conn.cursor()

# Find Harold
cur.execute("""SELECT m.id, m.metadata, u.first_name, u.last_name
FROM projects_membership m
JOIN accounts_user u ON m.user_id = u.id
WHERE u.first_name ILIKE 'Harold' AND u.last_name ILIKE 'Pierik'
AND m.deleted_at IS NULL""")
rows = cur.fetchall()
for row in rows:
    print(f"ID: {row[0]}")
    meta = row[1] or {}
    print(f"Name: {row[2]} {row[3]}")

    media = meta.get("media", {})
    print(f"\n=== media.profile ===")
    print(json.dumps(media.get("profile", {}), indent=2))
    print(f"\n=== media.legacy_photo ===")
    print(json.dumps(media.get("legacy_photo", {}), indent=2))
    print(f"\n=== media keys ===")
    print(list(media.keys()))

    images = meta.get("images", {})
    print(f"\n=== images keys ===")
    print(list(images.keys()))

    # Check for upload/profile in images
    for key in ["upload", "profile", "original"]:
        if key in images:
            print(f"\n=== images.{key} ===")
            print(json.dumps(images[key], indent=2))

    rp = meta.get("roles", {}).get("player", {}).get("images", {})
    print(f"\n=== roles.player.images keys ===")
    print(list(rp.keys()))
    for key in ["upload", "profile", "original"]:
        if key in rp:
            print(f"\n=== roles.player.images.{key} ===")
            print(json.dumps(rp[key], indent=2))

    print(f"\n=== old ===")
    print(json.dumps(meta.get("old", {}), indent=2))

    print(f"\n=== top-level keys ===")
    print(list(meta.keys()))

    # Check teamreel_assets
    ta = meta.get("teamreel_assets", {})
    if ta:
        print(f"\n=== teamreel_assets keys ===")
        print(list(ta.keys()))
        print(f"\n=== FULL teamreel_assets ===")
        print(json.dumps(ta, indent=2, default=str)[:5000])

    # Check functional_roles
    fr = meta.get("functional_roles", {})
    if fr:
        print(f"\n=== functional_roles ===")
        print(json.dumps(fr, indent=2, default=str)[:2000])

    print("\n" + "="*80)

conn.close()
