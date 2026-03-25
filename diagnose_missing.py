"""Diagnostic: find members with fullbody but missing closeup/halfbody."""
import json
import psycopg2

conn = psycopg2.connect(
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
)
cur = conn.cursor()
cur.execute("SELECT id, metadata FROM projects_membership")

has_fullbody = 0
missing_closeup = 0
missing_halfbody = 0
missing_both = 0
details = []

for mid, meta in cur.fetchall():
    tr = (meta or {}).get("teamreel_assets", {})
    images = tr.get("images", {}) or {}

    # Check if fullbody exists with a valid processed path
    fb_data = images.get("fullbody", {})
    if not isinstance(fb_data, dict):
        continue

    fullbody_processed = None
    for kit_type, kit_data in fb_data.items():
        if not isinstance(kit_data, dict):
            continue
        p = kit_data.get("processed", "")
        if isinstance(p, str) and p and "generated/output" not in p:
            fullbody_processed = p
            break  # found at least one good fullbody

    if not fullbody_processed:
        continue

    has_fullbody += 1

    # Check closeup
    cu_data = images.get("closeup", {})
    has_closeup = False
    if isinstance(cu_data, dict):
        for kit_type, kit_data in cu_data.items():
            if not isinstance(kit_data, dict):
                continue
            p = kit_data.get("processed", "")
            if isinstance(p, str) and p and "generated/output" not in p:
                has_closeup = True
                break

    # Check halfbody
    hb_data = images.get("halfbody", {})
    has_halfbody = False
    if isinstance(hb_data, dict):
        for kit_type, kit_data in hb_data.items():
            if not isinstance(kit_data, dict):
                continue
            p = kit_data.get("processed", "")
            if isinstance(p, str) and p and "generated/output" not in p:
                has_halfbody = True
                break

    if not has_closeup:
        missing_closeup += 1
    if not has_halfbody:
        missing_halfbody += 1
    if not has_closeup and not has_halfbody:
        missing_both += 1

    if not has_closeup or not has_halfbody:
        details.append({
            "id": str(mid),
            "closeup": has_closeup,
            "halfbody": has_halfbody,
        })

    # Also check roles-based structure
    roles = tr.get("roles", {}) or {}
    for role_name, role_data in roles.items():
        if not isinstance(role_data, dict):
            continue
        role_images = role_data.get("images", {}) or {}
        role_fb = role_images.get("fullbody", {})
        if not isinstance(role_fb, dict):
            continue
        for kit_type, kit_data in role_fb.items():
            if not isinstance(kit_data, dict):
                continue
            for vid, vdata in kit_data.items():
                if not isinstance(vdata, dict):
                    continue
                p = vdata.get("processed", "")
                if isinstance(p, str) and p and "generated/output" not in p:
                    # Has fullbody in roles structure - check closeup/halfbody
                    pass  # Already counted above

# Also check videos
cur.execute("SELECT id, metadata FROM projects_membership")
has_intro = 0
has_celebration = 0
total_with_fb = 0

for mid, meta in cur.fetchall():
    tr = (meta or {}).get("teamreel_assets", {})
    images = tr.get("images", {}) or {}
    fb_data = images.get("fullbody", {})
    if not isinstance(fb_data, dict):
        continue
    fullbody_exists = False
    for kit_type, kit_data in fb_data.items():
        if isinstance(kit_data, dict) and kit_data.get("processed"):
            fullbody_exists = True
            break
    if not fullbody_exists:
        continue
    total_with_fb += 1

    videos = tr.get("videos", {}) or {}
    intro = videos.get("intro", {})
    if isinstance(intro, dict) and any(
        isinstance(v, dict) and (v.get("raw") or v.get("processed"))
        for v in intro.values()
    ):
        has_intro += 1

    celeb = videos.get("celebration", {})
    if isinstance(celeb, dict) and any(
        isinstance(v, dict) and (v.get("raw") or v.get("processed"))
        for v in celeb.values()
    ):
        has_celebration += 1


print(f"Members with valid fullbody: {has_fullbody}")
print(f"Missing closeup: {missing_closeup}")
print(f"Missing halfbody: {missing_halfbody}")
print(f"Missing both: {missing_both}")
print(f"---")
print(f"Members with intro video: {has_intro}/{total_with_fb}")
print(f"Members with celebration video: {has_celebration}/{total_with_fb}")
print(f"---")
for d in details[:10]:
    print(f"  {d['id'][:8]}... closeup={'Y' if d['closeup'] else 'N'} halfbody={'Y' if d['halfbody'] else 'N'}")
if len(details) > 10:
    print(f"  ... and {len(details) - 10} more")

conn.close()
