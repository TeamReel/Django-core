# Manual Test: B32 Sport Configuration & Templates

**Module:** #041 B32 — Sport Configuration & Templates
**Status:** ✅ Implementation Complete | 📋 Testing TODO
**Feature Branch:** `041-sport-configuration-templates` (merged)
**Test Environment:** Development/Staging

---

## Test Objectives

Verify that the sport configuration system:
1. Correctly manages multi-sport configurations (team sizes, positions, formations)
2. Handles sport inheritance from Club → Team properly
3. Validates team compositions with advisory warnings
4. Resolves outfit configurations with fallback logic
5. Integrates with ContentTemplate for sport-specific content

---

## Prerequisites

- [ ] Migrations applied: `python manage.py migrate`
- [ ] Seed data loaded: `python manage.py seed_sports`
- [ ] Test user with staff permissions created
- [ ] At least one Organisation created
- [ ] At least one Club and Team project created

---

## Test Scenarios

### 1. Sport Model & Configuration

#### 1.1 View Available Sports
- [ ] Navigate to `/api/v1/sports/` (or Django admin)
- [ ] Verify 8 sports are seeded:
  - Football (11v11)
  - Futsal (5v5)
  - Handball
  - Basketball
  - Volleyball
  - Rugby Union
  - Ice Hockey
  - Field Hockey
- [ ] Check each sport has:
  - Name, slug, sport_icon (emoji)
  - is_active = True
  - Related SportConfiguration

#### 1.2 View Sport Configuration
- [ ] GET `/api/v1/sports/football-11/configuration/`
- [ ] Verify response includes:
  - team_size_min: 11
  - team_size_max: 11
  - max_substitutes: 7
  - positions: Array of position codes
  - formations: Object with formation details
  - outfit_types: ["home", "away", "goalkeeper", "third_kit"]
  - has_goalkeeper: true

#### 1.3 Create Custom Sport
- [ ] POST `/api/v1/sports/` with:
  ```json
  {
    "name": "Test Sport",
    "slug": "test-sport",
    "sport_icon": "🎾",
    "is_active": true
  }
  ```
- [ ] Verify sport is created
- [ ] PUT `/api/v1/sports/test-sport/configuration/` with configuration
- [ ] Verify configuration is saved

---

### 2. Project Sport Assignment & Inheritance

#### 2.1 Assign Sport to Club
- [ ] Create or select a Club project
- [ ] Assign sport via API or admin: `project.sport = football`
- [ ] Verify `project.get_sport()` returns football
- [ ] Verify sport appears in project detail API

#### 2.2 Team Inherits from Club
- [ ] Create a Team with `parent_project = club` (club has sport)
- [ ] Don't assign sport to team
- [ ] Call `team.get_sport()` or GET `/api/v1/projects/{team_id}/`
- [ ] Verify team inherits club's sport (football)
- [ ] Check API response indicates inherited status

#### 2.3 Team Overrides Club Sport
- [ ] Select team from 2.2
- [ ] Assign different sport: `team.sport = futsal`
- [ ] Verify `team.get_sport()` returns futsal (not football)
- [ ] Verify API shows team's own sport, not inherited

#### 2.4 Team Without Parent Sport
- [ ] Create team with parent_project = club (club has NO sport)
- [ ] Don't assign sport to team
- [ ] Verify `team.get_sport()` returns None
- [ ] Verify no errors/crashes

---

### 3. Outfit Configuration & Inheritance

#### 3.1 Create Outfit at Club Level
- [ ] POST `/api/v1/outfits/` for club:
  ```json
  {
    "project": <club_id>,
    "outfit_type": "home",
    "colors": {
      "primary": "#FF0000",
      "secondary": "#FFFFFF"
    }
  }
  ```
- [ ] Verify outfit is created
- [ ] GET `/api/v1/outfits/?project=<club_id>`
- [ ] Verify outfit appears in list

