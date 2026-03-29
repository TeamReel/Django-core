"""Seed theme settings for organisations and projects.

Usage:
    python manage.py seed_theme_settings

Creates:
- Global default: theme_mode=light, theme_switch_enabled=true
- Per organisation: theme_switch_enabled (some true, some false)
- Per project: theme_switch_enabled (some true, some false)
"""

from django.core.management.base import BaseCommand
from organisations.models import Organisation
from projects.models import Project
from settings.models import ScopeType, Setting, SettingType

# Global defaults
GLOBAL_SETTINGS = [
    {
        "key": "theme_mode",
        "description": "UI theme mode: 'light', 'dark', or 'system' (follows OS preference)",
        "value_type": SettingType.STRING,
        "default_value": "light",
        "value": "light",
    },
    {
        "key": "theme_switch_enabled",
        "description": "Whether theme switching is allowed (dark/light toggle visible)",
        "value_type": SettingType.BOOLEAN,
        "default_value": True,
        "value": True,
    },
]

# Organisations where theme switch is DISABLED (locked to default)
ORGS_SWITCH_DISABLED = [
    "The FA",  # Corporate - strict branding
    "KNVB",  # Federation - consistent look
]

# Projects where theme switch is DISABLED (partial match)
PROJECTS_SWITCH_DISABLED_PATTERNS = [
    "Brentford",
    "Bologna",
    "Torino",
    "Lecce",
    "Juventus",
    "Inter Milan",
]

# Projects with dark mode default (partial match)
PROJECTS_DARK_MODE_PATTERNS = [
    "FC Twente",
    "Wolverhampton",
    "Leicester",
    "St. Pauli",
    "AZ",
    "Feyenoord",
    "Ajax",
    "Lazio",
    "Napoli",
]


def matches_pattern(name: str, patterns: list[str]) -> bool:
    """Check if name contains any of the patterns."""
    name_lower = name.lower()
    return any(pattern.lower() in name_lower for pattern in patterns)


class Command(BaseCommand):
    help = "Seed theme settings for global, organisations, and projects"

    def handle(self, *args, **options):
        stats = {"global": 0, "org": 0, "project": 0}

        # 1. Global settings
        self.stdout.write("\n=== Global Settings ===")
        for setting_data in GLOBAL_SETTINGS:
            setting, created = Setting.objects.update_or_create(
                key=setting_data["key"],
                scope_type=ScopeType.GLOBAL,
                organisation=None,
                project=None,
                user=None,
                defaults={
                    "description": setting_data["description"],
                    "value_type": setting_data["value_type"],
                    "default_value": setting_data["default_value"],
                    "value": setting_data["value"],
                },
            )
            stats["global"] += 1
            self.stdout.write(
                f"  {'Created' if created else 'Updated'}: {setting.key} = {setting.value}"
            )

        # 2. Organisation settings
        self.stdout.write("\n=== Organisation Settings ===")
        for org in Organisation.objects.exclude(name__startswith="test_").exclude(
            name__startswith="Test_"
        ):
            switch_enabled = org.name not in ORGS_SWITCH_DISABLED

            setting, created = Setting.objects.update_or_create(
                key="theme_switch_enabled",
                scope_type=ScopeType.ORGANISATION,
                organisation=org,
                project=None,
                user=None,
                defaults={
                    "description": f"Theme switch enabled for {org.name}",
                    "value_type": SettingType.BOOLEAN,
                    "default_value": True,
                    "value": switch_enabled,
                },
            )
            stats["org"] += 1
            status = "🔒 locked" if not switch_enabled else "✅ enabled"
            self.stdout.write(f"  {org.name}: theme_switch_enabled = {switch_enabled} ({status})")

        # 3. Project settings
        self.stdout.write("\n=== Project Settings ===")
        projects = Project.objects.exclude(name__startswith="test_").exclude(
            name__startswith="Test_"
        )[:50]

        for project in projects:
            # theme_switch_enabled
            switch_enabled = not matches_pattern(project.name, PROJECTS_SWITCH_DISABLED_PATTERNS)
            Setting.objects.update_or_create(
                key="theme_switch_enabled",
                scope_type=ScopeType.PROJECT,
                organisation=None,
                project=project,
                user=None,
                defaults={
                    "description": f"Theme switch enabled for {project.name}",
                    "value_type": SettingType.BOOLEAN,
                    "default_value": True,
                    "value": switch_enabled,
                },
            )

            # theme_mode (only for dark mode projects)
            if matches_pattern(project.name, PROJECTS_DARK_MODE_PATTERNS):
                Setting.objects.update_or_create(
                    key="theme_mode",
                    scope_type=ScopeType.PROJECT,
                    organisation=None,
                    project=project,
                    user=None,
                    defaults={
                        "description": f"Theme mode for {project.name}",
                        "value_type": SettingType.STRING,
                        "default_value": "light",
                        "value": "dark",
                    },
                )
                self.stdout.write(f"  {project.name}: 🌙 dark mode, switch = {switch_enabled}")
            else:
                status = "🔒 locked" if not switch_enabled else "✅"
                self.stdout.write(f"  {project.name}: switch = {switch_enabled} ({status})")

            stats["project"] += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Theme settings seeded: {stats['global']} global, {stats['org']} org, {stats['project']} project"
            )
        )
