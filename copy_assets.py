"""Copy brand assets (tenues + sponsor) from ASC club to Helden-6 team."""
import os
import sys
import logging

# Suppress all logging to see only our print output
logging.disable(logging.CRITICAL)

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "src.settings")
django.setup()

from projects.models import Project

# Write output to file for reliability
out = open("copy_assets_result.txt", "w")

# Step 1: Find both projects
try:
    asc = Project.objects.get(slug="asc")
    out.write(f"ASC club: id={asc.id}, name={asc.name}\n")
except Project.DoesNotExist:
    out.write("ERROR: Project with slug 'asc' not found\n")
    out.close()
    sys.exit(1)

helden6_candidates = Project.objects.filter(slug="helden-6")
if not helden6_candidates.exists():
    helden6_candidates = Project.objects.filter(slug__icontains="helden", parent=asc)

for p in helden6_candidates:
    out.write(f"Candidate: id={p.id}, slug={p.slug}, name={p.name}, parent={p.parent_id}\n")

if not helden6_candidates.exists():
    out.write("\nAll ASC children:\n")
    for c in Project.objects.filter(parent=asc):
        out.write(f"  {c.slug} | id={c.id} | name={c.name}\n")

# Step 2: List BrandAssets for ASC
from branding.models import BrandAsset

asc_assets = BrandAsset.objects.filter(project=asc)
out.write(f"\nASC BrandAssets ({asc_assets.count()}):\n")
for ba in asc_assets:
    out.write(f"  type={ba.asset_type} | id={ba.id} | storage_path={ba.storage_path}\n")

out.close()
