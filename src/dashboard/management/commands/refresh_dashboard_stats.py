"""Management command to refresh all dashboard stats caches."""

from dashboard.services import DashboardStatsService
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Force-refresh all dashboard statistics caches."""

    help = "Invalidate and rebuild all dashboard stats caches"

    def add_arguments(self, parser):
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Print stats summary after refresh",
        )

    def handle(self, *args, **options):
        DashboardStatsService.invalidate_all()

        # Rebuild all caches
        platform = DashboardStatsService.get_platform_stats()
        ai = DashboardStatsService.get_ai_stats()
        content = DashboardStatsService.get_content_stats()
        video = DashboardStatsService.get_video_stats()
        credits = DashboardStatsService.get_credits_stats()
        growth = DashboardStatsService.get_growth_stats()

        if options["verbose"]:
            self.stdout.write(f"Platform: {platform['organisations_count']} orgs, "
                              f"{platform['users_count']} users")
            self.stdout.write(f"AI: {ai['total_outputs']} outputs")
            self.stdout.write(f"Content: {content['templates_active']} active templates")
            self.stdout.write(f"Video: {sum(video['jobs_by_status'].values())} total jobs")
            self.stdout.write(f"Credits: {credits['total_credits_allocated']} total allocated")
            self.stdout.write(f"Growth: {len(growth['weeks'])} weeks tracked")

        self.stdout.write(self.style.SUCCESS("Dashboard stats refreshed."))
