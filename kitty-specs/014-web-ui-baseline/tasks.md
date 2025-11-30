# Task Breakdown: Web UI Baseline
*Path: kitty-specs/014-web-ui-baseline/tasks.md*

**Feature Branch**: `014-web-ui-baseline`
**Generated**: 2025-11-30
**Source**: [plan.md](plan.md)

## Task Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked

---

## WP01: Django App Setup & Configuration (P0)
**Goal**: Create `web_ui` Django app with proper structure and registration.
**Estimated Effort**: 2 hours
**Status**: Not Started
**Prompt**: [WP01-django-app-setup.md](tasks/planned/WP01-django-app-setup.md)

### [ ] T001: Create Django app directory structure
**Description**: Create `src/web_ui/` app with standard Django structure.

**Checklist**:
- [ ] Create directory: `src/web_ui/`
- [ ] Create subdirectories: `templates/web_ui/`, `templates/web_ui/base/`, `templates/web_ui/components/`, `templates/web_ui/auth/`, `templates/web_ui/pages/`
- [ ] Create subdirectories: `templatetags/`, `context_processors/`
- [ ] Create `__init__.py` files in: `src/web_ui/`, `src/web_ui/templatetags/`, `src/web_ui/context_processors/`
- [ ] Create empty modules: `apps.py`, `views.py`, `urls.py`, `tests.py`

**Files Created**:
- `src/web_ui/__init__.py`
- `src/web_ui/apps.py`
- `src/web_ui/views.py`
- `src/web_ui/urls.py`
- `src/web_ui/tests.py`
- `src/web_ui/context_processors/__init__.py`
- `src/web_ui/templatetags/__init__.py`

**Acceptance**: Directory structure exists, all `__init__.py` files present

**Dependencies**: None
**Parallel**: No (blocks all other work)

---

### [ ] T002: Create AppConfig class
**Description**: Define `WebUIConfig` app configuration.

**Checklist**:
- [ ] Implement `WebUIConfig` in `src/web_ui/apps.py`
- [ ] Set `name = 'web_ui'`
- [ ] Set `verbose_name = 'Web UI Baseline'`
- [ ] Set `default_auto_field = 'django.db.models.BigAutoField'`
- [ ] Add `ready()` method with docstring

**File**: `src/web_ui/apps.py`

**Code Template**:
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
        pass
```

**Acceptance**: AppConfig importable, all properties set correctly

**Dependencies**: T001
**Parallel**: No

---

### [ ] T003: Add web_ui to INSTALLED_APPS
**Description**: Register app in Django settings.

**Checklist**:
- [ ] Open `src/config/settings/base.py`
- [ ] Add `'web_ui.apps.WebUIConfig'` to `INSTALLED_APPS` after existing apps
- [ ] Run `python manage.py check` to verify no errors

**File**: `src/config/settings/base.py`

**Change**:
```python
INSTALLED_APPS = [
    # ... existing apps ...
    'web_ui.apps.WebUIConfig',  # B14: Web UI Baseline
]
```

**Acceptance**: `python manage.py check` passes without errors

**Dependencies**: T002
**Parallel**: No

---

### [ ] T004: Create app README
**Description**: Document purpose, structure, and extension guide.

**Checklist**:
- [ ] Create `src/web_ui/README.md`
- [ ] Add overview section
- [ ] Document directory structure
- [ ] Document template blocks (safe vs. internal)
- [ ] Document context processor variables
- [ ] Add template extension examples
- [ ] Add navigation customization guide
- [ ] Document integration with B05 auth

**File**: `src/web_ui/README.md`

**Sections**:
1. Overview (purpose: server-side rendering baseline; note: B14 provides HTML structure with CSS class hooks only—no CSS/JS assets shipped; styling deferred to downstream products)
2. Directory Structure
3. Template Blocks Guide
4. Context Variables
5. Extending Base Templates
6. Adding Custom Navigation
7. Using Components
8. Styling Guide
9. Integration Points

**Acceptance**: README exists with all sections, includes code examples

**Dependencies**: T001
**Parallel**: Yes (can work while T002-T003 in progress)

---

## WP02: Base Templates & Context Processor (P0)
**Goal**: Create foundational base.html template and context processor with permission flags.
**Estimated Effort**: 6 hours
**Status**: Not Started
**Prompt**: [WP02-base-templates-context.md](tasks/planned/WP02-base-templates-context.md)

### [ ] T005: Create context processor with permission flags
**Description**: Build context processor that exposes user, auth state, and precomputed permission booleans.

**Checklist**:
- [ ] Create `src/web_ui/context_processors/navigation.py`
- [ ] Implement `navigation_context(request)` function
- [ ] Add type hints (HttpRequest → Dict[str, Any])
- [ ] Expose: `user`, `is_authenticated`, `can_view_orgs`, `can_manage_orgs`, `can_view_projects`
- [ ] Implement `has_perm()` helper function for edge cases
- [ ] Add docstring explaining precomputed flags

**File**: `src/web_ui/context_processors/navigation.py`

**Code Template**:
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
        context['can_view_orgs'] = user.has_perm('organisations.view_organisation')
        context['can_manage_orgs'] = user.has_perm('organisations.manage_organisation')
        context['can_view_projects'] = user.has_perm('projects.view_project')
    else:
        context['can_view_orgs'] = False
        context['can_manage_orgs'] = False
        context['can_view_projects'] = False

    def has_perm(perm: str) -> bool:
        return user.has_perm(perm) if user.is_authenticated else False

    context['has_perm'] = has_perm

    return context
```

