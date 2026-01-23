# Implementation Plan: Web UI Baseline
*Path: kitty-specs/014-web-ui-baseline/plan.md*

**Feature Branch**: `014-web-ui-baseline`
**Created**: 2025-11-30
**Status**: Ready for Implementation
**Based on**: [spec.md](spec.md)

## Overview

This plan breaks down the B14 Web UI Baseline feature into sequenced work packages. The feature provides server-side template infrastructure with:
- Base HTML templates with semantic structure
- Context-aware navigation with permission checks
- Reusable template components
- Functional authentication views
- Stub views for organisations/projects

**Key Architectural Decisions** (from clarifications):
1. No CSS/JS initially - pure HTML with class hooks
2. Hybrid permission approach - precomputed flags + helper for edge cases
3. Two-tier block system - safe vs. internal blocks
4. Mixed view implementation - auth functional, others stubs

## Work Package Sequencing

```
WP01 (Django App Setup)
  ↓
WP02 (Base Templates & Context Processor) ← Core infrastructure
  ↓
WP03 (Navigation & Permissions) ← Depends on WP02 context
  ↓
WP04 (Reusable Components) ← Can parallelize with WP05
  ↓
WP05 (Authentication Views) ← Integrates B05
  ↓
WP06 (Stub Views & URL Routing) ← Depends on templates from WP02
  ↓
WP07 (Testing & Documentation)
```

**Estimated Duration**: 5-7 days (1 developer)

---

## WP01: Django App Setup & Configuration

**Goal**: Create `web_ui` Django app with proper structure and registration.

**Priority**: P0 (Foundational)
**Estimated Effort**: 2 hours
**Parallel**: No (blocks all other work)

### Tasks

#### T001: Create Django app directory structure
**Description**: Create `src/web_ui/` app with standard Django structure.

**Steps**:
1. Create directory: `src/web_ui/`
2. Create subdirectories:
   - `templates/web_ui/`
   - `templates/web_ui/base/`
   - `templates/web_ui/components/`
   - `templates/web_ui/auth/`
   - `templates/web_ui/pages/`
   - `templatetags/`
   - `context_processors/`
3. Create empty `__init__.py` files in:
   - `src/web_ui/`
   - `src/web_ui/templatetags/`
   - `src/web_ui/context_processors/`

**Files Created**:
- `src/web_ui/__init__.py`
- `src/web_ui/apps.py`
- `src/web_ui/views.py`
- `src/web_ui/urls.py`
- `src/web_ui/context_processors/__init__.py`
- `src/web_ui/templatetags/__init__.py`
- `src/web_ui/tests.py`

**Acceptance**: Directory structure exists, all `__init__.py` files present.

---

#### T002: Create AppConfig class
**Description**: Define `WebUIConfig` app configuration.

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

**Acceptance**: AppConfig importable, `name` and `verbose_name` set correctly.

---

#### T003: Add web_ui to INSTALLED_APPS
**Description**: Register app in Django settings.

**Steps**:
1. Open `src/config/settings/base.py`
2. Add to `INSTALLED_APPS` after existing apps:
   ```python
   INSTALLED_APPS = [
       # ... existing apps ...
       'web_ui.apps.WebUIConfig',  # B14: Web UI Baseline
   ]
   ```

**Acceptance**: `python manage.py check` passes without errors.

---

#### T004: Create app README
**Description**: Document purpose, structure, and extension guide.

**File**: `src/web_ui/README.md`

**Content Outline**:
- Overview: Server-side template baseline
- Directory structure
- Template blocks (safe vs. internal)
- Context processor available variables
- How to extend base templates
- How to add custom navigation items
- Integration with B05 auth

**Acceptance**: README exists with all sections.

---

## WP02: Base Templates & Context Processor

**Goal**: Create foundational base.html template and context processor with permission flags.

**Priority**: P0 (Foundational)
**Estimated Effort**: 6 hours
**Parallel**: No (blocks WP03, WP04, WP06)
**Dependencies**: WP01

### Tasks

#### T005: Create context processor with permission flags
**Description**: Build context processor that exposes user, auth state, and precomputed permission booleans.

**Implementation** (`src/web_ui/context_processors/navigation.py`):
```python
"""Context processor for navigation and user state."""
from typing import Any, Dict
from django.http import HttpRequest


def navigation_context(request: HttpRequest) -> Dict[str, Any]:
    """
    Provide navigation context for all templates.

    Exposes:
    - user: Current user (from request.user)
    - is_authenticated: Boolean auth state
    - can_view_orgs: Boolean permission flag
    - can_manage_orgs: Boolean permission flag
    - can_view_projects: Boolean permission flag
    - has_perm: Permission helper function
    """
    user = request.user
    context = {
        'user': user,
        'is_authenticated': user.is_authenticated,
    }

    # Precompute permission flags for navigation
    if user.is_authenticated:
        # Use B08 permission checking (adjust based on actual B08 API)
        context['can_view_orgs'] = user.has_perm('organisations.view_organisation')
        context['can_manage_orgs'] = user.has_perm('organisations.manage_organisation')
        context['can_view_projects'] = user.has_perm('projects.view_project')
    else:
        # Anonymous user - no permissions
        context['can_view_orgs'] = False
        context['can_manage_orgs'] = False
        context['can_view_projects'] = False

    # Provide helper for edge case permission checks
    def has_perm(perm: str) -> bool:
        return user.has_perm(perm) if user.is_authenticated else False

    context['has_perm'] = has_perm

    return context
```

**Performance Note**: Precomputed flags avoid N+1 queries in navigation rendering. Should execute in < 5ms (SC-010).

**Acceptance**: Context processor importable, returns correct keys.

---

#### T006: Register context processor in settings
**Description**: Add context processor to TEMPLATES configuration.

**Steps**:
1. Open `src/config/settings/base.py`
2. Locate `TEMPLATES[0]['OPTIONS']['context_processors']`
3. Add `'web_ui.context_processors.navigation.navigation_context',`

**Example**:
```python
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'web_ui.context_processors.navigation.navigation_context',  # NEW
            ],
        },
    },
]
```

**Acceptance**: Context processor registered, accessible in templates.

---

#### T007: Create base.html template with block structure
**Description**: Implement base template with semantic HTML5 and two-tier block system.

