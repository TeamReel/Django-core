---
work_package_id: WP01
title: Image Validation Module
lane: "doing"
dependencies: []
requirement_refs:
- FR-001
- FR-002
planning_base_branch: main
merge_target_branch: main
branch_strategy: Create worktree from main, merge back to main when complete
base_branch: main
base_commit: ef9e25050d8fe3427d37a430f2fb8ebbe841c153
created_at: '2026-03-31T14:22:25.408848+00:00'
subtasks: [T001, T002, T003, T004, T005, T006, T007, T008]
agent: "Code Review"
shell_pid: "110732"
history:
- date: '2026-03-31T14:10:25Z'
  event: created
  author: spec-kitty
---

# WP01: Image Validation Module

## Objective

Create a centralized PIL-based image validation module at `src/media/validation/` that validates:
- **Format**: Magic byte check (not just extension)
- **Size**: Max 20MB file size
- **Dimensions**: Max 8192x8192 pixels

This prevents corrupt, oversized, or invalid images from entering the processing pipeline.

## Context

**Requirements**: FR-001 (PIL format check), FR-002 (file size limits)

**Current State**: Uploads only have Django's `DATA_UPLOAD_MAX_MEMORY_SIZE` check. No PIL validation occurs until much later in the pipeline, causing crashes on corrupt images.

**Target State**: All uploaded images validated at entry point before storage or processing.

**Files to Create**:
- `src/media/__init__.py`
- `src/media/validation/__init__.py`
- `src/media/validation/image_validator.py`
- `tests/media/__init__.py`
- `tests/media/test_image_validator.py`

**Files to Modify**:
- `src/files/views.py` - Add ImageValidator call on upload

## Implementation Command

```bash
spec-kitty implement WP01
```

---

## Subtasks

### T001: Create src/media/validation/ directory structure

**Purpose**: Set up the new media validation module with proper Python package structure.

**Steps**:
1. Create `src/media/__init__.py`:
   ```python
   """Media processing and validation utilities."""
   ```

2. Create `src/media/validation/__init__.py`:
   ```python
   """Image and video validation utilities."""
   from .image_validator import ImageValidator, ImageValidationResult, ImageValidationError

   __all__ = ["ImageValidator", "ImageValidationResult", "ImageValidationError"]
   ```

3. Create empty `tests/media/__init__.py` for test discovery

**Validation**:
- [ ] `src/media/validation/` exists with __init__.py
- [ ] `tests/media/` exists with __init__.py
- [ ] Python can import: `from src.media.validation import ImageValidator`

---

### T002: Create ImageValidationError enum

**Purpose**: Define all possible validation error types for clear error handling.

**Steps**:
1. In `src/media/validation/image_validator.py`, create:
   ```python
   from enum import Enum

   class ImageValidationError(str, Enum):
       """Image validation error types."""
       CORRUPT = "corrupt"              # Can't be opened by PIL
       FORMAT = "invalid_format"         # Not PNG/JPEG/WEBP
       TOO_LARGE_BYTES = "too_large"     # Exceeds file size limit
       TOO_LARGE_DIMS = "too_large_dims" # Exceeds dimension limit
       ZERO_SIZE = "zero_size"           # Empty file
   ```

**Validation**:
- [ ] Enum has 5 values
- [ ] Each value is a descriptive string (for logging/API responses)

---

### T003: Create ImageValidationResult dataclass

**Purpose**: Structured return type that carries validation status, error details, and image metadata on success.

**Steps**:
1. Add to `image_validator.py`:
   ```python
   from dataclasses import dataclass
   from typing import Optional

   @dataclass
   class ImageValidationResult:
       """Result of image validation check."""
       valid: bool
       error: Optional[ImageValidationError] = None
       message: Optional[str] = None
       
       # Populated on success
       format: Optional[str] = None      # "PNG", "JPEG", "WEBP"
       width: Optional[int] = None
       height: Optional[int] = None
       file_size: Optional[int] = None
       
       @classmethod
       def success(cls, format: str, width: int, height: int, file_size: int) -> "ImageValidationResult":
           """Create a successful validation result."""
           return cls(valid=True, format=format, width=width, height=height, file_size=file_size)
       
       @classmethod
       def failure(cls, error: ImageValidationError, message: str) -> "ImageValidationResult":
           """Create a failed validation result."""
           return cls(valid=False, error=error, message=message)
   ```

**Validation**:
- [ ] `success()` factory sets valid=True and populates metadata
- [ ] `failure()` factory sets valid=False with error and message
- [ ] Dataclass is immutable-ish (no __post_init__ mutations)

