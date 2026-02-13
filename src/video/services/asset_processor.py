"""Asset processing service for raw → lineup-ready conversion.

Processes member media assets (fullbody, closeup, intro, celebration)
to standardized lineup-ready format:
  - Background removal
  - Resize / crop to target dimensions
  - Format standardization (PNG for images, MP4 for video)

Usage:
    from src.video.services.asset_processor import AssetProcessor

    processor = AssetProcessor()
    result = processor.process_asset(
        raw_url="s3://bucket/raw/image.png",
        asset_type="fullbody",
        membership_id="...",
        kit_type="home",
    )
"""

from __future__ import annotations

import io
import logging
import subprocess
import tempfile
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any
from uuid import uuid4

if TYPE_CHECKING:
    from PIL import Image

from django.utils import timezone

from src.video.services.asset_processing_specs import (
    ASSET_SPECS,
    ImageSpec,
    ProcessingState,
    VideoSpec,
)

logger = logging.getLogger(__name__)


class AssetProcessingError(Exception):
    """Raised when asset processing fails."""


class AssetProcessor:
    """Processes raw member assets to lineup-ready format.

    Handles:
    - Images (fullbody, closeup): bg removal + resize/crop + PNG
    - Videos (intro, celebration): bg removal + resize + re-encode MP4
    """

    def process_asset(
        self,
        raw_url: str,
        asset_type: str,
        membership_id: str,
        kit_type: str,
        variant_id: str | None = None,
        organisation_id: str | int | None = None,
    ) -> dict[str, Any]:
        """Process a raw asset to lineup-ready format.

        Args:
            raw_url: S3 path or URL to the raw asset
            asset_type: One of 'fullbody', 'closeup', 'intro', 'celebration'
            membership_id: ProjectMembership ID (for S3 path scoping)
            kit_type: Kit type (home, away, third, goalkeeper)
            variant_id: Optional style variant (e.g. 'arms_crossed')
            organisation_id: Organisation ID for S3 path scoping

        Returns:
            Updated variant value dict with processed URL and specs

        Raises:
            AssetProcessingError: If processing fails
        """
        spec = ASSET_SPECS.get(asset_type)
        if not spec:
            raise AssetProcessingError(f"Unknown asset type: {asset_type}")

        logger.info(
            "Processing asset: type=%s, kit=%s, variant=%s",
            asset_type,
            kit_type,
            variant_id or "default",
        )

        start_time = time.monotonic()

        try:
            if isinstance(spec, ImageSpec):
                processed_url, actual_specs = self._process_image(
                    raw_url, spec, membership_id, asset_type, kit_type, variant_id, organisation_id
                )
            elif isinstance(spec, VideoSpec):
                processed_url, actual_specs = self._process_video(
                    raw_url, spec, membership_id, asset_type, kit_type, variant_id, organisation_id
                )
            else:
                raise AssetProcessingError(f"Unsupported spec type: {type(spec)}")

            elapsed = time.monotonic() - start_time
            logger.info(
                "Asset processed in %.1fs: %s → %s",
                elapsed,
                asset_type,
                processed_url,
            )

            return {
                "raw": raw_url,
                "processed": processed_url,
                "processing_state": ProcessingState.PROCESSED.value,
                "specs": actual_specs,
                "processed_at": timezone.now().isoformat(),
            }

        except Exception as exc:
            logger.exception("Asset processing failed: %s", exc)
            return {
                "raw": raw_url,
                "processed": None,
                "processing_state": ProcessingState.FAILED.value,
                "error": str(exc)[:500],
                "processed_at": timezone.now().isoformat(),
            }

    def _process_image(
        self,
        raw_url: str,
        spec: ImageSpec,
        membership_id: str,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        organisation_id: str | int | None,
    ) -> tuple[str, dict]:
        """Process an image asset: download → bg remove → resize/crop → upload."""
        from files.utils import get_storage_backend
        from PIL import Image

        backend = get_storage_backend()

        # 1. Download raw image
        raw_data = self._download_asset(raw_url, backend)
        img = Image.open(io.BytesIO(raw_data))

        # 2. Background removal (if needed and not already transparent)
        if spec.bg_removed:
            img = self._remove_background_image(img)

        # 3. Resize and crop to target dimensions
        img = self._resize_and_crop(img, spec.width, spec.height)

        # 4. Ensure RGBA for transparency
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # 5. Save to buffer
        buffer = io.BytesIO()
        img.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)

        # 6. Upload processed version
        variant_suffix = f"_{variant_id}" if variant_id else ""
        storage_path = (
            f"members/{membership_id}/processed/{asset_type}/"
            f"{kit_type}{variant_suffix}_{uuid4().hex[:8]}.png"
        )

        saved_path = backend.save(storage_path, buffer)

        actual_specs = {
            "width": spec.width,
            "height": spec.height,
            "format": "png",
            "bg_removed": True,
        }

        return saved_path, actual_specs

    def _process_video(
        self,
        raw_url: str,
        spec: VideoSpec,
        membership_id: str,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        organisation_id: str | int | None,
    ) -> tuple[str, dict]:
        """Process a video asset: download → resize → re-encode → upload.

        Note: Full video background removal requires specialized tools (RunwayML,
        rembg-video, etc.). For now, we standardize format/dimensions and flag
        that bg_removed requires manual/AI pre-processing.
        """
        from files.utils import get_storage_backend

        backend = get_storage_backend()

        with tempfile.TemporaryDirectory(prefix="asset_proc_") as tmpdir:
            tmpdir_path = Path(tmpdir)

            # 1. Download raw video
            raw_data = self._download_asset(raw_url, backend)
            input_path = tmpdir_path / "input.mp4"
            input_path.write_bytes(raw_data)

            # 2. Build FFmpeg command for resize + re-encode
            output_path = tmpdir_path / "output.mp4"
            cmd = self._build_video_ffmpeg_command(str(input_path), str(output_path), spec)

            # 3. Run FFmpeg
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            if result.returncode != 0:
                raise AssetProcessingError(
                    f"FFmpeg failed (exit {result.returncode}): {result.stderr[:500]}"
                )

            if not output_path.exists():
                raise AssetProcessingError("FFmpeg produced no output file")

            # 4. Get duration
            duration = self._get_video_duration(str(output_path))

            # 5. Upload
            variant_suffix = f"_{variant_id}" if variant_id else ""
            storage_path = (
                f"members/{membership_id}/processed/{asset_type}/"
                f"{kit_type}{variant_suffix}_{uuid4().hex[:8]}.mp4"
            )

            with open(output_path, "rb") as f:
                saved_path = backend.save(storage_path, f)

            actual_specs = {
                "width": spec.width,
                "height": spec.height,
                "format": "mp4",
                "fps": spec.fps,
                "codec": spec.codec,
                "bg_removed": False,  # Video bg removal not yet automated
                "duration": duration,
            }

            return saved_path, actual_specs

    def _download_asset(self, url_or_path: str, backend: Any) -> bytes:
        """Download asset from S3 or URL."""
        import requests

        # If it's a presigned URL or https URL, download directly
        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            resp = requests.get(url_or_path, timeout=60)
            resp.raise_for_status()
            return resp.content

        # Otherwise treat as S3 storage path
        try:
            file_obj = backend.open(url_or_path, "rb")
            data = file_obj.read()
            file_obj.close()
            return data
        except Exception as exc:
            raise AssetProcessingError(f"Failed to download from storage: {exc}") from exc

    def _remove_background_image(self, img: "Image.Image") -> "Image.Image":
        """Remove background from an image using rembg.

        Raises AssetProcessingError if rembg is not installed — background
        removal is a hard requirement for lineup-ready assets.
        """
        try:
            from rembg import remove
        except ImportError as e:
            raise AssetProcessingError(
                f"rembg import failed: {e}. "
                "Background removal requires rembg + onnxruntime. "
                "Install with: pip install rembg"
            ) from e

        # rembg works on bytes, returns bytes
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        result_bytes = remove(buffer.read())
        from PIL import Image as PILImage

        return PILImage.open(io.BytesIO(result_bytes))

    def _resize_and_crop(self, img: "Image.Image", target_w: int, target_h: int) -> "Image.Image":
        """Resize and center-crop image to exact target dimensions.

        Strategy: scale to fill target aspect ratio, then center-crop.
        """
        from PIL import Image

        src_w, src_h = img.size
        target_ratio = target_w / target_h
        src_ratio = src_w / src_h

        if src_ratio > target_ratio:
            # Source is wider → scale by height, crop width
            new_h = target_h
            new_w = int(src_w * (target_h / src_h))
        else:
            # Source is taller → scale by width, crop height
            new_w = target_w
            new_h = int(src_h * (target_w / src_w))

        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Center crop
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img = img.crop((left, top, left + target_w, top + target_h))

        return img

    def _build_video_ffmpeg_command(
        self, input_path: str, output_path: str, spec: VideoSpec
    ) -> list[str]:
        """Build FFmpeg command for video standardization."""
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-vf",
            (
                f"scale={spec.width}:{spec.height}:"
                f"force_original_aspect_ratio=decrease,"
                f"pad={spec.width}:{spec.height}:(ow-iw)/2:(oh-ih)/2:color=black@0"
            ),
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "23",
            "-r",
            str(spec.fps),
            "-pix_fmt",
            "yuva420p",  # Support alpha for transparency
            "-an",  # No audio for lineup assets
            "-movflags",
            "+faststart",
            output_path,
        ]

        if spec.max_duration:
            cmd.insert(-1, "-t")
            cmd.insert(-1, str(spec.max_duration))

        return cmd

    def _get_video_duration(self, path: str) -> float | None:
        """Get video duration using ffprobe."""
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    path,
                ],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            return float(result.stdout.strip()) if result.stdout.strip() else None
        except Exception:
            return None
