"""
Seed media tags for Ajax, PSV, and Feyenoord demo data.
Creates system-wide tags and project-scoped tags for football media.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from projects.models import Project
from organisations.models import Organisation
from medialib.models import MediaTag


# System-wide tags (available in all projects)
SYSTEM_TAGS = [
    "match-highlight",
    "goal",
    "save",
    "tackle",
    "training",
    "interview",
    "press-conference",
    "fan-content",
    "stadium",
    "team-photo",
    "player-portrait",
    "action-shot",
    "celebration",
    "lineup",
    "tactics-board",
]

# Project-scoped tag themes
PROJECT_TAG_CATEGORIES = {
    "media_type": ["video", "photo", "document", "graphic"],
    "source": ["official", "broadcast", "social-media", "user-generated"],
    "status": ["raw", "edited", "approved", "published"],
    "priority": ["featured", "archive", "draft"],
}


class Command(BaseCommand):
    help = "Seed media tags for projects (Ajax/PSV/Feyenoord or all)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Seed for all organisations, not just Dutch clubs",
        )

    def handle(self, *args, **options):
        club_names = ["Ajax", "PSV", "Feyenoord"]

        # Create system tags first
        system_created = 0
        for tag_name in SYSTEM_TAGS:
            tag, created = MediaTag.objects.update_or_create(
                slug=slugify(tag_name),
                project=None,
                is_system=True,
                defaults={"name": tag_name.replace("-", " ").title()},
            )
            if created:
                system_created += 1

        self.stdout.write(f"System tags: {len(SYSTEM_TAGS)} (new: {system_created})")

        # Get organisations - prefer Dutch clubs, fallback to all
        orgs = Organisation.objects.filter(name__in=club_names)
        if not orgs.exists():
            if options.get("all"):
                orgs = Organisation.objects.all()[:5]
            else:
                orgs = Organisation.objects.all()[:3]
                if not orgs.exists():
                    self.stdout.write(self.style.WARNING("No organisations found."))
                    return

        project_tags_created = 0
        for org in orgs:
            project = Project.objects.filter(organisation=org).first()
            if not project:
                self.stdout.write(self.style.WARNING(f"No project found for {org.name}"))
                continue

            # Create project-scoped tags
            for category, tags in PROJECT_TAG_CATEGORIES.items():
                for tag_name in tags:
                    full_name = f"{category}-{tag_name}"
                    tag, created = MediaTag.objects.update_or_create(
                        slug=slugify(full_name),
                        project=project,
                        is_system=False,
                        defaults={"name": tag_name.replace("-", " ").title()},
                    )
                    if created:
                        project_tags_created += 1

            self.stdout.write(f"Created project tags for {org.name}: {project.name}")

        # Summary
        total = MediaTag.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"\nTotal tags: {total} (system: {system_created}, project: {project_tags_created})"
            )
        )