**File**: `src/web_ui/templates/web_ui/base/base.html`

**Implementation**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}{{ page_title|default:"Dashboard" }}{% endblock %} | {{ site_name|default:"Django Core" }}</title>

    {% comment %}
    SAFE BLOCK: extra_head
    Downstream templates can override to add custom meta tags, CSS links, etc.
    {% endcomment %}
    {% block extra_head %}{% endblock %}
</head>
<body class="ui-layout">
    <header class="ui-header">
        {% comment %}
        INTERNAL BLOCK: header_structure
        Reserved for baseline layout - do not override.
        {% endcomment %}
        {% block header_structure %}
        <div class="ui-header__inner">
            <div class="ui-header__brand">
                <a href="{% url 'ui_home' %}" class="ui-brand-link">{{ site_name|default:"Django Core" }}</a>
            </div>
            <nav class="ui-nav">
                {% comment %}
                INTERNAL BLOCK: navigation_inner
                Reserved for baseline navigation structure - do not override.
                Use extra_nav_items for additions.
                {% endcomment %}
                {% block navigation_inner %}
                {% include "web_ui/components/navigation.html" %}
                {% endblock %}
            </nav>
        </div>
        {% endblock %}
    </header>

    <main class="ui-main">
        {% comment %}
        SAFE BLOCK: messages
        Override to customize message display (but default should work).
        {% endcomment %}
        {% block messages %}
        {% include "web_ui/components/messages.html" %}
        {% endblock %}

        {% comment %}
        SAFE BLOCK: content
        Primary block for page content - always override in child templates.
        {% endcomment %}
        {% block content %}
        <article class="ui-content">
            <p>Base template content block - override in child templates</p>
        </article>
        {% endblock %}
    </main>

    <footer class="ui-footer">
        {% block footer %}
        <div class="ui-footer__inner">
            <p>&copy; 2025 Django Core. All rights reserved.</p>
        </div>
        {% endblock %}
    </footer>

    {% comment %}
    SAFE BLOCK: extra_scripts
    Override to add page-specific JavaScript.
    {% endcomment %}
    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

**CSS Class Hooks** (no styles implemented):
- `ui-layout`: Body layout wrapper
- `ui-header`, `ui-header__inner`, `ui-header__brand`: Header structure
- `ui-nav`: Navigation container
- `ui-main`: Main content area
- `ui-content`: Article/content wrapper
- `ui-footer`, `ui-footer__inner`: Footer structure
- `ui-message`, `ui-message--{level}`: Message display (in components)

**Block Documentation**:
- **Safe blocks** (downstream override): `title`, `extra_head`, `content`, `extra_scripts`, `footer`
- **Internal blocks** (reserved): `header_structure`, `navigation_inner`

**Acceptance**: Template renders without errors, includes all blocks, uses semantic HTML5.

---

#### T008: Create site configuration in settings
**Description**: Add `SITE_NAME` setting for page titles.

**Steps**:
1. Open `src/config/settings/base.py`
2. Add near bottom (before conditional imports):
   ```python
   # Web UI Configuration
   SITE_NAME = "Django Core"  # Used in page titles and branding
   ```

**Acceptance**: Setting accessible in templates via `{{ site_name }}`.

---

## WP03: Navigation & Permission-Based Visibility

**Goal**: Build navigation component with authentication and permission-aware visibility.

**Priority**: P1 (Core UX)
**Estimated Effort**: 4 hours
**Parallel**: No (depends on WP02)
**Dependencies**: WP02

### Tasks

#### T009: Create navigation component template
**Description**: Build reusable navigation template with conditional visibility.

**File**: `src/web_ui/templates/web_ui/components/navigation.html`

**Implementation**:
```html
{% comment %}
Navigation component - uses context from navigation_context processor
Visibility rules:
- Anonymous: Login, Register
- Authenticated: Account, Logout, permission-based sections
{% endcomment %}

<ul class="ui-nav__list">
    <li class="ui-nav__item">
        <a href="{% url 'ui_home' %}" class="ui-nav__link">Home</a>
    </li>

    {% if is_authenticated %}
        {# Authenticated user navigation #}

        {% if can_view_orgs %}
        <li class="ui-nav__item">
            <a href="{% url 'ui_organisations' %}" class="ui-nav__link">Organisations</a>
        </li>
        {% endif %}

        {% if can_view_projects %}
        <li class="ui-nav__item">
            <a href="{% url 'ui_projects' %}" class="ui-nav__link">Projects</a>
        </li>
        {% endif %}

        {% comment %}
        SAFE BLOCK: extra_nav_items
        Downstream templates can add custom navigation items here.
        {% endcomment %}
        {% block extra_nav_items %}{% endblock %}

        <li class="ui-nav__item ui-nav__item--account">
            <a href="{% url 'ui_account' %}" class="ui-nav__link">
                {{ user.get_short_name|default:user.email }}
            </a>
        </li>

        <li class="ui-nav__item">
            <a href="{% url 'logout' %}" class="ui-nav__link">Logout</a>
        </li>

    {% else %}
        {# Anonymous user navigation #}
        <li class="ui-nav__item">
            <a href="{% url 'login' %}" class="ui-nav__link">Login</a>
        </li>
        <li class="ui-nav__item">
            <a href="{% url 'register' %}" class="ui-nav__link">Register</a>
        </li>
    {% endif %}
</ul>
```

**CSS Class Hooks**:
- `ui-nav__list`: Navigation list wrapper
- `ui-nav__item`: Individual nav item
- `ui-nav__item--account`: User account link (for special styling)
- `ui-nav__link`: Navigation link

**Edge Cases Handled**:
- Anonymous user: Only public links visible
- User with no permissions: Only account/logout visible
- Long names: Will truncate via CSS (downstream responsibility)

**Acceptance**: Navigation renders correctly for auth/anon users, permission checks work.

---

#### T010: Handle empty navigation state edge case
**Description**: Test and verify navigation behavior when user has no permissions.

**Validation**:
1. Create test user with no permissions
2. Login, verify navigation shows only "Home", "Account", "Logout"
3. No errors or empty sections

**Acceptance**: Navigation gracefully handles zero permissions.

---

#### T011: Handle long entity names edge case
**Description**: Add title attribute for full name display on hover.

