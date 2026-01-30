---
work_package_id: "WP06"
subtasks:
  - "T043"
  - "T044"
  - "T045"
  - "T046"
  - "T047"
  - "T048"
  - "T049"
title: "Polish & Integration"
phase: "Phase 3 - Integration"
lane: "doing"
assignee: ""
agent: "system"
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks (backend-only revision)"
---

# Work Package Prompt: WP06 – Polish & Integration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Add B31 ContentTemplate integration (optional sport FK)
2. Create seed data management command
3. Update documentation with integration examples
4. Validate quickstart scenario end-to-end
5. Run type checking and fix issues
6. Integration tests for Project.get_sport() inheritance
7. Final constitutional compliance review

**Success Test**: All CI checks pass. Quickstart scenario works. Integration tests pass.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Dependencies**: All previous WPs (WP01-WP05) must be complete
- **Integration Points**: B07 Projects, B31 Content Templates
- **Constraints**:
  - No seed data in migrations (separate management command)
  - All tests must pass with ≥85% coverage

## Subtasks & Detailed Guidance

### T043 – Add B31 ContentTemplate integration
- **Purpose**: Optional sport FK on ContentTemplate for filtering
- **Steps**:
  1. Check if B31 ContentTemplate model exists in codebase
  2. If exists, add optional `sport` FK:
     ```python
     # In content_templates/models.py
     sport = models.ForeignKey(
         'sport_configuration.Sport',
         on_delete=models.SET_NULL,
         null=True,
         blank=True,
         related_name='content_templates',
         help_text="Filter templates by sport. Null = universal template."
     )
     ```
  3. Create migration
  4. Update ContentTemplate serializer to include sport field
  5. Add sport filter to template list endpoint
- **Files**: `src/content_templates/models.py`, `src/content_templates/serializers.py`
- **Parallel?**: Yes

### T044 – Create seed data management command
- **Purpose**: Load sample sports data for development/demo
- **Steps**:
  1. Create `src/sport_configuration/management/commands/seed_sports.py`:
     ```python
     from django.core.management.base import BaseCommand
     from sport_configuration.models import Sport, SportConfiguration

     SPORTS_DATA = [
         {
             'name': 'Football (11v11)',
             'slug': 'football-11',
             'sport_icon': '⚽',
             'config': {
                 'team_size_min': 11,
                 'team_size_max': 11,
                 'max_substitutes': 7,
                 'positions': ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'],
                 'formations': {'4-3-3': {}, '4-4-2': {}, '3-5-2': {}},
                 'outfit_types': ['home', 'away', 'goalkeeper', 'third_kit'],
                 'has_goalkeeper': True,
             }
         },
         {
             'name': 'Futsal (5v5)',
             'slug': 'futsal-5',
             'sport_icon': '⚽',
             'config': {
                 'team_size_min': 5,
                 'team_size_max': 5,
                 'max_substitutes': 7,
                 'positions': ['GK', 'FIXO', 'ALA', 'PIVOT'],
                 'formations': {'1-2-2': {}, '2-2': {}},
                 'outfit_types': ['home', 'away', 'goalkeeper'],
                 'has_goalkeeper': True,
             }
         },
         {
             'name': 'Handball',
             'slug': 'handball',
             'sport_icon': '🤾',
             'config': {
                 'team_size_min': 7,
                 'team_size_max': 7,
                 'max_substitutes': 7,
                 'positions': ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'P'],
                 'formations': {'6-0': {}, '5-1': {}},
                 'outfit_types': ['home', 'away', 'goalkeeper'],
                 'has_goalkeeper': True,
             }
         },
         {
             'name': 'Basketball',
             'slug': 'basketball',
             'sport_icon': '🏀',
             'config': {
                 'team_size_min': 5,
                 'team_size_max': 5,
                 'max_substitutes': 7,
                 'positions': ['PG', 'SG', 'SF', 'PF', 'C'],
                 'formations': {},
                 'outfit_types': ['home', 'away'],
                 'has_goalkeeper': False,
             }
         },
     ]

     class Command(BaseCommand):
         help = 'Seed sport configuration data for development'

         def handle(self, *args, **options):
             for sport_data in SPORTS_DATA:
                 config_data = sport_data.pop('config')
                 sport, created = Sport.objects.update_or_create(
                     slug=sport_data['slug'],
                     defaults=sport_data
                 )
                 self.stdout.write(f"{'Created' if created else 'Updated'}: {sport.name}")

                 SportConfiguration.objects.update_or_create(
                     sport=sport,
                     defaults=config_data
                 )
             self.stdout.write(self.style.SUCCESS('Sport seed data loaded!'))
     ```
  2. Create `src/sport_configuration/management/__init__.py`
  3. Create `src/sport_configuration/management/commands/__init__.py`
- **Files**: `src/sport_configuration/management/commands/seed_sports.py`
- **Parallel?**: Yes

### T045 – Update app README with integration examples
- **Purpose**: Document how to use sport configuration in other apps
- **Steps**:
  1. Update `src/sport_configuration/README.md` with:
     - How to get sport for a project: `project.get_sport()`
     - How to validate team size: `SportValidationService().validate_team_size()`
     - How to lookup outfits with inheritance: `OutfitLookupService().get_outfit()`
     - API endpoint overview with curl examples
     - Integration with B07 Projects
     - Seed data command usage
- **Files**: `src/sport_configuration/README.md`
- **Parallel?**: Yes

