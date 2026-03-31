---
work_package_id: WP05
title: Unified Logging
lane: "doing"
dependencies: [WP01, WP02, WP03, WP04]
requirement_refs:
- FR-006
planning_base_branch: main
merge_target_branch: main
branch_strategy: Create worktree from main, merge back to main when complete
base_branch: 003-structured-output-validation-WP04
base_commit: 4bf43a91801565ab839d8d8eed87291a60e8382d
created_at: '2026-03-31T15:32:30.421480+00:00'
subtasks: [T025, T026, T027, T028, T029, T030]
shell_pid: "101992"
agent: "Bouwer"
history:
- date: '2026-03-31T14:10:25Z'
  event: created
  author: spec-kitty
---

# WP05: Unified Logging

## Objective

Create consistent structured logging across all media operations with:
- **Required fields**: job_id, provider, operation, status, duration_ms
- **Optional fields**: error_category, retry_count, file_size, resolution
- **Format**: JSON-compatible structured logs (structlog)

This enables better debugging, monitoring dashboards, and anomaly detection.

## Context

**Requirements**: FR-006 (Unified logging with structured logs)

**Current State**: Each service logs differently. Some use f-strings, some use structlog. Inconsistent fields make log aggregation difficult.

**Target State**: All media operations use MediaLogger with consistent fields. Logs are JSON-structured for Railway/CloudWatch/Datadog.

**Dependencies**: WP01-04 (Retrofit logging to all validators and parsers)

**Files to Create**:
- `src/core/logging/media_logger.py`
- `tests/core/test_media_logger.py`

**Files to Modify**:
- `src/media/validation/image_validator.py` - Add MediaLogger
- `src/media/validation/retry_config.py` - Add MediaLogger
- `src/media/validation/ffmpeg_errors.py` - Add MediaLogger
- `src/media/validation/video_validator.py` - Add MediaLogger

## Implementation Command

```bash
spec-kitty implement WP05 --base WP04
```

---

## Subtasks

### T025: Create MediaOperation and MediaProvider enums

**Purpose**: Define all media operations and providers for consistent logging.

**Steps**:
1. Create `src/core/logging/__init__.py`:
   ```python
   """Logging utilities."""
   ```

2. Create `src/core/logging/media_logger.py`:
   ```python
   """Unified media operation logging."""
   from enum import Enum
   
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
       INTERNAL = "internal"  # For validation without external provider
   ```

**Validation**:
- [ ] All current operations covered
- [ ] All providers covered
- [ ] Values are snake_case strings

---

### T026: Create MediaLogEntry dataclass

**Purpose**: Structured log entry with all required and optional fields.

**Steps**:
1. Add to `media_logger.py`:
   ```python
   from dataclasses import dataclass, field
   from datetime import datetime
   from typing import Optional, Any, Dict
   
   @dataclass
   class MediaLogEntry:
       """Structured log entry for media operations."""
       # Required fields
       job_id: str
       operation: MediaOperation
       provider: MediaProvider
       status: str  # "started", "success", "failed", "retry", "degraded"
       
       # Timing
       timestamp: datetime = field(default_factory=datetime.utcnow)
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
           """Convert to dict for logging."""
           result = {
               "job_id": self.job_id,
               "operation": self.operation.value,
               "provider": self.provider.value,
               "status": self.status,
               "timestamp": self.timestamp.isoformat(),
           }
           
           # Add optional fields if set
           if self.duration_ms is not None:
               result["duration_ms"] = self.duration_ms
           if self.error_category:
               result["error_category"] = self.error_category
           if self.error_message:
               result["error_message"] = self.error_message
           if self.retry_count is not None:
               result["retry_count"] = self.retry_count
           if self.file_size_bytes is not None:
               result["file_size_bytes"] = self.file_size_bytes
           if self.resolution:
               result["resolution"] = self.resolution
           
           # Merge extra fields
           result.update(self.extra)
           
           return result
   ```

**Validation**:
- [ ] Required fields always present in to_dict()
- [ ] Optional fields only included when set
- [ ] Extra fields merged properly

---

### T027: Create MediaLogger utility class

**Purpose**: Easy-to-use logging interface that creates structured entries.