**Update**: `src/web_ui/templates/web_ui/components/navigation.html`

**Change** (line ~38):
```html
<a href="{% url 'ui_account' %}" class="ui-nav__link" title="{{ user.email }}">
    {{ user.get_short_name|default:user.email }}
</a>
```

**Acceptance**: Hover on account link shows full email in tooltip.

---

## WP04: Reusable Template Components

**Goal**: Create template includes for messages, form fields, lists, and pagination.

**Priority**: P2 (Developer QoL)
**Estimated Effort**: 5 hours
**Parallel**: Yes (can parallelize with WP05)
**Dependencies**: WP02

### Tasks

#### T012: Create messages component
**Description**: Build reusable message display component.

**File**: `src/web_ui/templates/web_ui/components/messages.html`

**Implementation**:
```html
{% comment %}
Django messages framework display component
Supports: success, error, warning, info, debug
{% endcomment %}

{% if messages %}
<div class="ui-messages">
    {% for message in messages %}
    <div class="ui-message ui-message--{{ message.tags }}" role="alert">
        <p class="ui-message__text">{{ message }}</p>
    </div>
    {% endfor %}
</div>
{% endif %}
```

**CSS Class Hooks**:
- `ui-messages`: Container for all messages
- `ui-message`: Individual message wrapper
- `ui-message--success`, `ui-message--error`, `ui-message--warning`, `ui-message--info`: Level-specific classes
- `ui-message__text`: Message text

**Acceptance**: Messages display correctly, all levels supported, ARIA role set.

---

#### T013: Create form_field component
**Description**: Reusable template for rendering individual form fields.

**File**: `src/web_ui/templates/web_ui/components/form_field.html`

**Implementation**:
```html
{% comment %}
Reusable form field component
Usage: {% include "web_ui/components/form_field.html" with field=form.email %}
{% endcomment %}

<div class="ui-form-field{% if field.errors %} ui-form-field--error{% endif %}">
    <label for="{{ field.id_for_label }}" class="ui-form-field__label">
        {{ field.label }}
        {% if field.field.required %}<span class="ui-form-field__required">*</span>{% endif %}
    </label>

    {{ field }}

    {% if field.help_text %}
    <p class="ui-form-field__help">{{ field.help_text }}</p>
    {% endif %}

    {% if field.errors %}
    <ul class="ui-form-field__errors">
        {% for error in field.errors %}
        <li class="ui-form-field__error">{{ error }}</li>
        {% endfor %}
    </ul>
    {% endif %}
</div>
```

**CSS Class Hooks**:
- `ui-form-field`: Field wrapper
- `ui-form-field--error`: Error state modifier
- `ui-form-field__label`: Label element
- `ui-form-field__required`: Required indicator
- `ui-form-field__help`: Help text
- `ui-form-field__errors`: Error list wrapper
- `ui-form-field__error`: Individual error

**Acceptance**: Form fields render with label, input, help text, errors correctly.

---

#### T014: Create form_layout component
**Description**: Wrapper for complete forms with CSRF and submit button.

**File**: `src/web_ui/templates/web_ui/components/form_layout.html`

**Implementation**:
```html
{% comment %}
Complete form layout component
Usage: {% include "web_ui/components/form_layout.html" with form=my_form action="/submit/" method="post" submit_text="Save" %}
{% endcomment %}

<form method="{{ method|default:'post' }}" action="{{ action }}" class="ui-form">
    {% csrf_token %}

    {% if form.non_field_errors %}
    <div class="ui-form__errors">
        {{ form.non_field_errors }}
    </div>
    {% endif %}

    <div class="ui-form__fields">
        {% for field in form %}
            {% include "web_ui/components/form_field.html" with field=field %}
        {% endfor %}
    </div>

    <div class="ui-form__actions">
        <button type="submit" class="ui-button ui-button--primary">
            {{ submit_text|default:"Submit" }}
        </button>
    </div>
</form>
```

**CSS Class Hooks**:
- `ui-form`: Form wrapper
- `ui-form__errors`: Non-field errors
- `ui-form__fields`: Fields container
- `ui-form__actions`: Button container
- `ui-button`, `ui-button--primary`: Button styles

**Acceptance**: Forms render with CSRF token, all fields, submit button.

---

#### T015: Create list_table component
**Description**: Reusable table for displaying querysets.

**File**: `src/web_ui/templates/web_ui/components/list_table.html`

**Implementation**:
```html
{% comment %}
Reusable table list component
Usage: {% include "web_ui/components/list_table.html" with objects=projects headers="Name,Owner,Created" fields="name,owner.email,created_at" %}
{% endcomment %}

<table class="ui-table">
    <thead class="ui-table__head">
        <tr class="ui-table__row">
            {% for header in headers.split:"," %}
            <th class="ui-table__header">{{ header|trim }}</th>
            {% endfor %}
        </tr>
    </thead>
    <tbody class="ui-table__body">
        {% for obj in objects %}
        <tr class="ui-table__row">
            {% for field in fields.split:"," %}
            <td class="ui-table__cell">
                {% with field_name=field|trim %}
                {{ obj|getattribute:field_name|default:"—" }}
                {% endwith %}
            </td>
            {% endfor %}
        </tr>
        {% empty %}
        <tr class="ui-table__row ui-table__row--empty">
            <td class="ui-table__cell" colspan="{{ headers.split:','|length }}">
                {{ empty_message|default:"No items found." }}
            </td>
        </tr>
        {% endfor %}
    </tbody>
</table>
```

**Note**: Requires custom template filter `getattribute` for dynamic field access. Create in `src/web_ui/templatetags/ui_tags.py`.

**CSS Class Hooks**:
- `ui-table`: Table wrapper
- `ui-table__head`: Table head
- `ui-table__body`: Table body
- `ui-table__row`: Table row
- `ui-table__row--empty`: Empty state row
- `ui-table__header`: Header cell
- `ui-table__cell`: Data cell

**Acceptance**: Tables render with headers, data, empty state correctly.

---

#### T016: Create pagination component
**Description**: Reusable pagination controls.

**File**: `src/web_ui/templates/web_ui/components/pagination.html`

