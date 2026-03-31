---
work_package_id: WP04
title: Output Quality Checker
lane: planned
dependencies: [WP01]
requirement_refs:
- FR-005
planning_base_branch: main
merge_target_branch: main
branch_strategy: Create worktree from main, merge back to main when complete
subtasks: [T020, T021, T022, T023, T024]
history:
- date: '2026-03-31T14:10:25Z'
  event: created
  author: spec-kitty
---

# WP04: Output Quality Checker

## Objective

Verify AI-generated images and videos meet quality thresholds:
- **Resolution**: Minimum 720p (1280×720 or 720×1280)
- **File size**: Non-zero, not truncated
- **Format**: Expected output format (MP4, PNG)
- **Duration**: Within expected range (for video)

Mark outputs as DEGRADED (usable but below expectations) or FAILED (unusable).

## Context

**Requirements**: FR-005 (Output quality verification)

**Current State**: MiniMax downloads videos without checking resolution. Low-quality outputs are accepted without warning.

**Target State**: All AI outputs verified after generation. DEGRADED outputs logged but accepted. FAILED outputs trigger error.

**Dependencies**: WP01 (Image validation patterns)

**Files to Create**:
- `src/media/validation/video_validator.py`
- `tests/media/test_video_validator.py`

**Files to Modify**:
- `src/generative/services/minimax_client.py` - Add quality check after download

## Implementation Command

```bash
spec-kitty implement WP04 --base WP01
```

---

## Subtasks

### T020: Create QualityStatus enum

**Purpose**: Define quality check result statuses.

**Steps**:
1. Create `src/media/validation/video_validator.py`:
   ```python
   """Video output quality validation."""
   from enum import Enum
   
   class QualityStatus(str, Enum):
       """Quality check result status."""
       OK = "ok"               # Meets all requirements
       DEGRADED = "degraded"   # Below expected, but usable
       FAILED = "failed"       # Unusable output
   ```

2. Update `src/media/validation/__init__.py`:
   ```python
   from .video_validator import QualityStatus, VideoQualityResult, VideoQualityChecker
   ```

**Validation**:
- [ ] Enum has 3 values
- [ ] Values are lowercase strings for logging

---

### T021: Create VideoQualityResult dataclass

**Purpose**: Structured result with dimensions, warnings, and status.

**Steps**:
1. Add to `video_validator.py`:
   ```python
   from dataclasses import dataclass, field
   from typing import List
   
   @dataclass
   class VideoQualityResult:
       """Result of video output quality check."""
       status: QualityStatus
       width: int
       height: int
       duration_seconds: float
       file_size_bytes: int
       warnings: List[str] = field(default_factory=list)
       
       @property
       def resolution(self) -> str:
           """Human-readable resolution string."""
           return f"{self.width}x{self.height}"
       
       @property
       def is_hd(self) -> bool:
           """Whether output meets HD threshold (720p)."""
           return self.width >= 1280 or self.height >= 720
       
       @property
       def is_acceptable(self) -> bool:
           """Whether output can be used (OK or DEGRADED)."""
           return self.status in (QualityStatus.OK, QualityStatus.DEGRADED)
       
       def to_dict(self) -> dict:
           """Serialize for logging."""
           return {
               "status": self.status.value,
               "resolution": self.resolution,
               "duration_seconds": self.duration_seconds,
               "file_size_mb": round(self.file_size_bytes / (1024 * 1024), 2),
               "is_hd": self.is_hd,
               "warnings": self.warnings,
           }
   ```

**Validation**:
- [ ] `is_hd` returns True for 1280×720 or 720×1280
- [ ] `is_acceptable` returns True for OK and DEGRADED
- [ ] `to_dict()` is JSON-serializable

---

### T022: Implement VideoQualityChecker.check() method

**Purpose**: Check video file against quality thresholds.

