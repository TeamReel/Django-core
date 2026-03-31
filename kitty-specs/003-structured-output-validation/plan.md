# Implementation Plan: Media Pipeline Hardening

**Branch**: `main` | **Date**: 2026-03-31 | **Spec**: [spec.md](spec.md)

## Summary

Preventieve hardening van de complete media processing pipeline. Voegt input validatie, retry logic, error parsing, output quality checks, en unified logging toe aan alle AI providers (Gemini, MiniMax, Runway, Pika) en processing tools (FFmpeg, RVM, rembg, PIL).

**Primaire integratiepunten**:
- `src/generative/services/gemini_image.py` — Gemini retry toevoegen
- `src/generative/services/minimax_client.py` — Output quality check
- `src/video/services/_common.py` — FFmpeg error parsing
- `src/files/services/` — Upload validation
- Nieuw: `src/media/validation/` — Centrale validation utilities

## Technical Context

**Language/Version**: Python 3.11  
**Primary Dependencies**: tenacity, Pillow, structlog (alle al in requirements)  
**Testing**: pytest met parametrize voor edge cases  
**Target Platform**: Linux server (Railway)  
**Performance Goals**: <100ms p95 validation overhead per upload  
**Scale/Scope**: ~8 integratiepunten across generative, video, files apps

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| TEST_FIRST | ✅ Pass | Tests first per validator/retry pattern |
| No `any` types | ✅ Pass | All functions typed |
| Type hints | ✅ Pass | All functions typed |
| Org-scoped querysets | N/A | No database queries |
| permission_classes | N/A | No API endpoints added |
| select_related/prefetch_related | N/A | No ORM queries |

## Project Structure

### Source Code (new files)

```
src/media/
├── __init__.py
└── validation/
    ├── __init__.py           # Public exports
    ├── image_validator.py    # PIL-based image validation
    ├── video_validator.py    # Video output quality checks
    ├── ffmpeg_errors.py      # FFmpeg stderr parser
    └── retry_config.py       # Tenacity retry configurations

src/core/
└── logging/
    ├── __init__.py
    └── media_logger.py       # Unified structured logging
```

### Tests (new files)

```
tests/media/
├── __init__.py
├── test_image_validator.py      # PIL validation tests
├── test_video_validator.py      # Output quality tests
├── test_ffmpeg_errors.py        # Error parsing tests
└── test_retry_config.py         # Retry behavior tests
```

### Modified Files

| File | Change |
|------|--------|
| `src/generative/services/gemini_image.py` | Add tenacity retry decorator |
| `src/generative/services/minimax_client.py` | Add output quality check after download |
| `src/video/services/_common.py` | Replace basic error handling with FFmpegErrorParser |
| `src/files/views.py` | Add ImageValidator on upload |
| `src/files/services/asset_processor.py` | Add ImageValidator before rembg |

## Engineering Approach

### Architecture Decision: Centrale validation module

**Decision**: Create `src/media/validation/` als shared module.

**Rationale**:
- Validation logic wordt gebruikt door generative, video, files apps
- Geen tight coupling aan één app
- Follows existing pattern: `src/core/` voor shared utilities

### Retry Strategy

```python
# src/media/validation/retry_config.py
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

GEMINI_RETRY = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((RateLimitError, ConnectionError, TimeoutError)),
    before_sleep=log_retry_attempt,
)
```

### FFmpeg Error Categories

```python
# src/media/validation/ffmpeg_errors.py
class FFmpegErrorCategory(str, Enum):
    OOM = "out_of_memory"
    TIMEOUT = "timeout"
    CODEC = "codec_error"
    IO = "io_error"
    CORRUPT = "corrupt_input"
    UNKNOWN = "unknown"

PATTERNS = {
    FFmpegErrorCategory.OOM: ["Cannot allocate memory", "Out of memory"],
    FFmpegErrorCategory.TIMEOUT: ["timeout", "killed"],
    FFmpegErrorCategory.CODEC: ["Decoder", "codec", "Unsupported"],
    FFmpegErrorCategory.IO: ["No such file", "Permission denied", "Input/output error"],
    FFmpegErrorCategory.CORRUPT: ["Invalid data", "corrupt", "moov atom not found"],
}
```

### Image Validation Flow

```
Upload Request
      │
      ▼
┌─────────────────┐
│ Size Check      │ < 20MB
│ (fast, no PIL)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Format Check    │ Magic bytes
│ (PIL.Image.open)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dimension Check │ < 8192x8192
│ (memory safety) │
└────────┬────────┘
         │
         ▼
    ✅ Proceed
```

## Implementation Order (Work Packages)

### WP01: Image Validation Module (P0)
**Effort**: 4h | **Dependencies**: None

- Create `src/media/validation/image_validator.py`
- Methods: `validate_format()`, `validate_size()`, `validate_dimensions()`
- Tests: corrupt images, oversized, wrong format
- Integration: `src/files/views.py` upload endpoint

### WP02: Gemini Retry (P0)
**Effort**: 2h | **Dependencies**: None

- Add `@GEMINI_RETRY` decorator to `gemini_image.py` API calls
- Create `src/media/validation/retry_config.py`
- Tests: mock rate limit, verify retry count
- Logging: retry attempts with backoff duration

### WP03: FFmpeg Error Parser (P1)
**Effort**: 3h | **Dependencies**: None

- Create `src/media/validation/ffmpeg_errors.py`
- Pattern matching for OOM, TIMEOUT, CODEC, IO, CORRUPT
- Integration: `src/video/services/_common.py`
- Tests: real stderr samples from production logs

### WP04: Output Quality Checker (P1)
**Effort**: 3h | **Dependencies**: WP01

- Create `src/media/validation/video_validator.py`
- Check: resolution, duration, file size
- Integration: `minimax_client.py` after download
- Tests: mock low-res video, truncated file

### WP05: Unified Logging (P1)
**Effort**: 2h | **Dependencies**: WP01-04

- Create `src/core/logging/media_logger.py`
- Fields: job_id, provider, operation, duration_ms, status
- Retrofit existing log calls to use unified format
- Tests: verify log structure

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| PIL validation too slow | Performance | Profile p95, lazy validation |
| Retry causes cascade failures | Reliability | Add jitter, cap total retry time |
| FFmpeg patterns miss edge cases | Debugging | Log unmatched errors, iterate |
| Breaking existing uploads | Regression | Feature flag for gradual rollout |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Corrupt uploads rejected | 100% | Unit tests |
| Gemini rate limit recovery | 95% | Retry success rate |
| FFmpeg errors categorized | 90% | Unknown category < 10% |
| Unified log compliance | 100% | Log format validation |

- All AI responses validated before storage
- <50ms p95 validation overhead
- 100% test coverage on validation module
- Zero N+1 queries (N/A - no database)
- All existing tests still passing after integration