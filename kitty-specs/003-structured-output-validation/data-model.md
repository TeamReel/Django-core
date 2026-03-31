# Data Model: Media Pipeline Hardening

**Feature**: 003-structured-output-validation (Media Pipeline Hardening)  
**Date**: 2026-03-31  
**Phase**: Plan

## Overview

Dit zijn **Python dataclasses en enums** — geen Django modellen. Ze leven in `src/media/validation/` en definiëren validation results, error categories, en quality check output.

## Core Types

### FFmpeg Error Categories

```python
# src/media/validation/ffmpeg_errors.py
from enum import Enum

class FFmpegErrorCategory(str, Enum):
    """Categorized FFmpeg error types for actionable error handling."""
    OOM = "out_of_memory"        # Memory allocation failed
    TIMEOUT = "timeout"          # Process killed due to timeout
    CODEC = "codec_error"        # Decoder/encoder not found
    IO = "io_error"              # File not found, permission denied
    CORRUPT = "corrupt_input"    # Invalid input data
    UNKNOWN = "unknown"          # Unmatched pattern
```

### FFmpeg Error Result

```python
# src/media/validation/ffmpeg_errors.py
from dataclasses import dataclass

@dataclass
class FFmpegError:
    """Parsed FFmpeg error with category and message."""
    category: FFmpegErrorCategory
    message: str               # Human-readable message
    raw_stderr: str            # Original stderr for debugging
    exit_code: int             # Process exit code
    
    @property
    def is_transient(self) -> bool:
        """Whether this error might succeed on retry."""
        return self.category in (FFmpegErrorCategory.OOM, FFmpegErrorCategory.TIMEOUT)
    
    @property
    def user_message(self) -> str:
        """User-friendly message for UI display."""
        messages = {
            FFmpegErrorCategory.OOM: "Onvoldoende geheugen voor video verwerking",
            FFmpegErrorCategory.TIMEOUT: "Video verwerking duurde te lang",
            FFmpegErrorCategory.CODEC: "Video formaat niet ondersteund",
            FFmpegErrorCategory.IO: "Bestand kon niet worden gelezen",
            FFmpegErrorCategory.CORRUPT: "Video bestand is beschadigd",
            FFmpegErrorCategory.UNKNOWN: "Video verwerking mislukt",
        }
        return messages[self.category]
```

### Image Validation Result

```python
# src/media/validation/image_validator.py
from dataclasses import dataclass
from enum import Enum

class ImageValidationError(str, Enum):
    """Image validation error types."""
    CORRUPT = "corrupt"           # Can't be opened by PIL
    FORMAT = "invalid_format"     # Not PNG/JPEG/WEBP
    TOO_LARGE_BYTES = "too_large" # Exceeds file size limit
    TOO_LARGE_DIMS = "too_large_dims"  # Exceeds dimension limit
    ZERO_SIZE = "zero_size"       # Empty file


@dataclass
class ImageValidationResult:
    """Result of image validation check."""
    valid: bool
    error: ImageValidationError | None = None
    message: str | None = None
    
    # Populated on success
    format: str | None = None      # "PNG", "JPEG", "WEBP"
    width: int | None = None
    height: int | None = None
    file_size: int | None = None
    
    @classmethod
    def success(cls, format: str, width: int, height: int, file_size: int) -> "ImageValidationResult":
        return cls(valid=True, format=format, width=width, height=height, file_size=file_size)
    
    @classmethod
    def failure(cls, error: ImageValidationError, message: str) -> "ImageValidationResult":
        return cls(valid=False, error=error, message=message)
```

### Output Quality Result

```python
# src/media/validation/video_validator.py
from dataclasses import dataclass
from enum import Enum

class QualityStatus(str, Enum):
    """Quality check result status."""
    OK = "ok"               # Meets all requirements
    DEGRADED = "degraded"   # Below expected, but usable
    FAILED = "failed"       # Unusable output


@dataclass
class VideoQualityResult:
    """Result of video output quality check."""
    status: QualityStatus
    width: int
    height: int
    duration_seconds: float
    file_size_bytes: int
    
    # Warnings/issues
    warnings: list[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
    
    @property
    def resolution(self) -> str:
        return f"{self.width}x{self.height}"
    
    @property
    def is_hd(self) -> bool:
        return self.width >= 1280 or self.height >= 720


@dataclass
class ImageQualityResult:
    """Result of image output quality check."""
    status: QualityStatus
    width: int
    height: int
    format: str
    file_size_bytes: int
    warnings: list[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
```

