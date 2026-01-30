# Quickstart: B32 Sport Configuration & Templates

**Feature**: 041-sport-configuration-templates
**Date**: 2026-01-30

## Overview

This module provides sport-specific configuration for team sizes, player positions, and outfit variants. It integrates with Projects (B07), Activities (B30), and Content Templates (B31).

## Key Concepts

### Sport Hierarchy

```
Sport (platform-wide)
  └── SportConfiguration (1:1 with Sport)
        ├── team_size_min/max
        ├── positions[]
        ├── formations{}
        └── has_goalkeeper

Project (Club)
  ├── sport FK → Sport
  └── OutfitConfiguration[] (home, away, keeper, trainer)
      └── Team inherits or overrides
```

### Inheritance Pattern

1. **Sport**: Club sets sport, Team can override (e.g., Ajax Zaal = Futsal)
2. **Outfits**: Club defines defaults, Team can override specific outfits

## Quick Examples

### 1. Create a Sport with Configuration

```python
from sport_configuration.models import Sport, SportConfiguration

# Create sport
football = Sport.objects.create(
    name="Football (11v11)",
    slug="football_11v11",
    sport_icon="⚽",
    federation_metadata={"code": "KNVB", "country": "NL"}
)

# Create configuration
SportConfiguration.objects.create(
    sport=football,
    team_size_min=11,
    team_size_max=11,
    max_substitutes=7,
    positions=["GK", "LB", "CB", "RB", "LM", "CM", "RM", "LW", "ST", "RW"],
    has_goalkeeper=True,
    outfit_types=["home", "away", "goalkeeper", "trainer"]
)
```

### 2. Assign Sport to Club/Team

```python
from projects.models import Project
from sport_configuration.models import Sport

# Club level
ajax = Project.objects.get(name="Ajax")
ajax.sport = Sport.objects.get(slug="football_11v11")
ajax.save()

# Team override (different discipline)
ajax_zaal = Project.objects.get(name="Ajax Zaal", parent_project=ajax)
ajax_zaal.sport = Sport.objects.get(slug="futsal")
ajax_zaal.save()

# Team without override (inherits from club)
ajax_1 = Project.objects.get(name="Ajax 1", parent_project=ajax)
print(ajax_1.get_sport())  # Returns Football (11v11) via inheritance
```

### 3. Configure Outfits

```python
from sport_configuration.models import OutfitConfiguration

# Club default (applies to all teams)
OutfitConfiguration.objects.create(
    project=ajax,
    outfit_type='home',
    colors={
        "primary": "#CF0032",  # Ajax red
        "secondary": "#FFFFFF",
        "accent": "#000000"
    }
)

# Team override (youth team has different sponsor)
OutfitConfiguration.objects.create(
    project=jong_ajax,
    outfit_type='home',
    colors={
        "primary": "#CF0032",
        "secondary": "#FFFFFF"
    },
    sponsor_config={
        "chest": "Youth Academy Sponsor"
    }
)
```

### 4. Lookup Outfit with Fallback

```python
from sport_configuration.services.outfits import OutfitLookupService

service = OutfitLookupService()

# Get outfit for team (returns own or inherited from club)
outfit = service.get_outfit(ajax_1, 'home')
if outfit:
    print(outfit.colors)  # Ajax club colors

# Get all outfits with inheritance
all_outfits = service.get_all_outfits(ajax_1)
# Returns: {'home': <OutfitConfig>, 'away': <OutfitConfig>, ...}
# Team's own configs override parent club's (child wins)

# Get resolved outfit data for API (includes source info)
resolved = service.get_resolved_outfit_data(ajax_1, 'home')
# Returns: {'outfit_type': 'home', 'colors': {...}, 'source': 'inherited', ...}
```

### 5. Validate Team Composition

```python
from sport_configuration.services.validation import SportValidationService
from sport_configuration.models import SportConfiguration

service = SportValidationService()
sport_config = SportConfiguration.objects.get(sport__slug='football_11v11')

# Validate team size (advisory warnings, not blocking per CL-1)
result = service.validate_team_size(sport_config, player_count=10)

if result.is_valid:
    print("✅ Validation passed")
else:
    for issue in result.errors:
        print(f"❌ {issue.field_name}: {issue.message}")

# Check for advisory warnings (team below minimum)
for warning in result.warnings:
    print(f"⚠️ {warning.code}: {warning.message}")
# "⚠️ TEAM_TOO_SMALL: Team has 10 players, minimum is 11"

# Validate positions
positions_result = service.validate_positions(
    sport_config,
    positions=["GK", "LB", "CB", "UNKNOWN"]
)
# Returns warning for UNKNOWN position

# Validate formation
formation_result = service.validate_formation(sport_config, "4-3-3")
# Returns is_valid=True for known formations
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/sports/` | List all sports |
| GET | `/api/v1/sports/{slug}/` | Get sport with config |
| GET | `/api/v1/sports/{slug}/configuration/` | Get sport configuration |
| GET | `/api/v1/outfits/` | List outfit configurations |
| POST | `/api/v1/outfits/` | Create outfit configuration |
| GET | `/api/v1/outfits/resolved/` | Get outfit with inheritance |
| POST | `/api/v1/validation/team-size/` | Validate team size |
| POST | `/api/v1/validation/positions/` | Validate positions |
| POST | `/api/v1/validation/formation/` | Validate formation |
| POST | `/api/v1/validation/project/` | Validate project configuration |

See [contracts/sport-config-api.yaml](contracts/sport-config-api.yaml) for full OpenAPI spec.

## Management Commands

```bash
# Load seed data (idempotent - safe to run multiple times)
python manage.py seed_sports

# Clear and reload seed data
python manage.py seed_sports --clear
```

## Demo Pages

| Page | URL | Purpose |
|------|-----|---------|
| Sports Registry | `/demo/sport-config/sports` | Browse/manage sports |
| Outfit Designer | `/demo/sport-config/outfits` | Configure outfit colors |
| Position Manager | `/demo/sport-config/positions` | Edit positions per sport |
| Validation Preview | `/demo/sport-config/validate` | Test lineup validation |

## Testing

```bash
# Run all sport_configuration tests
pytest tests/sport_configuration/ -v

# Run specific test file
pytest tests/sport_configuration/test_validation_service.py -v

# With coverage
pytest tests/sport_configuration/ --cov=src/sport_configuration --cov-report=html
```

## Related Modules

- **B07 Projects**: Sport FK added to Project model
- **B30 Activities**: Uses `project.get_sport()` for lineup validation
- **B31 Content Templates**: Optional sport FK for filtering templates
