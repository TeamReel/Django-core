"""Celery tasks for B34 Generative Pipelines.

WP04: Async Processing & Retry Logic

Key goals:
- Execute GenerationRequest asynchronously via Celery
- Retry transient errors with exponential backoff
- Enforce max retry attempts
- Preserve idempotency for duplicate task invocations
"""

from __future__ import annotations

import asyncio
import logging
import time
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Coroutine, TypeVar

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

# Base types are safe to import (no external dependencies)
from src.generative.executors.base import ErrorCategory as ExecutorErrorCategory

# ── AI asset generation tasks (Celery auto-discovery) ──
# This import ensures Celery registers tasks from tasks_asset.py
from src.generative.tasks_asset import generate_asset_task  # noqa: F401

# ExecutorFactory is imported inside task functions to avoid loading openai at Celery startup
if TYPE_CHECKING:
    pass

from src.generative.models import GenerationOutput, GenerationRequest, OutputType, RequestStatus

logger = logging.getLogger("generative.tasks")


DEFAULT_MAX_RETRIES = 5
DEFAULT_BACKOFF_BASE = 2
DEFAULT_UNKNOWN_RETRIES = 1

T = TypeVar("T")


def _run_async(coro: Coroutine[Any, Any, T]) -> T:
    """Run an async coroutine from a sync Celery task."""
    try:
        return asyncio.run(coro)
    except RuntimeError:
        # If an event loop is already running, create a dedicated loop.
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(coro)
        finally:
            try:
                loop.close()
            finally:
                asyncio.set_event_loop(None)


def _map_output_type(output_type: str) -> str:
    normalized = (output_type or "").lower()
    if normalized == "json":
        return OutputType.JSON
    if normalized == "text":
        return OutputType.TEXT
    if normalized == "image":
        return OutputType.IMAGE
    if normalized == "video":
        return OutputType.VIDEO
    return OutputType.TEXT


def _get_retry_config() -> tuple[int, int, int]:
    max_retries = int(getattr(settings, "GENERATIVE_MAX_RETRIES", DEFAULT_MAX_RETRIES))
    backoff_base = int(getattr(settings, "GENERATIVE_BACKOFF_BASE", DEFAULT_BACKOFF_BASE))
    unknown_retries = int(getattr(settings, "GENERATIVE_UNKNOWN_RETRIES", DEFAULT_UNKNOWN_RETRIES))
    return max_retries, backoff_base, unknown_retries


def _should_retry(category: ExecutorErrorCategory, next_attempt: int) -> bool:
    max_retries, _, unknown_retries = _get_retry_config()

    if category == ExecutorErrorCategory.PERMANENT:
        return False

    if category == ExecutorErrorCategory.UNKNOWN:
        return next_attempt <= unknown_retries

    # TRANSIENT
    return next_attempt <= max_retries


def _countdown_seconds(attempt: int) -> int:
    _, backoff_base, _ = _get_retry_config()
    return int(backoff_base**attempt)


def _record_failure_metadata(
    request: GenerationRequest,
    *,
    attempt: int,
    error_message: str,
    category: ExecutorErrorCategory,
) -> None:
    if "retry_history" not in request.metadata:
        request.metadata["retry_history"] = []

    request.metadata["retry_history"].append(
        {
            "attempt": attempt,
            "error": error_message,
            "category": category.value,
            "timestamp": timezone.now().isoformat(),
        }
    )


