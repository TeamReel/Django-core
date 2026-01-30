# Data Model: B32 Sport Configuration & Templates

**Feature**: 041-sport-configuration-templates
**Date**: 2026-01-30

## Entity Relationship Diagram

```
┌─────────────────┐
│      Sport      │
├─────────────────┤
│ id              │
│ name            │
│ slug (unique)   │
│ federation_meta │
│ sport_icon      │
│ is_active       │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ 1:1
         ▼
┌─────────────────────┐
│  SportConfiguration │
├─────────────────────┤
│ id                  │
│ sport (FK, unique)  │
│ team_size_min       │
│ team_size_max       │
│ max_substitutes     │
│ positions (JSON[])  │
│ formations (JSON)   │
│ outfit_types (JSON) │
│ has_goalkeeper      │
│ metadata (JSON)     │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌─────────────────┐         ┌─────────────────────┐
│     Project     │ 1:N     │ OutfitConfiguration │
├─────────────────┤◄────────┤─────────────────────┤
│ id              │         │ id                  │
│ sport (FK,null) │         │ project (FK)        │
│ ...existing...  │         │ outfit_type         │
└─────────────────┘         │ colors (JSON)       │
                            │ sponsor_config(JSON)│
                            │ number_font (JSON)  │
                            │ badge_position      │
                            │ metadata (JSON)     │
                            │ is_active           │
                            │ created_at          │
                            │ updated_at          │
                            └─────────────────────┘
                            unique_together: [project, outfit_type]
```

## Model Definitions

### Sport

**Purpose**: Master data for sport types and disciplines

```python
class Sport(TimestampedModel):
    """Platform-wide sport/discipline definition"""

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    federation_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Federation info, e.g., {'code': 'KNVB', 'country': 'NL'}"
    )
    sport_icon = models.CharField(
        max_length=100,
        blank=True,
        help_text="Icon identifier or emoji, e.g., '⚽' or 'football'"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self) -> str:
        return self.name
```

**Validation Rules**:
- `slug` must be unique (platform-wide)
- `name` required, max 100 chars

### SportConfiguration

**Purpose**: Sport-specific rules for team composition and validation

```python
class SportConfiguration(TimestampedModel):
    """Configuration rules for a specific sport"""

    sport = models.OneToOneField(
        Sport,
        on_delete=models.CASCADE,
        related_name='configuration'
    )
    team_size_min = models.PositiveIntegerField(
        default=1,
        help_text="Minimum players in starting lineup"
    )
    team_size_max = models.PositiveIntegerField(
        default=11,
        help_text="Maximum players in starting lineup"
    )
    max_substitutes = models.PositiveIntegerField(
        default=7,
        help_text="Maximum substitute players"
    )
    positions = models.JSONField(
        default=list,
        help_text="Standard positions, e.g., ['GK', 'LB', 'CB', 'RB', 'CM', 'ST']"
    )
    formations = models.JSONField(
        default=dict,
        help_text="Formation templates, e.g., {'4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', ...]}"
    )
    outfit_types = models.JSONField(
        default=list,
        help_text="Required outfit types, e.g., ['home', 'away', 'goalkeeper', 'trainer']"
    )
    has_goalkeeper = models.BooleanField(
        default=True,
        help_text="Whether this sport has a designated goalkeeper"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional sport-specific rules"
    )

    def __str__(self) -> str:
        return f"Config: {self.sport.name}"
```

**Validation Rules**:
- `team_size_min` <= `team_size_max`
- `positions` must be a list of strings
- `formations` keys must match standard patterns (e.g., "4-3-3")

### OutfitConfiguration

**Purpose**: Outfit styling per project (Club or Team)