**Performance Target**: < 5ms execution time (SC-010)

**Acceptance**: Context processor returns all required keys, type hints correct

**Dependencies**: T001
**Parallel**: No (blocks WP03, WP04, WP06)

---

### [ ] T006: Register context processor in settings
**Description**: Add context processor to TEMPLATES configuration.

**Checklist**:
- [ ] Open `src/config/settings/base.py`
- [ ] Locate `TEMPLATES[0]['OPTIONS']['context_processors']`
- [ ] Add `'web_ui.context_processors.navigation.navigation_context'`
- [ ] Verify context processor registered correctly

**File**: `src/config/settings/base.py`

**Change**:
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

**Acceptance**: Context processor accessible in templates

**Dependencies**: T005
**Parallel**: No

---

### [ ] T007: Create base.html template with block structure
**Description**: Implement base template with semantic HTML5 and two-tier block system.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/base/base.html`
- [ ] Add DOCTYPE and HTML5 structure
- [ ] Implement semantic elements: `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Define safe blocks: `title`, `extra_head`, `content`, `extra_scripts`, `footer`
- [ ] Define internal blocks: `header_structure`, `navigation_inner`
- [ ] Add CSS class hooks on all major elements
- [ ] Include navigation component
- [ ] Include messages component
- [ ] Add inline comments documenting block types
- [ ] Use `site_name` from settings in title and header

**File**: `src/web_ui/templates/web_ui/base/base.html`

**CSS Class Hooks to Include**:
- `ui-layout`, `ui-header`, `ui-header__inner`, `ui-header__brand`
- `ui-nav`, `ui-main`, `ui-content`, `ui-footer`, `ui-footer__inner`

**Block Documentation**:
- **Safe blocks** (override encouraged): `title`, `extra_head`, `content`, `extra_scripts`, `footer`
- **Internal blocks** (reserved): `header_structure`, `navigation_inner`

**Acceptance**: Template renders without errors, includes all blocks, uses semantic HTML5

**Dependencies**: T001
**Parallel**: Can work in parallel with T005

---

### [ ] T008: Create site configuration in settings
**Description**: Add `SITE_NAME` setting for page titles.

**Checklist**:
- [ ] Open `src/config/settings/base.py`
- [ ] Add `SITE_NAME = "Django Core"` setting
- [ ] Verify setting accessible in templates via `{{ site_name }}`

**File**: `src/config/settings/base.py`

**Change**:
```python
# Web UI Configuration
SITE_NAME = "Django Core"  # Used in page titles and branding
```

**Acceptance**: Setting accessible in templates

**Dependencies**: None
**Parallel**: Yes

---

