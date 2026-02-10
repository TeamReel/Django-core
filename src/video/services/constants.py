"""Video service constants."""

from __future__ import annotations

import os
from pathlib import Path

from django.conf import settings

VIDEO_MAX_FILE_SIZE = int(
    getattr(
        settings,
        "VIDEO_MAX_FILE_SIZE",
        int(os.getenv("VIDEO_MAX_FILE_SIZE_MB", 2048)) * 1024 * 1024,
    )
)
VIDEO_MAX_DURATION = int(
    getattr(settings, "VIDEO_MAX_DURATION", int(os.getenv("VIDEO_MAX_DURATION_SECONDS", 900)))
)
VIDEO_TEMP_DIR = Path(
    getattr(
        settings,
        "VIDEO_TEMP_DIR",
        os.getenv("VIDEO_TEMP_DIR", Path(os.getenv("TEMP", "/tmp")) / "video_jobs"),
    )
)
