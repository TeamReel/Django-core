"""Branding services — color extraction and design token generation."""

from __future__ import annotations

import logging
from collections import Counter
from io import BytesIO

import requests
from PIL import Image

from .models import BrandAsset, BrandProfile, DesignToken

logger = logging.getLogger(__name__)


def download_asset_image(asset: BrandAsset) -> bytes | None:
    """Download image bytes from a BrandAsset's file or URL."""
    try:
        url = asset.get_url()
        if not url:
            return None
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.content
    except Exception:
        logger.warning("Failed to download asset image: %s", asset.id, exc_info=True)
        return None


def extract_dominant_colors(image_bytes: bytes, max_colors: int = 8) -> list[str]:
    """Extract dominant colors from image bytes using Pillow quantization.

    Returns list of hex color strings sorted by pixel frequency (descending).
    Filters out near-white, near-black, and very desaturated colors.
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")

    # Remove near-transparent pixels
    pixels = list(img.getdata())
    opaque_pixels = [(r, g, b) for r, g, b, a in pixels if a > 128]

    if not opaque_pixels:
        # Fallback: use all pixels ignoring alpha
        opaque_pixels = [(r, g, b) for r, g, b, a in pixels]

    if not opaque_pixels:
        return []

    # Create new image from opaque pixels for quantisation
    temp_img = Image.new("RGB", (len(opaque_pixels), 1))
    temp_img.putdata(opaque_pixels)

    # Quantise to reduce palette
    quantised = temp_img.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT)
    palette = quantised.getpalette()
    if not palette:
        return []

    # Count pixels per palette index
    index_counts = Counter(quantised.getdata())

    # Build (hex_color, count) list
    color_counts = []
    for idx, count in index_counts.most_common(max_colors):
        r, g, b = palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2]
        hex_color = f"#{r:02x}{g:02x}{b:02x}"
        color_counts.append((hex_color, count))

    # Filter out near-white, near-black, and very desaturated colors
    filtered = []
    for hex_color, count in color_counts:
        r = int(hex_color[1:3], 16)
        g = int(hex_color[3:5], 16)
        b = int(hex_color[5:7], 16)
        brightness = (r + g + b) / 3
        max_c, min_c = max(r, g, b), min(r, g, b)
        saturation = (max_c - min_c) / max_c if max_c > 0 else 0

        # Skip near-white (>240 brightness) and near-black (<15)
        if brightness > 240 or brightness < 15:
            continue
        # Skip very desaturated (grey-ish) unless it's a strong dark/mid tone
        if saturation < 0.10 and brightness > 60:
            continue
        filtered.append((hex_color, count))

    # If all colors filtered, fall back to originals
    if not filtered:
        filtered = color_counts

    # Sort by count descending and return hex strings
    filtered.sort(key=lambda x: -x[1])
    return [c[0] for c in filtered]


def rank_colors(all_colors: list[str]) -> list[str]:
    """Rank and deduplicate colors, ensuring visual diversity.

    Returns up to 6 colors with minimum Euclidean distance of 40 between each.
    """
    counts = Counter(all_colors)
    ranked = [c for c, _ in counts.most_common()]

    # Ensure sufficient visual distance between selected colors
    selected: list[str] = []
    for color in ranked:
        if len(selected) >= 6:
            break
        r1 = int(color[1:3], 16)
        g1 = int(color[3:5], 16)
        b1 = int(color[5:7], 16)
        too_close = False
        for existing in selected:
            r2 = int(existing[1:3], 16)
            g2 = int(existing[3:5], 16)
            b2 = int(existing[5:7], 16)
            dist = ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5
            if dist < 40:
                too_close = True
                break
        if not too_close:
            selected.append(color)

    return selected


def generate_design_tokens(profile: BrandProfile) -> dict[str, str]:
    """Extract colors from brand assets and upsert design tokens.

    Analyses uploaded brand assets (logo, kit images) to extract primary,
    secondary, and accent colors. Updates the profile's design tokens.

    Returns:
        Dict mapping token key to hex color value, e.g.
        {"primary_color": "#ab1234", "secondary_color": "#ffffff"}

    Raises:
        ValueError: If no images found or no colors could be extracted.
    """
    asset_types_priority = [
        "logo_upload",
        "logo",
        "kit_home_upload",
        "kit_home",
        "kit_away_upload",
        "kit_away",
        "kit_legacy_upload",
        "kit_legacy",
    ]

    image_data_list: list[tuple[str, bytes]] = []
    for asset_type in asset_types_priority:
        asset = profile.brand_assets.filter(asset_type=asset_type, is_active=True).first()
        if asset:
            image_bytes = download_asset_image(asset)
            if image_bytes:
                image_data_list.append((asset_type, image_bytes))

    if not image_data_list:
        raise ValueError("No logo or kit images found to analyse. Upload images first.")

    # Extract colors from all available images
    all_colors: list[str] = []
    for asset_type, img_bytes in image_data_list:
        try:
            colors = extract_dominant_colors(img_bytes)
            all_colors.extend(colors)
            logger.info("Extracted %d colors from %s asset", len(colors), asset_type)
        except Exception:
            logger.warning("Failed to extract colors from %s", asset_type, exc_info=True)

    if not all_colors:
        raise ValueError("Could not extract colors from the uploaded images.")

    # Deduplicate and rank colors by frequency
    ranked = rank_colors(all_colors)

    # Map to tokens: primary, secondary, accent
    token_map: dict[str, str] = {}
    if len(ranked) >= 1:
        token_map["primary_color"] = ranked[0]
    if len(ranked) >= 2:
        token_map["secondary_color"] = ranked[1]
    if len(ranked) >= 3:
        token_map["accent_color"] = ranked[2]

    # Upsert design tokens
    for key, value in token_map.items():
        DesignToken.objects.update_or_create(
            profile=profile,
            key=key,
            defaults={
                "value": value,
                "type": "color",
                "description": "Auto-generated from brand assets",
            },
        )

    return token_map
