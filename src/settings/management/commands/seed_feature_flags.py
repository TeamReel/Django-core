"""
Seed feature flags for Ajax, PSV, and Feyenoord demo data.
Creates B10 feature flags at organisation and project scope.
"""
from django.core.management.base import BaseCommand
from organisations.models import Organisation
from settings.models import FeatureFlag, ScopeType


# Feature flags for TeamReel football SaaS
FEATURE_FLAGS = [
    {
        "key": "match_analysis",
        "description": "Enable AI-powered match analysis features",
        "default": True,
    },
    {
        "key": "video_highlights",
        "description": "Enable automatic video highlight generation",
        "default": True,
    },
    {
        "key": "player_stats",
        "description": "Enable advanced player statistics dashboard",
        "default": True,
    },
    {
        "key": "formation_editor",
        "description": "Enable drag-and-drop formation editor",
        "default": True,
    },
    {
        "key": "ai_scouting",
        "description": "Enable AI scouting recommendations (beta)",
        "default": False,
    },
    {
        "key": "export_pdf",
        "description": "Enable PDF export for reports",
        "default": True,
    },
    {
        "key": "live_tracking",
        "description": "Enable live GPS tracking integration (premium)",
        "default": False,
    },
    {
        "key": "parent_portal",
        "description": "Enable parent/guardian portal access",
        "default": False,
    },
]


class Command(BaseCommand):
    help = "Seed feature flags for organisations (Ajax/PSV/Feyenoord or all)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed for all organisations, not just Dutch clubs",
        )

    def handle(self, *args, **options):
        club_names = ["Ajax", "PSV", "Feyenoord"]

        # Get organisations - prefer Dutch clubs, fallback to all
        orgs = Organisation.objects.filter(name__in=club_names)
        if not orgs.exists():
            if options.get("all"):
                orgs = Organisation.objects.all()[:5]  # Limit to first 5
                self.stdout.write(
                    f"Using first 5 available orgs: {list(orgs.values_list('name', flat=True))}"
                )
            else:
                self.stdout.write(
                    self.style.WARNING("No Dutch clubs found. Use --all for other orgs.")
                )
                orgs = Organisation.objects.all()[:3]  # Use any 3
                if not orgs.exists():
                    self.stdout.write(self.style.ERROR("No organisations found at all."))
                    return

        created_flags = 0

        # Create global flags first
        for flag_def in FEATURE_FLAGS:
            flag, created = FeatureFlag.objects.update_or_create(
                key=flag_def["key"],
                scope_type=ScopeType.GLOBAL,
                organisation=None,
                project=None,
                user=None,
                defaults={
                    "enabled": flag_def["default"],
                    "description": flag_def["description"],
                },
            )
            if created:
                created_flags += 1
                self.stdout.write(f"  Created GLOBAL flag: {flag.key}")

        # Create org-scoped flags for each club
        for org in orgs:
            for flag_def in FEATURE_FLAGS:
                flag, created = FeatureFlag.objects.update_or_create(
                    key=flag_def["key"],
                    scope_type=ScopeType.ORGANISATION,
                    organisation=org,
                    project=None,
                    user=None,
                    defaults={
                        "enabled": flag_def["default"],
                        "description": f"{flag_def['description']} ({org.name})",
                    },
                )
                if created:
                    created_flags += 1

            self.stdout.write(f"Created {len(FEATURE_FLAGS)} flags for {org.name}")

        # Summary
        total = FeatureFlag.objects.count()
        self.stdout.write(self.style.SUCCESS(f"\nTotal flags: {total} (new: {created_flags})"))
