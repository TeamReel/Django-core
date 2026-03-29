"""
Validation service for sport configurations.

Provides validation of team compositions, positions, and formations
against sport-specific rules. Follows CL-1 principle: warnings don't block.
"""

from __future__ import annotations

from dataclasses import dataclass
from dataclasses import field as dataclass_field
from enum import Enum
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from projects.models import Project
    from sport_configuration.models import SportConfiguration


class ValidationLevel(Enum):
    """Severity level for validation issues."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class ValidationIssue:
    """Individual validation issue with context."""

    code: str
    message: str
    level: ValidationLevel = ValidationLevel.WARNING
    field_name: Optional[str] = None
    context: dict = dataclass_field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "code": self.code,
            "message": self.message,
            "level": self.level.value,
            "field": self.field_name,
            "context": self.context,
        }


@dataclass
class ValidationResult:
    """Result of validation with issues collection."""

    is_valid: bool = True
    issues: list[ValidationIssue] = dataclass_field(default_factory=list)

    @property
    def has_errors(self) -> bool:
        """Check if any error-level issues exist."""
        return any(i.level == ValidationLevel.ERROR for i in self.issues)

    @property
    def has_warnings(self) -> bool:
        """Check if any warning-level issues exist."""
        return any(i.level == ValidationLevel.WARNING for i in self.issues)

    @property
    def warnings(self) -> list[ValidationIssue]:
        """Get all warning-level issues."""
        return [i for i in self.issues if i.level == ValidationLevel.WARNING]

    @property
    def errors(self) -> list[ValidationIssue]:
        """Get all error-level issues."""
        return [i for i in self.issues if i.level == ValidationLevel.ERROR]

    def add_info(
        self,
        code: str,
        message: str,
        field: Optional[str] = None,
        context: Optional[dict] = None,
    ) -> None:
        """Add an informational issue."""
        self.issues.append(
            ValidationIssue(code, message, ValidationLevel.INFO, field, context or {})
        )

    def add_warning(
        self,
        code: str,
        message: str,
        field: Optional[str] = None,
        context: Optional[dict] = None,
    ) -> None:
        """Add a warning issue (does not affect is_valid per CL-1)."""
        self.issues.append(
            ValidationIssue(code, message, ValidationLevel.WARNING, field, context or {})
        )

    def add_error(
        self,
        code: str,
        message: str,
        field: Optional[str] = None,
        context: Optional[dict] = None,
    ) -> None:
        """Add an error issue and set is_valid to False."""
        self.issues.append(
            ValidationIssue(code, message, ValidationLevel.ERROR, field, context or {})
        )
        self.is_valid = False

    def merge(self, other: "ValidationResult") -> None:
        """Merge another ValidationResult into this one."""
        self.issues.extend(other.issues)
        if not other.is_valid:
            self.is_valid = False

    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "is_valid": self.is_valid,
            "has_errors": self.has_errors,
            "has_warnings": self.has_warnings,
            "issues": [i.to_dict() for i in self.issues],
        }


class SportValidationService:
    """
    Validates team/project configurations against sport rules.

    All validation methods return ValidationResult with warnings.
    Per CL-1: Warnings inform but do not block operations.
    """

    def validate_team_size(
        self,
        sport_config: "SportConfiguration",
        player_count: int,
    ) -> ValidationResult:
        """
        Check if player count is within sport limits.

        Args:
            sport_config: SportConfiguration with team size constraints
            player_count: Actual number of players

        Returns:
            ValidationResult with warnings if out of range
        """
        result = ValidationResult(is_valid=True)

        if player_count < sport_config.team_size_min:
            result.add_warning(
                "TEAM_TOO_SMALL",
                f"Team has {player_count} players, minimum is {sport_config.team_size_min}",
                field="player_count",
                context={
                    "player_count": player_count,
                    "min": sport_config.team_size_min,
                },
            )
        elif player_count > sport_config.team_size_max:
            result.add_warning(
                "TEAM_TOO_LARGE",
                f"Team has {player_count} players, maximum is {sport_config.team_size_max}",
                field="player_count",
                context={
                    "player_count": player_count,
                    "max": sport_config.team_size_max,
                },
            )

        return result

    def validate_positions(
        self,
        sport_config: "SportConfiguration",
        positions: list[str],
    ) -> ValidationResult:
        """
        Validate positions against sport's allowed positions.

        Args:
            sport_config: SportConfiguration with positions list
            positions: List of position codes to validate

        Returns:
            ValidationResult with warnings for unknown positions
        """
        result = ValidationResult(is_valid=True)

        if not sport_config.positions:
            return result

        allowed = set(sport_config.positions)

        for pos in positions:
            if pos not in allowed:
                result.add_warning(
                    "UNKNOWN_POSITION",
                    f'Position "{pos}" not in standard positions for this sport',
                    field="positions",
                    context={"position": pos, "allowed": list(allowed)},
                )

        return result

    def validate_formation(
        self,
        sport_config: "SportConfiguration",
        formation: str,
    ) -> ValidationResult:
        """
        Validate formation exists in sport configuration.

        Args:
            sport_config: SportConfiguration with formations dict
            formation: Formation code to validate (e.g., "4-3-3")

        Returns:
            ValidationResult with warning if formation unknown
        """
        result = ValidationResult(is_valid=True)

        if not sport_config.formations:
            return result

        if formation not in sport_config.formations:
            result.add_warning(
                "UNKNOWN_FORMATION",
                f'Formation "{formation}" not defined for this sport',
                field="formation",
                context={
                    "formation": formation,
                    "available": list(sport_config.formations.keys()),
                },
            )

        return result

    def validate_project(
        self,
        project: "Project",
    ) -> ValidationResult:
        """
        Full validation of a project against its sport rules.

        Args:
            project: Project to validate

        Returns:
            ValidationResult with warnings if no sport or configuration
        """
        result = ValidationResult(is_valid=True)

        sport = project.get_sport()
        if not sport:
            result.add_warning(
                "NO_SPORT",
                "Project has no sport assigned",
                field="sport",
            )
            return result

        if not hasattr(sport, "configuration"):
            result.add_warning(
                "NO_CONFIG",
                f'Sport "{sport.name}" has no configuration',
                field="sport",
                context={"sport_name": sport.name, "sport_slug": sport.slug},
            )
            return result

        # Additional validations can be added here as needed
        return result

    def validate_all(
        self,
        project: "Project",
        player_count: Optional[int] = None,
        positions: Optional[list[str]] = None,
        formation: Optional[str] = None,
    ) -> ValidationResult:
        """
        Run all applicable validations for a project.

        Args:
            project: Project to validate
            player_count: Optional player count to validate
            positions: Optional positions list to validate
            formation: Optional formation to validate

        Returns:
            ValidationResult with all issues merged
        """
        result = self.validate_project(project)

        sport = project.get_sport()
        if not sport or not hasattr(sport, "configuration"):
            return result

        config = sport.configuration

        if player_count is not None:
            result.merge(self.validate_team_size(config, player_count))

        if positions is not None:
            result.merge(self.validate_positions(config, positions))

        if formation is not None:
            result.merge(self.validate_formation(config, formation))

        return result
