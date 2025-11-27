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
title: "Django App Setup & Configuration"
phase: "Phase 0 - Foundation"
lane: "doing"
assignee: ""
agent: "copilot"
shell_pid: "45896"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-27T21:45:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Django App Setup & Configuration

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

Create the foundational Django `settings` app structure with all boilerplate files, configuration in `base.py`, and URL routing. This establishes the foundation for all subsequent Feature 010 work.

**Success Criteria**:
- `python manage.py check` passes without errors
- App loads without import errors
- URL routing accessible at `/api/v1/settings/` (returns 404 for now, but no routing errors)
- README.md provides clear overview of app architecture

## Context & Constraints

**References**:
- Constitution: `.kittify/memory/constitution.md` (Principle II: Architecture & Modularity)
- Implementation Plan: `kitty-specs/010-settings-feature-flags/plan.md` (Project Structure section)
- Task Breakdown: `kitty-specs/010-settings-feature-flags/tasks.md`

**Architectural Decisions**:
- Single Django app named `settings` following existing pattern (B06-B09 apps)
- All core logic in `src/settings/` directory
- REST API via DRF ViewSets
- Python query API in `api.py`
- Redis integration isolated in `cache.py` for optional dependency management

**Constraints**:
- Must follow existing Django Core-App project structure
- Type hints required (`py.typed` marker file)
- No product-specific logic (Constitution Principle I)

## Subtasks & Detailed Guidance

### Subtask T001 – Create Directory Structure
**Purpose**: Establish the Django app package structure.

**Steps**:
1. Create directory: `src/settings/`
2. Create empty `src/settings/__init__.py`
3. Create `src/settings/py.typed` (marker file for type hint support)

**Files**:
- `src/settings/__init__.py` (empty or with `__version__ = "0.1.0"`)
- `src/settings/py.typed` (empty file)

**Parallel**: Independent of other subtasks

**Validation**: Directory exists and is a valid Python package

---

### Subtask T002 – Create Empty Module Files
**Purpose**: Scaffold all required module files for the app.

**Steps**:
1. Create `src/settings/models.py` with module docstring
2. Create `src/settings/api.py` with module docstring
3. Create `src/settings/cache.py` with module docstring
4. Create `src/settings/admin.py` with Django admin import
5. Create `src/settings/serializers.py` with DRF imports
6. Create `src/settings/views.py` with DRF ViewSet imports
7. Create `src/settings/urls.py` with Django URL patterns import
8. Create `src/settings/permissions.py` with DRF permissions import

**File Templates**:

```python
# models.py
"""Django models for Settings & Feature Flags system."""

# api.py
"""Python query API for feature flags and settings."""

# cache.py
"""Redis cache layer with pub/sub invalidation."""

# admin.py
"""Django admin customizations for settings management."""
from django.contrib import admin

# serializers.py
"""DRF serializers for REST API."""
from rest_framework import serializers

# views.py
"""DRF ViewSets for REST API endpoints."""
from rest_framework import viewsets

# urls.py
"""URL routing for settings REST API."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

urlpatterns = []

# permissions.py
"""Scope-aware permission classes."""
from rest_framework import permissions
```

**Parallel**: Can run in parallel with T001, T004

**Validation**: All files exist and have basic imports

---

### Subtask T003 – Add to INSTALLED_APPS
**Purpose**: Register the settings app with Django.

**Steps**:
1. Open `src/config/settings/base.py`
2. Locate the `INSTALLED_APPS` list
3. Add `'src.settings',` to the list (after existing B06-B09 apps)

**File**: `src/config/settings/base.py`

**Example**:
```python
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',
    'django.contrib.auth',
    # ...
    # Project apps
    'src.organisations',  # B06
    'src.projects',       # B07
    'src.rbac',           # B08
    'src.audit',          # B09
    'src.settings',       # B10 (NEW)
]
```

**Dependencies**: Requires T001 (directory must exist)

**Validation**: `python manage.py check` passes

---

### Subtask T004 – Create Management Commands Directory
**Purpose**: Set up structure for custom Django management commands (e.g., seed_settings).

**Steps**:
1. Create directory: `src/settings/management/`
2. Create `src/settings/management/__init__.py` (empty)
3. Create directory: `src/settings/management/commands/`
4. Create `src/settings/management/commands/__init__.py` (empty)

**Files**:
- `src/settings/management/__init__.py`
- `src/settings/management/commands/__init__.py`

**Parallel**: Can run in parallel with T002

**Validation**: Directories exist and are valid Python packages

---

### Subtask T005 – Include URLs in Root URLconf
**Purpose**: Route `/api/v1/settings/` to the settings app URLs.

**Steps**:
1. Open `src/config/urls.py`
2. Locate the `urlpatterns` list
3. Add `path('api/v1/settings/', include('src.settings.urls')),`

**File**: `src/config/urls.py`

