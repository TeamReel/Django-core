"""Pika video generation client via fal.ai.

Uses the `fal-client` Python SDK to call Pika 2.2 image-to-video and
text-to-video endpoints hosted on fal.ai.

Follows the same create→poll→download pattern as minimax_client.py and
runway_client.py.

Endpoints:
    - Text-to-video: fal-ai/pika/v2.2/text-to-video
    - Image-to-video: fal-ai/pika/v2.2/image-to-video

Authentication: FAL_KEY environment variable (set by fal_client or passed manually).

Usage:
    client = PikaClient(api_key="...")
    result = client.generate_video(
        prompt="A football player celebrates a goal",
        image=b"<png bytes>",
        duration=5,
        resolution="720p",
        aspect_ratio="9:16",
    )
    video_bytes = result["video_bytes"]  # downloaded MP4

Requires: pip install fal-client
"""

from __future__ import annotations

import base64
import logging
import os
from pathlib import Path
from typing import Any, Union

import httpx

logger = logging.getLogger("generative.services.pika_client")

# fal.ai Pika 2.2 model endpoints
T2V_ENDPOINT = "fal-ai/pika/v2.2/text-to-video"
I2V_ENDPOINT = "fal-ai/pika/v2.2/image-to-video"


class PikaError(Exception):
    """Pika / fal.ai API error."""

    def __init__(self, message: str, status_code: int | None = None, response: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class PikaClient:
    """Synchronous Pika 2.2 video generation client via fal.ai.

    Uses the ``fal_client`` SDK for queue submission and polling,
    then downloads the resulting video via httpx.

    Usage:
        client = PikaClient(api_key="fal-...")
        result = client.generate_video(
            prompt="a football player running",
            image=b"<png bytes>",
        )
        # result["video_bytes"] contains the downloaded MP4
    """

    def __init__(
        self,
        api_key: str,
        timeout: float = 30.0,
        poll_timeout: float = 600.0,
    ):
        self.api_key = api_key
        self.poll_timeout = poll_timeout
        self._http = httpx.Client(timeout=timeout, follow_redirects=True)

        # Set the FAL_KEY for the fal_client SDK
        os.environ["FAL_KEY"] = api_key

        # Lazy-import the SDK so the rest of the app doesn't break
        # if fal-client isn't installed.
        try:
            import fal_client  # type: ignore[import-untyped]

            self._fal = fal_client
        except ImportError as exc:
            raise ImportError(
                "The 'fal-client' package is required for Pika video generation. "
                "Install it with: pip install fal-client"
            ) from exc

    # -----------------------------------------------------------------
    # Image encoding helpers
    # -----------------------------------------------------------------
    @staticmethod
    def _to_data_uri(image: Union[str, Path, bytes]) -> str:
        """Convert image bytes / path to a base64 data URI.

        fal.ai accepts HTTPS URLs or ``data:<mime>;base64,...`` strings.
        """
        if isinstance(image, str):
            # Already a URL or data URI?
            if image.startswith(("http://", "https://", "data:")):
                return image
            # Assume file path
            image = Path(image).read_bytes()
        elif isinstance(image, Path):
            image = image.read_bytes()

        # At this point, `image` is bytes
        if image[:4] == b"\x89PNG":
            mime = "image/png"
        elif image[:2] == b"\xff\xd8":
            mime = "image/jpeg"
        elif image[:4] == b"RIFF":
            mime = "image/webp"
        else:
            mime = "image/png"  # safe default

        b64 = base64.b64encode(image).decode("utf-8")
        return f"data:{mime};base64,{b64}"

    # -----------------------------------------------------------------
    # Submit generation request via fal.ai queue
    # -----------------------------------------------------------------
    def create_video(
        self,
        prompt: str,
        image: Union[str, Path, bytes, None] = None,
        duration: int = 5,
        resolution: str = "720p",
        aspect_ratio: str = "16:9",
        negative_prompt: str = "ugly, bad, terrible, blurry, watermark",
        seed: int | None = None,
    ) -> dict[str, Any]:
        """Submit a video generation task via fal.ai. Returns the result dict.

        Uses fal_client.subscribe() which handles the full queue lifecycle:
        submit → poll → return result.

        Args:
            prompt: Text description of the desired video.
            image: Optional input image (bytes, path, URL, or data URI)
                   for image-to-video mode.
            duration: Video duration in seconds (5 or 10).
            resolution: Output resolution ("720p" or "1080p").
            aspect_ratio: Aspect ratio (e.g. "16:9", "9:16", "1:1").
            negative_prompt: Things to avoid in generation.
            seed: Optional seed for reproducibility.

        Returns:
            fal.ai result dict with video URL.
        """
        mode = "I2V" if image else "T2V"

        # Build input payload
        input_data: dict[str, Any] = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "resolution": resolution,
            "duration": duration,
        }

        if seed is not None:
            input_data["seed"] = seed

        if image:
            # Image-to-video
            endpoint = I2V_ENDPOINT
            input_data["image_url"] = self._to_data_uri(image)
        else:
            # Text-to-video (also supports aspect_ratio)
            endpoint = T2V_ENDPOINT
            input_data["aspect_ratio"] = aspect_ratio

        logger.info(
            "Pika: creating %s task (endpoint=%s, duration=%ds, resolution=%s, prompt=%d chars)",
            mode,
            endpoint,
            duration,
            resolution,
            len(prompt),
        )

        try:
            # fal_client.subscribe() handles the full queue lifecycle:
            # submit → poll status → return completed result
            result = self._fal.subscribe(
                endpoint,
                arguments=input_data,
            )
        except Exception as exc:
            raise PikaError(f"Pika/fal.ai generation failed: {exc}") from exc

        if not result or "video" not in result:
            raise PikaError("Pika response missing video output", response=result)

        video_url = result["video"]["url"]
        logger.info("Pika: task completed! Video URL: %s", video_url[:80])

        return result

    # -----------------------------------------------------------------
    # Download video from output URL
    # -----------------------------------------------------------------
    def download_video(self, url: str, output_path: str | None = None) -> bytes:
        """Download generated video from a fal.ai output URL.

        Output URLs are temporary, so we download immediately and
        persist to S3.

        Returns video bytes.
        """
        logger.info("Pika: downloading video from output URL...")

        response = self._http.get(url)
        if response.status_code != 200:
            raise PikaError(
                f"Download failed: HTTP {response.status_code}",
                status_code=response.status_code,
            )

        video_bytes = response.content
        size_mb = len(video_bytes) / (1024 * 1024)
        logger.info("Pika: downloaded %.1f MB", size_mb)

        if output_path:
            Path(output_path).write_bytes(video_bytes)
            logger.info("Pika: saved → %s", output_path)

        return video_bytes

    # -----------------------------------------------------------------
    # High-level: generate + download
    # -----------------------------------------------------------------
    def generate_video(
        self,
        prompt: str,
        image: Union[str, Path, bytes, None] = None,
        output_path: str | None = None,
        duration: int = 5,
        resolution: str = "720p",
        aspect_ratio: str = "9:16",
        negative_prompt: str = "ugly, bad, terrible, blurry, watermark",
        seed: int | None = None,
    ) -> dict[str, Any]:
        """Full pipeline: create task (subscribe) → download video.

        Returns dict with: video_bytes, video_url
        """
        result = self.create_video(
            prompt=prompt,
            image=image,
            duration=duration,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            negative_prompt=negative_prompt,
            seed=seed,
        )

        video_url = result["video"]["url"]
        video_bytes = self.download_video(video_url, output_path=output_path)

        return {
            "video_bytes": video_bytes,
            "video_url": video_url,
            "fal_result": result,
        }

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
