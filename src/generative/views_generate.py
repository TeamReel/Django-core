"""Asset generation views — create images and videos via AI models."""
from __future__ import annotations

import base64
import logging
import threading
import uuid as uuid_mod

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from ._asset_helpers import (
    MODEL_REGISTRY,
    AssetGenerateInputSerializer,
    _cleanup_old_tasks,
    _create_generation_job,
    _run_video_generation,
    _set_task,
    _upload_image_bytes_to_storage,
)

logger = logging.getLogger("generative.views.asset")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_asset_view(request: Request) -> Response:
    """Generate asset variants synchronously.

    This is a demo-friendly endpoint that runs generation synchronously
    and returns base64-encoded image variants.

    For production use with credits/tracking, use the full
    GenerationRequest flow at /api/v1/generative/requests/.

    Request body:
        {
            "template_id": "tenue_generate",
            "params": {"sleeves": "short", "neck": "round", "kit_type": "home"},
            "variant_count": 2,
            "input_images": {
                "logo": "<base64>",
                "sponsor": "<base64>",
                "reference_photo": "<base64>"
            }
        }

    Response:
        {
            "template_id": "tenue_generate",
            "variant_count": 2,
            "variants": [
                {"variant_index": 0, "image_base64": "...",
                 "mime_type": "image/png", "filename": "..."},
                {"variant_index": 1, "image_base64": "...",
                 "mime_type": "image/png", "filename": "..."},
            ]
        }
    """
    serializer = AssetGenerateInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    template_id = serializer.validated_data["template_id"]
    params = serializer.validated_data["params"]
    variant_count = serializer.validated_data["variant_count"]
    input_images_b64 = serializer.validated_data.get("input_images", {})
    input_image_urls = serializer.validated_data.get("input_image_urls", {})

    # === Context for storage and record creation ===
    project_id = serializer.validated_data.get("project_id")
    organisation_id = serializer.validated_data.get("organisation_id")
    membership_id = serializer.validated_data.get("membership_id")
    activity_id = serializer.validated_data.get("activity_id")
    asset_type = serializer.validated_data.get("asset_type")
    save_to_brand = serializer.validated_data.get("save_to_brand", True)
    save_to_media_library = serializer.validated_data.get("save_to_media_library", True)
    provider = serializer.validated_data.get("provider") or None
    model = serializer.validated_data.get("model") or None

    # Resolve project slug → canonical project ID early so all downstream
    # references (GenerationJob record, storage_context, Celery kwargs) use
    # a consistent identifier that matches existing jobs.
    if project_id and not str(project_id).isdigit():
        try:
            from projects.models import Project

            _proj = Project.objects.only("id").get(slug=project_id)
            # Use zero-padded UUID string like "00000000-0000-0000-0000-000000000182"
            project_id = f"00000000-0000-0000-0000-{_proj.id:012d}"
            logger.debug(
                "Resolved project slug %r → %s",
                serializer.validated_data.get("project_id"),
                project_id,
            )
        except Exception:  # noqa: BLE001
            logger.debug("Could not resolve project slug %r, using as-is", project_id)

    # Decode base64 images
    input_images: dict[str, bytes] = {}
    for key, b64_str in input_images_b64.items():
        try:
            # Handle data URI prefix (data:image/png;base64,...)
            if "," in b64_str:
                b64_str = b64_str.split(",", 1)[1]
            input_images[key] = base64.b64decode(b64_str)
        except (ValueError, Exception) as e:  # noqa: BLE001
            return Response(
                {"error": f"Invalid base64 for input_images.{key}: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Fetch images from URLs if provided (and not already in base64)
    if input_image_urls:
        from urllib.parse import unquote, urlparse

        import requests as http_requests
        from django.conf import settings

        # Detect our own S3 bucket URLs and download directly via boto3
        s3_bucket = getattr(settings, "AWS_S3_BUCKET_NAME", "teamreel-assets-demo")
        s3_url_prefix = ".s3."  # matches *.s3.*.amazonaws.com

        for key, url in input_image_urls.items():
            if key not in input_images:
                try:
                    # Check if this URL points to our own S3 bucket
                    parsed = urlparse(url)
                    is_own_s3 = (
                        parsed.hostname
                        and s3_bucket in parsed.hostname
                        and s3_url_prefix in parsed.hostname
                    )

                    if is_own_s3:
                        # Extract the S3 key from the URL path (decode %20 etc.)
                        s3_key = unquote(parsed.path.lstrip("/"))
                        from files.utils import get_storage_backend

                        backend = get_storage_backend()
                        file_obj = backend.open(s3_key)
                        input_images[key] = file_obj.read()
                    else:
                        resp = http_requests.get(url, timeout=30)
                        resp.raise_for_status()
                        input_images[key] = resp.content
                except (http_requests.RequestException, OSError, Exception) as e:
                    return Response(
                        {"error": f"Failed to fetch input_image_urls.{key}: {e}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

    # Check if this is a video template
    try:
        from .services.asset_pipeline import _get_template_output_type

        output_type = _get_template_output_type(template_id)
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to resolve template output type for %s: %s", template_id, e)
        return Response(
            {"error": f"Template resolution failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Fast synchronous path for Pillow-only postprocess templates ───
    # Templates like logo_postprocess, sponsor_postprocess, kit_postprocess,
    # location_postprocess are pure Pillow (no AI call). Running them through
    # the Celery ai_generation queue adds unnecessary latency and UI
    # complexity. Execute them inline and return the result immediately.
    from .services.asset_pipeline import PILLOW_ONLY_TEMPLATES

    if template_id in PILLOW_ONLY_TEMPLATES:
        try:
            from .services.asset_pipeline import generate_asset

            results = generate_asset(
                template_id=template_id,
                params=params,
                input_images=input_images,
                variant_count=variant_count,
            )

            # Upload results to storage and build response
            stored_variants = []
            for r in results:
                image_bytes = r.get("image_bytes")
                if image_bytes and not r.get("error"):
                    upload_result = _upload_image_bytes_to_storage(
                        image_bytes=image_bytes,
                        filename=r.get("filename", f"{template_id}_postprocessed.png"),
                        mime_type=r.get("mime_type", "image/png"),
                        variant_index=r.get("variant_index", 0),
                        template_id=template_id,
                        template_type="output",
                        template_subtype=template_id.replace("_postprocess", ""),
                        project_id=str(project_id) if project_id else None,
                        organisation_id=str(organisation_id) if organisation_id else None,
                        membership_id=str(membership_id) if membership_id else None,
                    )
                    stored_variants.append(
                        {
                            "variant_index": r.get("variant_index", 0),
                            "image_base64": r.get("image_base64"),
                            "mime_type": r.get("mime_type"),
                            "filename": r.get("filename"),
                            "error": None,
                            "metadata": r.get("metadata"),
                            "storage_path": upload_result.get("storage_path"),
                            "presigned_url": upload_result.get("presigned_url"),
                            "storage_info": upload_result,
                        }
                    )
                else:
                    stored_variants.append(
                        {
                            "variant_index": r.get("variant_index", 0),
                            "image_base64": None,
                            "mime_type": None,
                            "filename": None,
                            "error": r.get("error", "No image bytes produced"),
                        }
                    )

            logger.info(
                "Pillow-only postprocess %s completed synchronously",
                template_id,
            )

            # Return 200 with variants directly (sync path).
            # The frontend useAssetGeneration hook handles 200 responses
            # by immediately setting step='completed' with the variants,
            # which triggers auto-accept in the AssetsTab useEffect.
            return Response(
                {
                    "template_id": template_id,
                    "variant_count": len(stored_variants),
                    "variants": stored_variants,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:  # noqa: BLE001
            logger.exception("Pillow-only postprocess failed for %s: %s", template_id, e)
            return Response(
                {"error": f"Postprocess failed: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Run the appropriate pipeline based on output type
    if output_type == "video":
        # Video generation is async via Celery queue (ai_generation).
        # Frontend polls GET .../generate/<task_id>/status/ for result.
        try:
            task_id = str(uuid_mod.uuid4())

            # Determine user_id safely
            user_id = request.user.id if request.user and request.user.is_authenticated else None

            # Build context for S3 storage
            storage_context = {
                "project_id": str(project_id) if project_id else None,
                "membership_id": str(membership_id) if membership_id else None,
                "activity_id": str(activity_id) if activity_id else None,
                "asset_type": asset_type,
                "save_to_brand": save_to_brand,
                "save_to_media_library": save_to_media_library,
                "role": params.get("role") or None,
            }

            # Store initial task status
            _cleanup_old_tasks()
            _set_task(
                task_id,
                {
                    "status": "queued",
                    "progress": 2,
                    "message": "Video generation queued…",
                },
            )

            # Persist job to DB for Workflow Queue UI
            _create_generation_job(
                task_id,
                template_id,
                "video",
                user_id=user_id,
                project_id=str(project_id) if project_id else None,
                membership_id=str(membership_id) if membership_id else None,
                output_asset_type=asset_type or "",
            )

            # Encode images to base64 for Celery serialization (JSON-safe)
            input_images_b64_for_celery: dict[str, str] = {}
            for key, img_bytes in input_images.items():
                input_images_b64_for_celery[key] = base64.b64encode(img_bytes).decode("utf-8")

            # Dispatch to Celery ai_generation queue (rate-limited, sequential)
            from .tasks_asset import generate_asset_task

            try:
                generate_asset_task.apply_async(
                    kwargs={
                        "job_id": task_id,
                        "template_id": template_id,
                        "params": params,
                        "input_images_b64": input_images_b64_for_celery,
                        "variant_count": variant_count,
                        "output_type": "video",
                        "user_id": user_id,
                        "organisation_id": str(organisation_id) if organisation_id else None,
                        "storage_context": storage_context,
                        "provider": provider,
                        "model": model,
                    },
                    queue="ai_generation",
                )
                logger.info("Video generation task %s dispatched to ai_generation queue", task_id)
            except Exception as celery_err:
                # Celery broker unavailable — fallback to old threading approach
                logger.warning(
                    "Celery dispatch failed (%s), falling back to thread for task %s",
                    celery_err,
                    task_id,
                )
                thread = threading.Thread(
                    target=_run_video_generation,
                    kwargs={
                        "task_id": task_id,
                        "template_id": template_id,
                        "params": params,
                        "input_images": input_images,
                        "user_id": user_id,
                        "organisation_id": str(organisation_id) if organisation_id else None,
                        "storage_context": storage_context,
                        "variant_count": variant_count,
                    },
                    daemon=True,
                )
                thread.start()

            return Response(
                {
                    "status": "queued",
                    "task_id": task_id,
                    "message": "Video generation queued. Poll /status/ for result.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:  # noqa: BLE001
            logger.exception("Video generation dispatch failed: %s", e)
            return Response(
                {"error": f"Video generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Image generation — also async via Celery queue (ai_generation).
    # All AI calls are rate-limited and tracked through the workflow queue.
    try:
        task_id = str(uuid_mod.uuid4())

        user_id = request.user.id if request.user and request.user.is_authenticated else None

        storage_context = {
            "project_id": str(project_id) if project_id else None,
            "membership_id": str(membership_id) if membership_id else None,
            "activity_id": str(activity_id) if activity_id else None,
            "asset_type": asset_type,
            "save_to_brand": save_to_brand,
            "save_to_media_library": save_to_media_library,
            "role": params.get("role") or None,
        }

        _set_task(
            task_id,
            {
                "status": "queued",
                "progress": 2,
                "message": "Image generation queued…",
            },
        )

        # Persist job to DB for Workflow Queue UI
        _create_generation_job(
            task_id,
            template_id,
            "image",
            user_id=user_id,
            project_id=str(project_id) if project_id else None,
            membership_id=str(membership_id) if membership_id else None,
            output_asset_type=asset_type or "",
        )

        # Encode images to base64 for Celery serialization
        input_images_b64_for_celery: dict[str, str] = {}
        for key, img_bytes in input_images.items():
            input_images_b64_for_celery[key] = base64.b64encode(img_bytes).decode("utf-8")

        from .tasks_asset import generate_asset_task

        try:
            generate_asset_task.apply_async(
                kwargs={
                    "job_id": task_id,
                    "template_id": template_id,
                    "params": params,
                    "input_images_b64": input_images_b64_for_celery,
                    "variant_count": variant_count,
                    "output_type": "image",
                    "user_id": user_id,
                    "organisation_id": str(organisation_id) if organisation_id else None,
                    "storage_context": storage_context,
                    "model": model,
                },
                queue="ai_generation",
            )
            logger.info("Image generation task %s dispatched to ai_generation queue", task_id)
        except Exception as celery_err:
            # Celery broker unavailable — fallback to synchronous generation
            logger.warning(
                "Celery dispatch failed (%s), falling back to sync for task %s",
                celery_err,
                task_id,
            )
            try:
                from .services.asset_pipeline import generate_asset

                results = generate_asset(
                    template_id=template_id,
                    params=params,
                    input_images=input_images,
                    variant_count=variant_count,
                )
                variants = []
                for r in results:
                    variants.append(
                        {
                            "variant_index": r.get("variant_index", 0),
                            "image_base64": r.get("image_base64"),
                            "mime_type": r.get("mime_type"),
                            "filename": r.get("filename"),
                            "error": r.get("error"),
                            "metadata": r.get("metadata"),
                        }
                    )
                _set_task(
                    task_id,
                    {
                        "status": "completed",
                        "progress": 100,
                        "data": {
                            "template_id": template_id,
                            "variant_count": len(variants),
                            "variants": variants,
                        },
                    },
                )
            except Exception as gen_err:
                _set_task(task_id, {"status": "failed", "error": str(gen_err)})

        return Response(
            {
                "status": "queued",
                "task_id": task_id,
                "message": "Image generation queued. Poll /status/ for result.",
            },
            status=status.HTTP_202_ACCEPTED,
        )
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Image generation dispatch failed: %s", e)
        return Response(
            {"error": f"Generation failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Save generated images to storage and include storage info in response
    try:
        from files.utils import get_storage_backend

        storage = get_storage_backend()
        storage_backend_name = storage.__class__.__name__
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initialise storage backend: %s", e)
        # Return results without storage - base64 is still available
        clean_variants = []
        for r in results:
            clean_variants.append(
                {
                    "variant_index": r["variant_index"],
                    "image_base64": r.get("image_base64"),
                    "mime_type": r.get("mime_type"),
                    "filename": r.get("filename"),
                    "error": r.get("error"),
                    "metadata": r.get("metadata"),
                    "presigned_url": None,
                    "storage_info": None,
                }
            )
        return Response(
            {
                "template_id": template_id,
                "variant_count": variant_count,
                "variants": clean_variants,
            },
            status=status.HTTP_200_OK,
        )

    # Lookup project/organisation for proper scoping
    project = None
    organisation = None
    if project_id:
        try:
            from projects.models import Project

            # project_id can be a numeric ID or a slug string
            if str(project_id).isdigit():
                project = Project.objects.select_related("organisation").get(id=project_id)
            else:
                project = Project.objects.select_related("organisation").get(slug=project_id)
            organisation = project.organisation
        except Project.DoesNotExist:
            logger.warning(f"Project {project_id} not found")
    if not organisation and organisation_id:
        try:
            from organisations.models import Organisation

            organisation = Organisation.objects.get(id=organisation_id)
        except Organisation.DoesNotExist:
            logger.warning(f"Organisation {organisation_id} not found")

    # Lookup activity for activity-scoped storage
    activity = None
    if activity_id:
        try:
            from activities.models import Activity

            activity = Activity.objects.get(id=activity_id)
        except Activity.DoesNotExist:
            logger.warning(f"Activity {activity_id} not found")

    # Get current user for ownership
    current_user = request.user if request.user.is_authenticated else None

    clean_variants = []
    for r in results:
        variant_data = {
            "variant_index": r["variant_index"],
            "image_base64": r.get("image_base64"),
            "mime_type": r.get("mime_type"),
            "filename": r.get("filename"),
            "error": r.get("error"),
            "metadata": r.get("metadata"),
            "presigned_url": None,
            "storage_info": None,
        }

        # If we have image bytes, save to storage
        image_bytes = r.get("image_bytes")
        if image_bytes and not r.get("error"):
            try:
                import uuid as uuid_module

                from django.core.files.base import ContentFile
                from django.utils import timezone

                filename = r.get("filename") or f"generated_{r['variant_index']}.png"
                mime_type = r.get("mime_type") or "image/png"

                # Build proper S3 path based on context (media-architecture.md)
                timestamp = timezone.now().strftime("%Y%m%d")
                unique_suffix = str(uuid_module.uuid4())[:8]

                # Determine storage folder from params context
                context_type = params.get("template_type", "output")
                context_subtype = params.get("template_subtype", "")
                asset_folder = (
                    f"{context_type}/{context_subtype}" if context_subtype else context_type
                )

                # Add unique suffix to filename
                name_parts = filename.rsplit(".", 1)
                if len(name_parts) == 2:
                    name, ext = name_parts
                    unique_filename = f"{name}_{timestamp}_{unique_suffix}.{ext}"
                else:
                    unique_filename = f"{filename}_{timestamp}_{unique_suffix}"

                # Build hierarchical path based on context (media-architecture.md)
                # Priority: membership > activity > project > organisation > generic
                if membership_id:
                    storage_path_prefix = (
                        f"members/{membership_id}/generated/{asset_folder}/{unique_filename}"
                    )
                elif activity:
                    storage_path_prefix = (
                        f"activities/{activity.id}/generated/{asset_folder}/{unique_filename}"
                    )
                elif project:
                    storage_path_prefix = (
                        f"projects/{project.id}/generated/{asset_folder}/{unique_filename}"
                    )
                elif organisation:
                    storage_path_prefix = (
                        f"orgs/{organisation.id}/generated/{asset_folder}/{unique_filename}"
                    )
                else:
                    storage_path_prefix = f"generated/{asset_folder}/{unique_filename}"

                # Save to storage backend
                file_obj = ContentFile(image_bytes, name=filename)
                storage_path = storage.save(storage_path_prefix, file_obj)

                # Generate access URL
                try:
                    presigned_url = storage.get_url(storage_path, signed=True)
                except Exception:
                    presigned_url = storage.url(storage_path) if hasattr(storage, "url") else None

                # ===================================================================
                # CREATE FILEASSET (B22 File Storage)
                # ===================================================================
                file_asset = None
                file_asset_id = None
                if organisation:
                    try:
                        from files.models import FileAsset

                        file_asset = FileAsset.objects.create(
                            organization=organisation,
                            uploaded_by=current_user,
                            original_name=filename,
                            storage_path=storage_path,
                            file_size=len(image_bytes),
                            mime_type=mime_type,
                            is_public=False,
                            metadata={
                                "source": "ai_generation",
                                # Tag with intended asset type (e.g. kit_home)
                                "asset_type": asset_type,
                                "template_id": template_id,
                                "template_type": context_type,
                                "template_subtype": context_subtype,
                                "variant_index": r["variant_index"],
                            },
                        )
                        file_asset_id = file_asset.id
                        logger.info(f"   📄 FileAsset created: {file_asset_id}")
                    except Exception as fa_error:  # noqa: BLE001
                        logger.warning(f"Failed to create FileAsset: {fa_error}")

                # ===================================================================
                # CREATE BRANDASSET (B33 Brand Identity Manager)
                # ===================================================================
                brand_asset = None
                brand_asset_id = None
                if save_to_brand and file_asset and asset_type:
                    try:
                        from branding.models import BrandAsset, BrandProfile

                        # Get the effective brand profile
                        brand_profile = BrandProfile.get_effective_brand(
                            organisation=organisation,
                            project=project,
                        )

                        if brand_profile:
                            # Check if asset_type already exists - update or create
                            brand_asset, created = BrandAsset.objects.update_or_create(
                                profile=brand_profile,
                                asset_type=asset_type,
                                defaults={
                                    "file": file_asset,
                                    "alt_text": f"AI-generated {asset_type.replace('_', ' ')}",
                                    "is_active": True,
                                },
                            )
                            brand_asset_id = brand_asset.id
                            action = "created" if created else "updated"
                            logger.info(
                                f"   🎨 BrandAsset {action}: {brand_asset_id} (type={asset_type})"
                            )
                        else:
                            logger.warning(
                                "No BrandProfile found for"
                                f" org={organisation_id}"
                                f" project={project_id}"
                            )
                    except Exception as ba_error:  # noqa: BLE001
                        logger.warning(f"Failed to create BrandAsset: {ba_error}")

                # ===================================================================
                # CREATE MEDIAITEM (B35 Smart Asset Library)
                # ===================================================================
                media_item = None
                media_item_id = None
                if save_to_media_library and file_asset and project:
                    try:
                        from medialib.models import MediaItem, MediaItemRelation, MediaItemState

                        # Build rich extraction_metadata with context
                        meta = {
                            "source": "ai_generation",
                            "asset_type": f"{context_subtype}_{r['variant_index']}"
                            if context_subtype
                            else f"generated_{r['variant_index']}",
                            "template_id": template_id,
                            "template_type": context_type,
                            "template_subtype": context_subtype,
                            "variant_index": r["variant_index"],
                        }

                        # Add project context (club/team)
                        if project:
                            meta["project_id"] = project.id
                            meta["project_name"] = project.name
                            if project.parent_project:
                                meta["club_name"] = project.parent_project.name
                                meta["team_name"] = project.name
                            else:
                                meta["club_name"] = project.name

                        # Add organisation context
                        if organisation:
                            meta["organisation_id"] = str(organisation.id)
                            meta["organisation_name"] = organisation.name

                        # Add activity/match context
                        if activity:
                            meta["activity_id"] = str(activity.id)
                            meta["activity_title"] = activity.title
                            if hasattr(activity, "activity_date") and activity.activity_date:
                                meta["activity_date"] = activity.activity_date.isoformat()
                            # Add match-specific fields if available
                            if hasattr(activity, "opponent") and activity.opponent:
                                meta["opponent"] = activity.opponent
                            if hasattr(activity, "home_away"):
                                meta["home_away"] = activity.home_away
                            if hasattr(activity, "score_home") and activity.score_home is not None:
                                meta["score_home"] = activity.score_home
                            if hasattr(activity, "score_away") and activity.score_away is not None:
                                meta["score_away"] = activity.score_away

                        # Add tags from params if provided
                        if params and params.get("tags"):
                            meta["tags"] = params.get("tags")

                        # Add sport type from project if available
                        if project and hasattr(project, "sport") and project.sport:
                            meta["sport_type"] = project.sport.name

                        media_item = MediaItem.objects.create(
                            project=project,
                            file=file_asset,
                            title=f"Generated {context_type} - {context_subtype or 'variant'}",
                            description=f"AI-generated content from template {template_id}",
                            mime_type=mime_type,
                            file_size_bytes=len(image_bytes),
                            state=MediaItemState.PROCESSED,
                            extraction_metadata=meta,
                            created_by=current_user,
                            activity=activity,
                        )
                        media_item_id = media_item.id
                        logger.info(f"   🎬 MediaItem created: {media_item_id}")

                        # Create MediaItemRelation to link to activity if present
                        if activity:
                            from django.contrib.contenttypes.models import ContentType

                            activity_ct = ContentType.objects.get_for_model(activity)
                            MediaItemRelation.objects.create(
                                media_item=media_item,
                                content_type=activity_ct,
                                object_id=activity.id,
                                relation_type="generated_for",
                                metadata={"template_id": template_id},
                                created_by=current_user,
                            )
                            logger.info(
                                f"   🔗 MediaItemRelation created for Activity {activity.id}"
                            )
                    except Exception as mi_error:  # noqa: BLE001
                        logger.warning(f"Failed to create MediaItem: {mi_error}")

                # Build storage_info with all IDs
                variant_data["presigned_url"] = presigned_url
                variant_data["storage_info"] = {
                    "storage_backend": storage_backend_name,
                    "storage_path": storage_path,
                    "original_name": filename,
                    "file_size_bytes": len(image_bytes),
                    "file_size_kb": round(len(image_bytes) / 1024, 1),
                    "mime_type": mime_type,
                    "created_at": timezone.now().isoformat(),
                    "file_asset_id": str(file_asset_id) if file_asset_id else None,
                    "brand_asset_id": str(brand_asset_id) if brand_asset_id else None,
                    "media_item_id": str(media_item_id) if media_item_id else None,
                }

                logger.info(
                    f"✅ Generated image saved!\n"
                    f"   📦 Storage: {storage_backend_name}\n"
                    f"   📁 Path: {storage_path}\n"
                    f"   📊 Size: {len(image_bytes):,} bytes"
                )

            except Exception as save_error:  # noqa: BLE001
                logger.warning(f"Failed to save generated image to storage: {save_error}")
                # Continue without storage info - base64 is still available

        clean_variants.append(variant_data)

    output = {
        "template_id": template_id,
        "variant_count": variant_count,
        "variants": clean_variants,
    }

    return Response(output, status=status.HTTP_200_OK)


# =============================================================================


# =============================================================================
# Models endpoint — returns available AI models per provider with pricing
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_asset_models_view(request: Request) -> Response:  # noqa: ARG001
    """List available AI models with pricing info.

    GET /api/v1/generative/assets/models/
    Optional query params:
      - output_type: filter by 'image' or 'video'
      - provider: filter by provider name
    """
    output_type = request.query_params.get("output_type")
    provider_filter = request.query_params.get("provider")

    models = MODEL_REGISTRY
    if output_type:
        models = [m for m in models if m["output_type"] == output_type]
    if provider_filter:
        models = [m for m in models if m["provider"] == provider_filter]

    return Response(models, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_asset_templates_view(request: Request) -> Response:  # noqa: ARG001
    """List available asset generation templates.

    Returns template definitions (matching the frontend assetTemplates.ts).

    GET /api/v1/generative/assets/templates/
    """
    from django.db import DatabaseError

    from src.generative.services.prompt_service import get_active_templates

    try:
        db_templates = get_active_templates()
        templates = []
        for t in db_templates:
            templates.append(
                {
                    "id": t.slug,
                    "name": t.name,
                    "category": t.template_subtype,
                    "description": t.description,
                    "input_requirements": t.input_schema.get("required", []),
                    "parameters": t.parameters_schema,
                }
            )
        return Response({"templates": templates}, status=status.HTTP_200_OK)
    except DatabaseError:
        logger.exception("Database error loading asset templates")
        return Response(
            {"error": "Failed to load templates"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected error loading asset templates")
        return Response({"templates": []}, status=status.HTTP_200_OK)
