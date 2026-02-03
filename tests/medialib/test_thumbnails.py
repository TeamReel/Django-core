import pytest
from unittest.mock import MagicMock, patch
from io import BytesIO
from medialib.models import MediaItem, MediaThumbnail
from medialib.services.thumbnails import generate_image_thumbnail, generate_video_thumbnail
from medialib.tasks import generate_media_thumbnails


@pytest.mark.unit
class TestThumbnailServices:
    def test_generate_image_thumbnail_jpeg(self):
        # Create a simple 1000x1000 red image
        from PIL import Image

        img_bytes = BytesIO()
        img = Image.new("RGB", (1000, 1000), color="red")
        img.save(img_bytes, format="JPEG")

        result_bytes, mime = generate_image_thumbnail(img_bytes.getvalue(), size="small")

        # Verify result
        assert mime == "image/jpeg"
        with Image.open(BytesIO(result_bytes)) as result_img:
            # Should maintain aspect ratio, small is 200x200
            assert result_img.width <= 200
            assert result_img.height <= 200

    def test_generate_image_thumbnail_png_to_jpeg(self):
        # Create RGBA image
        from PIL import Image

        img_bytes = BytesIO()
        img = Image.new("RGBA", (1000, 1000), color=(255, 0, 0, 128))
        img.save(img_bytes, format="PNG")

        result_bytes, mime = generate_image_thumbnail(
            img_bytes.getvalue(), size="medium", format="JPEG"
        )

        assert mime == "image/jpeg"
        with Image.open(BytesIO(result_bytes)) as result_img:
            assert result_img.mode == "RGB"  # Converted

    @patch("subprocess.run")
    def test_generate_video_thumbnail(self, mock_run):
        # Mock probe and ffmpeg call
        mock_run.side_effect = [
            # Probe result
            MagicMock(stdout="10.0\n", returncode=0),
            # Frame result
            MagicMock(stdout=b"fake_jpeg_content", returncode=0),
        ]

        with patch("os.path.exists", return_value=True):
            content, mime = generate_video_thumbnail("/tmp/video.mp4")

        assert content == b"fake_jpeg_content"
        assert mime == "image/jpeg"
        # Check calls
        assert mock_run.call_count == 2
        # Verify probe call
        assert mock_run.call_args_list[0][0][0][0] == "ffprobe"
        # Verify ffmpeg call
        args = mock_run.call_args_list[1][0][0]
        assert args[0] == "ffmpeg"
        assert args[2] == "5.0"  # 50% of 10.0


@pytest.mark.django_db
class TestThumbnailTasks:
    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.generate_image_thumbnail")
    def test_generate_media_thumbnails_image(
        self, mock_gen, mock_backend, user, project, file_asset, media_item
    ):
        # Setup
        # Create item manually to override defaults if needed, or use media_item fixture
        # But here specific mime/content is needed.

        # We'll modify the file_asset fixture and create a new item
        file_asset.mime_type = "image/jpeg"
        file_asset.save()

        item = MediaItem.objects.create(
            project=project,
            file=file_asset,
            title="Test Image",
            mime_type="image/jpeg",
            file_size_bytes=1000,
            created_by=user,
        )

        # Mocks
        mock_storage = MagicMock()
        mock_backend.return_value = mock_storage

        # Mock file read
        mock_storage.open.return_value.__enter__.return_value.read.return_value = b"original_bytes"

        # Mock generation return (valid image)
        from PIL import Image
        import io

        img = Image.new("RGB", (10, 10), "red")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        valid_bytes = buf.getvalue()

        mock_gen.return_value = (valid_bytes, "image/jpeg")

        # Run
        result = generate_media_thumbnails(item.id)

        assert result["status"] == "success"
        assert "small" in result["thumbnails"]
        assert "medium" in result["thumbnails"]
        assert "large" in result["thumbnails"]

        # Verify DB
        assert MediaThumbnail.objects.filter(media_item=item).count() == 3
        thumb = MediaThumbnail.objects.first()
        assert thumb.size_label in ["small", "medium", "large"]
        assert thumb.width == 10
        assert thumb.height == 10
        assert thumb.file.original_name.startswith(f"thumb_{thumb.size_label}")

        # Verify storage save called
        assert mock_storage.save.call_count == 3

    @patch("medialib.tasks.get_storage_backend")
    @patch("medialib.tasks.generate_video_thumbnail")
    def test_generate_media_thumbnails_video(
        self, mock_gen, mock_backend, user, project, file_asset
    ):
        # Setup
        file_asset.mime_type = "video/mp4"
        file_asset.original_name = "video.mp4"
        file_asset.save()

        item = MediaItem.objects.create(
            project=project,
            file=file_asset,
            title="Test Video",
            mime_type="video/mp4",
            file_size_bytes=1000,
            created_by=user,
        )

        # Mocks
        mock_storage = MagicMock()
        mock_backend.return_value = mock_storage

        # Mock chunked read for temp file
        mock_file = MagicMock()
        mock_file.chunks.return_value = [b"chunk1", b"chunk2"]
        mock_storage.open.return_value.__enter__.return_value = mock_file

        # Mock generation return (valid image)
        from PIL import Image
        import io

        img = Image.new("RGB", (10, 10), "blue")
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        valid_bytes = buf.getvalue()

        mock_gen.return_value = (valid_bytes, "image/jpeg")

        # Run
        result = generate_media_thumbnails(item.id)

        assert result["status"] == "success"

        # Verify logic
        assert MediaThumbnail.objects.filter(media_item=item).count() == 3


@pytest.mark.django_db
class TestThumbnailAPI:
    def test_get_media_item_thumbnails(self, api_client, user, project, media_item):
        """Test the thumbnails action endpoint"""
        api_client.force_authenticate(user=user)

        # Create some thumbnails manually
        from medialib.models import MediaThumbnail
        from files.models import FileAsset

        file = FileAsset.objects.create(
            organization=project.organisation,
            uploaded_by=user,
            original_name="thumb_small.jpg",
            file_size=100,
            mime_type="image/jpeg",
            storage_path="path/to/thumb",
        )

        MediaThumbnail.objects.create(
            media_item=media_item, file=file, size_label="small", width=200, height=200
        )

        url = f"/api/v1/media/items/{media_item.id}/thumbnails/"
        response = api_client.get(url)

        assert response.status_code == 200
        data = response.json()

        # Handle standardized response
        results = data.get("data", data)

        assert len(results) == 1
        assert results[0]["size_label"] == "small"
        assert results[0]["width"] == 200
