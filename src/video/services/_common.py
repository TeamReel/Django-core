"""Shared utilities for video services.

Canonical implementations of helpers that were previously copy-pasted across
6-10 video service files. Import from here instead of duplicating.

Functions:
    get_ffmpeg_path()  — find FFmpeg binary (bundled → legacy → imageio → system)
    get_ffprobe_path() — find FFprobe binary (same priority + sibling detection)
    download_file()    — stream URL to disk
    download_image()   — download URL as PIL Image
    download_image_cached() — same, with in-memory cache
    download_image_bytes()  — download URL as raw bytes
    run_ffmpeg()       — run FFmpeg subprocess with error handling
    resolve_ffmpeg_font_path() — find FFmpeg-safe font path (drawtext filter)
    get_pil_font()     — find PIL ImageFont with fallback chain
    hex_to_rgb()       — convert hex color to (R, G, B)
    hex_to_rgba()      — convert hex color to (R, G, B, A)
    ffmpeg_escape()    — escape text for FFmpeg drawtext filter

    prepare_sponsor()   — download sponsor logo, strip checkerboard, save to disk
    prepare_sponsor_pil() — same, returns PIL Image instead of saving to disk
    prepare_lineup_frame() — download bg + render header + prep sponsor (shared)

Classes:
    FrameAssets        — dataclass with paths to frame setup assets
    ImageCache         — per-job image download cache (replaces module-level dicts)

Constants:
    CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_FPS, HEADER_HEIGHT
    SPONSOR_W, SPONSOR_MARGIN, SPONSOR_PAD, SPONSOR_BOX_H
    WATERMARK_PATH, WATERMARK_OPACITY, WATERMARK_MARGIN
"""

from __future__ import annotations

import io
import logging
import shutil
import subprocess
import tempfile
import uuid as uuid_module
from dataclasses import dataclass
from pathlib import Path

import requests
from PIL import Image, ImageFont

from src.media.validation.ffmpeg_errors import FFmpegErrorCategory, FFmpegErrorParser

logger = logging.getLogger(__name__)

# ── Canvas constants (9:16 portrait) ───────────────────────────────────────
CANVAS_WIDTH = 1080
CANVAS_HEIGHT = 1920
CANVAS_FPS = 30
HEADER_HEIGHT = 300

# ── Fallback field background dimensions ───────────────────────────────────
FALLBACK_BG_PORTRAIT = (CANVAS_WIDTH, 1620)  # For static flyers / builders
FALLBACK_BG_LANDSCAPE = (1920, 1080)  # For landscape flyers only
FALLBACK_BG_VIDEO = (CANVAS_WIDTH, CANVAS_HEIGHT - HEADER_HEIGHT)  # For video composers

# ── Default brand colors ───────────────────────────────────────────────────
DEFAULT_PRIMARY_COLOR = "#D2122E"
DEFAULT_SECONDARY_COLOR = "#FFFFFF"

# ── Sponsor box ────────────────────────────────────────────────────────────
SPONSOR_W = 220
SPONSOR_MARGIN = 36
SPONSOR_PAD = 16
SPONSOR_BOX_H = 120

# ── Watermark ──────────────────────────────────────────────────────────────
WATERMARK_PATH = Path(__file__).resolve().parent.parent / "assets" / "watermark.png"
WATERMARK_OPACITY = 0.25  # 25% opacity
WATERMARK_MARGIN = 30  # px from edge


# ── Variant URL resolver ─────────────────────────────────────────────────────


def find_best_variant_url(
    variants: dict,
    kit_type: str,
    style_priority: list[str],
    get_best_url_fn: callable,
) -> str | None:
    """Find the best asset URL from a variants dict by kit and style priority.

    Generic implementation used by both intro and celebration lookups.
    Priority order:
    1. kit_type variants in style priority order
    2. home variants in style priority order (fallback)
    3. Bare style keys (old format without kit prefix)
    4. Any remaining variant that has content
    """

    def _find_with_prefix(prefix: str) -> str | None:
        for style in style_priority:
            key = f"{prefix}_{style}"
            val = variants.get(key)
            if val:
                url = get_best_url_fn(val)
                if url:
                    return url
        for key, val in variants.items():
            if key.startswith(prefix) and val:
                url = get_best_url_fn(val)
                if url:
                    return url
        return None

    url = _find_with_prefix(kit_type)
    if url:
        return url

    if kit_type != "home":
        url = _find_with_prefix("home")
        if url:
            return url

    for style in style_priority:
        val = variants.get(style)
        if val:
            url = get_best_url_fn(val)
            if url:
                return url

    for val in variants.values():
        if val:
            url = get_best_url_fn(val)
            if url:
                return url

    return None


