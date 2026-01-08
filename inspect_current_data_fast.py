import os
import sys
import django

sys.path.insert(0, "src")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from organisations.models import Organisation
from projects.models import Project, ProjectMembership
from activities.models import Period, Activity
from django.db.models import Count, Prefetch

print("\n=== CURRENT DATABASE STATE OVERVIEW ===\n")
print(
    f"{'ORG':<8} | {'CLUB':<25} | {'TEAM':<35} | {'SEASON':<22} | {'COMP':<25} | {'PLY':<4} | {'MCH':<4}"
)
print("-" * 135)

# Optimize with prefetch_related to avoid N+1 queries
orgs = Organisation.objects.prefetch_related(
    Prefetch(
        "projects", queryset=Project.objects.filter(parent_project__isnull=True).order_by("name")
    ),
    Prefetch(
        "projects__child_projects",
        queryset=Project.objects.prefetch_related(
            Prefetch(
                "periods",
                queryset=Period.objects.filter(parent_period__isnull=True).order_by("name"),
            ),
            Prefetch("periods__children", queryset=Period.objects.order_by("name")),
            "memberships",
        ).order_by("name"),
    ),
).order_by("name")

for org in orgs:
    clubs = [p for p in org.projects.all() if p.parent_project is None]

    if not clubs:
        print(f"{org.slug:<8} | (Empty)")
        continue

    for club in clubs:
        teams = list(club.child_projects.all())

        if not teams:
            print(f"{org.slug:<8} | {club.name[:25]:<25} | (No teams)")
            continue

        for team in teams:
            seasons = [p for p in team.periods.all() if p.parent_period is None]

            if not seasons:
                print(f"{org.slug:<8} | {club.name[:25]:<25} | {team.name[:35]:<35} | (No seasons)")
                continue

            for season in seasons:
                # Count members efficiently
                members_count = ProjectMembership.objects.filter(
                    project=team, period=season
                ).count()

                # Get child competitions
                competitions = list(season.children.all())

                if not competitions:
                    print(
                        f"{org.slug:<8} | {club.name[:25]:<25} | {team.name[:35]:<35} | {season.name[:22]:<22} | {'-':<25} | {members_count:<4} | 0"
                    )
                    continue

                for comp in competitions:
                    matches_count = Activity.objects.filter(project=team, period=comp).count()
                    print(
                        f"{org.slug:<8} | {club.name[:25]:<25} | {team.name[:35]:<35} | {season.name[:22]:<22} | {comp.name[:25]:<25} | {members_count:<4} | {matches_count:<4}"
                    )

print("\n" + "=" * 135 + "\n")
