"""Video output quality validation.

Verifies AI-generated video outputs meet quality thresholds for resolution,
file size, format, and duration.
"""

from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Union

__all__ = [
    "QualityStatus",
    "VideoQualityResult",
    "VideoQualityChecker",
]

logger = logging.getLogger(__name__)


class QualityStatus(str, Enum):
    """Quality check result status."""

    OK = "ok"
    DEGRADED = "degraded"
    FAILED = "failed"


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


class VideoQualityChecker:
    """Check video output quality using ffprobe."""

    MIN_WIDTH_HD = 1280
    MIN_HEIGHT_HD = 720
    MIN_FILE_SIZE_BYTES = 1024  # 1KB minimum

    @classmethod
    def check(
        cls,
        video_path: Union[str, Path],
        expected_duration: float | None = None,
        duration_tolerance: float = 2.0,
    ) -> VideoQualityResult:
        """Check video quality using ffprobe.

        Args:
            video_path: Path to video file
            expected_duration: Expected duration in seconds (optional)
            duration_tolerance: Allowed deviation from expected duration

        Returns:
            VideoQualityResult with status and details
        """
        video_path = Path(video_path)
        warnings: list[str] = []

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

        try:
            info = cls._get_video_info(video_path)
        except Exception as e:
            return VideoQualityResult(
                status=QualityStatus.FAILED,
                width=0,
                height=0,
                duration_seconds=0,
                file_size_bytes=file_size,
                warnings=[f"Could not read video info: {e}"],
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
        duration_diff = 0.0
        if expected_duration is not None:
            duration_diff = abs(duration - expected_duration)
            if duration_diff > duration_tolerance:
                warnings.append(
                    f"Duration {duration:.1f}s differs from expected "
                    f"{expected_duration:.1f}s by {duration_diff:.1f}s"
                )

        # Determine status
        if not is_hd:
            status = QualityStatus.DEGRADED
        elif expected_duration is not None and duration_diff > duration_tolerance * 2:
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
        from src.video.services._common import get_ffprobe_path

        cmd = [
            get_ffprobe_path(),
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            "-select_streams", "v:0",
            str(video_path),
        ]

        result = subprocess.run(  # noqa: S603
            cmd, capture_output=True, text=True, timeout=10
        )

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
