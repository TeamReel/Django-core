"""Team Poster Generator Service.

Generates an AI team photo (elftalfoto) using Gemini.
Takes 11 players' fullbody-in-tenue images and generates a classic
pre-match team photo: 6 standing in back row, 5 crouching in front row.

Output: portrait‑mode PNG (1080 × 1920).
"""

from __future__ import annotations

import io
import logging
import time
import uuid as uuid_module

from PIL import Image

from src.video.services._common import (
    CANVAS_HEIGHT,
    CANVAS_WIDTH,
    download_image_bytes,
)

logger = logging.getLogger(__name__)

# ── Output dimensions (portrait 9:16) ─────────────────────────────────────────
WIDTH = CANVAS_WIDTH
HEIGHT = CANVAS_HEIGHT


# ──────────────────────────────────────────────────────────────────────────
# Download helper
# ──────────────────────────────────────────────────────────────────────────


_download_image_bytes = download_image_bytes


# ──────────────────────────────────────────────────────────────────────────
# Gemini call
# ──────────────────────────────────────────────────────────────────────────


def _generate_team_photo(
    player_images: list[tuple[str, bytes]],
    brand_primary: str = "#D2122E",
) -> bytes | None:
    """Call Gemini to generate a team photo from individual player images.

    Args:
        player_images: List of (player_name, image_bytes) tuples.
            Order: keeper first, then defenders, midfielders, attackers.
        brand_primary: Team's primary brand colour (for pitch/stadium mood).

    Returns:
        Generated image bytes (PNG) or None on failure.
    """
    from django.conf import settings
    from google import genai
    from google.genai import types

    api_key = getattr(settings, "GOOGLE_API_KEY", None)
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not configured in settings")

    client = genai.Client(api_key=api_key)

    # Build player name list for the prompt
    names = [name for name, _ in player_images]
    back_row = names[:6]  # standing
    front_row = names[6:]  # crouching

    prompt = (
        "Generate a professional football team photo (elftalfoto) "
        "in PORTRAIT orientation (9:16 aspect ratio). "
        "This is a classic pre-match team photo on a football pitch.\n\n"
        "COMPOSITION:\n"
        f"- Back row (standing, left to right): {', '.join(back_row)}\n"
        f"- Front row (crouching/kneeling, left to right): {', '.join(front_row)}\n\n"
        "STYLE:\n"
        "- Classic football team photo like taken before a real match\n"
        "- All players face the camera, arms crossed or hands on knees\n"
        "- The back row of 6 players stands upright, shoulder to shoulder\n"
        "- The front row of 5 players crouches or kneels in front\n"
        "- Green football pitch visible, stadium atmosphere in background\n"
        "- Overall colour mood should lean towards "
        f"the team colours (primary: {brand_primary})\n"
        "- Photorealistic, cinematic lighting, high quality\n"
        "- Each player should wear the EXACT kit/outfit shown in their reference image\n"
        "- Preserve each player's appearance, skin tone, "
        "and body type from their reference image\n\n"
        "IMPORTANT:\n"
        "- Use the attached reference images as the appearances for each player\n"
        "- The first 6 images are the standing back row (left to right)\n"
        "- The last 5 images are the crouching front row (left to right)\n"
        "- Portrait orientation: 1080px wide, 1920px tall\n"
        "- No text, no logos, no overlays — just the team photo\n"
    )

    content_parts: list = [prompt]
    for _name, img_bytes in player_images:
        content_parts.append(types.Part.from_bytes(data=img_bytes, mime_type="image/png"))

    try:
        response = client.models.generate_content(
            model="models/nano-banana-pro-preview",
            contents=content_parts,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )

        if (
            not response.candidates
            or not response.candidates[0].content
            or not response.candidates[0].content.parts
        ):
            block_reason = getattr(response, "prompt_feedback", None)
            logger.warning("Empty Gemini response for team poster (block_reason=%s)", block_reason)
            return None

        for part in response.candidates[0].content.parts:
            if hasattr(part, "inline_data") and part.inline_data:
                return part.inline_data.data

        logger.warning("No image data in Gemini response for team poster")
        return None

    except Exception:  # noqa: BLE001
        logger.exception("Gemini team poster generation failed")
        return None


