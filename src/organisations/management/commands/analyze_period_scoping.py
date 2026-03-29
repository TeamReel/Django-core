"""
Management command to analyze Period scoping and find duplicates.
"""

from activities.models import Period
from django.core.management.base import BaseCommand
from django.db.models import Count
from organisations.models import Organisation
from projects.models import Project


class Command(BaseCommand):
    help = "Analyze Period scoping (organisation vs team-scoped)"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("PERIOD SCOPING ANALYSIS")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Total periods
        total = Period.objects.count()
        self.stdout.write(f"Total Periods: {total}")
        self.stdout.write("")

        # Organisation-scoped (project=NULL)
        org_scoped = Period.objects.filter(project__isnull=True).count()
        self.stdout.write(f"Organisation-scoped (project=NULL): {org_scoped}")

        # Team-scoped (project != NULL)
        team_scoped = Period.objects.filter(project__isnull=False).count()
        self.stdout.write(f"Team-scoped (project != NULL): {team_scoped}")
        self.stdout.write("")

        # Expected vs Actual
        self.stdout.write("=" * 70)
        self.stdout.write("STRATEGY EXPECTATION")
        self.stdout.write("=" * 70)
        self.stdout.write("According to teamreel-data-strategy.md:")
        self.stdout.write("  - Periods should be TEAM-SCOPED (project FK required)")
        self.stdout.write("  - Each team gets own seasons/competitions")
        self.stdout.write("  - Format: 'Season 2024/2025 - Ajax 1'")
        self.stdout.write("")

        teams = Project.objects.filter(parent_project__isnull=False).count()
        expected_seasons = teams * 1  # 1 season per team for current demo
        expected_comps = teams * 7  # 7 competitions per season

        self.stdout.write("Expected structure:")
        self.stdout.write(f"  - Teams: {teams}")
        self.stdout.write(f"  - Seasons (team-scoped): {expected_seasons} ({teams} × 1)")
        self.stdout.write(f"  - Competitions (team-scoped): {expected_comps} ({teams} × 7)")
        self.stdout.write(f"  - Total: {expected_seasons + expected_comps}")
        self.stdout.write("")

        # Actual breakdown
        seasons_root = Period.objects.filter(parent_period__isnull=True).count()
        competitions = Period.objects.filter(parent_period__isnull=False).count()
        self.stdout.write("Actual structure:")
        self.stdout.write(f"  - Root periods (parent_period=NULL): {seasons_root}")
        self.stdout.write(f"  - Child periods (parent_period != NULL): {competitions}")
        self.stdout.write(f"  - Total: {total}")
        self.stdout.write("")

        # Check KNVB specifically
        self.stdout.write("=" * 70)
        self.stdout.write("KNVB ANALYSIS (Known Issue)")
        self.stdout.write("=" * 70)

        knvb = Organisation.objects.get(slug="knvb")

        # Count periods by scope
        knvb_org_scoped = Period.objects.filter(organisation=knvb, project__isnull=True).count()

        knvb_team_scoped = Period.objects.filter(organisation=knvb, project__isnull=False).count()

        self.stdout.write("KNVB Periods:")
        self.stdout.write(f"  - Organisation-scoped: {knvb_org_scoped}")
        self.stdout.write(f"  - Team-scoped: {knvb_team_scoped}")
        self.stdout.write("")

        # Find duplicate "Season 2024/2025"
        duplicate_seasons = (
            Period.objects.filter(organisation=knvb, name__icontains="Season 2024/2025")
            .values("name", "project_id")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        for dup in list(duplicate_seasons)[:5]:
            project_str = "ORG-SCOPED" if dup["project_id"] is None else f"team={dup['project_id']}"
            self.stdout.write(f"  - '{dup['name']}' @ {project_str}: {dup['count']} instances")

        self.stdout.write("")

        # Show sample team-scoped periods
        sample_team_periods = Period.objects.filter(
            organisation=knvb, project__isnull=False
        ).select_related("project")[:5]

        if sample_team_periods.exists():
            self.stdout.write("Sample team-scoped periods:")
            for p in sample_team_periods:
                self.stdout.write(f"  - '{p.name}' @ {p.project.name}")
        else:
            self.stdout.write(self.style.WARNING("  No team-scoped periods found!"))

        self.stdout.write("")
        self.stdout.write("=" * 70)
        self.stdout.write("CONCLUSION")
        self.stdout.write("=" * 70)

        if team_scoped == 0:
            self.stdout.write(self.style.ERROR("❌ ALL periods are organisation-scoped!"))
            self.stdout.write("   This violates the TeamReel strategy.")
            self.stdout.write("   Each team should have own seasons/competitions.")
        elif org_scoped > 0:
            self.stdout.write(
                self.style.WARNING(f"⚠️  {org_scoped} organisation-scoped periods found")
            )
            self.stdout.write(f"   {team_scoped} team-scoped periods (correct)")
            self.stdout.write("   Mix of both scoping strategies detected!")
        else:
            self.stdout.write(self.style.SUCCESS("✅ All periods are team-scoped (correct)"))
