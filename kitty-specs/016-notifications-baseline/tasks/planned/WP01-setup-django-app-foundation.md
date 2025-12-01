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
title: "Setup & Django App Foundation"
phase: "Phase 0 - Setup"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-01T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Setup & Django App Foundation

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

**Goal**: Create notifications Django app structure, configure tooling, and establish quality gates per Constitution Principles III, VIII, X.

**Success Criteria**:
- [ ] Notifications app loads in Django without errors
- [ ] App structure follows plan.md architecture (models/, serializers/, views/, services/, tasks/)
- [ ] mypy type checking passes on notifications module
- [ ] pytest runs successfully with notifications test fixtures
- [ ] CI pipeline includes notifications in linting/formatting/test runs
- [ ] All subtasks (T001-T008) completed and validated

## Context & Constraints

**Related Documents**:
- [plan.md](../plan.md): Technical architecture, tech stack
- [spec.md](../spec.md): User stories, functional requirements
- [Constitution](../../../../.kittify/memory/constitution.md): Governance principles

**Key Constraints**:
- Python 3.12+ required (Constitution Principle III)
- Type hints mandatory for all public APIs (Principle III)
- pytest-django for testing (Principle IV)
- No circular imports (Principle II)

**Architectural Decisions**:
- Single Django app `notifications` with single responsibility (Principle II)
- Clear directory structure: models/, serializers/, views/, services/, tasks/
- Test fixtures for all models to enable parallel test development

## Subtasks & Detailed Guidance

### Subtask T001 – Create notifications Django app
**Purpose**: Establish the notifications Django app as the foundation for all notification functionality.

**Steps**:
1. Navigate to `src/` directory
2. Create `notifications/` directory (manual or via `django-admin startapp`)
3. Create `notifications/__init__.py` with empty app config import

**Files**:
- Create: `src/notifications/__init__.py`

**Notes**:
- Use manual creation to have full control over directory structure
- Keep it minimal - full structure comes in T003

---

### Subtask T002 – Add app to INSTALLED_APPS
**Purpose**: Register notifications app with Django so it's recognized by the framework.

**Steps**:
1. Open Django settings file (likely `src/config/settings/base.py`)
2. Add `'notifications.apps.NotificationsConfig'` to INSTALLED_APPS
3. Place after core apps but before third-party apps (standard Django convention)

**Files**:
- Modify: `src/config/settings/base.py`

**Notes**:
- Use full dotted path to AppConfig class for explicitness
- Verify import works: `python manage.py check`

---

### Subtask T003 – [P] Create app directory structure
**Purpose**: Establish clear separation of concerns per architecture plan.

**Steps**:
1. Create subdirectories under `src/notifications/`:
   - `models/` (model definitions)
   - `serializers/` (DRF serializers)
   - `views/` (DRF viewsets and views)
   - `services/` (business logic)
   - `tasks/` (Celery tasks)
   - `channels/` (notification channel implementations)
2. Create `__init__.py` in each subdirectory
3. Add docstrings to each `__init__.py` explaining purpose

**Files**:
- Create: `src/notifications/models/__init__.py`
- Create: `src/notifications/serializers/__init__.py`
- Create: `src/notifications/views/__init__.py`
- Create: `src/notifications/services/__init__.py`
- Create: `src/notifications/tasks/__init__.py`
- Create: `src/notifications/channels/__init__.py`

**Parallel?**: Yes - can proceed in parallel with T004

**Notes**:
- Follow Python package conventions (all `__init__.py` files)
- Docstrings help future developers understand structure
- Example docstring: `"""Notification model definitions."""`

---

### Subtask T004 – [P] Configure mypy for type checking
**Purpose**: Enable static type checking for the notifications module per Constitution Principle III.

**Steps**:
1. Verify `mypy.ini` or `pyproject.toml` exists in repo root
2. Add notifications to checked modules if not already covered by `[mypy]` global settings
3. Configure strict mode for notifications module:
   ```ini
   [mypy-notifications.*]
   strict = True
   warn_return_any = True
   warn_unused_configs = True
   ```
4. Run: `mypy src/notifications/` (should pass with minimal code)

**Files**:
- Modify: `mypy.ini` or `[tool.mypy]` section in `pyproject.toml`

**Parallel?**: Yes - can proceed in parallel with T003

**Notes**:
- Strict mode ensures all functions have type hints
- May need `django-stubs` installed (likely already present per plan.md)
- Fix any initial mypy errors before proceeding

---

### Subtask T005 – [P] Setup pytest-django fixtures
**Purpose**: Create reusable test fixtures for all notification models to enable parallel test development.

**Steps**:
1. Create `tests/notifications/conftest.py`
2. Add pytest-django fixtures for:
   - `retry_policy_factory`: Factory for RetryPolicy instances
   - `notification_type_factory`: Factory for NotificationType instances
   - `notification_factory`: Factory for Notification instances
   - `delivery_attempt_factory`: Factory for DeliveryAttempt instances
3. Use `@pytest.fixture` decorator
4. Consider using `factory_boy` for more complex fixtures (optional)

**Files**:
- Create: `tests/notifications/conftest.py`

**Parallel?**: Requires T003 (directory structure) but can proceed once that's done

**Example**:
```python
import pytest
from notifications.models import RetryPolicy

@pytest.fixture
def retry_policy_factory(db):
    def make_policy(**kwargs):
        defaults = {
            'name': 'test-policy',
            'max_attempts': 3,
            'retry_window_seconds': 3600,
            'backoff_strategy': 'exponential',
            'backoff_multiplier': 5.0,
            'initial_delay_seconds': 60,
        }
        defaults.update(kwargs)
        return RetryPolicy.objects.create(**defaults)
    return make_policy
```

