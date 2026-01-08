import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from organisations.models import Organisation
from projects.models import Project, ProjectMembership


def analyze_duplicate_clubs():
    print(f"\n--- Analyzing Duplicate Clubs ---\n")

    # Get KNVB
    knvb = Organisation.objects.get(slug="knvb")

    # Foreign club pattern
    foreign_pattern = r"(Tottenham|Chelsea|Manchester|Liverpool|Arsenal|Southampton|Ipswich|Wolverhampton|Crystal Palace|Brentford|Leicester|Everton|West Ham|Bournemouth|Aston Villa|Fulham|Brighton|Nottingham|Newcastle|Milan|Inter|Juventus|Roma|Lazio|Napoli|Atalanta|Bayern|Dortmund|Leipzig|Leverkusen|Frankfurt|Stuttgart)"

    # Find all versions of these clubs (both in KNVB and other orgs)
    all_foreign_clubs = (
        Project.objects.filter(parent_project=None, name__iregex=foreign_pattern)
        .select_related("organisation")
        .order_by("name", "organisation__name")
    )

    # Group by club name
    from collections import defaultdict

    clubs_by_name = defaultdict(list)

    for club in all_foreign_clubs:
        clubs_by_name[club.name].append(club)

    # Analyze duplicates
    for club_name, versions in clubs_by_name.items():
        if len(versions) > 1:
            print(f"\n🔍 {club_name} has {len(versions)} versions:")
            for v in versions:
                team_count = Project.objects.filter(parent_project=v).count()
                player_count = ProjectMembership.objects.filter(project=v).count()
                # Also count players in child teams
                child_teams = Project.objects.filter(parent_project=v)
                for team in child_teams:
                    player_count += ProjectMembership.objects.filter(project=team).count()

                status = "🗑️ DELETE" if (team_count == 0 and player_count == 0) else "✅ KEEP"
                print(
                    f"  {status} {v.organisation.name:15} | Teams: {team_count:3} | Players: {player_count:4} | ID: {v.id}"
                )


if __name__ == "__main__":
    analyze_duplicate_clubs()
