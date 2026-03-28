"""Generation job management views — status polling, listing, review."""
from __future__ import annotations

import logging
import time
from typing import Any

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from ._asset_helpers import (
    _MODEL_LOOKUP,
    _auto_dispatch_rvm_processing,
    _get_model_cost_usd,
    _get_task,
    _propagate_approved_guest_avatar_to_project,
    _propagate_approved_image_to_brand,
    _propagate_approved_image_to_membership,
    _propagate_approved_video_to_membership,
    _set_task,
)

logger = logging.getLogger("generative.views.asset")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def generation_task_status_view(request: Request, task_id: str) -> Response:
    """Poll for async generation status (images + videos).

    All AI generation now goes through the Celery ai_generation queue.
    Frontend polls this endpoint for both image and video tasks.

    Returns:
        - 200 with status "queued" / "waiting" / "processing" / "completed" / "failed"
        - 404 if task_id is unknown (expired or never existed)
    """
    task = _get_task(task_id)
    if task is None:
        return Response(
            {"error": "Task not found or expired", "task_id": task_id},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Don't leak internal keys
    clean = {
        "task_id": task_id,
        "status": task.get("status", "unknown"),
        "progress": task.get("progress", 0),
    }

    if task.get("status") == "completed":
        clean["data"] = task.get("data", {})
    elif task.get("status") == "failed":
        clean["error"] = task.get("error", "Unknown error")
    elif task.get("status") == "retrying":
        clean["error"] = task.get("error", "")
        clean["message"] = task.get("message", "Wordt automatisch opnieuw geprobeerd…")
        clean["retry_attempt"] = task.get("retry_attempt", 0)
        clean["retry_max"] = task.get("retry_max", 3)
    elif task.get("message"):
        clean["message"] = task["message"]

    return Response(clean)


# =============================================================================
# Generation Job List — Workflow Queue UI
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_generation_jobs_view(request: Request) -> Response:
    """List AI generation jobs for the Workflow Queue UI.

    GET /api/v1/generative/jobs/

    Query params:
      - status: comma-separated statuses to filter (e.g. queued,processing,completed)
      - project_id: filter to a specific project
      - limit: max results (default 50)

    Returns newest-first list of GenerationJob records, enriched with
    live cache status when available (for real-time progress).
    """
    from .models import GenerationJob

    qs = GenerationJob.objects.all().order_by("-created_at")

    # Filter by user when authenticated (non-admin sees only own jobs)
    if request.user and request.user.is_authenticated and not request.user.is_staff:
        qs = qs.filter(created_by_id=request.user.id)

    # Filter by status
    status_param = request.query_params.get("status", "")
    if status_param:
        statuses = [s.strip() for s in status_param.split(",") if s.strip()]
        qs = qs.filter(status__in=statuses)

    # Filter by project
    project_id_param = request.query_params.get("project_id", "")
    if project_id_param:
        # Resolve slug → canonical UUID so filtering matches stored records
        resolved_project_id = project_id_param
        if not str(project_id_param).isdigit():
            try:
                from projects.models import Project

                _proj = Project.objects.only("id").get(slug=project_id_param)
                resolved_project_id = f"00000000-0000-0000-0000-{_proj.id:012d}"
            except Exception:  # noqa: BLE001
                pass
        # Match both the resolved canonical ID and the raw slug (legacy records)
        from django.db.models import Q

        qs = qs.filter(Q(project_id=resolved_project_id) | Q(project_id=project_id_param))

    # Filter by membership
    membership_id_param = request.query_params.get("membership_id", "")
    if membership_id_param:
        qs = qs.filter(membership_id=membership_id_param)

    limit = min(int(request.query_params.get("limit", 50)), 200)
    jobs = list(qs[:limit])

    # ── Resolve project + membership names for directory display ────────
    _project_ids = {j.project_id for j in jobs if j.project_id}
    _project_name_map: dict[str, str] = {}
    _project_parent_map: dict[str, str | None] = {}  # project_id → parent project name (club)
    if _project_ids:
        try:
            from projects.models import Project

            # Try matching on id, slug, and canonical UUID variants
            from django.db.models import Q

            q = Q()
            for pid in _project_ids:
                q |= Q(id__iexact=pid) | Q(slug=pid)
                # Handle canonical UUID format: 00000000-0000-0000-0000-000000000123
                if str(pid).isdigit():
                    canonical = f"00000000-0000-0000-0000-{int(pid):012d}"
                    q |= Q(id__iexact=canonical)
            for p in (
                Project.objects.filter(q)
                .select_related("parent_project")
                .only("id", "name", "slug", "parent_project__id", "parent_project__name")
            ):
                _project_name_map[str(p.id)] = p.name
                _project_name_map[p.slug] = p.name
                _project_parent_map[str(p.id)] = p.parent_project.name if p.parent_project else None
                _project_parent_map[p.slug] = p.parent_project.name if p.parent_project else None
        except Exception:  # noqa: BLE001
            pass

    _membership_ids = {j.membership_id for j in jobs if j.membership_id}
    _membership_name_map: dict[str, str] = {}
    if _membership_ids:
        try:
            from projects.models import ProjectMembership

            for m in (
                ProjectMembership.objects.filter(id__in=_membership_ids)
                .select_related("user")
                .only("id", "user__first_name", "user__last_name")
            ):
                full = f"{m.user.first_name or ''} {m.user.last_name or ''}".strip()
                _membership_name_map[str(m.id)] = full or f"Member {m.id}"
        except Exception:  # noqa: BLE001
            pass

    # Enrich active jobs with live cache progress
    results = []
    # Storage backend — reused across all jobs to avoid repeated instantiation
    _storage_backend = None

    def _get_fresh_url(storage_path: str) -> str:
        """Generate a fresh presigned/permanent URL from a stored storage path."""
        nonlocal _storage_backend
        if not storage_path:
            return ""
        try:
            if _storage_backend is None:
                from files.utils import get_storage_backend

                _storage_backend = get_storage_backend()
            try:
                return _storage_backend.get_url(storage_path, signed=True)
            except Exception:
                return (
                    _storage_backend.url(storage_path) if hasattr(_storage_backend, "url") else ""
                )
        except Exception:
            return ""

    for job in jobs:
        live = _get_task(str(job.task_id)) if job.is_active else None

        # For completed jobs, also try cache to backfill output_url (legacy path)
        if (
            not live
            and job.status == "completed"
            and not job.output_url
            and not job.output_variants
        ):
            live_completed = _get_task(str(job.task_id))
            if live_completed and live_completed.get("status") == "completed":
                variants = live_completed.get("data", {}).get("variants", [])
                url = next(
                    (
                        v.get("presigned_url", "") or v.get("video_url", "") or ""
                        for v in variants
                        if not v.get("error")
                    ),
                    "",
                )
                if url:
                    try:
                        job.output_url = url
                        job.save(update_fields=["output_url"])
                    except Exception:
                        pass

        # Build output_variants list with fresh presigned URLs
        fresh_variants: list[dict] = []
        for v in job.output_variants or []:
            fresh_url = _get_fresh_url(v.get("storage_path", ""))
            fresh_variants.append(
                {
                    "variant_index": v.get("variant_index", 0),
                    "storage_path": v.get("storage_path", ""),
                    "presigned_url": fresh_url,
                    "file_asset_id": v.get("file_asset_id"),
                    "mime_type": v.get("mime_type", ""),
                    "filename": v.get("filename", ""),
                    "approved": v.get("approved"),  # None/True/False per-variant
                }
            )

        # Primary output_url: prefer first approved or first available variant's fresh URL
        primary_url = job.output_url or ""
        if fresh_variants:
            first_fresh = next(
                (fv["presigned_url"] for fv in fresh_variants if fv["presigned_url"]),
                "",
            )
            if first_fresh:
                primary_url = first_fresh

        # ── AI metadata: provider, model, duration ──────────────────────
        ai_provider = (live or {}).get("provider", "")
        if not ai_provider:
            # Infer provider from output_type when cache is expired
            ai_provider = "gemini" if job.output_type == "image" else "minimax"

        # Model name inference — prefer model from job metadata, then provider default
        _provider_model_map = {
            "gemini": "nano-banana-pro-preview",
            "minimax": "video-01",
            "runway": "gen4_turbo",
            "pika": "pika-2.2",
            "veo": "veo-3.1-fast",
        }
        ai_model_id = _provider_model_map.get(ai_provider, "")
        # Try to get the actual model from live cache or job metadata
        if live:
            ai_model_id = (live.get("data") or {}).get("model") or live.get("model") or ai_model_id
        # Look up display label from registry
        _reg_entry = _MODEL_LOOKUP.get(ai_model_id)
        ai_model = _reg_entry["label"] if _reg_entry else ai_model_id

        # Processing duration (time from creation to completion)
        duration_seconds: float | None = None
        if job.completed_at and job.created_at:
            duration_seconds = round((job.completed_at - job.created_at).total_seconds(), 1)

        # Content duration (video length in seconds) — from cache or persisted variants
        content_duration: float | None = None
        if live:
            content_duration = (live.get("data") or {}).get("content_duration_seconds")
        if content_duration is None and job.output_variants:
            for _v in job.output_variants:
                if _v.get("content_duration_seconds") is not None:
                    content_duration = _v["content_duration_seconds"]
                    break
        # Default content duration for known video providers (when not persisted)
        if content_duration is None and job.output_type == "video" and job.status == "completed":
            _default_content_dur = {"minimax": 6, "runway": 5, "pika": 5, "veo": 4}
            content_duration = _default_content_dur.get(ai_provider)

        # ── Token & Cost estimation (based on provider documentation) ────
        #
        # Gemini (image gen via nano-banana-pro-preview):
        #   Input:  ~200 text tokens + 560 tokens per input image
        #   Output: 1290 tokens per generated image (at $30/1M tokens)
        #   Analysis step (kit analysis via gemini-2.0-flash): +760 in, +375 out
        #   Source: https://ai.google.dev/gemini-api/docs/pricing
        #
        # MiniMax Video-01: $0.05/video (fixed per video, ~6s output)
        # Runway Gen-4 Turbo: ~5 credits/s, ~$0.096/s at standard rate
        # Pika 2.2 via fal.ai: ~$0.05/s
        # Veo 3.1 Fast: $0.15/video (720p/1080p)
        # EUR conversion: ×0.92
        # ─────────────────────────────────────────────────────────────────

        _variant_ct = len(fresh_variants) or (live or {}).get("variant_count") or 1

        # Input image count per template (for Gemini token estimation)
        _tpl_input_images: dict[str, int] = {
            "logo_standardize": 1,
            "sponsor_standardize": 1,
            "location_standardize": 1,
            "tenue_generate": 3,
            "legacy_tenue_generate": 3,
            "keeper_tenue": 3,
            "tracksuit_generate": 2,
            "coach_outfit": 3,
            "fullbody_in_tenue": 4,
            "closeup_in_tenue": 4,
        }
        # Templates that trigger a Gemini Flash kit-analysis step
        _tpls_with_analysis = {
            "tenue_generate",
            "legacy_tenue_generate",
            "keeper_tenue",
            "tracksuit_generate",
            "coach_outfit",
            "fullbody_in_tenue",
            "closeup_in_tenue",
        }

        est_input_tokens: int | None = None
        est_output_tokens: int | None = None
        estimated_cost_eur: float | None = None

        if ai_provider == "gemini":
            # Gemini image generation — token-based pricing
            n_imgs = _tpl_input_images.get(job.template_id or "", 2)
            has_analysis = (job.template_id or "") in _tpls_with_analysis

            # Per-variant: ~200 prompt tokens + 560 per input image
            in_per_variant = 200 + (n_imgs * 560)
            out_per_variant = 1290  # 1 output image = 1290 tokens

            # Analysis step: prompt (~200 tok) + 1 image (560 tok) → ~375 output
            analysis_in = 760 if has_analysis else 0
            analysis_out = 375 if has_analysis else 0

            est_input_tokens = analysis_in + (in_per_variant * _variant_ct)
            est_output_tokens = analysis_out + (out_per_variant * _variant_ct)

            # Cost: input at $0.10/1M, image-output at $30/1M → convert to EUR
            cost_usd = est_input_tokens * 0.10 / 1_000_000 + est_output_tokens * 30.0 / 1_000_000
            estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "minimax":
            # Use model registry for model-specific pricing
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "runway":
            # Use model registry — picks up gen4 vs gen4_turbo pricing
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "pika":
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        elif ai_provider == "veo":
            cost_usd = _get_model_cost_usd(ai_provider, ai_model_id, _variant_ct, content_duration)
            if cost_usd is not None:
                estimated_cost_eur = round(cost_usd * 0.92, 4)

        results.append(
            {
                "task_id": str(job.task_id),
                "template_id": job.template_id,
                "label": job.label,
                "output_type": job.output_type,
                "output_asset_type": job.output_asset_type,
                "project_id": job.project_id,
                "membership_id": job.membership_id,
                "status": live.get("status", job.status) if live else job.status,
                "progress": live.get("progress", job.progress) if live else job.progress,
                "message": live.get("message", "") if live else "",
                "error_message": live.get("error", job.error_message)
                if live
                else job.error_message,
                "approval_status": job.approval_status,
                "output_url": primary_url,
                "output_variants": fresh_variants,
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                # AI metadata
                "provider": ai_provider,
                "model": ai_model,
                "duration_seconds": duration_seconds,
                "content_duration_seconds": content_duration,
                "estimated_cost_eur": estimated_cost_eur,
                "estimated_input_tokens": est_input_tokens,
                "estimated_output_tokens": est_output_tokens,
                "variant_count": len(fresh_variants) or (live or {}).get("variant_count"),
                # Resolved names for directory display
                "project_name": _project_name_map.get(job.project_id or "", ""),
                "club_name": _project_parent_map.get(job.project_id or "", "") or "",
                "membership_name": _membership_name_map.get(job.membership_id or "", ""),
            }
        )

    return Response(
        {
            "count": len(results),
            "results": results,
        }
    )


# =============================================================================
# Generation Job Counts — lightweight aggregate for queue badges
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def generation_job_counts_view(request: Request) -> Response:
    """Return aggregated status counts for AI generation jobs.

    GET /api/v1/generative/jobs/counts/

    This is a lightweight alternative to list_generation_jobs_view designed
    for queue badge/tab counts.  It performs a single DB aggregation query
    instead of loading, enriching and serialising every job.

    Response shape::

        {
            "ai_review": 3,
            "ai_active": 1,
            "ai_approved": 12,
            "ai_rejected": 0,
            "ai_total": 16
        }
    """
    from django.db.models import Count, Q

    from .models import GenerationJob

    qs = GenerationJob.objects.all()

    # Non-admin users only see their own jobs (same rule as list endpoint)
    if request.user and request.user.is_authenticated and not request.user.is_staff:
        qs = qs.filter(created_by_id=request.user.id)

    agg = qs.aggregate(
        review=Count(
            "id",
            filter=Q(status="completed")
            & (Q(approval_status="pending_review") | Q(approval_status__isnull=True)),
        ),
        active=Count(
            "id",
            filter=Q(status__in=["queued", "waiting", "processing", "retrying"]),
        ),
        approved=Count("id", filter=Q(approval_status="approved")),
        rejected=Count("id", filter=Q(approval_status="rejected")),
        failed=Count("id", filter=Q(status__in=["failed", "cancelled"])),
        total=Count("id"),
    )

    return Response(
        {
            "ai_review": agg["review"],
            "ai_active": agg["active"],
            "ai_approved": agg["approved"],
            "ai_rejected": agg["rejected"],
            "ai_failed": agg["failed"],
            "ai_total": agg["total"],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def review_generation_job_view(request: Request, task_id: str) -> Response:
    """Approve or reject a completed AI generation job (or a specific variant).

    POST /api/v1/generative/jobs/<task_id>/review/
    Body:
        {"action": "approve" | "reject"}                    — whole job
        {"action": "approve", "variant_index": 0}           — approve specific variant
        {"action": "approve", "variant_indices": [0, 2]}    — approve multiple variants
    """
    from .models import GenerationJob
    from django.utils import timezone

    try:
        job = GenerationJob.objects.get(task_id=task_id)
    except GenerationJob.DoesNotExist:
        return Response({"error": "Job not found"}, status=status.HTTP_404_NOT_FOUND)

    action = (request.data or {}).get("action", "")
    if action not in ("approve", "reject"):
        return Response(
            {"error": "action must be 'approve' or 'reject'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if job.status != GenerationJob.Status.COMPLETED:
        return Response(
            {"error": f"Cannot review a job with status '{job.status}'"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Determine if this is a per-variant review
    body = request.data or {}
    variant_index = body.get("variant_index")
    variant_indices = body.get("variant_indices")

    # Build set of targeted variant indices (None = whole job)
    targeted_indices: set[int] | None = None
    if variant_indices is not None:
        targeted_indices = {int(vi) for vi in variant_indices}
    elif variant_index is not None:
        targeted_indices = {int(variant_index)}

    update_fields = ["reviewed_at", "reviewed_by_id", "updated_at"]
    job.reviewed_at = timezone.now()
    if request.user and request.user.is_authenticated:
        job.reviewed_by_id = request.user.id

    if targeted_indices is not None and job.output_variants:
        # Per-variant approval — update individual variant's `approved` flag
        updated = []
        for v in job.output_variants:
            vi = v.get("variant_index", 0)
            if vi in targeted_indices:
                v = dict(v)  # copy
                v["approved"] = action == "approve"
            updated.append(v)
        job.output_variants = updated
        update_fields.append("output_variants")

        # Also roll up job approval_status:
        # approved if any variant approved, rejected if all rejected or no approved
        any_approved = any(v.get("approved") is True for v in updated)
        all_rejected = all(
            v.get("approved") is False for v in updated if v.get("approved") is not None
        )
        if any_approved:
            job.approval_status = GenerationJob.ApprovalStatus.APPROVED
        elif all_rejected:
            job.approval_status = GenerationJob.ApprovalStatus.REJECTED
        # else remains pending_review if mixed
        update_fields.append("approval_status")
    else:
        # Whole-job approval
        job.approval_status = (
            GenerationJob.ApprovalStatus.APPROVED
            if action == "approve"
            else GenerationJob.ApprovalStatus.REJECTED
        )
        # Mark all variants as approved/rejected too
        if job.output_variants:
            job.output_variants = [
                {**v, "approved": action == "approve"} for v in job.output_variants
            ]
            update_fields.append("output_variants")
        update_fields.append("approval_status")

    job.save(update_fields=list(set(update_fields)))

    # Propagate approved video to membership metadata so the member page reflects it
    if action == "approve" and job.output_type == "video":
        try:
            _propagate_approved_video_to_membership(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # Propagate approved image (fullbody_in_tenue, etc.) to membership metadata
    if action == "approve" and job.output_type == "image":
        try:
            _propagate_approved_image_to_membership(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: image propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # Propagate approved image to BrandAsset (kits, logos, etc.) so the Assets page reflects it
    if action == "approve" and job.output_type == "image":
        try:
            _propagate_approved_image_to_brand(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: brand propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # Propagate approved guest_player avatar to Project.metadata so the season page reflects it
    if action == "approve" and (job.output_asset_type or "").startswith("guest_player"):
        try:
            _propagate_approved_guest_avatar_to_project(job)
        except Exception as propagate_exc:  # noqa: BLE001
            logger.warning(
                "review_generation_job_view: guest avatar propagation failed for job %s: %s",
                task_id,
                propagate_exc,
            )

    # B64: Publish approval decided event
    try:
        from rtc_websockets.events import (
            ApprovalDecidedPayload,
            EventType,
            build_event,
        )
        from rtc_websockets.services import RealtimeEventPublisher

        publisher = RealtimeEventPublisher()
        reviewer = request.user if request.user and request.user.is_authenticated else None
        event = build_event(
            EventType.APPROVAL_DECIDED,
            ApprovalDecidedPayload(
                content_item_id=int(str(job.task_id)[:8], 16) if job.task_id else 0,
                project_id=job.project_id or 0,
                decision="approved" if action == "approve" else "rejected",
                reviewer_name=(reviewer.get_full_name() or reviewer.username)
                if reviewer
                else "system",
            ),
            actor_id=reviewer.id if reviewer else None,
        )
        if job.project_id:
            publisher.publish_to_project(job.project_id, event)
    except Exception:
        pass

    return Response(
        {
            "task_id": str(job.task_id),
            "approval_status": job.approval_status,
            "output_variants": job.output_variants or [],
            "reviewed_at": job.reviewed_at.isoformat() if job.reviewed_at else None,
        }
    )