# ── Color helpers ────────────────────────────────────────────────────────────


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex color string to (R, G, B) tuple."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def hex_to_rgba(hex_color: str) -> tuple[int, int, int, int]:
    """Convert hex color string to (R, G, B, A) tuple with full opacity."""
    r, g, b = hex_to_rgb(hex_color)
    return (r, g, b, 255)


# ── FFmpeg helpers ───────────────────────────────────────────────────────────


def ffmpeg_escape(text: str) -> str:
    """Escape text for FFmpeg drawtext filter."""
    return text.replace("'", "").replace("\\", "\\\\").replace(":", "\\:")


# ── FFmpeg / FFprobe path resolution ───────────────────────────────────────


def get_ffmpeg_path() -> str:
    """Find FFmpeg binary.

    Priority order:
    1. /usr/local/ffmpeg/bin/ffmpeg — bundled build (from Dockerfile)
    2. /usr/local/bin/ffmpeg — legacy static location
    3. imageio-ffmpeg — pip-installed static binary
    4. System ffmpeg
    """
    bundled_path = Path("/usr/local/ffmpeg/bin/ffmpeg")
    if bundled_path.exists():
        return str(bundled_path)

    legacy_static_path = Path("/usr/local/bin/ffmpeg")
    if legacy_static_path.exists():
        return str(legacy_static_path)

    try:
        import imageio_ffmpeg

        path = imageio_ffmpeg.get_ffmpeg_exe()
        if path:
            return path
    except Exception:  # noqa: BLE001
        logger.debug("imageio_ffmpeg not available, falling back", exc_info=True)

    path = shutil.which("ffmpeg")
    if path:
        return path

    return "ffmpeg"


def get_ffprobe_path() -> str:
    """Find FFprobe binary.

    Priority order:
    1. /usr/local/ffmpeg/bin/ffprobe — bundled build
    2. /usr/local/bin/ffprobe — legacy static location
    3. Sibling of detected ffmpeg binary
    4. System ffprobe
    """
    bundled_path = Path("/usr/local/ffmpeg/bin/ffprobe")
    if bundled_path.exists():
        return str(bundled_path)

    legacy_static_path = Path("/usr/local/bin/ffprobe")
    if legacy_static_path.exists():
        return str(legacy_static_path)

    ffmpeg = get_ffmpeg_path()
    if ffmpeg and ffmpeg != "ffmpeg":
        probe = Path(ffmpeg).parent / "ffprobe"
        if probe.exists():
            return str(probe)
        probe = Path(ffmpeg).parent / "ffprobe.exe"
        if probe.exists():
            return str(probe)

    path = shutil.which("ffprobe")
    if path:
        return path

    return "ffprobe"


# ── Download helpers ───────────────────────────────────────────────────────


def download_file(url: str, dest: Path, timeout: int = 60) -> bool:
    """Stream a URL to disk. Returns True on success."""
    if not url:
        return False
    try:
        r = requests.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True
    except Exception:
        logger.warning("Failed to download %s", url, exc_info=True)
        return False


def download_image(url: str, timeout: int = 45) -> Image.Image | None:
    """Download a URL and return as PIL Image (no cache)."""
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return Image.open(io.BytesIO(resp.content))
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download image from %s", url[:120] if url else "None")
        return None


def download_image_cached(
    url: str, cache: dict[str, Image.Image | None], timeout: int = 45
) -> Image.Image | None:
    """Download a URL and return as PIL Image, using *cache* dict.

    Callers should maintain a module-level ``_image_cache`` dict and pass it in.
    """
    if not url:
        return None
    if url in cache:
        cached = cache[url]
        return cached.copy() if cached is not None else None
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content))
        cache[url] = img.copy()
        return img
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download image: %s", url[:120])
        cache[url] = None
        return None


def download_image_bytes(url: str, timeout: int = 30) -> bytes | None:
    """Download a URL and return raw bytes."""
    try:
        resp = requests.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.content
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download image: %s", url)
        return None


class ImageCache:
    """Per-job image download cache.

    Each job creates its own instance, avoiding module-level mutable state
    that is unsafe with concurrent Celery workers.
    """

    def __init__(self) -> None:
        self._store: dict[str, Image.Image | None] = {}

    def get(self, url: str) -> Image.Image | None:
        """Download *url* as PIL Image, returning a cached copy on repeat calls."""
        return download_image_cached(url, self._store)

    def clear(self) -> None:
        """Drop all cached images (call at end of job to free memory)."""
        self._store.clear()


