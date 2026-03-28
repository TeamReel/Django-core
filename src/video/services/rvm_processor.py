"""RVM (Robust Video Matting) background removal service.

Uses the RobustVideoMatting model for temporally-consistent
background removal from video (intro clips, celebrations, etc.).

Advantages over rembg (per-frame U2-Net):
  - Recurrent state across frames → smooth, flicker-free mattes
  - Better edge quality on hair/fine details
  - Faster per-frame (GPU) after initial model load

Pipeline:
  FFmpeg decode → raw RGB pipe → RVM inference per frame → RGBA pipe → FFmpeg encode

Usage:
    from src.video.services.rvm_processor import process_video_rvm

    result = process_video_rvm(
        input_path=Path("/tmp/raw_intro.mp4"),
        output_path=Path("/tmp/processed.webm"),
        portrait=True,
    )
"""

from __future__ import annotations

import gc
import json
import logging
import subprocess
import time
from pathlib import Path
from typing import Any

import numpy as np

from src.video.services._common import get_ffmpeg_path, get_ffprobe_path

logger = logging.getLogger(__name__)


def _get_memory_mb() -> float:
    """Get current process memory usage in MB (RSS)."""
    try:
        import resource

        # Linux: maxrss is in KB
        return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
    except ImportError:
        pass
    try:
        import psutil

        return psutil.Process().memory_info().rss / (1024 * 1024)
    except ImportError:
        pass
    return 0.0


# ── Lazy singleton for model + device ──────────────────────────────────────
_rvm_model: Any | None = None
_rvm_device: Any | None = None


class RVMProcessingCancelled(Exception):
    """Raised when RVM processing is cancelled."""


def _get_ffmpeg_path() -> str:
    """Find FFmpeg binary."""
    return get_ffmpeg_path()


def _get_ffprobe_path() -> str:
    """Find ffprobe binary."""
    return get_ffprobe_path()


