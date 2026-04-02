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


def infer_role(membership: Any, kit: str) -> str:
    """Infer the role for an asset based on kit type and membership roles.

    - ``goalkeeper`` kit → ``keeper`` role
    - Otherwise → first functional role that has kits (``player`` default)
    """
    if kit == "goalkeeper":
        return "keeper"
    roles = get_functional_roles(membership)
    if "player" in roles:
        return "player"
    if roles:
        return roles[0]
    return "player"


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


def get_best_variant(
    role_assets: dict,
    media_type: str,
    asset_type: str,
    get_url_fn: Any = None,
) -> dict | str | None:
    """Select the best variant for a given asset type across all kits.

    Priority: variant with processed URL → variant with raw URL.
    Within a kit, prefers 'default' variant first.

    Args:
        role_assets: The ``roles.{role}`` dict (images + videos).
        media_type: ``'images'`` or ``'videos'``.
        asset_type: e.g. ``'intro'``, ``'fullbody'``.
        get_url_fn: Optional function to extract URL from variant value.
            If not provided, returns the raw variant dict/string.

    Returns:
        The best variant value, or None if nothing found.
    """
    kits = (role_assets.get(media_type) or {}).get(asset_type) or {}
    for kit_data in kits.values():
        if not isinstance(kit_data, dict):
            continue
        # Try 'default' first
        if "default" in kit_data:
            val = kit_data["default"]
            if val:
                if get_url_fn:
                    url = get_url_fn(val)
                    if url:
                        return val
                elif isinstance(val, dict) and val.get("processed"):
                    return val
                elif isinstance(val, str) and val:
                    return val
        # Fallback: first variant with data
        for val in kit_data.values():
            if not val:
                continue
            if get_url_fn:
                url = get_url_fn(val)
                if url:
                    return val
            elif isinstance(val, dict) and (val.get("processed") or val.get("raw")):
                return val
            elif isinstance(val, str) and val:
                return val
    return None


def check_member_kit_readiness(metadata: dict | None, kit_type: str) -> dict[str, bool]:
    """Check if a member has processed assets for a given kit_type.

    Args:
        metadata: The ProjectMembership.metadata dict (or None).
        kit_type: ``'goalkeeper'``, ``'home'``, ``'away'``, etc.

    Returns:
        ``{ready: bool, has_fullbody: bool, has_closeup: bool, has_intro: bool}``
    """
    result = {"ready": False, "has_fullbody": False, "has_closeup": False, "has_intro": False}

    teamreel_assets = (metadata or {}).get("teamreel_assets", {})
    if not teamreel_assets:
        return result

    # Determine role key from kit_type
    role_key = "keeper" if kit_type == "goalkeeper" else "player"
    roles = teamreel_assets.get("roles", {})
    role_data = roles.get(role_key, {})

    # Check new roles.{role} structure
    if role_data:
        fb = (role_data.get("images") or {}).get("fullbody", {}).get(kit_type, {})
        result["has_fullbody"] = _has_processed_variant(fb)

        cl = (role_data.get("images") or {}).get("closeup", {}).get(kit_type, {})
        result["has_closeup"] = _has_processed_variant(cl)

        intro = (role_data.get("videos") or {}).get("intro", {}).get(kit_type, {})
        result["has_intro"] = _has_processed_variant(intro)

    # Fallback: legacy flat structure
    if not result["has_fullbody"]:
        fb_legacy = teamreel_assets.get("images", {}).get("fullbody", {}).get(kit_type)
        if fb_legacy:
            result["has_fullbody"] = True

    result["ready"] = result["has_fullbody"]
    return result


def _has_processed_variant(kit_data: dict | str | None) -> bool:
    """Check if a kit slot has any processed variant."""
    if not kit_data:
        return False
    if isinstance(kit_data, str):
        return bool(kit_data)
    if isinstance(kit_data, dict):
        # Check 'default' variant first, then any variant
        default = kit_data.get("default")
        if default:
            if isinstance(default, dict):
                return bool(default.get("processed") or default.get("raw"))
            return bool(default)
        return any(
            v for v in kit_data.values()
            if v and (isinstance(v, str) or (isinstance(v, dict) and (v.get("processed") or v.get("raw"))))
        )
    return False


