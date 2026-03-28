"""Video generation providers for asset pipeline.

Provider implementations:
- MiniMax / Hailuo (video-01)
- Runway Gen (gen4_turbo, gen4.5)
- Pika 2.2 (via fal.ai)
- Google Veo 3.1 (legacy fallback)
"""

from __future__ import annotations

import base64
import logging
import time
from typing import Any

logger = logging.getLogger("generative.services.video_providers")


# -----------------------------------------------------------------------------
# MiniMax / Hailuo Provider
# -----------------------------------------------------------------------------


def _generate_video_minimax(
    *,
    template_id: str,
    template: dict,
    final_prompt: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: int | None,
    context: dict | None,
    api_key: str,
    group_id: str | None,
    variant_count: int = 1,
    model_override: str | None = None,
) -> dict[str, Any]:
    """Generate video using MiniMax (Hailuo) video-01 model.

    Supports:
    - Text-to-video (prompt only)
    - Image-to-video (person_photo as first frame + prompt)

    MiniMax currently generates 1 video per request (720p, 25fps, ~6s).
    For multiple variants, we make sequential requests.
    """
    from .minimax_client import MiniMaxClient

    video_config = template.get("video_config", {})
    model = model_override or video_config.get("minimax_model", "video-01")

    # MiniMax supports max 2000 chars prompt
    if len(final_prompt) > 2000:
        logger.warning(
            "Prompt too long for MiniMax (%d chars). Truncating to 2000.", len(final_prompt)
        )
        final_prompt = final_prompt[:1997] + "..."

    # Check for input image (person_photo for image-to-video)
    person_img = input_images.get("person_photo")
    last_frame_img = input_images.get("_last_frame")  # Set by first_last_frame composite mode

    results = []
    effective_count = min(variant_count, 4)  # Reasonable limit

    for i in range(effective_count):
        try:
            client = MiniMaxClient(
                api_key=api_key,
                group_id=group_id or "",
                timeout=120.0,
                poll_interval=5.0,
                max_wait=600.0,
            )

            logger.info(
                "MiniMax: generating variant %d/%d (%s, model=%s, has_image=%s, has_last_frame=%s)",
                i + 1,
                effective_count,
                "I2V" if person_img else "T2V",
                model,
                bool(person_img),
                bool(last_frame_img),
            )

            # Generate video (handles create → poll → download internally)
            gen_result = client.generate_video(
                prompt=final_prompt,
                image=person_img if person_img else None,
                last_frame=last_frame_img if last_frame_img else None,
                model=model,
            )

            v_bytes = gen_result["video_bytes"]

            logger.info(
                "MiniMax: variant %d task completed. task_id=%s, file_id=%s, %d bytes",
                i + 1,
                gen_result["task_id"],
                gen_result["file_id"],
                len(v_bytes),
            )

            if not v_bytes or len(v_bytes) < 1000:
                raise ValueError(
                    f"Downloaded video is too small ({len(v_bytes) if v_bytes else 0} bytes)"
                )

            # Generate filename
            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{i}.mp4"

            # Upload to S3 if organisation_id provided
            v_url = None
            f_asset_id = None
            storage_path = None

            if organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    from files.models import FileAsset
                    from files.utils import get_storage_backend

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True)
                    storage_path = file_asset.storage_path

                    logger.info("MiniMax video variant %d uploaded to S3: %s", i, fname)
                except Exception as e:
                    logger.exception("Failed to upload MiniMax video variant %d to S3: %s", i, e)

            results.append(
                {
                    "video_bytes": v_bytes,
                    "video_url": v_url,
                    "storage_path": storage_path,
                    "filename": fname,
                    "file_asset_id": f_asset_id,
                    "mime_type": "video/mp4",
                }
            )

            logger.info(
                "MiniMax: variant %d/%d complete (%d bytes)", i + 1, effective_count, len(v_bytes)
            )

            client.close()

        except Exception as e:
            logger.exception("MiniMax: error generating variant %d: %s", i + 1, e)
            if not results:
                # If first variant fails, bail out
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"MiniMax video generation failed: {e}",
                }
            # For subsequent variants, just log and continue
            break

    if not results:
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": "No video variants generated",
        }

    # Build response (backward compatible: first variant as main)
    main = results[0]
    video_config_out = template.get("video_config", {})

    return {
        "video_bytes": main["video_bytes"] if not main["video_url"] else None,
        "video_base64": (
            base64.b64encode(main["video_bytes"]).decode("utf-8")
            if main["video_bytes"] and not main["video_url"]
            else None
        ),
        "video_url": main["video_url"],
        "mime_type": "video/mp4",
        "filename": main["filename"],
        "file_asset_id": main["file_asset_id"],
        "variants": results,
        "metadata": {
            "template_id": template_id,
            "params": params,
            "provider": "minimax",
            "model": model,
            "duration_seconds": video_config_out.get("duration_seconds", 6),
            "aspect_ratio": video_config_out.get("aspect_ratio", "9:16"),
            "resolution": "720p",
            "variant_count": len(results),
        },
    }


