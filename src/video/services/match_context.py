"""Shared match context resolution for video services.

Centralises the match-info extraction pattern (team names, date, kickoff,
venue, competition, score) that was duplicated across lineup_builder,
goal_celebration_builder, and match_flyer_generator.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MatchContext:
    """Resolved match information from an Activity."""

    activity_id: str
    match_date: str  # DD-MM-YYYY or ""
    kickoff_time: str | None  # HH:MM or None
    own_team_name: str  # project.name (team level)
    own_club_name: str | None  # parent_project.name (club level)
    opponent_name: str  # opponent_project.name or metadata fallback
    opponent_club_name: str | None  # opponent parent_project.name
    is_home: bool
    venue: str | None
    season_name: str | None
    competition_name: str | None
    score_home: int | None
    score_away: int | None


def resolve_match_context(activity: Any) -> MatchContext:
    """Extract match context from an Activity instance.

    The activity should be fetched with select_related for
    ``project__parent_project``, ``opponent_project__parent_project``,
    ``period``, and ``period__parent_period``.
    """
    project = activity.project
    meta = activity.metadata or {}

    # ── Dates ──
    match_date = activity.start_time.strftime("%d-%m-%Y") if activity.start_time else ""
    kickoff_time = activity.start_time.strftime("%H:%M") if activity.start_time else None

    # ── Team names ──
    own_team_name = project.name or ""
    club_project = getattr(project, "parent_project", None)
    own_club_name = club_project.name if club_project else None

    opponent_project = getattr(activity, "opponent_project", None)
    if opponent_project:
        opponent_name = opponent_project.name or ""
        opp_club = getattr(opponent_project, "parent_project", None)
        opponent_club_name = opp_club.name if opp_club else None
    else:
        opponent_name = (
            meta.get("teamreel", {}).get("vars", {}).get("away_team_name")
            or meta.get("teamreel", {}).get("vars", {}).get("home_team_name")
            or getattr(activity, "opponent", None)
            or ""
        )
        opponent_club_name = None

    # ── Home / away ──
    is_home = meta.get("is_home", meta.get("venue", "Home") == "Home")

    # ── Score ──
    score_meta = meta.get("score", {})
    score_home = score_meta.get("home") if isinstance(score_meta, dict) else None
    score_away = score_meta.get("away") if isinstance(score_meta, dict) else None

    # ── Venue ──
    # Prefer the actual location field or teamreel match_location
    # over metadata.venue which is just a generic "Home"/"Away" label.
    raw_venue = (
        getattr(activity, "location", None)
        or meta.get("teamreel", {}).get("vars", {}).get("match_location")
        or meta.get("teamreel", {}).get("match_context", {}).get("location")
        or meta.get("teamreel", {}).get("match_context", {}).get("home_club_default_location")
        or meta.get("venue")
    )
    venue = (
        None
        if raw_venue and str(raw_venue).strip().lower() in ("home", "away", "thuis", "uit", "")
        else raw_venue
    )

    # ── Season / competition ──
    # Walk the Period hierarchy: Activity → Competition → Season.
    # activity.period is typically the competition; its parent_period is the season.
    period = activity.period
    parent = getattr(period, "parent_period", None) if period else None

    # Metadata overrides (set by frontend)
    meta_season = meta.get("teamreel", {}).get("vars", {}).get("season_name")
    meta_competition = (
        meta.get("teamreel", {}).get("vars", {}).get("competition_name")
        or meta.get("competition_name")
    )

    if meta_season:
        season_name = meta_season
    elif parent:
        season_name = parent.name
    elif period:
        season_name = period.name
    else:
        season_name = None

    if meta_competition:
        competition_name = meta_competition
    elif period and parent:
        # period is the competition (has a parent season)
        competition_name = period.name
    elif period:
        # period is top-level (no parent) — use it as competition too
        competition_name = period.name
    else:
        competition_name = None

    return MatchContext(
        activity_id=str(activity.id),
        match_date=match_date,
        kickoff_time=kickoff_time,
        own_team_name=own_team_name,
        own_club_name=own_club_name,
        opponent_name=opponent_name,
        opponent_club_name=opponent_club_name,
        is_home=is_home,
        venue=venue,
        season_name=season_name,
        competition_name=competition_name,
        score_home=score_home,
        score_away=score_away,
    )
