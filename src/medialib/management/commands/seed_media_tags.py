"""
Seed MediaTags for TeamReel.

System tags (is_system=True, project=None) are global tags available to all
projects. These align with existing ContentTemplate types and Sport configurations.

Usage:
    python manage.py seed_media_tags
    python manage.py seed_media_tags --dry-run
    python manage.py seed_media_tags --category=content_context
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from medialib.models import MediaTag
from projects.models import Project

# System tags - aligned with ContentTemplate types and Sport configuration
# Organized by category for maintainability
SYSTEM_TAGS = {
    # Content Context - aligned with template_type from ContentTemplate
    "content_context": [
        ("Member", "member"),  # Stamdata: player profiles, intros
        ("Season", "season"),  # Season recap, transformation, then vs now
        ("Pre-Match", "pre-match"),  # Flyer, lineup, walkon, anthem
        ("During Match", "during-match"),  # Goal, score update, cards
        ("Post-Match", "post-match"),  # Highlights, match summary
    ],
    # Subject - who/what is the content about (aligned with member roles)
    "subject": [
        ("Team", "team"),
        ("Player", "player"),
        ("Goalkeeper", "goalkeeper"),
        ("Coach", "coach"),
        ("Assistant", "assistant"),
        ("Staff", "staff"),
    ],
    # Moment - aligned with template_subtype from ContentTemplate
    "moment": [
        # Pre-match moments
        ("Lineup", "lineup"),
        ("Flyer", "flyer"),
        ("Walkon", "walkon"),
        ("Anthem", "anthem"),
        # During-match moments
        ("Goal", "goal"),
        ("Score Update", "score-update"),
        ("End Score", "end-score"),
        ("Substitution", "substitution"),
        ("Yellow Card", "yellow-card"),
        ("Red Card", "red-card"),
        ("Injury", "injury"),
        # Post-match moments
        ("Highlights", "highlights"),
        ("Match Summary", "match-summary"),
        # Member moments
        ("Intro", "intro"),
        ("Celebration", "celebration"),
        ("In Tenue", "in-tenue"),
        ("Close-up", "closeup"),
        ("Profile Photo", "profile-photo"),
        ("Legacy Photo", "legacy-photo"),
        # Season moments
        ("Season Recap", "season-recap"),
        ("Transformation", "transformation"),
    ],
    # Status - workflow/asset state
    "status": [
        ("Raw", "raw"),
        ("Edited", "edited"),
        ("Approved", "approved"),
        ("Published", "published"),
    ],
    # Media Type - type of file
    "media_type": [
        ("Image", "image"),
        ("Video", "video"),
    ],
    # Orientation - aspect ratio/format
    "orientation": [
        ("Portrait", "portrait"),
        ("Landscape", "landscape"),
        ("Square", "square"),
        ("Story", "story"),  # 9:16 vertical
        ("Reel", "reel"),  # 9:16 vertical short
    ],
    # Style - visual style variants
    "style": [
        ("Classic", "classic"),
        ("Modern", "modern"),
        ("Minimal", "minimal"),
        ("Bold", "bold"),
        ("Retro", "retro"),
    ],
    # Sport - aligned with sport_configuration_sport
    "sport": [
        ("Football", "football"),
        ("Basketball", "basketball"),
        ("Handball", "handball"),
        ("Hockey", "hockey"),
        ("Rugby", "rugby"),
        ("Volleyball", "volleyball"),
    ],
    # Sport Variant - aligned with sport_configuration_sport (variants)
    "sport_variant": [
        ("Football 11v11", "football-11v11"),
        ("Football 7v7", "football-7v7"),
        ("Futsal 5v5", "futsal-5v5"),
        ("Basketball 5v5", "basketball-5v5"),
        ("Field Hockey", "field-hockey"),
        ("Ice Hockey", "ice-hockey"),
        ("Handball Indoor", "handball-indoor"),
        ("Volleyball Indoor", "volleyball-indoor"),
        ("Rugby Union", "rugby-union"),
    ],
    # Formation - aligned with sport_configuration_formation
    "formation": [
        ("4-3-3", "4-3-3"),
        ("4-4-2", "4-4-2"),
        ("3-5-2", "3-5-2"),
        ("4-2-3-1", "4-2-3-1"),
        ("2-3-1", "2-3-1"),  # 7v7
        ("3-2-1", "3-2-1"),  # 7v7
    ],
    # Competition - type of match/event
    "competition": [
        ("League", "league"),
        ("Cup", "cup"),
        ("Friendly", "friendly"),
        ("Tournament", "tournament"),
    ],
    # Platform - output destination
    "platform": [
        ("Instagram", "instagram"),
        ("TikTok", "tiktok"),
        ("YouTube", "youtube"),
        ("Website", "website"),
    ],
}

# Project-scoped tag themes (created per project)
PROJECT_TAG_CATEGORIES = {
    "source": ["official", "user-generated"],
    "priority": ["featured", "archive"],
}


class Command(BaseCommand):
    help = "Seed system MediaTags for TeamReel"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )
        parser.add_argument(
            "--category",
            type=str,
            choices=list(SYSTEM_TAGS.keys()),
            help="Seed only a specific category",
        )
        parser.add_argument(
            "--with-projects",
            action="store_true",
            help="Also create project-scoped tags for existing projects",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        category_filter = options.get("category")
        with_projects = options.get("with_projects")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no changes will be made\n"))

        self.stdout.write("[SYSTEM TAGS] Seeding global MediaTags (is_system=True, project=None)")
        self.stdout.write("   These are available to all projects.\n")

        created_count = 0
        updated_count = 0

        categories = (
            {category_filter: SYSTEM_TAGS[category_filter]} if category_filter else SYSTEM_TAGS
        )

        for category, tags in categories.items():
            self.stdout.write(f"\n[{category.upper()}]")

            for name, slug in tags:
                if dry_run:
                    self.stdout.write(f"  + Would create: {name} ({slug})")
                    created_count += 1
                else:
                    tag, created = MediaTag.objects.update_or_create(
                        slug=slug,
                        project=None,  # System tags have no project
                        defaults={
                            "name": name,
                            "is_system": True,
                        },
                    )
                    status = "created" if created else "updated"
                    self.stdout.write(f"  + {name} ({slug}) - {status}")
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

        # Project-scoped tags
        if with_projects and not dry_run:
            self.stdout.write("\n[PROJECT TAGS] Creating project-scoped tags...")
            project_created = 0

            for project in Project.objects.all()[:10]:  # Limit to 10 projects
                for _, tags in PROJECT_TAG_CATEGORIES.items():
                    for tag_name in tags:
                        tag, created = MediaTag.objects.update_or_create(
                            slug=slugify(tag_name),
                            project=project,
                            defaults={
                                "name": tag_name.replace("-", " ").title(),
                                "is_system": False,
                            },
                        )
                        if created:
                            project_created += 1
                self.stdout.write(f"  + Project: {project.name}")

            self.stdout.write(f"\n   Project tags created: {project_created}")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("[DONE] Seed complete!"))
        if dry_run:
            total_tags = sum(len(tags) for tags in categories.values())
            self.stdout.write(f"   Would create {total_tags} system tags")
        else:
            self.stdout.write(f"   Created: {created_count}, Updated: {updated_count}")
            total = MediaTag.objects.filter(is_system=True).count()
            self.stdout.write(f"   Total system tags: {total}")
