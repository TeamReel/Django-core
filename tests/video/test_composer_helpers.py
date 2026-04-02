"""Tests for shared composer helpers in _common.py."""

from __future__ import annotations

import io
import subprocess
import textwrap
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.video.services._common import (
    ImageCache,
    prepare_background,
    prepare_sponsor,
    prepare_sponsor_pil,
    probe_duration,
)


class TestProbeDuration:
    """Tests for probe_duration()."""

    def test_returns_duration_from_ffprobe(self, tmp_path: Path):
        """Successful ffprobe returns parsed float duration."""
        video = tmp_path / "clip.mp4"
        video.touch()

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "  7.42\n"

        with patch("subprocess.run", return_value=mock_result) as mock_run:
            result = probe_duration(video)

        assert result == pytest.approx(7.42)
        # Verify ffprobe was called with correct arguments
        args = mock_run.call_args[0][0]
        assert str(video) in args
        assert "-show_entries" in args

    def test_returns_default_on_failure(self, tmp_path: Path):
        """Returns default when ffprobe fails."""
        video = tmp_path / "clip.mp4"
        video.touch()

        with patch("subprocess.run", side_effect=OSError("ffprobe not found")):
            result = probe_duration(video, default=3.0)

        assert result == 3.0

    def test_returns_default_on_nonzero_exit(self, tmp_path: Path):
        """Returns default when ffprobe exits non-zero."""
        video = tmp_path / "clip.mp4"
        video.touch()

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = ""

        with patch("subprocess.run", return_value=mock_result):
            result = probe_duration(video)

        assert result == 5.0  # default

    def test_returns_default_on_empty_output(self, tmp_path: Path):
        """Returns default when ffprobe output is empty."""
        video = tmp_path / "clip.mp4"
        video.touch()

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "  \n"

        with patch("subprocess.run", return_value=mock_result):
            result = probe_duration(video)

        assert result == 5.0


class TestPrepareBackground:
    """Tests for prepare_background()."""

    def test_landscape_returns_true(self, tmp_path: Path):
        """Landscape image (width > height) returns True."""
        from PIL import Image

        dest = tmp_path / "bg.jpg"
        img = Image.new("RGB", (1920, 1080))
        img.save(str(dest))

        with patch("src.video.services._common.download_file", return_value=True):
            result = prepare_background("https://example.com/bg.jpg", dest)

        assert result is True

    def test_portrait_returns_false(self, tmp_path: Path):
        """Portrait image (height > width) returns False."""
        from PIL import Image

        dest = tmp_path / "bg.jpg"
        img = Image.new("RGB", (1080, 1920))
        img.save(str(dest))

        with patch("src.video.services._common.download_file", return_value=True):
            result = prepare_background("https://example.com/bg.jpg", dest)

        assert result is False

    def test_raises_on_download_failure(self, tmp_path: Path):
        """Raises ValueError when download fails."""
        dest = tmp_path / "bg.jpg"

        with (
            patch("src.video.services._common.download_file", return_value=False),
            pytest.raises(ValueError, match="Failed to download"),
        ):
            prepare_background("https://example.com/bg.jpg", dest)


class TestPrepareSponsor:
    """Tests for prepare_sponsor()."""

    def test_returns_false_for_empty_url(self, tmp_path: Path):
        """Returns False when URL is empty/None."""
        dest = tmp_path / "sponsor.png"
        assert prepare_sponsor("", dest) is False
        assert prepare_sponsor(None, dest) is False

    def test_returns_false_on_download_failure(self, tmp_path: Path):
        """Returns False when download fails."""
        dest = tmp_path / "sponsor.png"

        with patch("src.video.services._common.requests.get", side_effect=Exception("fail")):
            assert prepare_sponsor("https://example.com/sponsor.png", dest) is False

    def test_returns_true_with_strip_and_crop(self, tmp_path: Path):
        """Returns True after stripping checkerboard and autocropping."""
        from PIL import Image

        dest = tmp_path / "sponsor.png"
        # Create a simple RGBA image
        img = Image.new("RGBA", (200, 100), (255, 0, 0, 255))

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        buf = io.BytesIO()
        img.save(buf, "PNG")
        mock_resp.content = buf.getvalue()

        mock_strip = MagicMock(return_value=img)

        with (
            patch("src.video.services._common.requests.get", return_value=mock_resp),
            patch(
                "src.generative.services.asset_pipeline._strip_checkerboard",
                mock_strip,
            ),
        ):
            result = prepare_sponsor("https://example.com/sponsor.png", dest)

        assert result is True
        mock_strip.assert_called_once()

    def test_returns_true_on_strip_failure(self, tmp_path: Path):
        """Falls back to raw file when strip_checkerboard fails."""
        from PIL import Image

        dest = tmp_path / "sponsor.png"
        img = Image.new("RGBA", (200, 100), (255, 0, 0, 255))

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        buf = io.BytesIO()
        img.save(buf, "PNG")
        mock_resp.content = buf.getvalue()

        with (
            patch("src.video.services._common.requests.get", return_value=mock_resp),
            patch(
                "src.generative.services.asset_pipeline._strip_checkerboard",
                side_effect=RuntimeError("oops"),
            ),
        ):
            result = prepare_sponsor("https://example.com/sponsor.png", dest)

        assert result is True


