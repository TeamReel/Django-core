"""
Metadata extraction services for medialib items.
Uses Pillow for images and ffprobe for videos.
"""
import io
import json
import os
import subprocess
import tempfile
from typing import Any, Dict

from PIL import Image
from PIL.ExifTags import TAGS


def extract_image_metadata(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract metadata from image file bytes using Pillow.

    Returns:
        Dict with keys: width, height, format, mode, exif, error (optional)
    """
    result = {
        "width": None,
        "height": None,
        "format": None,
        "mode": None,
        "exif": {},
    }

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            result["width"] = img.width
            result["height"] = img.height
            result["format"] = img.format
            result["mode"] = img.mode

            # Extract EXIF if available
            if hasattr(img, "_getexif") and img._getexif():
                exif_data = img._getexif()
                if exif_data:
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        # Only store safe types directly, cast others to string if needed
                        # To keep JSON serializable, we are careful with types
                        if isinstance(value, (str, int, float)):
                            result["exif"][tag] = value
                        # else: skip complex objects like tuples/bytes to avoid JSON errors
    except Exception as e:
        result["error"] = str(e)

    return result


def extract_video_metadata(file_bytes: bytes) -> Dict[str, Any]:
    """
    Extract metadata from video file bytes using ffprobe.

    Warning: Writes detailed bytes to temp file.
    Ideally should stream or use file path if file is local.

    Returns:
        Dict with keys: width, height, duration_seconds, codec, fps, error (optional)
    """
    result = {
        "width": None,
        "height": None,
        "duration_seconds": None,
        "codec": None,
        "fps": None,
    }

    # Write to temp file (ffprobe needs file path or pipe)
    # Using temp file for broad compatibility
    fd, tmp_path = tempfile.mkstemp(suffix=".tmp")
    try:
        with os.fdopen(fd, "wb") as tmp:
            tmp.write(file_bytes)

        # Close file descriptor implicitly via with block before subprocess

        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            tmp_path,
        ]

        # 30 second timeout to prevent hangs
        output = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if output.returncode == 0:
            data = json.loads(output.stdout)

            # Find video stream
            video_stream = None
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    video_stream = stream
                    break

            if video_stream:
                result["width"] = video_stream.get("width")
                result["height"] = video_stream.get("height")
                result["codec"] = video_stream.get("codec_name")

                # Calculate FPS from frame rate (e.g., "30/1")
                if "r_frame_rate" in video_stream:
                    try:
                        num, den = map(int, video_stream["r_frame_rate"].split("/"))
                        result["fps"] = round(num / den, 2) if den else None
                    except (ValueError, IndexError):
                        pass

            # Duration from format container
            if "format" in data:
                duration = data["format"].get("duration")
                if duration:
                    try:
                        result["duration_seconds"] = round(float(duration), 2)
                    except ValueError:
                        pass
        else:
            result["error"] = f"ffprobe failed: {output.stderr}"

    except Exception as e:
        result["error"] = str(e)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return result
