"""Shared formation layout for lineup flyer and lineup video.

Single source of truth for player positioning on the 1080×1920 canvas.
Both the flyer generator and the video compositor import from here.

Usage::

    from src.video.services.formation_layout import (
        Y_POS_FLYER,
        Y_POS_COMPOSER,
        get_x_positions,
        get_x_positions_for_group,
        apply_formation_tweaks,
        clamp01,
    )
"""

from __future__ import annotations

from dataclasses import dataclass


def clamp01(v: float) -> float:
    """Clamp a float to [0.0, 1.0]."""
    return max(0.0, min(1.0, v))


# ── Y positions per role (fractions of canvas HEIGHT) ──────────────────────
# Flyer: players positioned between header (~300px) and sponsor zone (~216px).
Y_POS_FLYER: dict[str, float] = {
    "keeper": 0.90,
    "defender": 0.72,
    "midfielder": 0.53,
    "attacker": 0.36,
}

# Composer: players positioned in the field area (header is overlaid separately).
Y_POS_COMPOSER: dict[str, float] = {
    "coach": 0.70,
    "keeper": 0.97,
    "defender": 0.80,
    "midfielder": 0.57,
    "attacker": 0.40,
}


# ── X positions ────────────────────────────────────────────────────────────


def get_x_positions(count: int, *, margin: float | None = None) -> list[float]:
    """Get evenly-spaced X positions (0-1 fractions) for *count* players.

    When *margin* is ``None`` (default), adaptive margins are used —
    tighter for larger groups, wider for duos.  Pass an explicit value
    (e.g. ``margin=0.15``) to use a fixed margin for all group sizes.
    """
    if count == 0:
        return []
    if count == 1:
        return [0.5]
    if count == 4:
        return [0.11, 0.36, 0.64, 0.89]

    if margin is None:
        if count <= 2:
            margin = 0.30
        elif count <= 3:
            margin = 0.18
        else:
            margin = 0.12

    return [margin + i * (1 - 2 * margin) / max(count - 1, 1) for i in range(count)]


def get_x_positions_for_group(
    count: int,
    role: str,
    formation: str,
    *,
    margin: float | None = None,
) -> list[float]:
    """Get X positions with formation-specific overrides."""
    if formation == "4-4-2" and role == "attacker" and count == 2:
        return [0.33, 0.67]
    return get_x_positions(count, margin=margin)


# ── Y stagger (subtle vertical offset for rows of 4) ──────────────────────

ROW4_STAGGER = 0.015


def get_y_stagger_offsets(count: int, amount: float = ROW4_STAGGER) -> list[float]:
    """Return per-player vertical offsets creating a subtle arc for 4-player rows."""
    if count == 4:
        return [-amount, amount, amount, -amount]
    return [0.0] * count


# ── Formation tweaks (per-formation fine-tuning) ───────────────────────────


def apply_formation_tweaks(
    formation: str,
    group_name: str,
    idx: int,
    x: float,
    y: float,
) -> tuple[float, float]:
    """Per-formation position tweaks for visual polish.

    Returns clamped (x, y).
    """
    if formation == "4-3-3":
        if group_name == "keeper":
            y += 0.015
        if group_name == "defenders":
            if idx in (0, 3):
                y -= 0.015
            if idx == 1:
                x -= 0.03
                y += 0.015
            elif idx == 2:
                x += 0.03
                y += 0.015
        if group_name == "midfielders":
            if idx == 0:
                x += 0.075
                y -= 0.015
            elif idx == 2:
                x -= 0.075
                y -= 0.015
            if idx == 1:
                y += 0.015
        if group_name == "attackers":
            y -= 0.025
            if idx == 0:
                x -= 0.020
            elif idx == 2:
                x += 0.020
            if idx == 1:
                y -= 0.010

    elif formation == "4-4-2":
        if group_name == "midfielders":
            if idx in (0, 3):
                y -= 0.02
            if idx in (1, 2):
                y += 0.015
        if group_name == "defenders":
            if idx == 1:
                x -= 0.03
                y += 0.030
            elif idx == 2:
                x += 0.03
                y += 0.030
        if group_name == "attackers":
            y -= 0.025

    elif formation == "3-4-3":
        if group_name == "keeper":
            x += 0.015
        if group_name == "defenders":
            if idx == 0:
                x += 0.05
            elif idx == 2:
                x -= 0.05
            elif idx == 1:
                x += (0.5 - x) * 0.35
                y -= 0.020
                x += 0.020
        if group_name == "attackers":
            if idx == 0:
                x += 0.05
            elif idx == 2:
                x -= 0.05
            elif idx == 1:
                y -= 0.015

    return clamp01(x), clamp01(y)


# ── Player position dataclass ─────────────────────────────────────────────


@dataclass(frozen=True)
class PlayerPosition:
    """Computed position for one player on the canvas."""

    x: float  # 0-1 fraction of canvas width
    y: float  # 0-1 fraction of canvas height


ROLE_MAP: dict[str, str] = {
    "keeper": "keeper",
    "defenders": "defender",
    "midfielders": "midfielder",
    "attackers": "attacker",
    "coach": "coach",
}


def compute_group_positions(
    group_name: str,
    count: int,
    formation: str,
    y_positions: dict[str, float],
    *,
    apply_tweaks: bool = True,
) -> list[PlayerPosition]:
    """Compute (x, y) positions for all players in one formation group.

    Args:
        group_name: Group key (e.g. "defenders", "midfielders").
        count: Number of players in this group.
        formation: Formation string (e.g. "4-3-3").
        y_positions: Y position lookup by role (e.g. Y_POS_FLYER).
        apply_tweaks: Whether to apply per-formation fine-tuning.

    Returns:
        List of PlayerPosition for each player in the group.
    """
    role = ROLE_MAP.get(group_name, "midfielder")
    base_y = y_positions.get(role, 0.5)
    xs = get_x_positions_for_group(count, role, formation)

    positions: list[PlayerPosition] = []
    for idx in range(count):
        x, y = xs[idx], base_y
        if apply_tweaks:
            x, y = apply_formation_tweaks(formation, group_name, idx, x, y)
        positions.append(PlayerPosition(x=x, y=y))
    return positions
