import base64
import subprocess
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase
from medialib.services.thumbnails import generate_image_thumbnail, generate_video_thumbnail

# 1x1 red pixel PNG
VALID_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
VALID_PNG_BYTES = base64.b64decode(VALID_PNG_B64)


class ThumbnailServiceTests(SimpleTestCase):
    def test_generate_image_thumbnail_success(self):
        # Should generate a JPEG thumbnail from PNG input
        thumb_bytes, mime = generate_image_thumbnail(VALID_PNG_BYTES, size="small", format="JPEG")
        self.assertEqual(mime, "image/jpeg")
        self.assertTrue(len(thumb_bytes) > 0)
        # Verify it starts with JPEG signature
        self.assertTrue(thumb_bytes.startswith(b"\xff\xd8"))

    def test_generate_image_thumbnail_invalid_image(self):
        with self.assertRaises(Exception):
            generate_image_thumbnail(b"not an image", size="small")

    @patch("subprocess.run")
    @patch("os.path.exists")
    def test_generate_video_thumbnail_success(self, mock_exists, mock_run):
        mock_exists.return_value = True

        # Mock ffprobe output
        mock_probe = MagicMock()
        mock_probe.stdout = "10.0"  # 10 seconds duration
        mock_probe.returncode = 0

        # Mock ffmpeg output
        mock_ffmpeg = MagicMock()
        mock_ffmpeg.stdout = b"fake_jpeg_data"
        mock_ffmpeg.returncode = 0

        # Side effect for sequential calls: [ffprobe, ffmpeg]
        mock_run.side_effect = [mock_probe, mock_ffmpeg]

        thumb_bytes, mime = generate_video_thumbnail("/tmp/test.mp4", timestamp_percentage=0.5)

        self.assertEqual(thumb_bytes, b"fake_jpeg_data")
        self.assertEqual(mime, "image/jpeg")

        # Verify calls
        self.assertEqual(mock_run.call_count, 2)
        # Check ffprobe call
        self.assertIn("ffprobe", mock_run.call_args_list[0][0][0])
        # Check ffmpeg call - should seek to 5.0s (10.0 * 0.5)
        cmd = mock_run.call_args_list[1][0][0]
        self.assertIn("ffmpeg", cmd)
        self.assertIn("5.0", cmd)

    @patch("os.path.exists")
    def test_generate_video_thumbnail_file_not_found(self, mock_exists):
        mock_exists.return_value = False
        with self.assertRaises(FileNotFoundError):
            generate_video_thumbnail("/missing.mp4")

    @patch("subprocess.run")
    @patch("os.path.exists")
    def test_generate_video_thumbnail_ffmpeg_failure(self, mock_exists, mock_run):
        mock_exists.return_value = True
        # Probe succeeds
        mock_probe = MagicMock()
        mock_probe.stdout = "10.0"

        # FFmpeg fails
        error = subprocess.CalledProcessError(1, ["ffmpeg"], stderr=b"codec error")
        mock_run.side_effect = [mock_probe, error]

        with self.assertRaises(RuntimeError) as cm:
            generate_video_thumbnail("/tmp/fail.mp4")
        self.assertIn("returned non-zero exit status", str(cm.exception))
