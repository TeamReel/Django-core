#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, "src")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
django.setup()

from projects.models import Project
from organisations.models import Organisation

# Check DFB clubs
print("\n=== DFB (Duitse clubs) ===")
dfb = Organisation.objects.get(slug="dfb")
dfb_clubs = (
    Project.objects.filter(organisation=dfb, parent_project__isnull=True)
    .values_list("name", flat=True)
    .order_by("name")
)
for club in dfb_clubs:
    print(f"  {club}")

# Check FIGC clubs
print("\n=== FIGC (Italiaanse clubs) ===")
figc = Organisation.objects.get(slug="figc")
figc_clubs = (
    Project.objects.filter(organisation=figc, parent_project__isnull=True)
    .values_list("name", flat=True)
    .order_by("name")
)
for club in figc_clubs:
    print(f"  {club}")

# Check The FA clubs
print("\n=== The FA (Engelse clubs) ===")
fa = Organisation.objects.get(slug="the-fa")
fa_clubs = (
    Project.objects.filter(organisation=fa, parent_project__isnull=True)
    .values_list("name", flat=True)
    .order_by("name")
)
for club in fa_clubs:
    print(f"  {club}")

# Check team names for a few clubs
print("\n=== Team namen voorbeelden ===")
bayern = Project.objects.filter(
    organisation=dfb, name="Bayern München", parent_project__isnull=True
).first()
if bayern:
    print(f"\nBayern München teams:")
    teams = Project.objects.filter(parent_project=bayern).values_list("name", flat=True)
    for team in teams:
        print(f"  - {team}")

inter = Project.objects.filter(
    organisation=figc, name__icontains="Inter", parent_project__isnull=True
).first()
if inter:
    print(f"\n{inter.name} teams:")
    teams = Project.objects.filter(parent_project=inter).values_list("name", flat=True)
    for team in teams:
        print(f"  - {team}")

arsenal = Project.objects.filter(
    organisation=fa, name="Arsenal", parent_project__isnull=True
).first()
if arsenal:
    print(f"\nArsenal teams:")
    teams = Project.objects.filter(parent_project=arsenal).values_list("name", flat=True)
    for team in teams:
        print(f"  - {team}")
