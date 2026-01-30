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
- **B31 Content Templates** (optional): Templates can be filtered by sport FK

## Seed Data

Load sample sports for development/demo environments:

```bash
# Load/update sport data (idempotent)
python manage.py seed_sports

# Clear and reload
python manage.py seed_sports --clear
```

This creates configurations for:
- Football (11v11)
- Futsal (5v5)
- Handball
- Basketball
- Volleyball
- Rugby Union
- Ice Hockey
- Field Hockey

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

### Using the Validation Service

```python
from sport_configuration.services import SportValidationService
from sport_configuration.models import Sport

sport = Sport.objects.select_related("configuration").get(slug="football-11")
config = sport.configuration
service = SportValidationService()

# Validate team size (returns advisory warnings, not errors)
result = service.validate_team_size(config, player_count=10)
if not result.is_valid:
    for issue in result.issues:
        print(f"[{issue.level}] {issue.message}")  # [warning] Team size 10 is below minimum 11

# Validate positions
result = service.validate_positions(config, positions=["GK", "LB", "CB", "UNKNOWN"])
# Returns warning for UNKNOWN position

# Validate formation
result = service.validate_formation(config, formation="4-3-3")
# Returns valid for known formations
```

### Using the Outfit Lookup Service

```python
from sport_configuration.services import OutfitLookupService
from projects.models import Project

service = OutfitLookupService()
team = Project.objects.get(slug="team-u19")

# Get outfit with inheritance fallback (team → club)
outfit, source = service.get_outfit(team, "home")
if outfit:
    print(f"Colors: {outfit.colors}, Source: {source}")  # source = "inherited" or "own"

# Get all resolved outfits for a project
outfits = service.get_all_outfits(team)
for outfit_type, (outfit, source) in outfits.items():
    print(f"{outfit_type}: {outfit.colors if outfit else 'N/A'} ({source})")
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

### API Examples (curl)

```bash
# List all sports
curl -X GET "http://localhost:8000/api/v1/sports/" \
  -H "Authorization: Bearer <token>"

# Get sport configuration
curl -X GET "http://localhost:8000/api/v1/sports/football-11/configuration/" \
  -H "Authorization: Bearer <token>"

# Validate team size
curl -X POST "http://localhost:8000/api/v1/validation/team-size/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sport_slug": "football-11", "player_count": 10}'

# Response (advisory warning, not blocking error):
# {"is_valid": false, "has_errors": false, "has_warnings": true, "issues": [...]}

# Validate positions
curl -X POST "http://localhost:8000/api/v1/validation/positions/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sport_slug": "football-11", "positions": ["GK", "LB", "CB"]}'

# Create outfit configuration
curl -X POST "http://localhost:8000/api/v1/outfits/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "project": 1,
    "outfit_type": "home",
    "colors": {"primary": "#FF0000", "secondary": "#FFFFFF"}
  }'
```

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