## WP03: Navigation & Permission-Based Visibility (P1)
**Goal**: Build navigation component with authentication and permission-aware visibility.
**Estimated Effort**: 4 hours
**Status**: Not Started
**Prompt**: [WP03-navigation-permissions.md](tasks/planned/WP03-navigation-permissions.md)

### [ ] T009: Create navigation component template
**Description**: Build reusable navigation template with conditional visibility.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/components/navigation.html`
- [ ] Implement anonymous user navigation (Login, Register)
- [ ] Implement authenticated user navigation (Account, Logout)
- [ ] Add permission-based sections (Organisations if `can_view_orgs`, Projects if `can_view_projects`)
- [ ] Add `extra_nav_items` block for downstream customization
- [ ] Add CSS class hooks: `ui-nav__list`, `ui-nav__item`, `ui-nav__link`
- [ ] Add title attribute for full email on account link

**File**: `src/web_ui/templates/web_ui/components/navigation.html`

**Visibility Rules**:
- Anonymous: Login, Register
- Authenticated: Home, Organisations (if perm), Projects (if perm), Account, Logout

**Edge Cases to Handle**:
- User with no permissions: Only show Home, Account, Logout
- Long user names: Add `title="{{ user.email }}"` for tooltip

**Acceptance**: Navigation renders correctly for auth/anon users, permission checks work

**Dependencies**: T006, T007
**Parallel**: No

---

### [ ] T010: Handle empty navigation state edge case
**Description**: Test and verify navigation behavior when user has no permissions.

**Checklist**:
- [ ] Create test user with no permissions
- [ ] Login as user, visit home page
- [ ] Verify navigation shows only "Home", "Account", "Logout"
- [ ] Verify no errors or empty sections
- [ ] Document test case

**Acceptance**: Navigation gracefully handles zero permissions

**Dependencies**: T009
**Parallel**: Yes (can test while working on other tasks)

---

### [ ] T011: Handle long entity names edge case
**Description**: Add title attribute for full name display on hover.

**Checklist**:
- [ ] Open `src/web_ui/templates/web_ui/components/navigation.html`
- [ ] Add `title="{{ user.email }}"` to account link
- [ ] Test with long email address
- [ ] Verify tooltip displays full email on hover

**File**: `src/web_ui/templates/web_ui/components/navigation.html`

**Change**: Line ~38
```html
<a href="{% url 'ui_account' %}" class="ui-nav__link" title="{{ user.email }}">
    {{ user.get_short_name|default:user.email }}
</a>
```

**Acceptance**: Hover on account link shows full email in tooltip

**Dependencies**: T009
**Parallel**: Yes

---

## WP04: Reusable Template Components (P2)
**Goal**: Create template includes for messages, form fields, lists, and pagination.
**Estimated Effort**: 5 hours
**Status**: Not Started
**Prompt**: [WP04-reusable-components.md](tasks/planned/WP04-reusable-components.md)

### [ ] T012: Create messages component
**Description**: Build reusable message display component.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/components/messages.html`
- [ ] Iterate over Django messages
- [ ] Support all message levels: success, error, warning, info, debug
- [ ] Add CSS class hooks: `ui-messages`, `ui-message`, `ui-message--{level}`, `ui-message__text`
- [ ] Add ARIA role="alert"
- [ ] Test with multiple messages

**File**: `src/web_ui/templates/web_ui/components/messages.html`

**Acceptance**: Messages display correctly, all levels supported, ARIA role set

**Dependencies**: T001
**Parallel**: Yes (can work alongside WP05)

---

### [ ] T013: Create form_field component
**Description**: Reusable template for rendering individual form fields.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/components/form_field.html`
- [ ] Render label with `for` attribute
- [ ] Render field widget
- [ ] Render help text if present
- [ ] Render errors if present
- [ ] Add required indicator if field required
- [ ] Add CSS class hooks: `ui-form-field`, `ui-form-field--error`, `ui-form-field__label`, `ui-form-field__help`, `ui-form-field__errors`
- [ ] Add usage example in docstring

**File**: `src/web_ui/templates/web_ui/components/form_field.html`

**Usage**: `{% include "web_ui/components/form_field.html" with field=form.email %}`

**Acceptance**: Form fields render with label, input, help text, errors correctly

**Dependencies**: T001
**Parallel**: Yes

---

### [ ] T014: Create form_layout component
**Description**: Wrapper for complete forms with CSRF and submit button.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/components/form_layout.html`
- [ ] Add CSRF token automatically
- [ ] Iterate over all form fields using form_field component
- [ ] Display non-field errors
- [ ] Add submit button with configurable text
- [ ] Support `action`, `method`, `submit_text` parameters
- [ ] Add CSS class hooks: `ui-form`, `ui-form__errors`, `ui-form__fields`, `ui-form__actions`, `ui-button`

