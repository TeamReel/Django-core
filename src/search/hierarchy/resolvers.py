"""Concrete hierarchy resolvers for TeamReel entities.

These resolvers implement the hierarchy navigation for search results,
enabling users to see related entities in a tree structure.

Resolver Hierarchy:
- Organisation → Clubs (root projects)
- Club → Teams (child projects)
- Team → Seasons → Competitions → Matches
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from .base import BaseHierarchyResolver
from .nodes import HierarchyNode

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class OrganisationHierarchyResolver(BaseHierarchyResolver):
    """
    Resolver for Organisation entities.

    Shows clubs (root projects) under an organisation.
    """

    def get_children(self, instance) -> list[HierarchyNode]:
        """Get clubs (root projects) for this organisation."""
        from projects.models import Project

        # Get root projects (clubs) - no parent_project
        clubs = (
            Project.objects.filter(
                organisation=instance,
                parent_project__isnull=True,
                is_active=True,
            )
            .select_related("organisation")
            .order_by("name")[: self._per_level_limit]
        )

        return [
            HierarchyNode(
                id=str(club.id),
                type="club",
                title=club.name,
                url=f"/apps/identity/organisations/{instance.slug}/clubs/{club.slug}",
                description=club.description or None,
                instance=club,
            )
            for club in clubs
        ]


class ProjectHierarchyResolver(BaseHierarchyResolver):
    """
    Resolver for Project entities (clubs and teams).

    For clubs (root projects): Shows teams (child projects)
    For teams (child projects): Shows seasons
    """

    def get_children(self, instance) -> list[HierarchyNode]:
        """Get children based on project type (club vs team)."""
        if instance.parent_project is None:
            # This is a club - show teams
            return self._get_teams(instance)
        else:
            # This is a team - show seasons
            return self._get_seasons(instance)

    def _get_teams(self, club) -> list[HierarchyNode]:
        """Get teams (child projects) for a club."""
        from projects.models import Project

        teams = Project.objects.filter(
            parent_project=club,
            is_active=True,
        ).order_by(
            "name"
        )[: self._per_level_limit]

        org_slug = club.organisation.slug if club.organisation else "unknown"

        return [
            HierarchyNode(
                id=str(team.id),
                type="team",
                title=team.name,
                url=f"/apps/identity/organisations/{org_slug}/clubs/{club.slug}/teams/{team.slug}",
                description=team.description or None,
                instance=team,
            )
            for team in teams
        ]

    def _get_seasons(self, team) -> list[HierarchyNode]:
        """Get seasons (root periods) for a team."""
        from activities.models import Period

        seasons = (
            Period.objects.filter(
                project=team,
                parent_period__isnull=True,  # Root periods = seasons
            )
            .select_related("project")
            .order_by("-start_date")[: self._per_level_limit]
        )

        org_slug = team.organisation.slug if team.organisation else "unknown"
        club_slug = team.parent_project.slug if team.parent_project else "unknown"

        return [
            HierarchyNode(
                id=str(season.id),
                type="season",
                title=season.name,
                url=f"/apps/identity/organisations/{org_slug}/clubs/{club_slug}/teams/{team.slug}/seasons/{season.id}",
                description=None,
                instance=season,
            )
            for season in seasons
        ]


class PeriodHierarchyResolver(BaseHierarchyResolver):
    """
    Resolver for Period entities (seasons and competitions).

    For seasons (root periods): Shows competitions
    For competitions (child periods): Shows matches
    """

    def get_children(self, instance) -> list[HierarchyNode]:
        """Get children based on period type (season vs competition)."""
        if instance.parent_period is None:
            # This is a season - show competitions
            return self._get_competitions(instance)
        else:
            # This is a competition - show matches
            return self._get_matches(instance)

    def _get_competitions(self, season) -> list[HierarchyNode]:
        """Get competitions (child periods) for a season."""
        from activities.models import Period

        competitions = Period.objects.filter(
            parent_period=season,
        ).order_by(
            "name"
        )[: self._per_level_limit]

        # Build URL path
        team = season.project
        org_slug = team.organisation.slug if team and team.organisation else "unknown"
        club_slug = team.parent_project.slug if team and team.parent_project else "unknown"
        team_slug = team.slug if team else "unknown"

        return [
            HierarchyNode(
                id=str(comp.id),
                type="competition",
                title=comp.name,
                url=f"/apps/identity/organisations/{org_slug}/clubs/{club_slug}/teams/{team_slug}/seasons/{season.id}/competitions/{comp.id}",
                description=None,
                instance=comp,
            )
            for comp in competitions
        ]

    def _get_matches(self, competition) -> list[HierarchyNode]:
        """Get matches (activities) for a competition."""
        from activities.models import Activity

        matches = (
            Activity.objects.filter(
                period=competition,
                activity_type="match",
            )
            .select_related("project", "opponent_project")
            .order_by("-start_time")[: self._per_level_limit]
        )

        return [
            HierarchyNode(
                id=str(match.id),
                type="match",
                title=match.title
                or f"{match.project.name if match.project else '?'} vs {match.opponent_project.name if match.opponent_project else '?'}",
                url=f"/apps/match/{match.id}",
                description=None,
                instance=None,  # Don't recurse into matches
            )
            for match in matches
        ]


class ActivityHierarchyResolver(BaseHierarchyResolver):
    """
    Resolver for Activity entities (matches).

    Matches are leaf nodes - no children.
    """

    def get_children(self, instance) -> list[HierarchyNode]:
        """Matches have no children."""
        return []
