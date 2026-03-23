"""Restore teamreel_assets metadata from ``_legacy_assets`` backup.

Rolls back the migration done by ``migrate_asset_metadata``.  For each
membership that has a ``_legacy_assets`` key, the original ``images``,
``videos``, and ``media`` dicts are restored and the ``roles`` +
``_legacy_assets`` keys are removed.

Usage::

    python manage.py restore_legacy_assets --dry-run   # preview
    python manage.py restore_legacy_assets --org slug   # single org
    python manage.py restore_legacy_assets              # full rollback
"""

from __future__ import annotations

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


def restore_membership(membership, *, dry_run: bool = False) -> dict:
    """Restore a single membership's metadata from _legacy_assets.

    Returns a stats dict with keys: ``restored``, ``skipped``.
    """
    stats = {"restored": 0, "skipped": 0}

    meta = getattr(membership, "metadata", None) or {}
    tr = meta.get("teamreel_assets")

    if not tr or not isinstance(tr, dict):
        stats["skipped"] = 1
        return stats

    legacy = tr.get("_legacy_assets")
    if not legacy or not isinstance(legacy, dict):
        stats["skipped"] = 1
        return stats

    if dry_run:
        stats["restored"] = 1
        return stats

    # Restore original root-level data
    if legacy.get("images"):
        tr["images"] = legacy["images"]
    if legacy.get("videos"):
        tr["videos"] = legacy["videos"]
    if legacy.get("media"):
        tr["media"] = legacy["media"]

    # Remove migrated structure
    tr.pop("roles", None)
    tr.pop("_legacy_assets", None)

    meta["teamreel_assets"] = tr
    membership.metadata = meta
    membership.save(update_fields=["metadata", "updated_at"])

    stats["restored"] = 1
    return stats


class Command(BaseCommand):
    help = "Restore teamreel_assets metadata from _legacy_assets backup"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview only — don't write changes",
        )
        parser.add_argument(
            "--org",
            type=str,
            help="Restore only memberships for this organisation slug",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of memberships to process per batch (default: 100)",
        )

    def handle(self, *args, **options):
        from projects.models import ProjectMembership

        dry_run = options["dry_run"]
        org_slug = options.get("org")
        batch_size = options["batch_size"]

        qs = ProjectMembership.objects.select_related(
            "project__organisation",
        ).filter(deleted_at__isnull=True)

        if org_slug:
            qs = qs.filter(project__organisation__slug=org_slug)

        total = qs.count()
        self.stdout.write(f"Found {total} memberships to check")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be written"))

        totals = {"restored": 0, "skipped": 0, "errors": 0}

        for i, membership in enumerate(qs.iterator(chunk_size=batch_size)):
            try:
                result = restore_membership(membership, dry_run=dry_run)

                if result["restored"]:
                    totals["restored"] += 1
                else:
                    totals["skipped"] += 1
            except Exception:
                logger.exception(
                    "Failed to restore membership %s",
                    membership.pk,
                )
                totals["errors"] += 1

            if (i + 1) % batch_size == 0:
                self.stdout.write(f"  Processed {i + 1}/{total}...")

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"\n{prefix}Restore complete:\n"
                f"  Restored: {totals['restored']}\n"
                f"  Skipped (no backup): {totals['skipped']}\n"
                f"  Errors: {totals['errors']}"
            )
        )