**Implementation**:
```html
{% comment %}
Pagination component
Usage: {% include "web_ui/components/pagination.html" with page_obj=projects %}
{% endcomment %}

{% if page_obj.has_other_pages %}
<nav class="ui-pagination" aria-label="Pagination">
    <ul class="ui-pagination__list">
        {% if page_obj.has_previous %}
        <li class="ui-pagination__item">
            <a href="?page=1" class="ui-pagination__link">First</a>
        </li>
        <li class="ui-pagination__item">
            <a href="?page={{ page_obj.previous_page_number }}" class="ui-pagination__link">Previous</a>
        </li>
        {% endif %}

        <li class="ui-pagination__item ui-pagination__item--current">
            <span class="ui-pagination__current">
                Page {{ page_obj.number }} of {{ page_obj.paginator.num_pages }}
            </span>
        </li>

        {% if page_obj.has_next %}
        <li class="ui-pagination__item">
            <a href="?page={{ page_obj.next_page_number }}" class="ui-pagination__link">Next</a>
        </li>
        <li class="ui-pagination__item">
            <a href="?page={{ page_obj.paginator.num_pages }}" class="ui-pagination__link">Last</a>
        </li>
        {% endif %}
    </ul>
</nav>
{% endif %}
```

**CSS Class Hooks**:
- `ui-pagination`: Pagination wrapper
- `ui-pagination__list`: Link list
- `ui-pagination__item`: Individual item
- `ui-pagination__item--current`: Current page indicator
- `ui-pagination__link`: Page link
- `ui-pagination__current`: Current page text

**Acceptance**: Pagination renders with first/prev/next/last links, current page highlighted.

---

#### T017: Create custom template filter for dynamic attributes
**Description**: Build `getattribute` filter for list_table component.

**File**: `src/web_ui/templatetags/ui_tags.py`

**Implementation**:
```python
"""Custom template tags and filters for web_ui."""
from django import template

register = template.Library()


@register.filter
def getattribute(obj, attr_path: str):
    """
    Get nested attribute from object using dot notation.

    Usage: {{ obj|getattribute:"owner.email" }}
    """
    attrs = attr_path.split('.')
    value = obj
    for attr in attrs:
        try:
            value = getattr(value, attr)
            if callable(value):
                value = value()
        except (AttributeError, TypeError):
            return None
    return value
```

**Acceptance**: Filter works with nested attributes (`obj.owner.email`), returns None for missing attrs.

---

## WP05: Authentication Views Integration

**Goal**: Integrate B05 authentication views with web_ui templates.

**Priority**: P1 (Functional baseline)
**Estimated Effort**: 4 hours
**Parallel**: Yes (can parallelize with WP04)
**Dependencies**: WP02

### Tasks

#### T018: Override B05 login template
**Description**: Create web_ui version of login template extending base.html.

**File**: `src/web_ui/templates/web_ui/auth/login.html`

**Implementation**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Login{% endblock %}

{% block content %}
<article class="ui-content ui-auth-page">
    <header class="ui-auth-page__header">
        <h1 class="ui-heading">Sign In</h1>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form action="{% url 'login' %}" method="post" submit_text="Sign In" %}

    <footer class="ui-auth-page__footer">
        <p>Don't have an account? <a href="{% url 'register' %}" class="ui-link">Register here</a></p>
        <p><a href="{% url 'password_reset_request' %}" class="ui-link">Forgot password?</a></p>
    </footer>
</article>
{% endblock %}
```

**Integration Note**: B05 login view (`accounts.views.login_view`) already exists. This template replaces the existing `accounts/registration/login.html` for web_ui styling.

**CSS Class Hooks**:
- `ui-auth-page`: Auth page wrapper
- `ui-auth-page__header`: Header section
- `ui-auth-page__footer`: Footer section
- `ui-heading`: Page heading
- `ui-link`: Standard link

**Acceptance**: Login page renders with base template, form submits to B05 view, success redirects work.

---

#### T019: Override B05 register template
**Description**: Create web_ui version of registration template.

**File**: `src/web_ui/templates/web_ui/auth/register.html`

**Implementation**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Register{% endblock %}

{% block content %}
<article class="ui-content ui-auth-page">
    <header class="ui-auth-page__header">
        <h1 class="ui-heading">Create Account</h1>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form action="{% url 'register' %}" method="post" submit_text="Register" %}

    <footer class="ui-auth-page__footer">
        <p>Already have an account? <a href="{% url 'login' %}" class="ui-link">Sign in</a></p>
    </footer>
</article>
{% endblock %}
```

**Acceptance**: Register page renders with base template, form submits to B05 view.

---

#### T020: Override B05 password reset request template
**Description**: Create web_ui version of password reset request.

**File**: `src/web_ui/templates/web_ui/auth/password_reset_request.html`

**Implementation**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Reset Password{% endblock %}

{% block content %}
<article class="ui-content ui-auth-page">
    <header class="ui-auth-page__header">
        <h1 class="ui-heading">Reset Password</h1>
        <p>Enter your email address and we'll send you a password reset link.</p>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form action="{% url 'password_reset_request' %}" method="post" submit_text="Send Reset Link" %}

    <footer class="ui-auth-page__footer">
        <p><a href="{% url 'login' %}" class="ui-link">Back to login</a></p>
    </footer>
</article>
{% endblock %}
```

**Acceptance**: Password reset request page renders, form submits to B05 view.

---

#### T021: Override B05 password reset confirm template
**Description**: Create web_ui version of password reset confirmation.

**File**: `src/web_ui/templates/web_ui/auth/password_reset_confirm.html`

**Implementation**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Set New Password{% endblock %}

{% block content %}
<article class="ui-content ui-auth-page">
    <header class="ui-auth-page__header">
        <h1 class="ui-heading">Set New Password</h1>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form action="" method="post" submit_text="Reset Password" %}

    <footer class="ui-auth-page__footer">
        <p><a href="{% url 'login' %}" class="ui-link">Back to login</a></p>
    </footer>
</article>
{% endblock %}
```

**Acceptance**: Password reset confirm page renders, form submits to B05 view.

---

#### T022: Configure template directories in settings
**Description**: Ensure web_ui templates override B05 templates.

