"""Asset processing specifications for lineup-ready media.

Defines the target specifications for each asset type when processing
from "raw" (AI-generated / uploaded) to "lineup-ready" (standardized).

Asset Types:
  fullbody    — Full body in tenue (PNG, 1080×1920, transparent bg)
  closeup     — Close-up portrait (PNG, 512×512, transparent bg)
  intro       — Short intro video (WebM VP9, 540×960, 25fps, transparent bg via RVM)
  celebration — Celebration video (WebM VP9, 540×960, 25fps, transparent bg via RVM)
  then_vs_now — Then-vs-now video (WebM VP9, 540×960, 25fps, transparent bg via RVM)

Variant Value Structure:
  Old: images.fullbody.home = "s3://path/to/image.png"
  New: images.fullbody.home = {
      "raw": "s3://...",
      "processed": "s3://...",
      "processing_state": "processed",
      "specs": {"width": 1080, "height": 1920, "format": "png", "bg_removed": true}
  }
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any


class ProcessingState(str, Enum):
    """Asset processing states."""

    RAW = "raw"
    PROCESSING = "processing"
    CANCELLING = "cancelling"
    CANCELLED = "cancelled"
    PROCESSED = "processed"
    FAILED = "failed"


@dataclass(frozen=True)
class ImageSpec:
    """Target spec for image assets."""

    width: int
    height: int
    format: str = "png"
    bg_removed: bool = True
    aspect_ratio: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": "image",
            "width": self.width,
            "height": self.height,
            "format": self.format,
            "bg_removed": self.bg_removed,
            "aspect_ratio": self.aspect_ratio,
        }


@dataclass(frozen=True)
class VideoSpec:
    """Target spec for video assets."""

    width: int
    height: int
    format: str = "mp4"
    fps: int = 30
    codec: str = "h264"
    bg_removed: bool = True
    max_duration: float | None = None  # None = keep original
    aspect_ratio: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": "video",
            "width": self.width,
            "height": self.height,
            "format": self.format,
            "fps": self.fps,
            "codec": self.codec,
            "bg_removed": self.bg_removed,
            "max_duration": self.max_duration,
            "aspect_ratio": self.aspect_ratio,
        }


# ── Spec Definitions ─────────────────────────────────────────────────────────

FULLBODY_SPEC = ImageSpec(
    width=1080,
    height=1920,
    format="png",
    bg_removed=True,
    aspect_ratio="9:16",
)

CLOSEUP_SPEC = ImageSpec(
    width=512,
    height=512,
    format="png",
    bg_removed=True,
    aspect_ratio="1:1",
)

INTRO_SPEC = VideoSpec(
    width=540,
    height=960,
    format="webm",
    fps=25,
    codec="vp9",
    bg_removed=True,
    max_duration=None,
    aspect_ratio="9:16",
)

CELEBRATION_SPEC = VideoSpec(
    width=540,
    height=960,
    format="webm",
    fps=25,
    codec="vp9",
    bg_removed=True,
    max_duration=None,
    aspect_ratio="9:16",
)

THEN_VS_NOW_SPEC = VideoSpec(
    width=540,
    height=960,
    format="webm",
    fps=25,
    codec="vp9",
    bg_removed=True,
    max_duration=None,
    aspect_ratio="9:16",
)

PHOTO_COMPOSITE_SPEC = VideoSpec(
    width=540,
    height=960,
    format="webm",
    fps=25,
    codec="vp9",
    bg_removed=True,
    max_duration=None,
    aspect_ratio="9:16",
)

WALKING_COMPOSITE_SPEC = VideoSpec(
    width=540,
    height=960,
    format="webm",
    fps=25,
    codec="vp9",
    bg_removed=True,
    max_duration=None,
    aspect_ratio="9:16",
)

ASSET_SPECS: dict[str, ImageSpec | VideoSpec] = {
    "fullbody": FULLBODY_SPEC,
    "closeup": CLOSEUP_SPEC,
    "intro": INTRO_SPEC,
    "celebration": CELEBRATION_SPEC,
    "then_vs_now": THEN_VS_NOW_SPEC,
    "photo_composite": PHOTO_COMPOSITE_SPEC,
    "walking_composite": WALKING_COMPOSITE_SPEC,
}


# ── Variant Value Helpers ────────────────────────────────────────────────────


def normalize_variant_value(value: str | dict | None) -> dict | None:
    """Normalize a variant value to the new object format.

    Handles both old format (plain URL string) and new format (dict with
    raw/processed keys).

    Returns:
        Normalized dict or None if empty.
    """
    if not value:
        return None

    if isinstance(value, str):
        return {
            "raw": value,
            "processed": None,
            "processing_state": ProcessingState.RAW.value,
        }

    if isinstance(value, dict):
        # Already new format — ensure required keys
        return {
            "raw": value.get("raw", ""),
            "processed": value.get("processed"),
            "processed_source": value.get("processed_source"),  # full-quality alpha file
            "processing_state": value.get("processing_state", ProcessingState.RAW.value),
            "specs": value.get("specs"),
            "error": value.get("error"),
            "processed_at": value.get("processed_at"),
        }

    return None


def get_best_url(value: str | dict | None) -> str | None:
    """Get the best available URL (prefers processed, falls back to raw).

    NOTE: For browser playback. Returns preview MP4 when available.
    For FFmpeg/lineup composition, use get_ffmpeg_best_url() instead.
    """
    normalized = normalize_variant_value(value)
    if not normalized:
        return None
    return normalized.get("processed") or normalized.get("raw") or None


def get_ffmpeg_best_url(value: str | dict | None) -> str | None:
    """Get the best URL for FFmpeg/lineup composition (prefers alpha source).

    Priority order:
    1. processed_source - full-quality file with alpha (e.g. ProRes .mov)
    2. processed - browser-playable version (may be preview MP4 without alpha)
    3. raw - original uploaded file

    Use this for FFmpeg pipelines that need the alpha channel.
    """
    normalized = normalize_variant_value(value)
    if not normalized:
        return None
    return (
        normalized.get("processed_source")
        or normalized.get("processed")
        or normalized.get("raw")
        or None
    )


def get_lineup_ready_url(value: str | dict | None) -> str | None:
    """Get the lineup-ready URL (processed only, no fallback)."""
    normalized = normalize_variant_value(value)
    if not normalized:
        return None
    return normalized.get("processed") or None


def is_lineup_ready(value: str | dict | None) -> bool:
    """Check if an asset variant has a processed (lineup-ready) version."""
    normalized = normalize_variant_value(value)
    if not normalized:
        return False
    return normalized.get("processing_state") == ProcessingState.PROCESSED.value and bool(
        normalized.get("processed")
    )
