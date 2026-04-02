"""Builder for match intro data.

Extracts data-gathering logic from MatchIntroProcessor into a standalone
builder, following the same pattern as LineupSegmentBuilder and
GoalCelebrationBuilder.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class MatchIntroData:
    """All data needed to compose a match intro video."""

    activity_id: str
    match_date: str | None
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    is_home: bool
    venue: str | None
    competition_name: str | None
    brand_primary: str
    brand_secondary: str
    logo_url: str | None
    opponent_logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None


class MatchIntroBuilder:
    """Gather match intro data from the database.

    Usage::

        builder = MatchIntroBuilder(activity_id)
        data = builder.gather_data()
    """

    def __init__(self, activity_id: str) -> None:
        self.activity_id = activity_id

    def gather_data(self) -> MatchIntroData:
        """Query database and return typed MatchIntroData."""
        from src.video.services.brand_resolver import resolve_match_brand_assets

        brand = resolve_match_brand_assets(self.activity_id)

        return MatchIntroData(
            activity_id=brand.activity_id,
            match_date=brand.match_date,
            kickoff_time=brand.kickoff_time,
            own_team_name=brand.own_team_name,
            opponent_name=brand.opponent_name,
            is_home=brand.is_home,
            venue=brand.venue,
            competition_name=brand.competition_name,
            brand_primary=brand.brand_primary,
            brand_secondary=brand.brand_secondary,
            logo_url=brand.logo_url,
            opponent_logo_url=brand.opponent_logo_url,
            sponsor_url=brand.sponsor_url,
            field_background_url=brand.field_background_url,
        )
