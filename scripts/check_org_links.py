import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.join(os.getcwd(), "src"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from organisations.models import Organisation
from projects.models import Project


def check_project_organisation_links():
    print(f"\n--- Available Organisations ---")
    orgs = Organisation.objects.all().order_by("name")
    for org in orgs:
        project_count = Project.objects.filter(organisation=org).count()
        print(f"{org.name} ({org.slug}): {project_count} projects")

    print(f"\n--- Sample Projects by Organisation ---")
    for org in orgs:
        print(f"\n{org.name}:")
        projects = Project.objects.filter(organisation=org, parent_project=None)[:10]
        for p in projects:
            print(f"  - {p.name}")

    print(f"\n--- Checking for mismatched clubs ---")
    # English clubs should be at The FA
    english_clubs = Project.objects.filter(
        parent_project=None,
        name__iregex=r"(United|City|Arsenal|Chelsea|Liverpool|Tottenham|Manchester|Everton|Leicester|West Ham|Aston Villa|Newcastle|Brighton|Brentford|Crystal Palace|Fulham|Leeds|Nottingham Forest|Southampton|Wolves|Bournemouth)",
    ).select_related("organisation")

    print(f"\n🏴󠁧󠁢󠁥󠁮󠁧󠁿 English clubs ({english_clubs.count()}):")
    for club in english_clubs:
        is_correct = (
            "the-fa" in club.organisation.slug.lower() or "fa" == club.organisation.slug.lower()
        )
        status = "✅" if is_correct else "❌"
        print(f"{status} {club.name} -> {club.organisation.name}")

    # Italian clubs
    italian_clubs = Project.objects.filter(
        parent_project=None,
        name__iregex=r"(Milan|Inter|Juventus|Roma|Lazio|Napoli|Atalanta|Fiorentina|Bologna|Torino|Udinese|Sampdoria|Genoa|Cagliari|Sassuolo|Verona|Spezia|Empoli|Salernitana|Venezia|Monza|Lecce)",
    ).select_related("organisation")

    print(f"\n🇮🇹 Italian clubs ({italian_clubs.count()}):")
    for club in italian_clubs:
        is_correct = (
            "figc" in club.organisation.slug.lower() or "italy" in club.organisation.slug.lower()
        )
        status = "✅" if is_correct else "❌"
        print(f"{status} {club.name} -> {club.organisation.name}")

    # German clubs
    german_clubs = Project.objects.filter(
        parent_project=None,
        name__iregex=r"(Bayern|Dortmund|Leipzig|Leverkusen|Frankfurt|Wolfsburg|Mönchengladbach|Union Berlin|Freiburg|Hoffenheim|Mainz|Augsburg|Stuttgart|Hertha|Schalke|Werder Bremen|Bochum|Köln)",
    ).select_related("organisation")

    print(f"\n🇩🇪 German clubs ({german_clubs.count()}):")
    for club in german_clubs:
        is_correct = (
            "dfb" in club.organisation.slug.lower() or "germany" in club.organisation.slug.lower()
        )
        status = "✅" if is_correct else "❌"
        print(f"{status} {club.name} -> {club.organisation.name}")

    # Spanish clubs
    spanish_clubs = Project.objects.filter(
        parent_project=None,
        name__iregex=r"(Barcelona|Real Madrid|Atlético|Sevilla|Valencia|Villarreal|Real Sociedad|Athletic Bilbao|Betis|Osasuna|Rayo Vallecano|Mallorca|Celta|Getafe|Cádiz|Granada|Elche|Levante|Alavés)",
    ).select_related("organisation")

    print(f"\n🇪🇸 Spanish clubs ({spanish_clubs.count()}):")
    for club in spanish_clubs:
        is_correct = (
            "rfef" in club.organisation.slug.lower() or "spain" in club.organisation.slug.lower()
        )
        status = "✅" if is_correct else "❌"
        print(f"{status} {club.name} -> {club.organisation.name}")

    # French clubs
    french_clubs = Project.objects.filter(
        parent_project=None,
        name__iregex=r"(Paris|PSG|Marseille|Lyon|Monaco|Lille|Rennes|Nice|Lens|Strasbourg|Nantes|Montpellier|Reims|Toulouse|Lorient|Auxerre|Ajaccio|Troyes|Angers|Brest)",
    ).select_related("organisation")

    print(f"\n🇫🇷 French clubs ({french_clubs.count()}):")
    for club in french_clubs:
        is_correct = (
            "fff" in club.organisation.slug.lower() or "france" in club.organisation.slug.lower()
        )
        status = "✅" if is_correct else "❌"
        print(f"{status} {club.name} -> {club.organisation.name}")


if __name__ == "__main__":
    check_project_organisation_links()