**Steps**:
1. Add VideoQualityChecker class:
   ```python
   import subprocess
   import json
   import os
   from pathlib import Path
   from typing import Union
   
   class VideoQualityChecker:
       """Check video output quality using ffprobe."""
       
       # Quality thresholds
       MIN_WIDTH_HD = 1280
       MIN_HEIGHT_HD = 720
       MIN_FILE_SIZE_BYTES = 1024  # 1KB minimum
       
       @classmethod
       def check(
           cls,
           video_path: Union[str, Path],
           expected_duration: float = None,
           duration_tolerance: float = 2.0,  # seconds
       ) -> VideoQualityResult:
           """
           Check video quality using ffprobe.
           
           Args:
               video_path: Path to video file
               expected_duration: Expected duration in seconds (optional)
               duration_tolerance: Allowed deviation from expected duration
               
           Returns:
               VideoQualityResult with status and details
           """
           video_path = Path(video_path)
           warnings = []
           
           # Check file exists and has size
           if not video_path.exists():
               return VideoQualityResult(
                   status=QualityStatus.FAILED,
                   width=0,
                   height=0,
                   duration_seconds=0,
                   file_size_bytes=0,
                   warnings=["File does not exist"],
               )
           
           file_size = video_path.stat().st_size
           if file_size < cls.MIN_FILE_SIZE_BYTES:
               return VideoQualityResult(
                   status=QualityStatus.FAILED,
                   width=0,
                   height=0,
                   duration_seconds=0,
                   file_size_bytes=file_size,
                   warnings=["File size too small - likely truncated or empty"],
               )
           
           # Get video info with ffprobe
           try:
               info = cls._get_video_info(video_path)
           except Exception as e:
               return VideoQualityResult(
                   status=QualityStatus.FAILED,
                   width=0,
                   height=0,
                   duration_seconds=0,
                   file_size_bytes=file_size,
                   warnings=[f"Could not read video info: {str(e)}"],
               )
           
           width = info.get("width", 0)
           height = info.get("height", 0)
           duration = info.get("duration", 0.0)
           
           # Check resolution
           is_hd = width >= cls.MIN_WIDTH_HD or height >= cls.MIN_HEIGHT_HD
           if not is_hd:
               warnings.append(
                   f"Resolution {width}x{height} below HD threshold "
                   f"({cls.MIN_WIDTH_HD}x{cls.MIN_HEIGHT_HD})"
               )
           
           # Check duration if expected
           if expected_duration is not None:
               duration_diff = abs(duration - expected_duration)
               if duration_diff > duration_tolerance:
                   warnings.append(
                       f"Duration {duration:.1f}s differs from expected "
                       f"{expected_duration:.1f}s by {duration_diff:.1f}s"
                   )
           
           # Determine status
           if not is_hd or (expected_duration and duration_diff > duration_tolerance * 2):
               status = QualityStatus.DEGRADED
           elif warnings:
               status = QualityStatus.DEGRADED
           else:
               status = QualityStatus.OK
           
           return VideoQualityResult(
               status=status,
               width=width,
               height=height,
               duration_seconds=duration,
               file_size_bytes=file_size,
               warnings=warnings,
           )
       
       @classmethod
       def _get_video_info(cls, video_path: Path) -> dict:
           """Get video metadata using ffprobe."""
           cmd = [
               "ffprobe",
               "-v", "quiet",
               "-print_format", "json",
               "-show_streams",
               "-select_streams", "v:0",  # First video stream
               str(video_path),
           ]
           
           result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
           
           if result.returncode != 0:
               raise RuntimeError(f"ffprobe failed: {result.stderr}")
           
           data = json.loads(result.stdout)
           streams = data.get("streams", [])
           
           if not streams:
               raise RuntimeError("No video streams found")
           
           stream = streams[0]
           return {
               "width": int(stream.get("width", 0)),
               "height": int(stream.get("height", 0)),
               "duration": float(stream.get("duration", 0)),
           }
   ```

**Edge Cases**:
- File doesn't exist → FAILED
- Empty/truncated file → FAILED
- Low resolution but valid → DEGRADED
- ffprobe not installed → Handle gracefully

