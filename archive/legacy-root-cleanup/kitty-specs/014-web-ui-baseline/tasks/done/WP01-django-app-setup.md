---
lane: "done"
agent: "claude-reviewer"
shell_pid: "11588"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# Work Package: WP01 – Django App Setup & Configuration

## Metadata
- **Work Package ID**: WP01
- **Title**: Django App Setup & Configuration
- **Lane**: planned
- **Priority**: P0 (Foundational)
- **Estimated Effort**: 2 hours
- **Subtasks**: T001, T002, T003, T004

## History
- 2025-11-30: Created from plan.md

## Activity Log
- 2025-11-30T12:00:00Z – claude – shell_pid=11588 – lane=doing – Completed implementation of all 4 subtasks (T001-T004): Created directory structure, AppConfig, registered in INSTALLED_APPS, and created README documentation
- 2025-11-30T12:30:00Z – claude-reviewer – shell_pid=11588 – lane=done – ✅ Approved without changes. All 4 subtasks completed successfully. Directory structure correct, AppConfig properly configured, INSTALLED_APPS updated, comprehensive README created.

---

## Objective

Create the `web_ui` Django app with proper directory structure, AppConfig, and register it in Django settings. Establish foundational documentation.

## Context & Constraints

- **Feature**: B14 Web UI Baseline
- **Architecture**: Server-side templates, no CSS/JS (pure semantic HTML)
- **Integration**: Will integrate with B05 (auth), B06 (orgs), B07 (projects), B08 (RBAC)
- **Constraints**:
  - Must follow Django app conventions
  - Must use `web_ui` as app name (not `web-ui` or `webui`)
  - Template directory structure must support components and pages

## Subtasks & Detailed Guidance

### T001: Create Django app directory structure

**Goal**: Set up complete directory structure for web_ui app.

**Steps**:
1. Create base directory: `src/web_ui/`
2. Create template directories:
   - `src/web_ui/templates/web_ui/`
   - `src/web_ui/templates/web_ui/base/`
   - `src/web_ui/templates/web_ui/components/`
   - `src/web_ui/templates/web_ui/auth/`
   - `src/web_ui/templates/web_ui/pages/`
3. Create Python package directories:
   - `src/web_ui/context_processors/`
   - `src/web_ui/templatetags/`
4. Create `__init__.py` files in:
   - `src/web_ui/`
   - `src/web_ui/context_processors/`
   - `src/web_ui/templatetags/`
5. Create empty module files:
   - `src/web_ui/apps.py`
   - `src/web_ui/views.py`
   - `src/web_ui/urls.py`
   - `src/web_ui/tests.py`

**Files Created** (8):
- `src/web_ui/__init__.py`
- `src/web_ui/apps.py`
- `src/web_ui/views.py`
- `src/web_ui/urls.py`
- `src/web_ui/tests.py`
- `src/web_ui/context_processors/__init__.py`
- `src/web_ui/templatetags/__init__.py`
- Template directories (created but empty)

**Validation**:
```powershell
# Verify structure
Test-Path src/web_ui/__init__.py
Test-Path src/web_ui/templates/web_ui/base
Test-Path src/web_ui/context_processors/__init__.py
```

**Parallel**: No (blocks all other tasks)

---

### T002: Create AppConfig class

**Goal**: Define Django AppConfig for web_ui app.

**Implementation** (`src/web_ui/apps.py`):
```python
"""Django app configuration for Web UI Baseline."""
from django.apps import AppConfig


class WebUIConfig(AppConfig):
    """Configuration for the web_ui app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'web_ui'
    verbose_name = 'Web UI Baseline'

    def ready(self):
        """Import context processors and template tags when app is ready."""
        # Context processors are registered in settings
        # Template tags are auto-discovered by Django
        pass
```

**Key Points**:
- `name = 'web_ui'` must match directory name
- `verbose_name` appears in Django admin
- `ready()` is for future signal/initialization hooks
- `default_auto_field` sets default primary key type

**Validation**:
```powershell
python manage.py shell -c "from web_ui.apps import WebUIConfig; print(WebUIConfig.name)"
```

**Parallel**: No (depends on T001)

---

### T003: Add web_ui to INSTALLED_APPS

**Goal**: Register the app in Django settings.

**File**: `src/config/settings/base.py`

**Change**:
```python
INSTALLED_APPS = [
    'django_prometheus',  # Must be first
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',
    'drf_spectacular',
    'django_redis',

    # Core apps (in dependency order)
    'security_baseline.apps.SecurityBaselineConfig',
    'constitution_engine.apps.ConstitutionEngineConfig',
    'common.apps.CommonConfig',
    'accounts.apps.AccountsConfig',
    'organisations.apps.OrganisationsConfig',
    'projects.apps.ProjectsConfig',
    'permissions.apps.PermissionsConfig',
    'audit.apps.AuditConfig',
    'settings.apps.SettingsConfig',
    'i18n_preferences.apps.I18nPreferencesConfig',
    'api.apps.ApiConfig',

    # Feature apps
    'web_ui.apps.WebUIConfig',  # B14: Web UI Baseline (NEW)
]
```

