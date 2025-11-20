---
lane: "doing"
assignee: "GitHub Copilot (Claude Sonnet 4.5)"
agent: "claude"
shell_pid: "42480"
review_status: ""
---

# Work Package WP01: Project Structure & Dependencies

**Status**: In Progress  
**Priority**: P0 (Must Have)  
**Feature**: 001-core-project-skeleton  
**User Stories**: US-001 (Bootstrap Clean Skeleton)

## Activity Log

- 2025-11-20T22:45:00Z – claude – shell_pid=42480 – lane=doing – Started implementation

---

## Goal

Establish the foundational Django project skeleton with src/ layout and pinned dependencies. This work package creates the initial directory structure, initializes Django, and sets up all dependency management files with specific version pins.

---

## Constitutional Alignment

- **Principle II (Architecture)**: Implements src/ layout with clear separation (config, core_apps, common)
- **Principle III (Code Quality)**: Python 3.12+ baseline, curated dependencies with version pins
- **Principle VIII (Developer Experience)**: Foundation for easy setup and onboarding

---

## Subtasks

### T001: Create src/ directory structure
**Description**: Create the top-level src/ directory with subdirectories: config/, core_apps/, common/

**Implementation Guidance**:
- Use PowerShell: `New-Item -ItemType Directory -Path "src\config", "src\core_apps", "src\common"`
- Verify directory structure with `Get-ChildItem -Recurse src/`

**Definition of Done**:
- [ ] src/ directory exists at project root
- [ ] src/config/ subdirectory exists
- [ ] src/core_apps/ subdirectory exists
- [ ] src/common/ subdirectory exists

---

### T002: Initialize Django project
**Description**: Use django-admin to create initial Django project structure in src/config/

**Implementation Guidance**:
- Run: `django-admin startproject config src/`
- This creates manage.py at project root and config/ package in src/
- Expected files: src/config/settings.py, src/config/urls.py, src/config/wsgi.py, src/config/asgi.py

**Definition of Done**:
- [ ] manage.py exists at project root
- [ ] src/config/__init__.py exists
- [ ] src/config/settings.py exists (will be refactored in WP02)
- [ ] src/config/urls.py exists
- [ ] src/config/wsgi.py exists
- [ ] src/config/asgi.py exists

**Notes**:
- The generated settings.py is temporary; WP02 will restructure it into base.py, local.py, etc.

---

### T003: Create requirements files structure
**Description**: Create requirements/ directory with base.txt, local.txt, production.txt

**Implementation Guidance**:
- Create directory: `New-Item -ItemType Directory -Path "requirements"`
- Create files: `New-Item -ItemType File -Path "requirements\base.txt", "requirements\local.txt", "requirements\production.txt"`

**Definition of Done**:
- [ ] requirements/ directory exists at project root
- [ ] requirements/base.txt exists (empty for now, populated by T005)
- [ ] requirements/local.txt exists (empty for now, populated by T006)
- [ ] requirements/production.txt exists (empty for now, populated by T007)

---

### T004: Create pyproject.toml [PARALLEL]
**Description**: Create pyproject.toml with project metadata and Python 3.12+ requirement

**Implementation Guidance**:
- Create file at project root
- Include sections: [project], [build-system], [tool.pytest.ini_options], [tool.black], [tool.ruff], [tool.mypy], [tool.coverage]
- Set `requires-python = ">=3.12"`
- Set project name, version 0.1.0, description

**Definition of Done**:
- [ ] pyproject.toml exists at project root
- [ ] [project] section with name, version, description, requires-python
- [ ] [build-system] section with setuptools
- [ ] Placeholder sections for tools (populated by later WPs)

**Example**:
```toml
[project]
name = "django-core-skeleton"
version = "0.1.0"
description = "Product-agnostic Django skeleton following Core-App Constitution"
requires-python = ">=3.12"

[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"
```

---

### T005: Pin core dependencies [PARALLEL]
**Description**: Populate requirements/base.txt with Django, DRF, django-environ with pinned versions

**Implementation Guidance**:
- Add to requirements/base.txt:
  - Django==5.1.4
  - djangorestframework==3.14.0
  - django-environ==0.11.2
- Include comments explaining each dependency

**Definition of Done**:
- [ ] requirements/base.txt contains Django==5.1.4
- [ ] requirements/base.txt contains djangorestframework==3.14.0
- [ ] requirements/base.txt contains django-environ==0.11.2
- [ ] Each dependency has a comment explaining its purpose

**Example**:
```txt
# Core Django framework
Django==5.1.4

# Django REST Framework for API development
djangorestframework==3.14.0

# Environment variable management
django-environ==0.11.2
```

