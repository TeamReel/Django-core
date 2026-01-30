---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
title: "Django App Scaffold & Models"
phase: "Phase 1 - Foundation"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "28336"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Django App Scaffold & Models

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create new Django app `sport_configuration` with proper structure
2. Implement Sport, SportConfiguration, and OutfitConfiguration models
3. Add `sport` FK to existing Project model with inheritance fallback
4. All migrations run successfully
5. Models are registered in Django admin
6. App has README.md documentation

**Success Test**: Can create Sport → SportConfiguration → OutfitConfiguration via Django shell.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Data Model**: See `kitty-specs/041-sport-configuration-templates/data-model.md`
- **Planning Decisions**:
  - PL-1: Sport FK on both Club AND Team with inheritance fallback
  - PL-2: OutfitConfiguration on Club or Team level with fallback
- **Constraints**:
  - No seed data in migrations
  - Use nullable FK for Project.sport (safe migration)
  - Type hints on all model methods

## Subtasks & Detailed Guidance

### T001 – Create Django app structure
- **Purpose**: Establish the `sport_configuration` app skeleton
- **Steps**:
  1. Run `python manage.py startapp sport_configuration` in `src/` directory
  2. Create directory structure:
     ```
     src/sport_configuration/
     ├── __init__.py
     ├── admin.py
     ├── apps.py
     ├── models.py
     ├── serializers.py (empty for now)
     ├── views.py (empty for now)
     ├── urls.py (empty for now)
     ├── services/
     │   └── __init__.py
     └── README.md
     ```
  3. Update `apps.py` with proper app name: `name = 'sport_configuration'`
  4. Add `'sport_configuration'` to `INSTALLED_APPS` in settings
- **Files**: `src/sport_configuration/`
- **Parallel?**: No (must complete first)

### T002 – Create Sport model
- **Purpose**: Master data for sport types and disciplines
- **Steps**:
  1. Create `Sport` model in `src/sport_configuration/models.py`:
     ```python
     class Sport(TimestampedModel):
         name = models.CharField(max_length=100)
         slug = models.SlugField(max_length=100, unique=True)
         federation_metadata = models.JSONField(default=dict, blank=True)
         sport_icon = models.CharField(max_length=100, blank=True)
         is_active = models.BooleanField(default=True)

         class Meta:
             ordering = ['name']

         def __str__(self) -> str:
             return self.name
     ```
  2. Add help_text for all fields
  3. Inherit from existing `TimestampedModel` base class (or create if needed)
- **Files**: `src/sport_configuration/models.py`
- **Parallel?**: Yes (after T001)

### T003 – Create SportConfiguration model
- **Purpose**: Sport-specific rules (team size, positions, formations)
- **Steps**:
  1. Create `SportConfiguration` model:
     ```python
     class SportConfiguration(TimestampedModel):
         sport = models.OneToOneField(
             Sport,
             on_delete=models.CASCADE,
             related_name='configuration'
         )
         team_size_min = models.PositiveIntegerField(default=1)
         team_size_max = models.PositiveIntegerField(default=11)
         max_substitutes = models.PositiveIntegerField(default=7)
         positions = models.JSONField(default=list)  # ["GK", "LB", "CB", ...]
         formations = models.JSONField(default=dict)  # {"4-3-3": {...}}
         outfit_types = models.JSONField(default=list)  # ["home", "away", "goalkeeper"]
         has_goalkeeper = models.BooleanField(default=True)
         metadata = models.JSONField(default=dict, blank=True)
     ```
  2. Add model validation: `team_size_min <= team_size_max`
  3. Add `__str__` method: `return f"Config: {self.sport.name}"`
- **Files**: `src/sport_configuration/models.py`
- **Parallel?**: Yes (after T001)

### T004 – Create OutfitConfiguration model
- **Purpose**: Outfit styling per project (Club or Team)
- **Steps**:
  1. Create `OutfitConfiguration` model:
     ```python
     class OutfitConfiguration(TimestampedModel):
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
         outfit_type = models.CharField(max_length=20, choices=OutfitType.choices)
         colors = models.JSONField(default=dict)
         sponsor_config = models.JSONField(default=dict, blank=True)
         number_font = models.JSONField(default=dict, blank=True)
         badge_position = models.CharField(max_length=20, default='left_chest')
         metadata = models.JSONField(default=dict, blank=True)
         is_active = models.BooleanField(default=True)

         class Meta:
             unique_together = ['project', 'outfit_type']
             ordering = ['project', 'outfit_type']
     ```
  2. Add `__str__` method
