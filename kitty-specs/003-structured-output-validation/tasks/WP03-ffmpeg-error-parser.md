---
work_package_id: WP03
title: FFmpeg Error Parser
lane: planned
dependencies: []
requirement_refs:
- FR-004
planning_base_branch: main
merge_target_branch: main
branch_strategy: Create worktree from main, merge back to main when complete
subtasks: [T014, T015, T016, T017, T018, T019]
history:
- date: '2026-03-31T14:10:25Z'
  event: created
  author: spec-kitty
---

# WP03: FFmpeg Error Parser

## Objective

Parse FFmpeg stderr output into actionable error categories:
- **OOM**: Out of memory
- **TIMEOUT**: Process killed
- **CODEC**: Unsupported codec/format
- **IO**: File not found, permission denied
- **CORRUPT**: Invalid input data
- **UNKNOWN**: Unmatched (fallback)

This enables better debugging, user-friendly error messages, and intelligent retry decisions.

## Context

**Requirements**: FR-004 (FFmpeg error parsing)

**Current State**: `video/services/_common.py` logs raw FFmpeg stderr without parsing. Errors appear as "FFmpeg failed" with no actionable context.

**Target State**: Parsed errors with category, user message, and transient flag for retry decisions.

**Files to Create**:
- `src/media/validation/ffmpeg_errors.py`
- `tests/media/test_ffmpeg_errors.py`

**Files to Modify**:
- `src/video/services/_common.py` - Use FFmpegErrorParser

## Implementation Command

```bash
spec-kitty implement WP03
```

---

## Subtasks

### T014: Create FFmpegErrorCategory enum

**Purpose**: Define all possible error categories with string values for logging/API.

