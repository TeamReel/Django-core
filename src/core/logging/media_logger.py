"""Unified media operation logging.

Provides structured logging for all media pipeline operations with consistent
fields: job_id, provider, operation, status, duration_ms.
"""

from __future__ import annotations

import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Generator, Optional

import structlog


class MediaOperation(str, Enum):
    """Media pipeline operation types."""

    UPLOAD_VALIDATE = "upload_validate"
    GEMINI_GENERATE = "gemini_generate"
    GEMINI_ANALYZE = "gemini_analyze"
    MINIMAX_GENERATE = "minimax_generate"
    RUNWAY_GENERATE = "runway_generate"
    PIKA_GENERATE = "pika_generate"
    FFMPEG_COMPOSE = "ffmpeg_compose"
    FFMPEG_CONVERT = "ffmpeg_convert"
    RVM_PROCESS = "rvm_process"
    REMBG_PROCESS = "rembg_process"
    QUALITY_CHECK = "quality_check"
    RETRY = "retry"


class MediaProvider(str, Enum):
    """External service providers."""

    GEMINI = "gemini"
    MINIMAX = "minimax"
    RUNWAY = "runway"
    PIKA = "pika"
    FAL = "fal"
    FFMPEG = "ffmpeg"
    RVM = "rvm"
    REMBG = "rembg"
    PIL = "pil"
    INTERNAL = "internal"


@dataclass
class MediaLogEntry:
    """Structured log entry for media operations."""

    # Required fields
    job_id: str
    operation: MediaOperation
    provider: MediaProvider
    status: str  # "started", "success", "failed", "retry", "degraded"

    # Timing
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: Optional[int] = None

    # Error context
    error_category: Optional[str] = None
    error_message: Optional[str] = None

    # Retry context
    retry_count: Optional[int] = None
    retry_wait_ms: Optional[int] = None

    # Quality context
    file_size_bytes: Optional[int] = None
    resolution: Optional[str] = None

    # Extra fields for flexibility
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dict for logging. Only includes set optional fields."""
        result: Dict[str, Any] = {
            "job_id": self.job_id,
            "operation": self.operation.value,
            "provider": self.provider.value,
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
        }

        # Add optional fields only if set
        if self.duration_ms is not None:
            result["duration_ms"] = self.duration_ms
        if self.error_category:
            result["error_category"] = self.error_category
        if self.error_message:
            result["error_message"] = self.error_message
        if self.retry_count is not None:
            result["retry_count"] = self.retry_count
        if self.retry_wait_ms is not None:
            result["retry_wait_ms"] = self.retry_wait_ms
        if self.file_size_bytes is not None:
            result["file_size_bytes"] = self.file_size_bytes
        if self.resolution:
            result["resolution"] = self.resolution

        # Merge extra fields
        result.update(self.extra)

        return result


class MediaLogger:
    """Unified media operation logger using structlog."""

    def __init__(self, logger_name: str = __name__) -> None:
        self.logger = structlog.get_logger(logger_name)

    @classmethod
    def get(cls, logger_name: str | None = None) -> MediaLogger:
        """Get a MediaLogger instance."""
        return cls(logger_name or __name__)

    def log(self, entry: MediaLogEntry) -> None:
        """Log a media operation entry."""
        level = self._get_log_level(entry.status)
        log_method = getattr(self.logger, level)
        log_method(
            f"{entry.operation.value}_{entry.status}",
            **entry.to_dict(),
        )

    def _get_log_level(self, status: str) -> str:
        """Map status to log level."""
        mapping = {
            "started": "info",
            "success": "info",
            "retry": "warning",
            "degraded": "warning",
            "failed": "error",
        }
        return mapping.get(status, "info")

    def info(
        self,
        job_id: str,
        operation: MediaOperation,
        provider: MediaProvider,
        status: str = "success",
        **kwargs: Any,
    ) -> None:
        """Log an info-level media operation."""
        entry = MediaLogEntry(
            job_id=job_id,
            operation=operation,
            provider=provider,
            status=status,
            extra=kwargs,
        )
        self.log(entry)

    def error(
        self,
        job_id: str,
        operation: MediaOperation,
        provider: MediaProvider,
        error_category: str | None = None,
        error_message: str | None = None,
        **kwargs: Any,
    ) -> None:
        """Log an error-level media operation."""
        entry = MediaLogEntry(
            job_id=job_id,
            operation=operation,
            provider=provider,
            status="failed",
            error_category=error_category,
            error_message=error_message,
            extra=kwargs,
        )
        self.log(entry)

    def generate_job_id(self) -> str:
        """Generate a unique job ID."""
        return str(uuid.uuid4())[:8]

    @contextmanager
    def operation(
        self,
        job_id: str,
        operation: MediaOperation,
        provider: MediaProvider,
        **extra: Any,
    ) -> Generator[MediaLogEntry, None, None]:
        """Context manager for tracking operation duration.

        Logs "started" on entry, "success" with duration on normal exit,
        or "failed" with error info on exception (re-raises).
        """
        entry = MediaLogEntry(
            job_id=job_id,
            operation=operation,
            provider=provider,
            status="started",
            extra=extra,
        )

        # Log start
        self.log(entry)

        start_time = time.perf_counter()

        try:
            yield entry

            # Success path
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            entry.duration_ms = duration_ms
            entry.status = "success"
            self.log(entry)

        except Exception as e:
            # Failure path
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            entry.duration_ms = duration_ms
            entry.status = "failed"
            entry.error_category = type(e).__name__
            entry.error_message = str(e)[:500]
            self.log(entry)
            raise
