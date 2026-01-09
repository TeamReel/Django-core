import os, sys, django

sys.path.insert(0, "src")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
django.setup()

from organisations.models import Organisation
from projects.models import Project, ProjectMembership
from activities.models import Period, Activity
from django.db.models import Count

# Build complete state with efficient queries
output = []
output.append("# Current Database State")
output.append(f"\n**Generated:** 2026-01-07 22:50\n")
output.append("| ORG | CLUB | TEAM | SEASON | COMPETITION | PLAYERS | MATCHES |")
output.append("|-----|------|------|--------|-------------|---------|---------|")

for org in Organisation.objects.all().order_by("name"):
    clubs = Project.objects.filter(organisation=org, parent_project__isnull=True).order_by("name")

    for club in clubs:
        teams = Project.objects.filter(parent_project=club).order_by("name")

        for team in teams:
            seasons = Period.objects.filter(project=team, parent_period__isnull=True).order_by(
                "name"
            )

            for season in seasons:
                # Count players for this season
                player_count = ProjectMembership.objects.filter(project=team, period=season).count()

                # Get competitions under this season
                competitions = Period.objects.filter(parent_period=season).order_by("name")

                if competitions.exists():
                    for comp in competitions:
                        match_count = Activity.objects.filter(project=team, period=comp).count()
                        output.append(
                            f"| {org.slug} | {club.name} | {team.name} | {season.name} | {comp.name} | {player_count} | {match_count} |"
                        )
                else:
                    # Season exists but no competitions yet
                    output.append(
                        f"| {org.slug} | {club.name} | {team.name} | {season.name} | *(none)* | {player_count} | 0 |"
                    )

# Write to markdown file
with open("documents/05-demo/CURRENT_DB_STATE.md", "w", encoding="utf-8") as f:
    f.write("\n".join(output))

print("\n✅ Complete database state written to documents/05-demo/CURRENT_DB_STATE.md")
print(f"   Total rows: {len(output) - 3}")  # Subtract header rows