---

### T004: Implement validate_format() with magic byte check

**Purpose**: Verify the file is actually a valid image (PNG/JPEG/WEBP) by checking magic bytes, not just file extension.

**Steps**:
1. Add ImageValidator class with validate_format():
   ```python
   from PIL import Image
   from typing import BinaryIO, Union
   import io

   class ImageValidator:
       """Centralized image validation using PIL."""
       
       # Supported formats (uppercase as PIL returns)
       ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP", "GIF"}
       
       @classmethod
       def validate_format(cls, file: Union[BinaryIO, bytes]) -> ImageValidationResult:
           """
           Validate image format by actually opening with PIL.
           
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
               pos = file.tell() if hasattr(file, 'tell') else 0
               
               # Attempt to open with PIL
               with Image.open(file) as img:
                   # Verify is a real check - forces full image load
                   img.verify()
                   
               # Restore position for re-read
               if hasattr(file, 'seek'):
                   file.seek(pos)
               
               # Re-open to get dimensions (verify() closes the image)
               with Image.open(file) as img:
                   format_name = img.format
                   width, height = img.size
               
               # Restore position again
               if hasattr(file, 'seek'):
                   file.seek(pos)
               
               # Check allowed formats
               if format_name not in cls.ALLOWED_FORMATS:
                   return ImageValidationResult.failure(
                       ImageValidationError.FORMAT,
                       f"Format {format_name} not supported. Use PNG, JPEG, or WEBP."
                   )
               
               return ImageValidationResult.success(
                   format=format_name,
                   width=width,
                   height=height,
                   file_size=0  # Will be set by validate() wrapper
               )
               
           except Exception as e:
               return ImageValidationResult.failure(
                   ImageValidationError.CORRUPT,
                   f"Image data is corrupt or unreadable: {str(e)}"
               )
   ```

**Edge Cases**:
- File with .png extension but JPEG content → Should pass (format check, not extension)
- File with valid header but corrupt data → `img.verify()` catches this
- Zero-byte file → Caught as corrupt

**Validation**:
- [ ] Valid PNG returns valid=True, format="PNG"
- [ ] Valid JPEG returns valid=True, format="JPEG"
- [ ] Corrupt file returns valid=False, error=CORRUPT
- [ ] BMP file returns valid=False, error=FORMAT

---

### T005: Implement validate_size() with 20MB limit

**Purpose**: Reject files exceeding 20MB before any processing to prevent memory issues.

**Steps**:
1. Add to ImageValidator class:
   ```python
   # Default limits
   MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20MB for images
   
   @classmethod
   def validate_size(
       cls, 
       file: Union[BinaryIO, bytes], 
       max_bytes: int = MAX_FILE_SIZE_BYTES
   ) -> ImageValidationResult:
       """
       Validate file size is within limits.
       
       Args:
           file: File-like object or bytes
           max_bytes: Maximum allowed size (default 20MB)
           
       Returns:
           ImageValidationResult with file_size on success
       """
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
               "File is empty"
           )
       
       if file_size > max_bytes:
           mb_size = file_size / (1024 * 1024)
           mb_limit = max_bytes / (1024 * 1024)
           return ImageValidationResult.failure(
               ImageValidationError.TOO_LARGE_BYTES,
               f"File size {mb_size:.1f}MB exceeds {mb_limit:.0f}MB limit"
           )
       
       return ImageValidationResult(valid=True, file_size=file_size)
   ```

**Validation**:
- [ ] 1KB file passes
- [ ] 19MB file passes
- [ ] 21MB file fails with TOO_LARGE_BYTES
- [ ] 0-byte file fails with ZERO_SIZE

---

### T006: Implement validate_dimensions() with 8192x8192 limit

**Purpose**: Prevent memory exhaustion from extremely large images (decompression bombs).

