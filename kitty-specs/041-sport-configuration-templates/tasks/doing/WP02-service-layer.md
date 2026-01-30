---
work_package_id: "WP02"
subtasks:
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
title: "Service Layer"
phase: "Phase 1 - Foundation"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "28336"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP02 – Service Layer

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Implement `SportValidationService` for rule validation
2. Implement `OutfitLookupService` with inheritance fallback
3. All services have comprehensive type hints
4. Unit tests cover happy path and edge cases
5. Services follow Single Responsibility Principle

**Success Test**: Unit tests pass. Services can be called from Django shell.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Data Model**: See `kitty-specs/041-sport-configuration-templates/data-model.md`
- **Planning Decisions**:
  - CL-1: Validation warns but allows (non-blocking)
  - CL-2: Position schemas are flexible with warnings
  - PL-2: OutfitConfiguration inheritance (Team → Club fallback)
- **Constraints**:
  - Services are pure Python classes (no DRF dependencies)
  - Type hints on all methods
  - Dataclasses for validation results

## Subtasks & Detailed Guidance

### T009 – Create ValidationResult dataclass
- **Purpose**: Typed return structure for validation results
- **Steps**:
  1. Create `src/sport_configuration/services/validation.py`
  2. Define dataclass:
     ```python
     from dataclasses import dataclass, field
     from typing import Optional
     from enum import Enum

     class ValidationLevel(Enum):
         INFO = 'info'
         WARNING = 'warning'
         ERROR = 'error'

     @dataclass
     class ValidationIssue:
         code: str
         message: str
         level: ValidationLevel = ValidationLevel.WARNING
         field: Optional[str] = None
         context: dict = field(default_factory=dict)

     @dataclass
     class ValidationResult:
         is_valid: bool
         issues: list[ValidationIssue] = field(default_factory=list)

         @property
         def has_errors(self) -> bool:
             return any(i.level == ValidationLevel.ERROR for i in self.issues)

         @property
         def has_warnings(self) -> bool:
             return any(i.level == ValidationLevel.WARNING for i in self.issues)

         def add_warning(self, code: str, message: str, **kwargs) -> None:
             self.issues.append(ValidationIssue(code, message, ValidationLevel.WARNING, **kwargs))

         def add_error(self, code: str, message: str, **kwargs) -> None:
             self.issues.append(ValidationIssue(code, message, ValidationLevel.ERROR, **kwargs))
             self.is_valid = False
     ```
- **Files**: `src/sport_configuration/services/validation.py`
- **Parallel?**: Yes

### T010 – Create SportValidationService
- **Purpose**: Validate team compositions and configurations against sport rules
- **Steps**:
  1. In `src/sport_configuration/services/validation.py`:
     ```python
     from typing import Optional, TYPE_CHECKING
     if TYPE_CHECKING:
         from sport_configuration.models import Sport, SportConfiguration
         from projects.models import Project

     class SportValidationService:
         """Validates team/project configurations against sport rules."""

         def validate_team_size(
             self,
             sport_config: 'SportConfiguration',
             player_count: int
         ) -> ValidationResult:
             """Check if player count is within sport limits."""
             result = ValidationResult(is_valid=True)

             if player_count < sport_config.team_size_min:
                 result.add_warning(
                     'TEAM_TOO_SMALL',
                     f'Team has {player_count} players, minimum is {sport_config.team_size_min}',
                     context={'player_count': player_count, 'min': sport_config.team_size_min}
                 )
             elif player_count > sport_config.team_size_max:
                 result.add_warning(
                     'TEAM_TOO_LARGE',
                     f'Team has {player_count} players, maximum is {sport_config.team_size_max}',
                     context={'player_count': player_count, 'max': sport_config.team_size_max}
                 )

             return result

         def validate_positions(
             self,
             sport_config: 'SportConfiguration',
             positions: list[str]
         ) -> ValidationResult:
             """Validate positions against sport's allowed positions."""
             result = ValidationResult(is_valid=True)
             allowed = set(sport_config.positions)

             for pos in positions:
                 if pos not in allowed:
                     result.add_warning(
                         'UNKNOWN_POSITION',
                         f'Position "{pos}" not in standard positions for this sport',
                         field='positions',
                         context={'position': pos, 'allowed': list(allowed)}
                     )

             return result

         def validate_formation(
             self,
             sport_config: 'SportConfiguration',
             formation: str
         ) -> ValidationResult:
             """Validate formation exists in sport configuration."""
             result = ValidationResult(is_valid=True)

             if formation not in sport_config.formations:
                 result.add_warning(
                     'UNKNOWN_FORMATION',
                     f'Formation "{formation}" not defined for this sport',
                     field='formation',
                     context={'formation': formation, 'available': list(sport_config.formations.keys())}
                 )

             return result

         def validate_project(
             self,
             project: 'Project'
         ) -> ValidationResult:
             """Full validation of a project against its sport rules."""
             result = ValidationResult(is_valid=True)

             sport = project.get_sport()
             if not sport:
                 result.add_warning('NO_SPORT', 'Project has no sport assigned')
                 return result

             if not hasattr(sport, 'configuration'):
                 result.add_warning('NO_CONFIG', f'Sport "{sport.name}" has no configuration')
                 return result

             # Add specific validations as needed
             return result
     ```
- **Files**: `src/sport_configuration/services/validation.py`
- **Parallel?**: Yes (after T009)

