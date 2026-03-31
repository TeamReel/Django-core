"""Tests for video output quality checker."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from unittest.mock import patch

from src.media.validation.video_validator import (
    QualityStatus,
    VideoQualityChecker,
    VideoQualityResult,
)


class TestQualityStatus:
    """Test QualityStatus enum values."""

    def test_ok_value(self) -> None:
        assert QualityStatus.OK.value == "ok"

    def test_degraded_value(self) -> None:
        assert QualityStatus.DEGRADED.value == "degraded"

    def test_failed_value(self) -> None:
        assert QualityStatus.FAILED.value == "failed"

    def test_is_string_enum(self) -> None:
        assert isinstance(QualityStatus.OK, str)
        assert QualityStatus.OK == "ok"


class TestVideoQualityResult:
    """Test VideoQualityResult dataclass."""

    def test_is_hd_landscape(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.OK,
            width=1920,
            height=1080,
            duration_seconds=5.0,
            file_size_bytes=1_000_000,
        )
        assert result.is_hd is True

    def test_is_hd_portrait(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.OK,
            width=720,
            height=1280,
            duration_seconds=5.0,
            file_size_bytes=1_000_000,
        )
        assert result.is_hd is True

    def test_not_hd(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.DEGRADED,
            width=640,
            height=480,
            duration_seconds=5.0,
            file_size_bytes=500_000,
        )
        assert result.is_hd is False

    def test_is_acceptable_ok(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.OK,
            width=1920,
            height=1080,
            duration_seconds=5.0,
            file_size_bytes=1_000_000,
        )
        assert result.is_acceptable is True

    def test_is_acceptable_degraded(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.DEGRADED,
            width=640,
            height=480,
            duration_seconds=5.0,
            file_size_bytes=500_000,
        )
        assert result.is_acceptable is True

    def test_not_acceptable_failed(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.FAILED,
            width=0,
            height=0,
            duration_seconds=0,
            file_size_bytes=0,
        )
        assert result.is_acceptable is False

    def test_resolution_property(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.OK,
            width=1920,
            height=1080,
            duration_seconds=5.0,
            file_size_bytes=1_000_000,
        )
        assert result.resolution == "1920x1080"

    def test_to_dict(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.OK,
            width=1920,
            height=1080,
            duration_seconds=5.0,
            file_size_bytes=2_097_152,  # exactly 2MB
            warnings=["test warning"],
        )
        d = result.to_dict()
        assert d["status"] == "ok"
        assert d["resolution"] == "1920x1080"
        assert d["duration_seconds"] == 5.0
        assert d["file_size_mb"] == 2.0
        assert d["is_hd"] is True
        assert d["warnings"] == ["test warning"]

    def test_to_dict_small_file(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.DEGRADED,
            width=640,
            height=480,
            duration_seconds=3.5,
            file_size_bytes=512_000,
        )
        d = result.to_dict()
        assert d["file_size_mb"] == 0.49  # 512000 / 1048576 rounded to 2 decimals

    def test_default_warnings_empty(self) -> None:
        result = VideoQualityResult(
            status=QualityStatus.OK,
            width=1920,
            height=1080,
            duration_seconds=5.0,
            file_size_bytes=1_000_000,
        )
        assert result.warnings == []


class TestVideoQualityChecker:
    """Test VideoQualityChecker class."""

    def test_missing_file(self, tmp_path: Path) -> None:
        result = VideoQualityChecker.check(tmp_path / "nonexistent.mp4")
        assert result.status == QualityStatus.FAILED
        assert "does not exist" in result.warnings[0]
        assert result.is_acceptable is False

    def test_empty_file(self, tmp_path: Path) -> None:
        video = tmp_path / "empty.mp4"
        video.write_bytes(b"")
        result = VideoQualityChecker.check(video)
        assert result.status == QualityStatus.FAILED
        assert result.file_size_bytes == 0
        assert "too small" in result.warnings[0]

    def test_tiny_file(self, tmp_path: Path) -> None:
        video = tmp_path / "tiny.mp4"
        video.write_bytes(b"x" * 100)
        result = VideoQualityChecker.check(video)
        assert result.status == QualityStatus.FAILED
        assert result.file_size_bytes == 100
        assert "too small" in result.warnings[0]

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_hd_video_ok(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.return_value = {"width": 1920, "height": 1080, "duration": 5.0}
        video = tmp_path / "good.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video)
        assert result.status == QualityStatus.OK
        assert result.width == 1920
        assert result.height == 1080
        assert result.duration_seconds == 5.0
        assert result.is_hd is True
        assert result.is_acceptable is True
        assert result.warnings == []

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_low_res_degraded(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.return_value = {"width": 640, "height": 480, "duration": 5.0}
        video = tmp_path / "lowres.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video)
        assert result.status == QualityStatus.DEGRADED
        assert result.is_hd is False
        assert result.is_acceptable is True
        assert any("below HD" in w for w in result.warnings)

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_duration_mismatch_warning(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.return_value = {"width": 1920, "height": 1080, "duration": 10.0}
        video = tmp_path / "long.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video, expected_duration=5.0)
        assert result.status == QualityStatus.DEGRADED
        assert any("differs from expected" in w for w in result.warnings)

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_duration_within_tolerance(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.return_value = {"width": 1920, "height": 1080, "duration": 5.5}
        video = tmp_path / "ok_dur.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video, expected_duration=5.0, duration_tolerance=1.0)
        assert result.status == QualityStatus.OK
        assert result.warnings == []

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_ffprobe_failure(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.side_effect = RuntimeError("ffprobe not found")
        video = tmp_path / "broken.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video)
        assert result.status == QualityStatus.FAILED
        assert "Could not read video info" in result.warnings[0]
        assert result.is_acceptable is False

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_no_expected_duration(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.return_value = {"width": 1920, "height": 1080, "duration": 5.0}
        video = tmp_path / "nodur.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video, expected_duration=None)
        assert result.status == QualityStatus.OK

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_portrait_hd(self, mock_info: Any, tmp_path: Path) -> None:
        """720 height alone qualifies as HD."""
        mock_info.return_value = {"width": 720, "height": 1280, "duration": 5.0}
        video = tmp_path / "portrait.mp4"
        video.write_bytes(b"x" * 10_000)

        result = VideoQualityChecker.check(video)
        assert result.is_hd is True
        assert result.status == QualityStatus.OK

    @patch.object(VideoQualityChecker, "_get_video_info")
    def test_result_file_size(self, mock_info: Any, tmp_path: Path) -> None:
        mock_info.return_value = {"width": 1920, "height": 1080, "duration": 5.0}
        video = tmp_path / "sized.mp4"
        video.write_bytes(b"x" * 50_000)

        result = VideoQualityChecker.check(video)
        assert result.file_size_bytes == 50_000

    def test_string_path_accepted(self, tmp_path: Path) -> None:
        """String paths should work, not just Path objects."""
        result = VideoQualityChecker.check(str(tmp_path / "nonexistent.mp4"))
        assert result.status == QualityStatus.FAILED
