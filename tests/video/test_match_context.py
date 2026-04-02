"""Tests for resolve_match_context — season/competition name resolution."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from src.video.services.match_context import MatchContext, resolve_match_context


def _make_activity(
    *,
    period_name: str | None = None,
    parent_period_name: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> MagicMock:
    """Build a minimal mock Activity for resolve_match_context."""
    activity = MagicMock()
    activity.id = "00000000-0000-0000-0000-000000000001"
    activity.start_time = datetime(2025, 9, 14, 14, 30)
    activity.metadata = metadata or {}

    # Project
    project = MagicMock()
    project.name = "JO15-1"
    project.parent_project = None
    activity.project = project

    # Opponent
    opponent = MagicMock()
    opponent.name = "Ajax JO15-1"
    opponent.parent_project = None
    activity.opponent_project = opponent

    # Period hierarchy
    if period_name:
        period = MagicMock()
        period.name = period_name
        if parent_period_name:
            parent = MagicMock()
            parent.name = parent_period_name
            period.parent_period = parent
        else:
            period.parent_period = None
        activity.period = period
    else:
        activity.period = None

    return activity


class TestResolveMatchContext:
    """Test season and competition name resolution from Period hierarchy."""

    def test_full_hierarchy_season_and_competition(self):
        """When period has parent, season=parent.name, competition=period.name."""
        activity = _make_activity(
            period_name="Eredivisie",
            parent_period_name="Seizoen 2025/2026",
        )
        ctx = resolve_match_context(activity)

        assert ctx.season_name == "Seizoen 2025/2026"
        assert ctx.competition_name == "Eredivisie"

    def test_flat_period_no_parent(self):
        """When period has no parent, both season and competition = period.name."""
        activity = _make_activity(period_name="Zomercompetitie 2025")
        ctx = resolve_match_context(activity)

        assert ctx.season_name == "Zomercompetitie 2025"
        assert ctx.competition_name == "Zomercompetitie 2025"

    def test_no_period_at_all(self):
        """When activity has no period, both are None."""
        activity = _make_activity()
        ctx = resolve_match_context(activity)

        assert ctx.season_name is None
        assert ctx.competition_name is None

    def test_metadata_overrides_hierarchy(self):
        """Metadata vars take priority over period hierarchy."""
        activity = _make_activity(
            period_name="Eredivisie",
            parent_period_name="Seizoen 2025/2026",
            metadata={
                "teamreel": {
                    "vars": {
                        "competition_name": "KNVB Beker",
                        "season_name": "Seizoen 2024/2025",
                    }
                }
            },
        )
        ctx = resolve_match_context(activity)

        assert ctx.season_name == "Seizoen 2024/2025"
        assert ctx.competition_name == "KNVB Beker"

    def test_partial_metadata_competition_only(self):
        """If only competition_name in metadata, season still comes from hierarchy."""
        activity = _make_activity(
            period_name="Eredivisie",
            parent_period_name="Seizoen 2025/2026",
            metadata={
                "teamreel": {
                    "vars": {
                        "competition_name": "KNVB Beker",
                    }
                }
            },
        )
        ctx = resolve_match_context(activity)

        assert ctx.season_name == "Seizoen 2025/2026"
        assert ctx.competition_name == "KNVB Beker"

    def test_legacy_metadata_competition_name(self):
        """Legacy metadata.competition_name is used as fallback."""
        activity = _make_activity(
            period_name="Eredivisie",
            parent_period_name="Seizoen 2025/2026",
            metadata={"competition_name": "Nacompetitie"},
        )
        ctx = resolve_match_context(activity)

        assert ctx.competition_name == "Nacompetitie"
        # Season still from hierarchy
        assert ctx.season_name == "Seizoen 2025/2026"

    def test_returns_match_context_dataclass(self):
        """Verify return type and other fields are populated."""
        activity = _make_activity(
            period_name="Eredivisie",
            parent_period_name="Seizoen 2025/2026",
        )
        ctx = resolve_match_context(activity)

        assert isinstance(ctx, MatchContext)
        assert ctx.match_date == "14-09-2025"
        assert ctx.kickoff_time == "14:30"
        assert ctx.own_team_name == "JO15-1"
        assert ctx.opponent_name == "Ajax JO15-1"
