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
from typing import Any, Coroutine, TypeVar

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from src.generative.executors.base import ErrorCategory as ExecutorErrorCategory
from src.generative.executors.factory import ExecutorFactory
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

    started_monotonic = time.monotonic()

    try:
        executor = ExecutorFactory.get_executor(request.template.pipeline_config)
        result = _run_async(
            executor.execute(
                template_config=request.template.pipeline_config,
                input_data=request.input_data,
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
            .select_related("template")
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

        if file_path:
            request.mark_failed(
                error_message="File outputs are not supported yet (WP06/WP35 integration)",
                error_category=ExecutorErrorCategory.PERMANENT.value,
            )
            return

        GenerationOutput.objects.update_or_create(
            request=request,
            defaults={
                "output_type": output_type,
                "text_content": text_content,
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

        actual_cost = getattr(result, "actual_cost", None)
        request.mark_completed(actual_cost=actual_cost or Decimal("0"))

        logger.info(
            "Task completed: request=%s cost=%s duration=%ss",
            request_id,
            request.actual_cost,
            duration_seconds,
        )


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
            .select_related("template")
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

        request.mark_failed(error_message=error_message, error_category=category.value)

        logger.error(
            "Task failed: request=%s attempt=%s category=%s error=%s",
            request_id,
            request.retry_count,
            category.value,
            error_message,
        )
