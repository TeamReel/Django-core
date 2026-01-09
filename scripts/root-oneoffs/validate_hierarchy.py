#!/usr/bin/env python
"""Validate TeamReel hierarchy structure."""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway",
)

import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
django.setup()

from organisations.models import Organisation
from projects.models import Project
from activities.models import Period, Activity
from django.db.models import Count

print("=" * 70)
print("TEAMREEL HIERARCHY VALIDATION")
print("=" * 70)
print()

# 1. Organisations
orgs = Organisation.objects.count()
print(f"✅ LEVEL 1: ORGANISATIONS = {orgs}")
print(f"   {[org.slug for org in Organisation.objects.all()]}")
print()

# 2. Projects
clubs = Project.objects.filter(parent_project__isnull=True).count()
teams = Project.objects.filter(parent_project__isnull=False).count()
print(f"✅ LEVEL 2-3: PROJECTS (Hierarchy: Club → Teams)")
print(f"   - Clubs (parent_project=NULL): {clubs}")
print(f"   - Teams (parent_project=Club FK): {teams}")

ajax = Project.objects.get(organisation__slug="knvb", name="Ajax", parent_project__isnull=True)
ajax_teams = Project.objects.filter(parent_project=ajax)
print(f"   Example: Ajax → {[t.name for t in ajax_teams]}")
print()

# 3. Periods - CHECK FOR DUPLICATES
seasons_root = Period.objects.filter(parent_period__isnull=True).count()
competitions = Period.objects.filter(parent_period__isnull=False).count()
print(f"⚠️  LEVEL 4-5: PERIODS (Hierarchy: Season → Competitions)")
print(f"   - Seasons (parent_period=NULL): {seasons_root}")
print(f"   - Competitions (parent_period=Season FK): {competitions}")

# Check for duplicates
duplicates = (
    Period.objects.filter(parent_period__isnull=True)
    .values("name", "organisation")
    .annotate(count=Count("id"))
    .filter(count__gt=1)
)

if duplicates:
    print(f"   ❌ DUPLICATES FOUND: {duplicates.count()} duplicate season names")
    for dup in list(duplicates)[:5]:
        org = Organisation.objects.get(id=dup["organisation"])
        print(f'      - "{dup["name"]}" @ {org.slug}: {dup["count"]} copies')

    # Show total expected vs actual
    print(f"\n   Expected: 5 orgs × 10 seasons = 50 seasons")
    print(f"   Actual: {seasons_root} seasons (MORE THAN EXPECTED!)")
else:
    print(f"   ✅ No duplicates found")

print()

# 4. Activities
matches = Activity.objects.count()
print(f"❌ LEVEL 6: ACTIVITIES (Matches)")
print(f"   - Matches with opponent_project FK: {matches}")
print(f"   Status: EMPTY (to be created)")
print()

print("=" * 70)
print("HIERARCHY SUMMARY")
print("=" * 70)
print(f"✅ Organisations → Clubs: {orgs} → {clubs}")
print(f"✅ Clubs → Teams: {clubs} → {teams}")
print(
    f'{"⚠️ " if seasons_root > 50 else "✅"} Seasons → Competitions: {seasons_root} → {competitions}'
)
print(f"❌ Teams → Matches: {teams} → {matches} (MISSING)")
print()

# Check strategy alignment
print("=" * 70)
print("STRATEGY ALIGNMENT CHECK")
print("=" * 70)
print("Expected Architecture (teamreel-data-strategy.md):")
print("  1. Organisation (Federation)")
print("  2.   └─> Project (Club, parent_project=NULL)")
print("  3.       └─> Project (Team, parent_project=Club FK)")
print("  4. Period (Season, parent_period=NULL)")
print("  5.   └─> Period (Competition, parent_period=Season FK)")
print("  6. Activity (Match, opponent_project=Team FK)")
print()
print("Current Status:")
print(f"  1-3: ✅ Organisation → Club → Team hierarchy correct")
print(
    f'  4-5: {"⚠️ " if seasons_root > 50 else "✅"} Season → Competition hierarchy ({seasons_root} seasons found, expected 50)'
)
print(f"  6:   ❌ Match level empty (to be implemented)")
