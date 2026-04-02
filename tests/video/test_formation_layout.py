"""Tests for formation_layout.py — shared player positioning logic."""

from __future__ import annotations

import pytest

from src.video.services.formation_layout import (
    Y_POS_COMPOSER,
    Y_POS_FLYER,
    PlayerPosition,
    apply_formation_tweaks,
    clamp01,
    compute_group_positions,
    get_x_positions,
    get_x_positions_for_group,
    get_y_stagger_offsets,
)


class TestClamp01:
    """Tests for clamp01()."""

    def test_value_in_range(self):
        assert clamp01(0.5) == 0.5

    def test_zero(self):
        assert clamp01(0.0) == 0.0

    def test_one(self):
        assert clamp01(1.0) == 1.0

    def test_negative_clamped(self):
        assert clamp01(-0.5) == 0.0

    def test_above_one_clamped(self):
        assert clamp01(1.5) == 1.0


class TestGetXPositions:
    """Tests for get_x_positions()."""

    def test_zero_players(self):
        assert get_x_positions(0) == []

    def test_one_player_centered(self):
        assert get_x_positions(1) == [0.5]

    def test_two_players_wide_margin(self):
        result = get_x_positions(2)
        assert len(result) == 2
        # Adaptive margin for 2 players is 0.30
        assert result[0] == pytest.approx(0.30)
        assert result[1] == pytest.approx(0.70)

    def test_three_players(self):
        result = get_x_positions(3)
        assert len(result) == 3
        # Adaptive margin for 3 is 0.18
        assert result[0] == pytest.approx(0.18)
        assert result[1] == pytest.approx(0.50)
        assert result[2] == pytest.approx(0.82)

    def test_four_players_hardcoded(self):
        """4 players use hardcoded positions."""
        result = get_x_positions(4)
        assert result == [0.11, 0.36, 0.64, 0.89]

    def test_five_players(self):
        result = get_x_positions(5)
        assert len(result) == 5
        # Adaptive margin for 5 is 0.12
        assert result[0] == pytest.approx(0.12)
        assert result[-1] == pytest.approx(0.88)

    def test_fixed_margin(self):
        """Explicit margin overrides adaptive logic."""
        result = get_x_positions(3, margin=0.15)
        assert len(result) == 3
        assert result[0] == pytest.approx(0.15)
        assert result[1] == pytest.approx(0.50)
        assert result[2] == pytest.approx(0.85)

    def test_positions_symmetric(self):
        """Positions should be symmetric around 0.5."""
        for count in (2, 3, 5):
            result = get_x_positions(count)
            for i in range(count):
                mirror = count - 1 - i
                assert result[i] + result[mirror] == pytest.approx(1.0), (
                    f"count={count} not symmetric: {result}"
                )

    def test_positions_sorted(self):
        """Positions should be left-to-right sorted."""
        for count in range(1, 6):
            result = get_x_positions(count)
            assert result == sorted(result), f"count={count} not sorted"


class TestGetXPositionsForGroup:
    """Tests for get_x_positions_for_group()."""

    def test_442_attacker_override(self):
        """4-4-2 attackers get special centered positions."""
        result = get_x_positions_for_group(2, "attacker", "4-4-2")
        assert result == [0.33, 0.67]

    def test_442_other_roles_normal(self):
        """4-4-2 non-attacker roles use standard positions."""
        result = get_x_positions_for_group(4, "defender", "4-4-2")
        assert result == get_x_positions(4)

    def test_433_falls_through(self):
        """Non-4-4-2 formations use standard get_x_positions."""
        result = get_x_positions_for_group(3, "attacker", "4-3-3")
        assert result == get_x_positions(3)

    def test_margin_passed_through(self):
        """Explicit margin is forwarded to get_x_positions."""
        result = get_x_positions_for_group(3, "midfielder", "4-3-3", margin=0.15)
        assert result == get_x_positions(3, margin=0.15)


class TestGetYStaggerOffsets:
    """Tests for get_y_stagger_offsets()."""

    def test_four_players_stagger(self):
        """4 players get arc-shaped stagger pattern."""
        result = get_y_stagger_offsets(4)
        assert len(result) == 4
        assert result[0] < 0  # outer players up
        assert result[1] > 0  # inner players down
        assert result[2] > 0
        assert result[3] < 0

    def test_four_players_custom_amount(self):
        result = get_y_stagger_offsets(4, amount=0.05)
        assert result == [-0.05, 0.05, 0.05, -0.05]

    def test_non_four_no_stagger(self):
        """Non-4 counts get zero offsets."""
        for count in (1, 2, 3, 5):
            result = get_y_stagger_offsets(count)
            assert result == [0.0] * count


