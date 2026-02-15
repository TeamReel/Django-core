"""ViewSet for video jobs."""

from __future__ import annotations

import logging
from datetime import timedelta
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
            "asset_type": "fullbody" | "closeup" | "intro" | "celebration",
            "kit_type": "home" | "away" | "third" | "goalkeeper" | ...,
            "variant_id": "arms_crossed" | null    // for intro/celebration style
        }

        Triggers background removal + resize/crop to lineup-ready specs.
        Updates membership.metadata.teamreel_assets in-place with { raw, processed, processing_state }.
        """
        import threading

        membership_id = request.data.get("membership_id")
        asset_type = request.data.get("asset_type")
        kit_type = request.data.get("kit_type", "home")
        variant_id = request.data.get("variant_id")

        if not membership_id or not asset_type:
            return Response(
                {"error": "membership_id and asset_type are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_asset_types = ["fullbody", "closeup", "intro", "celebration"]
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
        if asset_type in ("fullbody", "closeup"):
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
                slot = "kit" if asset_type == "fullbody" else "closeup"
                raw_url = (media.get(slot, {}) or {}).get("url")
        else:
            # intro / celebration → videos.{asset_type}.{kit_type}_{variant_id}
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

            # Fallback 2: no variant specified — find first key starting with kit_type
            if not variant_val and not variant_id:
                for key, val in asset_variants.items():
                    if key.startswith(kit_type):
                        variant_val = val
                        variant_id = key[len(kit_type) + 1 :] if "_" in key else None
                        composite_key = key
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
                {
                    "error": f"No raw asset found for {asset_type}.{composite_key if asset_type in ('intro', 'celebration') else kit_type}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark as "processing" immediately in metadata
        self._update_variant_metadata(
            membership,
            asset_type,
            kit_type,
            variant_id,
            {"raw": raw_url, "processed": None, "processing_state": "processing"},
        )

        # Run processing in background thread (like lineup jobs)
        def _process_in_background() -> None:
            try:
                from src.video.services.asset_processor import AssetProcessor

                processor = AssetProcessor()
                result = processor.process_asset(
                    raw_url=raw_url,
                    asset_type=asset_type,
                    membership_id=str(membership_id),
                    kit_type=kit_type,
                    variant_id=variant_id,
                    organisation_id=str(membership.project.organisation_id)
                    if hasattr(membership.project, "organisation_id")
                    else None,
                )

                # Refresh membership and update metadata
                membership.refresh_from_db()
                self._update_variant_metadata(membership, asset_type, kit_type, variant_id, result)
                logger.info(
                    "Asset processing complete: %s.%s → %s",
                    asset_type,
                    kit_type,
                    result.get("processing_state"),
                )
            except Exception as exc:
                logger.exception("Background asset processing failed")
                try:
                    membership.refresh_from_db()
                    self._update_variant_metadata(
                        membership,
                        asset_type,
                        kit_type,
                        variant_id,
                        {
                            "raw": raw_url,
                            "processed": None,
                            "processing_state": "failed",
                            "error": str(exc)[:500],
                        },
                    )
                except Exception:
                    logger.exception("Failed to update metadata after processing error")

        thread = threading.Thread(target=_process_in_background, daemon=True)
        thread.start()

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

        if asset_type in ("fullbody", "closeup"):
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
        best_url = variant_value.get("processed") or variant_value.get("raw")
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
