"""Direct MiniMax/Hailuo video generation client.

Replaces the `minimax-python` SDK which has outdated status enums
(doesn't handle 'Queueing', 'Fail' etc).

Uses raw httpx requests against https://api.minimax.chat/v1/
"""

from __future__ import annotations

import base64
import logging
import time
from pathlib import Path
from typing import Any, Union

import httpx

logger = logging.getLogger("generative.services.minimax_client")

BASE_URL = "https://api.minimaxi.chat/v1"

# All known statuses from MiniMax API
TERMINAL_STATUSES = {"Success", "Fail", "Failed"}
PENDING_STATUSES = {"Preparing", "Queueing", "Processing", "Running"}


class MiniMaxError(Exception):
    """MiniMax API error."""

    def __init__(self, message: str, status_code: int | None = None, response: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class MiniMaxClient:
    """Synchronous MiniMax video generation client.

    Usage:
        client = MiniMaxClient(api_key="...", group_id="...")
        task_id = client.create_video(prompt="...", image_path="photo.png")
        result = client.wait_for_video(task_id)
        client.download_video(result["file_id"], "output.mp4")
    """

    def __init__(
        self,
        api_key: str,
        group_id: str,
        timeout: float = 30.0,
        poll_interval: float = 5.0,
        max_wait: float = 600.0,
    ):
        self.api_key = api_key
        self.group_id = group_id
        self.poll_interval = poll_interval
        self.max_wait = max_wait
        self._client = httpx.Client(timeout=timeout)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _encode_image(self, image: Union[str, Path, bytes]) -> str:
        """Encode image to base64 data URI for the API."""
        if isinstance(image, bytes):
            img_bytes = image
        else:
            img_bytes = Path(image).read_bytes()

        b64 = base64.b64encode(img_bytes).decode("utf-8")

        # Detect format from bytes
        if img_bytes[:4] == b"\x89PNG":
            mime = "image/png"
        elif img_bytes[:2] == b"\xff\xd8":
            mime = "image/jpeg"
        else:
            mime = "image/png"  # default

        return f"data:{mime};base64,{b64}"

    # -----------------------------------------------------------------
    # Create video generation task
    # -----------------------------------------------------------------
    def create_video(
        self,
        prompt: str,
        image: Union[str, Path, bytes, None] = None,
        last_frame: Union[str, Path, bytes, None] = None,
        model: str = "video-01",
        prompt_optimizer: bool = True,
    ) -> str:
        """Submit a video generation task. Returns task_id.

        Args:
            prompt: Text description (max 2000 chars)
            image: Optional image for image-to-video (path, bytes, or base64)
            last_frame: Optional image for last frame (path, bytes, or base64)
            model: Model ID (video-01, T2V-01, I2V-01, etc.)
            prompt_optimizer: Let MiniMax optimize the prompt
        """
        payload: dict[str, Any] = {
            "model": model,
            "prompt_optimizer": prompt_optimizer,
        }

        if prompt:
            payload["prompt"] = prompt[:2000]

        if image is not None:
            payload["first_frame_image"] = self._encode_image(image)

        if last_frame is not None:
            # last_frame_image only supported by MiniMax-Hailuo-02 (FL2V endpoint)
            if model not in ("MiniMax-Hailuo-02",):
                logger.warning(
                    "MiniMax: last_frame_image requires MiniMax-Hailuo-02, "
                    "auto-upgrading from %s",
                    model,
                )
                model = "MiniMax-Hailuo-02"
                payload["model"] = model
            payload["last_frame_image"] = self._encode_image(last_frame)
            logger.info("MiniMax: last_frame_image provided for end-frame guidance")

        mode = "I2V" if image else "T2V"
        logger.info(
            "MiniMax: creating %s task (model=%s, prompt=%d chars)", mode, model, len(prompt)
        )

        response = self._client.post(
            f"{BASE_URL}/video_generation",
            headers=self._headers(),
            json=payload,
        )

        data = response.json()

        # Check for errors
        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", 0) != 0:
            error_msg = base_resp.get("status_msg", "Unknown error")
            raise MiniMaxError(
                f"MiniMax API error: {error_msg} (code={base_resp.get('status_code')})",
                status_code=response.status_code,
                response=data,
            )

        task_id = data.get("task_id")
        if not task_id:
            raise MiniMaxError("No task_id in response", response=data)

        logger.info("MiniMax: task created: %s", task_id)
        return task_id

    # -----------------------------------------------------------------
    # Poll for completion
    # -----------------------------------------------------------------
    def wait_for_video(self, task_id: str) -> dict[str, Any]:
        """Poll task status until completion. Returns task result dict.

        Returns dict with keys: task_id, status, file_id, video_width, video_height
        """
        start = time.time()
        last_status = ""

        while True:
            elapsed = time.time() - start
            if elapsed > self.max_wait:
                raise MiniMaxError(f"Timeout waiting for task {task_id} after {elapsed:.0f}s")

            response = self._client.get(
                f"{BASE_URL}/query/video_generation",
                params={"task_id": task_id},
                headers=self._headers(),
            )

            data = response.json()
            status = data.get("status", "Unknown")

            # Check base_resp for API-level errors
            base_resp = data.get("base_resp", {})
            api_code = base_resp.get("status_code", 0)

            # Log full response for debugging
            if status != last_status:
                logger.info(
                    "MiniMax: task %s status=%s, api_code=%s, file_id=%s (%.0fs)",
                    task_id,
                    status,
                    api_code,
                    data.get("file_id", ""),
                    elapsed,
                )
                last_status = status

            if api_code != 0:
                error_msg = base_resp.get("status_msg", "Unknown")
                raise MiniMaxError(
                    f"MiniMax polling error: {error_msg} (code={base_resp.get('status_code')})",
                    response=data,
                )

            # Success
            if status == "Success":
                file_id = data.get("file_id", "")
                logger.info(
                    "MiniMax: task %s completed! file_id=%s, %dx%d",
                    task_id,
                    file_id,
                    data.get("video_width", 0),
                    data.get("video_height", 0),
                )
                return data

            # Failure
            if status in ("Fail", "Failed"):
                error_msg = base_resp.get("status_msg", f"Generation failed with status: {status}")
                raise MiniMaxError(f"MiniMax generation failed: {error_msg}", response=data)

            # Still pending (Preparing, Queueing, Processing, or any unknown)
            time.sleep(self.poll_interval)

    # -----------------------------------------------------------------
    # Download video
    # -----------------------------------------------------------------
    def download_video(self, file_id: str, output_path: str | None = None) -> bytes:
        """Download generated video by file_id. Returns video bytes.

        Also saves to output_path if provided.
        """
        logger.info("MiniMax: retrieving file info for %s", file_id)

        response = self._client.get(
            f"{BASE_URL}/files/retrieve",
            params={"GroupId": self.group_id, "file_id": file_id},
            headers=self._headers(),
        )

        data = response.json()

        file_info = data.get("file", {})
        download_url = file_info.get("download_url")

        if not download_url:
            raise MiniMaxError(f"No download_url for file {file_id}", response=data)

        logger.info("MiniMax: downloading video (%s bytes)...", file_info.get("bytes", "?"))

        dl_response = self._client.get(download_url)
        if dl_response.status_code != 200:
            raise MiniMaxError(
                f"Download failed: HTTP {dl_response.status_code}",
                status_code=dl_response.status_code,
            )

        video_bytes = dl_response.content

        if output_path:
            Path(output_path).write_bytes(video_bytes)
            size_mb = len(video_bytes) / (1024 * 1024)
            logger.info("MiniMax: saved %.1f MB → %s", size_mb, output_path)

        return video_bytes

    # -----------------------------------------------------------------
    # High-level: generate + wait + download
    # -----------------------------------------------------------------
    def generate_video(
        self,
        prompt: str,
        image: Union[str, Path, bytes, None] = None,
        last_frame: Union[str, Path, bytes, None] = None,
        output_path: str | None = None,
        model: str = "video-01",
    ) -> dict[str, Any]:
        """Full pipeline: create task → poll → download.

        Returns dict with: task_id, file_id, video_bytes, video_width, video_height
        """
        task_id = self.create_video(prompt=prompt, image=image, last_frame=last_frame, model=model)
        result = self.wait_for_video(task_id)

        file_id = result.get("file_id", "")
        video_bytes = self.download_video(file_id, output_path=output_path)

        output = {
            "task_id": task_id,
            "file_id": file_id,
            "video_bytes": video_bytes,
            "video_width": result.get("video_width", 0),
            "video_height": result.get("video_height", 0),
        }

        # Quality check if saved to disk
        if output_path:
            from src.media.validation.video_validator import (
                QualityStatus,
                VideoQualityChecker,
            )

            quality = VideoQualityChecker.check(output_path)
            output["quality"] = quality.to_dict()
            logger.info(
                "MiniMax: quality check — %s (%s)", quality.status.value, quality.resolution
            )

            if quality.status == QualityStatus.FAILED:
                raise MiniMaxError(
                    f"Video quality check failed: {quality.warnings}",
                )
            elif quality.status == QualityStatus.DEGRADED:
                for warning in quality.warnings:
                    logger.warning("MiniMax: quality warning — %s", warning)

        return output

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
