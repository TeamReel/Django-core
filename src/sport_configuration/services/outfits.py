"""
Outfit lookup service with inheritance fallback.

Implements PL-2: OutfitConfiguration inheritance where Teams
can inherit outfit configurations from their parent Club.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from projects.models import Project
    from sport_configuration.models import OutfitConfiguration


class OutfitLookupService:
    """
    Retrieves outfit configurations with inheritance fallback.

    Lookup order (PL-2):
    1. Project's own outfit config
    2. Parent project's outfit config (recursive)
    3. None
    """

    def get_outfit(
        self,
        project: "Project",
        outfit_type: str,
    ) -> Optional["OutfitConfiguration"]:
        """
        Get outfit config for project, with fallback to parent.

        Args:
            project: Project to look up outfit for
            outfit_type: Type of outfit (home, away, third, goalkeeper, trainer)

        Returns:
            OutfitConfiguration or None if not found at any level
        """
        from sport_configuration.models import OutfitConfiguration

        # Try project's own config first
        config = OutfitConfiguration.objects.filter(
            project=project,
            outfit_type=outfit_type,
            is_active=True,
        ).first()

        if config:
            return config

        # Fallback to parent project (Club → Team inheritance)
        if project.parent_project_id:
            return self.get_outfit(project.parent_project, outfit_type)

        return None

    def get_all_outfits(
        self,
        project: "Project",
    ) -> dict[str, "OutfitConfiguration"]:
        """
        Get all outfit configs for project with inheritance.

        Returns dict mapping outfit_type to config.
        Project's own configs override parent's (child wins).

        Args:
            project: Project to look up outfits for

        Returns:
            Dict mapping outfit_type string to OutfitConfiguration
        """
        from sport_configuration.models import OutfitConfiguration

        outfits: dict[str, OutfitConfiguration] = {}

        # Start with parent's outfits (if any)
        if project.parent_project_id:
            outfits = self.get_all_outfits(project.parent_project)

        # Override with project's own outfits (child configs take precedence)
        project_outfits = OutfitConfiguration.objects.filter(
            project=project,
            is_active=True,
        )
        for outfit in project_outfits:
            outfits[outfit.outfit_type] = outfit

        return outfits

    def get_resolved_outfit_data(
        self,
        project: "Project",
        outfit_type: str,
    ) -> dict:
        """
        Get merged outfit data ready for rendering.

        Includes metadata about whether config was inherited.

        Args:
            project: Project to look up outfit for
            outfit_type: Type of outfit to retrieve

        Returns:
            Dict with outfit data and inheritance info, or empty dict
        """
        outfit = self.get_outfit(project, outfit_type)
        if not outfit:
            return {}

        return {
            "outfit_type": outfit.outfit_type,
            "colors": outfit.colors,
            "sponsor_config": outfit.sponsor_config,
            "number_font": outfit.number_font,
            "badge_position": outfit.badge_position,
            "source_project_id": outfit.project_id,
            "inherited": outfit.project_id != project.id,
        }

    def get_all_resolved_outfits(
        self,
        project: "Project",
    ) -> dict[str, dict]:
        """
        Get all resolved outfit data for a project.

        Args:
            project: Project to look up outfits for

        Returns:
            Dict mapping outfit_type to resolved outfit data
        """
        outfits = self.get_all_outfits(project)
        return {
            outfit_type: {
                "outfit_type": config.outfit_type,
                "colors": config.colors,
                "sponsor_config": config.sponsor_config,
                "number_font": config.number_font,
                "badge_position": config.badge_position,
                "source_project_id": config.project_id,
                "inherited": config.project_id != project.id,
            }
            for outfit_type, config in outfits.items()
        }

    def has_outfit(
        self,
        project: "Project",
        outfit_type: str,
    ) -> bool:
        """
        Check if outfit config exists (own or inherited).

        Args:
            project: Project to check
            outfit_type: Type of outfit to check for

        Returns:
            True if outfit exists at any level
        """
        return self.get_outfit(project, outfit_type) is not None

    def get_missing_outfit_types(
        self,
        project: "Project",
        required_types: Optional[list[str]] = None,
    ) -> list[str]:
        """
        Get list of required outfit types not configured.

        Args:
            project: Project to check
            required_types: List of required outfit types. If None, uses
                           default types from sport configuration.

        Returns:
            List of missing outfit type codes
        """
        if required_types is None:
            # Try to get from sport configuration
            sport = project.get_sport()
            if sport and hasattr(sport, "configuration") and sport.configuration:
                required_types = sport.configuration.outfit_types or []
            else:
                required_types = []

        available = set(self.get_all_outfits(project).keys())
        return [t for t in required_types if t not in available]
