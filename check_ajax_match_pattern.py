"""
Check how Ajax 1 League matches are structured in the database.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from organisations.models import Organisation
from projects.models import Project
from activities.models import Period, Activity

# Get Ajax 1
knvb = Organisation.objects.get(name="KNVB")
ajax_1 = Project.objects.get(organisation=knvb, name="Ajax 1")

# Get League competition
league_comp = Period.objects.get(
    organisation=knvb,
    project=ajax_1,
    name="League",
    parent_period__name="Season 2024/2025"
)

# Get first 3 matches to see the pattern
matches = Activity.objects.filter(project=ajax_1, period=league_comp)[:3]

print(f"\n📊 Ajax 1 League Matches Pattern (showing first 3 of {matches.count()}):\n")
print("=" * 80)

for i, match in enumerate(matches, 1):
    print(f"\n🏟️  Match {i}:")
    print(f"  Name: {match.name}")
    print(f"  Date: {match.start_time}")
    print(f"  Location: {match.location}")
    print(f"  Metadata: {match.metadata}")
    print("-" * 80)
