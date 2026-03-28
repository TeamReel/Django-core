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
    resolve_brand_color()    — look up brand token from activity

Constants:
    CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_FPS, HEADER_HEIGHT
    SPONSOR_W, SPONSOR_MARGIN, SPONSOR_PAD, SPONSOR_BOX_H
"""

from __future__ import annotations

import io
import logging
import shutil
import subprocess
from pathlib import Path

import requests
from PIL import Image, ImageFont

logger = logging.getLogger(__name__)

# ── Canvas constants (9:16 portrait) ───────────────────────────────────────
CANVAS_WIDTH = 1080
CANVAS_HEIGHT = 1920
CANVAS_FPS = 30
HEADER_HEIGHT = 300

# ── Sponsor box ────────────────────────────────────────────────────────────
SPONSOR_W = 220
SPONSOR_MARGIN = 36
SPONSOR_PAD = 16
SPONSOR_BOX_H = 120


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
        pass

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


# ── FFmpeg subprocess runner ───────────────────────────────────────────────


def run_ffmpeg(cmd: list[str], desc: str, timeout: int = 300) -> None:
    """Run FFmpeg and raise on failure."""
    logger.info("FFmpeg: %s", desc)
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=timeout)
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode(errors="replace") if e.stderr else ""
        tail = stderr[-2000:] if stderr else ""
        logger.error("FFmpeg failed (%s): %s", desc, tail)
        raise RuntimeError(
            f"FFmpeg failed during {desc}. Return code: {e.returncode}. Stderr tail: {tail}"
        ) from e
    except subprocess.TimeoutExpired as e:
        logger.error("FFmpeg timed out (%s)", desc)
        raise RuntimeError(f"FFmpeg timed out during {desc}.") from e


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


# ── Brand helpers ──────────────────────────────────────────────────────────


def resolve_brand_color(activity_id: str, color_key: str = "primary_color") -> str | None:
    """Look up a brand color token from the project's BrandProfile.

    Returns hex color string (e.g., "#D2122E") or None if not found.
    Searches: project → parent project → organisation.
    """
    try:
        from django.apps import apps

        Activity = apps.get_model("activities", "Activity")
        BrandProfile = apps.get_model("branding", "BrandProfile")

        activity = Activity.objects.select_related("project__parent_project").get(id=activity_id)
        project = activity.project

        for proj in [project, project.parent_project]:
            if not proj:
                continue
            brand = BrandProfile.objects.filter(project=proj, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                value = tokens.get(color_key) or tokens.get("primary")
                if value:
                    return value

        org = getattr(project, "organisation", None)
        if org:
            brand = BrandProfile.objects.filter(organisation=org, is_active=True).first()
            if brand:
                tokens = brand.get_tokens()
                value = tokens.get(color_key) or tokens.get("primary")
                if value:
                    return value

        return None
    except Exception:  # noqa: BLE001
        logger.warning(
            "Failed to resolve brand color for activity %s", activity_id, exc_info=True
        )
        return None
