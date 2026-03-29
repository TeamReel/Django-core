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
    "ado den haag": IdentityDefaults(name="ADO Den Haag", default_location="Bingoal Stadion"),
    "ajax": IdentityDefaults(name="Ajax", default_location="Johan Cruijff ArenA"),
    "afc ajax": IdentityDefaults(name="AFC Ajax", default_location="Johan Cruijff ArenA"),
    "cambuur leeuwarden": IdentityDefaults(name="SC Cambuur", default_location="Cambuur Stadion"),
    "fc den bosch": IdentityDefaults(name="FC Den Bosch", default_location="De Vliert"),
    "fc dordrecht": IdentityDefaults(name="FC Dordrecht", default_location="M-Scores Stadion"),
    "helmond sport": IdentityDefaults(name="Helmond Sport", default_location="SolarUnie Stadion"),
    "jong ajax": IdentityDefaults(name="Jong Ajax", default_location="Sportcomplex De Toekomst"),
    "jong az": IdentityDefaults(name="Jong AZ", default_location="AFAS Trainingscomplex"),
    "jong fc utrecht": IdentityDefaults(
        name="Jong FC Utrecht", default_location="Sportcomplex Zoudenbalch"
    ),
    "jong psv": IdentityDefaults(name="Jong PSV", default_location="PSV Campus De Herdgang"),
    "mvv": IdentityDefaults(name="MVV Maastricht", default_location="De Geusselt"),
    "mvv maastricht": IdentityDefaults(name="MVV Maastricht", default_location="De Geusselt"),
    "roda jc": IdentityDefaults(
        name="Roda JC Kerkrade", default_location="Parkstad Limburg Stadion"
    ),
    "roda jc kerkrade": IdentityDefaults(
        name="Roda JC Kerkrade", default_location="Parkstad Limburg Stadion"
    ),
    "vvv-venlo": IdentityDefaults(name="VVV-Venlo", default_location="Covebo Stadion - De Koel"),
    "vvv venlo": IdentityDefaults(name="VVV-Venlo", default_location="Covebo Stadion - De Koel"),
    "almere city": IdentityDefaults(name="Almere City", default_location="Yanmar Stadion"),
    "az": IdentityDefaults(name="AZ", default_location="AFAS Stadion"),
    "cambuur": IdentityDefaults(name="SC Cambuur", default_location="Cambuur Stadion"),
    "sc cambuur": IdentityDefaults(name="SC Cambuur", default_location="Cambuur Stadion"),
    "de graafschap": IdentityDefaults(name="De Graafschap", default_location="De Vijverberg"),
    "excelsior": IdentityDefaults(name="Excelsior", default_location="Van Donge & De Roo Stadion"),
    "fc eindhoven": IdentityDefaults(name="FC Eindhoven", default_location="Jan Louwers Stadion"),
    "fc emmen": IdentityDefaults(name="FC Emmen", default_location="De Oude Meerdijk"),
    "fc groningen": IdentityDefaults(name="FC Groningen", default_location="Euroborg"),
    "fc twente": IdentityDefaults(name="FC Twente", default_location="De Grolsch Veste"),
    "fc utrecht": IdentityDefaults(name="FC Utrecht", default_location="Stadion Galgenwaard"),
    "feyenoord": IdentityDefaults(name="Feyenoord", default_location="De Kuip"),
    "fortuna sittard": IdentityDefaults(
        name="Fortuna Sittard", default_location="Fortuna Sittard Stadion"
    ),
    "go ahead eagles": IdentityDefaults(
        name="Go Ahead Eagles", default_location="De Adelaarshorst"
    ),
    "heracles": IdentityDefaults(name="Heracles Almelo", default_location="Erve Asito"),
    "heracles almelo": IdentityDefaults(name="Heracles Almelo", default_location="Erve Asito"),
    "nec": IdentityDefaults(name="NEC", default_location="Goffertstadion"),
    "n.e.c.": IdentityDefaults(name="NEC", default_location="Goffertstadion"),
    "pec zwolle": IdentityDefaults(name="PEC Zwolle", default_location="MAC3PARK Stadion"),
    "psv": IdentityDefaults(name="PSV", default_location="Philips Stadion"),
    "rkc waalwijk": IdentityDefaults(name="RKC Waalwijk", default_location="Mandemakers Stadion"),
    "sc heerenveen": IdentityDefaults(name="sc Heerenveen", default_location="Abe Lenstra Stadion"),
    "heerenveen": IdentityDefaults(name="sc Heerenveen", default_location="Abe Lenstra Stadion"),
    "sparta": IdentityDefaults(
        name="Sparta Rotterdam", default_location="Sparta-Stadion Het Kasteel"
    ),
    "sparta rotterdam": IdentityDefaults(
        name="Sparta Rotterdam", default_location="Sparta-Stadion Het Kasteel"
    ),
    "telstar": IdentityDefaults(name="Telstar", default_location="711 Stadion"),
    "top oss": IdentityDefaults(name="TOP Oss", default_location="Frans Heesen Stadion"),
    "vitesse": IdentityDefaults(name="Vitesse", default_location="GelreDome"),
    "volendam": IdentityDefaults(name="FC Volendam", default_location="Kras Stadion"),
    "fc volendam": IdentityDefaults(name="FC Volendam", default_location="Kras Stadion"),
    "willem ii": IdentityDefaults(name="Willem II", default_location="Koning Willem II Stadion"),
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
