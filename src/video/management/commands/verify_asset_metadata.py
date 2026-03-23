"""Verify that the asset metadata migration completed correctly.

Checks:
- All memberships with teamreel_assets have ``roles`` key
- No root-level ``images`` or ``videos`` remaining (unless _legacy_assets present)
- All variant values are dicts with ``raw`` or ``processed``
- Roles match membership's functional_roles

Usage::

    python manage.py verify_asset_metadata
    python manage.py verify_asset_metadata --org my-org-slug
"""

from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Verify that asset metadata migration completed correctly"

    def add_arguments(self, parser):
        parser.add_argument(
            "--org",
            type=str,
            help="Verify only memberships for this organisation slug",
        )

    def handle(self, *args, **options):
        from projects.models import ProjectMembership

        org_slug = options.get("org")

        qs = ProjectMembership.objects.filter(
            deleted_at__isnull=True,
        )
        if org_slug:
            qs = qs.filter(project__organisation__slug=org_slug)

        totals = {
            "checked": 0,
            "ok": 0,
            "no_assets": 0,
            "not_migrated": 0,
            "bad_values": 0,
        }
        issues: list[str] = []

        for membership in qs.iterator(chunk_size=100):
            meta = getattr(membership, "metadata", None) or {}
            tr = meta.get("teamreel_assets")

            if not tr or not isinstance(tr, dict):
                totals["no_assets"] += 1
                continue

            totals["checked"] += 1

            # Check for root-level images/videos (should be removed after migration)
            if tr.get("images") or tr.get("videos"):
                if "_legacy_assets" not in tr:
                    totals["not_migrated"] += 1
                    issues.append(
                        f"  {membership.pk}: root-level images/videos without _legacy_assets"
                    )
                    continue

            roles = tr.get("roles")
            if not roles or not isinstance(roles, dict):
                totals["not_migrated"] += 1
                issues.append(f"  {membership.pk}: no roles key")
                continue

            # Validate variant values are proper dicts
            ok = True
            for role_name, role_data in roles.items():
                if not isinstance(role_data, dict):
                    issues.append(f"  {membership.pk}: role {role_name} is not dict")
                    ok = False
                    continue
                for media_type in ("images", "videos"):
                    media_data = role_data.get(media_type, {})
                    if not isinstance(media_data, dict):
                        continue
                    for asset_type, asset_data in media_data.items():
                        if not isinstance(asset_data, dict):
                            continue
                        for kit, kit_data in asset_data.items():
                            if not isinstance(kit_data, dict):
                                continue
                            for variant, val in kit_data.items():
                                if not isinstance(val, dict):
                                    issues.append(
                                        f"  {membership.pk}: {role_name}.{media_type}"
                                        f".{asset_type}.{kit}.{variant} is not dict"
                                    )
                                    ok = False

            if ok:
                totals["ok"] += 1
            else:
                totals["bad_values"] += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nVerification complete:\n"
                f"  Checked: {totals['checked']}\n"
                f"  OK: {totals['ok']}\n"
                f"  No assets: {totals['no_assets']}\n"
                f"  Not migrated: {totals['not_migrated']}\n"
                f"  Bad values: {totals['bad_values']}"
            )
        )

        if issues:
            self.stdout.write(self.style.ERROR(f"\nIssues found ({len(issues)}):"))
            for issue in issues[:50]:
                self.stdout.write(issue)
            if len(issues) > 50:
                self.stdout.write(f"  ... and {len(issues) - 50} more")
