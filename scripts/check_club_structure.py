import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from organisations.models import Organisation
from projects.models import Project, ProjectMembership
from activities.models import Period, Activity


def check_club_completeness():
    """Check if clubs in correct organisations have proper structure"""

    # Check English clubs in The FA
    print("\n" + "=" * 80)
    print("🏴󠁧󠁢󠁥󠁮󠁧󠁿 ENGLISH CLUBS IN THE FA")
    print("=" * 80)

    try:
        the_fa = Organisation.objects.get(slug="the-fa")
        english_clubs = Project.objects.filter(
            organisation=the_fa,
            parent_project=None,
            name__iregex=r"(Manchester|Liverpool|Arsenal|Chelsea|Tottenham)",
        ).order_by("name")[:5]

        for club in english_clubs:
            teams = Project.objects.filter(parent_project=club)
            total_members = ProjectMembership.objects.filter(project__in=teams).count()
            total_seasons = Period.objects.filter(project__in=teams, parent_period=None).count()
            total_matches = Activity.objects.filter(
                project__in=teams, activity_type="match"
            ).count()

            print(f"\n{club.name}:")
            print(f"  Teams: {teams.count()}")
            print(f"  Members: {total_members}")
            print(f"  Seasons: {total_seasons}")
            print(f"  Matches: {total_matches}")

            if teams.count() > 0:
                for team in teams[:2]:
                    team_members = ProjectMembership.objects.filter(project=team).count()
                    team_seasons = Period.objects.filter(project=team, parent_period=None).count()
                    team_matches = Activity.objects.filter(
                        project=team, activity_type="match"
                    ).count()
                    print(
                        f"    → {team.name}: {team_members} members, {team_seasons} seasons, {team_matches} matches"
                    )
    except Organisation.DoesNotExist:
        print("❌ The FA not found")

    # Check Italian clubs in FIGC
    print("\n" + "=" * 80)
    print("🇮🇹 ITALIAN CLUBS IN FIGC")
    print("=" * 80)

    try:
        figc = Organisation.objects.get(slug="figc")
        italian_clubs = Project.objects.filter(
            organisation=figc,
            parent_project=None,
            name__iregex=r"(Milan|Inter|Juventus|Roma|Napoli)",
        ).order_by("name")[:5]

        for club in italian_clubs:
            teams = Project.objects.filter(parent_project=club)
            total_members = ProjectMembership.objects.filter(project__in=teams).count()
            total_seasons = Period.objects.filter(project__in=teams, parent_period=None).count()
            total_matches = Activity.objects.filter(
                project__in=teams, activity_type="match"
            ).count()

            print(f"\n{club.name}:")
            print(f"  Teams: {teams.count()}")
            print(f"  Members: {total_members}")
            print(f"  Seasons: {total_seasons}")
            print(f"  Matches: {total_matches}")

            if teams.count() > 0:
                for team in teams[:2]:
                    team_members = ProjectMembership.objects.filter(project=team).count()
                    team_seasons = Period.objects.filter(project=team, parent_period=None).count()
                    team_matches = Activity.objects.filter(
                        project=team, activity_type="match"
                    ).count()
                    print(
                        f"    → {team.name}: {team_members} members, {team_seasons} seasons, {team_matches} matches"
                    )
    except Organisation.DoesNotExist:
        print("❌ FIGC not found")

    # Check German clubs in DFB
    print("\n" + "=" * 80)
    print("🇩🇪 GERMAN CLUBS IN DFB")
    print("=" * 80)

    try:
        dfb = Organisation.objects.get(slug="dfb")
        german_clubs = Project.objects.filter(
            organisation=dfb,
            parent_project=None,
            name__iregex=r"(Bayern|Dortmund|Leipzig|Leverkusen|Frankfurt)",
        ).order_by("name")[:5]

        for club in german_clubs:
            teams = Project.objects.filter(parent_project=club)
            total_members = ProjectMembership.objects.filter(project__in=teams).count()
            total_seasons = Period.objects.filter(project__in=teams, parent_period=None).count()
            total_matches = Activity.objects.filter(
                project__in=teams, activity_type="match"
            ).count()

            print(f"\n{club.name}:")
            print(f"  Teams: {teams.count()}")
            print(f"  Members: {total_members}")
            print(f"  Seasons: {total_seasons}")
            print(f"  Matches: {total_matches}")

            if teams.count() > 0:
                for team in teams[:2]:
                    team_members = ProjectMembership.objects.filter(project=team).count()
                    team_seasons = Period.objects.filter(project=team, parent_period=None).count()
                    team_matches = Activity.objects.filter(
                        project=team, activity_type="match"
                    ).count()
                    print(
                        f"    → {team.name}: {team_members} members, {team_seasons} seasons, {team_matches} matches"
                    )
    except Organisation.DoesNotExist:
        print("❌ DFB not found")

    # Now check KNVB duplicates
    print("\n" + "=" * 80)
    print("⚠️  KNVB DUPLICATES (TO BE DELETED)")
    print("=" * 80)

    try:
        knvb = Organisation.objects.get(slug="knvb")
        foreign_pattern = r"(Tottenham|Chelsea|Manchester|Liverpool|Arsenal|Southampton|Ipswich|Wolverhampton|Crystal Palace|Brentford|Leicester|Everton|West Ham|Bournemouth|Aston Villa|Fulham|Brighton|Nottingham|Newcastle|Milan|Inter|Juventus|Roma|Lazio|Napoli|Atalanta|Bayern|Dortmund|Leipzig|Leverkusen|Frankfurt|Stuttgart)"

        duplicate_clubs = Project.objects.filter(
            organisation=knvb, parent_project=None, name__iregex=foreign_pattern
        ).order_by("name")

        print(f"\nFound {duplicate_clubs.count()} duplicate clubs in KNVB:\n")

        for club in duplicate_clubs:
            teams = Project.objects.filter(parent_project=club)
            total_members = ProjectMembership.objects.filter(project__in=teams).count()
            total_seasons = Period.objects.filter(project__in=teams, parent_period=None).count()
            total_matches = Activity.objects.filter(
                project__in=teams, activity_type="match"
            ).count()

            status = (
                "✅ SAFE TO DELETE"
                if (teams.count() == 0 and total_members == 0)
                else "⚠️  HAS DATA!"
            )

            print(f"{status} {club.name}:")
            print(f"  Teams: {teams.count()}")
            print(f"  Members: {total_members}")
            print(f"  Seasons: {total_seasons}")
            print(f"  Matches: {total_matches}")
    except Organisation.DoesNotExist:
        print("❌ KNVB not found")


if __name__ == "__main__":
    check_club_completeness()
