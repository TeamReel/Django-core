"""Tests for media operation logging."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from src.core.logging.media_logger import (
    MediaLogEntry,
    MediaLogger,
    MediaOperation,
    MediaProvider,
)


class TestMediaOperation:
    def test_operation_values(self) -> None:
        assert MediaOperation.GEMINI_GENERATE.value == "gemini_generate"
        assert MediaOperation.UPLOAD_VALIDATE.value == "upload_validate"

    def test_all_operations_are_snake_case(self) -> None:
        for op in MediaOperation:
            assert op.value == op.value.lower()
            assert " " not in op.value

    def test_twelve_operations(self) -> None:
        assert len(MediaOperation) == 12


class TestMediaProvider:
    def test_provider_values(self) -> None:
        assert MediaProvider.GEMINI.value == "gemini"
        assert MediaProvider.MINIMAX.value == "minimax"

    def test_all_providers_are_snake_case(self) -> None:
        for prov in MediaProvider:
            assert prov.value == prov.value.lower()

    def test_ten_providers(self) -> None:
        assert len(MediaProvider) == 10


class TestMediaLogEntry:
    def test_required_fields_in_dict(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.GEMINI_GENERATE,
            provider=MediaProvider.GEMINI,
            status="success",
        )
        d = entry.to_dict()

        assert d["job_id"] == "test123"
        assert d["operation"] == "gemini_generate"
        assert d["provider"] == "gemini"
        assert d["status"] == "success"
        assert "timestamp" in d

    def test_optional_fields_excluded_when_none(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.UPLOAD_VALIDATE,
            provider=MediaProvider.PIL,
            status="success",
        )
        d = entry.to_dict()

        assert "duration_ms" not in d
        assert "error_category" not in d
        assert "retry_count" not in d
        assert "retry_wait_ms" not in d
        assert "file_size_bytes" not in d
        assert "resolution" not in d

    def test_optional_fields_included_when_set(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.GEMINI_GENERATE,
            provider=MediaProvider.GEMINI,
            status="failed",
            duration_ms=1500,
            error_category="RateLimitError",
            retry_count=3,
        )
        d = entry.to_dict()

        assert d["duration_ms"] == 1500
        assert d["error_category"] == "RateLimitError"
        assert d["retry_count"] == 3

    def test_retry_wait_ms_included_when_set(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.RETRY,
            provider=MediaProvider.GEMINI,
            status="retry",
            retry_wait_ms=2000,
        )
        d = entry.to_dict()
        assert d["retry_wait_ms"] == 2000

    def test_file_size_and_resolution(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.QUALITY_CHECK,
            provider=MediaProvider.INTERNAL,
            status="success",
            file_size_bytes=1048576,
            resolution="1920x1080",
        )
        d = entry.to_dict()
        assert d["file_size_bytes"] == 1048576
        assert d["resolution"] == "1920x1080"

    def test_extra_fields_merged(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.FFMPEG_COMPOSE,
            provider=MediaProvider.FFMPEG,
            status="success",
            extra={"frame_count": 300},
        )
        d = entry.to_dict()
        assert d["frame_count"] == 300

    def test_json_serializable(self) -> None:
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.FFMPEG_COMPOSE,
            provider=MediaProvider.FFMPEG,
            status="success",
            duration_ms=5000,
            file_size_bytes=1048576,
            resolution="1920x1080",
            extra={"frame_count": 300},
        )
        d = entry.to_dict()

        # Should not raise
        serialized = json.dumps(d)
        assert "test123" in serialized

    def test_timestamp_is_iso_format(self) -> None:
        entry = MediaLogEntry(
            job_id="t1",
            operation=MediaOperation.UPLOAD_VALIDATE,
            provider=MediaProvider.PIL,
            status="success",
        )
        d = entry.to_dict()
        # ISO format has T separator
        assert "T" in d["timestamp"]

    def test_error_message_in_dict(self) -> None:
        entry = MediaLogEntry(
            job_id="t1",
            operation=MediaOperation.GEMINI_GENERATE,
            provider=MediaProvider.GEMINI,
            status="failed",
            error_message="Connection timed out",
        )
        d = entry.to_dict()
        assert d["error_message"] == "Connection timed out"


class TestMediaLogger:
    def test_get_returns_logger(self) -> None:
        logger = MediaLogger.get()
        assert isinstance(logger, MediaLogger)

    def test_get_with_name(self) -> None:
        logger = MediaLogger.get("mymodule")
        assert isinstance(logger, MediaLogger)

    @patch("src.core.logging.media_logger.structlog")
    def test_log_calls_structlog(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.GEMINI_GENERATE,
            provider=MediaProvider.GEMINI,
            status="success",
        )
        logger.log(entry)

        mock_logger.info.assert_called_once()

    @patch("src.core.logging.media_logger.structlog")
    def test_error_status_logs_error_level(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.GEMINI_GENERATE,
            provider=MediaProvider.GEMINI,
            status="failed",
        )
        logger.log(entry)

        mock_logger.error.assert_called_once()

    @patch("src.core.logging.media_logger.structlog")
    def test_retry_status_logs_warning(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.RETRY,
            provider=MediaProvider.GEMINI,
            status="retry",
        )
        logger.log(entry)

        mock_logger.warning.assert_called_once()

    @patch("src.core.logging.media_logger.structlog")
    def test_degraded_status_logs_warning(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()
        entry = MediaLogEntry(
            job_id="test123",
            operation=MediaOperation.QUALITY_CHECK,
            provider=MediaProvider.INTERNAL,
            status="degraded",
        )
        logger.log(entry)

        mock_logger.warning.assert_called_once()

    @patch("src.core.logging.media_logger.structlog")
    def test_info_convenience_method(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()
        logger.info("job1", MediaOperation.UPLOAD_VALIDATE, MediaProvider.PIL)

        mock_logger.info.assert_called_once()

    @patch("src.core.logging.media_logger.structlog")
    def test_error_convenience_method(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()
        logger.error(
            "job1",
            MediaOperation.GEMINI_GENERATE,
            MediaProvider.GEMINI,
            error_category="TimeoutError",
            error_message="Connection timed out",
        )

        mock_logger.error.assert_called_once()

    @patch("src.core.logging.media_logger.structlog")
    def test_operation_context_manager_success(
        self, mock_structlog: MagicMock
    ) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()

        with logger.operation(
            "job123",
            MediaOperation.UPLOAD_VALIDATE,
            MediaProvider.PIL,
        ) as entry:
            pass  # Simulate successful operation

        # Should log started and success
        assert mock_logger.info.call_count == 2

    @patch("src.core.logging.media_logger.structlog")
    def test_operation_context_manager_failure(
        self, mock_structlog: MagicMock
    ) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()

        with pytest.raises(ValueError, match="Test error"):
            with logger.operation(
                "job123",
                MediaOperation.GEMINI_GENERATE,
                MediaProvider.GEMINI,
            ) as entry:
                raise ValueError("Test error")

        # Should log started (info) and failed (error)
        mock_logger.info.assert_called_once()  # started
        mock_logger.error.assert_called_once()  # failed

    @patch("src.core.logging.media_logger.structlog")
    def test_operation_records_duration(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()

        with logger.operation(
            "job123",
            MediaOperation.FFMPEG_COMPOSE,
            MediaProvider.FFMPEG,
        ) as entry:
            pass

        # Entry should have duration_ms set
        assert entry.duration_ms is not None
        assert entry.duration_ms >= 0

    @patch("src.core.logging.media_logger.structlog")
    def test_operation_failure_records_error_info(
        self, mock_structlog: MagicMock
    ) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()

        with pytest.raises(RuntimeError):
            with logger.operation(
                "job123",
                MediaOperation.MINIMAX_GENERATE,
                MediaProvider.MINIMAX,
            ) as entry:
                raise RuntimeError("API unavailable")

        assert entry.error_category == "RuntimeError"
        assert entry.error_message == "API unavailable"
        assert entry.status == "failed"

    @patch("src.core.logging.media_logger.structlog")
    def test_operation_truncates_long_error_message(
        self, mock_structlog: MagicMock
    ) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()

        long_msg = "x" * 1000

        with pytest.raises(ValueError):
            with logger.operation(
                "job123",
                MediaOperation.GEMINI_GENERATE,
                MediaProvider.GEMINI,
            ) as entry:
                raise ValueError(long_msg)

        assert len(entry.error_message) == 500

    @patch("src.core.logging.media_logger.structlog")
    def test_operation_extra_kwargs(self, mock_structlog: MagicMock) -> None:
        mock_logger = MagicMock()
        mock_structlog.get_logger.return_value = mock_logger

        logger = MediaLogger.get()

        with logger.operation(
            "job123",
            MediaOperation.GEMINI_GENERATE,
            MediaProvider.GEMINI,
            prompt_length=100,
        ) as entry:
            pass

        assert entry.extra["prompt_length"] == 100

    def test_generate_job_id(self) -> None:
        logger = MediaLogger.get()
        job_id = logger.generate_job_id()

        assert len(job_id) == 8
        assert isinstance(job_id, str)

    def test_generate_job_id_unique(self) -> None:
        logger = MediaLogger.get()
        ids = {logger.generate_job_id() for _ in range(100)}
        assert len(ids) == 100

    def test_log_level_mapping(self) -> None:
        logger = MediaLogger.get()
        assert logger._get_log_level("started") == "info"
        assert logger._get_log_level("success") == "info"
        assert logger._get_log_level("retry") == "warning"
        assert logger._get_log_level("degraded") == "warning"
        assert logger._get_log_level("failed") == "error"
        assert logger._get_log_level("unknown_status") == "info"
