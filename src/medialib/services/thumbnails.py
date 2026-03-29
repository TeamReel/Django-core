import io
import logging
import os
import subprocess
from typing import Tuple

from PIL import Image

logger = logging.getLogger(__name__)

THUMBNAIL_SIZES = {
    "small": (200, 200),
    "medium": (400, 400),
    "large": (800, 800),
}


def generate_image_thumbnail(
    file_bytes: bytes, size: str = "medium", format: str = "JPEG"
) -> Tuple[bytes, str]:
    """
    Generate a thumbnail from image bytes.

    Args:
        file_bytes: Raw image content
        size: Target size key ('small', 'medium', 'large')
        format: Output format ('JPEG', 'PNG')

    Returns:
        tuple[bytes, str]: (thumbnail_bytes, result_mime_type)
    """
    dimensions = THUMBNAIL_SIZES.get(size, THUMBNAIL_SIZES["medium"])

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            # Convert to RGB if saving as JPEG (handling RGBA/P modes)
            if format.upper() == "JPEG" and img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Create a copy to avoid closing the original if passed as file-like
            img_copy = img.copy()

            # Use LANCZOS for high-quality downscaling
            img_copy.thumbnail(dimensions, Image.Resampling.LANCZOS)

            output = io.BytesIO()
            img_copy.save(output, format=format, quality=85, progressive=(format.upper() == "JPEG"))

            mime_type = f"image/{format.lower()}"
            return output.getvalue(), mime_type

    except Exception as e:
        logger.error(f"Failed to generate image thumbnail: {str(e)}")
        raise


def generate_video_thumbnail(
    input_path: str, timestamp_percentage: float = 0.5
) -> Tuple[bytes, str]:
    """
    Extract a frame from a video using ffmpeg at a specific percentage of duration.

    Args:
        input_path: Local path to the video file
        timestamp_percentage: 0.0 to 1.0 (default 0.5 for middle frame)

    Returns:
        tuple[bytes, str]: (jpeg_bytes, 'image/jpeg')
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Video file not found: {input_path}")

    try:
        # 1. Get duration
        probe_cmd = [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            input_path,
        ]
        result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        try:
            duration = float(result.stdout.strip())
        except ValueError:
            # Fallback: try capturing first frame if duration fails
            duration = 0

        target_time = max(0, duration * timestamp_percentage)

        # 2. Extract frame
        # -ss before -i for fast seek
        # -vframes 1 to get one frame
        cmd = [
            "ffmpeg",
            "-ss",
            str(target_time),
            "-i",
            input_path,
            "-vframes",
            "1",
            "-f",
            "image2pipe",
            "-c:v",
            "mjpeg",
            "-",
        ]

        frame_result = subprocess.run(cmd, capture_output=True, check=True)
        return frame_result.stdout, "image/jpeg"

    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg failed: {e.stderr.decode() if e.stderr else str(e)}")
        raise RuntimeError(f"Failed to generate video thumbnail: {e}") from e
    except Exception as e:
        logger.error(f"Error processing video thumbnail: {str(e)}")
        raise
