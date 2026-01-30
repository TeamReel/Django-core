# Feature Specification: Sport Configuration & Templates

**Feature Branch**: `041-sport-configuration-templates`
**Created**: 2026-01-30
**Status**: Planning Complete
**Module**: B32

## Overview

Sport-specific configuration for team sizes, player positions, outfit variants, and template validation rules. Provides master data that enables multi-sport support across TeamReel, ensuring content templates adapt correctly to different sports and disciplines (football 11v11, football 7v7, futsal, handball, basketball, etc.).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Sport Registry (Priority: P1)

As a platform administrator, I want to browse available sports with their configurations, so that I can see what sports are supported and their specific rules.

**Why this priority**: Foundation for all other functionality - without sports defined, nothing else works.

**Independent Test**: Can be fully tested by calling the sports API and verifying the list returns with correct metadata.

**Acceptance Scenarios**:

1. **Given** sports exist in the system, **When** I request the sports list, **Then** I see all sports with name, slug, and active status
2. **Given** I am viewing a sport, **When** I check its configuration, **Then** I see team_size_min, team_size_max, and position list
3. **Given** multiple sports exist, **When** I filter by is_active=true, **Then** I only see active sports

---

### User Story 2 - Configure Team Outfits (Priority: P2)

As a club administrator, I want to configure outfit variants (home, away, goalkeeper, trainer) for my team, so that content generation uses the correct colors and styling.

**Why this priority**: Outfits are essential for visual content generation - directly impacts content quality.

**Independent Test**: Can be tested by creating outfit configurations and verifying they are retrievable and linked to the correct project.

**Acceptance Scenarios**:

1. **Given** I have a team project, **When** I create a home outfit configuration, **Then** it saves with primary_color, secondary_color, and links to my project
2. **Given** a sport requires goalkeeper, **When** I configure goalkeeper outfit, **Then** it must have a different color than field players
3. **Given** I configure trainer outfit, **When** I save, **Then** it stores separately from player outfits
4. **Given** I have outfit configurations, **When** I list them, **Then** I see all outfit types (home, away, goalkeeper, trainer) for my team

---

### User Story 3 - Validate Lineup Against Sport Rules (Priority: P2)

As a content creator, I want the system to validate my lineup against sport-specific rules, so that I don't generate content with invalid player counts or positions.

**Why this priority**: Prevents broken content - critical for professional output quality.

**Independent Test**: Can be tested by submitting lineups with correct/incorrect player counts and verifying validation responses.

**Acceptance Scenarios**:

1. **Given** football requires 11 starting players, **When** I submit a lineup with 11 players, **Then** validation passes
2. **Given** football requires 11 starting players, **When** I submit a lineup with 10 players, **Then** validation fails with message "Football requires 11 starting players, found 10"
3. **Given** handball has 7 field positions, **When** I submit a lineup with invalid positions, **Then** validation fails listing invalid positions
4. **Given** a sport has goalkeeper position, **When** lineup has no goalkeeper, **Then** validation warns about missing required position

---

### User Story 4 - Filter Content Templates by Sport (Priority: P3)

As a content creator, I want content templates filtered by sport type, so that I only see templates relevant to my team's sport.

**Why this priority**: Improves UX by reducing irrelevant options - depends on B31 integration.

**Independent Test**: Can be tested by requesting templates with sport filter and verifying correct filtering.

**Acceptance Scenarios**:

1. **Given** templates exist for football and handball, **When** I filter by sport=football, **Then** I only see football templates
2. **Given** a template has sport=null (universal), **When** I filter by any sport, **Then** universal templates are included
3. **Given** B31 ContentTemplate model, **When** sport field is added, **Then** existing templates default to null (all sports)

---

### User Story 5 - Manage Position Schemas (Priority: P3)

As a platform administrator, I want to define position schemas per sport, so that lineup validation uses correct positions.

**Why this priority**: Enables accurate position validation - foundational for lineup features.

**Independent Test**: Can be tested by creating/editing position lists and verifying they persist correctly.

**Acceptance Scenarios**:

1. **Given** football sport, **When** I view positions, **Then** I see GK, LB, CB, RB, LM, CM, RM, LW, ST, RW
2. **Given** basketball sport, **When** I view positions, **Then** I see PG, SG, SF, PF, C (no goalkeeper)
3. **Given** a sport configuration, **When** I update positions array, **Then** validation uses new positions

---

## Functional Requirements *(mandatory)*

### FR-1: Sport Master Data
- System shall store sports with: name, slug, federation_metadata (JSON), is_active, sport_icon (optional)
- Sports are system-wide (not per-organisation)
- Each sport has exactly one SportConfiguration

### FR-2: Sport Configuration
- System shall store per-sport: team_size_min, team_size_max, max_substitutes
- System shall store positions as JSON array with abbreviation and full name
- System shall store formation_defaults (e.g., "4-3-3", "4-4-2")
- System shall store outfit_types applicable to the sport (e.g., goalkeeper only for sports with GK position)

### FR-3: Outfit Configuration
- System shall store outfit configurations per project (team)
- Outfit types: home, away, goalkeeper, trainer, third_kit
- Colors schema: primary_color, secondary_color, accent_color (hex values)
- Optional metadata: sponsor_positions, number_font, badge_position
- Sport-level defaults can be overridden at project level

### FR-4: Lineup Validation Service
- System shall validate lineup player count against sport configuration
- System shall validate positions against sport's position schema
- System shall enforce goalkeeper color contrast rule (if sport has GK)
- Validation returns structured errors with field references