**Notes**:
- Fixtures enable tests to be written before models are fully implemented
- Use `db` fixture to ensure database access
- Factory pattern allows test-specific overrides

---

### Subtask T006 – Create base test classes
**Purpose**: Provide shared test utilities and setup for all notifications tests.

**Steps**:
1. Create `tests/notifications/base.py`
2. Add `NotificationTestCase` class inheriting from `django.test.TestCase`
3. Add helper methods:
   - `assert_notification_status(notification, expected_status)`: Assert notification status
   - `create_test_notification(**kwargs)`: Create notification with sensible defaults
   - `mock_smtp_server()`: Context manager for mocking SMTP in tests
4. Add docstrings explaining each helper

**Files**:
- Create: `tests/notifications/base.py`

**Example**:
```python
from django.test import TestCase
from unittest.mock import patch

class NotificationTestCase(TestCase):
    """Base test class for notifications tests with common utilities."""

    def assert_notification_status(self, notification, expected_status):
        """Assert notification has expected status."""
        notification.refresh_from_db()
        self.assertEqual(notification.status, expected_status)

    @contextmanager
    def mock_smtp_server(self):
        """Mock SMTP server for email tests."""
        with patch('django.core.mail.backends.smtp.EmailBackend') as mock:
            yield mock
```

**Notes**:
- Base classes reduce test boilerplate
- Helper methods enforce consistent test patterns
- Mock utilities prevent actual SMTP connections in tests

---

### Subtask T007 – Add notifications app to CI pipeline
**Purpose**: Ensure quality gates run for notifications code per Constitution Principle X.

**Steps**:
1. Verify CI configuration file exists (e.g., `.github/workflows/ci.yml`, `.gitlab-ci.yml`)
2. Ensure linting step includes `src/notifications/`:
   - Black: `black --check src/notifications/`
   - Ruff: `ruff check src/notifications/`
3. Ensure type checking includes notifications: `mypy src/notifications/`
4. Ensure test step runs: `pytest tests/notifications/`
5. If CI uses path filters, add `src/notifications/**` and `tests/notifications/**`

**Files**:
- Modify: `.github/workflows/ci.yml` (or equivalent CI config)

**Notes**:
- CI should fail if any quality gate fails (linting, formatting, type checking, tests)
- Verify CI runs by pushing a test commit
- CI configuration should match pre-commit hooks (if any)

---

### Subtask T008 – Create notifications app metadata
**Purpose**: Define app configuration with proper metadata.

**Steps**:
1. Create `src/notifications/apps.py`
2. Define `NotificationsConfig` class inheriting from `AppConfig`
3. Set metadata:
   - `default_auto_field = 'django.db.models.BigAutoField'`
   - `name = 'notifications'`
   - `verbose_name = 'Notifications'`
4. Import in `src/notifications/__init__.py`: `default_app_config = 'notifications.apps.NotificationsConfig'`

**Files**:
- Create: `src/notifications/apps.py`
- Modify: `src/notifications/__init__.py`

**Example**:
```python
from django.apps import AppConfig

class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Notifications'

    def ready(self):
        # Import signal handlers here when added
        pass
```

**Notes**:
- `default_auto_field` sets primary key type for models
- `verbose_name` used in Django admin
- `ready()` method used for app initialization (signals, etc.)

## Constitutional Alignment Checklist

Before marking this work package complete, verify:

- [ ] **Principle II (Architecture)**: Single-responsibility app, clear directory structure
- [ ] **Principle III (Code Quality)**: mypy configured, type hints planned for all public APIs
- [ ] **Principle IV (Testing)**: pytest-django fixtures ready, base test classes created
- [ ] **Principle VIII (Developer Experience)**: Clear structure, easy to navigate
- [ ] **Principle X (CI/CD)**: Quality gates in CI for linting, formatting, type checking, tests

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Import conflicts with other apps | Use unique app label 'notifications', verify with `python manage.py check` |
| Circular imports | Keep models/, services/, tasks/ clearly separated; avoid cross-imports |
| CI configuration drift | Document CI setup in this prompt, verify after changes |
| Missing dependencies | Run `pip install -r requirements.txt` before starting |

## Definition of Done Checklist

- [ ] All subtasks (T001-T008) completed
- [ ] App loads: `python manage.py check` passes
- [ ] mypy passes: `mypy src/notifications/` (no errors)
- [ ] pytest runs: `pytest tests/notifications/` (no failures)
- [ ] CI pipeline includes notifications in all quality gates
- [ ] Directory structure matches plan.md
- [ ] All `__init__.py` files have docstrings
- [ ] App configuration complete (apps.py)
- [ ] Test fixtures available for future tests

## Review Guidance

**Key acceptance checkpoints**:
1. Verify directory structure matches plan.md specification
2. Run `python manage.py check` - should pass without errors
3. Run `mypy src/notifications/` - should pass (may have minimal code)
4. Run `pytest tests/notifications/` - should find test directory (may have no tests yet)
5. Check CI configuration includes notifications in all gates
6. Verify test fixtures in `conftest.py` are reusable and follow factory pattern

**Questions to ask**:
- Is the app structure clear and navigable?
- Do test fixtures enable parallel test development?
- Are type checking requirements clearly configured?
- Will CI catch quality issues early?

## Activity Log

> Append entries when the work package changes lanes. Include timestamp, agent, shell PID, lane, and a short note.

- 2025-12-01T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks

---

### Next Steps After Completion

Once WP01 is complete and reviewed:
1. Move to WP02 (Core Data Models & Migrations)
2. Begin implementing models using test fixtures from T005
3. Write model tests using base classes from T006
