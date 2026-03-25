"""Deep dive: Harold's memberships per project + Sander's fullbody data."""
import json
import psycopg2

conn = psycopg2.connect(
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
cur = conn.cursor()

# Harold's memberships with project info
print("=== Harold Pierik's memberships ===\n")
cur.execute("""
    SELECT pm.id, pm.metadata, p.name as project_name, pm.role
    FROM projects_membership pm
    JOIN accounts_user u ON pm.user_id = u.id
    JOIN projects_project p ON pm.project_id = p.id
    WHERE LOWER(u.last_name) LIKE '%pierik%'
""")
for mid, meta, proj, role in cur.fetchall():
    tr = (meta or {}).get("teamreel_assets", {})
    has_fb = bool(tr.get("images", {}).get("fullbody")) or bool(tr.get("media", {}).get("fullbody"))
    has_cu = bool(tr.get("images", {}).get("closeup")) or bool(tr.get("media", {}).get("closeup"))
    print(f"  Project: {proj:30s} | Role: {role or '?':10s}")
    print(f"  ID: {mid}")
    print(f"  Has fullbody: {has_fb} | Has closeup: {has_cu}")
    print(f"  Media keys: {list(tr.get('media', {}).keys()) if tr.get('media') else 'NONE'}")
    print()

# Sander Bakhuis detail
print("\n=== Sander Bakhuis detail ===\n")
cur.execute("""
    SELECT pm.id, pm.metadata, p.name as project_name, pm.role
    FROM projects_membership pm
    JOIN accounts_user u ON pm.user_id = u.id
    JOIN projects_project p ON pm.project_id = p.id
    WHERE LOWER(u.last_name) LIKE '%bakhuis%'
""")
for mid, meta, proj, role in cur.fetchall():
    tr = (meta or {}).get("teamreel_assets", {})
    print(f"  Project: {proj} | Role: {role}")
    print(f"  ID: {mid}")

    images = tr.get("images", {})
    media = tr.get("media", {})
    roles = tr.get("roles", {})

    print(f"\n  media aliases:")
    for k, v in (media or {}).items():
        if isinstance(v, dict):
            print(f"    {k}: {v.get('url', '')[:80]}")
        else:
            print(f"    {k}: {v}")

    print(f"\n  images keys: {list(images.keys()) if images else 'NONE'}")
    for at in sorted(images.keys()):
        atd = images[at]
        if isinstance(atd, dict):
            for kit, kd in atd.items():
                if isinstance(kd, dict):
                    p = kd.get("processed", "")
                    r = kd.get("raw", "")
                    print(f"    {at}.{kit}: p={p[:70] if p else 'NONE'} | r={r[:70] if r else 'NONE'}")

    print(f"\n  roles: {list(roles.keys()) if roles else 'NONE'}")
    for rn, rd in (roles or {}).items():
        if not isinstance(rd, dict):
            continue
        ri = rd.get("images", {})
        for at in sorted(ri.keys()):
            atd = ri[at]
            if isinstance(atd, dict):
                for kit, kd in atd.items():
                    if isinstance(kd, dict):
                        for vid, vd in kd.items():
                            if isinstance(vd, dict):
                                p = vd.get("processed", "")
                                print(f"    {rn}.{at}.{kit}.{vid}: p={p[:70] if p else 'NONE'}")
    print()

# Also: find ALL members with fullbody in ANY structure but no closeup in ANY structure
# More comprehensive check
print("\n=== Comprehensive: members with fullbody but missing closeup ===\n")
cur.execute("""
    SELECT pm.id, pm.metadata, u.first_name, u.last_name, p.name as project_name
    FROM projects_membership pm
    JOIN accounts_user u ON pm.user_id = u.id
    JOIN projects_project p ON pm.project_id = p.id
""")

missing_list = []
for mid, meta, first, last, proj in cur.fetchall():
    tr = (meta or {}).get("teamreel_assets", {})
    if not tr:
        continue
    images = tr.get("images", {}) or {}
    roles_data = tr.get("roles", {}) or {}
    media = tr.get("media", {}) or {}

    # Has fullbody? Check ALL sources
    has_fb = False
    fb_source = ""

    # media.fullbody or media.kit
    for key in ("fullbody", "kit"):
        m_fb = media.get(key, {})
        if isinstance(m_fb, dict) and m_fb.get("url"):
            has_fb = True
            fb_source = f"media.{key}"
            break

    # images.fullbody.*
    if not has_fb:
        fb_img = images.get("fullbody", {})
        if isinstance(fb_img, dict):
            for kit, kd in fb_img.items():
                if isinstance(kd, dict) and (kd.get("processed") or kd.get("raw")):
                    has_fb = True
                    fb_source = f"images.fullbody.{kit}"
                    break

    # roles.*.images.fullbody
    if not has_fb:
        for rn, rd in roles_data.items():
            if not isinstance(rd, dict):
                continue
            ri = rd.get("images", {})
            fb = ri.get("fullbody", {})
            if isinstance(fb, dict):
                for kit, kd in fb.items():
                    if isinstance(kd, dict):
                        for vid, vd in kd.items():
                            if isinstance(vd, dict) and (vd.get("processed") or vd.get("raw")):
                                has_fb = True
                                fb_source = f"roles.{rn}.fullbody.{kit}.{vid}"
                                break

    if not has_fb:
        continue

    # Has closeup? Check ALL sources
    has_cu = False

    # media.closeup
    cu_media = media.get("closeup", {})
    if isinstance(cu_media, dict) and cu_media.get("url"):
        url = cu_media["url"]
        if "generated/output" not in url:
            has_cu = True

    # images.closeup.*
    if not has_cu:
        cu_img = images.get("closeup", {})
        if isinstance(cu_img, dict):
            for kit, kd in cu_img.items():
                if isinstance(kd, dict):
                    p = kd.get("processed", "")
                    if isinstance(p, str) and p and "generated/output" not in p:
                        has_cu = True
                        break
                    for vid, vd in kd.items():
                        if isinstance(vd, dict):
                            p = vd.get("processed", "")
                            if isinstance(p, str) and p and "generated/output" not in p:
                                has_cu = True
                                break

    # roles.*.images.closeup
    if not has_cu:
        for rn, rd in roles_data.items():
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
                                    has_cu = True
                                    break

    if not has_cu:
        missing_list.append({
            "id": str(mid),
            "name": f"{first} {last}",
            "project": proj,
            "fb_source": fb_source,
        })

print(f"Total: {len(missing_list)}")
for m in missing_list:
    print(f"  {m['name']:30s} | {m['project']:20s} | fb_source={m['fb_source']}")

conn.close()