# -----------------------------------------------------------------------------
# Runway Gen Provider
# -----------------------------------------------------------------------------


def _generate_video_runway(
    *,
    template_id: str,
    template: dict,
    final_prompt: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: int | None,
    context: dict | None,
    api_key: str,
    variant_count: int = 1,
    model_override: str | None = None,
) -> dict[str, Any]:
    """Generate video using Runway Gen models (gen4_turbo, gen4.5).

    Supports:
    - Text-to-video (prompt only, gen4.5 only)
    - Image-to-video (person_photo as prompt_image + prompt)

    Runway generates 1 video per request. For multiple variants, we make
    sequential requests. Output URLs expire in 24-48h so we download
    and upload to S3 immediately.
    """
    from .runway_client import RunwayClient

    video_config = template.get("video_config", {})
    model = model_override or video_config.get("runway_model", "gen4_turbo")
    duration = video_config.get("duration_seconds", 5)
    aspect_ratio = video_config.get("aspect_ratio", "9:16")

    # Convert aspect ratio format: template uses "9:16", Runway uses "720:1280"
    RATIO_MAP = {
        "9:16": "720:1280",
        "16:9": "1280:720",
        "1:1": "1024:1024",
        "4:3": "1024:768",
        "3:4": "768:1024",
    }
    runway_ratio = RATIO_MAP.get(aspect_ratio, "1280:720")

    # Runway duration: 5 or 10 seconds
    if duration not in (5, 10):
        duration = 5 if duration <= 7 else 10

    # Check for input image (person_photo for image-to-video)
    person_img = input_images.get("person_photo")

    results = []
    effective_count = min(variant_count, 4)  # Reasonable limit

    for i in range(effective_count):
        try:
            client = RunwayClient(
                api_key=api_key,
                timeout=120.0,
                poll_timeout=600.0,
            )

            logger.info(
                "Runway: generating variant %d/%d (%s, model=%s, duration=%ds, ratio=%s)",
                i + 1,
                effective_count,
                "I2V" if person_img else "T2V",
                model,
                duration,
                runway_ratio,
            )

            # Generate video (handles create → poll → download internally)
            gen_result = client.generate_video(
                prompt=final_prompt,
                image=person_img if person_img else None,
                model=model,
                duration=duration,
                ratio=runway_ratio,
            )

            v_bytes = gen_result["video_bytes"]

            logger.info(
                "Runway: variant %d task completed. task_id=%s, %d bytes",
                i + 1,
                gen_result["task_id"],
                len(v_bytes),
            )

            if not v_bytes or len(v_bytes) < 1000:
                raise ValueError(
                    f"Downloaded video is too small ({len(v_bytes) if v_bytes else 0} bytes)"
                )

            # Generate filename
            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{i}.mp4"

            # Upload to S3 if organisation_id provided
            v_url = None
            f_asset_id = None
            storage_path = None

            if organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    from files.models import FileAsset
                    from files.utils import get_storage_backend

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True)
                    storage_path = file_asset.storage_path

                    logger.info("Runway video variant %d uploaded to S3: %s", i, fname)
                except Exception as e:
                    logger.exception("Failed to upload Runway video variant %d to S3: %s", i, e)

            results.append(
                {
                    "video_bytes": v_bytes,
                    "video_url": v_url,
                    "storage_path": storage_path,
                    "filename": fname,
                    "file_asset_id": f_asset_id,
                    "mime_type": "video/mp4",
                }
            )

            logger.info(
                "Runway: variant %d/%d complete (%d bytes)", i + 1, effective_count, len(v_bytes)
            )

            client.close()

        except Exception as e:
            logger.exception("Runway: error generating variant %d: %s", i + 1, e)
            if not results:
                # If first variant fails, bail out
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"Runway video generation failed: {e}",
                }
            # For subsequent variants, just log and continue
            break

    if not results:
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": "No video variants generated",
        }

    # Build response (backward compatible: first variant as main)
    main = results[0]
    video_config_out = template.get("video_config", {})

    return {
        "video_bytes": main["video_bytes"] if not main["video_url"] else None,
        "video_base64": (
            base64.b64encode(main["video_bytes"]).decode("utf-8")
            if main["video_bytes"] and not main["video_url"]
            else None
        ),
        "video_url": main["video_url"],
        "mime_type": "video/mp4",
        "filename": main["filename"],
        "file_asset_id": main["file_asset_id"],
        "variants": results,
        "metadata": {
            "template_id": template_id,
            "params": params,
            "provider": "runway",
            "model": model,
            "duration_seconds": duration,
            "aspect_ratio": video_config_out.get("aspect_ratio", "9:16"),
            "resolution": runway_ratio,
            "variant_count": len(results),
        },
    }