**File**: `src/web_ui/templates/web_ui/components/form_layout.html`

**Usage**: `{% include "web_ui/components/form_layout.html" with form=my_form action="/submit/" method="post" submit_text="Save" %}`

**Acceptance**: Forms render with CSRF token, all fields, submit button

**Dependencies**: T013
**Parallel**: No (depends on form_field)

---

### [ ] T015: Create list_table component
**Description**: Reusable table for displaying querysets.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/components/list_table.html`
- [ ] Parse `headers` parameter (comma-separated string)
- [ ] Parse `fields` parameter (comma-separated field paths)
- [ ] Render table with thead and tbody
- [ ] Use `getattribute` filter for dynamic field access
- [ ] Handle empty queryset with customizable message
- [ ] Add CSS class hooks: `ui-table`, `ui-table__head`, `ui-table__body`, `ui-table__row`, `ui-table__header`, `ui-table__cell`

**File**: `src/web_ui/templates/web_ui/components/list_table.html`

**Note**: Requires custom template filter (T017)

**Usage**: `{% include "web_ui/components/list_table.html" with objects=projects headers="Name,Owner,Created" fields="name,owner.email,created_at" %}`

**Acceptance**: Tables render with headers, data, empty state correctly

**Dependencies**: T001, T017 (getattribute filter)
**Parallel**: Can work in parallel with T017

---

### [ ] T016: Create pagination component
**Description**: Reusable pagination controls.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/components/pagination.html`
- [ ] Show First/Previous links if `page_obj.has_previous`
- [ ] Show current page number
- [ ] Show Next/Last links if `page_obj.has_next`
- [ ] Add ARIA label for accessibility
- [ ] Add CSS class hooks: `ui-pagination`, `ui-pagination__list`, `ui-pagination__item`, `ui-pagination__link`, `ui-pagination__current`
- [ ] Only render if `page_obj.has_other_pages`

**File**: `src/web_ui/templates/web_ui/components/pagination.html`

**Usage**: `{% include "web_ui/components/pagination.html" with page_obj=projects %}`

**Acceptance**: Pagination renders with first/prev/next/last links, current page highlighted

**Dependencies**: T001
**Parallel**: Yes

---

### [ ] T017: Create custom template filter for dynamic attributes
**Description**: Build `getattribute` filter for list_table component.

**Checklist**:
- [ ] Create `src/web_ui/templatetags/ui_tags.py`
- [ ] Implement `@register.filter` for `getattribute`
- [ ] Support dot notation for nested attributes (e.g., "owner.email")
- [ ] Handle callable attributes
- [ ] Return None for missing attributes
- [ ] Add docstring with usage example
- [ ] Add type hints

**File**: `src/web_ui/templatetags/ui_tags.py`

**Code Template**:
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

**Acceptance**: Filter works with nested attributes, returns None for missing attrs

**Dependencies**: T001
**Parallel**: Yes

---

## WP05: Authentication Views Integration (P1)
**Goal**: Integrate B05 authentication views with web_ui templates.
**Estimated Effort**: 4 hours
**Status**: Not Started
**Prompt**: [WP05-authentication-views.md](tasks/planned/WP05-authentication-views.md)