**Steps**:
1. Create `src/media/validation/ffmpeg_errors.py`:
   ```python
   """FFmpeg error parsing and categorization."""
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

2. Update `src/media/validation/__init__.py`:
   ```python
   from .ffmpeg_errors import FFmpegErrorCategory, FFmpegError, FFmpegErrorParser
   ```

**Validation**:
- [ ] Enum has 6 categories
- [ ] Values are descriptive strings (snake_case for logs)

---

### T015: Create FFmpegError dataclass

**Purpose**: Structured error result with category, messages, and retry guidance.

**Steps**:
1. Add to `ffmpeg_errors.py`:
   ```python
   from dataclasses import dataclass
   
   @dataclass
   class FFmpegError:
       """Parsed FFmpeg error with category and message."""
       category: FFmpegErrorCategory
       message: str               # Human-readable summary
       raw_stderr: str            # Original stderr for debugging
       exit_code: int             # Process exit code
       
       @property
       def is_transient(self) -> bool:
           """Whether this error might succeed on retry."""
           return self.category in (
               FFmpegErrorCategory.OOM,
               FFmpegErrorCategory.TIMEOUT,
           )
       
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
       
       def to_dict(self) -> dict:
           """Serialize for logging/API response."""
           return {
               "category": self.category.value,
               "message": self.message,
               "user_message": self.user_message,
               "is_transient": self.is_transient,
               "exit_code": self.exit_code,
           }
   ```

**Validation**:
- [ ] `is_transient` returns True for OOM/TIMEOUT only
- [ ] `user_message` returns Dutch strings for UI
- [ ] `to_dict()` is JSON-serializable

---

### T016: Implement error pattern matching

**Purpose**: Regular expression patterns to categorize stderr content.

**Steps**:
1. Add pattern dictionary to `ffmpeg_errors.py`:
   ```python
   import re
   from typing import Dict, List, Pattern
   
   # Compiled regex patterns for performance
   ERROR_PATTERNS: Dict[FFmpegErrorCategory, List[Pattern]] = {
       FFmpegErrorCategory.OOM: [
           re.compile(r"cannot allocate memory", re.IGNORECASE),
           re.compile(r"out of memory", re.IGNORECASE),
           re.compile(r"memory allocation.*failed", re.IGNORECASE),
           re.compile(r"insufficient memory", re.IGNORECASE),
       ],
       FFmpegErrorCategory.TIMEOUT: [
           re.compile(r"timeout", re.IGNORECASE),
           re.compile(r"killed", re.IGNORECASE),
           re.compile(r"signal 9", re.IGNORECASE),  # SIGKILL
           re.compile(r"signal 15", re.IGNORECASE),  # SIGTERM
       ],
       FFmpegErrorCategory.CODEC: [
           re.compile(r"decoder.*not found", re.IGNORECASE),
           re.compile(r"encoder.*not found", re.IGNORECASE),
           re.compile(r"unsupported codec", re.IGNORECASE),
           re.compile(r"unknown.*codec", re.IGNORECASE),
           re.compile(r"codec not.*support", re.IGNORECASE),
       ],
       FFmpegErrorCategory.IO: [
           re.compile(r"no such file", re.IGNORECASE),
           re.compile(r"permission denied", re.IGNORECASE),
           re.compile(r"input/output error", re.IGNORECASE),
           re.compile(r"is a directory", re.IGNORECASE),
           re.compile(r"read error", re.IGNORECASE),
           re.compile(r"error opening", re.IGNORECASE),
       ],
       FFmpegErrorCategory.CORRUPT: [
           re.compile(r"invalid data", re.IGNORECASE),
           re.compile(r"corrupt", re.IGNORECASE),
           re.compile(r"moov atom not found", re.IGNORECASE),
           re.compile(r"invalid.*header", re.IGNORECASE),
           re.compile(r"truncated", re.IGNORECASE),
           re.compile(r"end of file", re.IGNORECASE),
       ],
   }
   ```

**Note**: Patterns are ordered by specificity. First match wins.

**Validation**:
- [ ] All patterns are valid regex
- [ ] Case insensitive matching
- [ ] Common FFmpeg errors covered

---

### T017: Create FFmpegErrorParser.parse() method

**Purpose**: Main entry point to parse stderr string into FFmpegError.

**Steps**:
1. Add FFmpegErrorParser class:
   ```python
   class FFmpegErrorParser:
       """Parse FFmpeg stderr into categorized errors."""
       
       @classmethod
       def parse(cls, stderr: str, exit_code: int = 1) -> FFmpegError:
           """
           Parse FFmpeg stderr output into a categorized error.
           
           Args:
               stderr: Raw stderr output from FFmpeg
               exit_code: Process exit code
               
           Returns:
               FFmpegError with category and messages
           """
           if not stderr:
               return FFmpegError(
                   category=FFmpegErrorCategory.UNKNOWN,
                   message="FFmpeg failed with no error output",
                   raw_stderr="",
                   exit_code=exit_code,
               )
           
           # Try to match patterns in priority order
           for category, patterns in ERROR_PATTERNS.items():
               for pattern in patterns:
                   match = pattern.search(stderr)
                   if match:
                       # Extract context around the match
                       matched_text = match.group(0)
                       return FFmpegError(
                           category=category,
                           message=cls._extract_message(stderr, matched_text),
                           raw_stderr=stderr,
                           exit_code=exit_code,
                       )
           
           # No pattern matched - return UNKNOWN
           return FFmpegError(
               category=FFmpegErrorCategory.UNKNOWN,
               message=cls._extract_first_error_line(stderr),
               raw_stderr=stderr,
               exit_code=exit_code,
           )
       
       @classmethod
       def _extract_message(cls, stderr: str, matched: str) -> str:
           """Extract a clean error message around the match."""
           # Find the line containing the match
           for line in stderr.split('\n'):
               if matched.lower() in line.lower():
                   # Clean up the line
                   line = line.strip()
                   # Remove common prefixes
                   for prefix in ['[error]', 'error:', 'fatal:']:
                       if line.lower().startswith(prefix):
                           line = line[len(prefix):].strip()
                   return line[:200]  # Truncate long messages
           return matched
       
       @classmethod
       def _extract_first_error_line(cls, stderr: str) -> str:
           """Extract the first line that looks like an error."""
           error_indicators = ['error', 'failed', 'invalid', 'cannot', 'unable']
           
           for line in stderr.split('\n'):
               line = line.strip()
               if any(ind in line.lower() for ind in error_indicators):
                   return line[:200]
           
           # No obvious error line - return first non-empty line
           for line in stderr.split('\n'):
               line = line.strip()
               if line:
                   return line[:200]
           
           return "Unknown FFmpeg error"
   ```

**Validation**:
- [ ] Empty stderr returns UNKNOWN
- [ ] Matched category with extracted message
- [ ] Long messages truncated to 200 chars

---

### T018: Create tests with real stderr samples

**Purpose**: Test with actual FFmpeg error outputs from production/documentation.

**Steps**:
1. Create `tests/media/test_ffmpeg_errors.py`:
   ```python
   import pytest
   from src.media.validation.ffmpeg_errors import (
       FFmpegErrorCategory,
       FFmpegError,
       FFmpegErrorParser,
   )
   
   class TestFFmpegErrorCategory:
       def test_category_values_are_strings(self):
           assert FFmpegErrorCategory.OOM.value == "out_of_memory"
           assert FFmpegErrorCategory.TIMEOUT.value == "timeout"
   
   class TestFFmpegError:
       def test_is_transient_oom(self):
           error = FFmpegError(
               category=FFmpegErrorCategory.OOM,
               message="Cannot allocate memory",
               raw_stderr="",
               exit_code=1,
           )
           assert error.is_transient is True
       
       def test_is_transient_timeout(self):
           error = FFmpegError(
               category=FFmpegErrorCategory.TIMEOUT,
               message="Process killed",
               raw_stderr="",
               exit_code=137,
           )
           assert error.is_transient is True
       
       def test_not_transient_codec(self):
           error = FFmpegError(
               category=FFmpegErrorCategory.CODEC,
               message="Decoder not found",
               raw_stderr="",
               exit_code=1,
           )
           assert error.is_transient is False
       
       def test_user_message_dutch(self):
           error = FFmpegError(
               category=FFmpegErrorCategory.CORRUPT,
               message="Invalid data",
               raw_stderr="",
               exit_code=1,
           )
           assert error.user_message == "Video bestand is beschadigd"
   
   class TestFFmpegErrorParser:
       # Real stderr samples from FFmpeg
       OOM_STDERR = """
       [libx264 @ 0x1234] Cannot allocate memory
       Error while opening encoder for output stream #0:0
       """
       
       TIMEOUT_STDERR = """
       frame=  100 fps=0.5 q=0.0 size=       0kB time=00:00:04.00 bitrate=N/A speed=0.02x
       Killed
       """
       
       CODEC_STDERR = """
       [h264 @ 0x1234] Decoder h264_cuvid not found
       Stream mapping:
         Stream #0:0 -> #0:0 (h264 (native) -> h264 (libx264))
       """
       
       IO_STDERR = """
       /tmp/input.mp4: No such file or directory
       """
       
       CORRUPT_STDERR = """
       [mov,mp4,m4a,3gp,3g2,mj2 @ 0x1234] moov atom not found
       /tmp/input.mp4: Invalid data found when processing input
       """
       
       def test_parse_oom(self):
           result = FFmpegErrorParser.parse(self.OOM_STDERR, exit_code=1)
           assert result.category == FFmpegErrorCategory.OOM
           assert "memory" in result.message.lower()
       
       def test_parse_timeout(self):
           result = FFmpegErrorParser.parse(self.TIMEOUT_STDERR, exit_code=137)
           assert result.category == FFmpegErrorCategory.TIMEOUT
       
       def test_parse_codec(self):
           result = FFmpegErrorParser.parse(self.CODEC_STDERR, exit_code=1)
           assert result.category == FFmpegErrorCategory.CODEC
           assert "decoder" in result.message.lower()
       
       def test_parse_io(self):
           result = FFmpegErrorParser.parse(self.IO_STDERR, exit_code=1)
           assert result.category == FFmpegErrorCategory.IO
           assert "no such file" in result.message.lower()
       
       def test_parse_corrupt(self):
           result = FFmpegErrorParser.parse(self.CORRUPT_STDERR, exit_code=1)
           assert result.category == FFmpegErrorCategory.CORRUPT
       
       def test_parse_empty_stderr(self):
           result = FFmpegErrorParser.parse("", exit_code=1)
           assert result.category == FFmpegErrorCategory.UNKNOWN
           assert "no error output" in result.message.lower()
       
       def test_parse_unknown_error(self):
           result = FFmpegErrorParser.parse("Something weird happened", exit_code=1)
           assert result.category == FFmpegErrorCategory.UNKNOWN
           assert result.message == "Something weird happened"
       
       def test_message_truncation(self):
           long_stderr = "error: " + "x" * 500
           result = FFmpegErrorParser.parse(long_stderr, exit_code=1)
           assert len(result.message) <= 200
       
       def test_to_dict_serializable(self):
           result = FFmpegErrorParser.parse(self.OOM_STDERR, exit_code=1)
           d = result.to_dict()
           assert d["category"] == "out_of_memory"
           assert d["is_transient"] is True
           import json
           json.dumps(d)  # Should not raise
   ```

**Validation**:
- [ ] `pytest tests/media/test_ffmpeg_errors.py` passes
- [ ] All 5 categories tested with real stderr
- [ ] Edge cases: empty, unknown, truncation

---

### T019: Integrate parser in video/services/_common.py

**Purpose**: Replace raw stderr logging with parsed, categorized errors.

**Steps**:
1. Find FFmpeg subprocess calls in `src/video/services/_common.py`
2. Import the parser:
   ```python
   from src.media.validation import FFmpegErrorParser, FFmpegError
   ```
3. Replace raw stderr handling:
   ```python
   # Before
   result = subprocess.run(cmd, capture_output=True, text=True)
   if result.returncode != 0:
       logger.error(f"FFmpeg failed: {result.stderr}")
       raise Exception("FFmpeg failed")
   
   # After
   result = subprocess.run(cmd, capture_output=True, text=True)
   if result.returncode != 0:
       error = FFmpegErrorParser.parse(result.stderr, result.returncode)
       logger.error(
           "ffmpeg_error",
           category=error.category.value,
           message=error.message,
           is_transient=error.is_transient,
           exit_code=error.exit_code,
       )
       # Optionally: raise typed exception based on category
       raise FFmpegProcessError(
           error.user_message,
           category=error.category,
           is_transient=error.is_transient,
       )
   ```
4. Consider creating custom exception class:
   ```python
   class FFmpegProcessError(Exception):
       """FFmpeg processing error with category info."""
       def __init__(self, message: str, category: FFmpegErrorCategory, is_transient: bool):
           super().__init__(message)
           self.category = category
           self.is_transient = is_transient
   ```

**Validation**:
- [ ] All FFmpeg subprocess calls use parser
- [ ] Logs include category and is_transient
- [ ] User-facing errors use user_message (Dutch)

---

## Definition of Done

- [ ] All subtasks (T014-T019) completed
- [ ] `pytest tests/media/test_ffmpeg_errors.py` passes
- [ ] All 5 error categories detectable
- [ ] Parsed errors logged in video services
- [ ] User messages in Dutch

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Patterns miss edge cases | Debugging harder | Log UNKNOWN errors, iterate patterns |
| FFmpeg version differences | Different error formats | Test with production FFmpeg version |
| Regex performance | Slow parsing | Compile patterns once, early exit |

## Reviewer Guidance

1. **Check pattern coverage**: Review against real production logs if available
2. **Verify Dutch messages**: Should be user-friendly, not technical
3. **Test UNKNOWN fallback**: Should extract useful info even when unmatched
4. **Exception handling**: Ensure is_transient guides retry decisions