- **Files**: `src/sport_configuration/models.py`
- **Parallel?**: Yes (after T001)

### T005 – Add sport FK to Project model
- **Purpose**: Link projects to sports with inheritance fallback
- **Steps**:
  1. In `src/projects/models.py`, add to Project model:
     ```python
     sport = models.ForeignKey(
         'sport_configuration.Sport',
         on_delete=models.SET_NULL,
         null=True,
         blank=True,
         related_name='projects'
     )

     def get_sport(self) -> Optional['Sport']:
         """Return sport with fallback to parent club."""
         if self.sport:
             return self.sport
         if self.parent_project:
             return self.parent_project.get_sport()
         return None
     ```
  2. Add type hint import: `from typing import Optional, TYPE_CHECKING`
  3. Use TYPE_CHECKING for Sport import to avoid circular dependency
- **Files**: `src/projects/models.py`
- **Parallel?**: No (depends on Sport model existing)

### T006 – Create and run migrations
- **Purpose**: Generate and apply database schema changes
- **Steps**:
  1. Run `python manage.py makemigrations sport_configuration`
  2. Run `python manage.py makemigrations projects` (for sport FK)
  3. Review migration files for correctness
  4. Run `python manage.py migrate`
  5. Verify in database that tables are created
- **Files**: `src/sport_configuration/migrations/`, `src/projects/migrations/`
- **Parallel?**: No (must run after all models)

### T007 – Register models in Django admin
- **Purpose**: Enable admin interface for model management
- **Steps**:
  1. In `src/sport_configuration/admin.py`:
     ```python
     from django.contrib import admin
     from .models import Sport, SportConfiguration, OutfitConfiguration

     @admin.register(Sport)
     class SportAdmin(admin.ModelAdmin):
         list_display = ['name', 'slug', 'is_active', 'created_at']
         list_filter = ['is_active']
         search_fields = ['name', 'slug']
         prepopulated_fields = {'slug': ('name',)}

     @admin.register(SportConfiguration)
     class SportConfigurationAdmin(admin.ModelAdmin):
         list_display = ['sport', 'team_size_min', 'team_size_max', 'has_goalkeeper']
         list_select_related = ['sport']

     @admin.register(OutfitConfiguration)
     class OutfitConfigurationAdmin(admin.ModelAdmin):
         list_display = ['project', 'outfit_type', 'is_active']
         list_filter = ['outfit_type', 'is_active']
         list_select_related = ['project']
     ```
- **Files**: `src/sport_configuration/admin.py`
- **Parallel?**: Yes (after models)

### T008 – Create app README.md
- **Purpose**: Document the app for developers
- **Steps**:
  1. Create `src/sport_configuration/README.md` with:
     - Purpose and scope
     - Model descriptions
     - Key relationships (Sport ↔ SportConfiguration, Project ↔ OutfitConfiguration)
     - Usage examples (import paths, basic queries)
     - Integration points (B07 Projects, B30 Activities, B31 Content Templates)
- **Files**: `src/sport_configuration/README.md`
- **Parallel?**: Yes

## Definition of Done Checklist

- [ ] Django app `sport_configuration` created in `src/`
- [ ] Sport model with all fields and constraints
- [ ] SportConfiguration model (1:1 with Sport)
- [ ] OutfitConfiguration model with unique_together constraint
- [ ] Project.sport FK with get_sport() fallback method
- [ ] All migrations created and applied successfully
- [ ] Models visible and manageable in Django admin
- [ ] App README.md documents purpose and usage
- [ ] No linting errors (ruff)
- [ ] Type hints on all model methods
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify model field types match data-model.md
- Check that get_sport() fallback handles null parent_project
- Ensure unique_together constraint works for OutfitConfiguration
- Verify admin prepopulated_fields for slug generation
- Check migration dependencies are correct

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-01-30T09:25:31Z – claude – shell_pid=28336 – lane=doing – Started implementation
- 2026-01-30T09:40:38Z – claude – shell_pid=28336 – lane=for_review – Completed implementation - all 9 subtasks done, 34 tests passing