# ── FFmpeg subprocess runner ───────────────────────────────────────────────


class FFmpegProcessError(Exception):
    """FFmpeg processing error with category info."""

    def __init__(
        self,
        message: str,
        category: FFmpegErrorCategory,
        is_transient: bool,
    ) -> None:
        super().__init__(message)
        self.category = category
        self.is_transient = is_transient


def run_ffmpeg(cmd: list[str], desc: str, timeout: int = 300) -> None:
    """Run FFmpeg and raise on failure with parsed error category."""
    logger.info("FFmpeg: %s", desc)
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=timeout)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode(errors="replace") if e.stderr else ""
        error = FFmpegErrorParser.parse(stderr, e.returncode)
        logger.error(
            "FFmpeg failed (%s): category=%s message=%s is_transient=%s exit_code=%s",
            desc,
            error.category.value,
            error.message,
            error.is_transient,
            error.exit_code,
        )
        raise FFmpegProcessError(
            error.user_message,
            category=error.category,
            is_transient=error.is_transient,
        ) from e
    except subprocess.TimeoutExpired as e:
        logger.error("FFmpeg timed out (%s)", desc)
        raise FFmpegProcessError(
            "Video verwerking duurde te lang",
            category=FFmpegErrorCategory.TIMEOUT,
            is_transient=True,
        ) from e


# ── Font helpers ───────────────────────────────────────────────────────────


def resolve_ffmpeg_font_path() -> str:
    """Find an FFmpeg-safe font path for the ``drawtext`` filter.

    Returns path with colons escaped (``\\:``) as required by FFmpeg.
    """
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return p.replace("\\", "/").replace(":", "\\:")
    return "DejaVuSans-Bold"


