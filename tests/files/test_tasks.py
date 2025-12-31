"""
Tests for files.tasks - Celery async tasks for file management.

Tests cover:
- T014: Thumbnail generation task with various image formats and error scenarios
- T015: Cleanup task with time-based filtering and storage interaction
- Error handling and retry behavior for both tasks
"""

import io
import uuid
from datetime import timedelta
from unittest.mock import Mock, patch

import pytest

# from common.storage import StorageBackend  # FIXME: Missing dependency
from django.test import TestCase, override_settings
from django.utils import timezone
from files.models import FileAsset
from files.tasks import cleanup_deleted_files, generate_thumbnail

try:
    from common.storage import StorageBackend
except ImportError:
    StorageBackend = None

if StorageBackend is None:
    pytest.skip("Skipping due to missing common.storage dependency", allow_module_level=True)

from PIL import Image


class ThumbnailGenerationTaskTests(TestCase):
    """Tests for generate_thumbnail Celery task (T014)."""

    def setUp(self):
        """Set up test data."""
        # Create test image in memory
        self.test_image = Image.new("RGB", (800, 600), color="red")
        self.image_buffer = io.BytesIO()
        self.test_image.save(self.image_buffer, format="JPEG")
        self.image_buffer.seek(0)

    def create_file_asset(self, file_type="image/jpeg", content_length=5120):
        """Helper to create FileAsset for testing."""
        return FileAsset.objects.create(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            original_filename="test.jpg",
            file_type=file_type,
            file_size=content_length,
            storage_path="uploads/test/test.jpg",
            uploaded_by_id=uuid.uuid4(),
        )

    @patch("files.tasks.StorageBackend")
    def test_generate_thumbnail_success_jpeg(self, mock_storage):
        """Test successful thumbnail generation for JPEG image."""
        # Setup
        file_asset = self.create_file_asset()
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.read_file.return_value = self.image_buffer.getvalue()

        # Execute
        result = generate_thumbnail(str(file_asset.id))

        # Verify
        assert result["success"] is True
        assert result["message"] == "Thumbnail generated successfully"
        assert "thumbnail_path" in result

        # Check FileAsset was updated
        file_asset.refresh_from_db()
        assert file_asset.thumbnail_path is not None
        assert file_asset.thumbnail_path.endswith("_thumb.jpg")

        # Verify storage interactions
        mock_storage_instance.read_file.assert_called_once_with(file_asset.storage_path)
        mock_storage_instance.write_file.assert_called_once()

    @patch("files.tasks.StorageBackend")
    def test_generate_thumbnail_success_png(self, mock_storage):
        """Test successful thumbnail generation for PNG image."""
        # Setup PNG image
        png_image = Image.new("RGBA", (800, 600), color=(255, 0, 0, 128))
        png_buffer = io.BytesIO()
        png_image.save(png_buffer, format="PNG")
        png_buffer.seek(0)

        file_asset = self.create_file_asset(file_type="image/png")
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.read_file.return_value = png_buffer.getvalue()

        # Execute
        result = generate_thumbnail(str(file_asset.id))

        # Verify
        assert result["success"] is True
        file_asset.refresh_from_db()
        assert file_asset.thumbnail_path.endswith("_thumb.jpg")

    @patch("files.tasks.StorageBackend")
    def test_generate_thumbnail_resizes_large_image(self, mock_storage):
        """Test that large images are properly resized to 300x300 max."""
        # Setup large image
        large_image = Image.new("RGB", (2000, 1500), color="blue")
        large_buffer = io.BytesIO()
        large_image.save(large_buffer, format="JPEG")
        large_buffer.seek(0)

        file_asset = self.create_file_asset()
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.read_file.return_value = large_buffer.getvalue()

        # Capture the written thumbnail
        written_data = None

        def capture_write(path, data):
            nonlocal written_data
            written_data = data

        mock_storage_instance.write_file.side_effect = capture_write

        # Execute
        result = generate_thumbnail(str(file_asset.id))

        # Verify thumbnail size
        assert result["success"] is True
        assert written_data is not None

        # Check thumbnail dimensions
        thumbnail_image = Image.open(io.BytesIO(written_data))
        assert thumbnail_image.size[0] <= 300
        assert thumbnail_image.size[1] <= 300

    def test_generate_thumbnail_file_not_found(self):
        """Test handling of non-existent FileAsset."""
        # Execute with non-existent ID
        result = generate_thumbnail(str(uuid.uuid4()))

        # Verify error handling
        assert result["success"] is False
        assert "not found" in result["message"].lower()

    def test_generate_thumbnail_non_image_file(self):
        """Test graceful handling of non-image files."""
        file_asset = self.create_file_asset(file_type="text/plain")

        # Execute
        result = generate_thumbnail(str(file_asset.id))

        # Verify graceful skip
        assert result["success"] is False
        assert "not an image" in result["message"].lower()

    @patch("files.tasks.StorageBackend")
    def test_generate_thumbnail_storage_read_error(self, mock_storage):
        """Test handling of storage read errors."""
        file_asset = self.create_file_asset()
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.read_file.side_effect = Exception("Storage unavailable")

        # Execute
        result = generate_thumbnail(str(file_asset.id))

        # Verify error handling
        assert result["success"] is False
        assert "storage unavailable" in result["message"].lower()

    @patch("files.tasks.StorageBackend")
    def test_generate_thumbnail_corrupted_image(self, mock_storage):
        """Test handling of corrupted image data."""
        file_asset = self.create_file_asset()
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.read_file.return_value = b"not an image"

        # Execute
        result = generate_thumbnail(str(file_asset.id))

        # Verify error handling
        assert result["success"] is False
        assert "error" in result["message"].lower()