**Critical**: Add `web_ui` BEFORE `accounts` if you want web_ui templates to override B05 auth templates. The template loader searches apps in `INSTALLED_APPS` order.

**Validation**:
```powershell
python manage.py check
# Should output: System check identified no issues (0 silenced).
```

**Parallel**: No (depends on T002)

---

### T004: Create app README

**Goal**: Document web_ui app structure and usage.

**File**: `src/web_ui/README.md`

**Content Outline**:

```markdown
# Web UI Baseline

**Purpose**: Provides server-side template infrastructure with semantic HTML, permission-aware navigation, and reusable components.

## Overview

The web_ui app delivers a baseline template system for building server-rendered Django views. It includes:

- Base HTML template with semantic structure
- Context processor for user/permission state
- Permission-aware navigation component
- Reusable form, list, and pagination components
- Integration with B05 authentication

**No CSS/JS is included** - only semantic HTML with class hooks for downstream styling.

## Directory Structure

```
web_ui/
├── __init__.py
├── apps.py              # AppConfig
├── views.py             # Placeholder views (home, orgs, projects, account)
├── urls.py              # URL routing
├── context_processors/
│   ├── __init__.py
│   └── navigation.py    # Exposes user, auth state, permission flags
├── templatetags/
│   ├── __init__.py
│   └── ui_tags.py       # Custom filters (getattribute)
└── templates/web_ui/
    ├── base/
    │   └── base.html    # Root template
    ├── components/
    │   ├── navigation.html
    │   ├── messages.html
    │   ├── form_field.html
    │   ├── form_layout.html
    │   ├── list_table.html
    │   └── pagination.html
    ├── auth/            # B05 auth template overrides
    │   ├── login.html
    │   ├── register.html
    │   ├── password_reset_request.html
    │   └── password_reset_confirm.html
    └── pages/           # Stub views
        ├── home.html
        ├── organisations.html
        ├── projects.html
        └── account.html
```

## Template Blocks Guide

### Safe Blocks (Override Encouraged)

These blocks are designed for downstream customization:

- **`title`**: Page title (appears in `<title>` tag)
- **`extra_head`**: Additional `<head>` content (meta tags, CSS links)
- **`content`**: Main page content (always override in child templates)
- **`extra_scripts`**: Page-specific JavaScript
- **`footer`**: Footer content

**Example**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}My Custom Page{% endblock %}

{% block content %}
<article class="ui-content">
    <h1>Custom Content</h1>
    <p>Your page content here</p>
</article>
{% endblock %}
```

### Internal Blocks (Reserved - Do Not Override)

These blocks are reserved for baseline layout stability:

- **`header_structure`**: Header layout (logo, nav container)
- **`navigation_inner`**: Navigation implementation

Overriding internal blocks may break future updates.

## Context Variables

Available in all templates via `web_ui.context_processors.navigation.navigation_context`:

| Variable | Type | Description |
|----------|------|-------------|
| `user` | User | Current user (from `request.user`) |
| `is_authenticated` | bool | True if user is logged in |
| `can_view_orgs` | bool | Precomputed: `user.has_perm('organisations.view_organisation')` |
| `can_manage_orgs` | bool | Precomputed: `user.has_perm('organisations.manage_organisation')` |
| `can_view_projects` | bool | Precomputed: `user.has_perm('projects.view_project')` |
| `has_perm(perm)` | function | Helper for edge case permission checks |

**Example**:
```html
{% if is_authenticated %}
    <p>Welcome, {{ user.get_short_name }}!</p>

    {% if can_view_orgs %}
        <a href="{% url 'ui_organisations' %}">Organisations</a>
    {% endif %}

    {% if has_perm('custom.special_feature') %}
        <a href="/special/">Special Feature</a>
    {% endif %}
{% endif %}
```

## Using Components

### Form Field

Renders a single form field with label, input, help text, and errors.

```html
{% include "web_ui/components/form_field.html" with field=form.email %}
```

### Form Layout

Complete form with CSRF token and submit button.

```html
{% include "web_ui/components/form_layout.html" with form=my_form action="/submit/" method="post" submit_text="Save" %}
```

### List Table

Display a queryset as a table.

```html
{% load ui_tags %}
{% include "web_ui/components/list_table.html" with objects=projects headers="Name,Owner,Created" fields="name,owner.email,created_at" %}
```

### Pagination

Pagination controls for paginated querysets.

```html
{% include "web_ui/components/pagination.html" with page_obj=projects %}
```

### Messages

Display Django messages framework messages.

```html
{% include "web_ui/components/messages.html" %}
```

## Adding Custom Navigation

Override the `extra_nav_items` block in navigation:

```html
{# In your custom template #}
{% block extra_nav_items %}
    {% if user.is_superuser %}
    <li class="ui-nav__item">
        <a href="/admin/" class="ui-nav__link">Admin</a>
    </li>
    {% endif %}
{% endblock %}
```

