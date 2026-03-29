"""Content creation actions for VideoJobViewSet."""

from __future__ import annotations

import logging

from django.apps import apps
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from src.video.models import VideoJob
from src.video.models.job import JobStatus, JobType
from src.video.serializers.job import VideoJobDetailSerializer

logger = logging.getLogger(__name__)


class ContentCreationMixin:
    """Mixin providing content creation actions for VideoJobViewSet."""

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
        # This avoids the UI hanging on "Aanvraag verstuurd" while
        # we generate scenes / download assets.
        if not sync_mode:
            if frontend_segments and not allow_frontend_segments:
                logger.warning(
                    "Frontend segments were provided but are ignored"
                    " (allow_frontend_segments=false):"
                    " job will use backend lineup builder"
                )

            try:
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
            except Exception as e:  # noqa: BLE001
                import traceback

                logger.error(
                    "Failed to create lineup video job (fast path): %s\n%s",
                    e,
                    traceback.format_exc(),
                )
                return Response(
                    {
                        "error": "Failed to create lineup video job",
                        "detail": str(e),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
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
                    "Frontend segments were provided but are ignored"
                    " (allow_frontend_segments=false):"
                    " job will use backend lineup builder"
                )

        except Exception as e:  # noqa: BLE001
            import traceback

            logger.error("Failed to build lineup config: %s\n%s", e, traceback.format_exc())
            # Intentionally fail fast (no fallback) so template/lineup issues are visible.
            return Response(
                {
                    "error": "Failed to build lineup config",
                    "detail": str(e),
                    "hint": (
                        "No fallback to frontend segments is enabled."
                        " Fix Participation lineup + member kit assets"
                        " + stadium_background brand asset."
                    ),
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
                    "error": (
                        "video_type must be 'sidebyside', 'transformation',"
                        " 'photo_composite', 'duo_portret',"
                        " or 'walking_composite'"
                    )
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
        background_url = request.data.get("background_url")  # Optional: background image URL
        photo_layout = request.data.get("photo_layout", "single")  # single / triple / hero_duo
        photo_slots = request.data.get(
            "photo_slots"
        )  # Optional: per-slot [{member_id, style_variant}]
        # Summary fields (post-match)
        score_home = request.data.get("score_home")  # Optional: int
        score_away = request.data.get("score_away")  # Optional: int
        goal_scorers = request.data.get("goal_scorers")  # Optional: list[str]

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
                background_url=background_url,
                photo_layout=photo_layout,
                photo_slots=photo_slots,
                score_home=int(score_home) if score_home is not None else None,
                score_away=int(score_away) if score_away is not None else None,
                goal_scorers=goal_scorers,
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

