"""Runway Gen video generation client.

Wraps the official `runwayml` Python SDK for image-to-video and
text-to-video generation using Runway Gen models (gen4_turbo, gen4.5, etc.).

Follows the same create→poll→download pattern as minimax_client.py.

Usage:
    client = RunwayClient(api_key="...")
    result = client.generate_video(
        prompt="A football player celebrates a goal",
        image=b"<png bytes>",
        model="gen4_turbo",
        duration=5,
        ratio="1280:720",
    )
    video_bytes = result["video_bytes"]  # downloaded MP4

Requires: pip install runwayml
"""

from __future__ import annotations

import base64
import logging
import time
from pathlib import Path
from typing import Any, Union

import httpx

logger = logging.getLogger("generative.services.runway_client")

# Runway SDK task statuses
TERMINAL_STATUSES = {"SUCCEEDED", "FAILED", "CANCELLED"}
PENDING_STATUSES = {"PENDING", "THROTTLED", "RUNNING"}

# Default models – gen4_turbo is fast & cost-effective (5 credits/s)
DEFAULT_MODEL = "gen4_turbo"


class RunwayError(Exception):
    """Runway API error."""

    def __init__(self, message: str, status_code: int | None = None, response: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class RunwayClient:
    """Synchronous Runway Gen video generation client.

    Uses the official ``runwayml`` SDK for task creation and polling,
    then downloads the resulting video via httpx.

    Usage:
        client = RunwayClient(api_key="rw-...")
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

        # Lazy-import the SDK so the rest of the app doesn't break
        # if runwayml isn't installed.
        try:
            from runwayml import RunwayML  # type: ignore[import-untyped]

            self._client = RunwayML(api_key=api_key)
        except ImportError as exc:
            raise ImportError(
                "The 'runwayml' package is required for Runway video generation. "
                "Install it with: pip install runwayml"
            ) from exc

    # -----------------------------------------------------------------
    # Image encoding helpers
    # -----------------------------------------------------------------
    @staticmethod
    def _to_data_uri(image: Union[str, Path, bytes]) -> str:
        """Convert image bytes / path to a base64 data URI.

        Runway's API accepts HTTPS URLs or ``data:<mime>;base64,...`` strings.
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
    # Create video generation task
    # -----------------------------------------------------------------
    def create_video(
        self,
        prompt: str,
        image: Union[str, Path, bytes, None] = None,
        model: str = DEFAULT_MODEL,
        duration: int = 5,
        ratio: str = "1280:720",
    ) -> str:
        """Submit a video generation task. Returns the task ID.

        Args:
            prompt: Text description of the desired video.
            image: Optional input image (bytes, path, URL, or data URI)
                   for image-to-video mode.
            model: Runway model name (gen4_turbo, gen4.5, gen3a_turbo).
            duration: Video duration in seconds (5 or 10).
            ratio: Aspect ratio as ``W:H`` (e.g. ``1280:720``, ``720:1280``).

        Returns:
            Runway task ID string.
        """
        mode = "I2V" if image else "T2V"
        logger.info(
            "Runway: creating %s task (model=%s, duration=%ds, ratio=%s, prompt=%d chars)",
            mode,
            model,
            duration,
            ratio,
            len(prompt),
        )

        try:
            if image:
                # Image-to-video
                prompt_image = self._to_data_uri(image)
                task = self._client.image_to_video.create(
                    model=model,
                    prompt_image=prompt_image,
                    prompt_text=prompt,
                    duration=duration,
                    ratio=ratio,
                )
            else:
                # Text-to-video (gen4.5 supports this)
                task = self._client.text_to_video.create(
                    model=model,
                    prompt_text=prompt,
                    duration=duration,
                    ratio=ratio,
                )
        except Exception as exc:
            raise RunwayError(f"Runway task creation failed: {exc}") from exc

        task_id = task.id
        if not task_id:
            raise RunwayError("No task ID in Runway response", response=task)

        logger.info("Runway: task created: %s", task_id)
        return task_id

    # -----------------------------------------------------------------
    # Poll for completion
    # -----------------------------------------------------------------
    def wait_for_video(self, task_id: str) -> list[str]:
        """Poll task status until completion. Returns list of output URLs.

        The SDK's ``tasks.retrieve()`` is used for manual polling with
        logging, instead of the built-in ``wait_for_task_output()`` which
        gives us less visibility.

        Returns:
            List of video URLs (typically 1 element). URLs expire in 24-48h.
        """
        start = time.time()
        last_status = ""
        poll_interval = 6.0  # Runway recommends ~6s intervals

        while True:
            elapsed = time.time() - start
            if elapsed > self.poll_timeout:
                raise RunwayError(f"Timeout waiting for Runway task {task_id} after {elapsed:.0f}s")

            try:
                task = self._client.tasks.retrieve(id=task_id)
            except Exception as exc:
                logger.warning("Runway: poll error for %s: %s", task_id, exc)
                time.sleep(poll_interval)
                continue

            status = task.status

            if status != last_status:
                progress = getattr(task, "progress", None)
                logger.info(
                    "Runway: task %s status=%s progress=%s (%.0fs)",
                    task_id,
                    status,
                    progress,
                    elapsed,
                )
                last_status = status

            if status == "SUCCEEDED":
                output = task.output
                if not output:
                    raise RunwayError(
                        f"Runway task {task_id} succeeded but has no output",
                        response=task,
                    )
                logger.info("Runway: task %s completed! %d output URL(s)", task_id, len(output))
                return output  # List[str] of video URLs

            if status in ("FAILED", "CANCELLED"):
                failure = getattr(task, "failure", None) or status
                raise RunwayError(
                    f"Runway generation {status.lower()}: {failure}",
                    response=task,
                )

            # Still pending (PENDING / THROTTLED / RUNNING)
            time.sleep(poll_interval)

    # -----------------------------------------------------------------
    # Download video from output URL
    # -----------------------------------------------------------------
    def download_video(self, url: str, output_path: str | None = None) -> bytes:
        """Download generated video from a Runway output URL.

        Output URLs are temporary (expire in 24-48h), so we download
        immediately and persist to S3.

        Returns video bytes.
        """
        logger.info("Runway: downloading video from output URL...")

        response = self._http.get(url)
        if response.status_code != 200:
            raise RunwayError(
                f"Download failed: HTTP {response.status_code}",
                status_code=response.status_code,
            )

        video_bytes = response.content
        size_mb = len(video_bytes) / (1024 * 1024)
        logger.info("Runway: downloaded %.1f MB", size_mb)

        if output_path:
            Path(output_path).write_bytes(video_bytes)
            logger.info("Runway: saved → %s", output_path)

        return video_bytes

    # -----------------------------------------------------------------
    # High-level: generate + wait + download
    # -----------------------------------------------------------------
    def generate_video(
        self,
        prompt: str,
        image: Union[str, Path, bytes, None] = None,
        output_path: str | None = None,
        model: str = DEFAULT_MODEL,
        duration: int = 5,
        ratio: str = "1280:720",
    ) -> dict[str, Any]:
        """Full pipeline: create task → poll → download first output.

        Returns dict with: task_id, video_bytes, video_url, output_urls
        """
        task_id = self.create_video(
            prompt=prompt,
            image=image,
            model=model,
            duration=duration,
            ratio=ratio,
        )
        output_urls = self.wait_for_video(task_id)

        # Download the first (primary) video
        primary_url = output_urls[0]
        video_bytes = self.download_video(primary_url, output_path=output_path)

        return {
            "task_id": task_id,
            "video_bytes": video_bytes,
            "video_url": primary_url,
            "output_urls": output_urls,
        }

    def close(self):
        self._http.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