# -----------------------------------------------------------------------------
# Pika 2.2 Provider (via fal.ai)
# -----------------------------------------------------------------------------


def _generate_video_pika(
    *,
    template_id: str,
    template: dict,
    final_prompt: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: int | None,
    context: dict | None,
    api_key: str,
    variant_count: int = 1,
) -> dict[str, Any]:
    """Generate video using Pika 2.2 via fal.ai.

    Supports:
    - Text-to-video (prompt only)
    - Image-to-video (person_photo as first frame + prompt)

    Pika generates 1 video per request. For multiple variants, we make
    sequential requests. Output URLs from fal.ai are temporary so we
    download and upload to S3 immediately.
    """
    from .pika_client import PikaClient

    video_config = template.get("video_config", {})
    duration = video_config.get("duration_seconds", 5)
    aspect_ratio = video_config.get("aspect_ratio", "9:16")
    resolution = video_config.get("pika_resolution", "720p")

    # Pika duration: 5 or 10 seconds
    if duration not in (5, 10):
        duration = 5 if duration <= 7 else 10

    # Pika resolution: "720p" or "1080p"
    if resolution not in ("720p", "1080p"):
        resolution = "720p"

    # Pika aspect ratio: must be one of supported values
    SUPPORTED_RATIOS = {"16:9", "9:16", "1:1", "4:5", "5:4", "3:2", "2:3"}
    if aspect_ratio not in SUPPORTED_RATIOS:
        aspect_ratio = "9:16"  # default for vertical content

    # Check for input image (person_photo for image-to-video)
    person_img = input_images.get("person_photo")

    results = []
    effective_count = min(variant_count, 4)  # Reasonable limit

    for i in range(effective_count):
        try:
            client = PikaClient(
                api_key=api_key,
                timeout=120.0,
                poll_timeout=600.0,
            )

            logger.info(
                "Pika: generating variant %d/%d (%s, duration=%ds, resolution=%s, ratio=%s)",
                i + 1,
                effective_count,
                "I2V" if person_img else "T2V",
                duration,
                resolution,
                aspect_ratio,
            )

            # Generate video (handles submit → poll → download internally)
            gen_result = client.generate_video(
                prompt=final_prompt,
                image=person_img if person_img else None,
                duration=duration,
                resolution=resolution,
                aspect_ratio=aspect_ratio,
            )

            v_bytes = gen_result["video_bytes"]

            logger.info(
                "Pika: variant %d completed. %d bytes",
                i + 1,
                len(v_bytes),
            )

            if not v_bytes or len(v_bytes) < 1000:
                raise ValueError(
                    f"Downloaded video is too small ({len(v_bytes) if v_bytes else 0} bytes)"
                )

            # Generate filename
            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{i}.mp4"

            # Upload to S3 if organisation_id provided
            v_url = None
            f_asset_id = None
            storage_path = None

            if organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    from files.models import FileAsset
                    from files.utils import get_storage_backend

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True)
                    storage_path = file_asset.storage_path

                    logger.info("Pika video variant %d uploaded to S3: %s", i, fname)
                except Exception as e:
                    logger.exception("Failed to upload Pika video variant %d to S3: %s", i, e)

            results.append(
                {
                    "video_bytes": v_bytes,
                    "video_url": v_url,
                    "storage_path": storage_path,
                    "filename": fname,
                    "file_asset_id": f_asset_id,
                    "mime_type": "video/mp4",
                }
            )

            logger.info(
                "Pika: variant %d/%d complete (%d bytes)", i + 1, effective_count, len(v_bytes)
            )

            client.close()

        except Exception as e:
            logger.exception("Pika: error generating variant %d: %s", i + 1, e)
            if not results:
                # If first variant fails, bail out
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"Pika video generation failed: {e}",
                }
            # For subsequent variants, just log and continue
            break

    if not results:
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": "No video variants generated",
        }

    # Build response (backward compatible: first variant as main)
    main = results[0]

    return {
        "video_bytes": main["video_bytes"] if not main["video_url"] else None,
        "video_base64": (
            base64.b64encode(main["video_bytes"]).decode("utf-8")
            if main["video_bytes"] and not main["video_url"]
            else None
        ),
        "video_url": main["video_url"],
        "mime_type": "video/mp4",
        "filename": main["filename"],
        "file_asset_id": main["file_asset_id"],
        "variants": results,
        "metadata": {
            "template_id": template_id,
            "params": params,
            "provider": "pika",
            "model": "pika-2.2",
            "duration_seconds": duration,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "variant_count": len(results),
        },
    }


