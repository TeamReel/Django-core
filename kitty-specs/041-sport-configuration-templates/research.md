# Research: B32 Sport Configuration & Templates

**Feature**: 041-sport-configuration-templates
**Date**: 2026-01-30

## Research Tasks Completed

### 1. Project-Sport Relationship Pattern

**Decision**: FK on both Club and Team with inheritance fallback
**Rationale**: Teams within a club can have different disciplines (e.g., Ajax 1 = football 11v11, Ajax Zaal = futsal)
**Alternatives Considered**:
- Organisation-level sport (rejected: too restrictive, bonds are sport-specific but not useful for lookup)
- Club-only FK (rejected: doesn't support multi-discipline clubs)
- Metadata string (rejected: no referential integrity, poor queryability)

**Implementation**:
```python
class Project(models.Model):
    sport = models.ForeignKey('sport_configuration.Sport', null=True, blank=True, on_delete=models.SET_NULL)

    def get_sport(self) -> Optional['Sport']:
        """Return sport with fallback to parent club"""
        if self.sport:
            return self.sport
        if self.parent_project:
            return self.parent_project.sport
        return None
```

### 2. OutfitConfiguration Inheritance Pattern

**Decision**: Club defaults + Team overrides (same pattern as sport)
**Rationale**: DRY - most teams use club colors, some override (youth teams, reserve squads)
**Alternatives Considered**:
- Club-only (rejected: can't handle Jong Ajax needing different kit)
- Team-only (rejected: massive duplication)

**Implementation**:
```python
def get_outfit_for_project(project: Project, outfit_type: str) -> Optional[OutfitConfiguration]:
    """Lookup outfit with fallback to parent club"""
    outfit = OutfitConfiguration.objects.filter(project=project, outfit_type=outfit_type).first()
    if outfit:
        return outfit
    if project.parent_project:
        return OutfitConfiguration.objects.filter(
            project=project.parent_project,
            outfit_type=outfit_type
        ).first()
    return None
```

### 3. Validation Strategy

**Decision**: Warn but allow (non-blocking)
**Rationale**: Real-world flexibility - training sessions, friendly matches may have non-standard lineups
**Alternatives Considered**:
- Block on validation failure (rejected: too restrictive for real-world use)
- Feature flag toggle (rejected: adds complexity without clear benefit)

**Implementation**:
```python
@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[dict]    # {"field": "...", "message": "...", "level": "error"}
    warnings: list[dict]  # {"field": "...", "message": "...", "level": "warning"}
```

### 4. Position Schema Flexibility

**Decision**: Flexible - schema is suggestive, custom positions allowed with warnings
**Rationale**: Clubs use position variations (CDM, CAM, RWB, AMC) not always in standard schemas. Team SIZE is critical; position names are guidance.
**Alternatives Considered**:
- Strict enum (rejected: breaks real-world use cases)
- No validation (rejected: loses useful guidance)

### 5. Sport vs Discipline Modeling

**Decision**: Disciplines are separate Sport records with shared parent metadata
**Rationale**: Football 11v11, Football 7v7, and Futsal have different rules (team sizes, positions)

**Example Sport Records**:
| slug | name | team_size_min | team_size_max | has_goalkeeper |
|------|------|---------------|---------------|----------------|
| `football_11v11` | Football (11v11) | 11 | 11 | true |
| `football_7v7` | Football (7v7) | 7 | 7 | true |
| `futsal` | Futsal | 5 | 5 | true |
| `basketball` | Basketball | 5 | 5 | false |
| `handball` | Handball | 7 | 7 | true |

### 6. Existing Module Integration

**B07 Projects** (DONE):
- Add nullable `sport` FK to Project model
- Property `get_sport()` with parent fallback

**B30 Activities** (DONE):
- Activity gets sport via `activity.project.get_sport()`
- Validation uses sport config for lineup checks

**B31 Content Templates** (DONE):
- Optional `sport` FK on ContentTemplate for filtering
- Templates can be sport-specific or generic (sport=null)

## Best Practices Applied

### Django FK Pattern
- Nullable FK with `SET_NULL` for soft references
- `related_name` for reverse lookups
- `select_related` in querysets for performance

### Service Layer Pattern
- Validation logic in `services/validation.py`
- Lookup logic in `services/outfit_lookup.py`
- Models remain data-focused, services handle business logic

### JSON Field Usage
- `positions` as JSONField (array of strings)
- `colors` as JSONField (object with named colors)
- `metadata` as JSONField (flexible extension point)

## Open Questions (Resolved)

All questions resolved during planning interrogation. No open items.