#### 3.2 Team Inherits Club Outfit
- [ ] Create team under club (from 3.1)
- [ ] Don't create outfit for team
- [ ] GET `/api/v1/outfits/resolved/?project=<team_id>&outfit_type=home`
- [ ] Verify response includes:
  - Club's outfit colors
  - `inherited: true` or similar indicator
  - `source_project: <club_id>`

#### 3.3 Team Overrides Club Outfit
- [ ] POST `/api/v1/outfits/` for team:
  ```json
  {
    "project": <team_id>,
    "outfit_type": "home",
    "colors": {
      "primary": "#0000FF",
      "secondary": "#FFFF00"
    }
  }
  ```
- [ ] GET `/api/v1/outfits/resolved/?project=<team_id>&outfit_type=home`
- [ ] Verify response shows:
  - Team's own colors (blue/yellow, not club's red/white)
  - `inherited: false`

#### 3.4 Multiple Outfit Types
- [ ] Create home, away, and goalkeeper outfits for club
- [ ] GET `/api/v1/outfits/?project=<club_id>`
- [ ] Verify all 3 outfits returned
- [ ] Verify filtering by outfit_type works

---

### 4. Validation Service

#### 4.1 Validate Team Size (Advisory)
- [ ] POST `/api/v1/validation/team-size/`:
  ```json
  {
    "sport_slug": "football-11",
    "player_count": 10
  }
  ```
- [ ] Verify response:
  - `is_valid: false`
  - `has_warnings: true`
  - Warning message about team size below minimum
  - **NOT an error** (advisory only)

#### 4.2 Validate Team Size (Valid)
- [ ] POST with `player_count: 11`
- [ ] Verify response:
  - `is_valid: true`
  - `has_warnings: false`
  - No issues

#### 4.3 Validate Positions (Known)
- [ ] POST `/api/v1/validation/positions/`:
  ```json
  {
    "sport_slug": "football-11",
    "positions": ["GK", "LB", "CB", "RB", "CM"]
  }
  ```
- [ ] Verify all positions recognized
- [ ] `is_valid: true`

#### 4.4 Validate Positions (Unknown)
- [ ] POST with positions including "UNKNOWN_POS"
- [ ] Verify response:
  - `is_valid: false`
  - Warning for unknown position
  - Other positions still validated

#### 4.5 Validate Formation (Known)
- [ ] POST `/api/v1/validation/formation/`:
  ```json
  {
    "sport_slug": "football-11",
    "formation": "4-3-3"
  }
  ```
- [ ] Verify `is_valid: true`
- [ ] Check formation details returned

#### 4.6 Validate Formation (Unknown)
- [ ] POST with `formation: "9-9-9"`
- [ ] Verify warning about unknown formation
- [ ] Verify response is advisory (not error)

---

### 5. ContentTemplate Integration

#### 5.1 Create Sport-Specific Template
- [ ] Navigate to ContentTemplate admin or API
- [ ] Create template with sport FK:
  ```json
  {
    "name": "Pre-Match Football Post",
    "template_type": "pre_match",
    "sport": <football_sport_id>,
    "content_template": "Match day! {{team_name}} plays {{opponent}}",
    "tone": "exciting"
  }
  ```
- [ ] Verify template is created with sport association

#### 5.2 Filter Templates by Sport
- [ ] GET `/api/v1/content/templates/?sport=<football_id>`
- [ ] Verify only football templates returned
- [ ] GET without sport filter
- [ ] Verify universal templates (sport=null) appear

#### 5.3 Universal Templates
- [ ] Create template with `sport: null`
- [ ] Verify it appears for all sports
- [ ] Verify filtering logic works correctly

---

### 6. Service Layer Integration

#### 6.1 OutfitLookupService Direct Usage
```python
from sport_configuration.services import OutfitLookupService

service = OutfitLookupService()
outfit = service.get_outfit(team_project, "home")
```
- [ ] Verify service returns correct outfit
- [ ] Verify inheritance logic works
- [ ] Test `get_all_outfits(project)` method