def resolve_lineup_member_assets(
    teamreel_assets: dict,
    functional_role: str,
    kit_type: str,
    get_best_url_fn: Any,
    get_ffmpeg_best_url_fn: Any,
    find_best_intro_url_fn: Any,
) -> tuple[str | None, str | None, str | None]:
    """Resolve fullbody, intro, and closeup URLs for a lineup member.

    Checks new ``roles.{role}`` structure first, then falls back to
    legacy flat ``images/videos`` paths.

    Args:
        teamreel_assets: The ``teamreel_assets`` dict from membership metadata.
        functional_role: Functional role string (e.g. ``'keeper'``, ``'player'``).
        kit_type: Kit type to prefer (``'goalkeeper'``, ``'home'``, etc.).
        get_best_url_fn: Function to extract best URL from a variant value.
        get_ffmpeg_best_url_fn: Function to extract FFmpeg-preferred URL.
        find_best_intro_url_fn: Function that finds best intro from variant dict.

    Returns:
        Tuple of (kit_url, intro_url, closeup_url) — any may be None.
    """
    kit_url: str | None = None
    intro_url: str | None = None
    closeup_url: str | None = None

    # Normalise role key: 'goalkeeper'/'doelman' → 'keeper' for the roles dict
    role_key = functional_role
    if role_key in ("goalkeeper", "doelman"):
        role_key = "keeper"

    # ── Try new roles.{role} structure ──
    roles = teamreel_assets.get("roles") or {}
    role_data = roles.get(role_key) or {}

    if role_data:
        # Fullbody
        fb = (role_data.get("images") or {}).get("fullbody") or {}
        fb_val = fb.get(kit_type) or {}
        kit_url = get_best_url_fn(fb_val.get("default") if isinstance(fb_val, dict) else fb_val)
        if not kit_url and kit_type != "home":
            fb_home = fb.get("home") or {}
            kit_url = get_best_url_fn(
                fb_home.get("default") if isinstance(fb_home, dict) else fb_home
            )

        # Intro
        intro_data = (role_data.get("videos") or {}).get("intro") or {}
        # Flatten to old format for _find_best_intro_url compatibility
        flat_intro: dict = {}
        for ik, kit_variants in intro_data.items():
            if isinstance(kit_variants, dict):
                for vk, vv in kit_variants.items():
                    flat_intro[f"{ik}_{vk}" if vk != "default" else ik] = vv
            else:
                flat_intro[ik] = kit_variants
        if flat_intro:
            intro_url = find_best_intro_url_fn(flat_intro, kit_type, get_ffmpeg_best_url_fn)

        # Closeup
        cl = (role_data.get("images") or {}).get("closeup") or {}
        cl_val = cl.get(kit_type) or {}
        closeup_url = get_best_url_fn(cl_val.get("default") if isinstance(cl_val, dict) else cl_val)
        if not closeup_url and kit_type != "home":
            cl_home = cl.get("home") or {}
            closeup_url = get_best_url_fn(
                cl_home.get("default") if isinstance(cl_home, dict) else cl_home
            )

    # ── Fallback: legacy flat images/videos ──
    media = teamreel_assets.get("media") or {}
    images = teamreel_assets.get("images") or {}
    videos = teamreel_assets.get("videos") or {}

    if not kit_url:
        fullbody_dict = images.get("fullbody") or {}
        kit_url = get_best_url_fn(fullbody_dict.get(kit_type))
        if not kit_url and kit_type != "home":
            kit_url = get_best_url_fn(fullbody_dict.get("home"))
        if not kit_url:
            kit_url = (media.get("kit") or {}).get("url")

    if not intro_url:
        intro_variants = videos.get("intro") or {}
        intro_url = find_best_intro_url_fn(intro_variants, kit_type, get_ffmpeg_best_url_fn)
        if not intro_url:
            intro_url = (media.get("intro") or {}).get("url")

    if not closeup_url:
        closeup_dict = images.get("closeup") or {}
        closeup_url = get_best_url_fn(closeup_dict.get(kit_type))
        if not closeup_url and kit_type != "home":
            closeup_url = get_best_url_fn(closeup_dict.get("home"))
        if not closeup_url:
            closeup_url = (media.get("closeup") or {}).get("url")

    return kit_url, intro_url, closeup_url


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
