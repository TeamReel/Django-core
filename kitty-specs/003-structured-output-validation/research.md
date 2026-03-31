# Research: Media Pipeline Hardening

**Feature**: 003-structured-output-validation (herdefinitie: Media Pipeline Hardening)  
**Date**: 2026-03-31  
**Phase**: Research

## Codebase Analysis

### Provider Inventory

Volledige analyse van alle media processing flows:

#### 1. AI Providers

| Provider | Location | Retry | Validation | Gaps |
|----------|----------|-------|------------|------|
| **Gemini** | `gemini_image.py` | ❌ None | Partial (parts check) | No retry, no output quality |
| **MiniMax** | `minimax_client.py` | ✅ Status polling | Good input validation | No output resolution check |
| **Runway** | `runway_client.py` | ⚠️ Basic HTTP | Timeout handling | No quality check |
| **Pika/fal.ai** | `fal_client.py` | ⚠️ HTTP only | Basic | Minimal error handling |

#### 2. Processing Tools

| Tool | Location | Error Handling | Gaps |
|------|----------|----------------|------|
| **FFmpeg** | `video/services/_common.py` | subprocess stderr | No parsing, basic logging |
| **RVM** | `video/services/rvm_processor.py` | Good (cancellation) | No input validation |
| **rembg** | `files/services/asset_processor.py` | try/except | No PIL pre-validation |
| **PIL/Pillow** | Throughout | Per-call | No centralized validation |

### Current Validation Gaps (Verified)

#### 1. Gemini Service (`gemini_image.py`)

```python
# Current: No retry at service level
response = await model.generate_content_async(contents)
# Direct call, 429 crashes task immediately
```

**Gap**: Rate limit op Gemini = immediate task failure  
**Impact**: Batch jobs falen na ~15-20 requests  
**Fix**: Tenacity retry met exponential backoff

#### 2. File Uploads (`files/views.py`)

```python
# Current: Size check only in settings
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
# No format validation, no dimension check
```

**Gap**: Corrupt/oversized images kunnen door  
**Impact**: PIL crash later in pipeline, poor UX  
**Fix**: ImageValidator met format + dimension checks

#### 3. FFmpeg Subprocess (`video/services/_common.py`)

```python
# Current: Basic error capture
result = subprocess.run(cmd, capture_output=True)
if result.returncode != 0:
    logger.error(f"FFmpeg error: {result.stderr}")  # Raw stderr
```

**Gap**: Geen categorisatie van errors  
**Impact**: "FFmpeg failed" zonder context  
**Fix**: FFmpegErrorParser met pattern matching

#### 4. MiniMax Output (`minimax_client.py`)

```python
# Current: Good status polling, no quality check
video_bytes = await self._download_video(url)
return video_bytes  # No resolution/duration check
```

**Gap**: Geen verificatie dat output 720p+ is  
**Impact**: UI toont low-res video zonder warning  
**Fix**: OutputQualityChecker na download

### ErrorCategory Enum (Existing)

```python
# src/generative/tasks.py
class ErrorCategory(str, Enum):
    TRANSIENT = "transient"
    PERMANENT = "permanent"
    UNKNOWN = "unknown"

TRANSIENT_KEYWORDS = ["rate limit", "timeout", "connection", "503", "429"]
```

Dit pattern werkt goed — we kunnen het hergebruiken voor FFmpeg error categorisatie.

## Technology Research

### Tenacity voor Retry

**Al in requirements**: ✅ `tenacity>=8.0`

Bewezen pattern uit andere projecten:

```python
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((RateLimitError, ConnectionError)),
)
async def call_gemini(prompt: str) -> Response:
    ...
```

### PIL Image Validation

**Al in requirements**: ✅ `Pillow>=10.0`

Validation approach:

```python
from PIL import Image

def validate_image(file_bytes: bytes) -> tuple[bool, str | None]:
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()  # Check for corruption
        
        # Reopen for dimension check (verify() closes)
        img = Image.open(io.BytesIO(file_bytes))
        w, h = img.size
        if w > 8192 or h > 8192:
            return False, "Image too large (max 8192x8192)"
        return True, None
    except Exception as e:
        return False, f"Invalid image: {e}"
```

### FFmpeg Error Patterns

Uit productie logs geëxtraheerd:

```
# OOM
"Cannot allocate memory"
"Out of memory allocating"

# Codec
"Decoder xxx not found"
"Unknown decoder 'xxx'"
"Unsupported codec"

# IO
"No such file or directory"
"Permission denied"
"Input/output error"

# Corrupt input
"Invalid data found when processing input"
"moov atom not found"
"Invalid NAL unit size"
```

## Risk Assessment

| Flow | Risk Level | Reason |
|------|------------|--------|
| Gemini calls | 🔴 High | No retry, rate limits common |
| File uploads | 🔴 High | No validation, crashes PIL |
| FFmpeg | 🟡 Medium | Works but poor diagnostics |
| MiniMax | 🟢 Low | Good retry, missing quality only |
| Runway | 🟡 Medium | Basic handling, needs timeout |
| RVM | 🟢 Low | Good cancellation support |

## Decisions Log

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Centrale `src/media/validation/` | Shared across apps | Per-app modules (duplication) |
| Tenacity voor retry | Already in deps, proven | Custom retry (reinvent wheel) |
| PIL for validation | Already in deps | ImageMagick (external dep) |
| Regex patterns for FFmpeg | Simple, maintainable | ML classifier (overkill) |
| Unified logging format | Observability | Per-service formats (inconsistent) |
