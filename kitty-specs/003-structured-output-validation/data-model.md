# Data Model: Media Pipeline Hardening

**Feature**: 003-structured-output-validation (Media Pipeline Hardening)  
**Date**: 2026-03-31  
**Phase**: Research

## Overview

Dit zijn **Python dataclasses en enums** — geen Django modellen. Ze leven in `src/media/validation/` en definiëren validation results, error categories, en quality check output.

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Media Validation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐                    │
│   │ ImageValidator  │    │ FFmpegErrorParser│                   │
│   │                 │    │                  │                    │
│   │ validate()      │    │ parse()          │                    │
│   │   ↓             │    │   ↓              │                    │
│   │ ImageValidation │    │ FFmpegError      │                    │
│   │ Result          │    │                  │                    │
│   └─────────────────┘    └─────────────────┘                    │
│                                                                  │
│   ┌─────────────────┐    ┌─────────────────┐                    │
│   │ VideoQuality    │    │ MediaLogger     │                    │
│   │ Checker         │    │                 │                    │
│   │                 │    │ log_operation() │                    │
│   │ check()         │    │   ↓             │                    │
│   │   ↓             │    │ MediaLogEntry   │                    │
│   │ VideoQuality    │    │                 │                    │
│   │ Result          │    └─────────────────┘                    │
│   └─────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Types

### FFmpegErrorCategory (Enum)

```python
# src/media/validation/ffmpeg_errors.py
class FFmpegErrorCategory(str, Enum):
    """Categorized FFmpeg error types for actionable error handling."""
    OOM = "out_of_memory"        # Memory allocation failed
    TIMEOUT = "timeout"          # Process killed due to timeout
    CODEC = "codec_error"        # Decoder/encoder not found
    IO = "io_error"              # File not found, permission denied
    CORRUPT = "corrupt_input"    # Invalid input data
    UNKNOWN = "unknown"          # Unmatched pattern
```

### FFmpegError (Dataclass)

```python
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

### ImageValidationError (Enum)

```python
# src/media/validation/image_validator.py
class ImageValidationError(str, Enum):
    """Image validation error types."""
    CORRUPT = "corrupt"           # Can't be opened by PIL
    FORMAT = "invalid_format"     # Not PNG/JPEG/WEBP
    TOO_LARGE_BYTES = "too_large" # Exceeds file size limit
    TOO_LARGE_DIMS = "too_large_dims"  # Exceeds dimension limit
    ZERO_SIZE = "zero_size"       # Empty file
```

### ImageValidationResult (Dataclass)

```python
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

### QualityStatus (Enum)

```python
# src/media/validation/video_validator.py
class QualityStatus(str, Enum):
    """Quality check result status."""
    OK = "ok"               # Meets all requirements
    DEGRADED = "degraded"   # Below expected, but usable
    FAILED = "failed"       # Unusable output
```

### VideoQualityResult (Dataclass)

```python
@dataclass
class VideoQualityResult:
    """Result of video output quality check."""
    status: QualityStatus
    width: int
    height: int
    duration_seconds: float
    file_size_bytes: int
    warnings: list[str] = field(default_factory=list)
    
    @property
    def resolution(self) -> str:
        return f"{self.width}x{self.height}"
    
    @property
    def is_hd(self) -> bool:
        return self.width >= 1280 or self.height >= 720
```

### MediaOperation (Enum)

```python
# src/core/logging/media_logger.py
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
```

### MediaProvider (Enum)

```python
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
```

### MediaLogEntry (Dataclass)

```python
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
    "out_of_memory": ["Cannot allocate memory", "Out of memory"],
    "timeout": ["timeout", "killed", "Killed"],
    "codec_error": ["Decoder", "decoder", "codec", "Unsupported"],
    "io_error": ["No such file", "Permission denied", "Input/output error"],
    "corrupt_input": ["Invalid data", "corrupt", "moov atom not found"],
}
```

## Relationships

| Entity | Relationship | Entity |
|--------|--------------|--------|
| ImageValidator | produces | ImageValidationResult |
| FFmpegErrorParser | produces | FFmpegError |
| VideoQualityChecker | produces | VideoQualityResult |
| MediaLogger | produces | MediaLogEntry |
| FFmpegError | references | FFmpegErrorCategory |
| ImageValidationResult | references | ImageValidationError |
| VideoQualityResult | references | QualityStatus |
| MediaLogEntry | references | MediaOperation, MediaProvider |
