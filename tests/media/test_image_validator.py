"""Tests for ImageValidator.

Tests cover all validation scenarios including edge cases for corrupt,
empty, truncated, oversized, and over-dimension images.
"""

from io import BytesIO

import pytest
from PIL import Image

from src.media.validation import (
    ImageValidationError,
    ImageValidationResult,
    ImageValidator,
)


# Helper to create test images
def create_test_image(format: str, width: int, height: int) -> bytes:
    """Create a valid test image in memory."""
    img = Image.new("RGB", (width, height), color="red")
    buffer = BytesIO()
    img.save(buffer, format=format)
    return buffer.getvalue()


class TestImageValidationResult:
    """Tests for ImageValidationResult dataclass."""

    def test_success_factory(self):
        result = ImageValidationResult.success(
            format="PNG", width=100, height=100, file_size=1024
        )
        assert result.valid is True
        assert result.format == "PNG"
        assert result.width == 100
        assert result.height == 100
        assert result.file_size == 1024
        assert result.error is None
        assert result.message is None

    def test_failure_factory(self):
        result = ImageValidationResult.failure(
            ImageValidationError.CORRUPT, "Test error message"
        )
        assert result.valid is False
        assert result.error == ImageValidationError.CORRUPT
        assert result.message == "Test error message"
        assert result.format is None
        assert result.width is None