### T046 – Validate quickstart.md scenario end-to-end
- **Purpose**: Ensure documented quickstart actually works
- **Steps**:
  1. Read `kitty-specs/041-sport-configuration-templates/quickstart.md`
  2. Execute each step manually in development environment:
     - Create sport via API
     - Create outfit configuration
     - Run validation
  3. Fix any issues found
  4. Update quickstart if commands have changed
- **Files**: `kitty-specs/041-sport-configuration-templates/quickstart.md`
- **Parallel?**: No (requires full stack running)

### T047 – Run type checking (mypy) and fix issues
- **Purpose**: Ensure type safety across the module
- **Steps**:
  1. Run `mypy src/sport_configuration/`
  2. Fix any type errors
  3. Ensure all public methods have type hints
  4. Verify no `# type: ignore` without justification
- **Files**: Various in `src/sport_configuration/`
- **Parallel?**: No (run after all code complete)

### T048 – Write integration tests
- **Purpose**: Test Project.get_sport() inheritance chain
- **Steps**:
  1. Create `tests/sport_configuration/test_integration.py`:
     ```python
     import pytest
     from projects.models import Project
     from sport_configuration.models import Sport, SportConfiguration, OutfitConfiguration

     @pytest.mark.django_db
     class TestProjectSportIntegration:
         def test_project_sport_direct(self):
             """Project with direct sport assignment."""
             sport = Sport.objects.create(name='Football', slug='football')
             project = Project.objects.create(name='Club', sport=sport)
             assert project.get_sport() == sport

         def test_project_sport_inheritance(self):
             """Team inherits sport from parent club."""
             sport = Sport.objects.create(name='Football', slug='football')
             club = Project.objects.create(name='Club', sport=sport)
             team = Project.objects.create(name='Team', parent_project=club)
             assert team.get_sport() == sport

         def test_team_can_override_sport(self):
             """Team can have different sport than parent."""
             football = Sport.objects.create(name='Football', slug='football')
             futsal = Sport.objects.create(name='Futsal', slug='futsal')
             club = Project.objects.create(name='Club', sport=football)
             team = Project.objects.create(name='Futsal Team', parent_project=club, sport=futsal)
             assert club.get_sport() == football
             assert team.get_sport() == futsal

         def test_project_no_sport(self):
             """Project without sport returns None."""
             project = Project.objects.create(name='No Sport')
             assert project.get_sport() is None

     @pytest.mark.django_db
     class TestOutfitInheritance:
         def test_outfit_inherited_from_club(self):
             """Team gets outfit from parent club."""
             from sport_configuration.services import OutfitLookupService

             sport = Sport.objects.create(name='Football', slug='football')
             club = Project.objects.create(name='Club', sport=sport)
             team = Project.objects.create(name='Team', parent_project=club)

             OutfitConfiguration.objects.create(
                 project=club,
                 outfit_type='home',
                 colors={'primary': '#FF0000'}
             )

             service = OutfitLookupService()
             outfit = service.get_outfit(team, 'home')
             assert outfit is not None
             assert outfit.project == club  # Inherited from club

         def test_team_overrides_club_outfit(self):
             """Team's own outfit takes precedence."""
             from sport_configuration.services import OutfitLookupService

             sport = Sport.objects.create(name='Football', slug='football')
             club = Project.objects.create(name='Club', sport=sport)
             team = Project.objects.create(name='Team', parent_project=club)

             OutfitConfiguration.objects.create(project=club, outfit_type='home', colors={'primary': '#FF0000'})
             OutfitConfiguration.objects.create(project=team, outfit_type='home', colors={'primary': '#00FF00'})

             service = OutfitLookupService()
             outfit = service.get_outfit(team, 'home')
             assert outfit.project == team  # Team's own
             assert outfit.colors['primary'] == '#00FF00'
     ```
- **Files**: `tests/sport_configuration/test_integration.py`
- **Parallel?**: No (final validation)

### T049 – Final constitutional compliance review
- **Purpose**: Ensure module follows all constitution principles
- **Steps**:
  1. Review against Constitution checklist:
     - [ ] Art. I: Product-agnostic (no TeamReel-specific code)
     - [ ] Art. II: Single responsibility, no circular deps
     - [ ] Art. III: Type hints, Black formatted, Ruff clean
     - [ ] Art. IV: All test files exist with coverage thresholds
     - [ ] Art. VI: No N+1 queries, pagination in place
     - [ ] Art. VII: DRF endpoints, consistent responses
     - [ ] Art. XI: README exists with required sections
  2. Run linting: `ruff check src/sport_configuration/`
  3. Run tests: `pytest tests/sport_configuration/ -v`
  4. Check coverage: `pytest tests/sport_configuration/ --cov=sport_configuration`
  5. Document any justified deviations
- **Files**: N/A (review only)
- **Parallel?**: No (final task)

## Definition of Done Checklist

- [ ] B31 ContentTemplate sport FK added (if B31 exists)
- [ ] Seed data management command works
- [ ] App README updated with integration examples
- [ ] Quickstart scenario validated end-to-end
- [ ] mypy runs cleanly on sport_configuration
- [ ] Integration tests pass
- [ ] Constitutional compliance verified
- [ ] All CI checks pass
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify seed command is idempotent (update_or_create)
- Check integration tests cover inheritance edge cases
- Ensure README examples are copy-paste runnable
- Verify no type: ignore without justification
- Check coverage meets thresholds

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks (backend-only revision)
- 2026-01-30T12:40:22Z – system – shell_pid= – lane=doing – Started implementation - Polish & Integration
