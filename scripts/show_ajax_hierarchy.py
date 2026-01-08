"""
Show detailed hierarchy of Ajax team in production database:
Organisation → Project → Periods → Activities
"""

import os
import sys

# Add src to path BEFORE any imports
src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
sys.path.insert(0, src_path)

import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from identity.models import Organisation, Project
from activities.models import Activity, Period

# Find Ajax
ajax = Project.objects.filter(name__icontains="Ajax").first()

if not ajax:
    print("❌ Ajax not found")
    sys.exit(1)

print("=" * 80)
print(f"ORGANISATION: {ajax.organisation.name} (ID: {ajax.organisation.id})")
print("=" * 80)
print(f"  Slug: {ajax.organisation.slug}")
print()

print("=" * 80)
print(f"PROJECT (Team): {ajax.name} (ID: {ajax.id})")
print("=" * 80)
print(f"  Organisation: {ajax.organisation.name}")
print()

# Root periods for this project
root_periods = Period.objects.filter(project=ajax, parent=None)
print("=" * 80)
print(f"ROOT PERIODS (Seasons): {root_periods.count()}")
print("=" * 80)
for period in root_periods:
    print(f"\n  [{period.id}] {period.name}")
    print(f"      Start: {period.start_date}, End: {period.end_date}")

    # Child periods
    children = Period.objects.filter(parent=period).order_by("name")
    if children.exists():
        print(f"      CHILD PERIODS: {children.count()}")
        for child in children:
            print(f"\n        └─ [{child.id}] {child.name}")

            # Activities under this child period
            activities = Activity.objects.filter(period=child).order_by("start_time")
            total_count = activities.count()

            if activities.exists():
                print(f"            ACTIVITIES: {total_count} total")

                # Show first 3 activities
                for act in activities[:3]:
                    print(f"              • [{act.id}] {act.activity_type}: {act.title}")
                    print(f'                Start: {act.start_time.strftime("%Y-%m-%d %H:%M")}')
                    if act.location:
                        print(f"                Location: {act.location}")

                if total_count > 3:
                    print(f"              ... and {total_count - 3} more")
    print()

# Summary
total_activities = Activity.objects.filter(project=ajax).count()
league_activities = Activity.objects.filter(project=ajax, activity_type__icontains="league").count()
cup_activities = Activity.objects.filter(project=ajax, activity_type__icontains="cup").count()

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Total Activities: {total_activities}")
print(f"  League Matches: {league_activities}")
print(f"  Cup Matches: {cup_activities}")
print()