## Styling Guide

### CSS Class Hooks

All elements include class hooks for downstream styling:

**Layout**:
- `ui-layout`: Body wrapper
- `ui-header`, `ui-header__inner`, `ui-header__brand`: Header structure
- `ui-nav`, `ui-nav__list`, `ui-nav__item`, `ui-nav__link`: Navigation
- `ui-main`: Main content area
- `ui-footer`, `ui-footer__inner`: Footer

**Components**:
- `ui-message`, `ui-message--{level}`: Messages (success, error, warning, info)
- `ui-form`, `ui-form__field`, `ui-form__label`, `ui-form__errors`: Forms
- `ui-table`, `ui-table__header`, `ui-table__cell`: Tables
- `ui-button`, `ui-button--primary`: Buttons

### No Styles Included

This baseline includes **no CSS**. All styles must be provided by downstream products. The semantic HTML structure ensures usability without styling.

## Integration Points

### B05: Accounts & Authentication

- Authentication views use B05 backend (`accounts.views.login_view`, etc.)
- Templates override B05 templates (via `INSTALLED_APPS` order)
- Login/logout/register URLs from B05: `/accounts/login/`, `/accounts/logout/`

### B06: Organisations

- Organisations list view queries `organisations.models.Organisation`
- Permission checks use B08 permissions

### B07: Projects

- Projects list view queries `projects.models.Project`
- Uses `select_related()` to avoid N+1 queries

### B08: Hierarchical Access Control

- Context processor precomputes permission flags
- Navigation visibility driven by permissions

## Configuration

Add to `src/config/settings/base.py`:

```python
# Web UI Configuration
SITE_NAME = "Django Core"  # Used in page titles and branding
```

## Extension Patterns

### Custom Dashboard

```python
# views.py
from django.contrib.auth.decorators import login_required
from django.shortcuts import render

@login_required
def dashboard(request):
    context = {
        'page_title': 'Dashboard',
        'stats': get_dashboard_stats(request.user),
    }
    return render(request, 'myapp/dashboard.html', context)
```

```html
{# templates/myapp/dashboard.html #}
{% extends "web_ui/base/base.html" %}

{% block title %}Dashboard{% endblock %}

{% block content %}
<article class="ui-content">
    <h1>My Dashboard</h1>
    {# Your custom content #}
</article>
{% endblock %}
```

### Custom Form Page

```python
# forms.py
from django import forms

class ContactForm(forms.Form):
    name = forms.CharField(max_length=100)
    email = forms.EmailField()
    message = forms.CharField(widget=forms.Textarea)
```

```html
{# templates/myapp/contact.html #}
{% extends "web_ui/base/base.html" %}

{% block title %}Contact Us{% endblock %}

{% block content %}
<article class="ui-content">
    <h1>Contact Us</h1>
    {% include "web_ui/components/form_layout.html" with form=form action="." method="post" submit_text="Send Message" %}
</article>
{% endblock %}
```

## Testing

Run web_ui tests:

```powershell
pytest tests/web_ui/ -v
pytest tests/web_ui/ --cov=src/web_ui --cov-report=term-missing
```

## License

Part of Django Core-App. See root LICENSE file.
```

**Parallel**: Yes (can work while T002-T003 in progress)

---

## Definition of Done

- [ ] All 4 subtasks completed (T001-T004)
- [ ] Directory structure exists and follows Django conventions
- [ ] `WebUIConfig` class properly configured
- [ ] `web_ui` registered in `INSTALLED_APPS`
- [ ] `python manage.py check` passes with no errors
- [ ] README.md complete with usage examples
- [ ] No test failures (no tests exist yet for WP01)

## Dependencies

- **Requires**: None (foundational work package)
- **Blocks**: WP02, WP03, WP04, WP05, WP06 (all depend on app structure)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| App name conflicts with existing packages | High | Verify `web_ui` not used in dependencies |
| Template directory structure incorrect | Medium | Follow Django conventions, validate with test render |
| INSTALLED_APPS order issues | Medium | Place `web_ui` before `accounts` for template override |

## Test Strategy

No automated tests for WP01. Validation via:
1. `python manage.py check` (Django system check)
2. Manual verification of directory structure
3. AppConfig import test
4. README completeness review

## Reviewer Guidance

**What to verify**:
1. Directory structure matches spec exactly
2. `WebUIConfig` has all required properties
3. App registered in correct position in `INSTALLED_APPS`
4. README is comprehensive and includes code examples
5. No errors when running `python manage.py check`

**Red flags**:
- Missing `__init__.py` files (breaks Python package)
- Wrong app name (must be `web_ui`, not `web-ui`)
- README is stub or missing usage examples
- `INSTALLED_APPS` has `web_ui` after `accounts` (breaks template override)

**Approval criteria**:
- All files created and in correct locations
- Django recognizes the app (no errors on startup)
- README provides clear guidance for developers

## Activity Log

- 2025-11-30T08:49:13Z – claude – shell_pid=11588 – lane=doing – Started WP01 implementation