# -----------------------------------------------------------------------------
# Google Veo Provider (legacy fallback)
# -----------------------------------------------------------------------------


def _generate_video_veo(
    *,
    template_id: str,
    template: dict,
    final_prompt: str,
    params: dict[str, str],
    input_images: dict[str, bytes],
    user_id: int | None,
    organisation_id: int | None,
    context: dict | None,
    api_key: str,
    poll_interval: int = 10,
    max_wait_seconds: int = 300,
    variant_count: int = 1,
    model_override: str | None = None,
) -> dict[str, Any]:
    """Generate video using Google Veo 3.1 (legacy fallback).

    WARNING: Google Veo frequently blocks person/sports content due to content policy.
    Use MiniMax as the primary provider.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)

    video_config = template.get("video_config", {})
    # Map model registry IDs to Veo API model strings
    _veo_model_map = {
        "veo-3.1-fast": "veo-3.1-fast-generate-preview",
        "veo-3.1-generate": "veo-3.1-generate-preview",
    }
    veo_model = _veo_model_map.get(model_override or "", "veo-3.1-fast-generate-preview")
    duration = video_config.get(
        "duration_seconds", 4
    )  # 4s default (reduced from 6s for cost/speed)
    aspect_ratio = video_config.get("aspect_ratio", "9:16")
    resolution = video_config.get("resolution", "720p")
    loop_video = video_config.get("loop", False)

    person_img = input_images.get("person_photo")
    image_obj = None
    if person_img:
        image_obj = {"image_bytes": person_img, "mime_type": "image/png"}

    if variant_count > 1:
        logger.warning("Veo supports max 1 video. Clamping to 1.")

    config_args = {"number_of_videos": 1}
    if not person_img:
        config_args["aspect_ratio"] = aspect_ratio

    veo_config = types.GenerateVideosConfig(**config_args)

    try:
        if person_img:
            operation = client.models.generate_videos(
                model=veo_model,
                prompt=final_prompt,
                image=image_obj,
                config=veo_config,
            )
        else:
            operation = client.models.generate_videos(
                model=veo_model,
                prompt=final_prompt,
                config=veo_config,
            )

        start_time = time.time()
        while not operation.done:
            elapsed = time.time() - start_time
            if elapsed > max_wait_seconds:
                return {
                    "video_bytes": None,
                    "video_base64": None,
                    "mime_type": None,
                    "filename": None,
                    "error": f"Veo: timed out after {max_wait_seconds}s",
                }
            logger.info("Veo: waiting... (%.0fs elapsed)", elapsed)
            time.sleep(poll_interval)
            operation = client.operations.get(operation)

        generated_variants = []

        def process_veo_result(vid_obj, idx):
            if not vid_obj.video:
                raise ValueError(f"Veo variant {idx}: no video reference")

            try:
                v_bytes = client.files.download(file=vid_obj.video.name)
            except Exception as e:
                try:
                    v_bytes = client.files.download(file=vid_obj.video)
                except Exception as e2:
                    raise RuntimeError(f"Veo download failed: {e} / {e2}") from e

            safe_params = {k: v for k, v in params.items() if k != "user_instruction"}
            param_str = "_".join(f"{k}-{v}" for k, v in sorted(safe_params.items()))
            if len(param_str) > 60:
                param_str = param_str[:57] + "..."
            fname = f"{template_id}_{param_str}_{int(time.time())}_{idx}.mp4"

            v_url = None
            f_asset_id = None
            storage_path = None

            if organisation_id:
                try:
                    from .file_storage import GenerationFileService

                    file_asset_uuid = GenerationFileService.store_output_file(
                        content=v_bytes,
                        filename=fname,
                        mime_type="video/mp4",
                        user_id=user_id,
                        organisation_id=organisation_id,
                        context=context or {},
                    )
                    f_asset_id = str(file_asset_uuid)

                    from files.models import FileAsset
                    from files.utils import get_storage_backend

                    file_asset = FileAsset.objects.get(id=file_asset_uuid)
                    storage = get_storage_backend()
                    v_url = storage.get_url(file_asset.storage_path, signed=True)
                    storage_path = file_asset.storage_path
                except Exception as e:
                    logger.exception("Veo: S3 upload failed for variant %d: %s", idx, e)

            return {
                "video_bytes": v_bytes,
                "video_url": v_url,
                "storage_path": storage_path,
                "filename": fname,
                "file_asset_id": f_asset_id,
                "mime_type": "video/mp4",
            }

        generated_videos = (
            operation.response.generated_videos
            if operation.response and operation.response.generated_videos
            else []
        )

        if not generated_videos:
            block_reason = None
            if operation.response:
                block_reason = getattr(operation.response, "block_reason", None)
            if block_reason:
                raise ValueError(f"Veo: blocked: {block_reason}")
            raise ValueError(
                "Veo: No videos generated (generated_videos is empty/None). "
                "Content policy filtering or API issue. Consider using MiniMax instead."
            )

        for i, vid in enumerate(generated_videos):
            generated_variants.append(process_veo_result(vid, i))

        if not generated_variants:
            raise ValueError("Veo: No videos generated")

        main = generated_variants[0]

        return {
            "video_bytes": main["video_bytes"] if not main["video_url"] else None,
            "video_base64": (
                base64.b64encode(main["video_bytes"]).decode("utf-8")
                if main["video_bytes"] and not main["video_url"]
                else None
            ),
            "video_url": main["video_url"],
            "mime_type": "video/mp4",
            "filename": main["filename"],
            "file_asset_id": main["file_asset_id"],
            "variants": generated_variants,
            "metadata": {
                "template_id": template_id,
                "params": params,
                "provider": "google_veo",
                "duration_seconds": duration,
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "loop": loop_video,
                "variant_count": len(generated_variants),
            },
        }

    except Exception as e:
        logger.exception("Veo: error: %s", e)
        return {
            "video_bytes": None,
            "video_base64": None,
            "mime_type": None,
            "filename": None,
            "error": str(e),
        }