**Validation**:
- [ ] FAILED for missing/empty files
- [ ] DEGRADED for below-HD resolution
- [ ] OK for full HD video
- [ ] Warnings list populated correctly

---

### T023: Create tests for quality degradation scenarios

**Purpose**: Test all quality check scenarios including edge cases.

**Steps**:
1. Create `tests/media/test_video_validator.py`:
   ```python
   import pytest
   import tempfile
   from pathlib import Path
   from unittest.mock import patch, MagicMock
   
   from src.media.validation.video_validator import (
       QualityStatus,
       VideoQualityResult,
       VideoQualityChecker,
   )
   
   class TestQualityStatus:
       def test_status_values(self):
           assert QualityStatus.OK.value == "ok"
           assert QualityStatus.DEGRADED.value == "degraded"
           assert QualityStatus.FAILED.value == "failed"
   
   class TestVideoQualityResult:
       def test_is_hd_landscape(self):
           result = VideoQualityResult(
               status=QualityStatus.OK,
               width=1920,
               height=1080,
               duration_seconds=10.0,
               file_size_bytes=1000000,
           )
           assert result.is_hd is True
       
       def test_is_hd_portrait(self):
           result = VideoQualityResult(
               status=QualityStatus.OK,
               width=1080,
               height=1920,
               duration_seconds=10.0,
               file_size_bytes=1000000,
           )
           assert result.is_hd is True
       
       def test_not_hd(self):
           result = VideoQualityResult(
               status=QualityStatus.DEGRADED,
               width=640,
               height=480,
               duration_seconds=10.0,
               file_size_bytes=1000000,
           )
           assert result.is_hd is False
       
       def test_is_acceptable_ok(self):
           result = VideoQualityResult(
               status=QualityStatus.OK,
               width=1920,
               height=1080,
               duration_seconds=10.0,
               file_size_bytes=1000000,
           )
           assert result.is_acceptable is True
       
       def test_is_acceptable_degraded(self):
           result = VideoQualityResult(
               status=QualityStatus.DEGRADED,
               width=640,
               height=480,
               duration_seconds=10.0,
               file_size_bytes=1000000,
           )
           assert result.is_acceptable is True
       
       def test_not_acceptable_failed(self):
           result = VideoQualityResult(
               status=QualityStatus.FAILED,
               width=0,
               height=0,
               duration_seconds=0,
               file_size_bytes=0,
           )
           assert result.is_acceptable is False
       
       def test_to_dict(self):
           result = VideoQualityResult(
               status=QualityStatus.OK,
               width=1920,
               height=1080,
               duration_seconds=10.5,
               file_size_bytes=5242880,  # 5MB
               warnings=["test warning"],
           )
           d = result.to_dict()
           assert d["status"] == "ok"
           assert d["resolution"] == "1920x1080"
           assert d["file_size_mb"] == 5.0
           assert d["warnings"] == ["test warning"]
   
   class TestVideoQualityChecker:
       def test_missing_file(self):
           result = VideoQualityChecker.check("/nonexistent/video.mp4")
           assert result.status == QualityStatus.FAILED
           assert "does not exist" in result.warnings[0]
       
       def test_empty_file(self, tmp_path):
           video_path = tmp_path / "empty.mp4"
           video_path.touch()
           
           result = VideoQualityChecker.check(video_path)
           assert result.status == QualityStatus.FAILED
           assert "truncated" in result.warnings[0].lower()
       
       @patch.object(VideoQualityChecker, '_get_video_info')
       def test_hd_video_ok(self, mock_info, tmp_path):
           video_path = tmp_path / "hd.mp4"
           video_path.write_bytes(b'x' * 10000)  # Fake file content
           
           mock_info.return_value = {
               "width": 1920,
               "height": 1080,
               "duration": 10.0,
           }
           
           result = VideoQualityChecker.check(video_path)
           assert result.status == QualityStatus.OK
           assert result.width == 1920
           assert result.height == 1080
       
       @patch.object(VideoQualityChecker, '_get_video_info')
       def test_low_res_degraded(self, mock_info, tmp_path):
           video_path = tmp_path / "lowres.mp4"
           video_path.write_bytes(b'x' * 10000)
           
           mock_info.return_value = {
               "width": 480,
               "height": 270,
               "duration": 10.0,
           }
           
           result = VideoQualityChecker.check(video_path)
           assert result.status == QualityStatus.DEGRADED
           assert result.is_hd is False
           assert any("resolution" in w.lower() for w in result.warnings)
       
       @patch.object(VideoQualityChecker, '_get_video_info')
       def test_duration_mismatch_warning(self, mock_info, tmp_path):
           video_path = tmp_path / "video.mp4"
           video_path.write_bytes(b'x' * 10000)
           
           mock_info.return_value = {
               "width": 1920,
               "height": 1080,
               "duration": 15.0,  # Expected 10.0
           }
           
           result = VideoQualityChecker.check(
               video_path,
               expected_duration=10.0,
               duration_tolerance=2.0,
           )
           assert any("duration" in w.lower() for w in result.warnings)
       
       @patch.object(VideoQualityChecker, '_get_video_info')
       def test_ffprobe_failure(self, mock_info, tmp_path):
           video_path = tmp_path / "video.mp4"
           video_path.write_bytes(b'x' * 10000)
           
           mock_info.side_effect = RuntimeError("ffprobe failed")
           
           result = VideoQualityChecker.check(video_path)
           assert result.status == QualityStatus.FAILED
           assert "could not read" in result.warnings[0].lower()
   ```

