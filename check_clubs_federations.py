#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, "src")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()

from projects.models import Project
from organisations.models import Organisation

print("\n=== Alle organisaties in database ===")
orgs = Organisation.objects.all().values_list("slug", "name")
for slug, name in orgs:
    print(f"  {slug}: {name}")

print("\n=== KNVB Clubs (18) ===")
knvb = Organisation.objects.get(slug="knvb")
knvb_clubs = (
    Project.objects.filter(organisation=knvb, parent_project__isnull=True)
    .values_list("name", flat=True)
    .order_by("name")
)
for club in knvb_clubs:
    print(f"  {club}")

# Check if other federations have clubs
print("\n=== Clubs per organisatie ===")
for org in Organisation.objects.all():
    club_count = Project.objects.filter(organisation=org, parent_project__isnull=True).count()
    print(f"{org.slug} ({org.name}): {club_count} clubs")
    if club_count > 0 and org.slug != "knvb":
        clubs = Project.objects.filter(organisation=org, parent_project__isnull=True).values_list(
            "name", flat=True
        )[:5]
        for club in clubs:
            print(f"  - {club}")