class TestValidateFormat:
    """Tests for format validation with magic byte check."""

    def test_valid_png(self):
        data = create_test_image("PNG", 100, 100)
        result = ImageValidator.validate_format(data)
        assert result.valid
        assert result.format == "PNG"
        assert result.width == 100
        assert result.height == 100

    def test_valid_jpeg(self):
        data = create_test_image("JPEG", 100, 100)
        result = ImageValidator.validate_format(data)
        assert result.valid
        assert result.format == "JPEG"

    def test_valid_webp(self):
        data = create_test_image("WEBP", 100, 100)
        result = ImageValidator.validate_format(data)
        assert result.valid
        assert result.format == "WEBP"

    def test_valid_gif(self):
        data = create_test_image("GIF", 100, 100)
        result = ImageValidator.validate_format(data)
        assert result.valid
        assert result.format == "GIF"

    def test_corrupt_data(self):
        result = ImageValidator.validate_format(b"not an image")
        assert not result.valid
        assert result.error == ImageValidationError.CORRUPT

    def test_empty_bytes(self):
        result = ImageValidator.validate_format(b"")
        assert not result.valid
        assert result.error == ImageValidationError.CORRUPT

    def test_truncated_image(self):
        data = create_test_image("PNG", 100, 100)
        truncated = data[: len(data) // 2]  # Cut in half
        result = ImageValidator.validate_format(truncated)
        assert not result.valid
        assert result.error == ImageValidationError.CORRUPT

    def test_file_like_object(self):
        data = create_test_image("PNG", 100, 100)
        file_obj = BytesIO(data)
        result = ImageValidator.validate_format(file_obj)
        assert result.valid
        assert result.format == "PNG"
        # Verify file position is reset
        assert file_obj.tell() == 0

    def test_unsupported_format_bmp(self):
        """BMP format should be rejected."""
        img = Image.new("RGB", (100, 100), color="red")
        buffer = BytesIO()
        img.save(buffer, format="BMP")
        data = buffer.getvalue()
        result = ImageValidator.validate_format(data)
        assert not result.valid
        assert result.error == ImageValidationError.FORMAT
        assert "BMP" in result.message


class TestValidateSize:
    """Tests for file size validation."""

    def test_small_file_passes(self):
        data = b"x" * 1024  # 1KB
        result = ImageValidator.validate_size(data)
        assert result.valid
        assert result.file_size == 1024

    def test_exact_limit_passes(self):
        limit = 1024 * 1024  # 1MB for test
        data = b"x" * limit
        result = ImageValidator.validate_size(data, max_bytes=limit)
        assert result.valid
        assert result.file_size == limit

    def test_over_limit_fails(self):
        limit = 1024 * 1024  # 1MB
        data = b"x" * (limit + 1)
        result = ImageValidator.validate_size(data, max_bytes=limit)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_BYTES
        assert "1MB" in result.message

    def test_empty_file_fails(self):
        result = ImageValidator.validate_size(b"")
        assert not result.valid
        assert result.error == ImageValidationError.ZERO_SIZE

    def test_file_like_object(self):
        data = b"x" * 1024
        file_obj = BytesIO(data)
        result = ImageValidator.validate_size(file_obj)
        assert result.valid
        assert result.file_size == 1024
        # Verify file position is reset
        assert file_obj.tell() == 0

    def test_default_20mb_limit(self):
        # Just under 20MB should pass
        data = b"x" * (19 * 1024 * 1024)
        result = ImageValidator.validate_size(data)
        assert result.valid

    def test_over_20mb_fails_with_default(self):
        data = b"x" * (21 * 1024 * 1024)
        result = ImageValidator.validate_size(data)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_BYTES


class TestValidateDimensions:
    """Tests for image dimension validation."""

    def test_normal_dimensions_pass(self):
        data = create_test_image("PNG", 1920, 1080)
        result = ImageValidator.validate_dimensions(data)
        assert result.valid
        assert result.width == 1920
        assert result.height == 1080

    def test_at_max_limit_passes(self):
        data = create_test_image("PNG", 8192, 8192)
        result = ImageValidator.validate_dimensions(data, max_width=8192, max_height=8192)
        assert result.valid

    def test_width_over_limit_fails(self):
        data = create_test_image("PNG", 8193, 100)
        result = ImageValidator.validate_dimensions(data)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_DIMS
        assert "8193" in result.message

    def test_height_over_limit_fails(self):
        data = create_test_image("PNG", 100, 8193)
        result = ImageValidator.validate_dimensions(data)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_DIMS
        assert "8193" in result.message

    def test_corrupt_image_fails(self):
        result = ImageValidator.validate_dimensions(b"not an image")
        assert not result.valid
        assert result.error == ImageValidationError.CORRUPT

    def test_custom_limits(self):
        data = create_test_image("PNG", 1000, 1000)
        result = ImageValidator.validate_dimensions(data, max_width=500, max_height=500)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_DIMS


class TestValidateFull:
    """Tests for the combined validate() method."""

    def test_valid_image_passes_all_checks(self):
        data = create_test_image("PNG", 1920, 1080)
        result = ImageValidator.validate(data)
        assert result.valid
        assert result.format == "PNG"
        assert result.width == 1920
        assert result.height == 1080
        assert result.file_size > 0

    def test_corrupt_fails_early(self):
        result = ImageValidator.validate(b"not an image")
        assert not result.valid
        assert result.error == ImageValidationError.CORRUPT

    def test_validation_order_size_first(self):
        # Oversized garbage data should fail on size before format check
        data = b"x" * (21 * 1024 * 1024)  # 21MB of garbage
        result = ImageValidator.validate(data)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_BYTES

    def test_empty_file_fails(self):
        result = ImageValidator.validate(b"")
        assert not result.valid
        assert result.error == ImageValidationError.ZERO_SIZE

    def test_oversized_dimensions_fail(self):
        data = create_test_image("PNG", 10000, 100)
        result = ImageValidator.validate(data)
        assert not result.valid
        assert result.error == ImageValidationError.TOO_LARGE_DIMS

    def test_jpeg_valid(self):
        data = create_test_image("JPEG", 800, 600)
        result = ImageValidator.validate(data)
        assert result.valid
        assert result.format == "JPEG"

    def test_webp_valid(self):
        data = create_test_image("WEBP", 800, 600)
        result = ImageValidator.validate(data)
        assert result.valid
        assert result.format == "WEBP"

    def test_custom_limits_all(self):
        data = create_test_image("PNG", 500, 500)
        # With custom limits that allow this image
        result = ImageValidator.validate(
            data, max_bytes=10 * 1024 * 1024, max_width=1000, max_height=1000
        )
        assert result.valid

    def test_file_pointer_preserved(self):
        """Ensure file-like objects can be read after validation."""
        data = create_test_image("PNG", 100, 100)
        file_obj = BytesIO(data)

        result = ImageValidator.validate(file_obj)
        assert result.valid

        # File should be at position 0 for downstream reading
        assert file_obj.tell() == 0

        # Should be able to read the full content
        content = file_obj.read()
        assert len(content) == len(data)