---

### T006: Pin development dependencies [PARALLEL]
**Description**: Populate requirements/local.txt with testing and code quality tools

**Implementation Guidance**:
- Start with: `-r base.txt` (include base dependencies)
- Add development-only dependencies:
  - pytest==7.4.3
  - pytest-django==4.7.0
  - coverage==7.3.3
  - black==23.12.1
  - ruff==0.1.8
  - mypy==1.7.1
  - django-stubs==4.2.7
  - djangorestframework-stubs==3.14.5
  - pre-commit==3.6.0

**Definition of Done**:
- [ ] requirements/local.txt includes -r base.txt
- [ ] All testing tools pinned (pytest, pytest-django, coverage)
- [ ] All code quality tools pinned (black, ruff, mypy, stubs)
- [ ] pre-commit pinned

**Example**:
```txt
-r base.txt

# Testing
pytest==7.4.3
pytest-django==4.7.0
coverage==7.3.3

# Code quality
black==23.12.1
ruff==0.1.8
mypy==1.7.1
django-stubs==4.2.7
djangorestframework-stubs==3.14.5

# Git hooks
pre-commit==3.6.0
```

---

### T007: Pin production dependencies [PARALLEL]
**Description**: Populate requirements/production.txt with production-only dependencies

**Implementation Guidance**:
- Start with: `-r base.txt`
- Add production dependencies:
  - python-json-logger==2.0.7 (structured logging)
  - psycopg2-binary==2.9.9 (PostgreSQL adapter)

**Definition of Done**:
- [ ] requirements/production.txt includes -r base.txt
- [ ] python-json-logger pinned
- [ ] psycopg2-binary pinned

**Example**:
```txt
-r base.txt

# Structured logging for production
python-json-logger==2.0.7

# PostgreSQL database adapter
psycopg2-binary==2.9.9
```

---

## Independent Test

**Test Name**: Verify project structure and dependencies install

**Test Steps**:
1. Clone repository
2. Verify directory structure exists: `Get-ChildItem -Recurse src/`
3. Verify requirements files exist: `Get-ChildItem requirements/`
4. Create virtual environment: `python -m venv venv`
5. Activate environment: `.\venv\Scripts\Activate.ps1`
6. Install dependencies: `pip install -r requirements\local.txt`
7. Verify Django is installed: `python -m django --version`
8. Verify manage.py exists and runs: `python manage.py --version`

**Expected Results**:
- All directories exist at expected paths
- All requirements files exist
- Dependencies install without errors
- Django version 5.1.4 reported
- manage.py runs without errors

---

## Implementation Notes

### Parallel Execution
- **T004-T007 can run in parallel**: These tasks create independent files
- **T001-T003 must run sequentially**: Directory structure must exist before Django initialization

### Path Conventions
- All paths relative to project root
- Use forward slashes in documentation, backslashes in PowerShell commands
- src/ contains all source code
- requirements/ contains all dependency specifications

### Dependency Strategy
- Pin all dependencies to exact versions (no ranges)
- Separate by environment (base, local, production)
- Use -r base.txt to inherit base dependencies
- Comment each dependency for maintainability

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Django startproject overwrites existing config/ | High | Run T001-T002 on fresh directory |
| Dependency version conflicts | Medium | Use tested version combinations from research.md |
| Requirements file errors | Low | Test installation after each file created |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] src/ directory structure matches plan (config, core_apps, common)
- [ ] Django project initialized correctly (manage.py, config package)
- [ ] All three requirements files exist and include -r base.txt inheritance
- [ ] pyproject.toml has requires-python >= 3.12
- [ ] All dependencies pinned to exact versions
- [ ] Dependency comments clear and accurate

### Testing Checklist
- [ ] Fresh virtual environment creation succeeds
- [ ] pip install -r requirements/local.txt completes without errors
- [ ] Django version matches expected 5.1.4
- [ ] manage.py --version executes successfully

---

## Success Criteria Mapping

- **SC-001**: Setup time < 10 minutes → Foundation established (dependency installation is bulk of time)
- **SC-006**: Python 3.12+ → pyproject.toml enforces this
- **SC-007**: Django 5.1+ → requirements/base.txt pins Django 5.1.4

---

## Dependencies

**Prerequisites**: None (starting work package)

**Enables**:
- WP02 (Settings & Configuration) requires project structure
- All subsequent work packages depend on this foundation

---

> This work package establishes the skeleton foundation. All code paths and dependencies are explicitly defined with no ambiguity.
