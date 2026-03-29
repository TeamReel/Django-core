import json
from unittest.mock import MagicMock, patch

from django.test import TestCase
from medialib.services.metadata import extract_image_metadata, extract_video_metadata


class MetadataServiceTests(TestCase):
    # -------------------------------------------------------------------------
    # extract_image_metadata
    # -------------------------------------------------------------------------

    @patch("medialib.services.metadata.Image")
    @patch("medialib.services.metadata.TAGS", {101: "MyExifTag"})
    def test_extract_image_metadata_success_with_exif(self, mock_image_cls):
        """Test successful metadata extraction with EXIF data."""
        # Setup mock image
        mock_img = MagicMock()
        mock_img.width = 800
        mock_img.height = 600
        mock_img.format = "JPEG"
        mock_img.mode = "RGB"
        # _getexif returns a dict
        mock_img._getexif.return_value = {
            101: "SafeValue",
            102: b"\x00",
        }  # 102 should be skipped as non-safe in code logic? Verify code.

        # Context manager
        mock_image_cls.open.return_value.__enter__.return_value = mock_img

        data = b"fake_image_bytes"
        result = extract_image_metadata(data)

        self.assertEqual(result["width"], 800)
        self.assertEqual(result["height"], 600)
        self.assertEqual(result["format"], "JPEG")
        self.assertEqual(result["mode"], "RGB")

        # Check Exif
        # 101 -> 'MyExifTag'
        self.assertEqual(result["exif"]["MyExifTag"], "SafeValue")
        # 102 -> '102' (default if not in TAGS) but it is bytes, so it should be skipped?
        # The code: if isinstance(value, (str, int, float)): result['exif'][tag] = value
        self.assertNotIn(102, result["exif"])
        self.assertNotIn("102", result["exif"])

    @patch("medialib.services.metadata.Image")
    def test_extract_image_metadata_no_exif(self, mock_image_cls):
        """Test metadata extraction for images without EXIF."""
        mock_img = MagicMock()
        mock_img.width = 100
        mock_img.height = 100
        mock_img.format = "PNG"
        mock_img.mode = "RGBA"

        # Mock _getexif to return None
        mock_img._getexif.return_value = None

        mock_image_cls.open.return_value.__enter__.return_value = mock_img

        result = extract_image_metadata(b"png_bytes")

        self.assertEqual(result["width"], 100)
        self.assertEqual(result["exif"], {})

    @patch("medialib.services.metadata.Image")
    def test_extract_image_metadata_exception(self, mock_image_cls):
        """Test error handling when Image.open fails."""
        mock_image_cls.open.side_effect = Exception("Corrupt header")

        result = extract_image_metadata(b"bad_bytes")

        self.assertIn("Corrupt header", result["error"])
        self.assertIsNone(result["width"])

    # -------------------------------------------------------------------------
    # extract_video_metadata
    # -------------------------------------------------------------------------

    @patch("medialib.services.metadata.subprocess.run")
    @patch("medialib.services.metadata.tempfile.mkstemp")
    @patch("medialib.services.metadata.os.fdopen")
    @patch("medialib.services.metadata.os.unlink")
    @patch("medialib.services.metadata.os.path.exists")
    def test_extract_video_metadata_success(
        self, mock_exists, mock_unlink, mock_fdopen, mock_mkstemp, mock_subprocess
    ):
        """Test successful video metadata extraction using ffprobe mock."""
        # Setup mocks
        mock_mkstemp.return_value = (123, "/tmp/fakevideo.tmp")
        mock_exists.return_value = True

        # Mock writing to temp file
        mock_file = MagicMock()
        mock_fdopen.return_value.__enter__.return_value = mock_file

        # Mock ffprobe output
        ffprobe_output = {
            "streams": [
                {
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "codec_name": "h264",
                    "r_frame_rate": "30/1",
                }
            ],
            "format": {"duration": "120.5"},
        }

        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.stdout = json.dumps(ffprobe_output)
        mock_subprocess.return_value = mock_process

        data = b"fake_video_bytes"
        result = extract_video_metadata(data)

        # Assertions
        self.assertEqual(result["width"], 1920)
        self.assertEqual(result["height"], 1080)
        self.assertEqual(result["codec"], "h264")
        self.assertEqual(result["fps"], 30.0)
        self.assertEqual(result["duration_seconds"], 120.5)

        # Ensure temp file was cleaned up
        mock_unlink.assert_called()

    @patch("medialib.services.metadata.subprocess.run")
    @patch("medialib.services.metadata.tempfile.mkstemp")
    @patch("medialib.services.metadata.os.fdopen")
    @patch("medialib.services.metadata.os.unlink")
    @patch("medialib.services.metadata.os.path.exists")
    def test_extract_video_metadata_ffprobe_error(
        self, mock_exists, mock_unlink, mock_fdopen, mock_mkstemp, mock_subprocess
    ):
        """Test handling of ffprobe failure."""
        mock_mkstemp.return_value = (123, "/tmp/fakevideo.tmp")
        mock_fdopen.return_value.__enter__.return_value = MagicMock()
        mock_exists.return_value = True  # Ensure cleanup is tried

        mock_process = MagicMock()
        mock_process.returncode = 1
        mock_process.stderr = "Invalid data"
        mock_subprocess.return_value = mock_process

        result = extract_video_metadata(b"bad_video")

        self.assertIsNone(result["width"])
        self.assertIsNone(result["duration_seconds"])

    @patch("medialib.services.metadata.subprocess.run")
    @patch("medialib.services.metadata.tempfile.mkstemp")
    @patch("medialib.services.metadata.os.fdopen")
    @patch("medialib.services.metadata.os.unlink")
    @patch("medialib.services.metadata.os.path.exists")
    def test_extract_video_metadata_exception(
        self, mock_exists, mock_remove, mock_fdopen, mock_mkstemp, mock_subprocess
    ):
        """Test generic exception during processing."""
        # Fix: mkstemp is outside try/except block in implementation, so we cannot mock it to raise for this test case
        # unless we want to test propagation. The assertIn('error') suggests we want to test caught exceptions.
        # So we mock a failure INSIDE the try block, e.g., subprocess.run raising Ex.

        mock_mkstemp.return_value = (123, "/tmp/fakevideo.tmp")
        mock_exists.return_value = False  # Avoid cleanup error for this test or mock unlink

        mock_subprocess.side_effect = Exception("Process crashed")

        result = extract_video_metadata(b"data")

        self.assertIn("Process crashed", result.get("error", ""))