class TestPrepareSponsorPil:
    """Tests for prepare_sponsor_pil()."""

    def test_returns_none_for_empty_url(self):
        """Returns None when URL is empty/falsy."""
        assert prepare_sponsor_pil("") is None
        assert prepare_sponsor_pil(None) is None

    def test_returns_none_on_download_failure(self):
        """Returns None when HTTP request fails."""
        with patch("src.video.services._common.requests.get", side_effect=Exception("timeout")):
            assert prepare_sponsor_pil("https://example.com/sponsor.png") is None

    def test_returns_image_with_strip_and_crop(self):
        """Returns cleaned RGBA image after strip + autocrop."""
        from PIL import Image

        # Create image with transparent border around a red square
        img = Image.new("RGBA", (200, 100), (0, 0, 0, 0))
        img.paste(Image.new("RGBA", (100, 50), (255, 0, 0, 255)), (50, 25))

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        buf = io.BytesIO()
        img.save(buf, "PNG")
        mock_resp.content = buf.getvalue()

        # _strip_checkerboard returns the same image (transparent border intact)
        mock_strip = MagicMock(return_value=img)

        with (
            patch("src.video.services._common.requests.get", return_value=mock_resp),
            patch(
                "src.generative.services.asset_pipeline._strip_checkerboard",
                mock_strip,
            ),
        ):
            result = prepare_sponsor_pil("https://example.com/sponsor.png")

        assert result is not None
        mock_strip.assert_called_once()
        # Autocrop should have removed the transparent border
        assert result.size == (100, 50)

    def test_falls_back_on_strip_failure(self):
        """Returns raw image when strip_checkerboard raises."""
        from PIL import Image

        img = Image.new("RGBA", (200, 100), (255, 0, 0, 255))

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        buf = io.BytesIO()
        img.save(buf, "PNG")
        mock_resp.content = buf.getvalue()

        with (
            patch("src.video.services._common.requests.get", return_value=mock_resp),
            patch(
                "src.generative.services.asset_pipeline._strip_checkerboard",
                side_effect=RuntimeError("import error"),
            ),
        ):
            result = prepare_sponsor_pil("https://example.com/sponsor.png")

        assert result is not None
        assert result.size == (200, 100)


class TestImageCache:
    """Tests for ImageCache."""

    def test_get_downloads_and_caches(self):
        """First call downloads, second call returns cached copy."""
        from PIL import Image

        img = Image.new("RGB", (100, 100), (0, 255, 0))
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        buf = io.BytesIO()
        img.save(buf, "PNG")
        mock_resp.content = buf.getvalue()

        cache = ImageCache()

        with patch("src.video.services._common.requests.get", return_value=mock_resp) as mock_get:
            first = cache.get("https://example.com/logo.png")
            second = cache.get("https://example.com/logo.png")

        assert first is not None
        assert second is not None
        # Only one HTTP call — second was served from cache
        mock_get.assert_called_once()

    def test_get_returns_none_for_empty_url(self):
        """Returns None for empty/falsy URL without HTTP call."""
        cache = ImageCache()

        with patch("src.video.services._common.requests.get") as mock_get:
            result = cache.get("")

        assert result is None
        mock_get.assert_not_called()

    def test_get_returns_none_on_download_failure(self):
        """Returns None and caches the failure."""
        cache = ImageCache()

        with patch(
            "src.video.services._common.requests.get", side_effect=Exception("fail")
        ) as mock_get:
            first = cache.get("https://example.com/missing.png")
            second = cache.get("https://example.com/missing.png")

        assert first is None
        assert second is None
        # Only one HTTP call — failure was cached too
        mock_get.assert_called_once()

    def test_clear_empties_cache(self):
        """clear() drops all cached images, forcing re-download."""
        from PIL import Image

        img = Image.new("RGB", (50, 50), (0, 0, 255))
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        buf = io.BytesIO()
        img.save(buf, "PNG")
        mock_resp.content = buf.getvalue()

        cache = ImageCache()

        with patch("src.video.services._common.requests.get", return_value=mock_resp) as mock_get:
            cache.get("https://example.com/logo.png")
            cache.clear()
            cache.get("https://example.com/logo.png")

        # Two HTTP calls — cache was cleared in between
        assert mock_get.call_count == 2
