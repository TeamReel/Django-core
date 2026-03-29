"""
Management command to seed a single template: Lineup 4-3-3 - Modern (Video).

This is a GLOBAL template (organisation=None) that can only be edited by superadmins.

Input requirements:
- Match data: is_home, opponent, venue, date, kickoff_time, season, competition
- 11 players with positions based on 4-3-3 formation
- 2 staff members (coach, assistant)
- Per member: 3 asset types (full_body_tenue, short_intro_tenue, closeup_tenue)
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    """Seed the Lineup 4-3-3 - Modern template."""

    help = "Seed the Lineup 4-3-3 - Modern video template (global, superadmin-only)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Create the template with proper input requirements."""
        # Temporarily disconnect audit signals to avoid Prometheus conflicts
        from django.db.models.signals import post_delete, post_save
        from sport_configuration.models import Formation, Sport, SportConfiguration

        from src.content_generation.models import ContentTemplate, TemplateSubtype, TemplateType
        from src.content_generation.signals import content_template_deleted, content_template_saved

        post_save.disconnect(content_template_saved, sender=ContentTemplate)
        post_delete.disconnect(content_template_deleted, sender=ContentTemplate)

        dry_run = options.get("dry_run", False)

        self.stdout.write("🎬 Seeding: Lineup 4-3-3 - Modern (Video)\n")

        # Step 1: Ensure Sport exists
        self.stdout.write("📌 Checking sport...")
        football_cat, _ = Sport.objects.update_or_create(
            slug="football",
            defaults={
                "name": "Football",
                "sport_icon": "⚽",
                "is_active": True,
            },
        )

        football_11v11, _ = Sport.objects.update_or_create(
            slug="football-11v11",
            defaults={
                "name": "Football 11v11",
                "parent_sport": football_cat,
                "sport_icon": "⚽",
                "is_active": True,
            },
        )
        self.stdout.write(f"  ✓ Sport: {football_11v11.name}")

        # Step 2: Ensure SportConfiguration exists
        self.stdout.write("\n⚙️  Checking sport configuration...")
        config_11v11, _ = SportConfiguration.objects.update_or_create(
            sport=football_11v11,
            defaults={
                "team_size_min": 11,
                "team_size_max": 11,
                "max_substitutes": 7,
                "has_goalkeeper": True,
                "positions": [
                    "GK",
                    "LB",
                    "CB",
                    "RB",
                    "LM",
                    "CM",
                    "RM",
                    "LW",
                    "RW",
                    "ST",
                    "CAM",
                    "CDM",
                    "LWB",
                    "RWB",
                ],
            },
        )
        self.stdout.write(f"  ✓ Configuration: {config_11v11}")

        # Step 3: Ensure 4-3-3 Formation exists
        self.stdout.write("\n🔢 Checking 4-3-3 formation...")
        formation_433, _ = Formation.objects.update_or_create(
            sport_config=config_11v11,
            code="4-3-3",
            defaults={
                "name": "4-3-3",
                "is_default": True,
                "display_order": 1,
                "is_active": True,
                "positions": [
                    {"slot": 1, "position": "GK", "x": 50, "y": 95, "functional_role": "keeper"},
                    {
                        "slot": 2,
                        "position": "LB",
                        "x": 15,
                        "y": 75,
                        "functional_role": "verdediger",
                    },
                    {
                        "slot": 3,
                        "position": "CB",
                        "x": 35,
                        "y": 80,
                        "functional_role": "verdediger",
                    },
                    {
                        "slot": 4,
                        "position": "CB",
                        "x": 65,
                        "y": 80,
                        "functional_role": "verdediger",
                    },
                    {
                        "slot": 5,
                        "position": "RB",
                        "x": 85,
                        "y": 75,
                        "functional_role": "verdediger",
                    },
                    {
                        "slot": 6,
                        "position": "CDM",
                        "x": 50,
                        "y": 60,
                        "functional_role": "middenvelder",
                    },
                    {
                        "slot": 7,
                        "position": "CM",
                        "x": 30,
                        "y": 50,
                        "functional_role": "middenvelder",
                    },
                    {
                        "slot": 8,
                        "position": "CM",
                        "x": 70,
                        "y": 50,
                        "functional_role": "middenvelder",
                    },
                    {"slot": 9, "position": "LW", "x": 15, "y": 25, "functional_role": "aanvaller"},
                    {
                        "slot": 10,
                        "position": "ST",
                        "x": 50,
                        "y": 20,
                        "functional_role": "aanvaller",
                    },
                    {
                        "slot": 11,
                        "position": "RW",
                        "x": 85,
                        "y": 25,
                        "functional_role": "aanvaller",
                    },
                ],
            },
        )
        self.stdout.write(f"  ✓ Formation: {formation_433.code}")

        # Step 4: Define input requirements
        input_requirements = {
            # Match data - pulled from Match model
            "match_data": {
                "source": "match",
                "required": [
                    "is_home",  # Boolean: true = thuiswedstrijd
                    "own_team_name",  # Organisation.name
                    "opponent_name",  # Match.opponent of opponent Organisation.name
                    "venue",  # Match.venue of Organisation.location
                    "date",  # Match.date (YYYY-MM-DD)
                    "kickoff_time",  # Match.kickoff_time (HH:MM)
                    "season_name",  # Season.name
                    "competition_name",  # Competition.name
                ],
                "optional": [
                    "matchday",  # Speeldag nummer
                    "broadcast_info",  # TV/streaming info
                ],
            },
            # Players - 11 positions from 4-3-3 formation
            "players": {
                "source": "match_lineup",
                "formation": "4-3-3",
                "count": 11,
                "positions": [
                    {"slot": 1, "position": "GK", "functional_role": "keeper", "label": "Keeper"},
                    {
                        "slot": 2,
                        "position": "LB",
                        "functional_role": "verdediger",
                        "label": "Linksback",
                    },
                    {
                        "slot": 3,
                        "position": "CB",
                        "functional_role": "verdediger",
                        "label": "Centrale verdediger",
                    },
                    {
                        "slot": 4,
                        "position": "CB",
                        "functional_role": "verdediger",
                        "label": "Centrale verdediger",
                    },
                    {
                        "slot": 5,
                        "position": "RB",
                        "functional_role": "verdediger",
                        "label": "Rechtsback",
                    },
                    {
                        "slot": 6,
                        "position": "CDM",
                        "functional_role": "middenvelder",
                        "label": "Controleur",
                    },
                    {
                        "slot": 7,
                        "position": "CM",
                        "functional_role": "middenvelder",
                        "label": "Middenvelder",
                    },
                    {
                        "slot": 8,
                        "position": "CM",
                        "functional_role": "middenvelder",
                        "label": "Middenvelder",
                    },
                    {
                        "slot": 9,
                        "position": "LW",
                        "functional_role": "aanvaller",
                        "label": "Linksbinnen",
                    },
                    {
                        "slot": 10,
                        "position": "ST",
                        "functional_role": "aanvaller",
                        "label": "Spits",
                    },
                    {
                        "slot": 11,
                        "position": "RW",
                        "functional_role": "aanvaller",
                        "label": "Rechtsbinnen",
                    },
                ],
                # Data per player from Member model
                "member_fields": [
                    "full_name",
                    "first_name",
                    "last_name",
                    "jersey_number",
                    "nationality",
                ],
                # Required assets per player (from MemberAsset)
                "required_assets": [
                    {
                        "type": "full_body_tenue",
                        "label": "Volledige foto in tenue",
                        "description": "Full body shot in match kit, standing pose",
                    },
                    {
                        "type": "short_intro_tenue",
                        "label": "Korte intro in tenue",
                        "description": "Upper body/action pose in match kit",
                    },
                    {
                        "type": "closeup_tenue",
                        "label": "Close-up in tenue",
                        "description": "Face close-up in match kit",
                    },
                ],
            },
            # Staff - coach and assistant
            "staff": {
                "source": "team_staff",
                "members": [
                    {
                        "role": "coach",
                        "functional_role": "trainer",
                        "label": "Hoofdcoach",
                        "required": True,
                    },
                    {
                        "role": "assistant",
                        "functional_role": "assistent-trainer",
                        "label": "Assistent-coach",
                        "required": False,
                    },
                ],
                # Data per staff from Member model
                "member_fields": [
                    "full_name",
                    "first_name",
                    "last_name",
                ],
                # Required assets per staff (same as players)
                "required_assets": [
                    {
                        "type": "full_body_tenue",
                        "label": "Volledige foto in tenue",
                        "description": "Full body shot in team attire",
                    },
                    {
                        "type": "short_intro_tenue",
                        "label": "Korte intro in tenue",
                        "description": "Upper body pose in team attire",
                    },
                    {
                        "type": "closeup_tenue",
                        "label": "Close-up in tenue",
                        "description": "Face close-up in team attire",
                    },
                ],
            },
            # Organisation assets
            "organisation_assets": {
                "source": "organisation",
                "required": [
                    {
                        "type": "team_logo",
                        "label": "Club logo",
                        "description": "Club/team logo (PNG with transparency)",
                    },
                ],
                "optional": [
                    {
                        "type": "stadium_background",
                        "label": "Stadion achtergrond",
                        "description": "Stadium or pitch background image",
                    },
                ],
            },
            # Output specification
            "output": {
                "type": "video",
                "format": "mp4",
                "dimensions": {
                    "width": 1080,
                    "height": 1920,
                    "aspect_ratio": "9:16",
                },
                "duration_seconds": 30,
                "fps": 30,
            },
        }

        # Step 5: Create the template
        self.stdout.write("\n📄 Creating template...")

        if dry_run:
            self.stdout.write(self.style.WARNING("  [DRY RUN] Would create: Lineup 4-3-3 - Modern"))
            self.stdout.write(
                f"\n  Input requirements:\n{self._format_requirements(input_requirements)}"
            )
        else:
            template, created = ContentTemplate.objects.update_or_create(
                organisation=None,  # Global template
                name="Lineup 4-3-3 - Modern",
                defaults={
                    "description": (
                        "Modern lineup video for 4-3-3 formation. "
                        "Shows 11 players + coach/assistant with clean, minimalist design. "
                        "Vertical format (9:16) optimized for social media stories."
                    ),
                    "template_type": TemplateType.PRE_MATCH,
                    "template_subtype": TemplateSubtype.LINEUP,
                    "style_variant": "Modern",
                    "ai_workflow_id": "lineup_modern_v1_433",
                    "input_requirements": input_requirements,
                    "sport": football_11v11,
                    "formation": formation_433,
                    "is_active": True,
                    "created_by": None,  # Global template - superadmin only
                },
            )
            status = "created" if created else "updated"
            self.stdout.write(self.style.SUCCESS(f"  ✓ Template '{template.name}' ({status})"))

        # Summary
        self.stdout.write(self.style.SUCCESS("\n✅ Done!"))
        self.stdout.write("\n📋 Template requirements summary:")
        self.stdout.write("   - Match data: 8 required fields (from Match model)")
        self.stdout.write("   - Players: 11 positions (4-3-3 formation)")
        self.stdout.write("   - Staff: 2 members (coach required, assistant optional)")
        self.stdout.write("   - Assets per member: 3 types (full_body, short_intro, closeup)")
        self.stdout.write("   - Output: 1080x1920 video (9:16), 30s, 30fps")
        self.stdout.write("\n🔒 This is a GLOBAL template (organisation=None)")
        self.stdout.write("   Only superadmins can edit this template.")

    def _format_requirements(self, reqs: dict, indent: int = 4) -> str:
        """Format requirements dict for display."""
        import json

        return json.dumps(reqs, indent=indent, ensure_ascii=False)