class CleanupDeletedFilesTaskTests(TestCase):
    """Tests for cleanup_deleted_files Celery task (T015)."""

    def setUp(self):
        """Set up test data."""
        self.now = timezone.now()

        # Create old deleted files (should be cleaned up)
        self.old_deleted_file = FileAsset.objects.create(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            original_filename="old_deleted.jpg",
            file_type="image/jpeg",
            file_size=1024,
            storage_path="uploads/old_deleted.jpg",
            uploaded_by_id=uuid.uuid4(),
            is_deleted=True,
            deleted_at=self.now - timedelta(days=35),
        )

        # Create recent deleted files (should NOT be cleaned up)
        self.recent_deleted_file = FileAsset.objects.create(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            original_filename="recent_deleted.jpg",
            file_type="image/jpeg",
            file_size=1024,
            storage_path="uploads/recent_deleted.jpg",
            uploaded_by_id=uuid.uuid4(),
            is_deleted=True,
            deleted_at=self.now - timedelta(days=15),
        )

        # Create active files (should NOT be cleaned up)
        self.active_file = FileAsset.objects.create(
            id=uuid.uuid4(),
            organization_id=uuid.uuid4(),
            original_filename="active.jpg",
            file_type="image/jpeg",
            file_size=1024,
            storage_path="uploads/active.jpg",
            uploaded_by_id=uuid.uuid4(),
            is_deleted=False,
        )

    @patch("files.tasks.StorageBackend")
    def test_cleanup_deleted_files_success(self, mock_storage):
        """Test successful cleanup of old deleted files."""
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.delete_file.return_value = True

        # Execute
        result = cleanup_deleted_files()

        # Verify results
        assert result["success"] is True
        assert result["files_cleaned"] == 1
        assert result["storage_cleaned"] == 1
        assert result["errors"] == 0

        # Check database - old deleted file should be removed
        assert not FileAsset.objects.filter(id=self.old_deleted_file.id).exists()

        # Check other files are untouched
        assert FileAsset.objects.filter(id=self.recent_deleted_file.id).exists()
        assert FileAsset.objects.filter(id=self.active_file.id).exists()

        # Verify storage interactions
        mock_storage_instance.delete_file.assert_called_once_with(
            self.old_deleted_file.storage_path
        )

    @patch("files.tasks.StorageBackend")
    def test_cleanup_deleted_files_custom_retention_days(self, mock_storage):
        """Test cleanup with custom retention period."""
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.delete_file.return_value = True

        # Execute with 10-day retention
        result = cleanup_deleted_files(retention_days=10)

        # With 10-day retention, both deleted files should be cleaned up
        assert result["success"] is True
        assert result["files_cleaned"] == 2
        assert result["storage_cleaned"] == 2

        # Check database
        assert not FileAsset.objects.filter(
            id__in=[self.old_deleted_file.id, self.recent_deleted_file.id]
        ).exists()
        assert FileAsset.objects.filter(id=self.active_file.id).exists()

    @patch("files.tasks.StorageBackend")
    def test_cleanup_deleted_files_storage_error(self, mock_storage):
        """Test handling of storage deletion errors."""
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.delete_file.side_effect = Exception("Storage error")

        # Execute
        result = cleanup_deleted_files()

        # Verify partial success (DB cleaned but storage failed)
        assert result["success"] is True  # Task still succeeds overall
        assert result["files_cleaned"] == 1
        assert result["storage_cleaned"] == 0
        assert result["errors"] == 1

        # Check database - record should still be removed despite storage error
        assert not FileAsset.objects.filter(id=self.old_deleted_file.id).exists()

    @patch("files.tasks.StorageBackend")
    def test_cleanup_deleted_files_with_thumbnails(self, mock_storage):
        """Test cleanup of files with thumbnails."""
        # Add thumbnail path to old deleted file
        self.old_deleted_file.thumbnail_path = "uploads/old_deleted_thumb.jpg"
        self.old_deleted_file.save()

        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance
        mock_storage_instance.delete_file.return_value = True

        # Execute
        result = cleanup_deleted_files()

        # Verify both original and thumbnail are deleted
        assert result["success"] is True
        assert result["storage_cleaned"] == 2  # Original + thumbnail

        # Verify storage calls
        calls = mock_storage_instance.delete_file.call_args_list
        assert len(calls) == 2
        called_paths = [call[0][0] for call in calls]
        assert self.old_deleted_file.storage_path in called_paths
        assert self.old_deleted_file.thumbnail_path in called_paths

    def test_cleanup_deleted_files_no_files_to_clean(self):
        """Test behavior when no files need cleaning."""
        # Delete the old file so there's nothing to clean up
        self.old_deleted_file.delete()

        # Execute
        result = cleanup_deleted_files()

        # Verify
        assert result["success"] is True
        assert result["files_cleaned"] == 0
        assert result["storage_cleaned"] == 0
        assert result["errors"] == 0

    @patch("files.tasks.StorageBackend")
    def test_cleanup_deleted_files_dry_run(self, mock_storage):
        """Test dry run mode (no actual deletions)."""
        mock_storage_instance = Mock(spec=StorageBackend)
        mock_storage.return_value = mock_storage_instance

        # Execute dry run
        result = cleanup_deleted_files(dry_run=True)

        # Verify no deletions occurred
        assert result["success"] is True
        assert result["files_cleaned"] == 0
        assert result["storage_cleaned"] == 0
        assert "would_clean" in result
        assert result["would_clean"] == 1

        # Check files still exist
        assert FileAsset.objects.filter(id=self.old_deleted_file.id).exists()

        # Verify no storage calls
        mock_storage_instance.delete_file.assert_not_called()


# Integration Tests (optional - test with real Celery if celery-testing is available)
class CeleryTaskIntegrationTests(TestCase):
    """Integration tests for Celery task execution."""

    @pytest.mark.celery
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_generate_thumbnail_eager_execution(self):
        """Test thumbnail generation with eager task execution."""
        # This test requires celery-testing setup
        # Skipped if not available
        pytest.skip("Integration test - requires Celery test setup")

    @pytest.mark.celery
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_cleanup_deleted_files_eager_execution(self):
        """Test cleanup task with eager task execution."""
        # This test requires celery-testing setup
        # Skipped if not available
        pytest.skip("Integration test - requires Celery test setup")
