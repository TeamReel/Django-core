"""Asset processing service for raw → lineup-ready conversion.

Processes member media assets (fullbody, closeup, intro, celebration, then_vs_now)
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
import json
import logging
import subprocess
import tempfile
import time
from pathlib import Path
from typing import TYPE_CHECKING, Any, Callable
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


class AssetProcessingCancelled(Exception):
    """Raised when asset processing is cancelled by the user."""


class AssetProcessor:
    """Processes raw member assets to lineup-ready format.

    Handles:
    - Images (fullbody, closeup): bg removal + resize/crop + PNG
    - Videos (intro, celebration, then_vs_now): bg removal + resize + re-encode MP4
    """

    def process_asset(
        self,
        raw_url: str,
        asset_type: str,
        membership_id: str,
        kit_type: str,
        variant_id: str | None = None,
        organisation_id: str | int | None = None,
        bg_removal_backend: str = "rvm",
        should_cancel: Callable[[], bool] | None = None,
        progress_callback: Callable[[int, int], None] | None = None,
        role: str = "player",
    ) -> dict[str, Any]:
        """Process a raw asset to lineup-ready format.

        Args:
            raw_url: S3 path or URL to the raw asset
            asset_type: One of 'fullbody', 'closeup', 'intro', 'celebration', 'then_vs_now'
            membership_id: ProjectMembership ID (for S3 path scoping)
            kit_type: Kit type (home, away, third, goalkeeper)
            variant_id: Optional style variant (e.g. 'arms_crossed')
            organisation_id: Organisation ID for S3 path scoping
            bg_removal_backend: "rvm" (Robust Video Matting) or "rembg" (per-frame U2-Net)
                                RVM is preferred for video — temporal consistency, no flicker.
                                If "rvm" is requested but unavailable, processing fails (no fallback).
                                Only used for video types (intro, celebration);
                                images always use rembg single-pass.

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
        logger.info(
            "asset_processing_start type=%s kit=%s variant=%s backend=%s raw_url_type=%s",
            asset_type,
            kit_type,
            variant_id or "default",
            bg_removal_backend,
            "http"
            if raw_url.startswith("http://") or raw_url.startswith("https://")
            else "storage",
        )

        try:
            if isinstance(spec, ImageSpec):
                processed_url, actual_specs = self._process_image(
                    raw_url,
                    spec,
                    membership_id,
                    asset_type,
                    kit_type,
                    variant_id,
                    organisation_id,
                    role=role,
                )
            elif isinstance(spec, VideoSpec):
                logger.info(
                    "asset_processing_video_path type=%s effective_backend=%s",
                    asset_type,
                    bg_removal_backend,
                )
                processed_url, actual_specs = self._process_video(
                    raw_url,
                    spec,
                    membership_id,
                    asset_type,
                    kit_type,
                    variant_id,
                    organisation_id,
                    bg_removal_backend=bg_removal_backend,
                    should_cancel=should_cancel,
                    progress_callback=progress_callback,
                    role=role,
                )
            else:
                raise AssetProcessingError(f"Unsupported spec type: {type(spec)}")

            elapsed = time.monotonic() - start_time
            logger.info(
                "asset_processing_done type=%s in=%.3fs processed_url=%s",
                asset_type,
                elapsed,
                processed_url,
            )

            result_dict: dict = {
                "raw": raw_url,
                "processed": processed_url,
                "processing_state": ProcessingState.PROCESSED.value,
                "specs": actual_specs,
                "processed_at": timezone.now().isoformat(),
            }
            # Propagate browser-playable preview URL if the processed format
            # is not natively playable in browsers (e.g. ProRes MOV).
            if actual_specs.get("preview_url"):
                preview = actual_specs.pop("preview_url")
                result_dict["preview_url"] = preview
                # The frontend uses `processed` as <video> src.
                # Browsers cannot play ProRes MOV, so override `processed`
                # with the browser-playable MP4 preview.
                result_dict["processed_source"] = processed_url
                result_dict["processed"] = preview
            return result_dict

        except AssetProcessingCancelled:
            elapsed = time.monotonic() - start_time
            logger.info(
                "asset_processing_cancelled type=%s kit=%s variant=%s after=%.3fs",
                asset_type,
                kit_type,
                variant_id or "default",
                elapsed,
            )
            return {
                "raw": raw_url,
                "processed": None,
                "processing_state": ProcessingState.CANCELLED.value,
                "cancelled_at": timezone.now().isoformat(),
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
        *,
        role: str = "player",
    ) -> tuple[str, dict]:
        """Process an image asset: download → bg remove → resize/crop → upload."""
        from files.utils import get_storage_backend
        from PIL import Image

        backend = get_storage_backend()

        # 1. Download raw image
        t0 = time.monotonic()
        raw_data = self._download_asset(raw_url, backend)
        logger.info(
            "asset_processing_download_done type=%s bytes=%d in=%.3fs",
            asset_type,
            len(raw_data),
            time.monotonic() - t0,
        )
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
        from src.video.utils.asset_metadata import build_s3_asset_path

        storage_path = build_s3_asset_path(
            member_id=membership_id,
            role=role,
            asset_type=asset_type,
            kit=kit_type,
            variant=variant_id or "default",
            content_hash=uuid4().hex[:8],
            ext="png",
        )

        t_up = time.monotonic()
        saved_path = backend.save(storage_path, buffer)
        logger.info(
            "asset_processing_upload_done type=%s format=png in=%.3fs storage_path=%s",
            asset_type,
            time.monotonic() - t_up,
            storage_path,
        )

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
        bg_removal_backend: str = "rembg",
        should_cancel: Callable[[], bool] | None = None,
        progress_callback: Callable[[int, int], None] | None = None,
        role: str = "player",
    ) -> tuple[str, dict]:
        """Process a video asset: download → bg remove → re-encode → upload.

        Supports two bg removal backends:
          - "rvm": Robust Video Matting (PyTorch). Temporal consistency via recurrent
            state → flicker-free mattes. Preferred for intro/celebration videos.
            Processes full video as a stream (no frame extraction to disk).
          - "rembg": Per-frame U2-Net background removal. No temporal consistency
                        but doesn't require PyTorch.

        Output is WebM VP9 with alpha channel for true transparency.
        """
        from files.utils import get_storage_backend

        backend = get_storage_backend()

        with tempfile.TemporaryDirectory(prefix="asset_proc_") as tmpdir:
            tmpdir_path = Path(tmpdir)

            if should_cancel and should_cancel():
                raise AssetProcessingCancelled()

            # 1. Download raw video
            t0 = time.monotonic()
            raw_data = self._download_asset(raw_url, backend)
            logger.info(
                "asset_processing_download_done type=%s bytes=%d in=%.3fs",
                asset_type,
                len(raw_data),
                time.monotonic() - t0,
            )
            input_path = tmpdir_path / "input.mp4"
            input_path.write_bytes(raw_data)
            try:
                logger.info(
                    "asset_processing_input_written type=%s path=%s size_bytes=%d",
                    asset_type,
                    str(input_path),
                    input_path.stat().st_size,
                )
            except Exception:  # noqa: BLE001
                pass

            # Composite videos (photo_composite, walking_composite) already have
            # backgrounds and should NOT have bg removal applied. Just resize/re-encode.
            if not spec.bg_removed:
                logger.info(
                    "asset_processing_video_backend_selected type=%s backend=passthrough (no bg removal)",
                    asset_type,
                )
                return self._process_video_passthrough(
                    input_path,
                    spec,
                    membership_id,
                    asset_type,
                    kit_type,
                    variant_id,
                    backend,
                    should_cancel=should_cancel,
                    role=role,
                )

            # Determine effective bg removal backend
            effective_backend = bg_removal_backend
            if effective_backend == "rvm":
                from src.video.services.rvm_processor import is_rvm_available

                if not is_rvm_available():
                    raise AssetProcessingError(
                        "RVM requested but torch is not available in this environment. "
                        "Install torch or run processing in an environment that supports RVM."
                    )

            if effective_backend == "rvm":
                logger.info(
                    "asset_processing_video_backend_selected type=%s backend=rvm",
                    asset_type,
                )
                return self._process_video_rvm(
                    input_path,
                    spec,
                    membership_id,
                    asset_type,
                    kit_type,
                    variant_id,
                    backend,
                    should_cancel=should_cancel,
                    progress_callback=progress_callback,
                    role=role,
                )

            # Fall through to original rembg pipeline
            logger.info(
                "asset_processing_video_backend_selected type=%s backend=rembg",
                asset_type,
            )
            return self._process_video_rembg(
                input_path,
                spec,
                membership_id,
                asset_type,
                kit_type,
                variant_id,
                backend,
                should_cancel=should_cancel,
                role=role,
            )

    def _process_video_passthrough(
        self,
        input_path: Path,
        spec: VideoSpec,
        membership_id: str,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        storage_backend: Any,
        should_cancel: Callable[[], bool] | None = None,
        *,
        role: str = "player",
    ) -> tuple[str, dict]:
        """Process a composite video: resize + re-encode WITHOUT background removal.

        Used for photo_composite and walking_composite videos which already
        have their intended background (stadium, pitch, etc.).
        """
        if should_cancel and should_cancel():
            raise AssetProcessingCancelled()

        # Get source video info
        src_fps = self._get_video_fps(str(input_path)) or spec.fps
        duration = self._get_video_duration(str(input_path))

        logger.info(
            "passthrough_video_info type=%s src_fps=%s duration=%s target=%dx%d",
            asset_type,
            src_fps,
            duration,
            spec.width,
            spec.height,
        )

        # Re-encode to target dimensions using H.264 MP4
        output_path = input_path.parent / "output_passthrough.mp4"
        encode_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-vf",
            f"scale={spec.width}:{spec.height}:force_original_aspect_ratio=decrease,"
            f"pad={spec.width}:{spec.height}:(ow-iw)/2:(oh-ih)/2:color=black",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(spec.fps),
            "-movflags",
            "+faststart",
            "-an",
            str(output_path),
        ]
        logger.info("passthrough_ffmpeg_encode_cmd cmd=%s", " ".join(encode_cmd))

        t_enc = time.monotonic()
        result = subprocess.run(
            encode_cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        if result.returncode != 0:
            raise AssetProcessingError(
                f"FFmpeg passthrough encode failed (exit {result.returncode}): "
                f"{result.stderr[:500]}"
            )

        if not output_path.exists():
            raise AssetProcessingError("FFmpeg passthrough produced no output file")

        logger.info(
            "passthrough_encode_done type=%s in=%.3fs size_bytes=%d",
            asset_type,
            time.monotonic() - t_enc,
            output_path.stat().st_size,
        )

        if should_cancel and should_cancel():
            raise AssetProcessingCancelled()

        # Get output duration for metadata
        out_duration = self._get_video_duration(str(output_path))

        # Upload processed version
        from src.video.utils.asset_metadata import build_s3_asset_path

        storage_path = build_s3_asset_path(
            member_id=membership_id,
            role=role,
            asset_type=asset_type,
            kit=kit_type,
            variant=variant_id or "default",
            content_hash=uuid4().hex[:8],
            ext="mp4",
        )

        t_up = time.monotonic()
        with open(output_path, "rb") as f:
            saved_path = storage_backend.save(storage_path, f)
        logger.info(
            "passthrough_upload_done type=%s in=%.3fs storage_path=%s",
            asset_type,
            time.monotonic() - t_up,
            storage_path,
        )

        actual_specs = {
            "width": spec.width,
            "height": spec.height,
            "format": "mp4",
            "fps": spec.fps,
            "codec": "h264",
            "bg_removed": False,
            "duration": out_duration,
        }

        return saved_path, actual_specs

    def _process_video_rvm(
        self,
        input_path: Path,
        spec: VideoSpec,
        membership_id: str,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        storage_backend: Any,
        should_cancel: Callable[[], bool] | None = None,
        progress_callback: Callable[[int, int], None] | None = None,
        *,
        role: str = "player",
    ) -> tuple[str, dict]:
        """Process video using RVM (Robust Video Matting).

        Streams FFmpeg decode → RVM GPU inference → FFmpeg encode.
        Temporal consistency via recurrent state = no flicker.
        """
        from src.video.services.rvm_processor import RVMProcessingCancelled, process_video_rvm

        # Use ProRes .mov directly - VP9 alpha has issues with some libvpx builds
        # and the preflight check adds overhead. MOV is larger but more reliable.
        output_path = input_path.parent / "output_rvm.mov"
        output_format = "mov"

        # Portrait mode for intro/celebration (9:16)
        portrait = spec.height > spec.width

        # Lower downsample = faster CPU processing, reduces throttling on Railway burst CPU
        # 0.35 is ~40% faster than 0.50, with minimal quality loss at 540x960 output
        downsample = 0.35

        t_proc = time.monotonic()
        try:
            metrics = process_video_rvm(
                input_path=input_path,
                output_path=output_path,
                downsample_ratio=downsample,
                portrait=portrait,
                output_format=output_format,
                target_width=spec.width,
                target_height=spec.height,
                should_cancel=should_cancel,
                progress_callback=progress_callback,
            )
        except RVMProcessingCancelled as exc:
            raise AssetProcessingCancelled() from exc

        logger.info(
            "asset_processing_rvm_done type=%s in=%.3fs frames=%s avg_ms=%s fps=%s",
            asset_type,
            time.monotonic() - t_proc,
            metrics.get("frame_count"),
            metrics.get("avg_ms_per_frame"),
            metrics.get("fps"),
        )

        if should_cancel and should_cancel():
            raise AssetProcessingCancelled()

        if not output_path.exists():
            raise AssetProcessingError("RVM produced no output file")

        try:
            logger.info(
                "asset_processing_rvm_output_file path=%s size_bytes=%d",
                str(output_path),
                output_path.stat().st_size,
            )
        except Exception:  # noqa: BLE001
            pass

        # Upload processed version
        from src.video.utils.asset_metadata import build_s3_asset_path

        file_ext = "mov" if output_format == "mov" else "webm"
        hash_suffix = uuid4().hex[:8]
        storage_path = build_s3_asset_path(
            member_id=membership_id,
            role=role,
            asset_type=asset_type,
            kit=kit_type,
            variant=variant_id or "default",
            content_hash=hash_suffix,
            ext=file_ext,
        )

        t_up = time.monotonic()
        with open(output_path, "rb") as f:
            saved_path = storage_backend.save(storage_path, f)
        logger.info(
            "asset_processing_upload_done type=%s format=%s backend=rvm in=%.3fs storage_path=%s",
            asset_type,
            output_format,
            time.monotonic() - t_up,
            storage_path,
        )

        # When the output is MOV (ProRes), browsers cannot play it.
        # Generate a browser-playable MP4 (H.264) preview and upload it too.
        preview_url: str | None = None
        if output_format == "mov":
            preview_url = self._transcode_mov_to_mp4_preview(
                mov_path=output_path,
                membership_id=membership_id,
                asset_type=asset_type,
                kit_type=kit_type,
                variant_id=variant_id,
                hash_suffix=hash_suffix,
                storage_backend=storage_backend,
                role=role,
            )

        actual_specs = {
            "width": spec.width,
            "height": spec.height,
            "format": output_format,
            "fps": metrics.get("fps", spec.fps),
            "codec": "prores" if output_format == "mov" else "vp9",
            "bg_removed": True,
            "bg_removal_backend": "rvm",
            "duration": None,
            "total_frames": metrics.get("frame_count", 0),
            "mask_stability": metrics.get("mask_stability_mean_diff", 0),
        }
        if preview_url:
            actual_specs["preview_url"] = preview_url

        return saved_path, actual_specs

    def _transcode_mov_to_mp4_preview(
        self,
        mov_path: Path,
        membership_id: str,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        hash_suffix: str,
        storage_backend: Any,
        *,
        role: str = "player",
    ) -> str | None:
        """Transcode a ProRes MOV (with alpha) to a browser-playable MP4 preview.

        Returns the storage path of the uploaded MP4, or None on failure.
        The MP4 uses H.264 with a black background (alpha composited to black).
        """
        from src.video.services._common import get_ffmpeg_path, get_ffprobe_path

        preview_path = mov_path.parent / "preview.mp4"
        try:
            ffmpeg = get_ffmpeg_path()
            ffprobe = get_ffprobe_path()

            # First, probe the input MOV to verify it's readable and get duration
            input_probe_cmd = [
                ffprobe,
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "format=duration:stream=nb_frames,codec_name,pix_fmt,width,height",
                "-of",
                "json",
                str(mov_path),
            ]
            input_probe = subprocess.run(
                input_probe_cmd, capture_output=True, timeout=30, check=False
            )
            input_duration: float | None = None
            input_frames: int | None = None
            if input_probe.returncode == 0:
                try:
                    idata = json.loads(input_probe.stdout.decode("utf-8", errors="replace"))
                    dur_raw = (idata.get("format") or {}).get("duration")
                    if dur_raw not in (None, "N/A", ""):
                        input_duration = float(dur_raw)
                    streams = idata.get("streams") or []
                    if streams:
                        fr = streams[0].get("nb_frames")
                        if fr not in (None, "N/A", ""):
                            input_frames = int(fr)
                    logger.info(
                        "mov_to_mp4_input_probe duration_s=%s frames=%s codec=%s pix_fmt=%s",
                        input_duration,
                        input_frames,
                        streams[0].get("codec_name") if streams else None,
                        streams[0].get("pix_fmt") if streams else None,
                    )
                except Exception as exc:  # noqa: BLE001
                    logger.warning(
                        "mov_to_mp4_input_probe_failed rc=%d error=%s stdout=%s",
                        input_probe.returncode,
                        exc,
                        input_probe.stdout.decode(errors="replace")[:200],
                    )
            else:
                logger.warning(
                    "mov_to_mp4_input_probe_error rc=%d stderr=%s",
                    input_probe.returncode,
                    input_probe.stderr.decode(errors="replace")[:300],
                )

            t_transcode = time.monotonic()
            # Simpler command: let FFmpeg auto-negotiate input, force yuv420p output
            cmd = [
                ffmpeg,
                "-y",
                "-v",
                "warning",
                "-i",
                str(mov_path),
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                "-r",
                "25",
                "-movflags",
                "+faststart",
                "-an",
                str(preview_path),
            ]
            logger.info("mov_to_mp4_transcode_cmd cmd=%s", " ".join(cmd))

            result = subprocess.run(cmd, capture_output=True, timeout=180, check=False)
            transcode_s = time.monotonic() - t_transcode

            # Always log stderr for debugging, even on success
            stderr_preview = result.stderr.decode(errors="replace")[:500] if result.stderr else ""
            if result.returncode != 0:
                logger.warning(
                    "mov_to_mp4_preview_failed rc=%d transcode_s=%.3f stderr=%s",
                    result.returncode,
                    transcode_s,
                    stderr_preview,
                )
                return None
            else:
                logger.info(
                    "mov_to_mp4_transcode_done rc=0 transcode_s=%.3f stderr=%s",
                    transcode_s,
                    stderr_preview[:200] if stderr_preview else "(none)",
                )

            # Validate the produced MP4 to avoid uploading 0-second files.
            probe_cmd = [
                ffprobe,
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "format=duration:stream=nb_frames,avg_frame_rate,codec_name,pix_fmt",
                "-of",
                "json",
                str(preview_path),
            ]
            probe = subprocess.run(probe_cmd, capture_output=True, timeout=30, check=False)
            duration_s: float | None = None
            nb_frames: int | None = None
            if probe.returncode == 0:
                try:
                    data = json.loads(probe.stdout.decode("utf-8", errors="replace"))
                    duration_raw = (data.get("format") or {}).get("duration")
                    if duration_raw not in (None, "N/A", ""):
                        duration_s = float(duration_raw)

                    streams = data.get("streams") or []
                    if streams:
                        frames_raw = streams[0].get("nb_frames")
                        if frames_raw not in (None, "N/A", ""):
                            nb_frames = int(frames_raw)
                except Exception as exc:  # noqa: BLE001
                    logger.warning("mov_to_mp4_preview_probe_parse_failed error=%s", exc)

            if not duration_s or duration_s <= 0.01 or (nb_frames is not None and nb_frames <= 1):
                logger.warning(
                    "mov_to_mp4_preview_invalid duration_s=%s nb_frames=%s transcode_s=%.3f stderr=%s",
                    duration_s,
                    nb_frames,
                    transcode_s,
                    result.stderr.decode(errors="replace")[:300],
                )
                return None

            from src.video.utils.asset_metadata import build_s3_asset_path

            storage_path = build_s3_asset_path(
                member_id=membership_id,
                role=role,
                asset_type=asset_type,
                kit=kit_type,
                variant=f"{variant_id or 'default'}_preview",
                content_hash=hash_suffix,
                ext="mp4",
            )
            t_up = time.monotonic()
            with open(preview_path, "rb") as f:
                storage_backend.save(storage_path, f)
            logger.info(
                "mov_to_mp4_preview_done transcode_s=%.3f upload_s=%.3f size_bytes=%d duration_s=%s storage_path=%s",
                transcode_s,
                time.monotonic() - t_up,
                preview_path.stat().st_size,
                duration_s,
                storage_path,
            )
            return storage_path
        except Exception as exc:  # noqa: BLE001
            logger.warning("mov_to_mp4_preview_error error=%s", exc)
            return None
        finally:
            try:
                preview_path.unlink(missing_ok=True)
            except Exception:  # noqa: BLE001
                pass

    def _process_video_rembg(
        self,
        input_path: Path,
        spec: VideoSpec,
        membership_id: str,
        asset_type: str,
        kit_type: str,
        variant_id: str | None,
        storage_backend: Any,
        should_cancel: Callable[[], bool] | None = None,
        *,
        role: str = "player",
    ) -> tuple[str, dict]:
        """Process video using rembg (per-frame U2-Net bg removal).

        Extract frames → rembg per frame → auto-crop → re-encode VP9 WebM.
        """
        tmpdir_path = input_path.parent

        if should_cancel and should_cancel():
            raise AssetProcessingCancelled()

        # 2. Get source video info (fps, duration)
        src_fps = self._get_video_fps(str(input_path)) or spec.fps
        duration = self._get_video_duration(str(input_path))

        # Use reduced fps for bg removal to keep processing time reasonable:
        # A 5s video at 30fps = 150 frames × ~1.5s/frame = ~225s.
        # At 15fps = 75 frames × ~1.5s/frame = ~112s — much more practical.
        process_fps = min(src_fps, 15)

        logger.info(
            "Video info: src_fps=%s, process_fps=%s, duration=%s",
            src_fps,
            process_fps,
            duration,
        )

        logger.info(
            "asset_processing_rembg_plan type=%s frames_estimate=%s",
            asset_type,
            None if duration is None else int(duration * process_fps),
        )

        # 3. Extract frames as PNG at NATIVE resolution (no scale/pad yet).
        #    Scaling to target before bg removal causes issues: a 16:9 source
        #    would become a tiny strip inside the 9:16 target, padded with black.
        #    rembg works best on the native frame where the subject fills it.
        frames_dir = tmpdir_path / "frames"
        frames_dir.mkdir()
        extract_cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-r",
            str(process_fps),
            str(frames_dir / "frame_%06d.png"),
        ]
        logger.info("asset_processing_ffmpeg_extract_cmd cmd=%s", extract_cmd)
        result = subprocess.run(
            extract_cmd,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if result.returncode != 0:
            raise AssetProcessingError(
                f"FFmpeg frame extraction failed (exit {result.returncode}): "
                f"{result.stderr[:500]}"
            )

        frame_files = sorted(frames_dir.glob("frame_*.png"))
        total_frames = len(frame_files)
        if total_frames == 0:
            raise AssetProcessingError("No frames extracted from video")

        logger.info("Extracted %d frames, starting bg removal...", total_frames)

        # 4. Remove background from each frame using rembg
        try:
            from rembg import remove, new_session
        except ImportError as e:
            raise AssetProcessingError(
                f"rembg import failed: {e}. " "Background removal requires rembg + onnxruntime."
            ) from e

        from PIL import Image as PILImage

        processed_dir = tmpdir_path / "processed_frames"
        processed_dir.mkdir()

        # Create rembg session once (reuse model across all frames)
        session = new_session("u2net")

        # Track content bounding box across all frames so we can auto-crop
        # to the player content after bg removal (makes the player fill more
        # of the final target canvas instead of being a tiny strip).
        all_bboxes: list[tuple[int, int, int, int]] = []

        for i, frame_path in enumerate(frame_files):
            if should_cancel and i % 5 == 0 and should_cancel():
                raise AssetProcessingCancelled()
            if i % 20 == 0:
                logger.info("BG removal: frame %d / %d", i + 1, total_frames)

            img_data = frame_path.read_bytes()
            result_bytes = remove(img_data, session=session)

            # Save as RGBA PNG
            out_img = PILImage.open(io.BytesIO(result_bytes)).convert("RGBA")
            out_path = processed_dir / frame_path.name
            out_img.save(str(out_path), format="PNG")

            # Track non-transparent content bbox via alpha channel
            bbox = out_img.split()[3].getbbox()  # alpha channel bbox
            if bbox:
                all_bboxes.append(bbox)

        logger.info("BG removal complete for all %d frames", total_frames)

        # 4b. Auto-crop all frames to the union bounding box of their content.
        #     This eliminates dead transparent space around the player so that
        #     subsequent scaling to the target size makes the player bigger.
        if all_bboxes:
            # Get the first processed frame dimensions for clamping
            first_frame = PILImage.open(processed_dir / frame_files[0].name)
            src_w, src_h = first_frame.size
            first_frame.close()

            union_bbox = (
                min(b[0] for b in all_bboxes),
                min(b[1] for b in all_bboxes),
                max(b[2] for b in all_bboxes),
                max(b[3] for b in all_bboxes),
            )
            # Add 5% margin so the player doesn't touch the edges
            content_w = union_bbox[2] - union_bbox[0]
            content_h = union_bbox[3] - union_bbox[1]
            margin_x = max(int(content_w * 0.05), 4)
            margin_y = max(int(content_h * 0.05), 4)
            crop_bbox = (
                max(0, union_bbox[0] - margin_x),
                max(0, union_bbox[1] - margin_y),
                min(src_w, union_bbox[2] + margin_x),
                min(src_h, union_bbox[3] + margin_y),
            )
            logger.info(
                "Auto-crop: union_bbox=%s, crop_bbox=%s (src=%dx%d)",
                union_bbox,
                crop_bbox,
                src_w,
                src_h,
            )

            for pf in sorted(processed_dir.glob("frame_*.png")):
                if should_cancel and should_cancel():
                    raise AssetProcessingCancelled()
                img = PILImage.open(pf)
                img = img.crop(crop_bbox)
                img.save(str(pf), format="PNG")
                img.close()

        # 5. Re-encode frames to WebM VP9 with alpha channel.
        #    Scale to target dimensions here (AFTER bg removal) so padding
        #    is transparent instead of black.  The pad color 0x00000000 is
        #    fully-transparent black in RGBA.
        output_path = tmpdir_path / "output.webm"
        encode_cmd = [
            "ffmpeg",
            "-y",
            "-framerate",
            str(process_fps),
            "-i",
            str(processed_dir / "frame_%06d.png"),
            "-vf",
            f"scale={spec.width}:{spec.height}:force_original_aspect_ratio=decrease,"
            f"pad={spec.width}:{spec.height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",  # VP9 with alpha
            "-b:v",
            "2M",
            "-auto-alt-ref",
            "0",  # Required for alpha in VP9
            "-an",  # No audio
            str(output_path),
        ]
        logger.info("asset_processing_ffmpeg_encode_cmd cmd=%s", encode_cmd)
        result = subprocess.run(
            encode_cmd,
            capture_output=True,
            text=True,
            timeout=600,  # VP9 encoding can be slow
            check=False,
        )
        if result.returncode != 0:
            raise AssetProcessingError(
                f"FFmpeg VP9 encode failed (exit {result.returncode}): " f"{result.stderr[:500]}"
            )

        if not output_path.exists():
            raise AssetProcessingError("FFmpeg produced no output file")

        if should_cancel and should_cancel():
            raise AssetProcessingCancelled()

        # 6. Get output duration
        out_duration = self._get_video_duration(str(output_path))

        # 7. Upload processed version (as .webm for transparency support)
        from src.video.utils.asset_metadata import build_s3_asset_path

        storage_path = build_s3_asset_path(
            member_id=membership_id,
            role=role,
            asset_type=asset_type,
            kit=kit_type,
            variant=variant_id or "default",
            content_hash=uuid4().hex[:8],
            ext="webm",
        )

        t_up = time.monotonic()
        with open(output_path, "rb") as f:
            saved_path = storage_backend.save(storage_path, f)
        logger.info(
            "asset_processing_upload_done type=%s format=webm backend=rembg in=%.3fs storage_path=%s",
            asset_type,
            time.monotonic() - t_up,
            storage_path,
        )

        actual_specs = {
            "width": spec.width,
            "height": spec.height,
            "format": "webm",
            "fps": process_fps,
            "codec": "vp9",
            "bg_removed": True,
            "bg_removal_backend": "rembg",
            "duration": out_duration,
            "total_frames": total_frames,
        }

        return saved_path, actual_specs

    def _download_asset(self, url_or_path: str, backend: Any) -> bytes:
        """Download asset from S3 or URL."""
        import requests

        # If it's a presigned URL or https URL, download directly
        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            logger.info("asset_processing_download_start source=http")
            resp = requests.get(url_or_path, timeout=60)
            resp.raise_for_status()
            return resp.content

        # Otherwise treat as S3 storage path
        try:
            logger.info("asset_processing_download_start source=storage path=%s", url_or_path)
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

    def _get_video_fps(self, path: str) -> float | None:
        """Get video frame rate using ffprobe."""
        try:
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-select_streams",
                    "v:0",
                    "-show_entries",
                    "stream=r_frame_rate",
                    "-of",
                    "default=noprint_wrappers=1:nokey=1",
                    path,
                ],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
            # ffprobe returns fps as fraction like "30/1" or "24000/1001"
            fps_str = result.stdout.strip()
            if "/" in fps_str:
                num, den = fps_str.split("/")
                return float(num) / float(den) if float(den) > 0 else None
            return float(fps_str) if fps_str else None
        except Exception:
            return None
