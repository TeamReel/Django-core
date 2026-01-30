# Sport Configuration

**B32: Sport Configuration & Templates**

Django app providing sport-specific configuration for team sizes, player positions, outfit variants, and template validation rules.

## Purpose

Enables multi-sport support across the platform by providing:

- **Sport definitions**: Football 11v11, Futsal, Handball, Basketball, etc.
- **Team composition rules**: Min/max team sizes, substitute limits
- **Position schemas**: Standard positions per sport (GK, LB, CB, etc.)
- **Formation templates**: 4-3-3, 4-4-2, 3-5-2, etc.
- **Outfit configuration**: Home, Away, Goalkeeper kits with colors and sponsors

## Models

### Sport

Master data for sport types and disciplines.

```python
from sport_configuration.models import Sport

# Create a sport
football = Sport.objects.create(
    name="Football 11v11",
    slug="football-11",
    sport_icon="⚽",
    federation_metadata={"code": "KNVB", "country": "NL"}
)
```

### SportConfiguration

Sport-specific rules (1:1 with Sport).

```python
from sport_configuration.models import SportConfiguration

# Create configuration for the sport
config = SportConfiguration.objects.create(
    sport=football,
    team_size_min=11,
    team_size_max=11,
    max_substitutes=7,
    positions=["GK", "LB", "CB", "RB", "LWB", "RWB", "DM", "CM", "AM", "LM", "RM", "LW", "RW", "CF", "ST"],
    formations={
        "4-3-3": {"positions": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"]},
        "4-4-2": {"positions": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"]},
    },
    outfit_types=["home", "away", "goalkeeper", "third_kit"],
    has_goalkeeper=True,
)
```

### OutfitConfiguration

Outfit styling per project (Club or Team).

```python
from sport_configuration.models import OutfitConfiguration
from projects.models import Project

club = Project.objects.get(slug="fc-example")

# Create home kit configuration
home_kit = OutfitConfiguration.objects.create(
    project=club,
    outfit_type="home",
    colors={
        "primary": "#FF0000",
        "secondary": "#FFFFFF",
        "accent": "#000000"
    },
    sponsor_config={
        "chest": "Main Sponsor",
        "sleeve": "Sleeve Sponsor"
    },
    number_font={
        "family": "Arial",
        "color": "#FFFFFF",
        "outline": "#000000"
    },
    badge_position="left_chest"
)
```

## Integration with Projects

Projects (Clubs and Teams) can be linked to a Sport. Teams inherit the sport from their parent Club if not explicitly set.

```python
from projects.models import Project

# Club with sport assigned
club = Project.objects.get(slug="fc-example")
club.sport = football
club.save()

# Team inherits from parent club
team = Project.objects.get(slug="team-u19", parent_project=club)
team.get_sport()  # Returns football (inherited from club)

# Team can override with different sport
futsal = Sport.objects.get(slug="futsal-5")
team.sport = futsal
team.save()
team.get_sport()  # Returns futsal (team's own)
```

## Key Relationships

```
Sport ──────────┐
     1:1        │
     ▼          │
SportConfiguration    Project ◄──────── OutfitConfiguration
                      (sport FK)         (unique_together: project, outfit_type)
```

## Dependencies

- **B07 Projects**: Sport FK on Project model
- **B30 Activities** (optional): Activity periods can be sport-aware
- **B31 Content Templates** (optional): Templates can be filtered by sport

## Usage Examples

### Get sport for a project

```python
project = Project.objects.get(slug="team-u19")
sport = project.get_sport()  # Uses inheritance fallback
if sport:
    config = sport.configuration
    print(f"Team size: {config.team_size_min}-{config.team_size_max}")
```

### List all sports with their configurations

```python
from sport_configuration.models import Sport

for sport in Sport.objects.filter(is_active=True).select_related("configuration"):
    config = sport.configuration
    print(f"{sport.name}: {config.team_size_max}v{config.team_size_max}")
```

### Get outfit with Club fallback

```python
from sport_configuration.models import OutfitConfiguration

team = Project.objects.get(slug="team-u19")

# First check team's own outfit, then parent club
outfit = OutfitConfiguration.objects.filter(
    project__in=[team, team.parent_project],
    outfit_type="home",
    is_active=True
).order_by("project_id").first()  # Team's own takes precedence if exists
```

## API Endpoints

See `contracts/sport-config-api.yaml` for OpenAPI specification.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/sports/` | GET | List all sports |
| `/api/v1/sports/` | POST | Create sport |
| `/api/v1/sports/{slug}/` | GET | Sport detail with configuration |
| `/api/v1/sports/{slug}/configuration/` | GET/PUT | Sport configuration |
| `/api/v1/outfits/` | GET | List outfit configurations |
| `/api/v1/outfits/` | POST | Create outfit configuration |
| `/api/v1/outfits/resolved/` | GET | Get outfit with inheritance fallback |
| `/api/v1/validation/team-size/` | POST | Validate team size |
| `/api/v1/validation/positions/` | POST | Validate player positions |
| `/api/v1/validation/formation/` | POST | Validate formation |

## Testing

```bash
# Run model tests
pytest tests/sport_configuration/test_models.py -v

# Run all sport_configuration tests
pytest tests/sport_configuration/ -v --cov=sport_configuration
```

## Constitution Compliance

- **Art. I (Product-Agnostic)**: Generic sport configuration, not TeamReel-specific
- **Art. II (Single Responsibility)**: Dedicated app for sport configuration only
- **Art. III (Code Quality)**: Type hints on all model methods
- **Art. IV (Testing)**: ≥90% coverage for models, ≥85% for API
- **Art. VI (Performance)**: Uses `select_related` for sport lookups
- **Art. VII (API Design)**: DRF ViewSets with consistent responses