### Retry Configuration

```python
# src/media/validation/retry_config.py
from dataclasses import dataclass
from typing import Tuple, Type

@dataclass
class RetryConfig:
    """Configuration for tenacity retry decorator."""
    max_attempts: int = 3
    wait_min: float = 1.0         # Minimum wait between retries
    wait_max: float = 8.0         # Maximum wait between retries
    wait_multiplier: float = 2.0  # Exponential multiplier
    total_timeout: float = 30.0   # Max total time for all retries
    
    # Exception types to retry on
    retry_exceptions: Tuple[Type[Exception], ...] = (
        ConnectionError,
        TimeoutError,
    )
    
    # Exception types to NOT retry (fail immediately)
    no_retry_exceptions: Tuple[Type[Exception], ...] = (
        ValueError,
        PermissionError,
    )


# Pre-configured retry profiles
GEMINI_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    wait_min=1.0,
    wait_max=8.0,
    retry_exceptions=(ConnectionError, TimeoutError, Exception),  # Includes rate limit
)

FFMPEG_RETRY_CONFIG = RetryConfig(
    max_attempts=2,
    wait_min=2.0,
    wait_max=10.0,
    retry_exceptions=(TimeoutError,),
)
```

### Unified Log Entry

```python
# src/core/logging/media_logger.py
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

class MediaOperation(str, Enum):
    """Media pipeline operation types."""
    UPLOAD_VALIDATE = "upload_validate"
    GEMINI_GENERATE = "gemini_generate"
    MINIMAX_GENERATE = "minimax_generate"
    RUNWAY_GENERATE = "runway_generate"
    FFMPEG_COMPOSE = "ffmpeg_compose"
    RVM_PROCESS = "rvm_process"
    REMBG_PROCESS = "rembg_process"
    QUALITY_CHECK = "quality_check"


class MediaProvider(str, Enum):
    """External service providers."""
    GEMINI = "gemini"
    MINIMAX = "minimax"
    RUNWAY = "runway"
    PIKA = "pika"
    FFMPEG = "ffmpeg"
    RVM = "rvm"
    REMBG = "rembg"
    PIL = "pil"


@dataclass
class MediaLogEntry:
    """Structured log entry for media operations."""
    job_id: str
    operation: MediaOperation
    provider: MediaProvider
    status: str               # "started", "success", "failed", "retry"
    
    # Timing
    timestamp: datetime = field(default_factory=datetime.utcnow)
    duration_ms: int | None = None
    
    # Context
    input_file: str | None = None
    output_file: str | None = None
    
    # Retry info
    attempt: int = 1
    max_attempts: int = 1
    
    # Error info
    error_category: str | None = None
    error_message: str | None = None
    
    # Extra data
    extra: dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        """Convert to dict for structlog."""
        return {
            "job_id": self.job_id,
            "operation": self.operation.value,
            "provider": self.provider.value,
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
            "duration_ms": self.duration_ms,
            "input_file": self.input_file,
            "output_file": self.output_file,
            "attempt": self.attempt,
            "max_attempts": self.max_attempts,
            "error_category": self.error_category,
            "error_message": self.error_message,
            **self.extra,
        }
```

## Constants

```python
# src/media/validation/constants.py

# File size limits
MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024      # 20 MB
MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024     # 500 MB

# Dimension limits
MAX_IMAGE_WIDTH = 8192
MAX_IMAGE_HEIGHT = 8192

# Quality thresholds
MIN_VIDEO_WIDTH_HD = 1280
MIN_VIDEO_HEIGHT_HD = 720

# Supported formats
SUPPORTED_IMAGE_FORMATS = {"PNG", "JPEG", "WEBP", "GIF"}
SUPPORTED_VIDEO_FORMATS = {"MP4", "MOV", "WEBM"}

# FFmpeg error patterns
FFMPEG_ERROR_PATTERNS = {
    "out_of_memory": [
        "Cannot allocate memory",
        "Out of memory",
        "memory allocation failed",
    ],
    "timeout": [
        "timeout",
        "killed",
        "Killed",
    ],
    "codec_error": [
        "Decoder",
        "decoder",
        "codec",
        "Unsupported",
    ],
    "io_error": [
        "No such file",
        "Permission denied",
        "Input/output error",
    ],
    "corrupt_input": [
        "Invalid data",
        "corrupt",
        "moov atom not found",
        "Invalid NAL",
    ],
}
```

