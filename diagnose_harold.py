"""Investigate Harold Pierik's asset metadata + find all members with fullbody but no closeup."""
import json
import psycopg2

conn = psycopg2.connect(
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
cur = conn.cursor()

# Find Harold Pierik
cur.execute("""
    SELECT pm.id, pm.metadata, u.first_name, u.last_name, u.email
    FROM projects_membership pm
    JOIN accounts_user u ON pm.user_id = u.id
    WHERE LOWER(u.first_name) LIKE '%harold%' OR LOWER(u.last_name) LIKE '%pierik%'
""")
rows = cur.fetchall()
print(f"=== Found {len(rows)} matches for Harold Pierik ===\n")

for mid, meta, first, last, email in rows:
    print(f"Member: {first} {last} ({email})")
    print(f"ID: {mid}")
    tr = (meta or {}).get("teamreel_assets", {})

    # Check media aliases
    media = tr.get("media", {})
    print(f"\nmedia aliases:")
    for key in sorted(media.keys()):
        val = media[key]
        if isinstance(val, dict):
            url = val.get("url", "")
            print(f"  {key}: {url[:80]}{'...' if len(str(url)) > 80 else ''}")
        else:
            print(f"  {key}: {val}")

    # Check images structure
    images = tr.get("images", {})
    print(f"\nimages structure:")
    for asset_type in sorted(images.keys()):
        at_data = images[asset_type]
        if not isinstance(at_data, dict):
            print(f"  {asset_type}: {at_data}")
            continue
        for kit_type in sorted(at_data.keys()):
            kit_data = at_data[kit_type]
            if not isinstance(kit_data, dict):
                print(f"  {asset_type}.{kit_type}: {kit_data}")
                continue
            # Check for direct processed/raw
            if "processed" in kit_data or "raw" in kit_data:
                p = kit_data.get("processed", "")
                r = kit_data.get("raw", "")
                state = kit_data.get("processing_state", "?")
                print(f"  {asset_type}.{kit_type}: processed={p[:60] if p else 'NONE'} | state={state}")
            else:
                for vid, vdata in kit_data.items():
                    if isinstance(vdata, dict):
                        p = vdata.get("processed", "")
                        r = vdata.get("raw", "")
                        state = vdata.get("processing_state", "?")
                        print(f"  {asset_type}.{kit_type}.{vid}: processed={p[:60] if p else 'NONE'} | state={state}")

    # Check roles structure
    roles = tr.get("roles", {})
    print(f"\nroles structure:")
    for role_name in sorted(roles.keys()):
        role_data = roles[role_name]
        if not isinstance(role_data, dict):
            continue
        role_images = role_data.get("images", {})
        for asset_type in sorted(role_images.keys()):
            at_data = role_images[asset_type]
            if not isinstance(at_data, dict):
                continue
            for kit_type in sorted(at_data.keys()):
                kit_data = at_data[kit_type]
                if not isinstance(kit_data, dict):
                    continue
                for vid, vdata in kit_data.items():
                    if isinstance(vdata, dict):
                        p = vdata.get("processed", "")
                        state = vdata.get("processing_state", "?")
                        print(f"  {role_name}.{asset_type}.{kit_type}.{vid}: processed={p[:70] if p else 'NONE'} | state={state}")

    print("\n" + "="*80)

# Now find ALL members with fullbody but missing closeup - checking BOTH structures
print("\n\n=== ALL members with fullbody but no closeup (checking both structures) ===\n")

cur.execute("""
    SELECT pm.id, pm.metadata, u.first_name, u.last_name
    FROM projects_membership pm
    JOIN accounts_user u ON pm.user_id = u.id
""")

missing = []
for mid, meta, first, last in cur.fetchall():
    tr = (meta or {}).get("teamreel_assets", {})
    images = tr.get("images", {}) or {}
    roles = tr.get("roles", {}) or {}
    media = tr.get("media", {}) or {}

    # Check if has ANY fullbody (images or roles or media)
    has_fullbody = False

    # Check flat images
    fb_data = images.get("fullbody", {})
    if isinstance(fb_data, dict):
        for kit, kd in fb_data.items():
            if isinstance(kd, dict) and (kd.get("processed") or kd.get("raw")):
                has_fullbody = True
                break

    # Check roles
    if not has_fullbody:
        for rn, rd in roles.items():
            if not isinstance(rd, dict):
                continue
            ri = rd.get("images", {})
            fb = ri.get("fullbody", {})
            if isinstance(fb, dict):
                for kit, kd in fb.items():
                    if isinstance(kd, dict):
                        for vid, vd in kd.items():
                            if isinstance(vd, dict) and (vd.get("processed") or vd.get("raw")):
                                has_fullbody = True
                                break

    # Check media alias
    if not has_fullbody:
        fb_media = media.get("fullbody", {}) or media.get("kit", {})
        if isinstance(fb_media, dict) and fb_media.get("url"):
            has_fullbody = True

    if not has_fullbody:
        continue

    # Now check if has closeup
    has_closeup = False

    # Check flat images
    cu_data = images.get("closeup", {})
    if isinstance(cu_data, dict):
        for kit, kd in cu_data.items():
            if isinstance(kd, dict):
                p = kd.get("processed", "")
                if isinstance(p, str) and p and "generated/output" not in p:
                    has_closeup = True
                    break
                # Check variant level
                for vid, vd in kd.items():
                    if isinstance(vd, dict):
                        p = vd.get("processed", "")
                        if isinstance(p, str) and p and "generated/output" not in p:
                            has_closeup = True
                            break

    # Check roles
    if not has_closeup:
        for rn, rd in roles.items():
            if not isinstance(rd, dict):
                continue
            ri = rd.get("images", {})
            cu = ri.get("closeup", {})
            if isinstance(cu, dict):
                for kit, kd in cu.items():
                    if isinstance(kd, dict):
                        for vid, vd in kd.items():
                            if isinstance(vd, dict):
                                p = vd.get("processed", "")
                                if isinstance(p, str) and p and "generated/output" not in p:
                                    has_closeup = True
                                    break

    # Check media alias
    if not has_closeup:
        cu_media = media.get("closeup", {})
        if isinstance(cu_media, dict) and cu_media.get("url"):
            url = cu_media["url"]
            if "generated/output" not in url:
                has_closeup = True

    if not has_closeup:
        missing.append({"id": str(mid), "name": f"{first} {last}"})

print(f"Total members with fullbody but NO closeup: {len(missing)}")
for m in missing:
    print(f"  {m['name']:30s} | {m['id']}")

conn.close()
