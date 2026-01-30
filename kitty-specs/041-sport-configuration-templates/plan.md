# Implementation Plan: B32 Sport Configuration & Templates
*Path: kitty-specs/041-sport-configuration-templates/plan.md*


**Branch**: `041-sport-configuration-templates` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/041-sport-configuration-templates/spec.md`

## Summary

Sport-specific configuration for team sizes, player positions, outfit variants, and template validation rules. Provides master data that enables multi-sport support across TeamReel, ensuring content templates adapt correctly to different sports and disciplines (football 11v11, football 7v7, futsal, handball, basketball, etc.).

**Key Architecture Decisions:**
- Sport FK on both Club and Team projects with fallback inheritance
- OutfitConfiguration with Club defaults + Team overrides
- Validation service returns warnings, never blocks
- Position schemas are flexible (custom positions allowed with warnings)

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.x, Django REST Framework, existing B07/B30/B31 modules
**Storage**: PostgreSQL (Railway production)
**Testing**: pytest + pytest-django (≥85% coverage for API, ≥90% for models)
**Target Platform**: Linux server (Railway), React/Vite frontend (Vercel)
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: <100ms API response time for validation
**Constraints**: No seed data in migrations (loaded separately via management command)
**Scale/Scope**: ~10-20 sports/disciplines, unlimited projects with outfit configs

## Planning Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| CL-1 | Validation strictness | Warn but allow | Real-world flexibility needed |
| CL-2 | Position schema | Flexible with warnings | Clubs use custom positions (CDM, CAM, etc.) |
| PL-1 | Project-Sport relationship | FK on Club AND Team | Teams can have different disciplines (zaal vs veld) |
| PL-2 | OutfitConfiguration scope | Club defaults + Team overrides | DRY + flexibility (80/20) |
| PL-3 | Demo frontend scope | Full (4 pages) | Complete spec = complete implementation |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Sport configuration is generic (not TeamReel-specific). Works for any team sport app.
- [x] **Core Focus**: Aligns with projects/activities domain - natural extension of B07
- [x] **Downstream Extension**: TeamReel-specific sports loaded via seed data, not hardcoded

### II. Architecture and Modularity
- [x] **Single Responsibility**: `sport_configuration` app handles only sport config concerns
- [x] **Stable APIs**: RESTful CRUD + validation endpoint, documented via OpenAPI
- [x] **Minimal Dependencies**: Only depends on existing B07 (projects), optional B30/B31 integration
- [x] **No Circular Deps**: sport_configuration → projects (one-way)
- [x] **No Downstream Imports**: Core does not import from TeamReel

### III. Code Quality and Style
- [x] **Python 3.12+**: Baseline maintained
- [x] **Type Hints**: All services and models will use type hints
- [x] **Black Formatting**: Enforced via pre-commit
- [x] **Ruff Linting**: Enforced via CI
- [x] **No Dead Code**: New module, no cleanup needed
- [x] **Readable Code**: Service layer separates validation logic from views
- [x] **Curated Dependencies**: No new external dependencies needed

### IV. Testing Strategy
- [x] **pytest + pytest-django**: Standard framework
- [x] **Test Coverage**: Models ≥90%, API ≥85%, Services ≥85%
- [x] **Regression Tests**: Validation edge cases covered
- [x] **Deterministic**: No external dependencies in tests
- [x] **Coverage Thresholds**: Enforced in CI
- [x] **Integration Tests**: Full flow: create sport → config → outfit → validate

### V. Security and Privacy
- [x] **Secure Defaults**: Standard Django/DRF security
- [x] **DEBUG Off**: Environment-controlled
- [x] **No Secrets**: No secrets in sport config
- [x] **Dependency Scanning**: Existing CI pipeline
- [x] **Centralized Auth**: Uses existing permission classes
- [x] **No Sensitive Logging**: Sport data is not sensitive

### VI. Performance and Reliability
- [x] **No N+1 Queries**: `select_related` for sport/project lookups
- [x] **Pagination**: Sport list is small (<50), but pagination ready
- [x] **Explicit Caching**: Not needed for config data (rarely changes)
- [x] **Structured Logging**: Uses existing logging infrastructure
- [x] **Health Checks**: Covered by existing health endpoints
- [x] **Metrics Hooks**: Standard DRF metrics
- [x] **Graceful Degradation**: Validation warnings don't block operations

### VII. UX and API Design
- [x] **DRF Required**: Django REST Framework for all APIs
- [x] **Consistent Responses**: Standard DRF response format
- [x] **Versioning Strategy**: No breaking changes (new module)
- [x] **Clear Errors**: Validation errors include field references
- [x] **Boundary Validation**: Validation in serializers + service layer

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: Part of existing docker-compose setup
- [x] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [x] **Pre-commit Hooks**: Existing hooks apply
- [x] **Type Checking**: mypy will run cleanly
- [x] **Task Scripts**: Existing manage.py commands
- [x] **Developer Docs**: README.md in app directory

### IX. Branching and Git Workflow
- [x] **Feature Branch**: Working on `041-sport-configuration-templates`
- [x] **Linked to Spec**: PR will reference spec.md
- [x] **Focused PRs**: Single feature, focused scope
- [x] **main Stable**: No direct commits to main

### X. CI/CD and Quality Gates
- [x] **CI Checks**: Existing CI pipeline applies
- [x] **Merge Gates**: All checks must pass
- [x] **Scripted Deployment**: Railway auto-deploy

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: kitty-specs/ contains all documentation
- [x] **App README**: Will create src/sport_configuration/README.md
- [x] **Getting Started**: Existing setup guide covers new apps
- [x] **Extension Guide**: Sport config extends projects naturally
- [x] **Spec Sync**: Spec updated during implementation
- [x] **ADR Required**: No major architectural decisions needed

### XII. Constitution Evolution
- [x] **No Constitution Changes**: Feature follows existing patterns
- [x] **Template Updates**: No template changes required

### Violations Requiring Justification

*None - all checks pass.*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/041-sport-configuration-templates/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
│   └── sport-config-api.yaml
└── tasks.md             # Phase 2 output
```

### Source Code (Backend)

```
src/
├── sport_configuration/           # NEW Django app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py                  # Sport, SportConfiguration, OutfitConfiguration
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── validation.py          # SportValidationService
│   │   └── outfit_lookup.py       # OutfitLookupService (fallback logic)
│   └── README.md
├── projects/
│   └── models.py                  # Add sport FK to Project
└── content_templates/
    └── models.py                  # Add sport FK to ContentTemplate (if needed)

tests/
├── sport_configuration/
│   ├── test_models.py
│   ├── test_api.py
│   ├── test_serializers.py
│   ├── test_validation_service.py
│   └── test_outfit_lookup.py
```

### Source Code (Frontend Demo)

```
demo/src/
├── pages/
│   └── sport-config/
│       ├── SportsPage.tsx         # /demo/sport-config/sports
│       ├── OutfitsPage.tsx        # /demo/sport-config/outfits
│       ├── PositionsPage.tsx      # /demo/sport-config/positions
│       └── ValidationPage.tsx     # /demo/sport-config/validate
├── components/
│   └── sport-config/
│       ├── SportList.tsx
│       ├── SportForm.tsx
│       ├── OutfitDesigner.tsx
│       ├── ColorPicker.tsx
│       ├── PositionEditor.tsx
│       └── ValidationPreview.tsx
└── api/
    └── sportConfig.ts             # API client hooks
```

**Structure Decision**: Web application with Django backend (new `sport_configuration` app) and React frontend (new demo pages under `/sport-config/`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