**Steps**:
1. Add to `media_logger.py`:
   ```python
   import structlog
   import time
   from contextlib import contextmanager
   from typing import Generator
   import uuid
   
   class MediaLogger:
       """Unified media operation logger using structlog."""
       
       def __init__(self, logger_name: str = __name__):
           self.logger = structlog.get_logger(logger_name)
       
       @classmethod
       def get(cls, logger_name: str = None) -> "MediaLogger":
           """Get a MediaLogger instance."""
           return cls(logger_name or __name__)
       
       def log(self, entry: MediaLogEntry) -> None:
           """Log a media operation entry."""
           level = self._get_log_level(entry.status)
           log_method = getattr(self.logger, level)
           log_method(
               f"{entry.operation.value}_{entry.status}",
               **entry.to_dict()
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
           **kwargs
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
           error_category: str = None,
           error_message: str = None,
           **kwargs
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
   ```

**Validation**:
- [ ] `MediaLogger.get()` returns usable instance
- [ ] `.log()` outputs structured log entry
- [ ] `.info()` and `.error()` convenience methods work
- [ ] Log levels map correctly (failed → error, retry → warning)

---

### T028: Add log_operation() context manager

**Purpose**: Context manager that automatically tracks duration and handles success/failure.

**Steps**:
1. Add to MediaLogger class:
   ```python
   @contextmanager
   def operation(
       self,
       job_id: str,
       operation: MediaOperation,
       provider: MediaProvider,
       **extra
   ) -> Generator[MediaLogEntry, None, None]:
       """
       Context manager for tracking operation duration.
       
       Usage:
           logger = MediaLogger.get()
           with logger.operation(job_id, MediaOperation.GEMINI_GENERATE, MediaProvider.GEMINI) as entry:
               result = do_operation()
               entry.extra["result_size"] = len(result)
           # Automatically logs success with duration
       
       On exception:
           # Automatically logs failure with error info
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
           
           # Calculate duration
           duration_ms = int((time.perf_counter() - start_time) * 1000)
           entry.duration_ms = duration_ms
           entry.status = "success"
           self.log(entry)
           
       except Exception as e:
           # Calculate duration
           duration_ms = int((time.perf_counter() - start_time) * 1000)
           entry.duration_ms = duration_ms
           entry.status = "failed"
           entry.error_category = type(e).__name__
           entry.error_message = str(e)[:500]  # Truncate long messages
           self.log(entry)
           raise  # Re-raise the exception
   ```

**Usage Example**:
```python
logger = MediaLogger.get(__name__)

with logger.operation(
    job_id="abc123",
    operation=MediaOperation.GEMINI_GENERATE,
    provider=MediaProvider.GEMINI,
) as entry:
    result = gemini_api.generate(prompt)
    entry.extra["prompt_length"] = len(prompt)
    entry.file_size_bytes = len(result)
# Auto-logged: started, then success or failed with duration
```

**Validation**:
- [ ] Logs "started" at context entry
- [ ] Logs "success" with duration at context exit
- [ ] Logs "failed" with error info on exception
- [ ] Exception is re-raised after logging

---

### T029: Create tests for log format compliance

**Purpose**: Verify log output format meets requirements.

**Steps**:
1. Create `tests/core/__init__.py`
2. Create `tests/core/test_media_logger.py`:
   ```python
   import pytest
   from datetime import datetime
   from unittest.mock import patch, MagicMock
   import json
   
   from src.core.logging.media_logger import (
       MediaOperation,
       MediaProvider,
       MediaLogEntry,
       MediaLogger,
   )
   
   class TestMediaOperation:
       def test_operation_values(self):
           assert MediaOperation.GEMINI_GENERATE.value == "gemini_generate"
           assert MediaOperation.UPLOAD_VALIDATE.value == "upload_validate"
   
   class TestMediaProvider:
       def test_provider_values(self):
           assert MediaProvider.GEMINI.value == "gemini"
           assert MediaProvider.MINIMAX.value == "minimax"
   
   class TestMediaLogEntry:
       def test_required_fields_in_dict(self):
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
       
       def test_optional_fields_excluded_when_none(self):
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
       
       def test_optional_fields_included_when_set(self):
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
       
       def test_json_serializable(self):
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
   
   class TestMediaLogger:
       def test_get_returns_logger(self):
           logger = MediaLogger.get()
           assert isinstance(logger, MediaLogger)
       
       @patch('src.core.logging.media_logger.structlog')
       def test_log_calls_structlog(self, mock_structlog):
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
       
       @patch('src.core.logging.media_logger.structlog')
       def test_error_status_logs_error_level(self, mock_structlog):
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
       
       @patch('src.core.logging.media_logger.structlog')
       def test_operation_context_manager_success(self, mock_structlog):
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
       
       @patch('src.core.logging.media_logger.structlog')
       def test_operation_context_manager_failure(self, mock_structlog):
           mock_logger = MagicMock()
           mock_structlog.get_logger.return_value = mock_logger
           
           logger = MediaLogger.get()
           
           with pytest.raises(ValueError):
               with logger.operation(
                   "job123",
                   MediaOperation.GEMINI_GENERATE,
                   MediaProvider.GEMINI,
               ) as entry:
                   raise ValueError("Test error")
           
           # Should log started (info) and failed (error)
           mock_logger.info.assert_called_once()  # started
           mock_logger.error.assert_called_once()  # failed
       
       def test_generate_job_id(self):
           logger = MediaLogger.get()
           job_id = logger.generate_job_id()
           
           assert len(job_id) == 8
           assert isinstance(job_id, str)
   ```

