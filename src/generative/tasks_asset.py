"""Celery tasks for AI asset generation (images & videos).

Routes all AI provider calls through a rate-limited Celery queue to prevent
API overload and reduce costs. Replaces the previous threading.Thread approach.

Queue: ai_generation (concurrency=1 in production)
- Images: sequential Gemini calls with inter-request delay
- Videos: sequential MiniMax/Veo calls, one at a time

All jobs are tracked in Django cache (Redis) with full workflow metadata
including provider, cost estimates, duration, and retry history.
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger("generative.tasks.asset")

# ─── Cache keys ───────────────────────────────────────────────────────
# Use the SAME prefix as views_asset.py so the status endpoint works.
TASK_CACHE_PREFIX = "video_task:"
TASK_TTL = 1800  # 30 min (same as views_asset.py _TASK_MAX_AGE)
SEMAPHORE_KEY = "gen_semaphore:{provider}"


def _sync_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    error: str = "",
    output_url: str = "",
    output_variants: list | None = None,
) -> None:
    """Update GenerationJob DB record to match cache status.

    Silently ignores DB errors — cache remains the live source of truth.
    """
    try:
        import uuid
        from .models import GenerationJob
        from django.utils import timezone

        try:
            job = GenerationJob.objects.get(task_id=uuid.UUID(job_id))
        except GenerationJob.DoesNotExist:
            return  # Job may have been created before this feature was deployed

        job.status = status
        job.progress = progress
        update_fields = ["status", "progress", "updated_at"]

        if status in ("completed", "failed", "cancelled"):
            job.completed_at = timezone.now()
            update_fields.append("completed_at")

        if status == "completed":
            job.approval_status = GenerationJob.ApprovalStatus.PENDING_REVIEW
            update_fields.append("approval_status")

        if error:
            job.error_message = error[:2000]
            update_fields.append("error_message")

        if output_url and not job.output_url:
            job.output_url = output_url
            update_fields.append("output_url")

        if output_variants is not None:
            job.output_variants = output_variants
            update_fields.append("output_variants")

        job.save(update_fields=update_fields)
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to sync GenerationJob %s to status %s: %s", job_id, status, e)


SEMAPHORE_TTL = 600  # 10 min max hold

# ─── Provider concurrency limits ─────────────────────────────────────
PROVIDER_CONCURRENCY = {
    "gemini": 2,  # max 2 concurrent Gemini (image) calls
    "minimax": 2,  # max 2 concurrent MiniMax (video) calls
    "runway": 2,  # max 2 concurrent Runway Gen (video) calls
    "pika": 2,  # max 2 concurrent Pika 2.2 (video) calls via fal.ai
    "veo": 1,  # max 1 concurrent Veo (video) call
}

# ─── Inter-request delay (seconds) ───────────────────────────────────
PROVIDER_DELAY = {
    "gemini": 1.0,  # 1s between Gemini image variants
    "minimax": 2.0,  # 2s between MiniMax calls
    "runway": 2.0,  # 2s between Runway calls
    "pika": 2.0,  # 2s between Pika calls
    "veo": 2.0,  # 2s between Veo calls
}


def set_job(job_id: str, data: dict[str, Any]) -> None:
    """Store generation job data in cache."""
    data.setdefault("_created", time.time())
    data.setdefault("_updated", time.time())
    data["_updated"] = time.time()
    cache.set(f"{TASK_CACHE_PREFIX}{job_id}", data, timeout=TASK_TTL)


def get_job(job_id: str) -> dict[str, Any] | None:
    """Retrieve generation job data from cache."""
    return cache.get(f"{TASK_CACHE_PREFIX}{job_id}")


def _acquire_semaphore(provider: str, job_id: str, timeout: int = 300) -> bool:
    """Acquire a Redis-based semaphore for provider-level concurrency control.

    Uses a simple Redis SETNX approach. Returns True if acquired.
    """
    key = SEMAPHORE_KEY.format(provider=provider)
    max_concurrent = PROVIDER_CONCURRENCY.get(provider, 1)

    # For concurrency=1, use simple key lock
    if max_concurrent <= 1:
        acquired = cache.add(key, job_id, timeout=SEMAPHORE_TTL)
        if acquired:
            return True
        # Check if stale
        holder = cache.get(key)
        if holder and isinstance(holder, str):
            holder_job = get_job(holder)
            if holder_job and holder_job.get("status") in ("completed", "failed"):
                cache.delete(key)
                return cache.add(key, job_id, timeout=SEMAPHORE_TTL)
        return False

    # For concurrency>1, use a counter
    counter_key = f"{key}:count"
    current = cache.get(counter_key) or 0
    if int(current) < max_concurrent:
        cache.set(counter_key, int(current) + 1, timeout=SEMAPHORE_TTL)
        return True
    return False


def _release_semaphore(provider: str, job_id: str) -> None:
    """Release the provider semaphore."""
    key = SEMAPHORE_KEY.format(provider=provider)
    max_concurrent = PROVIDER_CONCURRENCY.get(provider, 1)

    if max_concurrent <= 1:
        holder = cache.get(key)
        if holder == job_id:
            cache.delete(key)
    else:
        counter_key = f"{key}:count"
        current = cache.get(counter_key) or 1
        new_val = max(0, int(current) - 1)
        if new_val == 0:
            cache.delete(counter_key)
        else:
            cache.set(counter_key, new_val, timeout=SEMAPHORE_TTL)


# ═════════════════════════════════════════════════════════════════════
# Celery tasks
# ═════════════════════════════════════════════════════════════════════


@shared_task(
    bind=True,
    name="generative.tasks.generate_asset_task",
    max_retries=2,
    soft_time_limit=900,  # 15 min soft limit
    time_limit=960,  # 16 min hard limit
    rate_limit="6/m",  # max 6 tasks per minute from this queue
    acks_late=True,
)
def generate_asset_task(
    self,
    *,
    job_id: str,
    template_id: str,
    params: dict[str, str],
    input_images_b64: dict[str, str],
    variant_count: int,
    output_type: str,  # "image" or "video"
    user_id: int | None = None,
    organisation_id: str | None = None,
    storage_context: dict[str, Any] | None = None,
    provider: str | None = None,
) -> dict[str, Any]:
    """Process an AI asset generation job through the rate-limited queue.

    Images: calls Gemini sequentially per variant with delay.
    Videos: calls MiniMax/Runway/Veo with provider semaphore.

    All status updates are written to cache for frontend polling.
    """
    from django.db import close_old_connections

    close_old_connections()

    # Determine provider for queue management
    if provider and output_type == "video":
        effective_provider = provider
    elif output_type == "video":
        effective_provider = "minimax"  # default video provider
    else:
        effective_provider = "gemini"

    set_job(
        job_id,
        {
            "status": "queued",
            "progress": 5,
            "message": f"Job queued for {effective_provider}...",
            "provider": effective_provider,
            "output_type": output_type,
            "template_id": template_id,
            "variant_count": variant_count,
        },
    )

    # ── Wait for semaphore (up to 9 min) ──
    acquired = False
    wait_start = time.time()
    while time.time() - wait_start < 540:
        if _acquire_semaphore(effective_provider, job_id):
            acquired = True
            break
        set_job(
            job_id,
            {
                "status": "waiting",
                "progress": 5,
                "message": f"Waiting for {effective_provider} slot (queue)...",
                "provider": effective_provider,
                "output_type": output_type,
                "template_id": template_id,
            },
        )
        time.sleep(3)

    if not acquired:
        set_job(
            job_id,
            {
                "status": "failed",
                "error": f"Timed out waiting for {effective_provider} slot after 9 minutes",
                "provider": effective_provider,
            },
        )
        _sync_job_status(job_id, "failed", error="Queue timeout after 9 minutes")
        return {"status": "failed", "error": "Queue timeout"}

    try:
        # Decode base64 images back to bytes
        input_images: dict[str, bytes] = {}
        for key, b64 in input_images_b64.items():
            try:
                if "," in b64:
                    b64 = b64.split(",", 1)[1]
                input_images[key] = base64.b64decode(b64)
            except Exception:
                logger.warning("Failed to decode input image %s", key)

        if output_type == "video":
            return _process_video(
                self,
                job_id=job_id,
                template_id=template_id,
                params=params,
                input_images=input_images,
                variant_count=variant_count,
                user_id=user_id,
                organisation_id=organisation_id,
                storage_context=storage_context or {},
                provider=effective_provider,
                explicit_provider=provider,
            )
        else:
            return _process_images(
                self,
                job_id=job_id,
                template_id=template_id,
                params=params,
                input_images=input_images,
                variant_count=variant_count,
                user_id=user_id,
                organisation_id=organisation_id,
                storage_context=storage_context or {},
                provider=effective_provider,
            )
    except Exception as exc:
        logger.exception("Asset generation failed for job %s: %s", job_id, exc)
        set_job(
            job_id,
            {
                "status": "failed",
                "error": str(exc),
                "provider": effective_provider,
            },
        )
        _sync_job_status(job_id, "failed", error=str(exc))
        # Retry transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))
        return {"status": "failed", "error": str(exc)}
    finally:
        _release_semaphore(effective_provider, job_id)


def _process_images(
    task,
    *,
    job_id: str,
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    variant_count: int,
    user_id: int | None,
    organisation_id: str | None,
    storage_context: dict[str, Any],
    provider: str,
) -> dict[str, Any]:
    """Generate images via Gemini, upload all variants to storage, store in DB."""
    from .services.asset_pipeline import generate_asset

    set_job(
        job_id,
        {
            "status": "processing",
            "progress": 15,
            "message": f"Generating {variant_count} image variant(s) via Gemini...",
        },
    )

    t0 = time.time()
    results = generate_asset(
        template_id=template_id,
        params=params,
        input_images=input_images,
        variant_count=variant_count,
    )
    elapsed = time.time() - t0

    # Upload each variant to persistent storage (S3 / Django default storage)
    from .views_asset import _upload_image_bytes_to_storage

    membership_id = storage_context.get("membership_id")
    project_id = storage_context.get("project_id")

    variants = []
    db_variants: list[dict] = []
    for r in results:
        image_b64: str | None = r.get("image_base64")
        mime_type: str = r.get("mime_type") or "image/png"
        filename: str = r.get("filename") or f"generated_{r.get('variant_index', 0)}.png"
        variant_index: int = r.get("variant_index", 0)

        # Decode and upload to persistent storage
        storage_info: dict = {}
        if image_b64:
            try:
                img_bytes = base64.b64decode(image_b64)
                storage_info = _upload_image_bytes_to_storage(
                    image_bytes=img_bytes,
                    filename=filename,
                    mime_type=mime_type,
                    variant_index=variant_index,
                    template_id=template_id,
                    template_type=params.get("template_type", "output"),
                    template_subtype=params.get("template_subtype", ""),
                    membership_id=membership_id,
                    organisation_id=organisation_id,
                    project_id=project_id,
                )
                logger.info(
                    "Image variant %d uploaded → %s",
                    variant_index,
                    storage_info.get("storage_path", "?"),
                )
            except Exception as upload_err:
                logger.warning("Failed to upload image variant %d: %s", variant_index, upload_err)

        variants.append(
            {
                "variant_index": variant_index,
                "image_base64": image_b64,  # keep in cache for immediate display
                "mime_type": mime_type,
                "filename": filename,
                "error": r.get("error"),
                "metadata": r.get("metadata"),
                "presigned_url": storage_info.get("presigned_url"),
                "storage_path": storage_info.get("storage_path"),
                "file_asset_id": storage_info.get("file_asset_id"),
            }
        )

        # Build lean DB variant record (no base64, storage_path is permanent)
        if not r.get("error"):
            db_variants.append(
                {
                    "variant_index": variant_index,
                    "storage_path": storage_info.get("storage_path", ""),
                    "file_asset_id": storage_info.get("file_asset_id"),
                    "mime_type": mime_type,
                    "filename": filename,
                    "approved": None,  # None = not yet reviewed
                }
            )

    # Store in the SAME format as _run_video_generation uses
    set_job(
        job_id,
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

    # Pick first non-error variant's presigned URL as primary output_url
    _primary_url = next((v.get("presigned_url") or "" for v in variants if not v.get("error")), "")
    _sync_job_status(
        job_id,
        "completed",
        progress=100,
        output_url=_primary_url,
        output_variants=db_variants,
    )

    logger.info(
        "Image generation job %s completed: %d variants in %.1fs (uploaded to storage)",
        job_id,
        len(results),
        elapsed,
    )

    return {
        "status": "completed",
        "job_id": job_id,
        "variant_count": len(variants),
        "elapsed_seconds": round(elapsed, 2),
    }


def _process_video(
    task,
    *,
    job_id: str,
    template_id: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    variant_count: int,
    user_id: int | None,
    organisation_id: str | None,
    storage_context: dict[str, Any],
    provider: str,
    explicit_provider: str | None = None,
) -> dict[str, Any]:
    """Generate video via MiniMax/Runway/Veo with status tracking.

    Re-uses the full S3 upload logic from _run_video_generation in views_asset.py.
    """
    from .services.asset_pipeline import generate_video

    set_job(
        job_id,
        {
            "status": "processing",
            "progress": 10,
            "message": f"Calling video provider ({provider})…",
        },
    )

    t0 = time.time()
    result = generate_video(
        template_id=template_id,
        params=params,
        input_images=input_images,
        user_id=user_id,
        organisation_id=organisation_id,
        context=storage_context,
        variant_count=variant_count,
        provider=explicit_provider,
    )
    elapsed = time.time() - t0

    if result.get("error"):
        set_job(
            job_id,
            {
                "status": "failed",
                "error": result["error"],
            },
        )
        _sync_job_status(job_id, "failed", error=result["error"])
        return {"status": "failed", "error": result["error"]}

    set_job(
        job_id,
        {
            "status": "processing",
            "progress": 75,
            "message": "Uploading video to storage…",
        },
    )

    # ── Process variants (S3 storage + presigned URLs) ──────────────
    # Re-use the full upload logic from _run_video_generation
    from .views_asset import _run_video_upload

    variants = _run_video_upload(
        task_id=job_id,
        template_id=template_id,
        params=params,
        result=result,
        organisation_id=organisation_id,
        storage_context=storage_context,
    )

    # Extract content duration from provider metadata (video length in seconds)
    _content_duration = result.get("metadata", {}).get("duration_seconds")

    # Store in the status format
    set_job(
        job_id,
        {
            "status": "completed",
            "progress": 100,
            "data": {
                "template_id": template_id,
                "variant_count": len(variants),
                "variants": variants,
                "content_duration_seconds": _content_duration,
            },
        },
    )
    # Persist the first variant's URL for review modal (survives Redis TTL)
    _primary_url = next(
        (
            v.get("presigned_url", "") or v.get("video_url", "") or ""
            for v in variants
            if not v.get("error")
        ),
        "",
    )
    # Build lean DB variant records (storage_path is permanent; presigned URLs re-generated)
    db_variants = [
        {
            "variant_index": v.get("variant_index", i),
            "storage_path": v.get("storage_path", ""),
            "file_asset_id": v.get("file_asset_id"),
            "mime_type": v.get("mime_type", "video/mp4"),
            "filename": v.get("filename"),
            "approved": None,
            "content_duration_seconds": _content_duration,
        }
        for i, v in enumerate(variants)
        if not v.get("error")
    ]
    _sync_job_status(
        job_id,
        "completed",
        progress=100,
        output_url=_primary_url,
        output_variants=db_variants,
    )

    logger.info("Video generation job %s completed in %.1fs", job_id, elapsed)

    return {
        "status": "completed",
        "job_id": job_id,
        "variant_count": len(variants),
        "elapsed_seconds": round(elapsed, 2),
    }
