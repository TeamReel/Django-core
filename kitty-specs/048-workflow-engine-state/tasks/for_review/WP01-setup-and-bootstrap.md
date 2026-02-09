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
title: "Setup & Django App Bootstrap"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "Claude"
agent: "claude"
shell_pid: "39876"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-09T20:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39876"
    action: "Started Django app bootstrap implementation"
  - timestamp: "2026-02-09T20:15:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39876"
    action: "Completed all subtasks (T001-T007). Django app structure created, tests infrastructure setup, all quality checks pass."
  - timestamp: "2026-02-09T20:20:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "39876"
    action: "Ready for review"
---

# Work Package Prompt: WP01 – Setup & Django App Bootstrap

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged`.
- **Report progress**: As you address each feedback item, update the Activity Log.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Establish Django app structure, tooling, and quality gates per Constitution Principles III, VIII, X.

**Success Criteria**:
- App imports successfully without errors
- Migrations run cleanly (`python manage.py migrate --dry-run` passes)
- Linting (Ruff) passes with no errors
- Type checking (mypy) passes on workflows module
- Tests can be run via pytest
- Module README created with basic structure

**Independent Test**: Run `python manage.py check` and verify workflows app loads. Run pytest and verify test discovery works.

---

## Context & Constraints

**Supporting Documents**:
- Constitution: `.kittify/memory/constitution.md`
- Spec: `kitty-specs/048-workflow-engine-state/spec.md`
- Plan: `kitty-specs/048-workflow-engine-state/plan.md`
- Tasks: `kitty-specs/048-workflow-engine-state/tasks.md`

**Architectural Decisions**:
- Django 5.x app structure with modern directory layout
- Type hints required (Python 3.12+)
- Black formatting, Ruff linting enforced
- pytest + pytest-django for testing

**Constraints**:
- Must follow Django Core-App Constitution (product-agnostic)
- No product-specific logic in core app
- Standard Django app naming conventions

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create Django app structure

**Purpose**: Initialize the workflows Django app with standard structure.

**Steps**:
1. Navigate to `src/` directory
2. Create `workflows/` directory
3. Create `src/workflows/__init__.py` (empty for now)
4. Create `src/workflows/apps.py` with:
```python
from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'src.workflows'
    verbose_name = 'Workflows'

    def ready(self):
        """Initialize workflows app (registries will be loaded here)."""
        pass  # Registry initialization will be added in WP04
```

**Files**:
- `src/workflows/__init__.py`
- `src/workflows/apps.py`

**Parallel?**: No (foundation for other tasks)

**Notes**:
- Use `src.workflows` as app name (not just `workflows`) to match project structure
- `ready()` method will be used later for registry initialization

---

### Subtask T002 – Add workflows app to INSTALLED_APPS

**Purpose**: Register the workflows app with Django so it's recognized.

**Steps**:
1. Open Django settings file (likely `src/config/settings/base.py` or similar)
2. Add `'src.workflows'` to `INSTALLED_APPS`
3. Add after B07 Projects and before B09 Audit (dependency order)

**Files**: Settings file (project-specific path)

**Parallel?**: Yes (independent of directory creation once T001 done)

**Notes**:
- Workflows depends on: auth, contenttypes, projects
- Order matters for migrations

---

### Subtask T003 – Create directory structure

**Purpose**: Establish standard Django app directory layout.

**Steps**:
1. Create subdirectories in `src/workflows/`:
   - `models/` with `__init__.py`
   - `services/` with `__init__.py`
   - `views/` with `__init__.py`
   - `serializers/` with `__init__.py`
2. Create empty files:
   - `src/workflows/registry.py`
   - `src/workflows/admin.py`
   - `src/workflows/urls.py`

**Files**:
- `src/workflows/models/__init__.py`
- `src/workflows/services/__init__.py`
- `src/workflows/views/__init__.py`
- `src/workflows/serializers/__init__.py`
- `src/workflows/registry.py`
- `src/workflows/admin.py`
- `src/workflows/urls.py`

**Parallel?**: Yes (can proceed once T001 done)

**Notes**:
- Empty `__init__.py` files make directories importable
- Subdirectories keep code organized (models, services, views separate)

---

### Subtask T004 – Setup test directory

**Purpose**: Create test infrastructure for workflows module.

**Steps**:
1. Create `tests/workflows/` directory
2. Create `tests/workflows/conftest.py` with basic pytest-django setup:
```python
"""Pytest configuration for workflows tests."""
import pytest
from django.contrib.contenttypes.models import ContentType
from projects.models import Project
from accounts.models import User


