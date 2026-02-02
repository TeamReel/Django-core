from unittest.mock import patch, MagicMock
from django.test import TestCase
from .models import MediaItem, MediaItemState
from .services.metadata import extract_image_metadata, extract_video_metadata
from .tasks import process_media_item
from projects.models import Project


class MetadataServiceTests(TestCase):
    def test_extract_image_metadata_success(self):
        # Mock Pillow Image
        with patch("medialib.services.metadata.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_img.width = 800
            mock_img.height = 600
            mock_img.format = "JPEG"
            mock_img.mode = "RGB"
            mock_img._getexif.return_value = {271: "Brand", 272: "Model"}  # 271=Make, 272=Model
            mock_open.return_value.__enter__.return_value = mock_img

            data = extract_image_metadata(b"fake_image_bytes")

            self.assertEqual(data["width"], 800)
            self.assertEqual(data["height"], 600)
            self.assertEqual(data["format"], "JPEG")
            self.assertEqual(data["exif"]["Make"], "Brand")

    def test_extract_image_metadata_failure(self):
        with patch("medialib.services.metadata.Image.open", side_effect=Exception("Corrupt")):
            data = extract_image_metadata(b"bad_bytes")
            self.assertIn("error", data)
            self.assertEqual(data["error"], "Corrupt")

    def test_extract_video_metadata_success(self):
        # Mock subprocess.run
        mock_output = {
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

        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = str(mock_output).replace("'", '"')  # minimal valid json
            # We need to mock json.loads separately if the string above isn't perfect,
            # but let's just mock json.loads if needed?
            # Actually, let's just make sure subprocess returns valid JSON string.
            import json

            mock_run.return_value.stdout = json.dumps(mock_output)

            data = extract_video_metadata(b"fake_video_bytes")

            self.assertEqual(data["width"], 1920)
            self.assertEqual(data["height"], 1080)
            self.assertEqual(data["fps"], 30.0)
            self.assertEqual(data["duration_seconds"], 120.5)

    def test_extract_video_metadata_failure(self):
        with patch("subprocess.run", side_effect=Exception("No ffprobe")):
            data = extract_video_metadata(b"bytes")
            self.assertIn("error", data)


class MediaItemTaskTests(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        from organisations.models import Organisation

        User = get_user_model()

        self.user = User.objects.create(email="tester@example.com")
        self.org = Organisation.objects.create(name="Test Org", slug="test-org", creator=self.user)

        self.project = Project.objects.create(
            name="Test Project", slug="test-project", organisation=self.org, creator=self.user
        )

        # Need to create a FileAsset to link
        from files.models import FileAsset

        self.file_asset = FileAsset.objects.create(
            organization=self.org,
            storage_path="uploads/test.jpg",
            file_size=10,
            mime_type="image/jpeg",
            original_name="test.jpg",
            uploaded_by=self.user,
        )
        self.item = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset,
            title="Test Item",
            mime_type="image/jpeg",
            state=MediaItemState.RAW,
            file_size_bytes=10,
        )

    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.extract_image_metadata")
    def test_process_media_item_success(self, mock_extract, mock_backend):
        # Mock backend read
        mock_storage = MagicMock()
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"bytes"
        mock_backend.return_value = mock_storage

        # Mock extraction result
        mock_extract.return_value = {"width": 100, "height": 100}

        process_media_item(str(self.item.id))

        self.item.refresh_from_db()
        self.assertEqual(self.item.state, MediaItemState.PROCESSED)
        self.assertEqual(self.item.width, 100)

    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.extract_image_metadata")
    def test_process_media_item_error_state(self, mock_extract, mock_backend):
        # Mock backend read
        mock_storage = MagicMock()
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"bytes"
        mock_backend.return_value = mock_storage

        mock_extract.return_value = {"error": "Extraction failed"}

        process_media_item(str(self.item.id))

        self.item.refresh_from_db()
        self.assertEqual(self.item.state, MediaItemState.ERROR)
        self.assertEqual(self.item.extraction_metadata["error"], "Extraction failed")
