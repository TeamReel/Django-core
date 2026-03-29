"""
Management command to inspect and repair misassigned member assets.

Assets are stored under metadata.teamreel_assets:
  images.fullbody.{kit}   images.closeup.{kit}
  videos.intro.{key}      videos.celebration.{key}
  media.{slot}            (legacy form slots)

Usage:
    # Inspect by last name:
    python manage.py repair_member_assets --inspect Klei
    python manage.py repair_member_assets --inspect Oenen

    # Dry-run swap (preview only):
    python manage.py repair_member_assets --from-id <UUID> --to-id <UUID>

    # Commit swap (move teamreel_assets from wrong member to correct one):
    python manage.py repair_member_assets --from-id <UUID> --to-id <UUID> --commit

    # Recover assets from soft-deleted predecessors (dry-run):
    python manage.py repair_member_assets --recover

    # Recover assets from soft-deleted predecessors (commit):
    python manage.py repair_member_assets --recover --commit
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Inspect and repair misassigned member assets in metadata.teamreel_assets"

    def add_arguments(self, parser):
        parser.add_argument(
            "--inspect",
            metavar="LAST_NAME",
            help="List memberships with assets for this last name",
        )
        parser.add_argument(
            "--from-id",
            metavar="UUID",
            help="Membership UUID that holds the WRONG asset",
        )
        parser.add_argument(
            "--to-id",
            metavar="UUID",
            help="Membership UUID that SHOULD have the asset",
        )
        parser.add_argument(
            "--recover",
            action="store_true",
            default=False,
            help=(
                "Recover assets from soft-deleted predecessors"
                " for active memberships missing them"
            ),
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
            self._swap(
                from_id=options["from_id"],
                to_id=options["to_id"],
                commit=options["commit"],
            )
        elif options["recover"]:
            self._recover(commit=options["commit"])
        else:
            self.stdout.write(
                self.style.ERROR("Provide --inspect LAST_NAME, --from-id/--to-id, or --recover")
            )

    def _tr(self, meta):
        return (meta or {}).get("teamreel_assets", {})

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
            tr = self._tr(m.metadata)
            images = tr.get("images", {})
            videos = tr.get("videos", {})
            media = tr.get("media", {})
            has_data = bool(
                images or videos or any(v.get("url") for v in media.values() if isinstance(v, dict))
            )
            if has_data:
                found += 1
                self.stdout.write(self.style.SUCCESS(f"\n{'='*60}"))
                self.stdout.write(f"Name    : {uname}")
                self.stdout.write(f"ID      : {m.id}")
                self.stdout.write(f"Project : {m.project_id}")
                for cat, variants in images.items():
                    for kit, url in variants.items():
                        if url:
                            self.stdout.write(f"  images.{cat}.{kit} : {str(url)[:90]}")
                for cat, variants in videos.items():
                    for key, url in variants.items():
                        if url:
                            self.stdout.write(f"  videos.{cat}.{key} : {str(url)[:90]}")
                for slot, val in media.items():
                    if isinstance(val, dict) and val.get("url"):
                        self.stdout.write(f"  media.{slot} : {str(val['url'])[:90]}")
            else:
                self.stdout.write(f"(empty) {uname} | {m.id} | proj={m.project_id}")
        if found == 0:
            self.stdout.write(
                self.style.WARNING(f"\nNo memberships with assets found for '{last_name}'")
            )
        else:
            self.stdout.write(self.style.SUCCESS(f"\n{found} membership(s) with assets found"))

    def _swap(self, from_id: str, to_id: str, commit: bool):
        try:
            src = ProjectMembership.objects.select_related("user").get(id=from_id)
            dst = ProjectMembership.objects.select_related("user").get(id=to_id)
        except ProjectMembership.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(str(e)))
            return

        src_name = f"{src.user.first_name} {src.user.last_name}".strip() if src.user else "?"
        dst_name = f"{dst.user.first_name} {dst.user.last_name}".strip() if dst.user else "?"

        self.stdout.write("\nSwapping teamreel_assets:")
        self.stdout.write(f"  FROM (wrong) : {src_name} ({from_id})")
        self.stdout.write(f"  TO (correct) : {dst_name} ({to_id})")

        src_meta = dict(src.metadata or {})
        dst_meta = dict(dst.metadata or {})
        src_tr = src_meta.get("teamreel_assets", {})
        dst_tr = dst_meta.get("teamreel_assets", {})

        src_imgs = list(src_tr.get("images", {}).keys())
        dst_imgs = list(dst_tr.get("images", {}).keys())
        self.stdout.write(f"  FROM images  : {src_imgs}")
        self.stdout.write(f"  TO images    : {dst_imgs}")

        if not commit:
            self.stdout.write(
                self.style.WARNING("\n[DRY RUN] Add --commit to actually swap the assets.")
            )
            return

        src_meta["teamreel_assets"] = dst_tr
        dst_meta["teamreel_assets"] = src_tr

        with transaction.atomic():
            src.metadata = src_meta
            dst.metadata = dst_meta
            src.save(update_fields=["metadata"])
            dst.save(update_fields=["metadata"])

        self.stdout.write(
            self.style.SUCCESS(f"\n[OK] Swapped teamreel_assets: {src_name} <-> {dst_name}")
        )

    def _recover(self, commit: bool):
        """Recover teamreel_assets from soft-deleted predecessors.

        For every active membership that has no teamreel_assets, look for the
        most recent soft-deleted membership of the same user+project+period
        that *does* have assets.  Copy them over.
        """
        # All active memberships without teamreel_assets
        active_qs = ProjectMembership.objects.filter(deleted_at__isnull=True).select_related(
            "user", "project", "period"
        )

        candidates = []
        for m in active_qs.iterator():
            tr = self._tr(m.metadata)
            if tr:
                continue  # already has assets
            candidates.append(m)

        if not candidates:
            self.stdout.write(
                self.style.SUCCESS("All active memberships already have assets (or none exist).")
            )
            return

        self.stdout.write(
            f"\nFound {len(candidates)} active membership(s) without teamreel_assets.\n"
        )

        recovered = 0
        for m in candidates:
            uname = f"{m.user.first_name} {m.user.last_name}".strip() if m.user else "?"

            # Find the most recent soft-deleted predecessor with assets
            predecessor = (
                ProjectMembership.all_objects.filter(
                    project=m.project,
                    user=m.user,
                    period=m.period,
                    deleted_at__isnull=False,
                    metadata__teamreel_assets__isnull=False,
                )
                .exclude(metadata__teamreel_assets={})
                .order_by("-deleted_at")
                .only("id", "metadata")
                .first()
            )

            if predecessor is None:
                continue

            pred_tr = self._tr(predecessor.metadata)
            if not pred_tr:
                continue

            recovered += 1
            self.stdout.write(
                self.style.WARNING(f"  {uname} | active={m.id} <- deleted={predecessor.id}")
            )

            images = pred_tr.get("images", {})
            for cat, variants in images.items():
                for kit, url in (variants if isinstance(variants, dict) else {}).items():
                    if url:
                        self.stdout.write(f"    images.{cat}.{kit} : {str(url)[:80]}")

            if commit:
                meta = dict(m.metadata or {})
                meta["teamreel_assets"] = pred_tr
                m.metadata = meta
                m.save(update_fields=["metadata"])

        self.stdout.write("")
        if recovered == 0:
            self.stdout.write(self.style.SUCCESS("No recoverable predecessors found."))
        elif commit:
            self.stdout.write(
                self.style.SUCCESS(f"[OK] Recovered assets for {recovered} membership(s).")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] {recovered} membership(s) can be recovered. Add --commit to apply."
                )
            )