def get_pil_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Get a PIL font with fallback chain."""
    font_names = [
        "arial.ttf",
        "Arial.ttf",
        "DejaVuSans.ttf",
        "FreeSans.ttf",
        "LiberationSans-Regular.ttf",
    ]
    if bold:
        font_names = [
            "arialbd.ttf",
            "Arial Bold.ttf",
            "DejaVuSans-Bold.ttf",
            "FreeSansBold.ttf",
            "LiberationSans-Bold.ttf",
        ] + font_names

    for font_name in font_names:
        try:
            return ImageFont.truetype(font_name, size)
        except OSError:
            continue

    return ImageFont.load_default()


# ── Storage upload ─────────────────────────────────────────────────────────


def upload_generated_image(
    data: Image.Image | bytes | Path,
    path_prefix: str = "generated",
    *,
    activity_id: str | None = None,
) -> str:
    """Upload a generated image to storage and return a presigned URL.

    Supports PIL Images, raw bytes, and file paths.
    Falls back to a local temp file path if storage upload fails.
    """
    try:
        from files.utils import get_storage_backend

        subfolder = f"{activity_id}/" if activity_id else ""
        storage_path = f"{path_prefix}/{subfolder}{uuid_module.uuid4().hex}.png"
        backend = get_storage_backend()

        if isinstance(data, Image.Image):
            buf = io.BytesIO()
            data.save(buf, "PNG")
            buf.seek(0)
            backend.save(storage_path, buf)
        elif isinstance(data, bytes):
            backend.save(storage_path, io.BytesIO(data))
        elif isinstance(data, Path):
            with open(data, "rb") as f:
                backend.save(storage_path, f)
        else:
            raise TypeError(f"Unsupported data type: {type(data)}")

        url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        logger.info("Uploaded image to S3: %s", storage_path)
        return url

    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to upload %s image to storage: %s", path_prefix, exc)
        if isinstance(data, Path):
            return f"file://{data}"
        temp_dir = Path(tempfile.gettempdir()) / "generated_images"
        temp_dir.mkdir(exist_ok=True)
        output_path = temp_dir / f"{path_prefix.replace('/', '_')}_{uuid_module.uuid4().hex}.png"
        if isinstance(data, Image.Image):
            data.save(str(output_path), "PNG")
        elif isinstance(data, bytes):
            output_path.write_bytes(data)
        return f"file://{output_path}"


def upload_image_to_storage(img: Image.Image, prefix: str = "generated") -> str:
    """Upload a PIL Image to storage and return a presigned URL.

    Falls back to a local temp file path if storage upload fails.
    """
    try:
        from files.utils import get_storage_backend

        img_bytes = io.BytesIO()
        img.save(img_bytes, "PNG")
        img_bytes.seek(0)

        storage_path = f"generated/lineup/{prefix}/{uuid_module.uuid4().hex}.png"
        backend = get_storage_backend()
        backend.save(storage_path, img_bytes)
        return backend.get_url(storage_path, signed=True, expiry_seconds=3600)

    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to upload %s image to storage: %s", prefix, exc)
        temp_dir = Path(tempfile.gettempdir()) / "lineup_scenes"
        temp_dir.mkdir(exist_ok=True)
        output_path = temp_dir / f"{prefix}_{uuid_module.uuid4().hex}.png"
        img.save(str(output_path), "PNG")
        return f"file://{output_path}"


# ── Composer helpers ────────────────────────────────────────────────────────


def probe_duration(video_path: Path, default: float = 5.0) -> float:
    """Get video duration in seconds using ffprobe.

    Returns *default* if probing fails.
    """
    ffprobe = get_ffprobe_path()
    try:
        result = subprocess.run(  # noqa: S603
            [
                ffprobe,
                "-v",
                "quiet",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(video_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
        return default
    except Exception:
        logger.warning("Failed to probe duration for %s", video_path, exc_info=True)
        return default


def prepare_background(url: str, dest: Path, timeout: int = 60) -> bool:
    """Download a background image and return whether it is landscape.

    Returns True if the image is landscape (width > height), False otherwise.
    Raises ValueError if the download fails.
    """
    if not download_file(url, dest, timeout=timeout):
        raise ValueError("Failed to download background image.")
    img = Image.open(dest)
    is_landscape = img.width > img.height
    img.close()
    return is_landscape


def prepare_sponsor_pil(url: str) -> Image.Image | None:
    """Download a sponsor logo, strip checkerboard bg, and autocrop.

    Returns a cleaned PIL Image (RGBA), or None if unavailable.
    """
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
    except Exception:  # noqa: BLE001
        logger.warning("Failed to download sponsor image: %s", url[:120])
        return None
    try:
        from src.generative.services.asset_pipeline import _strip_checkerboard

        img = _strip_checkerboard(img)
        bbox = img.getchannel("A").getbbox()
        if bbox:
            img = img.crop(bbox)
    except Exception:  # noqa: BLE001
        logger.warning("sponsor_bg_cleanup failed, using raw image")
    return img


def prepare_sponsor(url: str, dest: Path) -> bool:
    """Download a sponsor logo, strip checkerboard bg, and autocrop.

    Returns True if a usable sponsor image was saved, False otherwise.
    """
    img = prepare_sponsor_pil(url)
    if img is None:
        return False
    img.save(str(dest), "PNG")
    return True



@dataclass
class FrameAssets:
    """Shared frame setup result for lineup video and flyer."""

    bg_path: Path
    bg_is_landscape: bool
    header_path: Path
    sponsor_path: Path | None


def prepare_lineup_frame(
    data: "LineupData",
    asset_dir: Path,
    *,
    brand_primary_hex: str,
    header_width: int = CANVAS_WIDTH,
    header_height: int = HEADER_HEIGHT,
) -> FrameAssets:
    """Download background, render header, and prep sponsor for lineup content.

    Shared by lineup_composer (video) and lineup_flyer_generator (static PNG).
    Callers should set ``data.field_background_url`` to a fallback URL
    *before* calling this function if the field may be ``None``.

    Returns:
        FrameAssets with paths to the downloaded/rendered assets on disk.
    """
    bg_path = asset_dir / "field_background.jpg"
    header_path = asset_dir / "header.png"
    sponsor_path: Path | None = asset_dir / "sponsor.png"

    # 1. Background
    bg_is_landscape = prepare_background(data.field_background_url, bg_path)

    # 2. Header
    from src.video.services.header_generator import render_header_pil

    header_img = render_header_pil(
        width=header_width,
        height=header_height,
        logo_url=data.logo_url,
        opponent_logo_url=data.opponent_logo_url,
        sponsor_url=data.sponsor_url,
        match_date=data.match_date or "",
        own_team_name=data.own_team_name,
        opponent_name=data.opponent_name,
        is_home=data.is_home,
        kickoff_time=data.kickoff_time,
        competition_name=data.competition_name,
        venue=data.venue,
        background_color=brand_primary_hex,
    )
    header_img.convert("RGB").save(str(header_path), "PNG")

    # 3. Sponsor
    if data.sponsor_url:
        if not prepare_sponsor(data.sponsor_url, sponsor_path):
            sponsor_path = None
    else:
        sponsor_path = None

    return FrameAssets(
        bg_path=bg_path,
        bg_is_landscape=bg_is_landscape,
        header_path=header_path,
        sponsor_path=sponsor_path,
    )


# ── Brand helpers ──────────────────────────────────────────────────────────
