from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from files.models import FileAsset
from medialib.models import MediaItem, MediaItemState
from medialib.tasks import generate_media_thumbnails, process_media_item
from organisations.models import Organisation
from projects.models import Project


class MediaItemTaskTests(TestCase):
    def setUp(self):
        User = get_user_model()

        self.user = User.objects.create(email="tester@example.com")
        self.org = Organisation.objects.create(name="Test Org", slug="test-org", creator=self.user)

        self.project = Project.objects.create(
            name="Test Project", slug="test-project", organisation=self.org, creator=self.user
        )

        self.file_asset_img = FileAsset.objects.create(
            organization=self.org,
            storage_path="uploads/test.jpg",
            file_size=10,
            mime_type="image/jpeg",
            original_name="test.jpg",
            uploaded_by=self.user,
        )
        self.item_img = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset_img,
            title="Test Item Img",
            mime_type="image/jpeg",
            state=MediaItemState.RAW,
            file_size_bytes=10,
        )

        self.file_asset_vid = FileAsset.objects.create(
            organization=self.org,
            storage_path="uploads/test.mp4",
            file_size=50,
            mime_type="video/mp4",
            original_name="test.mp4",
            uploaded_by=self.user,
        )
        self.item_vid = MediaItem.objects.create(
            project=self.project,
            file=self.file_asset_vid,
            title="Test Item Vid",
            mime_type="video/mp4",
            state=MediaItemState.RAW,
            file_size_bytes=50,
        )

    @patch("medialib.tasks.generate_media_thumbnails")
    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.extract_image_metadata")
    def test_process_media_item_success(self, mock_extract, mock_backend, mock_thumbnails):
        # Mock backend read
        mock_storage = MagicMock()
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"bytes"
        mock_backend.return_value = mock_storage

        # Mock extraction result
        mock_extract.return_value = {"width": 100, "height": 100}

        process_media_item(str(self.item_img.id))

        self.item_img.refresh_from_db()
        self.assertEqual(self.item_img.state, MediaItemState.PROCESSED)
        self.assertEqual(self.item_img.width, 100)

        # Verify thumbnail generation was triggered
        mock_thumbnails.delay.assert_called_once_with(str(self.item_img.id))

    @patch("medialib.tasks.generate_media_thumbnails")
    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.extract_video_metadata")
    def test_process_media_item_video_success(self, mock_extract, mock_backend, mock_thumbnails):
        mock_storage = MagicMock()
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"video_bytes"
        mock_backend.return_value = mock_storage

        mock_extract.return_value = {"width": 1920, "height": 1080, "duration_seconds": 60.5}

        result = process_media_item(str(self.item_vid.id))

        self.item_vid.refresh_from_db()
        self.assertEqual(self.item_vid.state, MediaItemState.PROCESSED)
        self.assertEqual(self.item_vid.width, 1920)
        self.assertEqual(self.item_vid.duration_seconds, 60.5)
        self.assertEqual(result["status"], "success")

        mock_thumbnails.delay.assert_called_once_with(str(self.item_vid.id))

    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.extract_image_metadata")
    def test_process_media_item_error_state(self, mock_extract, mock_backend):
        # Mock backend read
        mock_storage = MagicMock()
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"bytes"
        mock_backend.return_value = mock_storage

        mock_extract.return_value = {"error": "Extraction failed"}

        process_media_item(str(self.item_img.id))

        self.item_img.refresh_from_db()
        self.assertEqual(self.item_img.state, MediaItemState.ERROR)
        self.assertEqual(self.item_img.extraction_metadata["error"], "Extraction failed")

    def test_process_media_item_not_found(self):
        result = process_media_item("00000000-0000-0000-0000-000000000000")
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["message"], "Item not found")

    def test_process_media_item_idempotency(self):
        self.item_img.state = MediaItemState.PROCESSED
        self.item_img.save()

        result = process_media_item(str(self.item_img.id))
        self.assertEqual(result["status"], "skipped")

    @patch("PIL.Image.open")
    @patch("medialib.tasks.ContentFile")
    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.generate_image_thumbnail")
    def test_generate_media_thumbnails_image(
        self, mock_gen, mock_backend, mock_content_file, mock_pil_open
    ):
        mock_storage = MagicMock()
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"img_bytes"
        mock_backend.return_value = mock_storage

        # Mock generate returning bytes and mime
        mock_gen.return_value = (b"thumb_bytes", "image/jpeg")

        # Mock PIL image size
        mock_pil_img = MagicMock()
        mock_pil_img.size = (100, 100)
        mock_pil_open.return_value.__enter__.return_value = mock_pil_img

        generate_media_thumbnails(str(self.item_img.id))

        # Should be called 3 times for small, medium, large
        self.assertEqual(mock_gen.call_count, 3)
        self.assertEqual(mock_storage.save.call_count, 3)
        self.assertEqual(FileAsset.objects.filter(original_name__startswith="thumb_").count(), 3)

        # Verify call args for one case
        mock_gen.assert_any_call(b"img_bytes", size="medium")

    @patch("PIL.Image.open")
    @patch("medialib.tasks.ContentFile")
    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.generate_video_thumbnail")
    @patch("medialib.tasks.tempfile.NamedTemporaryFile")
    def test_generate_media_thumbnails_video(
        self, mock_temp, mock_gen, mock_backend, mock_content_file, mock_pil_open
    ):
        mock_storage = MagicMock()
        # Mock reading checks for streaming
        mock_storage.open.return_value.__enter__.return_value.chunks.return_value = [
            b"chunk1",
            b"chunk2",
        ]
        mock_backend.return_value = mock_storage

        mock_temp_file = MagicMock()
        mock_temp_file.name = "/tmp/fake_vid.mp4"
        mock_temp.return_value.__enter__.return_value = mock_temp_file

        mock_gen.return_value = (b"vid_thumb_bytes", "image/jpeg")

        # Mock PIL image size
        mock_pil_img = MagicMock()
        mock_pil_img.size = (100, 100)
        mock_pil_open.return_value.__enter__.return_value = mock_pil_img

        generate_media_thumbnails(str(self.item_vid.id))

        # Check temp file writes
        self.assertTrue(mock_temp_file.write.called)

        # Check generation calls
        self.assertEqual(mock_gen.call_count, 3)
        mock_gen.assert_any_call("/tmp/fake_vid.mp4", timestamp_percentage=0.5)

        # Check savings
        self.assertEqual(mock_storage.save.call_count, 3)