**Steps**:
1. Add to ImageValidator class:
   ```python
   MAX_DIMENSION = 8192  # Max width or height
   
   @classmethod
   def validate_dimensions(
       cls,
       file: Union[BinaryIO, bytes],
       max_width: int = MAX_DIMENSION,
       max_height: int = MAX_DIMENSION
   ) -> ImageValidationResult:
       """
       Validate image dimensions are within limits.
       
       Args:
           file: File-like object or bytes
           max_width: Maximum allowed width
           max_height: Maximum allowed height
           
       Returns:
           ImageValidationResult with dimensions on success
       """
       try:
           if isinstance(file, bytes):
               file = io.BytesIO(file)
           
           pos = file.tell() if hasattr(file, 'tell') else 0
           
           with Image.open(file) as img:
               width, height = img.size
           
           if hasattr(file, 'seek'):
               file.seek(pos)
           
           if width > max_width or height > max_height:
               return ImageValidationResult.failure(
                   ImageValidationError.TOO_LARGE_DIMS,
                   f"Dimensions {width}x{height} exceed {max_width}x{max_height} limit"
               )
           
           return ImageValidationResult(valid=True, width=width, height=height)
           
       except Exception as e:
           return ImageValidationResult.failure(
               ImageValidationError.CORRUPT,
               f"Could not read image dimensions: {str(e)}"
           )
   ```

2. Add combined `validate()` method:
   ```python
   @classmethod
   def validate(
       cls,
       file: Union[BinaryIO, bytes],
       max_bytes: int = MAX_FILE_SIZE_BYTES,
       max_width: int = MAX_DIMENSION,
       max_height: int = MAX_DIMENSION
   ) -> ImageValidationResult:
       """
       Run all validations in optimal order.
       
       Order: size (fast, no PIL) → format (opens file) → dimensions (already opened)
       """
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
               f"Dimensions {format_result.width}x{format_result.height} exceed {max_width}x{max_height} limit"
           )
       
       # All passed - return full result
       return ImageValidationResult.success(
           format=format_result.format,
           width=format_result.width,
           height=format_result.height,
           file_size=size_result.file_size
       )
   ```

**Validation**:
- [ ] 1920x1080 image passes
- [ ] 8192x8192 image passes (at limit)
- [ ] 8193x100 image fails with TOO_LARGE_DIMS
- [ ] 100x8193 image fails with TOO_LARGE_DIMS

---

### T007: Create unit tests for ImageValidator

**Purpose**: Comprehensive test coverage for all validation scenarios including edge cases.

**Steps**:
1. Create `tests/media/test_image_validator.py`:
   ```python
   import pytest
   from io import BytesIO
   from PIL import Image
   from src.media.validation import ImageValidator, ImageValidationError, ImageValidationResult

   # Helper to create test images
   def create_test_image(format: str, width: int, height: int) -> bytes:
       """Create a valid test image in memory."""
       img = Image.new('RGB', (width, height), color='red')
       buffer = BytesIO()
       img.save(buffer, format=format)
       return buffer.getvalue()

   class TestValidateFormat:
       def test_valid_png(self):
           data = create_test_image('PNG', 100, 100)
           result = ImageValidator.validate_format(data)
           assert result.valid
           assert result.format == 'PNG'
       
       def test_valid_jpeg(self):
           data = create_test_image('JPEG', 100, 100)
           result = ImageValidator.validate_format(data)
           assert result.valid
           assert result.format == 'JPEG'
       
       def test_valid_webp(self):
           data = create_test_image('WEBP', 100, 100)
           result = ImageValidator.validate_format(data)
           assert result.valid
           assert result.format == 'WEBP'
       
       def test_corrupt_data(self):
           result = ImageValidator.validate_format(b'not an image')
           assert not result.valid
           assert result.error == ImageValidationError.CORRUPT
       
       def test_empty_bytes(self):
           result = ImageValidator.validate_format(b'')
           assert not result.valid
           assert result.error == ImageValidationError.CORRUPT
       
       def test_truncated_image(self):
           data = create_test_image('PNG', 100, 100)
           truncated = data[:len(data)//2]  # Cut in half
           result = ImageValidator.validate_format(truncated)
           assert not result.valid
           assert result.error == ImageValidationError.CORRUPT

   class TestValidateSize:
       def test_small_file_passes(self):
           data = b'x' * 1024  # 1KB
           result = ImageValidator.validate_size(data)
           assert result.valid
           assert result.file_size == 1024
       
       def test_exact_limit_passes(self):
           limit = 1024 * 1024  # 1MB for test
           data = b'x' * limit
           result = ImageValidator.validate_size(data, max_bytes=limit)
           assert result.valid
       
       def test_over_limit_fails(self):
           limit = 1024 * 1024  # 1MB
           data = b'x' * (limit + 1)
           result = ImageValidator.validate_size(data, max_bytes=limit)
           assert not result.valid
           assert result.error == ImageValidationError.TOO_LARGE_BYTES
       
       def test_empty_file_fails(self):
           result = ImageValidator.validate_size(b'')
           assert not result.valid
           assert result.error == ImageValidationError.ZERO_SIZE

   class TestValidateDimensions:
       def test_normal_dimensions_pass(self):
           data = create_test_image('PNG', 1920, 1080)
           result = ImageValidator.validate_dimensions(data)
           assert result.valid
           assert result.width == 1920
           assert result.height == 1080
       
       def test_at_max_limit_passes(self):
           data = create_test_image('PNG', 8192, 8192)
           result = ImageValidator.validate_dimensions(data, max_width=8192, max_height=8192)
           assert result.valid
       
       def test_width_over_limit_fails(self):
           data = create_test_image('PNG', 8193, 100)
           result = ImageValidator.validate_dimensions(data)
           assert not result.valid
           assert result.error == ImageValidationError.TOO_LARGE_DIMS
       
       def test_height_over_limit_fails(self):
           data = create_test_image('PNG', 100, 8193)
           result = ImageValidator.validate_dimensions(data)
           assert not result.valid
           assert result.error == ImageValidationError.TOO_LARGE_DIMS

   class TestValidateFull:
       def test_valid_image_passes_all_checks(self):
           data = create_test_image('PNG', 1920, 1080)
           result = ImageValidator.validate(data)
           assert result.valid
           assert result.format == 'PNG'
           assert result.width == 1920
           assert result.height == 1080
           assert result.file_size > 0
       
       def test_corrupt_fails_early(self):
           result = ImageValidator.validate(b'not an image')
           assert not result.valid
           assert result.error == ImageValidationError.CORRUPT
       
       def test_validation_order_size_first(self):
           # Oversized but valid image - should fail on size before format check
           # This is a unit test design choice - we don't actually create 21MB
           data = b'x' * (21 * 1024 * 1024)  # 21MB of garbage
           result = ImageValidator.validate(data)
           assert not result.valid
           assert result.error == ImageValidationError.TOO_LARGE_BYTES
   ```

