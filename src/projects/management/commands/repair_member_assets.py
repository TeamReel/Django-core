"""
Management command to inspect and repair misassigned member assets.

Usage examples:
    # List all memberships with assets for a user by last name:
    python manage.py repair_member_assets --inspect Klei
    python manage.py repair_member_assets --inspect Oenen

    # Preview a move (dry-run):
    python manage.py repair_member_assets \\
        --from-id <UUID> --to-id <UUID> \\
        --keys member_in_tenue_home member_closeup_home

    # Commit the move:
    python manage.py repair_member_assets \\
        --from-id <UUID> --to-id <UUID> \\
        --keys member_in_tenue_home \\
        --commit
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Inspect and repair misassigned member assets in metadata"

    def add_arguments(self, parser):
        parser.add_argument(
            "--inspect",
            metavar="LAST_NAME",
            help="List memberships with assets matching this last name",
        )
        parser.add_argument(
            "--from-id",
            metavar="UUID",
            help="Membership UUID that currently holds the WRONG asset",
        )
        parser.add_argument(
            "--to-id",
            metavar="UUID",
            help="Membership UUID that SHOULD have the asset",
        )
        parser.add_argument(
            "--keys",
            nargs="+",
            metavar="ASSET_KEY",
            help="Metadata asset keys to move (e.g. member_in_tenue_home)",
        )
        parser.add_argument(
            "--commit",
            action="store_true",
            default=False,
            help="Actually save changes (omit for dry-run)",
        )

    def handle(self, *args, **options):
        if options["inspect"]:
            self._inspect(options["inspect"])
        elif options["from_id"] and options["to_id"]:
            self._move(
                from_id=options["from_id"],
                to_id=options["to_id"],
                keys=options.get("keys"),
                commit=options["commit"],
            )
        else:
            self.stdout.write(self.style.ERROR("Provide --inspect LAST_NAME or --from-id/--to-id"))

    def _inspect(self, last_name: str):
        qs = (
            ProjectMembership.objects.filter(user__last_name__icontains=last_name)
            .select_related("user", "project")
            .order_by("project_id", "user__last_name")
        )

        found = 0
        for m in qs:
            u = m.user
            uname = f"{u.first_name} {u.last_name}".strip() if u else "Unknown"
            meta = m.metadata or {}
            assets = meta.get("assets", {})
            variants = meta.get("asset_variants", {})
            has_data = bool(assets or variants)

            if has_data:
                found += 1
                self.stdout.write(self.style.SUCCESS(f"\n{'='*60}"))
                self.stdout.write(f"Name       : {uname}")
                self.stdout.write(f"ID         : {m.id}")
                self.stdout.write(f"Project    : {m.project_id}")
                for k, v in assets.items():
                    self.stdout.write(f"  asset.{k} : {str(v)[:100]}")
                for k, v in variants.items():
                    self.stdout.write(f"  var.{k}   : {str(v)[:100]}")
            else:
                self.stdout.write(f"(empty) {uname} | {m.id} | proj={m.project_id}")

        if found == 0:
            self.stdout.write(
                self.style.WARNING(f"\nNo memberships with assets found for '{last_name}'")
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"\n{found} membership(s) with assets found"))

    def _move(self, from_id: str, to_id: str, keys, commit: bool):
        try:
            src = ProjectMembership.objects.select_related("user").get(id=from_id)
            dst = ProjectMembership.objects.select_related("user").get(id=to_id)
        except ProjectMembership.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(str(e)))
            return

        src_name = f"{src.user.first_name} {src.user.last_name}".strip() if src.user else "?"
        dst_name = f"{dst.user.first_name} {dst.user.last_name}".strip() if dst.user else "?"

        self.stdout.write(f"\nSource : {src_name} ({from_id})")
        self.stdout.write(f"Dest   : {dst_name} ({to_id})")

        src_meta = dict(src.metadata or {})
        dst_meta = dict(dst.metadata or {})
        src_assets = dict(src_meta.get("assets", {}))
        dst_assets = dict(dst_meta.get("assets", {}))
        src_variants = dict(src_meta.get("asset_variants", {}))
        dst_variants = dict(dst_meta.get("asset_variants", {}))

        if not keys:
            # Show all keys in source
            self.stdout.write("\nSource asset keys: " + str(list(src_assets.keys())))
            self.stdout.write("Source variant keys: " + str(list(src_variants.keys())))
            self.stdout.write(self.style.WARNING("Use --keys to specify which keys to move"))
            return

        moved = []
        for key in keys:
            if key in src_assets:
                self.stdout.write(f"  MOVE asset.{key}: {str(src_assets[key])[:80]}")
                dst_assets[key] = src_assets.pop(key)
                moved.append(key)
            else:
                self.stdout.write(self.style.WARNING(f"  SKIP asset.{key}: not in source"))

            if key in src_variants:
                self.stdout.write(f"  MOVE var.{key}: {str(src_variants[key])[:80]}")
                dst_variants[key] = src_variants.pop(key)

        if not moved:
            self.stdout.write(self.style.ERROR("Nothing to move."))
            return

        src_meta["assets"] = src_assets
        src_meta["asset_variants"] = src_variants
        dst_meta["assets"] = dst_assets
        dst_meta["asset_variants"] = dst_variants

        if not commit:
            self.stdout.write(
                self.style.WARNING(
                    f"\n[DRY RUN] Would move {moved} from {src_name} → {dst_name}. Add --commit to save."
                )
            )
        else:
            with transaction.atomic():
                src.metadata = src_meta
                dst.metadata = dst_meta
                src.save(update_fields=["metadata"])
                dst.save(update_fields=["metadata"])
            self.stdout.write(self.style.SUCCESS(f"\n✅ Moved {moved} from {src_name} → {dst_name}"))
