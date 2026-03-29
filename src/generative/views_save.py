"""Asset save, history, and restore views."""
from __future__ import annotations

import base64
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from ._asset_helpers import (
    SaveAssetInputSerializer,
    _propagate_approved_image_to_brand,
    _propagate_approved_image_to_membership,
    _propagate_approved_video_to_membership,
)

logger = logging.getLogger("generative.views.asset")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_asset_view(request: Request) -> Response:
    """Save a generated asset as BrandAsset.

    This endpoint takes a generated image (by storage_path, URL, or base64)
    and creates the corresponding FileAsset + BrandAsset records.

    POST /api/v1/generative/assets/save/
    """
    serializer = SaveAssetInputSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    storage_path = serializer.validated_data.get("storage_path")
    presigned_url = serializer.validated_data.get("presigned_url")
    video_url = serializer.validated_data.get("video_url")
    image_base64 = serializer.validated_data.get("image_base64")
    video_base64 = serializer.validated_data.get("video_base64")
    filename = serializer.validated_data.get("filename") or "saved_asset.png"
    mime_type = serializer.validated_data.get("mime_type") or "image/png"
    file_size_bytes = serializer.validated_data.get("file_size_bytes") or 0
    organisation_id = serializer.validated_data.get("organisation_id")
    project_id = serializer.validated_data.get("project_id")
    membership_id = serializer.validated_data.get("membership_id")
    activity_id = serializer.validated_data.get("activity_id")
    asset_type = serializer.validated_data.get("asset_type")
    task_id = serializer.validated_data.get("task_id")
    variant_index = serializer.validated_data.get("variant_index")
    label = serializer.validated_data.get("label") or ""

    logger.info(
        f"🎯 Save asset request: type={asset_type}, org={organisation_id}, project={project_id}"
    )

    # Lookup organisation and project
    organisation = None
    project = None

    if project_id:
        import uuid

        from projects.models import Project

        # Try to parse as UUID
        is_uuid = False
        try:
            uuid.UUID(str(project_id))
            is_uuid = True
        except ValueError:
            is_uuid = False

        if is_uuid:
            try:
                project = Project.objects.select_related("organisation").get(id=project_id)
                organisation = project.organisation
            except Project.DoesNotExist:
                logger.warning(f"Project with ID {project_id} not found")
        else:
            # Try to lookup by slug
            try:
                # If we have organisation_id, prevent cross-org lookup if possible,
                # but Project slug is usually unique or scoped.
                # Assuming Project has a 'slug' field.
                query = {"slug": project_id}
                if organisation_id:
                    query["organisation__id"] = organisation_id

                project = Project.objects.select_related("organisation").get(**query)
                organisation = project.organisation
            except (Project.DoesNotExist, Exception) as e:
                logger.warning(f"Project with slug '{project_id}' not found: {e}")

    if not organisation and organisation_id:
        try:
            from organisations.models import Organisation

            organisation = Organisation.objects.get(id=organisation_id)
        except Organisation.DoesNotExist:
            logger.warning(f"Organisation {organisation_id} not found")

    if not organisation:
        return Response(
            {"error": "Organisation not found. Provide organisation_id or project_id."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Get image bytes
    image_bytes = None

    if image_base64:
        try:
            # Handle data URI prefix
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
            file_size_bytes = len(image_bytes)
        except Exception as e:
            return Response(
                {"error": f"Invalid base64 data: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif video_base64:
        try:
            if "," in video_base64:
                video_base64 = video_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(video_base64)
            file_size_bytes = len(image_bytes)
            # Ensure mime_type is video
            if not mime_type.startswith("video/"):
                mime_type = "video/mp4"
        except Exception as e:
            return Response(
                {"error": f"Invalid video base64 data: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif presigned_url or video_url:
        download_url = presigned_url or video_url
        try:
            import requests as http_requests

            resp = http_requests.get(download_url, timeout=60)  # Video downloads might take longer
            resp.raise_for_status()
            image_bytes = resp.content
            file_size_bytes = len(image_bytes)
        except Exception as e:
            return Response(
                {"error": f"Failed to fetch asset from URL: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    elif storage_path:
        # Asset already in S3, just create records pointing to it
        pass
    else:
        return Response(
            {
                "error": (
                    "Provide image_base64, video_base64,"
                    " presigned_url, video_url, or storage_path"
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    current_user = request.user if request.user.is_authenticated else None

    # If we have bytes (image or video), save to proper storage location
    final_storage_path = storage_path
    if image_bytes and not storage_path:
        try:
            import uuid as uuid_module

            from django.core.files.base import ContentFile
            from django.utils import timezone
            from files.utils import get_storage_backend

            storage = get_storage_backend()

            timestamp = timezone.now().strftime("%Y%m%d")
            unique_suffix = str(uuid_module.uuid4())[:8]

            # Build proper path for brand assets
            name_parts = filename.rsplit(".", 1)
            if len(name_parts) == 2:
                name, ext = name_parts
                unique_filename = f"{name}_{timestamp}_{unique_suffix}.{ext}"
            else:
                unique_filename = f"{filename}_{timestamp}_{unique_suffix}"

            # Build hierarchical path: membership > project > org (media-architecture.md)
            if membership_id:
                storage_path_prefix = (
                    f"members/{membership_id}/generated/{asset_type}/{unique_filename}"
                )
            elif project:
                storage_path_prefix = (
                    f"projects/{project.id}/generated/{asset_type}/{unique_filename}"
                )
            else:
                storage_path_prefix = f"orgs/{organisation.id}/brand/{asset_type}/{unique_filename}"

            file_obj = ContentFile(image_bytes, name=filename)
            final_storage_path = storage.save(storage_path_prefix, file_obj)

            logger.info(f"💾 Saved to storage: {final_storage_path}")
        except Exception as e:
            logger.exception(f"Failed to save to storage: {e}")
            return Response(
                {"error": f"Failed to save to storage: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # Create FileAsset record (or reuse existing one if storage_path already exists)
    file_asset = None
    try:
        from files.models import FileAsset

        # Check if a FileAsset already exists with this storage_path (e.g., from generation step)
        if final_storage_path:
            file_asset = FileAsset.objects.filter(storage_path=final_storage_path).first()

        if file_asset:
            logger.info(f"📄 Reusing existing FileAsset: {file_asset.id}")
        else:
            file_asset = FileAsset.objects.create(
                organization=organisation,
                uploaded_by=current_user,
                original_name=filename,
                storage_path=final_storage_path,
                file_size=file_size_bytes,
                mime_type=mime_type,
                is_public=False,
                metadata={
                    "source": "ai_generation_saved",
                    "asset_type": asset_type,
                },
            )
            logger.info(f"📄 FileAsset created: {file_asset.id}")
    except Exception as e:
        logger.exception(f"Failed to create FileAsset: {e}")
        return Response(
            {"error": f"Failed to create FileAsset: {e}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Persist as MediaItem (match-scoped) OR BrandAsset (org branding) ──
    # Member-scoped assets (fullbody, closeup, intro, celebration) are NOT saved as BrandAssets.
    # They are stored per-member in membership metadata by the frontend's onAssetSaved callback.
    # We only create FileAsset + storage path here; the frontend handles member-level persistence.
    media_item = None
    brand_asset = None

    is_member_asset = (
        bool(membership_id)
        and asset_type
        and (
            asset_type.startswith("member_in_tenue")
            or asset_type.startswith("member_closeup")
            or asset_type.startswith("member_intro")
            or asset_type.startswith("member_goal_celebration")
            or asset_type.startswith("photo_composite")
            or asset_type.startswith("member_action_photo")
        )
    )

    if activity_id:
        # ── MediaItem path: match/activity-scoped content (media-architecture.md) ──
        try:
            from activities.models import Activity
            from medialib.models import MediaItem, MediaItemState

            activity = Activity.objects.get(id=activity_id)

            # Determine the project: explicit project > activity's project
            media_project = project
            if not media_project and hasattr(activity, "project_id") and activity.project_id:
                from projects.models import Project as Proj

                media_project = Proj.objects.filter(id=activity.project_id).first()

            if not media_project:
                return Response(
                    {"error": "Cannot determine project for this activity."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Build rich extraction_metadata with context
            meta = {
                "source": "ai_generation_saved",
                "asset_type": asset_type,
            }

            # Add project context (club/team)
            if media_project:
                meta["project_id"] = media_project.id
                meta["project_name"] = media_project.name
                if media_project.parent_project:
                    meta["club_name"] = media_project.parent_project.name
                    meta["team_name"] = media_project.name
                else:
                    meta["club_name"] = media_project.name

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

            # Add sport type from project if available
            if media_project and hasattr(media_project, "sport") and media_project.sport:
                meta["sport_type"] = media_project.sport.name

            # Always create a NEW MediaItem (previous ones become history)
            media_item = MediaItem.objects.create(
                file=file_asset,
                activity=activity,
                project=media_project,
                title=filename,
                description=f"AI-generated {asset_type.replace('_', ' ')}",
                mime_type=mime_type,
                file_size_bytes=file_size_bytes or 0,
                state=MediaItemState.PROCESSED,
                created_by=current_user,
                extraction_metadata=meta,
            )
            logger.info(
                f"🎬 MediaItem created: {media_item.id} "
                f"(activity={activity_id}, type={asset_type})"
            )

        except Activity.DoesNotExist:
            return Response(
                {"error": f"Activity {activity_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.exception(f"Failed to create MediaItem: {e}")
            return Response(
                {"error": f"Failed to create MediaItem: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    else:
        # ── BrandAsset path: organisation-level branding (logos, kits, sponsors) ──
        # Skip BrandAsset for member-scoped assets —
        # they live in membership metadata, not brand profile.
        if is_member_asset:
            logger.info(
                f"👤 Member-scoped asset (membership={membership_id}), "
                f"skipping BrandAsset creation. FileAsset={file_asset.id if file_asset else None}"
            )
        else:
            try:
                from branding.models import BrandAsset, BrandProfile

                # When saving for a specific project, ensure a project-level
                # BrandProfile exists (don't fall back to org/parent profile,
                # otherwise the frontend can't find the asset when querying
                # by project_id).
                brand_profile = None
                if project:
                    brand_profile = BrandProfile.objects.filter(
                        project=project, is_active=True
                    ).first()
                    if not brand_profile:
                        brand_profile = BrandProfile.objects.create(
                            project=project,
                            name=f"{project.name} Brand",
                            is_active=True,
                            created_by=current_user,
                        )
                        logger.info(
                            f"🆕 Created project-level BrandProfile: {brand_profile.id} "
                            f"(project={project.id})"
                        )
                else:
                    # No project specified — use org-level profile
                    brand_profile = BrandProfile.objects.filter(
                        organisation=organisation, is_active=True
                    ).first()
                    if not brand_profile:
                        brand_profile = BrandProfile.objects.create(
                            organisation=organisation,
                            name=f"{organisation.name} Brand",
                            is_active=True,
                            created_by=current_user,
                        )
                        logger.info(f"🆕 Created org-level BrandProfile: {brand_profile.id}")

                # Multi-instance types (e.g. club_background) use label-based
                # update_or_create when a label is provided (so regenerating
                # replaces the existing processed asset for that label).
                # Without a label they always create new.
                MULTI_INSTANCE_ASSET_TYPES = {"club_background", "club_background_upload"}

                if asset_type in MULTI_INSTANCE_ASSET_TYPES:
                    if label:
                        brand_asset, created = BrandAsset.objects.update_or_create(
                            profile=brand_profile,
                            asset_type=asset_type,
                            label=label,
                            defaults={
                                "file": file_asset,
                                "alt_text": f"AI-processed {asset_type.replace('_', ' ')}",
                                "is_active": True,
                            },
                        )
                    else:
                        brand_asset = BrandAsset.objects.create(
                            profile=brand_profile,
                            asset_type=asset_type,
                            file=file_asset,
                            label=label,
                            alt_text=f"AI-processed {asset_type.replace('_', ' ')}",
                            is_active=True,
                        )
                        created = True
                else:
                    # Create or update the BrandAsset
                    brand_asset, created = BrandAsset.objects.update_or_create(
                        profile=brand_profile,
                        asset_type=asset_type,
                        defaults={
                            "file": file_asset,
                            "alt_text": f"AI-processed {asset_type.replace('_', ' ')}",
                            "is_active": True,
                        },
                    )
                action = "created" if created else "updated"
                logger.info(f"🎨 BrandAsset {action}: {brand_asset.id} (type={asset_type})")

            except Exception as e:
                logger.exception(f"Failed to create BrandAsset: {e}")
                return Response(
                    {"error": f"Failed to create BrandAsset: {e}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

    # ── Auto-approve GenerationJob if task_id provided ────────────────
    if task_id:
        try:
            from django.utils import timezone as tz

            from .models import GenerationJob

            job = GenerationJob.objects.get(task_id=task_id)
            job.approval_status = GenerationJob.ApprovalStatus.APPROVED
            job.reviewed_at = tz.now()
            if current_user and current_user.is_authenticated:
                job.reviewed_by_id = current_user.id

            # Mark the chosen variant as approved in output_variants
            if job.output_variants and variant_index is not None:
                updated = []
                for v in job.output_variants:
                    v = dict(v)
                    if v.get("variant_index") == variant_index:
                        v["approved"] = True
                    else:
                        v["approved"] = False
                    updated.append(v)
                job.output_variants = updated

            job.save(
                update_fields=[
                    "approval_status",
                    "reviewed_at",
                    "reviewed_by_id",
                    "output_variants",
                    "updated_at",
                ]
            )
            logger.info(f"✅ Auto-approved GenerationJob {task_id} " f"(variant={variant_index})")

            # Propagate approved image to brand assets / membership
            if job.output_type == "image":
                try:
                    _propagate_approved_image_to_brand(job)
                except Exception:
                    logger.warning("Auto-approve: brand propagation failed for %s", task_id)
                try:
                    _propagate_approved_image_to_membership(job)
                except Exception:
                    logger.warning("Auto-approve: membership propagation failed for %s", task_id)
            elif job.output_type == "video":
                try:
                    _propagate_approved_video_to_membership(job)
                except Exception:
                    logger.warning("Auto-approve: video propagation failed for %s", task_id)

        except GenerationJob.DoesNotExist:
            logger.warning(f"Auto-approve: GenerationJob {task_id} not found")
        except Exception as approve_err:
            logger.warning(f"Auto-approve failed for {task_id}: {approve_err}")

    # Generate presigned URL for immediate frontend display
    presigned_url = None
    if final_storage_path:
        try:
            presigned_url = storage.get_url(final_storage_path, signed=True, expiry_seconds=3600)
        except Exception:
            logger.warning("Could not generate presigned URL for save response")

    return Response(
        {
            "status": "success",
            "message": f"Asset saved as {asset_type}",
            "data": {
                "file_asset_id": str(file_asset.id) if file_asset else None,
                "media_item_id": str(media_item.id) if media_item else None,
                "brand_asset_id": str(brand_asset.id) if brand_asset else None,
                "storage_path": final_storage_path,
                "presigned_url": presigned_url,
                "asset_type": asset_type,
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_asset_history_view(request: Request) -> Response:
    """List historical file assets, optionally filtered by asset type.

    GET /api/v1/generative/assets/history/
    GET /api/v1/generative/assets/history/?project_id=...&asset_type=kit_home

    When called without asset_type, returns recent history across all types (overview mode).
    """
    project_id = request.query_params.get("project_id")
    organisation_id = request.query_params.get("organisation_id")
    asset_type = request.query_params.get("asset_type")
    limit = int(request.query_params.get("limit", 20))

    from files.models import FileAsset

    # Build filters - is_deleted=False is always required
    filters: dict = {"is_deleted": False}

    # Only filter by asset_type if provided
    if asset_type:
        filters["metadata__asset_type"] = asset_type

    # Scoping by project or organisation (optional for overview)
    if project_id:
        # Resolve org from project if possible, but FileAsset is linked to Org
        try:
            from projects.models import Project

            # Try UUID first
            try:
                p = Project.objects.get(id=project_id)
            except (ValueError, Exception):
                # Fallback to slug lookup if supported, or other field
                # Assuming 'slug' field exists or we can't find it
                p = Project.objects.filter(slug=project_id).first()
                if not p:
                    raise Exception("Project not found") from None

            filters["organization"] = p.organisation
        except:  # noqa: E722
            return Response({"error": "Project not found"}, status=404)
    elif organisation_id:
        filters["organization_id"] = organisation_id
    # Note: If no project_id or organisation_id, we return global history (limited)

    # Query recent files - only include those with asset_type metadata (generated assets)
    assets_qs = (
        FileAsset.objects.filter(**filters)
        .filter(metadata__has_key="asset_type")
        .order_by("-created_at")[:limit]
    )

    # Serialize
    from files.utils import get_storage_backend

    storage = get_storage_backend()

    history = []
    for asset in assets_qs:
        url = None
        try:
            url = storage.get_url(asset.storage_path, signed=True)
        except Exception:
            url = storage.url(asset.storage_path) if hasattr(storage, "url") else None

        history.append(
            {
                "id": str(asset.id),
                "url": url,
                "created_at": asset.created_at,
                "original_name": asset.original_name,
                "asset_type": asset.metadata.get("asset_type"),
                "variant_index": asset.metadata.get("variant_index"),
                "mime_type": asset.mime_type,
            }
        )

    return Response({"history": history})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def restore_asset_version_view(request: Request) -> Response:
    """Restore a previous FileAsset as the active BrandAsset.

    POST /api/v1/generative/assets/restore/
    {
        "file_asset_id": "...",
        "project_id": "...",
        "asset_type": "kit_home"
    }
    """
    file_asset_id = request.data.get("file_asset_id")
    project_id = request.data.get("project_id")
    organisation_id = request.data.get("organisation_id")
    asset_type = request.data.get("asset_type")

    if not file_asset_id or not asset_type:
        return Response({"error": "file_asset_id and asset_type required"}, status=400)

    from branding.models import BrandAsset, BrandProfile
    from files.models import FileAsset

    try:
        file_asset = FileAsset.objects.get(id=file_asset_id)
    except FileAsset.DoesNotExist:
        return Response({"error": "FileAsset not found"}, status=404)

    # Find BrandProfile
    organisation = None
    p = None
    if project_id:
        from projects.models import Project

        try:
            try:
                p = Project.objects.get(id=project_id)
            except (ValueError, Exception):
                p = Project.objects.filter(slug=project_id).first()

            if p:
                organisation = p.organisation
        except:  # noqa: E722
            pass
    elif organisation_id:
        from organisations.models import Organisation

        try:
            organisation = Organisation.objects.get(id=organisation_id)
        except:  # noqa: E722
            pass

    if not organisation:
        return Response({"error": "Context required"}, status=400)

    brand_profile = BrandProfile.get_effective_brand(
        organisation=organisation, project=p if project_id else None
    )

    if not brand_profile:
        return Response({"error": "BrandProfile not found"}, status=404)

    # Update BrandAsset
    BrandAsset.objects.update_or_create(
        profile=brand_profile,
        asset_type=asset_type,
        defaults={
            "file": file_asset,
            "is_active": True,
            "alt_text": f"Restored version: {file_asset.original_name}",
        },
    )

    return Response({"status": "restored", "url": str(file_asset.id)})