**Steps**:
1. Open `src/config/settings/base.py`
2. Update `TEMPLATES[0]['DIRS']`:
   ```python
   TEMPLATES = [
       {
           'BACKEND': 'django.template.backends.django.DjangoTemplates',
           'DIRS': [
               BASE_DIR / 'web_ui' / 'templates',  # NEW: web_ui templates first
           ],
           'APP_DIRS': True,
           # ... rest of config
       },
   ]
   ```

**Note**: With `APP_DIRS=True`, Django searches app directories automatically. Adding `web_ui/templates` to `DIRS` ensures web_ui templates are found first.

**Alternative**: Keep `DIRS=[]` and rely on app order in `INSTALLED_APPS` (web_ui before accounts). This is simpler.

**Recommended**: Keep `DIRS=[]`, ensure `web_ui` appears before `accounts` in `INSTALLED_APPS`.

**Acceptance**: Web UI templates render instead of B05 templates when URLs accessed.

---

## WP06: Stub Views & URL Routing

**Goal**: Create placeholder views for home, organisations, projects, account.

**Priority**: P2 (Completes baseline)
**Estimated Effort**: 3 hours
**Parallel**: No (depends on WP02 templates)
**Dependencies**: WP02, WP03

### Tasks

#### T023: Create home/dashboard view
**Description**: Simple landing page showing welcome message.

**Implementation** (`src/web_ui/views.py`):
```python
"""Views for Web UI Baseline."""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from typing import Any, Dict
from django.http import HttpRequest, HttpResponse


def home(request: HttpRequest) -> HttpResponse:
    """Home/dashboard page."""
    context: Dict[str, Any] = {
        'page_title': 'Dashboard',
    }
    return render(request, 'web_ui/pages/home.html', context)
```

**Template** (`src/web_ui/templates/web_ui/pages/home.html`):
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Dashboard{% endblock %}

{% block content %}
<article class="ui-content">
    <header>
        <h1 class="ui-heading">Welcome{% if is_authenticated %}, {{ user.get_short_name }}{% endif %}!</h1>
    </header>

    <section class="ui-section">
        {% if is_authenticated %}
        <p>You are logged in as <strong>{{ user.email }}</strong>.</p>

        <div class="ui-card-grid">
            {% if can_view_orgs %}
            <div class="ui-card">
                <h2 class="ui-card__title">Organisations</h2>
                <p>Manage your organisations</p>
                <a href="{% url 'ui_organisations' %}" class="ui-button">View Organisations</a>
            </div>
            {% endif %}

            {% if can_view_projects %}
            <div class="ui-card">
                <h2 class="ui-card__title">Projects</h2>
                <p>Manage your projects</p>
                <a href="{% url 'ui_projects' %}" class="ui-button">View Projects</a>
            </div>
            {% endif %}
        </div>
        {% else %}
        <p>This is the Django Core Web UI Baseline.</p>
        <p><a href="{% url 'login' %}" class="ui-button ui-button--primary">Get Started</a></p>
        {% endif %}
    </section>
</article>
{% endblock %}
```

**CSS Class Hooks**:
- `ui-content`: Content wrapper
- `ui-section`: Content section
- `ui-card-grid`: Card container
- `ui-card`, `ui-card__title`: Card component
- `ui-button`, `ui-button--primary`: Button styles

**Acceptance**: Home page renders, shows contextual content based on auth state.

---

#### T024: Create organisations list stub view
**Description**: Simple view listing organisations (read-only stub).

**Implementation** (`src/web_ui/views.py`):
```python
@login_required
def organisations_list(request: HttpRequest) -> HttpResponse:
    """List organisations for current user (stub)."""
    from organisations.models import Organisation

    # Simple queryset - no complex filtering yet
    organisations = Organisation.objects.filter(
        members=request.user
    ).order_by('name')

    context: Dict[str, Any] = {
        'page_title': 'Organisations',
        'organisations': organisations,
    }
    return render(request, 'web_ui/pages/organisations.html', context)
```

**Template** (`src/web_ui/templates/web_ui/pages/organisations.html`):
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Organisations{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading">Organisations</h1>
    </header>

    {% if organisations %}
        {% include "web_ui/components/list_table.html" with objects=organisations headers="Name,Created" fields="name,created_at" %}
    {% else %}
    <section class="ui-empty-state">
        <p>You are not a member of any organisations yet.</p>
    </section>
    {% endif %}
</article>
{% endblock %}
```

**CSS Class Hooks**:
- `ui-content__header`: Content header
- `ui-empty-state`: Empty state message

**Acceptance**: Organisations list renders, shows user's organisations or empty state.

---

#### T025: Create projects list stub view
**Description**: Simple view listing projects (read-only stub).

**Implementation** (`src/web_ui/views.py`):
```python
@login_required
def projects_list(request: HttpRequest) -> HttpResponse:
    """List projects for current user (stub)."""
    from projects.models import Project

    # Simple queryset - show projects in user's organisations
    projects = Project.objects.filter(
        organisation__members=request.user
    ).select_related('organisation', 'owner').order_by('-created_at')

    context: Dict[str, Any] = {
        'page_title': 'Projects',
        'projects': projects,
    }
    return render(request, 'web_ui/pages/projects.html', context)
```