### T011 – Create OutfitLookupService
- **Purpose**: Retrieve outfit configurations with inheritance fallback
- **Steps**:
  1. Create `src/sport_configuration/services/outfits.py`:
     ```python
     from typing import Optional, TYPE_CHECKING
     if TYPE_CHECKING:
         from sport_configuration.models import OutfitConfiguration
         from projects.models import Project

     class OutfitLookupService:
         """Retrieves outfit configurations with inheritance fallback."""

         def get_outfit(
             self,
             project: 'Project',
             outfit_type: str
         ) -> Optional['OutfitConfiguration']:
             """
             Get outfit config for project, with fallback to parent.

             Lookup order:
             1. Project's own outfit config
             2. Parent project's outfit config
             3. None
             """
             from sport_configuration.models import OutfitConfiguration

             # Try project's own config first
             config = OutfitConfiguration.objects.filter(
                 project=project,
                 outfit_type=outfit_type,
                 is_active=True
             ).first()

             if config:
                 return config

             # Fallback to parent project (Club → Team inheritance)
             if project.parent_project:
                 return self.get_outfit(project.parent_project, outfit_type)

             return None

         def get_all_outfits(
             self,
             project: 'Project'
         ) -> dict[str, 'OutfitConfiguration']:
             """
             Get all outfit configs for project with inheritance.

             Returns dict mapping outfit_type to config.
             Project's own configs override parent's.
             """
             from sport_configuration.models import OutfitConfiguration

             outfits: dict[str, OutfitConfiguration] = {}

             # Start with parent's outfits (if any)
             if project.parent_project:
                 outfits = self.get_all_outfits(project.parent_project)

             # Override with project's own outfits
             project_outfits = OutfitConfiguration.objects.filter(
                 project=project,
                 is_active=True
             )
             for outfit in project_outfits:
                 outfits[outfit.outfit_type] = outfit

             return outfits

         def get_resolved_outfit_data(
             self,
             project: 'Project',
             outfit_type: str
         ) -> dict:
             """Get merged outfit data ready for rendering."""
             outfit = self.get_outfit(project, outfit_type)
             if not outfit:
                 return {}

             return {
                 'outfit_type': outfit.outfit_type,
                 'colors': outfit.colors,
                 'sponsor_config': outfit.sponsor_config,
                 'number_font': outfit.number_font,
                 'badge_position': outfit.badge_position,
                 'source_project': outfit.project_id,
                 'inherited': outfit.project_id != project.id,
             }
     ```
- **Files**: `src/sport_configuration/services/outfits.py`
- **Parallel?**: Yes

### T012 – Create services __init__.py exports
- **Purpose**: Clean import paths for service consumers
- **Steps**:
  1. Update `src/sport_configuration/services/__init__.py`:
     ```python
     from .validation import (
         ValidationLevel,
         ValidationIssue,
         ValidationResult,
         SportValidationService,
     )
     from .outfits import OutfitLookupService

     __all__ = [
         'ValidationLevel',
         'ValidationIssue',
         'ValidationResult',
         'SportValidationService',
         'OutfitLookupService',
     ]
     ```
- **Files**: `src/sport_configuration/services/__init__.py`
- **Parallel?**: No (after T009-T011)

### T013 – Write unit tests for SportValidationService
- **Purpose**: Verify validation logic works correctly
- **Steps**:
  1. Create `tests/sport_configuration/test_validation_service.py`:
     ```python
     import pytest
     from sport_configuration.services import (
         SportValidationService,
         ValidationResult,
         ValidationLevel
     )
     # Test fixtures and cases for:
     # - validate_team_size with valid/too small/too large
     # - validate_positions with valid/unknown positions
     # - validate_formation with valid/unknown
     # - validate_project without sport assignment
     ```
  2. Use pytest fixtures for Sport/SportConfiguration
  3. Cover edge cases: empty lists, null values
- **Files**: `tests/sport_configuration/test_validation_service.py`
- **Parallel?**: Yes (after T010)

### T014 – Write unit tests for OutfitLookupService
- **Purpose**: Verify inheritance fallback logic
- **Steps**:
  1. Create `tests/sport_configuration/test_outfit_service.py`:
     ```python
     import pytest
     from sport_configuration.services import OutfitLookupService
     # Test cases for:
     # - get_outfit returns direct config
     # - get_outfit falls back to parent
     # - get_outfit returns None when no config
     # - get_all_outfits merges parent + child
     # - get_resolved_outfit_data sets inherited flag
     ```
  2. Use pytest fixtures for Club/Team projects with outfits
  3. Test inheritance chain (Team → Club → None)
- **Files**: `tests/sport_configuration/test_outfit_service.py`
- **Parallel?**: Yes (after T011)

## Definition of Done Checklist

- [ ] ValidationResult dataclass with proper typing
- [ ] SportValidationService with 4 validation methods
- [ ] OutfitLookupService with inheritance fallback
- [ ] Clean __init__.py exports
- [ ] Unit tests for SportValidationService (≥80% coverage)
- [ ] Unit tests for OutfitLookupService (≥80% coverage)
- [ ] All tests pass
- [ ] No linting errors (ruff)
- [ ] Type hints on all methods
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify ValidationResult.add_error sets is_valid=False
- Check inheritance fallback handles circular references (if possible)
- Ensure TYPE_CHECKING imports prevent circular dependencies
- Test that warnings don't block operations (CL-1)
- Verify get_all_outfits correctly merges parent and child configs

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-01-30T09:48:26Z – claude – shell_pid=28336 – lane=doing – Started implementation