@pytest.fixture
def user(db):
    """Create test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def project(db, user):
    """Create test project."""
    return Project.objects.create(
        name='Test Project',
        created_by=user
    )


# More fixtures will be added as models are created
```
3. Create subdirectories:
   - `tests/workflows/unit/`
   - `tests/workflows/integration/`
4. Create `tests/workflows/factories.py` (empty for now, will be populated in WP02)

**Files**:
- `tests/workflows/conftest.py`
- `tests/workflows/factories.py`
- `tests/workflows/unit/__init__.py`
- `tests/workflows/integration/__init__.py`

**Parallel?**: Yes (independent of app structure)

**Notes**:
- conftest.py provides shared fixtures
- Separation of unit vs integration tests keeps organization clear
- factories.py will use factory_boy for test data generation

---

### Subtask T005 – Create base model managers

**Purpose**: Setup reusable model managers for soft-delete pattern.

**Steps**:
1. Create `src/workflows/managers.py` with:
```python
"""Custom model managers for workflows app."""
from django.db import models


class ActiveWorkflowManager(models.Manager):
    """Manager that filters for active (non-deleted) workflows."""

    def get_queryset(self):
        """Return only active workflows."""
        return super().get_queryset().filter(is_active=True)


class AllWorkflowManager(models.Manager):
    """Manager that returns all workflows including inactive."""

    def get_queryset(self):
        """Return all workflows."""
        return super().get_queryset()
```

**Files**: `src/workflows/managers.py`

**Parallel?**: Yes (independent file)

**Notes**:
- ActiveWorkflowManager provides soft-delete filtering
- Will be used by WorkflowTemplate model
- Pattern: `WorkflowTemplate.objects` (active only), `WorkflowTemplate.all_objects` (all)

---

### Subtask T006 – Configure pytest-django

**Purpose**: Ensure pytest can discover and run workflows tests.

**Steps**:
1. Verify `pyproject.toml` has pytest-django configuration:
```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.test"
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "--reuse-db",
    "--nomigrations",
    "--cov=src/workflows",
    "--cov-report=term-missing",
]
```
2. If missing, add workflows to coverage targets

**Files**: `pyproject.toml`

**Parallel?**: Yes (configuration only)

**Notes**:
- `--reuse-db` speeds up test runs
- `--nomigrations` uses schema directly (faster)
- Coverage should target >85% for workflows module

---

### Subtask T007 – Create module README

**Purpose**: Document the workflows module for developers.

**Steps**:
1. Create `documents/04-modules/B37-workflow-engine.md` with structure:
```markdown
# B37: Workflow Engine & State Machine

**Status**: In Development
**Branch**: `048-workflow-engine-state`

## Overview

Generic workflow state machine for business processes (approvals, status tracking, lifecycle management).

**Key Concepts**:
- **WorkflowTemplate**: Admin-defined workflow with states and transitions
- **WorkflowInstance**: Tracks object progress through workflow states
- **Actions**: Domain-centric transition triggers (e.g., "submit", "approve")
- **Permissions**: Project-level role mappings control who can execute actions

## Architecture

**Models**: WorkflowTemplate, WorkflowInstance, TransitionHistory, ProjectPermissionOverride
**Services**: WorkflowEngine (state machine execution)
**Registries**: ValidatorRegistry, HookRegistry (pluggable extension points)

## Quick Start

See `kitty-specs/048-workflow-engine-state/quickstart.md` for 15-minute integration guide.

## API Endpoints

- `POST /api/workflows/templates/` - Create workflow template (admin)
- `POST /api/workflows/instances/` - Create workflow instance
- `POST /api/workflows/instances/{id}/execute/` - Execute state transition
- `GET /api/workflows/instances/{id}/available_actions/` - Get available actions
- `GET /api/workflows/history/` - View transition history

Full API documentation: `/api/docs/` (Swagger)

## Extension Points

### Custom Validators

Register Python functions to validate transitions:

```python
from workflows.registry import ValidatorRegistry

@ValidatorRegistry.validator("budget_check")
def validate_budget(instance, transition):
    if instance.context.get("amount", 0) > 10000:
        raise ValidationError("Amount exceeds budget limit")
```

### Custom Hooks

Register lifecycle hooks for state transitions:

```python
from workflows.registry import HookRegistry

@HookRegistry.hook("on_enter", "approved")
def on_approval_enter(instance, transition):
    # Send notification
    notify_stakeholders(instance)
```

## Testing

Run workflows tests:
```bash
pytest tests/workflows/
```

## References

- Specification: `kitty-specs/048-workflow-engine-state/spec.md`
- Data Model: `kitty-specs/048-workflow-engine-state/data-model.md`
- API Contract: `kitty-specs/048-workflow-engine-state/contracts/openapi.yaml`
```

**Files**: `documents/04-modules/B37-workflow-engine.md`

**Parallel?**: Yes (documentation task)

**Notes**:
- README will be expanded in later work packages
- Links to quickstart and spec provide deeper detail
- API examples will be fleshed out as implementation progresses

---

## Definition of Done Checklist

- [ ] All subtasks completed (T001-T007)
- [ ] App imports successfully (`python manage.py check` passes)
- [ ] App appears in INSTALLED_APPS
- [ ] Directory structure matches plan
- [ ] Test directory created with conftest.py
- [ ] pytest discovers workflows tests (`pytest --collect-only tests/workflows/`)
- [ ] Module README created
- [ ] No linting errors in new files (`ruff check src/workflows/`)
- [ ] Type hints present where applicable

---

## Review Guidance

**Acceptance Checkpoints**:
1. Run `python manage.py check` - should succeed with no errors
2. Run `pytest --collect-only tests/workflows/` - should discover test structure
3. Check INSTALLED_APPS includes `src.workflows`
4. Verify directory structure matches specification
5. Confirm README exists at `documents/04-modules/B37-workflow-engine.md`

**Critical to Verify**:
- App name is `src.workflows` not just `workflows`
- All subdirectories have `__init__.py` files
- conftest.py creates valid fixtures

---

## Activity Log

- 2026-02-09T18:18:50Z – system – lane=planned – Prompt created via /spec-kitty.tasks
