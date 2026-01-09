#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, "src")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()

from projects.models import Project
from organisations.models import Organisation

knvb = Organisation.objects.get(slug="knvb")
clubs = Project.objects.filter(organisation=knvb, parent_project__isnull=True).order_by("name")

print(f"\n=== Teams voor alle {clubs.count()} clubs ===\n")

for club in clubs:
    teams = Project.objects.filter(parent_project=club).order_by("name")
    print(f"{club.name} ({teams.count()} teams):")
    for team in teams:
        print(f"  - {team.name}")
    print()
