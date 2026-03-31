# Data Model: Structured Output Validation

**Feature**: 003-structured-output-validation  
**Date**: 2026-03-31  
**Phase**: Plan (Phase 1)

## Overview

Dit zijn **Pydantic schemas** — geen Django modellen. Ze leven in `src/generative/validation/schemas.py` en definiëren de verwachte structuur van AI-gegenereerde outputs.

## Core Types

### Severity Enum

```python
# src/generative/validation/errors.py
from enum import Enum

class Severity(str, Enum):
    CRITICAL = "critical"   # Must retry or fail
    WARNING = "warning"     # Log, continue with coerced value
    INFO = "info"           # Log only
```

### ValidationError

```python
# src/generative/validation/errors.py
from dataclasses import dataclass

@dataclass
class ValidationError:
    field_path: str          # e.g., "lineup.players[2].position"
    message: str             # Human-readable
    severity: Severity
    raw_value: Any           # Original value
    coerced_value: Any | None  # If coercion succeeded
```

### ValidationResult

```python
# src/generative/validation/validators.py
from dataclasses import dataclass

@dataclass
class ValidationResult:
    success: bool
    data: dict | None            # Validated/coerced data
    errors: list[ValidationError]
    
    @property
    def has_critical(self) -> bool:
        return any(e.severity == Severity.CRITICAL for e in self.errors)
    
    @property
    def warnings(self) -> list[ValidationError]:
        return [e for e in self.errors if e.severity == Severity.WARNING]
```

## Pydantic Schemas

### Base Output Schema

```python
# src/generative/validation/schemas.py
from pydantic import BaseModel, ConfigDict

class OutputSchema(BaseModel):
    """Base class for all output schemas."""
    model_config = ConfigDict(
        extra="ignore",      # INFO: ignore extra fields
        str_strip_whitespace=True,
        coerce_numbers_to_str=False,
    )
```

### Lineup Schema (Primary Use Case)

```python
@register("lineup")
class PlayerSchema(BaseModel):
    """Schema for a single player in a lineup."""
    id: int                          # CRITICAL if missing
    name: str                        # CRITICAL if missing
    number: int | None = None        # Optional
    position: str | None = None      # Optional
    
    # Coordinates for visual placement
    x: float = 0.5                   # Default center
    y: float = 0.5                   # Default center
    scale: float = 1.0               # Default 1:1
    
    @field_validator("x", "y")
    @classmethod
    def validate_coordinates(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError(f"Coordinate must be between 0.0 and 1.0, got {v}")
        return v
    
    @field_validator("scale")
    @classmethod
    def validate_scale(cls, v: float) -> float:
        if not 0.1 <= v <= 3.0:
            raise ValueError(f"Scale must be between 0.1 and 3.0, got {v}")
        return v


@register("lineup")
class LineupSchema(OutputSchema):
    """Schema for complete lineup output."""
    match_title: str
    date: str                        # ISO format date
    home_team: str
    away_team: str
    formation: str                   # e.g., "4-3-3"
    players: list[PlayerSchema]      # Min 11 for full lineup
    
    @field_validator("formation")
    @classmethod
    def validate_formation(cls, v: str) -> str:
        # Validate formation format: X-X-X(-X)
        parts = v.split("-")
        if not (3 <= len(parts) <= 4):
            raise ValueError(f"Formation must have 3-4 parts, got {len(parts)}")
        return v
    
    @model_validator(mode="after")
    def validate_player_count(self) -> "LineupSchema":
        if len(self.players) < 11:
            # WARNING, not critical — partial lineup allowed
            pass
        return self
```

### Gemini Response Schema

```python
@register("gemini_response")
class GeminiCandidateSchema(BaseModel):
    """Schema for Gemini API candidate."""
    content: dict
    finish_reason: str | None = None
    
    @field_validator("content")
    @classmethod
    def validate_content_has_parts(cls, v: dict) -> dict:
        if "parts" not in v or not v["parts"]:
            raise ValueError("Content must have non-empty parts array")
        return v


@register("gemini_response")
class GeminiResponseSchema(OutputSchema):
    """Schema for Gemini API response."""
    candidates: list[GeminiCandidateSchema]
    
    @field_validator("candidates")
    @classmethod
    def validate_has_candidates(cls, v: list) -> list:
        if not v:
            raise ValueError("Response must have at least one candidate")
        return v
```