## Usage Examples

### Image Validation

```python
from src.media.validation import ImageValidator

validator = ImageValidator()
result = validator.validate(uploaded_file.read())

if not result.valid:
    raise ValidationError(result.message)

print(f"Valid {result.format} image: {result.width}x{result.height}")
```

### FFmpeg Error Parsing

```python
from src.media.validation import FFmpegErrorParser

parser = FFmpegErrorParser()
error = parser.parse(stderr_output, exit_code=1)

if error.is_transient:
    # Schedule retry
    pass
else:
    # Log permanent failure
    logger.error("FFmpeg failed", **error.to_dict())
```

### Retry Decorator

```python
from src.media.validation import gemini_retry

@gemini_retry
async def call_gemini(prompt: str) -> Response:
    return await model.generate_content_async(prompt)
```
    PROCESSING = "Processing"
    FAILED = "Failed"
    QUEUED = "Queueing"


@register("minimax_status")
class MiniMaxStatusSchema(OutputSchema):
    """Schema for MiniMax video status response."""
    status: MiniMaxStatus
    video_url: str | None = None
    duration: float | None = None
    error_message: str | None = None
    
    @model_validator(mode="after")
    def validate_success_has_url(self) -> "MiniMaxStatusSchema":
        if self.status == MiniMaxStatus.SUCCESS and not self.video_url:
            raise ValueError("Successful video must have video_url")
        return self
```

## Type Coercion Rules

Pydantic v2 handles these automatically:

| From | To | Result |
|------|-----|--------|
| `"123"` | `int` | `123` (WARNING) |
| `"45.67"` | `float` | `45.67` (WARNING) |
| `123` | `str` | `"123"` (WARNING) |
| `True` | `int` | `1` (WARNING) |
| `None` | `str` (required) | CRITICAL |
| `"abc"` | `int` | CRITICAL |
| `[1,2,3]` | `dict` | CRITICAL |

## Error Category Extension

```python
# src/generative/tasks.py (modified)
class ErrorCategory(str, Enum):
    PROVIDER_ERROR = "provider_error"
    RATE_LIMIT = "rate_limit"
    CONTENT_POLICY = "content_policy"
    VALIDATION_ERROR = "validation_error"  # NEW
    
    @classmethod
    def from_exception(cls, exc: Exception) -> "ErrorCategory":
        if isinstance(exc, ValidationError):
            return cls.VALIDATION_ERROR
        # ... existing logic
```

## Schema Registry

```python
# src/generative/validation/registry.py
from typing import Type
from pydantic import BaseModel

_registry: dict[str, Type[BaseModel]] = {}

def register(name: str):
    """Decorator to register a schema by name."""
    def decorator(cls: Type[BaseModel]) -> Type[BaseModel]:
        _registry[name] = cls
        return cls
    return decorator

def get_schema(name: str) -> Type[BaseModel]:
    """Get a registered schema by name."""
    if name not in _registry:
        raise KeyError(f"Schema '{name}' not registered")
    return _registry[name]

def list_schemas() -> list[str]:
    """List all registered schema names."""
    return list(_registry.keys())
```

## Relationship to Django Models

| Pydantic Schema | Validates Output From | Stored In |
|-----------------|----------------------|-----------|
| `LineupSchema` | Gemini lineup generation | `GenerationOutput.result_data` |
| `GeminiResponseSchema` | Gemini API response | (intermediate, not stored) |
| `PhotoCompositeSchema` | Gemini photo placement | `GenerationOutput.result_data` |
| `MiniMaxStatusSchema` | MiniMax API polling | (intermediate, not stored) |

**Note**: De Pydantic schemas valideren de JSON *voordat* het in `GenerationOutput.result_data` wordt opgeslagen. Ze hebben geen directe relatie met Django models — ze zijn puur voor validatie van AI output format.