@shared_task(bind=True, track_started=True)
def process_generation_request(self, request_id: int) -> None:
    """Process a GenerationRequest asynchronously.

    This task is idempotent: if the request is not in PENDING status, it exits.
    """

    # Phase 1: acquire the request + mark processing (quick transaction).
    with transaction.atomic():
        request = (
            GenerationRequest.objects.select_for_update()
            .select_related("template")
            .get(id=request_id)
        )

        if request.status != RequestStatus.PENDING:
            logger.warning(
                "Request %s already handled (status=%s)",
                request_id,
                request.status,
            )
            return

        request.start_processing()

    provider = request.template.pipeline_config.get("provider")
    logger.info("Task started: request=%s provider=%s", request_id, provider)

    # WP06 T045: Inject brand context before execution
    from .services.brand import BrandContextService

    input_data = BrandContextService.inject_brand_context(
        input_data=request.input_data.copy(),
        template_config=request.template.pipeline_config,
        organisation_id=request.template.organisation_id,
    )

    # WP06 T051: Send WebSocket status update (processing started)
    try:
        from .services.websocket import GenerationWebSocketService

        GenerationWebSocketService.send_status_update(request)
    except Exception as ws_error:  # noqa: BLE001
        logger.warning(f"Failed to send WebSocket update: {ws_error}")

    started_monotonic = time.monotonic()

    try:
        # Lazy import to avoid loading openai/langgraph at Celery startup
        from src.generative.executors.factory import ExecutorFactory

        executor = ExecutorFactory.get_executor(request.template.pipeline_config)
        result = _run_async(
            executor.execute(
                template_config=request.template.pipeline_config,
                input_data=input_data,
                brand_context=None,
            )
        )
    except Exception as exc:  # noqa: BLE001
        error_message = str(exc)
        category = ExecutorErrorCategory.UNKNOWN
        try:
            category = executor.classify_error(exc)  # type: ignore[name-defined]
        except Exception:  # noqa: BLE001
            category = ExecutorErrorCategory.UNKNOWN

        logger.error(
            "Task exception: request=%s error=%s category=%s",
            request_id,
            error_message,
            category.value,
            exc_info=True,
        )
        _handle_failure(request_id, error_message=error_message, category=category)
        return

    duration_seconds = round(time.monotonic() - started_monotonic, 4)

    # Phase 2: persist result (transaction).
    if result.success:
        _handle_success(request_id, result=result, duration_seconds=duration_seconds)
    else:
        error_message = result.error_message or "Unknown execution error"
        category = result.error_category or ExecutorErrorCategory.UNKNOWN
        _handle_failure(
            request_id,
            error_message=error_message,
            category=category,
            duration_seconds=duration_seconds,
        )


def _handle_success(request_id: int, *, result: Any, duration_seconds: float) -> None:
    with transaction.atomic():
        request = (
            GenerationRequest.objects.select_for_update()
            .select_related("template", "requester", "project")
            .get(id=request_id)
        )

        if request.status in {
            RequestStatus.COMPLETED,
            RequestStatus.FAILED,
            RequestStatus.CANCELLED,
        }:
            logger.warning("Request %s already finalized (status=%s)", request_id, request.status)
            return

        output_type = _map_output_type(getattr(result, "output_type", "text"))
        text_content = getattr(result, "content", None) or ""
        file_path = getattr(result, "file_path", None)
        file_content = getattr(result, "file_content", None)

        # WP06 T047: Store file outputs via B35 FileStorage
        file_id = None
        if file_content and isinstance(file_content, bytes):
            try:
                from .services.file_storage import GenerationFileService

                # Determine filename and MIME type from output metadata or defaults
                filename = getattr(result, "filename", f"output_{request.id}")
                mime_type = getattr(result, "mime_type", None)

                if not mime_type:
                    # Infer MIME type from output_type
                    mime_type_map = {
                        "image": "image/png",
                        "video": "video/mp4",
                        "audio": "audio/mpeg",
                        "document": "application/pdf",
                    }
                    mime_type = mime_type_map.get(output_type, "application/octet-stream")

                # Build storage context from template and request metadata
                storage_context = {
                    "asset_type": request.template.template_subtype
                    or request.template.template_type
                    or "output",
                }
                # Add context from request input_data if available
                if request.input_data:
                    if request.input_data.get("club_slug"):
                        storage_context["club_slug"] = request.input_data["club_slug"]
                    if request.input_data.get("team_slug"):
                        storage_context["team_slug"] = request.input_data["team_slug"]
                    if request.input_data.get("membership_id"):
                        storage_context["membership_id"] = request.input_data["membership_id"]
                    if request.input_data.get("activity_slug"):
                        storage_context["activity_slug"] = request.input_data["activity_slug"]

                file_id = GenerationFileService.store_output_file(
                    content=file_content,
                    filename=filename,
                    mime_type=mime_type,
                    user_id=request.requester_id,
                    organisation_id=request.template.organisation_id,
                    context=storage_context,
                )

                logger.info(
                    f"🎉 Generation request {request_id} completed!\n"
                    f"   📝 Template: {request.template.name}\n"
                    f"   🖼️  Output Type: {output_type}\n"
                    f"   🆔 File ID: {file_id}\n"
                    f"   📄 Filename: {filename}\n"
                    f"   📊 Size: {len(file_content):,} bytes\n"
                    f"   ⏱️  Duration: {duration_seconds:.2f}s"
                )
                logger.info(
                    "Stored file output",
                    extra={
                        "request_id": request_id,
                        "file_id": file_id,
                        "filename": filename,
                        "size_bytes": len(file_content),
                    },
                )

            except Exception as file_error:  # noqa: BLE001
                logger.error(
                    f"Failed to store file output: {file_error}",
                    extra={"request_id": request_id},
                    exc_info=True,
                )
                # Continue with text fallback
                file_id = None

        elif file_path:
            logger.warning(
                f"file_path returned but no file_content (legacy executor): {file_path}",
                extra={"request_id": request_id},
            )
            # Fail the request if file output expected but no content provided
            if result.output_type in ["image", "video", "audio"]:
                _handle_failure(
                    request_id,
                    error_message="File output expected but no file_content provided",
                    category=ExecutorErrorCategory.PERMANENT,
                    duration_seconds=duration_seconds,
                )
                return

        GenerationOutput.objects.update_or_create(
            request=request,
            defaults={
                "output_type": output_type,
                "text_content": text_content if not file_id else "",
                "file_id": file_id,
                "metadata": getattr(result, "metadata", {}) or {},
            },
        )

        # Store provider execution details for debugging/analytics.
        execution_meta = {
            "provider": request.template.pipeline_config.get("provider"),
            "duration_seconds": duration_seconds,
        }
        execution_meta.update(getattr(result, "metadata", {}) or {})
        request.metadata["execution"] = execution_meta
        request.save(update_fields=["metadata"])

        actual_cost = getattr(result, "actual_cost", None) or Decimal("0")

        # Settle credits with actual cost (WP05)
        if request.transaction_id:
            try:
                from organisations.models import Membership

                from .credit_service import GenerationCreditService

                # Get organisation from user's active membership
                membership = (
                    Membership.objects.filter(user=request.requester, is_active=True)
                    .select_related("organisation")
                    .first()
                )

                if membership:
                    GenerationCreditService.settle_credits(
                        transaction_id=request.transaction_id,
                        actual_amount=actual_cost,
                        user=request.requester,
                        organisation=membership.organisation,
                    )
                else:
                    logger.warning(
                        "Cannot settle credits: user %s has no active membership",
                        request.requester.id,
                    )
            except Exception as e:
                # Log but don't fail the task (credit settlement is not critical)
                logger.error(
                    "Failed to settle credits for request %s: %s",
                    request_id,
                    str(e),
                    exc_info=True,
                )

        request.mark_completed(actual_cost=actual_cost)

        logger.info(
            "Task completed: request=%s cost=%s duration=%ss",
            request_id,
            request.actual_cost,
            duration_seconds,
        )

    # WP06 T051: Send WebSocket status update (completed) - outside transaction
    try:
        from .services.websocket import GenerationWebSocketService

        # Refresh from DB to get updated status
        request.refresh_from_db()
        GenerationWebSocketService.send_status_update(request)
    except Exception as ws_error:  # noqa: BLE001
        logger.warning(f"Failed to send WebSocket update: {ws_error}")