### Photo Composite Schema

```python
@register("photo_composite")
class PhotoPlacementSchema(BaseModel):
    """Schema for a single photo placement."""
    person_id: int
    x: float
    y: float
    scale: float = 1.0
    rotation: float = 0.0
    
    @field_validator("x", "y")
    @classmethod
    def validate_bounds(cls, v: float) -> float:
        # Allow some overflow for edge placements
        if not -0.5 <= v <= 1.5:
            raise ValueError(f"Position out of reasonable bounds: {v}")
        return v


@register("photo_composite")
class PhotoCompositeSchema(OutputSchema):
    """Schema for photo composite instructions."""
    placements: list[PhotoPlacementSchema]
    background_id: int | None = None
    template_id: int | None = None
```

### MiniMax Status Schema

```python
class MiniMaxStatus(str, Enum):
    """Valid statuses from MiniMax API."""
    SUCCESS = "Success"
    PROCESSING = "Processing"
    FAILED = "Failed"
    QUEUED = "Queueing"


@register("minimax_status")
class MiniMaxStatusSchema(OutputSchema):
    """Schema for MiniMax video status response."""
    status: MiniMaxStatus
    video_url: str | None = None
    duration: float | None = None
    error_message: str | None = None
    
    @model_validator(mode="after")
    def validate_success_has_url(self) -> "MiniMaxStatusSchema":
        if self.status == MiniMaxStatus.SUCCESS and not self.video_url:
            raise ValueError("Successful video must have video_url")
        return self
```

## Type Coercion Rules

Pydantic v2 handles these automatically:

| From | To | Result |
|------|-----|--------|
| `"123"` | `int` | `123` (WARNING) |
| `"45.67"` | `float` | `45.67` (WARNING) |
| `123` | `str` | `"123"` (WARNING) |
| `True` | `int` | `1` (WARNING) |
| `None` | `str` (required) | CRITICAL |
| `"abc"` | `int` | CRITICAL |
| `[1,2,3]` | `dict` | CRITICAL |

## Error Category Extension

```python
# src/generative/tasks.py (modified)
class ErrorCategory(str, Enum):
    PROVIDER_ERROR = "provider_error"
    RATE_LIMIT = "rate_limit"
    CONTENT_POLICY = "content_policy"
    VALIDATION_ERROR = "validation_error"  # NEW
    
    @classmethod
    def from_exception(cls, exc: Exception) -> "ErrorCategory":
        if isinstance(exc, ValidationError):
            return cls.VALIDATION_ERROR
        # ... existing logic
```

## Schema Registry

```python
# src/generative/validation/registry.py
from typing import Type
from pydantic import BaseModel

_registry: dict[str, Type[BaseModel]] = {}

def register(name: str):
    """Decorator to register a schema by name."""
    def decorator(cls: Type[BaseModel]) -> Type[BaseModel]:
        _registry[name] = cls
        return cls
    return decorator

def get_schema(name: str) -> Type[BaseModel]:
    """Get a registered schema by name."""
    if name not in _registry:
        raise KeyError(f"Schema '{name}' not registered")
    return _registry[name]

def list_schemas() -> list[str]:
    """List all registered schema names."""
    return list(_registry.keys())
```

## Relationship to Django Models

| Pydantic Schema | Validates Output From | Stored In |
|-----------------|----------------------|-----------|
| `LineupSchema` | Gemini lineup generation | `GenerationOutput.result_data` |
| `GeminiResponseSchema` | Gemini API response | (intermediate, not stored) |
| `PhotoCompositeSchema` | Gemini photo placement | `GenerationOutput.result_data` |
| `MiniMaxStatusSchema` | MiniMax API polling | (intermediate, not stored) |

**Note**: De Pydantic schemas valideren de JSON *voordat* het in `GenerationOutput.result_data` wordt opgeslagen. Ze hebben geen directe relatie met Django models — ze zijn puur voor validatie van AI output format.
