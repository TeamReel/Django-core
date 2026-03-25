"""Quick diagnostic: find all broken generated/output/ paths in metadata."""
import json
import psycopg2

conn = psycopg2.connect("postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway")
cur = conn.cursor()

# Count closeup/halfbody with broken processed paths
cur.execute("""
    SELECT m.id, m.metadata
    FROM projects_membership m
    WHERE m.metadata::text LIKE '%%generated/output/closeup%%'
       OR m.metadata::text LIKE '%%generated/output/halfbody%%'
""")
rows = cur.fetchall()
print(f"Members with broken closeup/halfbody: {len(rows)}")

# For each, show what specifically is broken
closeup_broken = 0
halfbody_broken = 0
for mid, meta in rows:
    tr = (meta or {}).get("teamreel_assets", {})
    images = tr.get("images", {})
    for asset_type in ("closeup", "halfbody"):
        at_data = images.get(asset_type, {})
        if not isinstance(at_data, dict):
            continue
        for kit_type, kit_data in at_data.items():
            if not isinstance(kit_data, dict):
                continue
            # Could be {raw, processed} directly or {variant_id: {raw, processed}}
            processed = kit_data.get("processed", "")
            if isinstance(processed, str) and "generated/output" in processed:
                if asset_type == "closeup":
                    closeup_broken += 1
                else:
                    halfbody_broken += 1
                continue
            # Check for variant level
            for vid, vdata in kit_data.items():
                if not isinstance(vdata, dict):
                    continue
                processed = vdata.get("processed", "")
                if isinstance(processed, str) and "generated/output" in processed:
                    if asset_type == "closeup":
                        closeup_broken += 1
                    else:
                        halfbody_broken += 1

print(f"Broken closeup.*.processed paths: {closeup_broken}")
print(f"Broken halfbody.*.processed paths: {halfbody_broken}")
print(f"Total to reprocess: {closeup_broken + halfbody_broken}")
conn.close()
