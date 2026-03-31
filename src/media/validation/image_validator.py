"""Centralized image validation using PIL.

This module provides validation for uploaded images before they enter
the processing pipeline, checking format, size, and dimensions.
"""

from __future__ import annotations

import io
from dataclasses import dataclass
from enum import Enum
from typing import TYPE_CHECKING, BinaryIO, Optional, Union

from PIL import Image

if TYPE_CHECKING:
    pass


class ImageValidationError(str, Enum):
    """Image validation error types."""

    CORRUPT = "corrupt"  # Can't be opened by PIL
    FORMAT = "invalid_format"  # Not PNG/JPEG/WEBP/GIF
    TOO_LARGE_BYTES = "too_large"  # Exceeds file size limit
    TOO_LARGE_DIMS = "too_large_dims"  # Exceeds dimension limit
    ZERO_SIZE = "zero_size"  # Empty file


@dataclass
class ImageValidationResult:
    """Result of image validation check."""

    valid: bool
    error: Optional[ImageValidationError] = None
    message: Optional[str] = None
    # Populated on success
    format: Optional[str] = None  # "PNG", "JPEG", "WEBP"
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None

    @classmethod
    def success(
        cls, format: str, width: int, height: int, file_size: int
    ) -> ImageValidationResult:
        """Create a successful validation result."""
        return cls(
            valid=True, format=format, width=width, height=height, file_size=file_size
        )

    @classmethod
    def failure(
        cls, error: ImageValidationError, message: str
    ) -> ImageValidationResult:
        """Create a failed validation result."""
        return cls(valid=False, error=error, message=message)


class ImageValidator:
    """Centralized image validation using PIL."""

    # Supported formats (uppercase as PIL returns)
    ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP", "GIF"}

    # Default limits
    MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB for images
    MAX_DIMENSION = 8192  # Max width or height

    @classmethod
    def validate_format(cls, file: Union[BinaryIO, bytes]) -> ImageValidationResult:
        """Validate image format by actually opening with PIL.

        Args:
            file: File-like object or bytes

        Returns:
            ImageValidationResult with format info on success
        """
        try:
            # Handle bytes input
            if isinstance(file, bytes):
                file = io.BytesIO(file)

            # Store position to restore later
            pos = file.tell() if hasattr(file, "tell") else 0

            # Attempt to open with PIL
            with Image.open(file) as img:
                # Verify is a real check - forces full image load
                img.verify()

            # Restore position for re-read
            if hasattr(file, "seek"):
                file.seek(pos)

            # Re-open to get dimensions (verify() closes the image)
            with Image.open(file) as img:
                format_name = img.format
                width, height = img.size

            # Restore position again
            if hasattr(file, "seek"):
                file.seek(pos)

            # Check allowed formats
            if format_name not in cls.ALLOWED_FORMATS:
                return ImageValidationResult.failure(
                    ImageValidationError.FORMAT,
                    f"Format {format_name} not supported. Use PNG, JPEG, WEBP, or GIF.",
                )

            return ImageValidationResult.success(
                format=format_name,
                width=width,
                height=height,
                file_size=0,  # Will be set by validate() wrapper
            )

        except Exception as e:
            return ImageValidationResult.failure(
                ImageValidationError.CORRUPT,
                f"Image data is corrupt or unreadable: {e!s}",
            )

    @classmethod
    def validate_size(
        cls,
        file: Union[BinaryIO, bytes],
        max_bytes: int | None = None,
    ) -> ImageValidationResult:
        """Validate file size is within limits.

        Args:
            file: File-like object or bytes
            max_bytes: Maximum allowed size (default 20MB)

        Returns:
            ImageValidationResult with file_size on success
        """
        if max_bytes is None:
            max_bytes = cls.MAX_FILE_SIZE_BYTES

        if isinstance(file, bytes):
            file_size = len(file)
        else:
            # Get size without reading entire file
            pos = file.tell()
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(pos)  # Restore position

        if file_size == 0:
            return ImageValidationResult.failure(
                ImageValidationError.ZERO_SIZE,
                "File is empty",
            )

        if file_size > max_bytes:
            mb_size = file_size / (1024 * 1024)
            mb_limit = max_bytes / (1024 * 1024)
            return ImageValidationResult.failure(
                ImageValidationError.TOO_LARGE_BYTES,
                f"File size {mb_size:.1f}MB exceeds {mb_limit:.0f}MB limit",
            )

        return ImageValidationResult(valid=True, file_size=file_size)

    @classmethod
    def validate_dimensions(
        cls,
        file: Union[BinaryIO, bytes],
        max_width: int | None = None,
        max_height: int | None = None,
    ) -> ImageValidationResult:
        """Validate image dimensions are within limits.

        Args:
            file: File-like object or bytes
            max_width: Maximum allowed width
            max_height: Maximum allowed height

        Returns:
            ImageValidationResult with dimensions on success
        """
        if max_width is None:
            max_width = cls.MAX_DIMENSION
        if max_height is None:
            max_height = cls.MAX_DIMENSION

        try:
            if isinstance(file, bytes):
                file = io.BytesIO(file)

            pos = file.tell() if hasattr(file, "tell") else 0

            with Image.open(file) as img:
                width, height = img.size

            if hasattr(file, "seek"):
                file.seek(pos)

            if width > max_width or height > max_height:
                return ImageValidationResult.failure(
                    ImageValidationError.TOO_LARGE_DIMS,
                    f"Dimensions {width}x{height} exceed {max_width}x{max_height} limit",
                )

            return ImageValidationResult(valid=True, width=width, height=height)

        except Exception as e:
            return ImageValidationResult.failure(
                ImageValidationError.CORRUPT,
                f"Could not read image dimensions: {e!s}",
            )

    @classmethod
    def validate(
        cls,
        file: Union[BinaryIO, bytes],
        max_bytes: int | None = None,
        max_width: int | None = None,
        max_height: int | None = None,
    ) -> ImageValidationResult:
        """Run all validations in optimal order.

        Order: size (fast, no PIL) → format (opens file) → dimensions (already opened)

        Args:
            file: File-like object or bytes
            max_bytes: Maximum allowed size (default 20MB)
            max_width: Maximum allowed width (default 8192)
            max_height: Maximum allowed height (default 8192)

        Returns:
            ImageValidationResult with all metadata on success
        """
        if max_bytes is None:
            max_bytes = cls.MAX_FILE_SIZE_BYTES
        if max_width is None:
            max_width = cls.MAX_DIMENSION
        if max_height is None:
            max_height = cls.MAX_DIMENSION

        # Size check first (cheapest)
        size_result = cls.validate_size(file, max_bytes)
        if not size_result.valid:
            return size_result

        # Format check (also gets dimensions)
        format_result = cls.validate_format(file)
        if not format_result.valid:
            return format_result

        # Dimension check
        if format_result.width > max_width or format_result.height > max_height:
            return ImageValidationResult.failure(
                ImageValidationError.TOO_LARGE_DIMS,
                f"Dimensions {format_result.width}x{format_result.height} exceed "
                f"{max_width}x{max_height} limit",
            )

        # All passed - return full result
        return ImageValidationResult.success(
            format=format_result.format,
            width=format_result.width,
            height=format_result.height,
            file_size=size_result.file_size,
        )