#### 6.2 SportValidationService Direct Usage
```python
from sport_configuration.services import SportValidationService

service = SportValidationService()
result = service.validate_team_size(config, 10)
```
- [ ] Verify validation returns ValidationResult
- [ ] Check `result.is_valid`, `result.issues`
- [ ] Test all validation methods

---

### 7. Edge Cases & Error Handling

#### 7.1 Circular Parent References
- [ ] Attempt to create circular project hierarchy
- [ ] Verify system prevents or handles gracefully
- [ ] No infinite loops in `get_sport()`

#### 7.2 Deleted Sport Reference
- [ ] Assign sport to project
- [ ] Soft-delete or deactivate sport
- [ ] Verify project still accessible
- [ ] Verify graceful handling of missing sport

#### 7.3 Invalid Outfit Type
- [ ] POST outfit with invalid outfit_type
- [ ] Verify validation error
- [ ] Check against sport's allowed outfit_types

#### 7.4 No Configuration for Sport
- [ ] Create sport without SportConfiguration
- [ ] Attempt to validate
- [ ] Verify graceful error handling

---

### 8. Performance & Queries

#### 8.1 N+1 Query Check
- [ ] List 50 projects with sports
- [ ] Enable Django Debug Toolbar or query logging
- [ ] Verify `select_related('sport')` is used
- [ ] No N+1 queries for sport lookups

#### 8.2 Outfit Resolution Performance
- [ ] Resolve outfits for 20 teams under same club
- [ ] Verify query count is reasonable
- [ ] Check caching if implemented

---

### 9. API Documentation (OpenAPI)

#### 9.1 Swagger/ReDoc Access
- [ ] Navigate to `/api/schema/swagger-ui/` or `/api/schema/redoc/`
- [ ] Verify sport_configuration endpoints documented
- [ ] Check request/response schemas
- [ ] Verify examples are present

#### 9.2 Schema Validation
- [ ] Download OpenAPI schema
- [ ] Verify against `kitty-specs/041-.../contracts/sport-config-api.yaml`
- [ ] Check all endpoints documented
- [ ] Verify parameter descriptions

---

### 10. Admin Interface

#### 10.1 Sport Admin
- [ ] Access `/admin/sport_configuration/sport/`
- [ ] Verify list view shows: name, slug, is_active
- [ ] Search by name works
- [ ] Filter by is_active works
- [ ] Can create/edit sport

#### 10.2 SportConfiguration Admin
- [ ] Access `/admin/sport_configuration/sportconfiguration/`
- [ ] Verify inline or link to Sport
- [ ] Can edit team sizes, positions, formations
- [ ] JSON fields render correctly

#### 10.3 OutfitConfiguration Admin
- [ ] Access `/admin/sport_configuration/outfitconfiguration/`
- [ ] Filter by project, outfit_type
- [ ] Can create outfit with color picker (if available)
- [ ] Can view/edit sponsor_config

---

## Test Results

### Summary
- **Total Test Cases:** 60+
- **Passed:** ___
- **Failed:** ___
- **Blocked:** ___
- **Not Tested:** ___

### Critical Issues Found
_Document any blocking issues here_

### Minor Issues Found
_Document any non-blocking issues here_

### Notes
_Any additional observations or context_

---

## Sign-off

- [ ] All critical test cases passed
- [ ] No blocking issues remain
- [ ] API documentation verified
- [ ] Admin interface functional
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tester:** ___________________
**Date:** ___________________
**Environment:** ___________________
**Build/Commit:** ___________________

---

## Related Documentation

- **Specification:** `kitty-specs/041-sport-configuration-templates/spec.md`
- **Data Model:** `kitty-specs/041-sport-configuration-templates/data-model.md`
- **API Contract:** `kitty-specs/041-sport-configuration-templates/contracts/sport-config-api.yaml`
- **Quickstart:** `kitty-specs/041-sport-configuration-templates/quickstart.md`
- **Module README:** `src/sport_configuration/README.md`
