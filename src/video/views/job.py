"""ViewSet for video jobs."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from django.apps import apps
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from src.video.models import VideoJob
from src.video.models.job import JobStatus, JobType
from src.video.pagination import VideoJobPagination
from src.video.permissions import IsProjectMember
from src.video.serializers.job import (
    VideoJobCreateSerializer,
    VideoJobDetailSerializer,
    VideoJobListSerializer,
)

logger = logging.getLogger(__name__)


class VideoJobViewSet(viewsets.ModelViewSet):
    """ViewSet for video jobs.

    list: GET /api/v1/video/jobs/
    retrieve: GET /api/v1/video/jobs/{id}/
    create: POST /api/v1/video/jobs/
    destroy: DELETE /api/v1/video/jobs/{id}/
    retry: POST /api/v1/video/jobs/{id}/retry/
    """

    queryset = VideoJob.objects.all()
    pagination_class = VideoJobPagination
    permission_classes = [IsAuthenticated, IsProjectMember]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status", "job_type"]
    ordering_fields = ["created_at", "status", "job_type"]
    ordering = ["-created_at"]

    def get_queryset(self) -> QuerySet[VideoJob]:
        qs = (
            super()
            .get_queryset()
            .select_related(
                "project",
                "created_by",
                "input_file",
                "output_file",
                "preset",
                "platform_export",
                "workflow_instance",
                "workflow_instance__workflow",
            )
            .prefetch_related("overlays")
        )

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        membership_qs = ProjectMembership.objects.filter(user=self.request.user)

        project_id = self._get_project_id(required=self.action in ["create"])
        if project_id:
            if not membership_qs.filter(project_id=project_id).exists():
                raise PermissionDenied("You must be a project member to access this project.")
            qs = qs.filter(project_id=project_id)
        else:
            qs = qs.filter(project_id__in=membership_qs.values_list("project_id", flat=True))

        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return VideoJobCreateSerializer
        if self.action == "retrieve":
            return VideoJobDetailSerializer
        return VideoJobListSerializer

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Retrieve job details.

        Self-healing: if a lineup job remains QUEUED for too long without a start time,
        attempt to kick it into processing (idempotent) and start the background thread.
        """
        job = self.get_object()

        if (
            job.job_type == JobType.LINEUP
            and job.status == JobStatus.QUEUED
            and job.started_at is None
            and job.created_at <= timezone.now() - timedelta(seconds=10)
        ):
            from src.video.services.video_service import VideoService

            try:
                if VideoService().kick_lineup_job(str(job.id)):
                    job.refresh_from_db()
            except Exception:
                logger.exception(
                    "Auto-kick failed for stuck lineup job",
                    extra={"job_id": str(job.id)},
                )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_200_OK)

    def _get_project_id(self, required: bool = False) -> str | None:
        header_id = self.request.headers.get("X-Project-ID")
        query_id = self.request.query_params.get("project")
        project_id = header_id or query_id
        if project_id:
            self.request.project_id = project_id
            return project_id
        if required:
            raise ValidationError({"project": "Project ID is required"})
        return None

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        project_id = self._get_project_id(required=True)
        Project = apps.get_model("projects", "Project")
        project = get_object_or_404(Project, id=project_id)

        serializer = self.get_serializer(
            data=request.data,
            context={
                "project": project,
                "created_by": request.user,
            },
        )
        serializer.is_valid(raise_exception=True)
        job = serializer.save()

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        job = self.get_object()
        # Allow cancelling queued jobs, and allow cancelling *processing* lineup jobs.
        if job.status == JobStatus.QUEUED:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        if job.status == JobStatus.PROCESSING and job.job_type == JobType.LINEUP:
            job.status = JobStatus.CANCELLED
            job.completed_at = timezone.now()
            job.save(update_fields=["status", "completed_at", "updated_at"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response(
            {"error": "Job cannot be cancelled unless queued (or processing for lineup)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def retry(self, request: Request, pk: str | None = None) -> Response:
        job = self.get_object()
        if job.status != JobStatus.FAILED:
            return Response(
                {"error": "Job can only be retried from failed status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job.status = JobStatus.QUEUED
        job.error_message = ""
        job.error_code = ""
        job.progress_percent = 0
        job.started_at = None
        job.completed_at = None
        job.retry_count += 1
        job.save(
            update_fields=[
                "status",
                "error_message",
                "error_code",
                "progress_percent",
                "started_at",
                "completed_at",
                "retry_count",
                "updated_at",
            ]
        )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_200_OK)

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

        # Resolve the raw URL from metadata
        teamreel_assets = (membership.metadata or {}).get("teamreel_assets", {})

        raw_url = None
        if asset_type in ("fullbody", "closeup", "action_photo"):
            images = teamreel_assets.get("images", {})
            variant_val = (images.get(asset_type, {}) or {}).get(kit_type)
            # Handle both old string and new object format
            if isinstance(variant_val, dict):
                raw_url = variant_val.get("raw") or variant_val.get("processed")
            elif isinstance(variant_val, str):
                raw_url = variant_val
            # Fallback: if home, check media.kit / media.closeup
            if not raw_url and kit_type == "home":
                media = teamreel_assets.get("media", {})
                slot = (
                    "kit"
                    if asset_type == "fullbody"
                    else ("closeup" if asset_type == "closeup" else "action_photo")
                )
                raw_url = (media.get(slot, {}) or {}).get("url")
        else:
            # intro / celebration / then_vs_now → videos.{asset_type}.{kit_type}_{variant_id}
            videos = teamreel_assets.get("videos", {})
            asset_variants = videos.get(asset_type, {}) or {}
            composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
            variant_val = asset_variants.get(composite_key)

            # Fallback 1: bare variant_id key (old metadata format stored
            # "arms_crossed" instead of "home_arms_crossed")
            if not variant_val and variant_id:
                variant_val = asset_variants.get(variant_id)
                if variant_val:
                    logger.info(
                        "process-asset: found old bare key '%s' for %s (expected '%s')",
                        variant_id,
                        asset_type,
                        composite_key,
                    )

            # Fallback 1b: bare kit_type key without variant suffix.
            # AI propagation stores then_vs_now transformation under
            # "transformation" but process-asset looks for
            # "transformation_hands_on_head".  Find the bare key.
            if not variant_val and variant_id:
                variant_val = asset_variants.get(kit_type)
                if variant_val:
                    logger.info(
                        "process-asset: found bare kit_type key '%s' for %s (expected '%s')",
                        kit_type,
                        asset_type,
                        composite_key,
                    )

            # Fallback 2: no variant specified — find first key starting with kit_type
            if not variant_val and not variant_id:
                for key, val in asset_variants.items():
                    if key.startswith(kit_type):
                        variant_val = val
                        variant_id = key[len(kit_type) + 1 :] if "_" in key else None
                        composite_key = key
                        break

            # Fallback 3: still nothing — try any bare style key (old format
            # stored "arms_crossed" without kit prefix)
            if not variant_val and not variant_id:
                for key, val in asset_variants.items():
                    if key and not key.startswith(("home", "away", "third", "goalkeeper")):
                        variant_val = val
                        variant_id = key  # Store the bare key as variant_id
                        composite_key = f"{kit_type}_{key}"
                        logger.info(
                            "process-asset: found bare style key '%s' for %s, using as %s",
                            key,
                            asset_type,
                            composite_key,
                        )
                        break

            if isinstance(variant_val, dict):
                raw_url = variant_val.get("raw") or variant_val.get("processed")
            elif isinstance(variant_val, str):
                raw_url = variant_val

            if not raw_url:
                logger.warning(
                    "process-asset: no raw URL for %s.%s — available keys: %s",
                    asset_type,
                    composite_key,
                    list(asset_variants.keys()),
                )

        if not raw_url:
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

        teamreel_assets = (membership.metadata or {}).get("teamreel_assets", {})
        videos = teamreel_assets.get("videos", {})
        asset_variants = videos.get(asset_type, {}) or {}

        # Find all variants that need processing
        # Key format: {kit_type}_{style} e.g. "home_arms_crossed", "goalkeeper_thumbs_up"
        variants_to_process = []
        skipped = []

        for key, val in asset_variants.items():
            if not val:
                continue

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

            # Parse kit_type and variant_id from composite key
            # Format: {kit_type}_{variant_id} or bare {variant_id}
            if "_" in key:
                parts = key.split("_", 1)
                kit_type = parts[0]
                variant_id = parts[1]
            else:
                # Bare key like "arms_crossed" - assume home kit
                kit_type = "home"
                variant_id = key

            variants_to_process.append(
                {
                    "key": key,
                    "kit_type": kit_type,
                    "variant_id": variant_id,
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

            # Check videos
            for asset_type, variants in (tr.get("videos", {}) or {}).items():
                if not isinstance(variants, dict):
                    continue
                for key, val in variants.items():
                    if not isinstance(val, dict):
                        continue
                    state = val.get("processing_state")
                    if state in ("processing", "cancelling"):
                        # Parse composite key into kit_type and variant_id
                        parts = key.split("_", 1)
                        kit_type = parts[0]
                        variant_id = parts[1] if len(parts) > 1 else None

                        jobs.append(
                            {
                                "membership_id": str(membership.id),
                                "member_name": membership.user.get_full_name()
                                if hasattr(membership, "user") and membership.user
                                else str(membership.id),
                                "asset_type": asset_type,
                                "kit_type": kit_type,
                                "variant_id": variant_id,
                                "processing_state": state,
                                "progress_frames": val.get("progress_frames"),
                                "total_frames": val.get("total_frames"),
                                "processing_started_at": val.get("processing_started_at"),
                                "raw_url": val.get("raw"),
                            }
                        )

            # Check images
            for asset_type, variants in (tr.get("images", {}) or {}).items():
                if not isinstance(variants, dict):
                    continue
                for kit_type, val in variants.items():
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
    ) -> None:
        """Update membership.metadata.teamreel_assets with a variant value."""
        meta = membership.metadata or {}
        tr = meta.get("teamreel_assets", {})

        if asset_type in ("fullbody", "closeup", "action_photo"):
            images = tr.setdefault("images", {})
            cat = images.setdefault(asset_type, {})
            cat[kit_type] = variant_value
        else:
            videos = tr.setdefault("videos", {})
            cat = videos.setdefault(asset_type, {})
            composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
            cat[composite_key] = variant_value
            # Clean up old bare variant key if it exists (migrate on write)
            if variant_id and variant_id in cat and variant_id != composite_key:
                cat.pop(variant_id, None)

        # Keep the flat media.{slot}.url in sync with the best available URL.
        # The frontend reads media.{slot}.url as a quick lookup; prefer the
        # processed (WebM/transparent) URL when available, otherwise raw.
        # Prefer a browser-playable preview URL (e.g. MP4) for the frontend.
        # Falls back to the processed URL, then raw.
        best_url = (
            variant_value.get("preview_url")
            or variant_value.get("processed")
            or variant_value.get("raw")
        )
        if best_url:
            media = tr.setdefault("media", {})
            media_slot = media.get(asset_type, {})
            if isinstance(media_slot, dict):
                media_slot["url"] = best_url
            else:
                media_slot = {"url": best_url, "caption": ""}
            media[asset_type] = media_slot

        meta["teamreel_assets"] = tr
        membership.metadata = meta
        membership.save(update_fields=["metadata", "updated_at"])

    @staticmethod
    def _get_variant_metadata(
        membership: Any,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
    ) -> dict | str | None:
        """Read the variant value from membership.metadata.teamreel_assets."""
        meta = membership.metadata or {}
        tr = meta.get("teamreel_assets") or {}

        if asset_type in ("fullbody", "closeup", "action_photo"):
            images = tr.get("images", {}) or {}
            return ((images.get(asset_type) or {}) or {}).get(kit_type)

        videos = tr.get("videos", {}) or {}
        cat = videos.get(asset_type, {}) or {}
        composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
        if composite_key in cat:
            return cat.get(composite_key)
        if variant_id and variant_id in cat:
            # Support old metadata keying (bare variant_id)
            return cat.get(variant_id)
        return None

    @action(detail=False, methods=["post"], url_path="lineup-from-template")
    def lineup_from_template(self, request: Request) -> Response:
        """Create a lineup video job from ContentTemplate + Activity.

        POST /api/v1/video/jobs/lineup-from-template/

        Request body:
        {
            "activity_id": "uuid",  # Required: match/activity ID
            "template_id": "uuid",  # Optional: ContentTemplate ID
            "output_resolution": "vertical_1080p",  # Optional
            "segments": [...]  # Optional: pre-built segments from frontend
        }

        If `segments` is provided, uses those directly.
        Otherwise, builds segments from Activity participations + brand assets.
        """
        from src.video.services.lineup_builder import build_lineup_video_config
        from src.video.services.video_service import VideoService

        activity_id = request.data.get("activity_id")
        template_id = request.data.get("template_id")
        output_resolution = request.data.get("output_resolution", "vertical_1080p")
        frontend_segments = request.data.get("segments")
        selected_member_ids = request.data.get("selected_member_ids")
        formation = request.data.get("formation", "4-3-3")
        closeup_style = request.data.get("closeup_style", "popout")
        animation_style = request.data.get("animation_style", "slide_up")
        intro_style = request.data.get("intro_style", "per_line")
        background_url = request.data.get("background_url")
        allow_frontend_segments = request.query_params.get(
            "allow_frontend_segments"
        ) == "true" or bool(request.data.get("allow_frontend_segments"))

        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get activity and its project
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project", "period").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Activity always has a project; Period.project can be NULL (org-wide periods)
        project = activity.project

        # Check project membership
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You must be a project member to create lineup videos.")

        # Check for sync processing request (bypasses background processing)
        sync_mode = request.data.get("sync", False) or request.query_params.get("sync") == "true"

        # Fast path (default): create a job immediately and do heavy work in background.
        # This avoids the UI hanging on "Aanvraag verstuurd" while we generate scenes / download assets.
        if not sync_mode:
            if frontend_segments and not allow_frontend_segments:
                logger.warning(
                    "Frontend segments were provided but are ignored (allow_frontend_segments=false): job will use backend lineup builder"
                )

            service = VideoService()
            job = service.create_job(
                project=project,
                user=request.user,
                job_type=JobType.LINEUP,
                config={
                    # Defer segment building to the background thread.
                    "activity_id": activity_id,
                    "template_id": template_id,
                    "output_resolution": output_resolution,
                    "selected_member_ids": selected_member_ids,
                    "formation": formation,
                    "closeup_style": closeup_style,
                    "animation_style": animation_style,
                    "intro_style": intro_style,
                    "background_url": background_url,
                    "allow_frontend_segments": allow_frontend_segments,
                    # Preserve for debugging; backend is strict by default.
                    "frontend_segments": frontend_segments,
                },
            )

            output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
            data = dict(output.data)
            data["sync_mode"] = False
            return Response(data, status=status.HTTP_201_CREATED)

        # Slow path: sync mode is for debugging only.
        # Build segments config from template + activity data
        try:
            config = build_lineup_video_config(
                activity_id=activity_id,
                template_id=template_id,
                output_resolution=output_resolution,
                selected_member_ids=selected_member_ids,
                formation=formation,
            )
            if frontend_segments and not allow_frontend_segments:
                logger.warning(
                    "Frontend segments were provided but are ignored (allow_frontend_segments=false): job will use backend lineup builder"
                )

        except Exception as e:  # noqa: BLE001
            import traceback

            logger.error("Failed to build lineup config: %s\n%s", e, traceback.format_exc())
            # Intentionally fail fast (no fallback) so template/lineup issues are visible.
            return Response(
                {
                    "error": "Failed to build lineup config",
                    "detail": str(e),
                    "hint": "No fallback to frontend segments is enabled. Fix Participation lineup + member kit assets + stadium_background brand asset.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create the video job
        try:
            job = VideoJob.objects.create(
                project=project,
                created_by=request.user,
                job_type=JobType.LINEUP,
                status=JobStatus.QUEUED,
                config=config,
            )
        except Exception as e:  # noqa: BLE001
            import traceback

            logger.error("Failed to create VideoJob: %s\n%s", e, traceback.format_exc())
            return Response(
                {"error": f"Failed to create video job: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Process synchronously (debug/testing)
        logger.info("Processing job synchronously: %s", job.id)
        try:
            from src.video.services.processors.lineup import LineupProcessor

            processor = LineupProcessor(job)
            processor.execute()

            logger.info("Sync processing completed for job %s", job.id)
            job.refresh_from_db()
        except Exception as e:
            import traceback

            logger.error(
                "Sync processing failed for job %s: %s\n%s", job.id, e, traceback.format_exc()
            )
            job.refresh_from_db()
            # Return error but keep the job for debugging
            return Response(
                {
                    "id": str(job.id),
                    "status": job.status,
                    "error": str(e),
                    "error_message": job.error_message,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
            data = dict(output.data)
            data["sync_mode"] = bool(sync_mode)
            return Response(data, status=status.HTTP_201_CREATED)
        except Exception as e:  # noqa: BLE001
            import traceback

            logger.error("Failed to serialize VideoJob: %s\n%s", e, traceback.format_exc())
            # Return minimal success response
            return Response(
                {
                    "id": str(job.id),
                    "status": job.status if hasattr(job, "status") else "queued",
                    "sync_mode": bool(sync_mode),
                    "message": "Job created but serialization failed",
                },
                status=status.HTTP_201_CREATED,
            )

    @action(detail=False, methods=["post"], url_path="then-vs-now-compilation")
    def then_vs_now_compilation(self, request: Request) -> Response:
        """Create a Then vs Now compilation video job.

        POST /api/v1/video/jobs/then-vs-now-compilation/

        Compiles individual member then_vs_now clips into a single video
        with a header bar (club logos + "THEN VS NOW" title), location
        background, and per-member name labels.

        Request body:
            project_id  (str, required)  – Team project UUID.
            video_type  (str, required)  – "sidebyside", "transformation", or "photo_composite".
            period_id   (str, optional)  – Season/period UUID for header text.
            selected_member_ids (list, optional) – Restrict to these members.
            background_url (str, optional) – Override background (app-level location).
            member_variant_keys (dict, optional) – Per-member variant key override.
                e.g. {"<membership_id>": "transformation_snap"}
        """
        project_id = request.data.get("project_id")
        video_type = request.data.get("video_type")
        period_id = request.data.get("period_id")
        selected_member_ids = request.data.get("selected_member_ids", [])
        background_url = request.data.get("background_url")
        member_variant_keys = request.data.get("member_variant_keys", {})

        if not project_id:
            return Response(
                {"error": "project_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if video_type not in (
            "sidebyside",
            "transformation",
            "photo_composite",
            "duo_portret",
            "walking_composite",
        ):
            return Response(
                {
                    "error": "video_type must be 'sidebyside', 'transformation', 'photo_composite', 'duo_portret', or 'walking_composite'"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve and authorise project
        Project = apps.get_model("projects", "Project")  # noqa: N806
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Permission check: user must be a member of the project
        ProjectMembership = apps.get_model("projects", "ProjectMembership")  # noqa: N806
        is_member = ProjectMembership.objects.filter(project=project, user=request.user).exists()
        if not is_member and not request.user.is_staff:
            raise PermissionDenied("You are not a member of this project.")

        from src.video.services.video_service import VideoService

        service = VideoService()
        job = service.create_job(
            project=project,
            user=request.user,
            job_type=JobType.THEN_VS_NOW,
            config={
                "project_id": str(project.id),
                "video_type": video_type,
                "period_id": str(period_id) if period_id else None,
                "selected_member_ids": (
                    [str(mid) for mid in selected_member_ids] if selected_member_ids else []
                ),
                **({"background_url": background_url} if background_url else {}),
                **({"member_variant_keys": member_variant_keys} if member_variant_keys else {}),
            },
        )

        logger.info(
            "Then vs Now compilation job created: %s (type=%s, project=%s)",
            job.id,
            video_type,
            project.name,
        )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        data = dict(output.data)
        data["sync_mode"] = False
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="goal-celebration-from-template")
    def goal_celebration_from_template(self, request: Request) -> Response:
        """Create a goal celebration video job.

        POST /api/v1/video/jobs/goal-celebration-from-template/

        Request body:
        {
            "activity_id": "uuid",           # Required: match/activity ID
            "scorer_member_id": "uuid",      # Required: membership ID of goal scorer
            "score_home": 2,                 # Required: current home score
            "score_away": 1,                 # Required: current away score
            "background_url": "https://...", # Optional: custom background
            "output_resolution": "vertical_1080p"  # Optional
        }
        """
        from src.video.services.video_service import VideoService

        activity_id = request.data.get("activity_id")
        scorer_member_id = request.data.get("scorer_member_id")
        score_home = request.data.get("score_home")
        score_away = request.data.get("score_away")
        background_url = request.data.get("background_url")
        output_resolution = request.data.get("output_resolution", "vertical_1080p")

        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not scorer_member_id:
            return Response(
                {"error": "scorer_member_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if score_home is None or score_away is None:
            return Response(
                {"error": "score_home and score_away are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get activity and verify access
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = activity.project

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied(
                "You must be a project member to create goal celebration videos."
            )

        # Verify scorer membership exists
        scorer = ProjectMembership.objects.filter(id=scorer_member_id).first()
        if not scorer:
            return Response(
                {"error": f"Scorer membership {scorer_member_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create the job (async processing in background thread)
        service = VideoService()
        job = service.create_job(
            project=project,
            user=request.user,
            job_type=JobType.GOAL_CELEBRATION,
            config={
                "activity_id": str(activity_id),
                "scorer_member_id": str(scorer_member_id),
                "score_home": int(score_home),
                "score_away": int(score_away),
                "background_url": background_url,
                "output_resolution": output_resolution,
            },
        )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        data = dict(output.data)
        data["sync_mode"] = False
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="lineup-flyer")
    def lineup_flyer(self, request: Request) -> Response:
        """Generate a static lineup flyer (PNG) from Activity data.

        POST /api/v1/video/jobs/lineup-flyer/

        Request body:
        {
            "activity_id": "uuid",           # Required: match/activity ID
            "template_id": "uuid",           # Optional: ContentTemplate ID
            "formation": "4-3-3",            # Optional: formation (default 4-3-3)
            "selected_member_ids": {...},     # Optional: member selection
            "brand_primary": "#D2122E",      # Optional: brand color override
            "brand_secondary": "#FFFFFF"     # Optional: brand color override
        }

        Returns:
        {
            "flyer_url": "https://s3.../flyer.png",
            "formation": "4-3-3",
            "activity_id": "uuid"
        }
        """
        from src.video.services.lineup_flyer_generator import build_lineup_flyer

        activity_id = request.data.get("activity_id")
        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        template_id = request.data.get("template_id")
        formation = request.data.get("formation", "4-3-3")
        selected_member_ids = request.data.get("selected_member_ids")
        brand_primary = request.data.get("brand_primary")
        brand_secondary = request.data.get("brand_secondary")
        closeup_style = request.data.get("closeup_style", "popout")
        background_url = request.data.get("background_url")

        # Validate activity exists and user has access
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = activity.project
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You must be a project member to generate lineup flyers.")

        try:
            flyer_url = build_lineup_flyer(
                activity_id=str(activity_id),
                template_id=str(template_id) if template_id else None,
                formation=formation,
                selected_member_ids=selected_member_ids,
                brand_primary_hex=brand_primary,
                brand_secondary_hex=brand_secondary,
                closeup_style=closeup_style,
                background_url=background_url,
            )

            return Response(
                {
                    "flyer_url": flyer_url,
                    "formation": formation,
                    "activity_id": str(activity_id),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import traceback

            logger.error(
                "Failed to generate lineup flyer: %s\n%s",
                e,
                traceback.format_exc(),
            )
            return Response(
                {"error": f"Failed to generate lineup flyer: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="match-flyer")
    def match_flyer(self, request: Request) -> Response:
        """Generate a single match flyer image (PNG) in a chosen design variant.

        POST /api/v1/video/jobs/match-flyer/

        Request body:
        {
            "activity_id": "uuid",           # Required
            "variant": "classic"             # Optional (classic / bold / stadium, default: classic)
        }

        Returns:
        {
            "flyer_url": "https://...",
            "variant": "classic",
            "activity_id": "uuid"
        }
        """
        from src.video.services.match_flyer_generator import build_match_flyer

        activity_id = request.data.get("activity_id")
        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        variant = request.data.get("variant", "classic")
        member_id = request.data.get("member_id")  # Optional: specific member for action photo
        style_variant = request.data.get("style_variant")  # Optional: action photo style

        # Validate activity exists and user has access
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = activity.project
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You must be a project member to generate match flyers.")

        try:
            flyer_url = build_match_flyer(
                activity_id=str(activity_id),
                variant=variant,
                member_id=member_id,
                style_variant=style_variant,
            )

            return Response(
                {
                    "flyer_url": flyer_url,
                    "variant": variant,
                    "activity_id": str(activity_id),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import traceback

            logger.error(
                "Failed to generate match flyer: %s\n%s",
                e,
                traceback.format_exc(),
            )
            return Response(
                {"error": f"Failed to generate match flyer: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="match-intro-from-template")
    def match_intro_from_template(self, request: Request) -> Response:
        """Create a match intro video job (6-second announcement video).

        POST /api/v1/video/jobs/match-intro-from-template/

        Request body:
        {
            "activity_id": "uuid",                   # Required: match/activity ID
            "output_resolution": "vertical_1080p"    # Optional
        }
        """
        from src.video.services.video_service import VideoService

        activity_id = request.data.get("activity_id")
        output_resolution = request.data.get("output_resolution", "vertical_1080p")

        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get activity and verify access
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = activity.project

        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You must be a project member to create match intro videos.")

        # Create the job (async processing in background thread)
        service = VideoService()
        job = service.create_job(
            project=project,
            user=request.user,
            job_type=JobType.MATCH_INTRO,
            config={
                "activity_id": str(activity_id),
                "output_resolution": output_resolution,
            },
        )

        output = VideoJobDetailSerializer(job, context=self.get_serializer_context())
        data = dict(output.data)
        data["sync_mode"] = False
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="team-poster")
    def team_poster(self, request: Request) -> Response:
        """Generate a team poster (AI elftalfoto) from lineup data.

        POST /api/v1/video/jobs/team-poster/

        Request body:
        {
            "activity_id": "uuid",           # Required: match/activity ID
            "formation": "4-3-3",            # Optional: formation (default 4-3-3)
            "selected_member_ids": {...}      # Optional: member selection
        }

        Returns:
        {
            "poster_url": "https://...",
            "formation": "4-3-3",
            "activity_id": "uuid"
        }
        """
        from src.video.services.team_poster_generator import build_team_poster

        activity_id = request.data.get("activity_id")
        if not activity_id:
            return Response(
                {"error": "activity_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        formation = request.data.get("formation", "4-3-3")
        selected_member_ids = request.data.get("selected_member_ids")
        template_id = request.data.get("template_id")

        # Validate activity exists and user has access
        Activity = apps.get_model("activities", "Activity")
        try:
            activity = Activity.objects.select_related("project").get(id=activity_id)
        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        project = activity.project
        ProjectMembership = apps.get_model("projects", "ProjectMembership")
        if not ProjectMembership.objects.filter(project=project, user=request.user).exists():
            raise PermissionDenied("You must be a project member to generate team posters.")

        try:
            poster_url = build_team_poster(
                activity_id=str(activity_id),
                template_id=str(template_id) if template_id else None,
                formation=formation,
                selected_member_ids=selected_member_ids,
            )

            return Response(
                {
                    "poster_url": poster_url,
                    "formation": formation,
                    "activity_id": str(activity_id),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import traceback

            logger.error(
                "Failed to generate team poster: %s\n%s",
                e,
                traceback.format_exc(),
            )
            return Response(
                {"error": f"Failed to generate team poster: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
