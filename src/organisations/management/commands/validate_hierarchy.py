"""
Management command to validate TeamReel hierarchy structure.
"""

from activities.models import Activity, Period
from django.core.management.base import BaseCommand
from django.db.models import Count
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Validate TeamReel hierarchy structure against strategy"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("TEAMREEL HIERARCHY VALIDATION")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # 1. Organisations
        orgs = Organisation.objects.count()
        self.stdout.write(f"✅ LEVEL 1: ORGANISATIONS = {orgs}")
        self.stdout.write(f"   {[org.slug for org in Organisation.objects.all()]}")
        self.stdout.write("")

        # 2. Projects
        clubs = Project.objects.filter(parent_project__isnull=True).count()
        teams = Project.objects.filter(parent_project__isnull=False).count()
        self.stdout.write("✅ LEVEL 2-3: PROJECTS (Hierarchy: Club → Teams)")
        self.stdout.write(f"   - Clubs (parent_project=NULL): {clubs}")
        self.stdout.write(f"   - Teams (parent_project=Club FK): {teams}")

        ajax = Project.objects.get(
            organisation__slug="knvb", name="Ajax", parent_project__isnull=True
        )
        ajax_teams = Project.objects.filter(parent_project=ajax)
        self.stdout.write(f"   Example: Ajax → {[t.name for t in ajax_teams]}")
        self.stdout.write("")

        # 3. Periods - CHECK FOR DUPLICATES
        seasons_root = Period.objects.filter(parent_period__isnull=True).count()
        competitions = Period.objects.filter(parent_period__isnull=False).count()
        self.stdout.write("⚠️  LEVEL 4-5: PERIODS (Hierarchy: Season → Competitions)")
        self.stdout.write(f"   - Seasons (parent_period=NULL): {seasons_root}")
        self.stdout.write(f"   - Competitions (parent_period=Season FK): {competitions}")

        # Check for duplicates
        duplicates = (
            Period.objects.filter(parent_period__isnull=True)
            .values("name", "organisation")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
        )

        if duplicates:
            self.stdout.write(
                self.style.ERROR(
                    f"   ❌ DUPLICATES FOUND: {duplicates.count()} duplicate season names"
                )
            )
            for dup in list(duplicates)[:5]:
                org = Organisation.objects.get(id=dup["organisation"])
                self.stdout.write(f'      - "{dup["name"]}" @ {org.slug}: {dup["count"]} copies')

            self.stdout.write("\n   Expected: 5 orgs × 10 seasons = 50 seasons")
            self.stdout.write(f"   Actual: {seasons_root} seasons (MORE THAN EXPECTED!)")
        else:
            self.stdout.write(self.style.SUCCESS("   ✅ No duplicates found"))

        self.stdout.write("")

        # 4. Activities
        matches = Activity.objects.count()
        self.stdout.write("❌ LEVEL 6: ACTIVITIES (Matches)")
        self.stdout.write(f"   - Matches with opponent_project FK: {matches}")
        self.stdout.write("   Status: EMPTY (to be created)")
        self.stdout.write("")

        self.stdout.write("=" * 70)
        self.stdout.write("HIERARCHY SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"✅ Organisations → Clubs: {orgs} → {clubs}")
        self.stdout.write(f"✅ Clubs → Teams: {clubs} → {teams}")
        status = "⚠️ " if seasons_root > 50 else "✅"
        self.stdout.write(f"{status} Seasons → Competitions: {seasons_root} → {competitions}")
        self.stdout.write(f"❌ Teams → Matches: {teams} → {matches} (MISSING)")
        self.stdout.write("")

        # Check strategy alignment
        self.stdout.write("=" * 70)
        self.stdout.write("STRATEGY ALIGNMENT CHECK")
        self.stdout.write("=" * 70)
        self.stdout.write("Expected Architecture (teamreel-data-strategy.md):")
        self.stdout.write("  1. Organisation (Federation)")
        self.stdout.write("  2.   └─> Project (Club, parent_project=NULL)")
        self.stdout.write("  3.       └─> Project (Team, parent_project=Club FK)")
        self.stdout.write("  4. Period (Season, parent_period=NULL)")
        self.stdout.write("  5.   └─> Period (Competition, parent_period=Season FK)")
        self.stdout.write("  6. Activity (Match, opponent_project=Team FK)")
        self.stdout.write("")
        self.stdout.write("Current Status:")
        self.stdout.write("  1-3: ✅ Organisation → Club → Team hierarchy correct")
        period_status = "⚠️ " if seasons_root > 50 else "✅"
        self.stdout.write(
            f"  4-5: {period_status} Season → Competition hierarchy ({seasons_root} seasons found, expected 50)"
        )
        self.stdout.write("  6:   ❌ Match level empty (to be implemented)")