**Validation**:
- [ ] `pytest tests/media/test_video_validator.py` passes
- [ ] Missing/empty files return FAILED
- [ ] Low-res returns DEGRADED
- [ ] HD video returns OK
- [ ] Duration mismatches generate warnings

---

### T024: Integrate quality checker in minimax_client.py

**Purpose**: Add quality check after MiniMax video download.

**Steps**:
1. Find video download logic in `src/generative/services/minimax_client.py`
2. Import the checker:
   ```python
   from src.media.validation import VideoQualityChecker, QualityStatus
   import structlog
   
   logger = structlog.get_logger(__name__)
   ```
3. Add quality check after download:
   ```python
   # After downloading video to local path
   video_path = download_video(url, output_path)
   
   # Check quality
   quality_result = VideoQualityChecker.check(
       video_path,
       expected_duration=expected_duration,  # If known from request
   )
   
   # Log result
   logger.info(
       "minimax_video_quality_check",
       **quality_result.to_dict(),
   )
   
   # Handle based on status
   if quality_result.status == QualityStatus.FAILED:
       raise VideoQualityError(
           f"Video quality check failed: {quality_result.warnings}"
       )
   elif quality_result.status == QualityStatus.DEGRADED:
       logger.warning(
           "minimax_video_degraded",
           warnings=quality_result.warnings,
           resolution=quality_result.resolution,
       )
   
   return video_path, quality_result
   ```

**Note**: Adjust based on actual function signatures in minimax_client.py.

**Validation**:
- [ ] Quality check runs after every MiniMax download
- [ ] DEGRADED outputs logged but accepted
- [ ] FAILED outputs raise exception
- [ ] Quality result available to callers

---

## Definition of Done

- [ ] All subtasks (T020-T024) completed
- [ ] `pytest tests/media/test_video_validator.py` passes
- [ ] MiniMax downloads include quality check
- [ ] DEGRADED outputs logged with warnings
- [ ] FAILED outputs raise clear error

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ffprobe not installed in prod | Check fails | Graceful fallback, log warning |
| Duration not always known | Can't verify | Make expected_duration optional |
| Threshold too strict | False DEGRADEDs | Monitor and adjust |

## Reviewer Guidance

1. **Verify thresholds**: 720p minimum, 1KB file minimum
2. **Check ffprobe handling**: Should handle missing ffprobe gracefully
3. **Test DEGRADED flow**: Should log warning but not fail
4. **Verify integration**: Quality result returned to callers for tracking