**Example**:
```python
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/settings/', include('src.settings.urls')),  # NEW
    # ... other URL patterns
]
```

**Dependencies**: Requires T002 (urls.py must exist)

**Validation**: Server starts without routing errors, `/api/v1/settings/` returns 404 (not 500)

---

### Subtask T006 – Create AppConfig Class
**Purpose**: Define Django app configuration.

**Steps**:
1. Create `src/settings/apps.py`
2. Define `SettingsConfig` class extending `AppConfig`
3. Set `name = 'src.settings'`
4. Set `verbose_name = 'Settings & Feature Flags'`

**File**: `src/settings/apps.py`

**Template**:
```python
"""Django app configuration for Settings & Feature Flags."""
from django.apps import AppConfig


class SettingsConfig(AppConfig):
    """Configuration for the settings app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'src.settings'
    verbose_name = 'Settings & Feature Flags'

    def ready(self):
        """Import signal handlers when app is ready."""
        # Signal handlers will be connected here in WP07
        pass
```

**Parallel**: Can run in parallel with other setup tasks

**Validation**: App config loads correctly

---

### Subtask T007 – Create App README
**Purpose**: Document the app's purpose, architecture, and dependencies.

**Steps**:
1. Create `src/settings/README.md`
2. Document app overview, key features, dependencies, architecture
3. Reference quickstart.md for usage examples

**File**: `src/settings/README.md`

**Template**:
```markdown
# Settings & Feature Flags (B10)

## Overview

Centralised configuration management system supporting feature flags (boolean toggles) and typed settings (string, integer, boolean, JSON) at three scopes: global, organisation, and project.

## Key Features

- **Scope Hierarchy**: project > organisation > global precedence
- **Cache Layer**: Redis with pub/sub invalidation (optional dependency)
- **Python Query API**: `get_flag()`, `get_setting()` for application code
- **REST API**: DRF endpoints for management UIs
- **Audit Integration**: All CRUD operations logged via B09
- **Scope-Aware Permissions**: B08 RBAC integration

## Dependencies

- Django 5.1+
- Django REST Framework 3.14+
- Redis (optional) + django-redis
- PostgreSQL (nullable FKs, JSONB, GIN indexes)

## Architecture

```
src/settings/
├── models.py          # FeatureFlag and Setting models
├── api.py             # Python query API (get_flag, get_setting)
├── cache.py           # Redis cache layer with pub/sub
├── serializers.py     # DRF serializers
├── views.py           # DRF ViewSets
├── permissions.py     # Scope-aware permission classes
├── admin.py           # Django admin customizations
└── signals.py         # B09 audit integration
```

## Usage

See `kitty-specs/010-settings-feature-flags/quickstart.md` for detailed usage examples.

**Quick Example**:
```python
from src.settings.api import get_flag, get_setting

# Check feature flag
if get_flag('beta_features', project_id=project.id):
    # Show beta UI
    pass

# Get configuration value
max_size = get_setting('max_upload_size', organisation_id=org.id)
```

## Related Apps

- **B06 (organisations)**: Scope entities
- **B07 (projects)**: Scope entities
- **B08 (rbac)**: Permission enforcement
- **B09 (audit)**: Change tracking
```

**Parallel**: Can run in parallel with other setup tasks

**Validation**: README renders correctly in GitHub

---

## Test Strategy

No tests required for this work package (boilerplate only). Testing begins in WP08.

## Risks & Mitigations

**Risk**: Incorrect INSTALLED_APPS ordering breaks app initialization
- **Mitigation**: Add after existing B06-B09 apps, test with `python manage.py check`

**Risk**: URL routing conflicts with existing endpoints
- **Mitigation**: Use namespaced URL pattern `/api/v1/settings/`, verify no conflicts

## Definition of Done Checklist

- [x] `src/settings/` directory structure created
- [x] All module files exist with basic imports
- [x] App registered in `INSTALLED_APPS`
- [x] Management commands directory structure created
- [x] URLs included in root URLconf
- [x] AppConfig class defined
- [x] README.md complete
- [x] `python manage.py check` passes
- [x] Server starts without errors
- [x] `/api/v1/settings/` returns 404 (not 500)

## Review Guidance

**Acceptance Checkpoints**:
1. Verify all files created match specifications exactly
2. Run `python manage.py check` - should pass with no errors
3. Start development server - should start without import errors
4. Check URL routing - `/api/v1/settings/` should be reachable (404 is OK)
5. Review README.md - should be clear and match quickstart.md

**Common Issues**:
- Missing `__init__.py` files in directories
- Incorrect INSTALLED_APPS syntax (comma, quotes)
- URL include() path mismatch

## Activity Log

- 2025-11-27T21:45:00Z – system – lane=planned – Prompt created.

---

**Next Work Package**: WP02 (Database Models & Migrations) - depends on this WP completion
- 2025-11-27T20:47:55Z – copilot – shell_pid=45896 – lane=doing – Started WP01 Django App Setup implementation
