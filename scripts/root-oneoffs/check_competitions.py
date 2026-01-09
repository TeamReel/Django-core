#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from activities.models import Period
from django.db.models import Count

# Check what competition names exist
comp_names = (
    Period.objects.filter(parent_period__isnull=False)
    .values("name")
    .annotate(count=Count("id"))
    .order_by("-count")
)

print("Competition names in database:")
for comp in comp_names[:20]:
    print(f'  {comp["name"]}: {comp["count"]} times')

print('\n\nNow renaming specific league names to "League"...')

# Delete Eredivisie first where League already exists for same team/season
from activities.models import Period
from django.db import transaction

with transaction.atomic():
    # Find all Eredivisie competitions
    eredivisie_comps = Period.objects.filter(name="Eredivisie")
    deleted_count = 0
    renamed_count = 0

    for comp in eredivisie_comps:
        # Check if a League competition already exists for this team's season
        existing_league = Period.objects.filter(
            parent_period=comp.parent_period, project=comp.project, name="League"
        ).first()

        if existing_league:
            # Delete the Eredivisie one
            comp.delete()
            deleted_count += 1
        else:
            # Rename to League
            comp.name = "League"
            comp.save()
            renamed_count += 1

    print(f"✓ Deleted {deleted_count} duplicate Eredivisie competitions")
    print(f"✓ Renamed {renamed_count} Eredivisie → League")

print("\nDone!")
