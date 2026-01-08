import os
import sys
import django

# Setup Django
sys.path.insert(0, "src")
# We assume DJANGO_SETTINGS_MODULE is set in environment or we default to config.settings.production because we connect to Railway
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
import django

django.setup()

from organisations.models import Organisation
from projects.models import Project, ProjectMembership
from activities.models import Period, Activity

print("\n=== CURRENT DATABASE STATE OVERVIEW ===\n")
header = f"{'ORG':<6} | {'CLUB':<20} | {'TEAM':<30} | {'SEASON':<20} | {'COMPETITION':<20} | {'PLYRS':<5} | {'MTCHS':<5}"
print(header)
print("-" * len(header))

# Cache needed data to avoid N+1 queries ideally, but for a script loops are fine
orgs = Organisation.objects.all().order_by("name")

if not orgs.exists():
    print("No organisations found.")

for org in orgs:
    # Get Clubs (Projects without parent)
    clubs = Project.objects.filter(organisation=org, parent_project__isnull=True).order_by("name")

    if not clubs.exists():
        print(f"{org.slug:<6} | {'(Empty)':<20}")
        continue

    for club in clubs:
        # Get Teams (Projects with parent = Club)
        teams = Project.objects.filter(parent_project=club).order_by("name")

        if not teams.exists():
            print(f"{org.slug:<6} | {club.name:<20} | {'(No teams)':<30}")
            continue

        for team in teams:
            # Get Seasons (Periods attached to Team)
            seasons = Period.objects.filter(project=team).order_by("name")

            if not seasons.exists():
                print(f"{org.slug:<6} | {club.name:<20} | {team.name:<30} | {'(No seasons)':<20}")
                continue

            for season in seasons:
                # Count members in this season
                members_count = ProjectMembership.objects.filter(
                    project=team, period=season
                ).count()

                # Get Competitions (Children of Season)
                competitions = Period.objects.filter(parent_period=season).order_by("name")

                if not competitions.exists():
                    # Just print the season line
                    print(
                        f"{org.slug:<6} | {club.name:<20} | {team.name:<30} | {season.name:<20} | {'-':<20} | {members_count:<5} | 0"
                    )
                    continue

                for comp in competitions:
                    matches_count = Activity.objects.filter(project=team, period=comp).count()
                    comp_name = comp.name[:20]  # Truncate for display
                    print(
                        f"{org.slug:<6} | {club.name:<20} | {team.name:<30} | {season.name:<20} | {comp_name:<20} | {members_count:<5} | {matches_count:<5}"
                    )

print("\n=======================================\n")