### FR-5: B31 Integration
- ContentTemplate model shall have optional sport ForeignKey
- Templates with sport=null are universal (all sports)
- Template listing shall support sport filter parameter
- Content generation shall inherit sport from project

### FR-6: B30 Integration
- Activities shall derive sport from project.club.metadata.sport
- Activity lineup validation uses sport configuration
- Activity-linked content inherits sport context

### FR-7: API Endpoints
- GET/POST /api/v1/sports/ - List/create sports (staff only create)
- GET/PATCH /api/v1/sports/{slug}/ - Retrieve/update sport by slug
- GET/PATCH /api/v1/sports/{slug}/configuration/ - Sport configuration (nested)
- GET/POST /api/v1/outfits/ - Project outfit configurations
- GET /api/v1/outfits/resolved/?project={id} - Resolved outfits with inheritance
- POST /api/v1/validation/team_size/ - Validate team size
- POST /api/v1/validation/positions/ - Validate positions
- POST /api/v1/validation/formation/ - Validate formation

## Success Criteria *(mandatory)*

1. **Multi-sport support**: System supports at least 4 sports (football, handball, basketball, futsal) with distinct configurations
2. **Validation accuracy**: Lineup validation correctly enforces team size rules for all supported sports
3. **Outfit management**: Teams can configure all required outfit types for their sport
4. **Template filtering**: Content templates correctly filter by sport type
5. **Integration completeness**: B30 (Activities) and B31 (Content Templates) correctly use sport configuration

## Key Entities

### Sport
- name: CharField (e.g., "Football", "Handball")
- slug: SlugField (e.g., "football", "handball")
- federation_metadata: JSONField (e.g., {"code": "KNVB", "country": "NL"})
- is_active: BooleanField
- sport_icon: FileField (optional)

### SportConfiguration
- sport: OneToOneField(Sport)
- team_size_min: PositiveIntegerField
- team_size_max: PositiveIntegerField
- max_substitutes: PositiveIntegerField
- positions: JSONField (array of {abbr, name, is_required})
- formation_defaults: JSONField (array of formation strings)
- outfit_types: JSONField (array of valid outfit types for this sport)
- has_goalkeeper: BooleanField
- rules_metadata: JSONField (additional sport rules)

### OutfitConfiguration
- project: ForeignKey(Project)
- outfit_type: CharField (choices: home, away, goalkeeper, trainer, third_kit)
- colors: JSONField ({primary_color, secondary_color, accent_color})
- sponsor_config: JSONField (chest, sleeve, back sponsor positions)
- number_font: JSONField (family, color, outline)
- badge_position: CharField (left_chest, center_chest)
- metadata: JSONField (additional outfit metadata)
- is_active: BooleanField

**Unique Constraint**: (project, outfit_type)

## Dependencies & Integrations

### Existing Dependencies (DONE)
- **B07 Projects**: Add `sport` FK to Project model (nullable, club level + team override)
- **B30 Activities**: Activity derives sport from `project.get_sport()`, uses for lineup validation
- **B31 Content Templates**: Optional `sport` FK for filtering templates by sport

### Integration Points
- B07 Project: Add `sport` FK + `get_sport()` method with parent fallback
- B31 ContentTemplate: Add optional `sport` ForeignKey for filtering
- B30 Activity: Use sport configuration for lineup validation

## Clarifications

### CL-1: Validation Strictness (Lineup Size)
**Question**: When lineup validation fails (e.g., wrong player count), should the system block or warn?
**Decision**: **Warn but allow** - Validation returns warnings but does not block content generation.
**Rationale**: Real-world flexibility needed - training sessions, friendly matches may have non-standard lineups. Warnings provide guidance without blocking workflows.

### CL-2: Position Schema Strictness
**Question**: When a player has a position not in the SportConfiguration schema, how should validation behave?
**Decision**: **Flexible** - Schema is suggestive, custom positions are accepted with warnings.
**Rationale**: Clubs use position variations (CDM, CAM, RWB, AMC) not always in standard schemas. Team SIZE is critical validation; position names are nice-to-have consistency.

## Planning Decisions

### PL-1: Project-Sport Relationship
**Question**: How is sport linked to projects?
**Decision**: FK on **both Club and Team** with inheritance fallback via `get_sport()` method.
**Rationale**: Teams within a club can have different disciplines (e.g., Ajax 1 = football 11v11, Ajax Zaal = futsal).

### PL-2: OutfitConfiguration Scope
**Question**: At what level are outfits configured?
**Decision**: **Club defaults + Team overrides** - OutfitConfiguration can be on Club or Team level with fallback lookup.
**Rationale**: DRY (80% teams use club colors) + flexibility (20% need overrides like youth teams).

### PL-3: Frontend Scope
**Question**: Include demo frontend pages?
**Decision**: **Backend only** - no demo frontend pages.
**Rationale**: Focus on API completeness. Frontend can be added later if needed.

## Assumptions

1. Sports are platform-wide, not organisation-specific (KNVB rules apply to all Dutch football clubs)
2. Seed data will be loaded separately after module completion (not in migrations)
3. Disciplines are separate Sport records (football_11v11, football_7v7, futsal)
4. Position schemas are suggestive - custom positions allowed with warnings (see CL-2)
5. Outfit types include special roles: goalkeeper and trainer (separate from player outfits)

## Out of Scope

- Match event tracking (goals, cards, substitutions) - future B30 enhancement
- Formation visual editor - future frontend feature
- Referee outfit configuration
- Historical outfit tracking (past seasons)