### [ ] T018: Override B05 login template
**Description**: Create web_ui version of login template extending base.html.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/auth/login.html`
- [ ] Extend `web_ui/base/base.html`
- [ ] Override `title` block
- [ ] Override `content` block
- [ ] Use `form_layout` component
- [ ] Add links to register and password reset
- [ ] Add CSS class hooks: `ui-auth-page`, `ui-auth-page__header`, `ui-auth-page__footer`

**File**: `src/web_ui/templates/web_ui/auth/login.html`

**Integration**: B05 login view (`accounts.views.login_view`) already exists

**Acceptance**: Login page renders with base template, form submits to B05 view

**Dependencies**: T007, T014
**Parallel**: Yes (can work alongside other auth templates)

---

### [ ] T019: Override B05 register template
**Description**: Create web_ui version of registration template.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/auth/register.html`
- [ ] Extend `web_ui/base/base.html`
- [ ] Override `title` and `content` blocks
- [ ] Use `form_layout` component
- [ ] Add link to login
- [ ] Test registration flow

**File**: `src/web_ui/templates/web_ui/auth/register.html`

**Acceptance**: Register page renders with base template, form submits to B05 view

**Dependencies**: T007, T014
**Parallel**: Yes

---

### [ ] T020: Override B05 password reset request template
**Description**: Create web_ui version of password reset request.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/auth/password_reset_request.html`
- [ ] Extend `web_ui/base/base.html`
- [ ] Override `title` and `content` blocks
- [ ] Use `form_layout` component
- [ ] Add instructional text
- [ ] Add link back to login

**File**: `src/web_ui/templates/web_ui/auth/password_reset_request.html`

**Acceptance**: Password reset request page renders, form submits to B05 view

**Dependencies**: T007, T014
**Parallel**: Yes

---

### [ ] T021: Override B05 password reset confirm template
**Description**: Create web_ui version of password reset confirmation.

**Checklist**:
- [ ] Create `src/web_ui/templates/web_ui/auth/password_reset_confirm.html`
- [ ] Extend `web_ui/base/base.html`
- [ ] Override `title` and `content` blocks
- [ ] Use `form_layout` component
- [ ] Add link back to login

**File**: `src/web_ui/templates/web_ui/auth/password_reset_confirm.html`

**Acceptance**: Password reset confirm page renders, form submits to B05 view

**Dependencies**: T007, T014
**Parallel**: Yes

---

### [ ] T022: Configure template directories in settings
**Description**: Ensure web_ui templates override B05 templates.

**Checklist**:
- [ ] Open `src/config/settings/base.py`
- [ ] Verify `INSTALLED_APPS` has `web_ui` before `accounts`
- [ ] Verify `TEMPLATES[0]['APP_DIRS'] = True`
- [ ] Test that web_ui auth templates render instead of B05 templates
- [ ] Document template override mechanism in README

**Recommended**: Keep `DIRS=[]`, ensure `web_ui` appears before `accounts` in `INSTALLED_APPS`

**Acceptance**: Web UI templates render instead of B05 templates when URLs accessed

**Dependencies**: T003, T018-T021
**Parallel**: No (requires templates to exist)

---

## WP06: Stub Views & URL Routing (P2)
**Goal**: Create placeholder views for home, organisations, projects, account.
**Estimated Effort**: 3 hours
**Status**: Not Started
**Prompt**: [WP06-stub-views-routing.md](tasks/planned/WP06-stub-views-routing.md)

### [ ] T023: Create home/dashboard view
**Description**: Simple landing page showing welcome message.

**Checklist**:
- [ ] Add `home()` view to `src/web_ui/views.py`
- [ ] Create `src/web_ui/templates/web_ui/pages/home.html`
- [ ] Show welcome message with user's name if authenticated
- [ ] Show cards linking to organisations/projects if permissions allow
- [ ] Add "Get Started" button for anonymous users
- [ ] Add type hints to view function
- [ ] Test with authenticated and anonymous users

**Files**:
- `src/web_ui/views.py`
- `src/web_ui/templates/web_ui/pages/home.html`

**Acceptance**: Home page renders, shows contextual content based on auth state

**Dependencies**: T007
**Parallel**: Yes

---

### [ ] T024: Create organisations list stub view
**Description**: Simple view listing organisations (read-only stub).

**Checklist**:
- [ ] Add `organisations_list()` view with `@login_required` decorator
- [ ] Create `src/web_ui/templates/web_ui/pages/organisations.html`
- [ ] Query organisations where user is member
- [ ] Use `list_table` component to display
- [ ] Show empty state if no organisations
- [ ] Add type hints

**Files**:
- `src/web_ui/views.py`
- `src/web_ui/templates/web_ui/pages/organisations.html`

**Acceptance**: Organisations list renders, shows user's organisations or empty state

**Dependencies**: T007, T015
**Parallel**: Yes

---

### [ ] T025: Create projects list stub view
**Description**: Simple view listing projects (read-only stub).

**Checklist**:
- [ ] Add `projects_list()` view with `@login_required` decorator
- [ ] Create `src/web_ui/templates/web_ui/pages/projects.html`
- [ ] Query projects in user's organisations with `select_related('organisation', 'owner')`
- [ ] Use `list_table` component to display
- [ ] Show empty state if no projects
- [ ] Add type hints

**Files**:
- `src/web_ui/views.py`
- `src/web_ui/templates/web_ui/pages/projects.html`

**Acceptance**: Projects list renders, shows user's projects or empty state

**Dependencies**: T007, T015
**Parallel**: Yes

---

### [ ] T026: Create account settings stub view
**Description**: Simple account info display (no editing yet).

**Checklist**:
- [ ] Add `account_settings()` view with `@login_required` decorator
- [ ] Create `src/web_ui/templates/web_ui/pages/account.html`
- [ ] Display user email, name, date joined, email verified status
- [ ] Use definition list for info display
- [ ] Add note that editing not yet available
- [ ] Add type hints

**Files**:
- `src/web_ui/views.py`
- `src/web_ui/templates/web_ui/pages/account.html`

**Acceptance**: Account page renders, shows user info, indicates editing not available

**Dependencies**: T007
**Parallel**: Yes

---

### [ ] T027: Create URL configuration for web_ui views
**Description**: Add URL patterns for all web_ui views.

**Checklist**:
- [ ] Open `src/web_ui/urls.py`
- [ ] Add URL pattern for home: `path('', views.home, name='ui_home')`
- [ ] Add URL pattern for organisations: `path('organisations/', views.organisations_list, name='ui_organisations')`
- [ ] Add URL pattern for projects: `path('projects/', views.projects_list, name='ui_projects')`
- [ ] Add URL pattern for account: `path('account/', views.account_settings, name='ui_account')`
- [ ] Verify all view imports

**File**: `src/web_ui/urls.py`

**Acceptance**: URLs defined, all views routable

**Dependencies**: T023-T026
**Parallel**: No

---

### [ ] T028: Include web_ui URLs in main URLconf
**Description**: Add web_ui URLs to main routing.

**Checklist**:
- [ ] Open `src/config/urls.py`
- [ ] Add `from django.urls import include` if not present
- [ ] Add `path('', include('web_ui.urls'))` at root
- [ ] Verify no routing conflicts with B05 (`/accounts/`)
- [ ] Test all URLs are accessible

**File**: `src/config/urls.py`

**Change**:
```python
urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),  # B05 auth
    # ... other URL patterns ...
    path('', include('web_ui.urls')),  # B14 Web UI (root)
]
```

**Acceptance**: All web_ui URLs accessible, no routing conflicts

**Dependencies**: T027
**Parallel**: No

---

## WP07: Testing & Documentation (P1)
**Goal**: Comprehensive test coverage and usage documentation.
**Estimated Effort**: 6 hours
**Status**: Not Started
**Prompt**: [WP07-testing-documentation.md](tasks/planned/WP07-testing-documentation.md)

### [ ] T029: Write template rendering tests
**Description**: Test base template and components render correctly.

**Checklist**:
- [ ] Create `tests/web_ui/__init__.py`
- [ ] Create `tests/web_ui/test_templates.py`
- [ ] Test base template renders without errors
- [ ] Test base template includes all semantic HTML5 elements
- [ ] Test navigation component for anonymous users
- [ ] Test navigation component for authenticated users
- [ ] Test messages component displays all levels
- [ ] Achieve 90%+ coverage for template rendering paths

**File**: `tests/web_ui/test_templates.py`

**Test Classes**:
- `TestBaseTemplate`
- `TestNavigationComponent`
- `TestMessagesComponent`

**Acceptance**: All template tests pass, coverage meets target

**Dependencies**: T007, T009, T012
**Parallel**: Yes

---

### [ ] T030: Write context processor tests
**Description**: Test context processor provides correct data.

**Checklist**:
- [ ] Create `tests/web_ui/test_context_processors.py`
- [ ] Test anonymous user context has correct flags
- [ ] Test authenticated user context has correct flags
- [ ] Test `has_perm()` helper function works
- [ ] Verify all expected keys present in context
- [ ] Test with users having different permissions

**File**: `tests/web_ui/test_context_processors.py`

**Test Class**: `TestNavigationContext`

**Acceptance**: All context processor tests pass

**Dependencies**: T005
**Parallel**: Yes

---

### [ ] T031: Write view tests
**Description**: Test all web_ui views return correct status and templates.

**Checklist**:
- [ ] Create `tests/web_ui/test_views.py`
- [ ] Test home view for anonymous and authenticated users
- [ ] Test organisations view requires login
- [ ] Test organisations view shows correct template
- [ ] Test projects view requires login
- [ ] Test projects view shows correct template
- [ ] Test account view requires login
- [ ] Test account view displays user info
- [ ] Achieve 90%+ coverage

**File**: `tests/web_ui/test_views.py`

**Test Classes**:
- `TestHomeView`
- `TestOrganisationsView`
- `TestProjectsView`
- `TestAccountView`

**Acceptance**: All view tests pass, coverage > 90%

**Dependencies**: T023-T026
**Parallel**: Yes

---

### [ ] T032: Write integration tests
**Description**: End-to-end tests for key user flows.

**Checklist**:
- [ ] Create `tests/web_ui/test_integration.py`
- [ ] Test full login flow (anonymous → login → home with user context)
- [ ] Test logout flow
- [ ] Test navigation between all pages
- [ ] Test permission-based visibility
- [ ] Test message display after form submission

**File**: `tests/web_ui/test_integration.py`

**Test Classes**:
- `TestAuthenticationFlow`
- `TestNavigationFlow`

**Acceptance**: All integration tests pass

**Dependencies**: T023-T028
**Parallel**: No (requires full implementation)

---

### [ ] T033: Write performance tests
**Description**: Validate context processor performance (SC-010: < 5ms overhead).

**Checklist**:
- [ ] Create `tests/web_ui/test_performance.py`
- [ ] Test context processor execution time
- [ ] Run 100 iterations to get average
- [ ] Assert average < 5ms
- [ ] Document results

**File**: `tests/web_ui/test_performance.py`

**Test Class**: `TestContextProcessorPerformance`

**Acceptance**: Performance test passes, context processor < 5ms

**Dependencies**: T005
**Parallel**: Yes

---

### [ ] T034: Update web_ui README with usage guide
**Description**: Complete README with template extension examples.

**Checklist**:
- [ ] Add "Extending Base Templates" section with code examples
- [ ] Add "Template Blocks Guide" documenting safe vs. internal blocks
- [ ] Add "Using Components" section for form_field, list_table, etc.
- [ ] Add "Context Variables" reference
- [ ] Add "Adding Custom Navigation" guide
- [ ] Add "Styling Guide" for CSS class hooks
- [ ] Add code examples for common patterns
- [ ] Review for completeness

**File**: `src/web_ui/README.md`

**Sections to Complete**:
1. Extending Base Templates (with examples)
2. Template Blocks Guide (safe vs. internal)
3. Using Components (code examples)
4. Context Variables (reference table)
5. Adding Custom Navigation (example)
6. Styling Guide (class hooks, no styles)

**Acceptance**: README complete, includes code examples, clear guidance

**Dependencies**: T004, All implementation tasks
**Parallel**: No (requires implementation complete)

---

### [ ] T035: Create feature documentation
**Description**: Document B14 feature in main docs.

**Checklist**:
- [ ] Create `docs/features/014-web-ui-baseline.md`
- [ ] Add feature overview
- [ ] Document architecture decisions from clarifications
- [ ] Document integration points (B05, B06, B07, B08)
- [ ] Document URL structure
- [ ] Document template hierarchy
- [ ] Add extension patterns
- [ ] Reference success criteria verification

**File**: `docs/features/014-web-ui-baseline.md`

**Sections**:
1. Feature Overview
2. Architecture Decisions
3. Integration Points
4. URL Structure
5. Template Hierarchy
6. Extension Patterns
7. Success Criteria

**Acceptance**: Documentation complete, references all key components

**Dependencies**: All implementation tasks
**Parallel**: Can start during implementation, finalize at end

---

### [ ] T036: Run full test suite and verify coverage
**Description**: Execute all tests, verify 90%+ coverage.

**Checklist**:
- [ ] Run `pytest tests/web_ui/ -v`
- [ ] Run `pytest tests/web_ui/ --cov=src/web_ui --cov-report=term-missing`
- [ ] Verify coverage >= 90%
- [ ] Run `pytest tests/web_ui/ --cov=src/web_ui --cov-fail-under=90`
- [ ] Fix any failing tests
- [ ] Document coverage results

**Commands**:
```powershell
pytest tests/web_ui/ -v
pytest tests/web_ui/ --cov=src/web_ui --cov-report=term-missing
pytest tests/web_ui/ --cov=src/web_ui --cov-fail-under=90
```

**Acceptance**: All tests pass, coverage ≥ 90%

**Dependencies**: T029-T033
**Parallel**: No (final validation step)

---

## Success Criteria Checklist

After completing all tasks, verify against [spec.md](spec.md) success criteria:

- [ ] **SC-001**: Developers can create a new server-side page by extending `base.html` in under 5 minutes
- [ ] **SC-002**: Navigation updates propagate to all pages automatically without touching individual view templates
- [ ] **SC-003**: 100% of pages render with valid semantic HTML5 structure (run validator)
- [ ] **SC-004**: Template rendering performance: pages render in under 50ms (server-side)
- [ ] **SC-005**: Zero template rendering errors in production for 30 days after deployment
- [ ] **SC-006**: Downstream products can override base templates and add custom branding
- [ ] **SC-007**: Navigation visibility correctly reflects user permissions (0 unauthorized links)
- [ ] **SC-008**: Flash messages display correctly for 100% of user actions
- [ ] **SC-009**: Reusable components reduce template code duplication by 60%
- [ ] **SC-010**: Template context processor adds less than 5ms overhead to request processing

---

## File Manifest

### Files to Create (31 total)

**Python** (8):
- `src/web_ui/__init__.py`
- `src/web_ui/apps.py`
- `src/web_ui/views.py`
- `src/web_ui/urls.py`
- `src/web_ui/context_processors/__init__.py`
- `src/web_ui/context_processors/navigation.py`
- `src/web_ui/templatetags/__init__.py`
- `src/web_ui/templatetags/ui_tags.py`

**Templates** (15):
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

**Tests** (6):
- `tests/web_ui/__init__.py`
- `tests/web_ui/test_templates.py`
- `tests/web_ui/test_context_processors.py`
- `tests/web_ui/test_views.py`
- `tests/web_ui/test_integration.py`
- `tests/web_ui/test_performance.py`

**Documentation** (2):
- `src/web_ui/README.md`
- `docs/features/014-web-ui-baseline.md`

### Files to Modify (2 total)
- `src/config/settings/base.py` (INSTALLED_APPS, TEMPLATES, SITE_NAME)
- `src/config/urls.py` (include web_ui.urls)

---

## Progress Tracking

**Total Tasks**: 36
**Estimated Total Effort**: 30 hours (5-7 days, 1 developer)

### By Work Package:
- WP01: 4 tasks (2 hours)
- WP02: 4 tasks (6 hours)
- WP03: 3 tasks (4 hours)
- WP04: 6 tasks (5 hours)
- WP05: 5 tasks (4 hours)
- WP06: 6 tasks (3 hours)
- WP07: 8 tasks (6 hours)

### Parallelization Opportunities:
- WP04 can parallelize with WP05
- Within WP05, T018-T021 can work in parallel
- Within WP06, T023-T026 can work in parallel
- Within WP07, T029-T031, T033 can work in parallel

**Next Step**: Begin WP01 - Django App Setup & Configuration