def _handle_failure(
    request_id: int,
    *,
    error_message: str,
    category: ExecutorErrorCategory,
    duration_seconds: float | None = None,
) -> None:
    with transaction.atomic():
        request = (
            GenerationRequest.objects.select_for_update()
            .select_related("template", "requester", "project")
            .get(id=request_id)
        )

        if request.status in {
            RequestStatus.COMPLETED,
            RequestStatus.FAILED,
            RequestStatus.CANCELLED,
        }:
            logger.warning("Request %s already finalized (status=%s)", request_id, request.status)
            return

        next_attempt = request.retry_count + 1
        retry = _should_retry(category, next_attempt)

        if retry:
            # Set error fields temporarily so increment_retry can record them.
            request.error_message = error_message
            request.error_category = category.value
            request.save(update_fields=["error_message", "error_category"])

            request.increment_retry()

            if duration_seconds is not None:
                request.metadata.setdefault("execution", {})
                request.metadata["execution"].update(
                    {
                        "provider": request.template.pipeline_config.get("provider"),
                        "duration_seconds": duration_seconds,
                    }
                )
                request.save(update_fields=["metadata"])

            delay = _countdown_seconds(request.retry_count)
            logger.warning(
                "Retry scheduled: request=%s attempt=%s countdown=%ss category=%s",
                request_id,
                request.retry_count,
                delay,
                category.value,
            )
            process_generation_request.apply_async(args=(request_id,), countdown=delay)
            return

        # Not retrying: record the failure attempt and fail the request.
        request.retry_count = next_attempt
        request.error_message = error_message
        request.error_category = category.value
        _record_failure_metadata(
            request,
            attempt=next_attempt,
            error_message=error_message,
            category=category,
        )

        if duration_seconds is not None:
            request.metadata.setdefault("execution", {})
            request.metadata["execution"].update(
                {
                    "provider": request.template.pipeline_config.get("provider"),
                    "duration_seconds": duration_seconds,
                }
            )

        request.save(update_fields=["retry_count", "error_message", "error_category", "metadata"])

        # Refund credits on permanent failure (WP05)
        if request.transaction_id:
            try:
                from organisations.models import Membership

                from .credit_service import GenerationCreditService

                # Get organisation from user's active membership
                membership = (
                    Membership.objects.filter(user=request.requester, is_active=True)
                    .select_related("organisation")
                    .first()
                )

                if membership:
                    GenerationCreditService.refund_credits(
                        transaction_id=request.transaction_id,
                        reason=f"Request failed: {error_message[:100]}",
                        user=request.requester,
                        organisation=membership.organisation,
                    )
                else:
                    logger.warning(
                        "Cannot refund credits: user %s has no active membership",
                        request.requester.id,
                    )
            except Exception as e:
                # Log but don't fail the task (credit refund is best-effort)
                logger.error(
                    "Failed to refund credits for request %s: %s",
                    request_id,
                    str(e),
                    exc_info=True,
                )

        request.mark_failed(error_message=error_message, error_category=category.value)

        logger.error(
            "Task failed: request=%s attempt=%s category=%s error=%s",
            request_id,
            request.retry_count,
            category.value,
            error_message,
        )

    # WP06 T051: Send WebSocket status update (failed) - outside transaction
    try:
        from .services.websocket import GenerationWebSocketService

        # Refresh from DB to get updated status
        request.refresh_from_db()
        GenerationWebSocketService.send_status_update(request)
    except Exception as ws_error:  # noqa: BLE001
        logger.warning(f"Failed to send WebSocket update: {ws_error}")


