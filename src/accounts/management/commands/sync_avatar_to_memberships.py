"""Sync User.avatar to active ProjectMembership metadata (one-time backfill)."""

from accounts.models import User
from django.core.management.base import BaseCommand
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Sync avatar path from User.avatar into membership metadata.teamreel_assets.media.profile.url"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be updated without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        users_with_avatar = User.objects.exclude(avatar="").exclude(avatar__isnull=True)
        total_updated = 0
        total_skipped = 0

        for user in users_with_avatar.iterator():
            avatar_name = user.avatar.name if user.avatar else None
            if not avatar_name:
                continue

            memberships = ProjectMembership.objects.filter(
                user=user,
                deleted_at__isnull=True,
            )

            for m in memberships:
                meta = m.metadata or {}
                tr = meta.get("teamreel_assets")
                if tr is None:
                    total_skipped += 1
                    continue

                media = tr.setdefault("media", {})
                profile = media.setdefault("profile", {})

                if profile.get("url") == avatar_name:
                    total_skipped += 1
                    continue

                old_url = profile.get("url", "")
                profile["url"] = avatar_name
                m.metadata = meta

                if dry_run:
                    self.stdout.write(
                        f"  [DRY RUN] {user.email} -> membership {m.id}: "
                        f"'{old_url}' -> '{avatar_name}'"
                    )
                else:
                    m.save(update_fields=["metadata"])

                total_updated += 1

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(f"{prefix}Done: {total_updated} updated, {total_skipped} skipped")
        )
