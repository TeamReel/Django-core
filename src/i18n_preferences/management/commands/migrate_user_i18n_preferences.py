"""Migrate user i18n preferences from User model fields to B10 settings."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from settings.models import ScopeType, Setting

from ...validators import validate_language_code, validate_timezone

User = get_user_model()


class Command(BaseCommand):
    """Migrate user language/timezone from User model fields to B10 settings.

    This command safely migrates existing User model fields (e.g., user.language,
    user.timezone) to the new B10 settings system with USER scope. It validates
    data before migration and provides detailed progress reporting.

    Usage:
        # Preview what would be migrated
        python manage.py migrate_user_i18n_preferences --dry-run

        # Run the actual migration
        python manage.py migrate_user_i18n_preferences

        # Process in smaller batches
        python manage.py migrate_user_i18n_preferences --batch-size=500
    """

    help = "Migrate user language/timezone from User model fields to B10 settings"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be migrated without making changes",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=1000,
            help="Number of users to process per batch (default: 1000)",
        )
        parser.add_argument(
            "--skip-validation",
            action="store_true",
            help="Skip validation of language/timezone codes (not recommended)",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        skip_validation = options["skip_validation"]

        if dry_run:
            self.stdout.write(self.style.WARNING("\n🔍 DRY RUN MODE - No changes will be made\n"))

        # Check if User model has the expected fields
        has_language = hasattr(User, "language")
        has_timezone = hasattr(User, "timezone")

        if not has_language and not has_timezone:
            self.stdout.write(
                self.style.ERROR(
                    "\n❌ User model has no 'language' or 'timezone' fields.\n"
                    "This command is designed to migrate legacy User model fields.\n"
                    "If your project stores preferences elsewhere, this command is not needed.\n"
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ User model has fields: "
                f"language={'✓' if has_language else '✗'}, "
                f"timezone={'✓' if has_timezone else '✗'}\n"
            )
        )

        # Build query for users with preferences to migrate
        query = User.objects.all()
        if has_language:
            query = query.exclude(language__isnull=True).exclude(language="")

        total = query.count()

        if total == 0:
            self.stdout.write(self.style.WARNING("\n⚠️  No users with preferences to migrate\n"))
            return

        self.stdout.write(
            self.style.SUCCESS(f"\n📊 Found {total} user(s) with language/timezone to migrate\n")
        )

        if dry_run:
            # Show sample of what would be migrated
            sample_size = min(5, total)
            sample_users = list(query[:sample_size])

            self.stdout.write(self.style.WARNING(f"\nSample (first {sample_size}):\n"))
            for user in sample_users:
                language = getattr(user, "language", None) if has_language else None
                timezone = getattr(user, "timezone", None) if has_timezone else settings.TIME_ZONE

                self.stdout.write(
                    f"  User {user.id} ({user.email}):\n"
                    f"    Language: {language or '(not set)'}\n"
                    f"    Timezone: {timezone or '(not set)'}\n"
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✓ Dry run complete. Would migrate {total} user(s).\n"
                    "Run without --dry-run to perform the actual migration.\n"
                )
            )
            return

        # Actual migration
        self.stdout.write(self.style.SUCCESS("\n🚀 Starting migration...\n"))

        migrated = 0
        skipped = 0
        errors = 0

        for user in query.iterator(chunk_size=batch_size):
            try:
                with transaction.atomic():
                    # Extract fields
                    language = getattr(user, "language", None) if has_language else None
                    timezone_value = getattr(user, "timezone", None) if has_timezone else None

                    # Build preferences dict
                    prefs = {}

                    if language:
                        if not skip_validation:
                            try:
                                validate_language_code(language)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f"  ⚠️  User {user.id}: Invalid language '{language}': {e}"
                                    )
                                )
                                language = None

                        if language:
                            prefs["language"] = language

                    if timezone_value:
                        if not skip_validation:
                            try:
                                validate_timezone(timezone_value)
                            except Exception as e:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f"  ⚠️  User {user.id}:"
                                        f" Invalid timezone '{timezone_value}': {e}"
                                    )
                                )
                                timezone_value = None

                        if timezone_value:
                            prefs["timezone"] = timezone_value

                    # Skip if no valid preferences
                    if not prefs:
                        skipped += 1
                        continue

                    # Check if setting already exists
                    existing = Setting.objects.filter(
                        key="i18n.preferences",
                        scope_type=ScopeType.USER,
                        user=user,
                    ).first()

                    if existing:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  ⚠️  User {user.id}: Setting already exists, skipping"
                            )
                        )
                        skipped += 1
                        continue

                    # Create B10 setting
                    Setting.objects.create(
                        key="i18n.preferences",
                        scope_type=ScopeType.USER,
                        user=user,
                        value=prefs,
                        value_type="JSON",
                        default_value={},
                    )

                    migrated += 1

                    # Progress reporting every 100 users
                    if migrated % 100 == 0:
                        self.stdout.write(f"  ⏳ Progress: {migrated}/{total} users migrated...")

            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f"  ❌ Error migrating user {user.id}: {e}"))

        # Final summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("\n✅ Migration Complete!\n"))
        self.stdout.write(f"  Migrated:  {migrated}")
        self.stdout.write(f"  Skipped:   {skipped}")
        self.stdout.write(f"  Errors:    {errors}")
        self.stdout.write(f"  Total:     {total}\n")
        self.stdout.write("=" * 60 + "\n")

        if errors > 0:
            self.stdout.write(
                self.style.WARNING("\n⚠️  Some users failed to migrate. Review errors above.\n")
            )
