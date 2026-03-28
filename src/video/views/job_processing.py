"""Asset processing actions for VideoJobViewSet."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from django.apps import apps
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from src.video.models.job import JobStatus
from src.video.serializers.job import VideoJobDetailSerializer
from src.video.utils.asset_metadata import (
    get_variant_value,
    infer_role,
    iter_variants,
    media_type_for_asset,
    set_variant_value,
    update_media_aliases,
)

logger = logging.getLogger(__name__)


class AssetProcessingMixin:
    """Mixin providing asset processing actions for VideoJobViewSet."""

    @action(detail=True, methods=["post"], url_path="process-sync")
    def process_sync(self, request: Request, pk: str | None = None) -> Response:
        """Process a queued job synchronously (bypasses Celery).

        POST /api/v1/video/jobs/{id}/process-sync/

        Use this for testing when Celery worker isn't available.
        """
        job = self.get_object()
        if job.status not in [JobStatus.QUEUED, JobStatus.FAILED]:
            return Response(
                {"error": f"Job status must be queued or failed, got: {job.status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.job_type != "lineup":
            return Response(
                {"error": "Only lineup jobs supported for sync processing"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("Starting synchronous processing for job %s", job.id)

        try:
            from src.video.services.processors.lineup import LineupProcessor

            processor = LineupProcessor(job)
            processor.execute()

            logger.info("Sync processing completed for job %s", job.id)

            # Refresh and return
            job.refresh_from_db()
            output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
            return Response(output.data, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback

            logger.error(
                "Sync processing failed for job %s: %s\n%s", job.id, e, traceback.format_exc()
            )
            job.refresh_from_db()
            return Response(
                {
                    "error": str(e),
                    "status": job.status,
                    "error_message": job.error_message,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="process-asset")
    def process_asset(self, request: Request) -> Response:
        """Process a raw member asset to lineup-ready format.

        POST /api/v1/video/jobs/process-asset/

        Request body:
        {
            "membership_id": "uuid",
            "asset_type": "fullbody" | "closeup" | "intro" | "celebration" | "photo_composite" | "walking_composite" | "action_photo",
            "kit_type": "home" | "away" | "third" | "goalkeeper" | ...,
            "variant_id": "arms_crossed" | null    // for intro/celebration style
        }

        Triggers background removal + resize/crop to lineup-ready specs.
        Updates membership.metadata.teamreel_assets in-place with { raw, processed, processing_state }.
        """
        membership_id = request.data.get("membership_id")
        asset_type = request.data.get("asset_type")
        kit_type = request.data.get("kit_type", "home")
        variant_id = request.data.get("variant_id")

        if not membership_id or not asset_type:
            return Response(
                {"error": "membership_id and asset_type are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_asset_types = [
            "fullbody",
            "closeup",
            "intro",
            "celebration",
            "then_vs_now",
            "photo_composite",
            "walking_composite",
            "action_photo",
        ]
        if asset_type not in valid_asset_types:
            return Response(
                {"error": f"asset_type must be one of: {valid_asset_types}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get membership
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        try:
            membership = ProjectMembership.objects.select_related("project").get(id=membership_id)
        except ProjectMembership.DoesNotExist:
            return Response(
                {"error": f"Membership {membership_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check project membership for the requesting user
        if not ProjectMembership.objects.filter(
            project=membership.project, user=request.user
        ).exists():
            raise PermissionDenied("You must be a project member.")

        # Resolve role — accept from request or infer
        role = request.data.get("role") or infer_role(membership, kit_type)
        variant = variant_id if variant_id and variant_id != kit_type else "default"

        # Direct lookup in new nested format — no fallbacks
        mt = media_type_for_asset(asset_type)
        variant_val = get_variant_value(membership, role, mt, asset_type, kit_type, variant)
        raw_url = None
        if isinstance(variant_val, dict):
            raw_url = variant_val.get("raw") or variant_val.get("processed")

        if not raw_url:
            composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
            return Response(
                {"error": f"No raw asset found for {asset_type}.{composite_key}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark as "processing" immediately in metadata for instant UI feedback
        self._update_variant_metadata(
            membership,
            asset_type,
            kit_type,
            variant_id,
            {
                "raw": raw_url,
                "processed": None,
                "processing_state": "processing",
                "processing_started_at": timezone.now().isoformat(),
            },
        )

        # Dispatch to Celery worker for async processing
        # This runs on a dedicated worker service, not blocking HTTP requests
        from src.video.tasks.asset_processing import process_member_asset

        backend = "rvm" if asset_type in ("intro", "celebration", "then_vs_now") else "rembg"
        # Composite videos (photo_composite, walking_composite) don't need bg removal.
        # The processor checks spec.bg_removed and skips it, but we set backend to
        # "none" for clarity in logging.
        if asset_type in ("photo_composite", "walking_composite"):
            backend = "none"

        logger.info(
            "process_asset_background_start membership_id=%s asset_type=%s kit_type=%s variant_id=%s backend=%s",
            str(membership_id),
            asset_type,
            kit_type,
            variant_id or "",
            backend,
        )

        process_member_asset.delay(
            membership_id=str(membership_id),
            asset_type=asset_type,
            kit_type=kit_type,
            raw_url=raw_url,
            variant_id=variant_id,
            bg_removal_backend=backend,
            role=role,
        )

        return Response(
            {
                "status": "processing",
                "membership_id": str(membership_id),
                "asset_type": asset_type,
                "kit_type": kit_type,
                "variant_id": variant_id,
                "raw_url": raw_url,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["post"], url_path="process-all-variants")
    def process_all_variants(self, request: Request) -> Response:
        """Process ALL unprocessed variants for a member's asset type.

        POST /api/v1/video/jobs/process-all-variants/

        Request body:
        {
            "membership_id": "uuid",
            "asset_type": "intro" | "celebration"  (video types only)
        }

        Finds all variants in videos.{asset_type} that have a raw URL but are
        not yet processed (processing_state != 'processed'), and queues
        background processing for each.

        Returns summary of queued variants.
        """
        membership_id = request.data.get("membership_id")
        asset_type = request.data.get("asset_type")

        if not membership_id or not asset_type:
            return Response(
                {"error": "membership_id and asset_type are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only video types support multiple variants
        if asset_type not in ("intro", "celebration"):
            return Response(
                {"error": "process-all-variants only supports intro/celebration"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        try:
            membership = ProjectMembership.objects.select_related("project").get(id=membership_id)
        except ProjectMembership.DoesNotExist:
            return Response(
                {"error": f"Membership {membership_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not ProjectMembership.objects.filter(
            project=membership.project, user=request.user
        ).exists():
            raise PermissionDenied("You must be a project member.")

        # Determine role for this membership + asset type
        role = infer_role(membership, "home")

        # Find all variants that need processing using the new nested structure
        variants_to_process = []
        skipped = []

        for kit, variant_id_raw, val in iter_variants(membership, role, "videos", asset_type):
            if not val:
                continue

            key = f"{kit}_{variant_id_raw}" if variant_id_raw != "default" else kit

            # Extract raw URL and current state
            if isinstance(val, dict):
                raw_url = val.get("raw")
                state = val.get("processing_state", "raw")
                cancel_requested_at = val.get("cancel_requested_at")
            elif isinstance(val, str):
                raw_url = val
                state = "raw"
                cancel_requested_at = None
            else:
                continue

            if not raw_url:
                skipped.append({"key": key, "reason": "no_raw_url"})
                continue

            # Skip if already processed or currently processing
            if state == "processed":
                # Check for false "processed" state: if processed URL == raw URL,
                # no actual background removal happened (e.g. AI-generated video
                # saved as processed without RVM). Allow re-processing.
                processed_url = val.get("processed") if isinstance(val, dict) else None
                if processed_url and processed_url != raw_url:
                    skipped.append({"key": key, "reason": "already_processed"})
                    continue
                logger.info(
                    "process_all_variants: variant key=%s has processed==raw, "
                    "treating as unprocessed",
                    key,
                )

            # For "cancelling" state: allow reprocessing if stuck > 5 min
            if state == "cancelling":
                stuck_threshold_minutes = 5
                is_stuck = False
                if cancel_requested_at:
                    from datetime import datetime

                    try:
                        req_time = datetime.fromisoformat(
                            cancel_requested_at.replace("Z", "+00:00")
                        )
                        age_seconds = (timezone.now() - req_time).total_seconds()
                        if age_seconds > stuck_threshold_minutes * 60:
                            is_stuck = True
                            # Reset to allow reprocessing
                            state = "raw"
                    except (ValueError, TypeError):
                        pass
                if not is_stuck:
                    skipped.append({"key": key, "reason": "cancelling"})
                    continue

            if state == "processing":
                # Allow reprocessing if stuck > 15 min (worker crash / OOM)
                stuck_threshold_minutes = 15
                is_stuck = False
                processing_started_at = (
                    val.get("processing_started_at") if isinstance(val, dict) else None
                )
                if processing_started_at:
                    from datetime import datetime

                    try:
                        started_time = datetime.fromisoformat(
                            processing_started_at.replace("Z", "+00:00")
                        )
                        age_seconds = (timezone.now() - started_time).total_seconds()
                        if age_seconds > stuck_threshold_minutes * 60:
                            is_stuck = True
                            logger.info(
                                "process_all_variants: resetting stuck 'processing' variant "
                                "key=%s (started %d min ago)",
                                key,
                                int(age_seconds / 60),
                            )
                            state = "raw"  # Reset to allow reprocessing
                    except (ValueError, TypeError):
                        pass
                if not is_stuck:
                    skipped.append({"key": key, "reason": "already_processing"})
                    continue

            variants_to_process.append(
                {
                    "key": key,
                    "kit_type": kit,
                    "variant_id": variant_id_raw if variant_id_raw != "default" else None,
                    "raw_url": raw_url,
                }
            )

        if not variants_to_process:
            return Response(
                {
                    "status": "nothing_to_process",
                    "membership_id": str(membership_id),
                    "asset_type": asset_type,
                    "skipped": skipped,
                },
                status=status.HTTP_200_OK,
            )

        # Queue processing for each variant
        from src.video.tasks.asset_processing import process_member_asset

        backend = "rvm"
        queued = []

        for v in variants_to_process:
            # Mark as processing immediately
            self._update_variant_metadata(
                membership,
                asset_type,
                v["kit_type"],
                v["variant_id"],
                {
                    "raw": v["raw_url"],
                    "processed": None,
                    "processing_state": "processing",
                    "processing_started_at": timezone.now().isoformat(),
                },
            )

            # Queue Celery task
            process_member_asset.delay(
                membership_id=str(membership_id),
                asset_type=asset_type,
                kit_type=v["kit_type"],
                raw_url=v["raw_url"],
                variant_id=v["variant_id"],
                bg_removal_backend=backend,
                role=role,
            )

            queued.append(
                {
                    "key": v["key"],
                    "kit_type": v["kit_type"],
                    "variant_id": v["variant_id"],
                }
            )

            logger.info(
                "process_all_variants queued membership_id=%s asset_type=%s key=%s",
                str(membership_id),
                asset_type,
                v["key"],
            )

        return Response(
            {
                "status": "processing",
                "membership_id": str(membership_id),
                "asset_type": asset_type,
                "queued": queued,
                "skipped": skipped,
                "total_queued": len(queued),
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["post"], url_path="cancel-asset-processing")
    def cancel_asset_processing(self, request: Request) -> Response:
        """Request cancellation of an in-flight asset processing operation.

        POST /api/v1/video/jobs/cancel-asset-processing/

        Body:
        {
            "membership_id": "uuid",
            "asset_type": "fullbody" | "closeup" | "intro" | "celebration" | "photo_composite" | "walking_composite" | "action_photo",
            "kit_type": "home" | "away" | "third" | "goalkeeper" | ...,
            "variant_id": "arms_crossed" | null
        }

        This is cooperative cancellation: we mark the variant as "cancelling" in
        metadata, and the background processor periodically checks this flag and
        exits early.
        """
        membership_id = request.data.get("membership_id")
        asset_type = request.data.get("asset_type")
        kit_type = request.data.get("kit_type", "home")
        variant_id = request.data.get("variant_id")

        if not membership_id or not asset_type:
            return Response(
                {"error": "membership_id and asset_type are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_asset_types = [
            "fullbody",
            "closeup",
            "intro",
            "celebration",
            "then_vs_now",
            "photo_composite",
            "walking_composite",
            "action_photo",
        ]
        if asset_type not in valid_asset_types:
            return Response(
                {"error": f"asset_type must be one of: {valid_asset_types}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        try:
            membership = ProjectMembership.objects.select_related("project").get(id=membership_id)
        except ProjectMembership.DoesNotExist:
            return Response(
                {"error": f"Membership {membership_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not ProjectMembership.objects.filter(
            project=membership.project, user=request.user
        ).exists():
            raise PermissionDenied("You must be a project member.")

        force = request.data.get("force", False)

        existing_variant = self._get_variant_metadata(membership, asset_type, kit_type, variant_id)
        if not existing_variant:
            return Response(
                {"error": "No variant found for provided asset identifiers"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        state = (
            existing_variant.get("processing_state") if isinstance(existing_variant, dict) else None
        )

        # Detect stale cancellation: if already "cancelling" for >60s,
        # the Celery task is likely dead — force to "cancelled".
        is_stale_cancel = False
        if state == "cancelling" and isinstance(existing_variant, dict):
            cancel_at = existing_variant.get("cancel_requested_at")
            if cancel_at:
                try:
                    cancel_time = datetime.fromisoformat(cancel_at.replace("Z", "+00:00"))
                    if timezone.now() - cancel_time > timedelta(seconds=60):
                        is_stale_cancel = True
                except (ValueError, TypeError):
                    is_stale_cancel = True

        # Detect stale processing: "processing" for >15 minutes
        is_stale_processing = False
        if state == "processing" and isinstance(existing_variant, dict):
            started_at = existing_variant.get("processing_started_at")
            if started_at:
                try:
                    start_time = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                    if timezone.now() - start_time > timedelta(minutes=15):
                        is_stale_processing = True
                except (ValueError, TypeError):
                    pass

        if state not in ("processing", "cancelling"):
            if not force:
                return Response(
                    {"error": f"Variant is not processing (current state: {state})"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        raw_url = existing_variant.get("raw") if isinstance(existing_variant, dict) else None

        # Force-cancel: directly set to "cancelled" (skip cooperative waiting)
        if force or is_stale_cancel or is_stale_processing:
            self._update_variant_metadata(
                membership,
                asset_type,
                kit_type,
                variant_id,
                {
                    "raw": raw_url,
                    "processed": None,
                    "processing_state": "cancelled",
                    "cancelled_at": timezone.now().isoformat(),
                },
            )
            logger.info(
                "cancel-asset-processing: force cancelled (stale_cancel=%s, stale_processing=%s, force=%s)",
                is_stale_cancel,
                is_stale_processing,
                force,
            )
            return Response(
                {
                    "status": "cancelled",
                    "membership_id": str(membership_id),
                    "asset_type": asset_type,
                    "kit_type": kit_type,
                    "variant_id": variant_id,
                    "force": True,
                },
                status=status.HTTP_200_OK,
            )

        # Cooperative cancellation: mark as "cancelling" for the task to pick up
        self._update_variant_metadata(
            membership,
            asset_type,
            kit_type,
            variant_id,
            {
                **(existing_variant if isinstance(existing_variant, dict) else {}),
                "raw": raw_url,
                "processed": None,
                "processing_state": "cancelling",
                "cancel_requested_at": timezone.now().isoformat(),
            },
        )

        return Response(
            {
                "status": "cancelling",
                "membership_id": str(membership_id),
                "asset_type": asset_type,
                "kit_type": kit_type,
                "variant_id": variant_id,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path="counts")
    def counts(self, request: Request) -> Response:
        """Return aggregated status counts for video jobs (lightweight).

        GET /api/v1/video/jobs/counts/

        Designed for queue badge / tab count purposes.  Uses a single DB
        aggregate query instead of serialising every job.

        Response::

            {
                "video_review": 2,
                "video_active": 1,
                "video_completed": 8,
                "video_failed": 0,
                "video_total": 11
            }
        """
        from django.db.models import Count, Q

        qs = self.get_queryset()

        agg = qs.aggregate(
            review=Count(
                "id",
                filter=Q(status="completed", workflow_instance__current_state="ready_for_review"),
            ),
            active=Count("id", filter=Q(status__in=["queued", "processing"])),
            completed_no_review=Count(
                "id",
                filter=Q(status="completed")
                & ~Q(workflow_instance__current_state="ready_for_review"),
            ),
            failed=Count("id", filter=Q(status__in=["failed", "cancelled"])),
            total=Count("id"),
        )

        return Response(
            {
                "video_review": agg["review"],
                "video_active": agg["active"],
                "video_completed": agg["completed_no_review"],
                "video_failed": agg["failed"],
                "video_total": agg["total"],
            }
        )

    @action(detail=False, methods=["get"], url_path="active-processing-jobs")
    def active_processing_jobs(self, request: Request) -> Response:
        """Get all memberships with active processing jobs in a project.

        GET /api/v1/video/jobs/active-processing-jobs/?project=<uuid>

        Returns a list of memberships with active processing jobs, including
        progress information for video processing.

        Response:
        {
            "jobs": [
                {
                    "membership_id": "uuid",
                    "member_name": "John Doe",
                    "asset_type": "intro",
                    "kit_type": "home",
                    "variant_id": "thumbs_up",
                    "processing_state": "processing",
                    "progress_frames": 150,
                    "total_frames": 300,
                    "processing_started_at": "2026-02-17T12:00:00Z"
                },
                ...
            ]
        }
        """
        project_id = self._get_project_id(required=True)

        ProjectMembership = apps.get_model("projects", "ProjectMembership")

        # Check user has access to the project
        if not ProjectMembership.objects.filter(project_id=project_id, user=request.user).exists():
            raise PermissionDenied("You must be a project member.")

        # Find all memberships with processing jobs
        memberships = ProjectMembership.objects.filter(project_id=project_id).select_related("user")

        jobs = []
        for membership in memberships:
            meta = membership.metadata or {}
            tr = meta.get("teamreel_assets", {})
            roles_data = tr.get("roles", {})

            for role_name, role_data in roles_data.items():
                if not isinstance(role_data, dict):
                    continue

                # Check videos
                for asset_type, asset_data in (role_data.get("videos", {}) or {}).items():
                    if not isinstance(asset_data, dict):
                        continue
                    for kit_type, kit_data in asset_data.items():
                        if not isinstance(kit_data, dict):
                            continue
                        for variant_id, val in kit_data.items():
                            if not isinstance(val, dict):
                                continue
                            state = val.get("processing_state")
                            if state in ("processing", "cancelling"):
                                jobs.append(
                                    {
                                        "membership_id": str(membership.id),
                                        "member_name": membership.user.get_full_name()
                                        if hasattr(membership, "user") and membership.user
                                        else str(membership.id),
                                        "asset_type": asset_type,
                                        "kit_type": kit_type,
                                        "variant_id": variant_id
                                        if variant_id != "default"
                                        else None,
                                        "processing_state": state,
                                        "progress_frames": val.get("progress_frames"),
                                        "total_frames": val.get("total_frames"),
                                        "processing_started_at": val.get("processing_started_at"),
                                        "raw_url": val.get("raw"),
                                    }
                                )

                # Check images
                for asset_type, asset_data in (role_data.get("images", {}) or {}).items():
                    if not isinstance(asset_data, dict):
                        continue
                    for kit_type, kit_data in asset_data.items():
                        if not isinstance(kit_data, dict):
                            continue
                        for variant_id, val in kit_data.items():
                            if not isinstance(val, dict):
                                continue
                            state = val.get("processing_state")
                            if state in ("processing", "cancelling"):
                                jobs.append(
                                    {
                                        "membership_id": str(membership.id),
                                        "member_name": membership.user.get_full_name()
                                        if hasattr(membership, "user") and membership.user
                                        else str(membership.id),
                                        "asset_type": asset_type,
                                        "kit_type": kit_type,
                                        "variant_id": None,
                                        "processing_state": state,
                                        "progress_frames": None,
                                        "total_frames": None,
                                        "processing_started_at": val.get("processing_started_at"),
                                        "raw_url": val.get("raw"),
                                    }
                                )

        return Response({"jobs": jobs}, status=status.HTTP_200_OK)

    @staticmethod
    def _update_variant_metadata(
        membership: Any,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        variant_value: dict,
        *,
        role: str | None = None,
    ) -> None:
        """Update membership.metadata.teamreel_assets with a variant value."""
        if role is None:
            role = infer_role(membership, kit_type)

        mt = media_type_for_asset(asset_type)
        variant = variant_id if variant_id and variant_id != kit_type else "default"

        set_variant_value(membership, role, mt, asset_type, kit_type, variant, variant_value)

        best_url = (
            variant_value.get("preview_url")
            or variant_value.get("processed")
            or variant_value.get("raw")
        )
        if best_url:
            update_media_aliases(membership, asset_type, best_url)

        membership.save(update_fields=["metadata", "updated_at"])

    @staticmethod
    def _get_variant_metadata(
        membership: Any,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        *,
        role: str | None = None,
    ) -> dict | None:
        """Read the variant value from membership.metadata.teamreel_assets."""
        if role is None:
            role = infer_role(membership, kit_type)

        mt = media_type_for_asset(asset_type)
        variant = variant_id if variant_id and variant_id != kit_type else "default"

        return get_variant_value(membership, role, mt, asset_type, kit_type, variant)