```python
class OutfitConfiguration(TimestampedModel):
    """Outfit configuration for a project (club or team)"""

    class OutfitType(models.TextChoices):
        HOME = 'home', 'Home'
        AWAY = 'away', 'Away'
        GOALKEEPER = 'goalkeeper', 'Goalkeeper'
        TRAINER = 'trainer', 'Trainer'
        THIRD_KIT = 'third_kit', 'Third Kit'

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='outfit_configurations'
    )
    outfit_type = models.CharField(
        max_length=20,
        choices=OutfitType.choices
    )
    colors = models.JSONField(
        default=dict,
        help_text="Color scheme: {'primary': '#FF0000', 'secondary': '#FFFFFF', 'accent': '#000000'}"
    )
    sponsor_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Sponsor positioning: {'chest': 'Sponsor A', 'sleeve': 'Sponsor B'}"
    )
    number_font = models.JSONField(
        default=dict,
        blank=True,
        help_text="Number styling: {'family': 'Arial', 'color': '#FFFFFF', 'outline': '#000000'}"
    )
    badge_position = models.CharField(
        max_length=20,
        default='left_chest',
        help_text="Badge placement: left_chest, center_chest, etc."
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional outfit metadata"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['project', 'outfit_type']
        ordering = ['project', 'outfit_type']

    def __str__(self) -> str:
        return f"{self.project.name} - {self.get_outfit_type_display()}"
```

**Validation Rules**:
- `(project, outfit_type)` must be unique
- `colors` should have at least `primary` key
- Goalkeeper outfit should differ from home/away (warning, not error)

### Project (Extension)

**Purpose**: Add sport FK to existing Project model

```python
# In projects/models.py - ADD to existing model

class Project(TimestampedModel):
    # ... existing fields ...

    sport = models.ForeignKey(
        'sport_configuration.Sport',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects',
        help_text="Sport/discipline for this project (inherited by child projects)"
    )

    def get_sport(self) -> Optional['Sport']:
        """Return sport with fallback to parent club"""
        if self.sport:
            return self.sport
        if self.parent_project:
            return self.parent_project.get_sport()
        return None
```

## JSON Field Schemas

### colors (OutfitConfiguration)
```json
{
  "primary": "#FF0000",
  "secondary": "#FFFFFF",
  "accent": "#000000",
  "text": "#FFFFFF"
}
```

### positions (SportConfiguration)
```json
["GK", "LB", "CB", "RB", "LM", "CM", "RM", "LW", "ST", "RW"]
```

### formations (SportConfiguration)
```json
{
  "4-3-3": {
    "positions": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"],
    "layout": [[0], [1,2,3,4], [5,6,7], [8,9,10]]
  },
  "4-4-2": {
    "positions": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
    "layout": [[0], [1,2,3,4], [5,6,7,8], [9,10]]
  }
}
```

### federation_metadata (Sport)
```json
{
  "code": "KNVB",
  "country": "NL",
  "website": "https://www.knvb.nl"
}
```

## Service Interfaces

### SportValidationService

```python
@dataclass
class ValidationIssue:
    field: str
    message: str
    level: Literal['error', 'warning']

@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[ValidationIssue]
    warnings: list[ValidationIssue]

class SportValidationService:
    def validate_lineup(
        self,
        sport_config: SportConfiguration,
        lineup: list[dict]
    ) -> ValidationResult:
        """Validate lineup against sport rules (non-blocking)"""
        ...

    def validate_outfit_contrast(
        self,
        home_outfit: OutfitConfiguration,
        goalkeeper_outfit: Optional[OutfitConfiguration]
    ) -> ValidationResult:
        """Check goalkeeper has different colors than field players"""
        ...
```

### OutfitLookupService

```python
class OutfitLookupService:
    def get_outfit(
        self,
        project: Project,
        outfit_type: str
    ) -> Optional[OutfitConfiguration]:
        """Lookup outfit with fallback to parent club"""
        ...

    def get_all_outfits(
        self,
        project: Project
    ) -> dict[str, OutfitConfiguration]:
        """Get all outfit types for project with fallback"""
        ...
```

## Migration Strategy

1. **Create sport_configuration app** with Sport, SportConfiguration, OutfitConfiguration
2. **Add sport FK to Project** (nullable, no data migration needed)
3. **No seed data in migrations** - loaded separately via management command

## Indexes

```python
# Sport
indexes = [
    models.Index(fields=['slug']),
    models.Index(fields=['is_active']),
]

# OutfitConfiguration
indexes = [
    models.Index(fields=['project', 'outfit_type']),
    models.Index(fields=['is_active']),
]
```