def _log_ffmpeg_version(ffmpeg: str) -> None:
    """Log FFmpeg version and libvpx support for debugging."""
    try:
        result = subprocess.run(
            [ffmpeg, "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = result.stdout.strip().split("\n")
        version_line = lines[0] if lines else "unknown"
        # Check for libvpx support
        has_libvpx = "libvpx" in result.stdout.lower()
        logger.info(
            "ffmpeg_version binary=%s version=%s has_libvpx=%s",
            ffmpeg,
            version_line,
            has_libvpx,
        )
        # Log the configuration line (contains --enable-libvpx etc.)
        config_lines = [line for line in lines if "configuration:" in line.lower()]
        if config_lines:
            logger.info("ffmpeg_config %s", config_lines[0][:500])
    except Exception as exc:  # noqa: BLE001
        logger.warning("ffmpeg_version_check_failed error=%s", exc)


def _preflight_vp9_alpha(ffmpeg: str) -> bool:
    """Quick pre-flight test: can this FFmpeg encode VP9 with alpha?

    Encodes a single 8x8 RGBA frame to WebM VP9 and checks the output.
    Returns True if the output has alpha (yuva420p), False otherwise.
    """
    import json as _json
    import tempfile

    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp_path = tmp.name

        # Generate a single 8x8 RGBA frame (32 bytes per pixel row × 8 rows × 4 channels)
        frame_data = bytes([255, 0, 0, 128] * 64)  # 8×8 red semi-transparent

        cmd = [
            ffmpeg,
            "-y",
            "-v",
            "warning",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-s",
            "8x8",
            "-r",
            "1",
            "-i",
            "-",
            "-frames:v",
            "1",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-auto-alt-ref",
            "0",
            tmp_path,
        ]
        proc = subprocess.run(
            cmd,
            input=frame_data,
            capture_output=True,
            timeout=15,
        )
        logger.info(
            "preflight_vp9_alpha_encode rc=%d stderr=%s",
            proc.returncode,
            proc.stderr.decode(errors="replace")[:500],
        )

        if proc.returncode != 0:
            return False

        # Check output pix_fmt
        ffprobe = _get_ffprobe_path()
        probe_result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=pix_fmt",
                "-of",
                "json",
                tmp_path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        info = _json.loads(probe_result.stdout)
        pix_fmt = info.get("streams", [{}])[0].get("pix_fmt", "")
        has_alpha = pix_fmt in {
            "yuva420p",
            "yuva422p",
            "yuva444p",
            "yuva420p10le",
            "yuva422p10le",
            "yuva444p10le",
        }
        logger.info(
            "preflight_vp9_alpha_result pix_fmt=%s has_alpha=%s binary=%s",
            pix_fmt,
            has_alpha,
            ffmpeg,
        )
        return has_alpha
    except Exception as exc:  # noqa: BLE001
        logger.warning("preflight_vp9_alpha_error error=%s", exc)
        return False
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:  # noqa: BLE001
            pass


def load_rvm_model(model_name: str = "mobilenetv3") -> tuple[Any, Any]:
    """Load RVM model via torch.hub (lazy singleton).

    Args:
        model_name: "mobilenetv3" (fast, good quality) or "resnet50" (slower, better quality)

    Returns:
        (model, device) tuple
    """
    global _rvm_model, _rvm_device  # noqa: PLW0603

    if _rvm_model is not None:
        return _rvm_model, _rvm_device

    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(
        "rvm_model_load_start model=%s device=%s mem_mb=%.0f",
        model_name,
        device,
        _get_memory_mb(),
    )

    model = torch.hub.load(
        "PeterL1n/RobustVideoMatting",
        model_name,
        pretrained=True,
        trust_repo=True,
    )
    model = model.to(device).eval()

    _rvm_model = model
    _rvm_device = device
    logger.info(
        "rvm_model_load_done model=%s device=%s mem_mb=%.0f",
        model_name,
        device,
        _get_memory_mb(),
    )

    return model, device


def get_video_info(input_path: Path) -> tuple[int, int, float, int]:
    """Get video dimensions, fps, and frame count using ffprobe.

    Returns:
        (width, height, fps, total_frames) tuple
    """
    ffprobe = _get_ffprobe_path()
    cmd = [
        ffprobe,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        str(input_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    info = json.loads(result.stdout)
    stream = next(s for s in info["streams"] if s["codec_type"] == "video")

    width = int(stream["width"])
    height = int(stream["height"])

    fps_str = stream.get("r_frame_rate", "30/1")
    if "/" in fps_str:
        num, den = fps_str.split("/")
        fps = float(num) / float(den) if float(den) > 0 else 30.0
    else:
        fps = float(fps_str) if fps_str else 30.0

    # Get total frames - try nb_frames first, then estimate from duration
    total_frames = 0
    if "nb_frames" in stream:
        try:
            total_frames = int(stream["nb_frames"])
        except (ValueError, TypeError):
            pass
    if total_frames == 0:
        # Estimate from duration
        duration = 0.0
        if "duration" in stream:
            try:
                duration = float(stream["duration"])
            except (ValueError, TypeError):
                pass
        if duration == 0 and "format" in info and "duration" in info["format"]:
            try:
                duration = float(info["format"]["duration"])
            except (ValueError, TypeError):
                pass
        if duration > 0:
            total_frames = int(duration * fps)

    return width, height, fps, total_frames


# Type alias for progress callback: (current_frame, total_frames) -> None
ProgressCallback = Any  # Callable[[int, int], None]


def process_video_rvm(
    input_path: Path,
    output_path: Path,
    downsample_ratio: float = 0.40,
    portrait: bool = True,
    output_format: str = "webm",
    model_name: str = "mobilenetv3",
    target_width: int = 1080,
    target_height: int = 1920,
    should_cancel: Any | None = None,
    progress_callback: ProgressCallback | None = None,
) -> dict[str, Any]:
    """Process a video with RVM background removal.

    Pipeline:
      1. FFmpeg decodes source to raw RGB frames (pipe)
      2. RVM infers alpha matte per frame (with recurrent state for temporal consistency)
      3. FFmpeg encodes RGBA frames to VP9 WebM or QuickTime MOV with alpha (pipe)

    Args:
        input_path: Path to input video file
        output_path: Path for output video with alpha
        downsample_ratio: RVM inference resolution ratio (0.25-1.0, lower=faster)
        portrait: If True, crop to 9:16 portrait before matting
        output_format: "webm" (VP9+alpha) or "mov" (ProRes 4444+alpha)
        model_name: RVM backbone ("mobilenetv3" or "resnet50")
        target_width: Target output width (when portrait=True)
        target_height: Target output height (when portrait=True)
        should_cancel: Optional callable that returns True if processing should stop
        progress_callback: Optional callback(current_frame, total_frames) for progress updates

    Returns:
        Dict with processing metrics:
          - frame_count, total_frames, total_time_s, avg_ms_per_frame, mask_stability_mean_diff
    """
    import torch

    model, device = load_rvm_model(model_name)

    src_width, src_height, fps, total_frames = get_video_info(input_path)
    logger.info(
        "rvm_video_info width=%d height=%d fps=%.2f total_frames=%d",
        src_width,
        src_height,
        fps,
        total_frames,
    )

    # Portrait mode: crop to 9:16 and scale
    if portrait:
        width, height = target_width, target_height
        vf = f"crop=ih*9/16:ih:(iw-ih*9/16)/2:0,scale={target_width}:{target_height}"
    else:
        width, height = src_width, src_height
        vf = None

    frame_size_rgb = width * height * 3

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    ffmpeg = _get_ffmpeg_path()
    ffprobe = _get_ffprobe_path()

    logger.info(
        "rvm_start input=%s output=%s model=%s device=%s portrait=%s vf=%s downsample=%.2f ffmpeg=%s ffprobe=%s",
        str(input_path),
        str(output_path),
        model_name,
        device,
        bool(portrait),
        vf or "",
        downsample_ratio,
        ffmpeg,
        ffprobe,
    )

    # Reader: decode to raw RGB24
    read_cmd = [ffmpeg, "-v", "quiet", "-i", str(input_path)]
    if vf:
        read_cmd += ["-vf", vf]
    read_cmd += ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"]

    # Writer: encode RGBA frames
    if output_format == "mov":
        write_cmd = [
            ffmpeg,
            "-y",
            "-v",
            "warning",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-s",
            f"{width}x{height}",
            "-r",
            str(fps),
            "-i",
            "-",
            "-c:v",
            "prores_ks",
            "-profile:v",
            "4",
            "-pix_fmt",
            "yuva444p10le",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
    else:
        # WebM VP9 with alpha (default)
        # MUST use libvpx-vp9 — libvpx (VP8) does NOT support alpha.
        write_cmd = [
            ffmpeg,
            "-y",
            "-v",
            "warning",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgba",
            "-s",
            f"{width}x{height}",
            "-r",
            str(fps),
            "-i",
            "-",
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-metadata:s:v:0",
            "alpha_mode=1",
            "-b:v",
            "1M",
            "-crf",
            "18",
            "-auto-alt-ref",
            "0",
            "-deadline",
            "good",
            "-cpu-used",
            "5",
            "-row-mt",
            "1",
            str(output_path),
        ]

    logger.info("rvm_ffmpeg_read_cmd cmd=%s", " ".join(str(c) for c in read_cmd))
    logger.info("rvm_ffmpeg_write_cmd cmd=%s", " ".join(str(c) for c in write_cmd))

    # Log FFmpeg binary details for debugging VP9 alpha issues
    _log_ffmpeg_version(ffmpeg)

    # Pre-flight: can this FFmpeg actually encode VP9 with alpha?
    if output_format == "webm":
        alpha_ok = _preflight_vp9_alpha(ffmpeg)
        if not alpha_ok:
            message = (
                "FFmpeg VP9-alpha preflight failed. "
                f"Selected ffmpeg='{ffmpeg}' cannot produce an alpha pix_fmt (expected yuva420p). "
                "This environment will only produce opaque WebM (yuv420p), so RVM outputs will be unusable. "
                "Fix the runtime FFmpeg build (use a static ffmpeg with --enable-libvpx and VP9 alpha support) "
                "and redeploy/restart the Celery worker service."
            )
            logger.error("PREFLIGHT_FAIL: %s", message)
            raise RuntimeError(message)

    logger.info(
        "RVM processing: %s → %s (%dx%d @ %.1ffps, downsample=%.2f)",
        input_path.name,
        output_path.name,
        width,
        height,
        fps,
        downsample_ratio,
    )

    logger.info("rvm_subprocess_start reader_cmd=%s", " ".join(str(c) for c in read_cmd[:5]))
    reader = subprocess.Popen(read_cmd, stdout=subprocess.PIPE)
    writer = subprocess.Popen(write_cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    logger.info(
        "rvm_subprocess_started reader_pid=%s writer_pid=%s",
        reader.pid,
        writer.pid,
    )

    frame_count = 0
    frame_times: list[float] = []
    prev_alpha_np: np.ndarray | None = None
    mask_diffs: list[float] = []

    # RVM recurrent state — initialized to None, model manages internally
    rec: list[Any] = [None] * 4

    logger.info("rvm_pre_loop mem_mb=%.0f", _get_memory_mb())

    def _terminate_processes() -> None:
        for p in (reader, writer):
            try:
                if p.poll() is None:
                    p.terminate()
            except Exception:  # noqa: BLE001
                pass
        for p in (reader, writer):
            try:
                p.wait(timeout=3)
            except Exception:  # noqa: BLE001
                try:
                    if p.poll() is None:
                        p.kill()
                except Exception:  # noqa: BLE001
                    pass

    try:
        logger.info("rvm_loop_start frame_size_rgb=%d", frame_size_rgb)
        with torch.no_grad():
            while True:
                if should_cancel and should_cancel():
                    _terminate_processes()
                    raise RVMProcessingCancelled()

                assert reader.stdout is not None
                if frame_count == 0:
                    logger.info("rvm_reading_first_frame")
                raw = reader.stdout.read(frame_size_rgb)
                if frame_count == 0:
                    logger.info(
                        "rvm_first_frame_read bytes=%d expected=%d", len(raw), frame_size_rgb
                    )
                if len(raw) < frame_size_rgb:
                    break

                t0 = time.perf_counter()

                # numpy → torch tensor [1, 3, H, W] float32 0-1
                frame_np = np.frombuffer(raw, dtype=np.uint8).reshape(height, width, 3).copy()
                frame_t = (
                    torch.from_numpy(frame_np)
                    .permute(2, 0, 1)  # HWC → CHW
                    .unsqueeze(0)  # add batch dim
                    .float()
                    .div(255.0)
                    .to(device)
                )

                # RVM forward pass (sequential with recurrent state)
                fgr, pha, *rec = model(frame_t, *rec, downsample_ratio)

                # pha: [1, 1, H, W] alpha matte
                alpha_np = (pha[0, 0].cpu().numpy() * 255).astype(np.uint8)

                t1 = time.perf_counter()
                frame_times.append(t1 - t0)

                # Mask stability: mean abs diff with previous frame
                if prev_alpha_np is not None:
                    diff = float(
                        np.mean(
                            np.abs(alpha_np.astype(np.float32) - prev_alpha_np.astype(np.float32))
                        )
                    )
                    mask_diffs.append(diff)
                prev_alpha_np = alpha_np.copy()

                # Composite RGBA using model foreground (not original frame)
                fgr_np = fgr[0].permute(1, 2, 0).clamp(0, 1).mul(255).byte().cpu().numpy()
                rgba = np.dstack([fgr_np, alpha_np])

                assert writer.stdin is not None
                writer.stdin.write(rgba.tobytes())

                # ── Memory cleanup: prevent OOM on Railway ──
                del frame_np, frame_t, fgr, pha, fgr_np, rgba
                # Force garbage collection every 30 frames to reclaim memory
                if frame_count % 30 == 0:
                    gc.collect()

                frame_count += 1
                if frame_count == 1:
                    logger.info(
                        "rvm_first_frame_processed ms=%.1f alpha_mean=%.1f mem_mb=%.0f",
                        (t1 - t0) * 1000,
                        float(np.mean(alpha_np)),
                        _get_memory_mb(),
                    )
                if frame_count % 30 == 0:
                    avg_ms = float(np.mean(frame_times[-30:])) * 1000
                    mem_mb = _get_memory_mb()
                    logger.info(
                        "RVM frame %d (%.0fms/frame, mem=%.0fMB)",
                        frame_count,
                        avg_ms,
                        mem_mb,
                    )

                # Report progress every 10 frames
                if progress_callback and frame_count % 10 == 0:
                    try:
                        progress_callback(frame_count, total_frames)
                    except Exception:  # noqa: BLE001
                        pass  # Don't fail processing if callback fails

    finally:
        if writer.stdin and not writer.stdin.closed:
            writer.stdin.close()
        try:
            writer.wait(timeout=30)
        except Exception:  # noqa: BLE001
            try:
                writer.kill()
            except Exception:  # noqa: BLE001
                pass
        try:
            reader.wait(timeout=5)
        except Exception:  # noqa: BLE001
            try:
                reader.kill()
            except Exception:  # noqa: BLE001
                pass

        # Capture and log FFmpeg writer stderr for debugging
        writer_stderr = ""
        if writer.stderr:
            try:
                writer_stderr = writer.stderr.read().decode(errors="replace")
            except Exception:  # noqa: BLE001
                pass
        if writer_stderr:
            logger.info("rvm_ffmpeg_writer_stderr: %s", writer_stderr[:2000])

        logger.info(
            "rvm_ffmpeg_exit reader_rc=%s writer_rc=%s",
            reader.returncode,
            writer.returncode,
        )

    # ── Final memory cleanup ──
    del rec, prev_alpha_np
    gc.collect()
    logger.info("rvm_cleanup_done mem_mb=%.0f", _get_memory_mb())

    total_time = sum(frame_times)
    avg_time = total_time / max(frame_count, 1)
    avg_stability = float(np.mean(mask_diffs)) if mask_diffs else 0.0

    # ── Output validation: ensure the file actually has alpha ──
    if output_path.exists():
        _validate_rvm_output(output_path, ffprobe, output_format)

    logger.info(
        "rvm_done frames=%d total_time_s=%.2f avg_ms_per_frame=%.1f stability=%.2f out_w=%d out_h=%d fps=%.3f format=%s",
        frame_count,
        total_time,
        avg_time * 1000,
        avg_stability,
        width,
        height,
        fps,
        output_format,
    )

    return {
        "frame_count": frame_count,
        "total_frames": total_frames,
        "total_time_s": round(total_time, 2),
        "avg_ms_per_frame": round(avg_time * 1000, 1),
        "mask_stability_mean_diff": round(avg_stability, 2),
        "width": width,
        "height": height,
        "fps": fps,
        "output_format": output_format,
    }


def _validate_rvm_output(output_path: Path, ffprobe: str, output_format: str) -> None:
    """Validate that the RVM output file has an alpha channel.

    For WebM: expects VP9 + yuva420p.
    For MOV: expects qtrle + argb (or any pix_fmt with alpha).

    Raises RuntimeError if validation fails.
    This prevents silently storing opaque videos that break lineup compositing.
    """
    import json as _json

    # Pixel formats that carry alpha channel
    _ALPHA_PIX_FMTS = {
        "argb",
        "rgba",
        "bgra",
        "abgr",
        "yuva420p",
        "yuva422p",
        "yuva444p",
        "yuva420p10le",
        "yuva422p10le",
        "yuva444p10le",
        "yuva420p12le",
        "yuva422p12le",
        "yuva444p12le",
        "gbrap",
        "gbrap10le",
        "gbrap12le",
        "gbrap16le",
        "rgba64le",
        "rgba64be",
        "ya8",
        "ya16le",
    }

    try:
        result = subprocess.run(
            [
                ffprobe,
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=codec_name,pix_fmt",
                "-of",
                "json",
                str(output_path),
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        info = _json.loads(result.stdout)
        streams = info.get("streams", [])
        if not streams:
            logger.error("rvm_validate_fail reason=no_video_stream output=%s", output_path)
            raise RuntimeError(f"RVM output has no video stream: {output_path}")

        codec = streams[0].get("codec_name", "")
        pix_fmt = streams[0].get("pix_fmt", "")
        logger.info(
            "rvm_validate output=%s codec=%s pix_fmt=%s format=%s",
            output_path.name,
            codec,
            pix_fmt,
            output_format,
        )

        if pix_fmt not in _ALPHA_PIX_FMTS:
            raise RuntimeError(
                f"RVM output pix_fmt is '{pix_fmt}', expected a format with alpha "
                f"(e.g. argb, yuva420p). The output has no alpha channel — "
                f"lineup compositing will fail. "
                f"(codec='{codec}', output_format='{output_format}', ffprobe='{ffprobe}', file='{output_path.name}')"
            )
    except (subprocess.TimeoutExpired, _json.JSONDecodeError) as exc:
        logger.warning("rvm_validate_skip reason=%s output=%s", type(exc).__name__, output_path)
        # Don't block pipeline on validation timeout; the output may still be usable.


def is_rvm_available() -> bool:
    """Check if RVM dependencies (torch) are available."""
    try:
        import torch  # noqa: F401

        return True
    except ImportError:
        return False
