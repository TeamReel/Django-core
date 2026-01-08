"""
Management command to clean up organisation-scoped periods and
create competition-specific periods for Dutch teams.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import signals

from activities.models import Period
from projects.models import Project
from search import signals as search_signals


class Command(BaseCommand):
    help = "Clean up organisation-scoped periods and create proper competitions"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("PERIOD CLEANUP & COMPETITION SEEDING")
        self.stdout.write("=" * 70)
        self.stdout.write("")

        # Temporarily disable search signals to avoid Celery/Redis issues
        signals.post_save.disconnect(search_signals.handle_save, sender=Period)
        signals.post_delete.disconnect(search_signals.handle_delete, sender=Period)

        try:
            self._cleanup()
        finally:
            # Re-enable search signals
            signals.post_save.connect(search_signals.handle_save, sender=Period)
            signals.post_delete.connect(search_signals.handle_delete, sender=Period)

    def _cleanup(self):
        # Step 1: Delete organisation-scoped periods
        org_scoped = Period.objects.filter(project__isnull=True)
        org_count = org_scoped.count()

        self.stdout.write(f"Step 1: Deleting {org_count} organisation-scoped periods...")

        with transaction.atomic():
            # Must delete children FIRST due to PROTECTED foreign key
            children = Period.objects.filter(parent_period__in=org_scoped)
            children_count = children.count()

            if children_count > 0:
                self.stdout.write(f"  Deleting {children_count} child competitions first...")
                children.delete()

            # Now delete parent seasons
            deleted = org_scoped.delete()
            total = deleted[0] + children_count
            self.stdout.write(
                self.style.SUCCESS(
                    f"  ✅ Deleted {total} periods "
                    f"({children_count} competitions + {deleted[0]} seasons)"
                )
            )

        self.stdout.write("")

        # Step 2: Verify team-scoped structure
        team_seasons = Period.objects.filter(
            project__isnull=False, parent_period__isnull=True
        ).count()

        team_comps = Period.objects.filter(
            project__isnull=False, parent_period__isnull=False
        ).count()

        self.stdout.write("Current team-scoped structure:")
        self.stdout.write(f"  - Seasons: {team_seasons}")
        self.stdout.write(f"  - Competitions: {team_comps}")
        self.stdout.write("")

        # Step 3: Remove year suffix from competition names
        self.stdout.write("Step 2: Removing year suffix from competition names...")

        all_comps = Period.objects.filter(project__isnull=False, parent_period__isnull=False)

        updated_count = 0

        with transaction.atomic():
            for comp in all_comps:
                old_name = comp.name
                comp_type = comp.metadata.get("type", "")

                # Remove year suffix (e.g., "League 2024/2025" → "League")
                new_name = old_name.replace(" 2024/2025", "").replace(" 2024/25", "")

                # Capitalize first letter based on type
                type_names = {
                    "league": "League",
                    "cup": "Cup",
                    "european": "European",
                    "friendly": "Friendly",
                    "league_cup": "League Cup",
                    "play-offs": "Play-offs",
                    "youth": "Youth",
                }

                if comp_type in type_names:
                    new_name = type_names[comp_type]

                # Only update if changed
                if new_name != old_name:
                    comp.name = new_name
                    comp.save()
                    updated_count += 1

        self.stdout.write(self.style.SUCCESS(f"  ✅ Updated {updated_count} competitions"))
        self.stdout.write("")

        # Step 4: Show sample results
        self.stdout.write("Sample: Ajax 1 competitions:")
        ajax_1 = Project.objects.get(organisation__slug="knvb", name="Ajax 1")

        ajax_season = Period.objects.filter(project=ajax_1, parent_period__isnull=True).first()

        if ajax_season:
            ajax_comps = Period.objects.filter(parent_period=ajax_season).order_by("name")

            for comp in ajax_comps:
                _comp_name = comp.metadata.get("competition_name", comp.name)
                comp_type = comp.metadata.get("competition_type", "unknown")
                self.stdout.write(f"  - {comp.name} ({comp_type})")

        self.stdout.write("")
        self.stdout.write("=" * 70)
        self.stdout.write("CLEANUP COMPLETE")
        self.stdout.write("=" * 70)
        self.stdout.write(f"✅ Organisation-scoped periods removed: {org_count}")
        self.stdout.write(f"✅ Team-scoped competitions updated: {updated_count}")
        self.stdout.write(
            f"✅ Current structure: {team_seasons} seasons → {team_comps} competitions"
        )