**Validation**:
- [ ] `pytest tests/media/test_image_validator.py` passes
- [ ] Coverage >90% for image_validator.py
- [ ] All edge cases tested (corrupt, empty, truncated, oversized, over-dimension)

---

### T008: Integrate ImageValidator in files/views.py

**Purpose**: Wire the validator into the upload endpoint to reject invalid images at entry.

**Steps**:
1. Find the upload view in `src/files/views.py`
2. Import ImageValidator:
   ```python
   from src.media.validation import ImageValidator
   ```
3. Add validation before saving:
   ```python
   # In the upload handler, before file.save() or FileAsset.create()
   if uploaded_file.content_type.startswith('image/'):
       result = ImageValidator.validate(uploaded_file.read())
       uploaded_file.seek(0)  # Reset for subsequent reads
       
       if not result.valid:
           return Response(
               {"error": result.message},
               status=status.HTTP_400_BAD_REQUEST
           )
   ```

**Edge Cases**:
- Non-image uploads should skip validation (videos, PDFs handled separately)
- Reset file pointer after validation for downstream processing

**Validation**:
- [ ] Upload corrupt PNG → 400 error with message
- [ ] Upload 25MB image → 400 error about size
- [ ] Upload valid PNG → 200 success
- [ ] Upload PDF → Skips image validation, processes normally

---

## Definition of Done

- [ ] All subtasks (T001-T008) completed
- [ ] `pytest tests/media/test_image_validator.py` passes (>90% coverage)
- [ ] `ruff check src/media/` passes (no lint errors)
- [ ] Manual test: corrupt image upload rejected with clear message
- [ ] No performance regression: validation <100ms p95

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| PIL validation slow on large images | Performance | Profile p95, skip verify() for trusted sources |
| Breaking existing upload flow | Regression | Feature flag for gradual rollout |
| Memory spike on decompression | Stability | Dimension check before full load |

## Reviewer Guidance

1. **Check error messages**: Should be user-friendly, not technical PIL errors
2. **Verify file pointer reset**: After validation, file should still be readable
3. **Test edge cases**: Especially truncated images and extension mismatches
4. **Performance check**: Run with 10MB image, should be <100ms

## Activity Log

- 2026-03-31T14:22:26Z – Bouwer – shell_pid=61292 – lane=doing – Assigned agent via workflow command
- 2026-03-31T14:27:58Z – Bouwer – shell_pid=61292 – lane=for_review – Ready for review: Image validation module with PIL-based format/size/dimension checks, integrated at upload entry point, 33 tests passing
- 2026-03-31T14:32:08Z – Code Review – shell_pid=110732 – lane=doing – Started review via workflow command
