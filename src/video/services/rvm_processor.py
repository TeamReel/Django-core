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

import json
import logging
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ── Lazy singleton for model + device ──────────────────────────────────────
_rvm_model: Any | None = None
_rvm_device: Any | None = None


class RVMProcessingCancelled(Exception):
    """Raised when RVM processing is cancelled."""


def _get_ffmpeg_path() -> str:
    """Find FFmpeg binary.

    Prefers imageio-ffmpeg's static binary over the system FFmpeg because
    the Debian apt FFmpeg does NOT support VP9 alpha encoding (yuva420p),
    which is critical for RVM processed intros with transparency.
    """
    # 1. imageio-ffmpeg ships a static binary with full VP9 alpha support
    try:
        import imageio_ffmpeg

        path = imageio_ffmpeg.get_ffmpeg_exe()
        if path:
            return path
    except Exception:  # noqa: BLE001
        pass
    # 2. System ffmpeg (may lack VP9 alpha on Debian)
    path = shutil.which("ffmpeg")
    if path:
        return path
    return "ffmpeg"


def _get_ffprobe_path() -> str:
    """Find ffprobe binary."""
    path = shutil.which("ffprobe")
    if path:
        return path
    # ffprobe is usually next to ffmpeg
    ffmpeg = _get_ffmpeg_path()
    if ffmpeg and ffmpeg != "ffmpeg":
        probe = Path(ffmpeg).parent / "ffprobe"
        if probe.exists():
            return str(probe)
        probe = Path(ffmpeg).parent / "ffprobe.exe"
        if probe.exists():
            return str(probe)
    return "ffprobe"


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
    logger.info("rvm_model_load_start model=%s device=%s", model_name, device)

    model = torch.hub.load(
        "PeterL1n/RobustVideoMatting",
        model_name,
        pretrained=True,
        trust_repo=True,
    )
    model = model.to(device).eval()

    _rvm_model = model
    _rvm_device = device
    logger.info("rvm_model_load_done model=%s device=%s", model_name, device)

    return model, device


def get_video_info(input_path: Path) -> tuple[int, int, float]:
    """Get video dimensions and fps using ffprobe.

    Returns:
        (width, height, fps) tuple
    """
    ffprobe = _get_ffprobe_path()
    cmd = [
        ffprobe,
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_streams",
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

    return width, height, fps


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
        output_format: "webm" (VP9+alpha) or "mov" (QuickTime Animation+alpha)
        model_name: RVM backbone ("mobilenetv3" or "resnet50")
        target_width: Target output width (when portrait=True)
        target_height: Target output height (when portrait=True)

    Returns:
        Dict with processing metrics:
          - frame_count, total_time_s, avg_ms_per_frame, mask_stability_mean_diff
    """
    import torch

    model, device = load_rvm_model(model_name)

    src_width, src_height, fps = get_video_info(input_path)

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
            "quiet",
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
            "qtrle",
            "-pix_fmt",
            "argb",
            str(output_path),
        ]
    else:
        # WebM VP9 with alpha (default)
        # MUST use libvpx-vp9 — libvpx (VP8) does NOT support alpha.
        write_cmd = [
            ffmpeg,
            "-y",
            "-v",
            "quiet",
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

    logger.info("rvm_ffmpeg_read_cmd cmd=%s", read_cmd)
    logger.info("rvm_ffmpeg_write_cmd cmd=%s", write_cmd)

    logger.info(
        "RVM processing: %s → %s (%dx%d @ %.1ffps, downsample=%.2f)",
        input_path.name,
        output_path.name,
        width,
        height,
        fps,
        downsample_ratio,
    )

    reader = subprocess.Popen(read_cmd, stdout=subprocess.PIPE)
    writer = subprocess.Popen(write_cmd, stdin=subprocess.PIPE)

    frame_count = 0
    frame_times: list[float] = []
    prev_alpha_np: np.ndarray | None = None
    mask_diffs: list[float] = []

    # RVM recurrent state — initialized to None, model manages internally
    rec: list[Any] = [None] * 4

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
        with torch.no_grad():
            while True:
                if should_cancel and should_cancel():
                    _terminate_processes()
                    raise RVMProcessingCancelled()

                assert reader.stdout is not None
                raw = reader.stdout.read(frame_size_rgb)
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

                frame_count += 1
                if frame_count % 30 == 0:
                    avg_ms = float(np.mean(frame_times[-30:])) * 1000
                    logger.info("RVM frame %d (%.0fms/frame)", frame_count, avg_ms)

    finally:
        if writer.stdin and not writer.stdin.closed:
            writer.stdin.close()
        try:
            writer.wait(timeout=5)
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

        logger.info(
            "rvm_ffmpeg_exit reader_rc=%s writer_rc=%s",
            reader.returncode,
            writer.returncode,
        )

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
                f"lineup compositing will fail."
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
