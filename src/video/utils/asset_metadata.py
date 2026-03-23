"""Asset metadata helpers for role-based nested variant storage.

Provides a single source of truth for reading/writing TeamReel asset
metadata in the new nested format::

    roles.{role}.{images|videos}.{asset_type}.{kit}.{variant} = variant_value

All other modules should use these helpers instead of directly
manipulating the metadata dict.
"""

from __future__ import annotations

from typing import Any, Generator

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ROLE_KIT_MAP: dict[str, dict[str, Any]] = {
    "keeper": {"default": "goalkeeper", "kits": ["goalkeeper"]},
    "player": {"default": "home", "kits": ["home", "away", "third"]},
    "coach": {"default": None, "kits": []},
    "assistant": {"default": None, "kits": []},
    "verzorger": {"default": None, "kits": []},
    "supporter": {"default": None, "kits": []},
    "manager": {"default": None, "kits": []},
}

IMAGE_ASSET_TYPES = frozenset({"fullbody", "halfbody", "closeup", "action_photo"})
VIDEO_ASSET_TYPES = frozenset(
    {"intro", "celebration", "then_vs_now", "photo_composite", "walking_composite"}
)

ASSET_TYPES_BY_ROLE: dict[str, list[str]] = {
    "keeper": ["fullbody", "halfbody", "closeup", "intro", "celebration"],
    "player": ["fullbody", "halfbody", "closeup", "intro", "celebration"],
    "coach": ["profile"],
    "assistant": ["profile"],
    "verzorger": [],
    "supporter": [],
    "manager": [],
}

SHARED_ASSET_TYPES = frozenset({"profile", "action_photo"})


def media_type_for_asset(asset_type: str) -> str:
    """Return 'images' or 'videos' based on asset_type."""
    if asset_type in IMAGE_ASSET_TYPES:
        return "images"
    return "videos"


# ---------------------------------------------------------------------------
# Read helpers
# ---------------------------------------------------------------------------


def get_variant_value(
    membership: Any,
    role: str,
    media_type: str,
    asset_type: str,
    kit: str,
    variant: str = "default",
) -> dict | None:
    """Direct dict lookup — no fallbacks.

    Returns the variant value dict or None if not found.
    """
    meta = getattr(membership, "metadata", None) or {}
    return (
        meta.get("teamreel_assets", {})
        .get("roles", {})
        .get(role, {})
        .get(media_type, {})
        .get(asset_type, {})
        .get(kit, {})
        .get(variant)
    )


def get_role_assets(membership: Any, role: str) -> dict:
    """Return the full asset dict for a role."""
    meta = getattr(membership, "metadata", None) or {}
    return meta.get("teamreel_assets", {}).get("roles", {}).get(role, {})


def iter_variants(
    membership: Any,
    role: str,
    media_type: str,
    asset_type: str,
    kit: str | None = None,
) -> Generator[tuple[str, str, dict], None, None]:
    """Yield ``(kit, variant_id, variant_value)`` tuples.

    If *kit* is given, only iterate variants for that kit.
    Otherwise iterate all kits for the given asset_type.
    """
    meta = getattr(membership, "metadata", None) or {}
    asset_data = (
        meta.get("teamreel_assets", {})
        .get("roles", {})
        .get(role, {})
        .get(media_type, {})
        .get(asset_type, {})
    )
    if not isinstance(asset_data, dict):
        return

    kits_to_check = [kit] if kit else list(asset_data.keys())
    for k in kits_to_check:
        kit_data = asset_data.get(k)
        if not isinstance(kit_data, dict):
            continue
        for variant_id, value in kit_data.items():
            yield k, variant_id, value


def get_functional_roles(membership: Any) -> list[str]:
    """Return functional roles from membership metadata."""
    meta = getattr(membership, "metadata", None) or {}
    return list(meta.get("functional_roles") or [])


def get_asset_roles(membership: Any) -> list[str]:
    """Return roles that have asset data in teamreel_assets.roles."""
    meta = getattr(membership, "metadata", None) or {}
    return list(meta.get("teamreel_assets", {}).get("roles", {}).keys())


def get_default_kit(role: str) -> str | None:
    """Return the default kit for a functional role."""
    mapping = ROLE_KIT_MAP.get(role)
    if mapping:
        return mapping["default"]
    return None


def get_available_kits(role: str) -> list[str]:
    """Return available kits for a functional role."""
    mapping = ROLE_KIT_MAP.get(role)
    if mapping:
        return list(mapping["kits"])
    return []


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------


def set_variant_value(
    membership: Any,
    role: str,
    media_type: str,
    asset_type: str,
    kit: str,
    variant: str,
    value: dict,
) -> None:
    """Set value at ``roles.{role}.{media_type}.{asset_type}.{kit}.{variant}``.

    Creates intermediate dicts as needed.  Does **not** call ``save()``.
    """
    meta = getattr(membership, "metadata", None)
    if meta is None:
        meta = {}
        membership.metadata = meta

    tr = meta.setdefault("teamreel_assets", {})
    roles = tr.setdefault("roles", {})
    role_data = roles.setdefault(role, {})
    type_data = role_data.setdefault(media_type, {})
    asset_data = type_data.setdefault(asset_type, {})
    kit_data = asset_data.setdefault(kit, {})
    kit_data[variant] = value


def update_media_aliases(
    membership: Any,
    asset_type: str,
    url: str,
) -> None:
    """Write legacy ``media.*`` aliases for backward compatibility.

    This keeps ``media.{asset_type}.url`` and ``media.kit.url`` (for fullbody)
    in sync so that existing frontend code that reads flat media slots
    still works until H5 refactors it away.
    """
    meta = getattr(membership, "metadata", None)
    if meta is None:
        meta = {}
        membership.metadata = meta

    tr = meta.setdefault("teamreel_assets", {})
    media = tr.setdefault("media", {})

    slot = media.get(asset_type, {})
    if isinstance(slot, dict):
        slot["url"] = url
    else:
        slot = {"url": url, "caption": ""}
    media[asset_type] = slot

    if asset_type == "fullbody":
        kit_slot = media.get("kit", {})
        if isinstance(kit_slot, dict):
            kit_slot["url"] = url
        else:
            kit_slot = {"url": url, "caption": ""}
        media["kit"] = kit_slot


# ---------------------------------------------------------------------------
# S3 path helper
# ---------------------------------------------------------------------------


def build_s3_asset_path(
    member_id: str,
    role: str,
    asset_type: str,
    kit: str,
    variant: str,
    content_hash: str,
    ext: str,
) -> str:
    """Build the new S3 key for a processed asset.

    Format: ``members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}``
    """
    return (
        f"members/{member_id}/processed/{role}/{asset_type}"
        f"/{kit}/{variant}_{content_hash}.{ext}"
    )
