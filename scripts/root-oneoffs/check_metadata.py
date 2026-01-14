#!/usr/bin/env python
"""Quick check for Ajax 1 metadata after seeding."""
import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway",
)

import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

django.setup()

from projects.models import ProjectMembership, Project
from activities.models import Period

# Count total
period = Period.objects.get(name="Season 2024/2025")
total = ProjectMembership.objects.filter(period=period).count()
print(f"✓ Total memberships for Season 2024/2025: {total}")

# Check Ajax 1
try:
    ajax_1 = Project.objects.get(name="Ajax 1")
    memberships = list(
        ProjectMembership.objects.filter(project=ajax_1, period=period)
        .select_related("user")
        .order_by("metadata__shirt_number")
    )

    print(f"\n✓ Ajax 1 squad: {len(memberships)} members")
    print("\nSample (first 5 with metadata):")
    print(f"{'#':<3} {'Name':<30} {'Position':<15} {'Role'}")
    print("-" * 70)

    for m in memberships[:5]:
        meta = m.metadata or {}
        num = meta.get("shirt_number", "N/A")
        pos = meta.get("position", "N/A")
        print(f"{num!s:<3} {m.user.get_full_name():<30} {pos:<15} {m.role}")

    # Check if metadata exists
    with_meta = sum(1 for m in memberships if m.metadata and m.metadata.get("position"))
    print(f"\n✓ Memberships with position metadata: {with_meta}/{len(memberships)}")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback

    traceback.print_exc()