# ==============================================================================
# WP07: Operational Cron Tasks
# ==============================================================================


@shared_task(bind=True, name="generative.tasks.cleanup_expired_outputs")
def cleanup_expired_outputs(self):
    """Celery task wrapper for cleanup_expired_outputs management command.

    WP07 T055: Cleanup cron job

    Scheduled to run daily at 2:00 AM UTC via Celery Beat.
    Calls the management command to delete expired generation outputs.

    Returns:
        dict: Task execution summary with count of deleted outputs

    Raises:
        Exception: If cleanup command fails (will trigger retry)
    """
    from io import StringIO

    from django.core.management import call_command

    logger.info("Starting cleanup_expired_outputs task")

    try:
        # Capture command output
        out = StringIO()
        call_command("cleanup_expired_outputs", stdout=out)

        output = out.getvalue()
        logger.info(f"Cleanup task completed: {output}")

        return {"status": "success", "output": output}

    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}", exc_info=True)
        raise


@shared_task(bind=True, name="generative.tasks.update_template_costs")
def update_template_costs(self):
    """Celery task wrapper for update_template_costs management command.

    WP07 T056: Cost update cron job

    Scheduled to run monthly on the 1st at 3:00 AM UTC via Celery Beat.
    Recalculates template estimated costs based on recent actual costs.

    Returns:
        dict: Task execution summary with number of templates updated

    Raises:
        Exception: If cost update fails (will trigger retry)
    """
    from io import StringIO

    from django.core.management import call_command

    logger.info("Starting update_template_costs task")

    try:
        # Capture command output
        out = StringIO()
        call_command("update_template_costs", stdout=out)

        output = out.getvalue()
        logger.info(f"Cost update task completed: {output}")

        return {"status": "success", "output": output}

    except Exception as e:
        logger.error(f"Cost update task failed: {str(e)}", exc_info=True)
        raise


@shared_task(bind=True, name="generative.tasks.recover_stale_generation_jobs")
def recover_stale_generation_jobs(self, threshold_minutes: int = 30):
    """Detect and fail GenerationJob records stuck in active states.

    Runs periodically via Celery Beat. Any job that has been in
    queued/waiting/processing for longer than ``threshold_minutes`` is
    marked as failed with an explanatory error message.

    This handles the scenario where a worker restarts mid-task and the
    DB record is never transitioned to a terminal state.

    Returns:
        dict: Number of stale jobs recovered.
    """
    from datetime import timedelta

    from generative.models import GenerationJob

    threshold = timezone.now() - timedelta(minutes=threshold_minutes)
    active_statuses = [
        GenerationJob.Status.QUEUED,
        GenerationJob.Status.WAITING,
        GenerationJob.Status.PROCESSING,
    ]

    stuck_jobs = GenerationJob.objects.filter(
        status__in=active_statuses,
        updated_at__lt=threshold,
    )

    count = 0
    for job in stuck_jobs.iterator():
        age_min = int((timezone.now() - job.updated_at).total_seconds() / 60)
        reason = (
            f"Stale job recovery — stuck in '{job.status}' for {age_min} min "
            f"(threshold: {threshold_minutes} min). Worker likely restarted."
        )
        job.mark_stale(reason=reason)
        logger.warning("Recovered stale GenerationJob %s: %s", job.task_id, reason)
        count += 1

    if count:
        logger.info("Recovered %d stale GenerationJob(s)", count)
    return {"status": "success", "recovered": count}
