from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.management.base import BaseCommand

from projects.models import Project


@dataclass(frozen=True)
class IdentityDefaults:
    name: str
    default_location: str


DEFAULTS_BY_NORMALIZED_NAME: dict[str, IdentityDefaults] = {
    "ajax": IdentityDefaults(name="Ajax", default_location="Johan Cruijff ArenA"),
    "afc ajax": IdentityDefaults(name="AFC Ajax", default_location="Johan Cruijff ArenA"),
    "feyenoord": IdentityDefaults(name="Feyenoord", default_location="De Kuip"),
    "psv": IdentityDefaults(name="PSV", default_location="Philips Stadion"),
}


def _norm(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _ensure_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return {}


class Command(BaseCommand):
    help = (
        "Backfill/seed metadata.identity fields on existing Projects "
        "(e.g., default_location/logo_url) for TeamReel demo realism."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write changes to the database (default is dry-run).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing metadata.identity fields (default only fills missing).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Optional max number of projects to update (0 = no limit).",
        )

    def handle(self, *args, **options):
        apply = bool(options["apply"])
        force = bool(options["force"])
        limit = int(options["limit"] or 0)

        mode = "APPLY" if apply else "DRY-RUN"
        self.stdout.write(self.style.WARNING(f"Seeding Project identity defaults ({mode})"))

        queryset = Project.all_objects.select_related("parent_project").order_by("id")

        changed = 0
        planned: list[tuple[int, str, dict[str, Any]]] = []

        for project in queryset.iterator():
            if limit and changed >= limit:
                break

            metadata = _ensure_dict(project.metadata)
            identity = _ensure_dict(metadata.get("identity"))

            existing_location = _norm(identity.get("default_location"))
            existing_logo = _norm(identity.get("logo_url"))

            # Derive a default location:
            # 1) mapping by (normalized) name
            # 2) legacy metadata fields from older seeders
            # 3) for teams: inherit from parent club's stadium/location
            desired_location = ""
            name_key = _norm(project.name)
            if name_key in DEFAULTS_BY_NORMALIZED_NAME:
                desired_location = DEFAULTS_BY_NORMALIZED_NAME[name_key].default_location
            else:
                desired_location = str(
                    metadata.get("stadium") or metadata.get("location") or ""
                ).strip()

            if not desired_location and project.parent_project_id:
                parent_meta = _ensure_dict(getattr(project.parent_project, "metadata", None))
                desired_location = str(
                    parent_meta.get("identity", {}).get("default_location")
                    or parent_meta.get("stadium")
                    or parent_meta.get("location")
                    or ""
                ).strip()

            # Derive a default logo url (best-effort)
            desired_logo_url = str(metadata.get("logo_url") or "").strip()
            if not desired_logo_url and project.parent_project_id:
                parent_meta = _ensure_dict(getattr(project.parent_project, "metadata", None))
                desired_logo_url = str(
                    parent_meta.get("identity", {}).get("logo_url")
                    or parent_meta.get("logo_url")
                    or ""
                ).strip()

            next_identity = dict(identity)
            did_change = False

            if desired_location and (force or not existing_location):
                next_identity["default_location"] = desired_location
                did_change = did_change or (_norm(desired_location) != existing_location)

            if desired_logo_url and (force or not existing_logo):
                next_identity["logo_url"] = desired_logo_url
                did_change = did_change or (_norm(desired_logo_url) != existing_logo)

            if not did_change:
                continue

            next_metadata = dict(metadata)
            next_metadata["identity"] = next_identity

            planned.append((project.id, project.name, next_identity))
            changed += 1

            if apply:
                project.metadata = next_metadata
                project.save(update_fields=["metadata"])

        if planned:
            self.stdout.write(self.style.SUCCESS(f"Planned updates: {len(planned)}"))
            for pid, name, ident in planned[:25]:
                self.stdout.write(f" - Project {pid} '{name}': {ident}")
            if len(planned) > 25:
                self.stdout.write(f" - … and {len(planned) - 25} more")
        else:
            self.stdout.write(self.style.SUCCESS("No projects needed identity updates."))

        if not apply:
            self.stdout.write(
                self.style.NOTICE(
                    "Dry-run only. Re-run with --apply to persist changes (optionally --force to overwrite)."
                )
            )

        # Wrap in an atomic transaction only for apply mode, but we already saved per-row.
        # This output is mainly for CI/log visibility.
        self.stdout.write(self.style.WARNING(f"Done. Updated={changed} (mode={mode})."))