**Validation**:
- [ ] `pytest tests/core/test_media_logger.py` passes
- [ ] Required fields always present
- [ ] Optional fields only when set
- [ ] JSON serialization works
- [ ] Context manager logs correctly

---

### T030: Retrofit existing log calls to MediaLogger

**Purpose**: Update validators and parsers from WP01-04 to use unified logging.

**Steps**:
1. Update `src/media/validation/image_validator.py`:
   ```python
   from src.core.logging.media_logger import MediaLogger, MediaOperation, MediaProvider
   
   # At module level
   _logger = MediaLogger.get(__name__)
   
   # In validate() method
   @classmethod
   def validate(cls, file, job_id: str = None, **kwargs):
       job_id = job_id or _logger.generate_job_id()
       
       with _logger.operation(
           job_id,
           MediaOperation.UPLOAD_VALIDATE,
           MediaProvider.PIL,
       ) as entry:
           result = cls._validate_impl(file, **kwargs)
           entry.file_size_bytes = result.file_size
           if not result.valid:
               entry.extra["error"] = result.error.value
       
       return result
   ```

2. Update `src/media/validation/retry_config.py`:
   ```python
   from src.core.logging.media_logger import MediaLogger, MediaOperation, MediaProvider
   
   _logger = MediaLogger.get(__name__)
   
   def log_retry_attempt(retry_state):
       entry = MediaLogEntry(
           job_id=getattr(retry_state.args[0], 'job_id', 'unknown'),
           operation=MediaOperation.RETRY,
           provider=MediaProvider.GEMINI,
           status="retry",
           retry_count=retry_state.attempt_number,
           retry_wait_ms=int(retry_state.next_action.sleep * 1000) if retry_state.next_action else 0,
           error_category=type(retry_state.outcome.exception()).__name__,
       )
       _logger.log(entry)
   ```

3. Update `src/media/validation/ffmpeg_errors.py`:
   ```python
   # FFmpegErrorParser.parse() can log when parsing
   # But typically the caller logs - just ensure parse() returns loggable data
   ```

4. Update `src/media/validation/video_validator.py`:
   ```python
   from src.core.logging.media_logger import MediaLogger, MediaOperation, MediaProvider
   
   _logger = MediaLogger.get(__name__)
   
   # In check() method
   @classmethod
   def check(cls, video_path, job_id: str = None, **kwargs):
       job_id = job_id or _logger.generate_job_id()
       
       with _logger.operation(
           job_id,
           MediaOperation.QUALITY_CHECK,
           MediaProvider.INTERNAL,
       ) as entry:
           result = cls._check_impl(video_path, **kwargs)
           entry.resolution = result.resolution
           entry.file_size_bytes = result.file_size_bytes
           if result.status.value == "degraded":
               entry.status = "degraded"  # Override context status
       
       return result
   ```

**Note**: Keep changes minimal in this WP - just wire up the logger. Don't refactor unrelated code.

**Validation**:
- [ ] All validators use MediaLogger
- [ ] Retry attempts logged with MediaLogger
- [ ] Quality checks logged with MediaLogger
- [ ] All logs have job_id, operation, provider, status

---

## Definition of Done

- [ ] All subtasks (T025-T030) completed
- [ ] `pytest tests/core/test_media_logger.py` passes
- [ ] All validators use MediaLogger context manager
- [ ] Log format compliant (job_id, operation, provider, status, duration_ms)
- [ ] Logs are JSON-serializable

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Logging overhead too high | Performance | Keep <1ms per call, profile |
| Log volume too high | Storage costs | Use appropriate log levels, sample if needed |
| Breaking existing log parsing | Monitoring gaps | Gradual rollout, maintain backward compat |

## Reviewer Guidance

1. **Check log structure**: All required fields present
2. **Verify JSON output**: Should be parseable by log aggregators
3. **Test context manager**: Both success and failure paths
4. **Performance**: Profile with large batches

## Activity Log

- 2026-03-31T15:32:31Z – Bouwer – shell_pid=101992 – lane=doing – Assigned agent via workflow command
