# Fase 10: Content Engine Core

## 41. B32 – Sport Configuration & Templates

**Doel**: Sport-specifieke configuratie voor team size, positions, outfit variants en template requirements.

**Waarom agnostisch**: Sport configuration patterns zijn herbruikbaar - team sports, esports, competitive activities.

**Wat moet er gebeuren**:
- **Sport model**: Master data voor sport types
  - Fields: name, slug, federation, is_active
  - Sport types: football, hockey, basketball, handball, volleyball, futsal, etc.
  - Federation metadata: KNVB, NHV, NBB (JSON field)
  - Icon/branding: sport_icon (optional)
- **SportConfiguration model**: Sport-specific settings per sport
  - Fields: sport (FK), team_size_min, team_size_max, positions (JSON array)
  - Team size rules:
    - Football: 11 players (field) + 7 subs = 18 total
    - Handball: 7 players + 7 subs = 14 total
    - Basketball: 5 players + 7 subs = 12 total
    - Futsal: 5 players + 9 subs = 14 total
  - Position schemas per sport (JSON):
    - Football: GK, LB, CB, RB, LM, CM, RM, LW, ST, RW
    - Handball: GK, LW, LB, CB, RB, RW, P
    - Basketball: PG, SG, SF, PF, C
  - Outfit variants: home, away, goalkeeper, third_kit
  - Metadata: rules, formation_defaults (4-3-3, 3-5-2, etc)
- **OutfitConfiguration model**: Sport-specific outfit metadata per project
  - Fields: project (FK), sport (FK), outfit_type, colors (JSON), metadata (JSON)
  - Outfit types: home, away, goalkeeper, training
  - Colors schema:
    - primary_color: "#FF0000"
    - secondary_color: "#FFFFFF"
    - goalkeeper_color: "#00FF00" (different from field)
  - Sponsor positioning: chest, sleeve, back (JSON)
  - Number font: font_family, font_weight, font_color
  - Badge position: left_chest, center_chest
- **SportValidation**: Validation rules voor content templates
  - Validate lineup size against sport rules
  - Validate positions against sport configuration
  - Validate outfit requirements (keeper must have different color)
  - Error messages: "Football requires 11 starting players, found 10"
- **Integration**:
  - B30 (Activities) - Sport determined at Club level (project.metadata->>'sport')
  - B31 (Content Templates) - Templates filtered by sport
  - Projects (B07) - Club inherits sport, teams validate against sport config

**Demo Requirements**:
- 🏃 **Sport Configuration Pages** (`/demo/sport-config/`):
  - **Sport Registry** (`/sports`):
    - List all available sports
    - Sport-specific metadata (team sizes, positions)
    - Create/edit sport configurations
    - Active/inactive toggle
  - **Outfit Designer** (`/outfits`):
    - Configure home/away/goalkeeper outfits per team
    - Color picker for primary/secondary/keeper colors
    - Sponsor position preview
    - Number font selector
    - Save outfit variants
  - **Position Manager** (`/positions`):
    - Define positions per sport
    - Set position abbreviations
    - Configure formation templates (e.g., 4-3-3, 4-4-2)
  - **Validation Preview** (`/validate`):
    - Test lineup against sport rules
    - Show validation errors
    - Preview outfit with metadata
  - **Tests**:
    1. Create Sport: Football (11 players, 10 positions)
    2. Create SportConfiguration with team_size=11, positions=[GK, LB, ...]
    3. Create OutfitConfiguration for Ajax (home: red/white, keeper: green)
    4. Validate lineup: 11 players → Pass
    5. Validate lineup: 10 players → Fail with error
    6. Generate content template using sport configuration
    7. Verify outfit colors in generated content

**Dependencies**:
- B07 (Projects) - DONE (sport in project.metadata)
- B30 (Activities) - Planned (sport determined at club level)
- B31 (Content Templates) - NEW (same fase, sport-aware templates)

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B32-sport-configuration-templates

[feature summary]
Sport-specific configuration for team size, positions, outfit variants and template requirements.

[goals]
- Sport model: Master data for sport types (football, handball, etc)
- SportConfiguration model: Team sizes, positions, outfit variants per sport
- OutfitConfiguration model: Home/away/keeper colors, sponsor position, number fonts
- SportValidation: Validate lineups and content against sport rules
- Integration with B07 (Projects), B30 (Activities), B31 (Content Templates)

[demo requirements]
Demo pages: /demo/sport-config/*
- Sport registry with metadata
- Outfit designer with color picker
- Position manager with formations
- Validation preview with error handling
- Tests: sport → config → outfit → validate → generate content
```

**Notes**:
This module is **CRITICAL for TeamReel multi-sport support** - different sports have different requirements:
- Football: 11 players, specific positions, keeper outfit
- Handball: 7 players, different positions
- Basketball: 5 players, no goalkeeper
- Futsal: 5 players (like basketball), but different positions

Without this, content templates cannot adapt to sport-specific rules.
