"""LineupSyncService — syncs lineup metadata → Participation records.

Called from ActivitySerializer.update() when metadata.lineup is present.
Reads Formation.positions from DB to map slot → position/line.
"""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from django.db import transaction

from activities.models import Activity, Participation
from organisations.models import Membership
from projects.models import ProjectMembership
from sport_configuration.models import Formation
from video.utils.asset_metadata import check_member_kit_readiness

logger = logging.getLogger(__name__)


class LineupSyncService:
    """Synchronise Activity.metadata.lineup → Participation records."""

    def __init__(self, activity: Activity) -> None:
        self.activity = activity

    # ── Public entry point ──────────────────────────────────────

    @transaction.atomic
    def sync(self) -> int:
        """Parse metadata.lineup and upsert Participation records.

        Returns the number of Participation records created/updated.
        """
        lineup: dict[str, Any] = (self.activity.metadata or {}).get("lineup", {})
        if not lineup:
            return 0

        formation_code: str = lineup.get("formation", "4-3-3")
        formation_id: str | None = lineup.get("formation_id")
        goalkeeper_ids: list[str] = lineup.get("goalkeeper", [])
        player_ids: list[str] = lineup.get("player", [])
        bench: dict[str, str] = lineup.get("bench", {})

        # Resolve Formation from DB (prefer UUID, fallback to code)
        formation = self._resolve_formation(formation_code, formation_id=formation_id)
        if formation:
            self.activity.formation = formation
            self.activity.save(update_fields=["formation"])

        # Build slot→position map from Formation.positions
        position_map = self._build_position_map(formation)

        # Resolve ProjectMembership → org Membership lookup
        all_pm_ids = self._collect_pm_ids(goalkeeper_ids, player_ids, bench)
        pm_lookup = self._load_project_memberships(all_pm_ids)
        membership_lookup = self._resolve_org_memberships(pm_lookup)

        # Track which participations we've seen (for cleanup)
        seen_member_ids: set[UUID] = set()
        count = 0

        # ── Starters: goalkeeper(s) ──
        for i, pm_id_str in enumerate(goalkeeper_ids):
            if pm_id_str == "__guest__":
                continue
            pm = pm_lookup.get(pm_id_str)
            org_membership = membership_lookup.get(pm_id_str)
            if not org_membership:
                logger.warning("No org membership found for PM %s, skipping", pm_id_str)
                continue

            slot = 1 + i  # slot 1 = first GK
            pos_info = position_map.get(slot, {})

            data = {
                "slot": slot,
                "position": pos_info.get("position", "GK"),
                "line": pos_info.get("line", "keeper"),
                "formation_code": formation_code,
            }
            if formation:
                data["formation_id"] = str(formation.pk)

            # Kit readiness check — keepers need goalkeeper tenue
            kit_check = check_member_kit_readiness(getattr(pm, "metadata", None), "goalkeeper")
            if not kit_check["ready"]:
                data["asset_warning"] = "missing_goalkeeper_kit"

            self._upsert_participation(
                member=org_membership,
                project_membership=pm,
                role="starter",
                data=data,
            )
            seen_member_ids.add(org_membership.pk)
            count += 1

        # ── Starters: field players ──
        for i, pm_id_str in enumerate(player_ids):
            if pm_id_str == "__guest__":
                continue
            pm = pm_lookup.get(pm_id_str)
            org_membership = membership_lookup.get(pm_id_str)
            if not org_membership:
                logger.warning("No org membership found for PM %s, skipping", pm_id_str)
                continue

            slot = len(goalkeeper_ids) + 1 + i  # slots after GK(s)
            pos_info = position_map.get(slot, {})

            data = {
                "slot": slot,
                "position": pos_info.get("position", ""),
                "line": pos_info.get("line", ""),
                "formation_code": formation_code,
            }
            if formation:
                data["formation_id"] = str(formation.pk)

            # Kit readiness check — field players need home tenue
            kit_check = check_member_kit_readiness(getattr(pm, "metadata", None), "home")
            if not kit_check["ready"]:
                data["asset_warning"] = "missing_home_kit"

            self._upsert_participation(
                member=org_membership,
                project_membership=pm,
                role="starter",
                data=data,
            )
            seen_member_ids.add(org_membership.pk)
            count += 1

        # ── Bench players ──
        for pm_id_str, bench_status in bench.items():
            if pm_id_str == "__guest__":
                continue
            pm = pm_lookup.get(pm_id_str)
            org_membership = membership_lookup.get(pm_id_str)
            if not org_membership:
                continue

            # Skip if already a starter (bench dict sometimes has starters too)
            if org_membership.pk in seen_member_ids:
                continue

            data = {"bench_status": bench_status or "available"}

            self._upsert_participation(
                member=org_membership,
                project_membership=pm,
                role="substitute",
                data=data,
            )
            seen_member_ids.add(org_membership.pk)
            count += 1

        # ── Soft-delete participations no longer in lineup ──
        stale = (
            Participation.objects
            .filter(activity=self.activity)
            .exclude(member_id__in=seen_member_ids)
        )
        stale_count = stale.count()
        if stale_count:
            stale.delete()  # SoftDeleteMixin → soft-delete
            logger.info("Soft-deleted %d stale participations for activity %s", stale_count, self.activity.pk)

        return count

    # ── Internal helpers ────────────────────────────────────────

    def _resolve_formation(self, code: str, *, formation_id: str | None = None) -> Formation | None:
        """Resolve Formation record — prefer UUID lookup, fallback to code."""
        # Direct UUID lookup (most reliable)
        if formation_id:
            try:
                return Formation.objects.get(pk=UUID(formation_id), is_active=True)
            except (Formation.DoesNotExist, ValueError):
                logger.warning("Formation UUID %s not found, falling back to code", formation_id)

        # Try to find via project → sport hierarchy
        project = self.activity.project
        if project:
            sport = getattr(project, "sport", None)
            if sport:
                config = getattr(sport, "configuration", None)
                if config:
                    formation = Formation.objects.filter(
                        sport_config=config, code=code, is_active=True
                    ).first()
                    if formation:
                        return formation

        # Fallback: any active formation with this code
        return Formation.objects.filter(code=code, is_active=True).first()

    def _build_position_map(self, formation: Formation | None) -> dict[int, dict]:
        """Build {slot: {position, line, x, y}} from Formation.positions."""
        if not formation or not formation.positions:
            return {}
        return {p["slot"]: p for p in formation.positions if "slot" in p}

    def _collect_pm_ids(
        self,
        goalkeeper_ids: list[str],
        player_ids: list[str],
        bench: dict[str, str],
    ) -> list[str]:
        """Collect all non-guest ProjectMembership IDs."""
        ids: list[str] = []
        for pm_id in goalkeeper_ids + player_ids + list(bench.keys()):
            if pm_id and pm_id != "__guest__":
                ids.append(pm_id)
        return ids

    def _load_project_memberships(self, pm_ids: list[str]) -> dict[str, ProjectMembership]:
        """Load ProjectMemberships by their IDs. Returns {str(id): PM}."""
        valid_uuids: list[UUID] = []
        for pm_id in pm_ids:
            try:
                valid_uuids.append(UUID(pm_id))
            except (ValueError, TypeError):
                logger.warning("Invalid PM UUID: %s", pm_id)
        pms = ProjectMembership.objects.filter(pk__in=valid_uuids).select_related("user")
        return {str(pm.pk): pm for pm in pms}

    def _resolve_org_memberships(
        self, pm_lookup: dict[str, ProjectMembership]
    ) -> dict[str, Membership]:
        """Map PM id → org Membership via shared user + project org.

        Returns {pm_id_str: Membership}.
        """
        if not pm_lookup:
            return {}

        org_id = (
            self.activity.project.organisation_id if self.activity.project else None
        )
        if not org_id:
            return {}

        # Collect user IDs from PMs
        user_ids = {pm.user_id for pm in pm_lookup.values()}

        # Batch-load org memberships
        org_memberships = Membership.objects.filter(
            organisation_id=org_id,
            user_id__in=user_ids,
            is_active=True,
        )
        user_to_membership: dict[int, Membership] = {}
        for m in org_memberships:
            user_to_membership[m.user_id] = m

        # Build pm_id → Membership mapping
        result: dict[str, Membership] = {}
        for pm_id_str, pm in pm_lookup.items():
            membership = user_to_membership.get(pm.user_id)
            if membership:
                result[pm_id_str] = membership
            else:
                logger.warning(
                    "No org membership for user %s in org %s (PM %s)",
                    pm.user_id, org_id, pm_id_str,
                )
        return result

    def _upsert_participation(
        self,
        member: Membership,
        project_membership: ProjectMembership | None,
        role: str,
        data: dict,
    ) -> Participation:
        """Create or update a Participation record for this activity+member."""
        participation, created = Participation.objects.update_or_create(
            activity=self.activity,
            member=member,
            defaults={
                "project_membership": project_membership,
                "role": role,
                "data": data,
                "status": "confirmed",
            },
        )
        if created:
            logger.debug("Created participation %s for %s", participation.pk, member)
        return participation