**Template** (`src/web_ui/templates/web_ui/pages/projects.html`):
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Projects{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading">Projects</h1>
    </header>

    {% if projects %}
        {% include "web_ui/components/list_table.html" with objects=projects headers="Name,Organisation,Owner,Created" fields="name,organisation.name,owner.email,created_at" %}
    {% else %}
    <section class="ui-empty-state">
        <p>No projects found.</p>
    </section>
    {% endif %}
</article>
{% endblock %}
```

**Acceptance**: Projects list renders, shows user's projects or empty state.

---

#### T026: Create account settings stub view
**Description**: Simple account info display (no editing yet).

**Implementation** (`src/web_ui/views.py`):
```python
@login_required
def account_settings(request: HttpRequest) -> HttpResponse:
    """Account settings page (stub)."""
    context: Dict[str, Any] = {
        'page_title': 'Account Settings',
    }
    return render(request, 'web_ui/pages/account.html', context)
```

**Template** (`src/web_ui/templates/web_ui/pages/account.html`):
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Account Settings{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading">Account Settings</h1>
    </header>

    <section class="ui-section">
        <h2 class="ui-subheading">Profile Information</h2>
        <dl class="ui-definition-list">
            <dt class="ui-definition-list__term">Email</dt>
            <dd class="ui-definition-list__detail">{{ user.email }}</dd>

            <dt class="ui-definition-list__term">Name</dt>
            <dd class="ui-definition-list__detail">{{ user.get_full_name|default:"Not set" }}</dd>

            <dt class="ui-definition-list__term">Account Created</dt>
            <dd class="ui-definition-list__detail">{{ user.date_joined|date:"F j, Y" }}</dd>

            <dt class="ui-definition-list__term">Email Verified</dt>
            <dd class="ui-definition-list__detail">{{ user.email_verified|yesno:"Yes,No" }}</dd>
        </dl>
    </section>

    <section class="ui-section">
        <p class="ui-note">Account editing functionality will be added in a future release.</p>
    </section>
</article>
{% endblock %}
```

**CSS Class Hooks**:
- `ui-subheading`: Section subheading
- `ui-definition-list`: Definition list wrapper
- `ui-definition-list__term`: Term element
- `ui-definition-list__detail`: Detail element
- `ui-note`: Informational note

**Acceptance**: Account page renders, shows user info, indicates editing not yet available.

---

#### T027: Create URL configuration for web_ui views
**Description**: Add URL patterns for all web_ui views.

**File**: `src/web_ui/urls.py`

**Implementation**:
```python
"""URL configuration for Web UI Baseline."""
from django.urls import path
from web_ui import views

urlpatterns = [
    path('', views.home, name='ui_home'),
    path('organisations/', views.organisations_list, name='ui_organisations'),
    path('projects/', views.projects_list, name='ui_projects'),
    path('account/', views.account_settings, name='ui_account'),
]
```

**Acceptance**: URLs defined, all views routable.

---

#### T028: Include web_ui URLs in main URLconf
**Description**: Add web_ui URLs to main routing.

**Steps**:
1. Open `src/config/urls.py`
2. Add import: `from django.urls import include`
3. Add URL pattern:
   ```python
   urlpatterns = [
       path('admin/', admin.site.urls),
       path('accounts/', include('accounts.urls')),  # B05 auth
       # ... other URL patterns ...
       path('', include('web_ui.urls')),  # B14 Web UI (root)
   ]
   ```

**Acceptance**: All web_ui URLs accessible, no routing conflicts with B05.

---

## WP07: Testing & Documentation

**Goal**: Comprehensive test coverage and usage documentation.

**Priority**: P1 (Quality gate)
**Estimated Effort**: 6 hours
**Parallel**: No (requires all implementation complete)
**Dependencies**: WP01-WP06

### Tasks

#### T029: Write template rendering tests
**Description**: Test base template and components render correctly.

**File**: `tests/web_ui/test_templates.py`

**Implementation**:
```python
"""Tests for web_ui template rendering."""
import pytest
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from accounts.models import User


@pytest.mark.django_db
class TestBaseTemplate:
    """Tests for base.html template."""

    def test_base_template_renders(self, rf: RequestFactory):
        """Base template renders without errors."""
        request = rf.get('/')
        request.user = AnonymousUser()

        from django.template.loader import render_to_string
        html = render_to_string('web_ui/base/base.html', request=request)

        assert '<html' in html
        assert '<title>' in html
        assert '</html>' in html

    def test_base_template_includes_blocks(self, rf: RequestFactory):
        """Base template includes all required blocks."""
        request = rf.get('/')
        request.user = AnonymousUser()

        from django.template.loader import render_to_string
        html = render_to_string('web_ui/base/base.html', request=request)

        # Check semantic HTML5 elements
        assert '<header' in html
        assert '<nav' in html
        assert '<main' in html
        assert '<footer' in html


@pytest.mark.django_db
class TestNavigationComponent:
    """Tests for navigation component."""

    def test_navigation_anonymous_user(self, rf: RequestFactory):
        """Anonymous user sees Login and Register links."""
        request = rf.get('/')
        request.user = AnonymousUser()

        from django.template.loader import render_to_string
        html = render_to_string('web_ui/components/navigation.html', request=request)

        assert 'Login' in html
        assert 'Register' in html
        assert 'Logout' not in html

    def test_navigation_authenticated_user(self, rf: RequestFactory, verified_user: User):
        """Authenticated user sees Logout link."""
        request = rf.get('/')
        request.user = verified_user

        from django.template.loader import render_to_string
        html = render_to_string('web_ui/components/navigation.html', request=request)

        assert 'Logout' in html
        assert 'Login' not in html
        assert verified_user.email in html or verified_user.get_short_name() in html


@pytest.mark.django_db
class TestMessagesComponent:
    """Tests for messages component."""

    def test_messages_display_success(self, rf: RequestFactory):
        """Success messages display correctly."""
        from django.contrib.messages.storage.fallback import FallbackStorage

        request = rf.get('/')
        setattr(request, 'session', {})
        messages = FallbackStorage(request)
        messages.add(messages.SUCCESS, 'Test success message')
        setattr(request, '_messages', messages)

        from django.template.loader import render_to_string
        html = render_to_string('web_ui/components/messages.html', {'messages': messages}, request=request)

        assert 'Test success message' in html
        assert 'ui-message--success' in html
```

**Coverage Target**: 80%+ for B14-related Python code and template rendering paths.

**Acceptance**: All template tests pass, coverage meets target.

---

#### T030: Write context processor tests
**Description**: Test context processor provides correct data.

**File**: `tests/web_ui/test_context_processors.py`

**Implementation**:
```python
"""Tests for web_ui context processors."""
import pytest
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from accounts.models import User
from web_ui.context_processors.navigation import navigation_context


@pytest.mark.django_db
class TestNavigationContext:
    """Tests for navigation_context processor."""

    def test_context_anonymous_user(self, rf: RequestFactory):
        """Anonymous user context has correct flags."""
        request = rf.get('/')
        request.user = AnonymousUser()

        context = navigation_context(request)

        assert context['user'] == request.user
        assert context['is_authenticated'] is False
        assert context['can_view_orgs'] is False
        assert context['can_manage_orgs'] is False
        assert context['can_view_projects'] is False
        assert callable(context['has_perm'])

    def test_context_authenticated_user(self, rf: RequestFactory, verified_user: User):
        """Authenticated user context has correct flags."""
        request = rf.get('/')
        request.user = verified_user

        context = navigation_context(request)

        assert context['user'] == verified_user
        assert context['is_authenticated'] is True
        assert callable(context['has_perm'])

    def test_has_perm_helper_works(self, rf: RequestFactory, verified_user: User):
        """has_perm helper function works correctly."""
        request = rf.get('/')
        request.user = verified_user

        context = navigation_context(request)
        has_perm = context['has_perm']

        # Test with a real permission
        result = has_perm('accounts.view_user')
        assert isinstance(result, bool)
```

**Acceptance**: All context processor tests pass.

---

#### T031: Write view tests
**Description**: Test all web_ui views return correct status and templates.

**File**: `tests/web_ui/test_views.py`

**Implementation**:
```python
"""Tests for web_ui views."""
import pytest
from django.urls import reverse
from accounts.models import User


@pytest.mark.django_db
class TestHomeView:
    """Tests for home view."""

    def test_home_anonymous_user(self, client):
        """Home page accessible to anonymous users."""
        response = client.get(reverse('ui_home'))

        assert response.status_code == 200
        assert 'web_ui/pages/home.html' in [t.name for t in response.templates]

    def test_home_authenticated_user(self, client, verified_user: User):
        """Home page shows user-specific content when authenticated."""
        client.force_login(verified_user)
        response = client.get(reverse('ui_home'))

        assert response.status_code == 200
        assert verified_user.email.encode() in response.content


@pytest.mark.django_db
class TestOrganisationsView:
    """Tests for organisations list view."""

    def test_organisations_requires_login(self, client):
        """Organisations view requires authentication."""
        response = client.get(reverse('ui_organisations'))

        assert response.status_code == 302  # Redirect to login
        assert '/accounts/login' in response.url

    def test_organisations_authenticated_user(self, client, verified_user: User):
        """Organisations view accessible to authenticated users."""
        client.force_login(verified_user)
        response = client.get(reverse('ui_organisations'))

        assert response.status_code == 200
        assert 'web_ui/pages/organisations.html' in [t.name for t in response.templates]


@pytest.mark.django_db
class TestProjectsView:
    """Tests for projects list view."""

    def test_projects_requires_login(self, client):
        """Projects view requires authentication."""
        response = client.get(reverse('ui_projects'))

        assert response.status_code == 302

    def test_projects_authenticated_user(self, client, verified_user: User):
        """Projects view accessible to authenticated users."""
        client.force_login(verified_user)
        response = client.get(reverse('ui_projects'))

        assert response.status_code == 200


@pytest.mark.django_db
class TestAccountView:
    """Tests for account settings view."""

    def test_account_requires_login(self, client):
        """Account view requires authentication."""
        response = client.get(reverse('ui_account'))

        assert response.status_code == 302

    def test_account_shows_user_info(self, client, verified_user: User):
        """Account view displays user information."""
        client.force_login(verified_user)
        response = client.get(reverse('ui_account'))

        assert response.status_code == 200
        assert verified_user.email.encode() in response.content
```

**Acceptance**: All view tests pass, coverage > 90%.

---

#### T032: Write integration tests
**Description**: End-to-end tests for key user flows.

**File**: `tests/web_ui/test_integration.py`

**Implementation**:
```python
"""Integration tests for web_ui flows."""
import pytest
from django.urls import reverse
from accounts.models import User


@pytest.mark.django_db
class TestAuthenticationFlow:
    """Test full authentication flow with web_ui."""

    def test_login_flow(self, client, verified_user: User):
        """User can login and see personalized home page."""
        # Visit home as anonymous
        response = client.get(reverse('ui_home'))
        assert b'Get Started' in response.content or b'Sign in' in response.content.lower()

        # Login
        response = client.post(reverse('login'), {
            'email': verified_user.email,
            'password': 'TestPass123!',
        })
        assert response.status_code == 302

        # Visit home as authenticated
        response = client.get(reverse('ui_home'))
        assert verified_user.email.encode() in response.content

        # Logout
        response = client.get(reverse('logout'))
        assert response.status_code == 302


@pytest.mark.django_db
class TestNavigationFlow:
    """Test navigation between pages."""

    def test_navigation_links_work(self, client, verified_user: User):
        """All navigation links are accessible."""
        client.force_login(verified_user)

        # Home
        response = client.get(reverse('ui_home'))
        assert response.status_code == 200

        # Organisations
        response = client.get(reverse('ui_organisations'))
        assert response.status_code == 200

        # Projects
        response = client.get(reverse('ui_projects'))
        assert response.status_code == 200

        # Account
        response = client.get(reverse('ui_account'))
        assert response.status_code == 200
```

**Acceptance**: All integration tests pass.

---

#### T033: Write performance tests
**Description**: Validate context processor performance (SC-010: < 5ms overhead).

**File**: `tests/web_ui/test_performance.py`

**Implementation**:
```python
"""Performance tests for web_ui."""
import pytest
import time
from django.test import RequestFactory
from accounts.models import User
from web_ui.context_processors.navigation import navigation_context


@pytest.mark.django_db
class TestContextProcessorPerformance:
    """Test context processor meets performance targets."""

    def test_context_processor_execution_time(self, rf: RequestFactory, verified_user: User):
        """Context processor executes in < 5ms (SC-010)."""
        request = rf.get('/')
        request.user = verified_user

        # Warm up
        navigation_context(request)

        # Measure
        iterations = 100
        start = time.perf_counter()
        for _ in range(iterations):
            navigation_context(request)
        end = time.perf_counter()

        avg_time_ms = ((end - start) / iterations) * 1000

        assert avg_time_ms < 5.0, f"Context processor took {avg_time_ms:.2f}ms (target: < 5ms)"
```

**Acceptance**: Performance test passes, context processor < 5ms.

---

#### T034: Update web_ui README with usage guide
**Description**: Complete README with template extension examples.

**File**: `src/web_ui/README.md`

**Sections to Add**:
1. **Extending Base Templates**:
   - How to create new pages extending base.html
   - Example: Creating a custom dashboard

2. **Template Blocks Guide**:
   - Safe blocks (override encouraged): title, extra_head, content, extra_scripts
   - Internal blocks (do not override): header_structure, navigation_inner
   - Code examples for each

3. **Using Components**:
   - How to include form_field, form_layout, list_table, pagination
   - Code examples with parameters

4. **Context Variables**:
   - Available in all templates: user, is_authenticated, can_view_orgs, etc.
   - How to use has_perm() for custom permission checks

5. **Adding Custom Navigation**:
   - How to override extra_nav_items block
   - Example: Adding admin link for superusers

6. **Styling Guide**:
   - CSS class hooks reference
   - How to add custom CSS (downstream)
   - No styles included in baseline

**Acceptance**: README complete, includes code examples, clear guidance.

---

#### T035: Create feature documentation
**Description**: Document B14 feature in main docs.

**File**: `docs/features/014-web-ui-baseline.md`

**Content**:
- Feature overview
- Architecture decisions (clarifications summary)
- Integration points (B05, B06, B07, B08)
- URL structure
- Template hierarchy
- Extension patterns
- Success criteria verification

**Acceptance**: Documentation complete, references all key components.

---

#### T036: Run full test suite and verify coverage
**Description**: Execute all tests, verify 90%+ coverage.

**Commands**:
```powershell
# Run all web_ui tests
pytest tests/web_ui/ -v

# Run with coverage
pytest tests/web_ui/ --cov=src/web_ui --cov-report=term-missing

# Verify coverage >= 90%
pytest tests/web_ui/ --cov=src/web_ui --cov-fail-under=90
```

**Acceptance**: All tests pass, coverage ≥ 90%.

---

## Success Criteria Verification

After completing all work packages, verify against [spec.md](spec.md) success criteria:

- **SC-001**: ✅ Developers can create page in < 5 minutes (test with example)
- **SC-002**: ✅ Navigation updates propagate automatically (verify with test)
- **SC-003**: ✅ 100% valid semantic HTML5 (run validator on rendered pages)
- **SC-004**: ✅ Template rendering < 50ms (add logging, measure in dev)
- **SC-005**: ✅ Zero template errors (monitor in production 30 days post-deploy)
- **SC-006**: ✅ Downstream override capability (verify with example override)
- **SC-007**: ✅ Navigation reflects permissions correctly (test with various permission sets)
- **SC-008**: ✅ Messages display correctly (test all message levels)
- **SC-009**: ✅ Component reuse reduces duplication 60% (compare template LOC before/after)
- **SC-010**: ✅ Context processor < 5ms (performance test T033)

---

## Risk Mitigation

### Risk 1: Template rendering performance
**Impact**: High
**Likelihood**: Low
**Mitigation**:
- Precompute permission flags in context processor (done in T005)
- Use select_related/prefetch_related in stub views (done in T025)
- Performance test in T033 validates < 5ms target

### Risk 2: Template inheritance conflicts
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**:
- Clear block documentation (T007)
- Two-tier system (safe vs. internal blocks)
- README with override guidance (T034)

### Risk 3: B05 auth integration issues
**Impact**: High
**Likelihood**: Low
**Mitigation**:
- Use existing B05 views, only override templates (WP05)
- Integration tests verify login/logout flows (T032)
- Template directory ordering ensures correct override (T022)

### Risk 4: Missing CSS causing usability issues
**Impact**: Low
**Likelihood**: High (expected)
**Mitigation**:
- Semantic HTML ensures baseline usability
- Class hooks documented for downstream styling
- Success criteria explicitly allows no styling (per clarifications)

---

## Post-Implementation

### Immediate Next Steps
1. Run acceptance tests (all SC criteria)
2. Create demo video showing < 5min page creation (SC-001)
3. Deploy to staging, monitor template errors (SC-005)
4. Gather developer feedback on component reuse (SC-009)

### Future Enhancements (Out of Scope for B14)
- Add minimal default CSS (optional enhancement)
- HTMX integration for dynamic components
- Advanced form widgets (date pickers, rich text)
- Admin dashboard with metrics
- User profile editing in account view
- Organisation/project CRUD operations

### Documentation Handoff
- README.md: Developer usage guide
- docs/features/014-web-ui-baseline.md: Architecture and integration
- Inline template comments: Block usage guidance
- Test files: Behavior documentation via tests

---

## Appendix: File Manifest

**Created Files** (31 total):

Python:
- `src/web_ui/__init__.py`
- `src/web_ui/apps.py`
- `src/web_ui/views.py`
- `src/web_ui/urls.py`
- `src/web_ui/context_processors/__init__.py`
- `src/web_ui/context_processors/navigation.py`
- `src/web_ui/templatetags/__init__.py`
- `src/web_ui/templatetags/ui_tags.py`

Templates:
- `src/web_ui/templates/web_ui/base/base.html`
- `src/web_ui/templates/web_ui/components/navigation.html`
- `src/web_ui/templates/web_ui/components/messages.html`
- `src/web_ui/templates/web_ui/components/form_field.html`
- `src/web_ui/templates/web_ui/components/form_layout.html`
- `src/web_ui/templates/web_ui/components/list_table.html`
- `src/web_ui/templates/web_ui/components/pagination.html`
- `src/web_ui/templates/web_ui/auth/login.html`
- `src/web_ui/templates/web_ui/auth/register.html`
- `src/web_ui/templates/web_ui/auth/password_reset_request.html`
- `src/web_ui/templates/web_ui/auth/password_reset_confirm.html`
- `src/web_ui/templates/web_ui/pages/home.html`
- `src/web_ui/templates/web_ui/pages/organisations.html`
- `src/web_ui/templates/web_ui/pages/projects.html`
- `src/web_ui/templates/web_ui/pages/account.html`

Tests:
- `tests/web_ui/__init__.py`
- `tests/web_ui/test_templates.py`
- `tests/web_ui/test_context_processors.py`
- `tests/web_ui/test_views.py`
- `tests/web_ui/test_integration.py`
- `tests/web_ui/test_performance.py`

Documentation:
- `src/web_ui/README.md`
- `docs/features/014-web-ui-baseline.md`

**Modified Files** (2 total):
- `src/config/settings/base.py` (INSTALLED_APPS, TEMPLATES context processors, SITE_NAME)
- `src/config/urls.py` (include web_ui.urls)

---

**Plan Status**: ✅ Complete - Ready for Implementation
**Next Step**: Begin WP01 (Django App Setup)