# ──────────────────────────────────────────────────────────────────────────
# S3 upload
# ──────────────────────────────────────────────────────────────────────────


def _upload_poster(image_bytes: bytes, activity_id: str) -> str:
    """Upload generated poster to S3 and return presigned URL."""
    try:
        from files.utils import get_storage_backend

        storage_path = f"generated/posters/{activity_id}/{uuid_module.uuid4().hex}.png"
        backend = get_storage_backend()
        backend.save(storage_path, io.BytesIO(image_bytes))
        url = backend.get_url(storage_path, signed=True, expiry_seconds=3600)
        logger.info("Uploaded team poster to S3: %s", storage_path)
        return url

    except Exception as exc:
        logger.warning("Failed to upload poster to S3: %s", exc)
        raise


# ──────────────────────────────────────────────────────────────────────────
# Public entry point
# ──────────────────────────────────────────────────────────────────────────


def build_team_poster(
    activity_id: str,
    template_id: str | None = None,
    formation: str = "4-3-3",
    selected_member_ids: dict | None = None,
) -> str:
    """Build a team poster from activity data.

    High-level entry point that:
    1. Gathers lineup data from DB via LineupSegmentBuilder
    2. Downloads fullbody images for all 11 players
    3. Sends to Gemini for team photo generation
    4. Uploads result to S3

    Args:
        activity_id: Match/activity UUID
        template_id: Optional ContentTemplate ID
        formation: Formation string (e.g. "4-3-3")
        selected_member_ids: Optional dict with goalkeeper/player IDs from frontend

    Returns:
        Presigned URL to the generated poster PNG
    """
    from src.video.services.lineup_builder import LineupSegmentBuilder

    # 1. Gather data from DB
    builder = LineupSegmentBuilder(
        activity_id=activity_id,
        template_id=template_id,
        output_resolution="vertical_1080p",
        selected_member_ids=selected_member_ids,
        formation=formation,
    )
    lineup_data = builder._gather_lineup_data()

    # 2. Resolve brand colour
    brand_primary = _resolve_brand_color(activity_id) or "#D2122E"

    # 3. Collect ordered players: keeper → defenders → midfielders → attackers
    ordered_players = []
    ordered_players.extend(lineup_data.keepers)
    ordered_players.extend(lineup_data.defenders)
    ordered_players.extend(lineup_data.midfielders)
    ordered_players.extend(lineup_data.attackers)

    if len(ordered_players) < 11:
        logger.warning(
            "Team poster: only %d players available (need 11). Proceeding with available.",
            len(ordered_players),
        )

    # 4. Download fullbody images
    player_images: list[tuple[str, bytes]] = []
    for p in ordered_players[:11]:
        url = p.kit_url or p.closeup_url
        if not url:
            logger.warning("Player %s has no fullbody/closeup image — skipping", p.member_name)
            continue
        img_bytes = _download_image_bytes(url)
        if img_bytes:
            player_images.append((p.member_name, img_bytes))
        else:
            logger.warning("Failed to download image for player %s", p.member_name)

    if len(player_images) < 5:
        raise ValueError(
            f"Not enough player images for team poster "
            f"({len(player_images)} downloaded, minimum 5)."
        )

    logger.info(
        "Team poster: %d player images collected, sending to Gemini",
        len(player_images),
    )

    # 5. Generate via Gemini
    start_ts = time.time()
    image_bytes = _generate_team_photo(player_images, brand_primary=brand_primary)
    elapsed = time.time() - start_ts
    logger.info("Gemini team poster generation took %.1fs", elapsed)

    if not image_bytes:
        raise RuntimeError("Gemini failed to generate team poster image.")

    # 6. Ensure output is portrait 1080×1920
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.size != (WIDTH, HEIGHT):
            img = img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            image_bytes = buf.getvalue()
    except Exception:  # noqa: BLE001
        logger.warning("Failed to resize poster — using raw Gemini output")

    # 7. Upload to S3
    return _upload_poster(image_bytes, activity_id)


def _resolve_brand_color(activity_id: str) -> str | None:
    """Look up brand primary color from the project's BrandProfile."""
    from src.video.services._common import resolve_brand_color

    return resolve_brand_color(activity_id)