class TestApplyFormationTweaks:
    """Tests for apply_formation_tweaks()."""

    def test_returns_clamped_tuple(self):
        """Result is always clamped to [0, 1]."""
        x, y = apply_formation_tweaks("4-3-3", "keeper", 0, 0.5, 0.97)
        assert 0.0 <= x <= 1.0
        assert 0.0 <= y <= 1.0

    def test_433_keeper_shifted_down(self):
        """4-3-3 keeper gets slight downward shift."""
        _, y = apply_formation_tweaks("4-3-3", "keeper", 0, 0.5, 0.90)
        assert y == pytest.approx(0.90 + 0.015)

    def test_433_defenders_outer_shift(self):
        """4-3-3 outer defenders (idx 0, 3) shift up."""
        _, y0 = apply_formation_tweaks("4-3-3", "defenders", 0, 0.2, 0.80)
        assert y0 == pytest.approx(0.80 - 0.015)
        _, y3 = apply_formation_tweaks("4-3-3", "defenders", 3, 0.8, 0.80)
        assert y3 == pytest.approx(0.80 - 0.015)

    def test_442_attackers_shift(self):
        """4-4-2 attackers shift up."""
        _, y = apply_formation_tweaks("4-4-2", "attackers", 0, 0.33, 0.40)
        assert y == pytest.approx(0.40 - 0.025)

    def test_343_keeper_x_shift(self):
        """3-4-3 keeper gets lateral shift."""
        x, _ = apply_formation_tweaks("3-4-3", "keeper", 0, 0.5, 0.97)
        assert x == pytest.approx(0.5 + 0.015)

    def test_unknown_formation_passthrough(self):
        """Unknown formation returns original values (clamped)."""
        x, y = apply_formation_tweaks("5-3-2", "defenders", 0, 0.3, 0.7)
        assert x == pytest.approx(0.3)
        assert y == pytest.approx(0.7)

    def test_extreme_values_clamped(self):
        """Tweaks near edges don't exceed [0, 1]."""
        x, y = apply_formation_tweaks("4-3-3", "defenders", 0, 0.01, 0.99)
        assert 0.0 <= x <= 1.0
        assert 0.0 <= y <= 1.0


class TestComputeGroupPositions:
    """Tests for compute_group_positions()."""

    def test_returns_player_positions(self):
        """Returns list of PlayerPosition dataclasses."""
        result = compute_group_positions("defenders", 4, "4-3-3", Y_POS_FLYER)
        assert len(result) == 4
        assert all(isinstance(p, PlayerPosition) for p in result)

    def test_correct_count(self):
        for count in (1, 2, 3, 4, 5):
            result = compute_group_positions("midfielders", count, "4-3-3", Y_POS_FLYER)
            assert len(result) == count

    def test_zero_players(self):
        result = compute_group_positions("attackers", 0, "4-3-3", Y_POS_FLYER)
        assert result == []

    def test_y_uses_role_lookup(self):
        """Base Y comes from the y_positions dict via ROLE_MAP."""
        result = compute_group_positions(
            "defenders", 1, "4-3-3", Y_POS_FLYER, apply_tweaks=False
        )
        assert result[0].y == pytest.approx(Y_POS_FLYER["defender"])

    def test_composer_vs_flyer_positions_differ(self):
        """Composer and flyer Y positions are different."""
        flyer = compute_group_positions(
            "defenders", 4, "4-3-3", Y_POS_FLYER, apply_tweaks=False
        )
        composer = compute_group_positions(
            "defenders", 4, "4-3-3", Y_POS_COMPOSER, apply_tweaks=False
        )
        assert flyer[0].y != composer[0].y

    def test_apply_tweaks_false_skips_tweaks(self):
        """Without tweaks, base X/Y are used directly."""
        result = compute_group_positions(
            "keeper", 1, "4-3-3", Y_POS_FLYER, apply_tweaks=False
        )
        assert result[0].x == pytest.approx(0.5)
        assert result[0].y == pytest.approx(Y_POS_FLYER["keeper"])

    def test_apply_tweaks_true_modifies_positions(self):
        """With tweaks enabled, positions are adjusted."""
        no_tweaks = compute_group_positions(
            "defenders", 4, "4-3-3", Y_POS_FLYER, apply_tweaks=False
        )
        with_tweaks = compute_group_positions(
            "defenders", 4, "4-3-3", Y_POS_FLYER, apply_tweaks=True
        )
        # At least one position should differ
        diffs = [
            abs(a.x - b.x) + abs(a.y - b.y) for a, b in zip(no_tweaks, with_tweaks)
        ]
        assert any(d > 0.001 for d in diffs)

    def test_unknown_group_defaults_to_midfielder(self):
        """Unknown group name falls back to midfielder Y position."""
        result = compute_group_positions(
            "unknown_group", 1, "4-3-3", Y_POS_FLYER, apply_tweaks=False
        )
        assert result[0].y == pytest.approx(Y_POS_FLYER["midfielder"])


class TestYPositionDicts:
    """Validate Y_POS_FLYER and Y_POS_COMPOSER dicts."""

    @pytest.mark.parametrize("role", ["keeper", "defender", "midfielder", "attacker"])
    def test_flyer_has_all_roles(self, role: str):
        assert role in Y_POS_FLYER
        assert 0.0 < Y_POS_FLYER[role] < 1.0

    @pytest.mark.parametrize(
        "role", ["keeper", "defender", "midfielder", "attacker", "coach"]
    )
    def test_composer_has_all_roles(self, role: str):
        assert role in Y_POS_COMPOSER
        assert 0.0 < Y_POS_COMPOSER[role] < 1.0

    def test_keeper_behind_defenders(self):
        """Keeper should have higher Y (lower on field) than defenders."""
        assert Y_POS_FLYER["keeper"] > Y_POS_FLYER["defender"]
        assert Y_POS_COMPOSER["keeper"] > Y_POS_COMPOSER["defender"]

    def test_attackers_ahead_of_midfield(self):
        """Attackers should have lower Y (higher on field) than midfielders."""
        assert Y_POS_FLYER["attacker"] < Y_POS_FLYER["midfielder"]
        assert Y_POS_COMPOSER["attacker"] < Y_POS_COMPOSER["midfielder"]
