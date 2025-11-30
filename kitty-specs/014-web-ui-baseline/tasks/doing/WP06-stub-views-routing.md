# Work Package: WP06 – Stub Views & URL Routing

## Metadata
- **Work Package ID**: WP06
- **Title**: Stub Views & URL Routing
- **Lane**: doing
- **Priority**: P2 (Medium)
- **Estimated Effort**: 3 hours
- **Subtasks**: T023, T024, T025, T026, T027, T028

## History
- 2025-11-30: Created from plan.md
- 2025-11-30: Started by claude (shell_pid=11588) - lane=doing

---

## Objective

Create stub views (home, organisations, projects, account) with placeholder templates. Configure URL routing to make views accessible. Views return static HTML without full business logic.

## Context & Constraints

- **Stub Views**: Minimal logic, placeholder content, proper structure
- **Integration**: Link to B05 (accounts), B06 (organisations), B07 (projects)
- **URL Namespace**: `web_ui` namespace (e.g., `ui_home`, `ui_organisations_list`)
- **Templates**: Use WP02 base, WP04 components
- **MVP Scope**: This WP completes the user-facing UI foundation

## Subtasks & Detailed Guidance

### T023: Create home view and template

**Goal**: Landing page showing welcome message and navigation guidance.

**File 1**: `src/web_ui/views/home.py`
```python
"""Home view for web_ui app."""
from django.shortcuts import render
from django.http import HttpRequest, HttpResponse


def home(request: HttpRequest) -> HttpResponse:
    """
    Home page view.

    Shows welcome message and navigation links.
    No authentication required.
    """
    context = {
        'page_title': 'Home',
    }
    return render(request, 'web_ui/home.html', context)
```

**File 2**: `src/web_ui/templates/web_ui/home.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Home{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--xlarge">Welcome to {{ site_name }}</h1>
        <p class="ui-text ui-text--lead">Your centralized platform for managing organisations and projects.</p>
    </header>

    <section class="ui-section">
        {% if is_authenticated %}
            <h2 class="ui-heading ui-heading--medium">Quick Links</h2>
            <ul class="ui-list">
                {% if can_view_orgs %}
                <li class="ui-list-item">
                    <a href="{% url 'ui_organisations_list' %}" class="ui-link">View Organisations</a>
                </li>
                {% endif %}
                {% if can_view_projects %}
                <li class="ui-list-item">
                    <a href="{% url 'ui_projects_list' %}" class="ui-link">View Projects</a>
                </li>
                {% endif %}
                <li class="ui-list-item">
                    <a href="{% url 'ui_account_profile' %}" class="ui-link">View Profile</a>
                </li>
            </ul>
        {% else %}
            <p class="ui-text">Please <a href="{% url 'accounts:login' %}" class="ui-link">login</a> or <a href="{% url 'accounts:register' %}" class="ui-link">register</a> to get started.</p>
        {% endif %}
    </section>
</article>
{% endblock %}
```

**CSS Class Hooks**:
- `ui-heading--xlarge`: Extra large heading
- `ui-text--lead`: Lead paragraph (intro text)
- `ui-section`: Content section
- `ui-list`: Unordered list
- `ui-list-item`: List item

**Validation**:
```python
# Test home view
from django.test import Client

client = Client()
response = client.get('/')
assert response.status_code == 200
assert 'Welcome to' in response.content.decode()
```

**Parallel**: Yes (independent view)

---

### T024: Create organisations list view and template

**Goal**: Show list of organisations (stub - empty list or placeholder).

**File 1**: `src/web_ui/views/organisations.py`
```python
"""Organisation views for web_ui app."""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required, permission_required
from django.http import HttpRequest, HttpResponse


@login_required
@permission_required('organisations.view_organisation', raise_exception=True)
def organisations_list(request: HttpRequest) -> HttpResponse:
    """
    List all organisations.

    Stub view - returns empty list.
    Full implementation will query Organisation model.
    """
    context = {
        'page_title': 'Organisations',
        'organisations': [],  # Stub - no actual data yet
        'columns': [
            {'field': 'name', 'label': 'Name'},
            {'field': 'created_at', 'label': 'Created'},
        ],
        'actions': [
            {'url_name': 'ui_organisations_detail', 'label': 'View', 'url_field': 'id'},
        ],
    }
    return render(request, 'web_ui/organisations/list.html', context)


@login_required
def organisations_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """
    Organisation detail view (stub).

    Args:
        pk: Organisation primary key
    """
    context = {
        'page_title': 'Organisation Detail',
        'organisation_id': pk,
    }
    return render(request, 'web_ui/organisations/detail.html', context)
```

**File 2**: `src/web_ui/templates/web_ui/organisations/list.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Organisations{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Organisations</h1>
    </header>

    {% if organisations %}
        {% include "web_ui/components/list_table.html" with items=organisations %}
    {% else %}
        <p class="ui-empty-state">No organisations available. This is a stub view - organisation management coming soon.</p>
    {% endif %}
</article>
{% endblock %}
```

**File 3**: `src/web_ui/templates/web_ui/organisations/detail.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Organisation Detail{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Organisation Detail</h1>
        <p class="ui-text">Viewing organisation ID: {{ organisation_id }}</p>
    </header>

    <p class="ui-placeholder">This is a stub view. Organisation detail page coming soon.</p>

    <footer class="ui-content__footer">
        <a href="{% url 'ui_organisations_list' %}" class="ui-link">&larr; Back to Organisations</a>
    </footer>
</article>
{% endblock %}
```

**Permission Requirements**:
- List: `organisations.view_organisation`
- Detail: `@login_required` only (no specific permission check in stub)

**Future Enhancement Placeholder**:
```python
# Full implementation (future):
from organisations.models import Organisation

def organisations_list(request):
    organisations = Organisation.objects.filter(members=request.user)
    # ... pagination, filtering
```

**Validation**:
```python
# Test organisations list
from accounts.models import User
from django.contrib.auth.models import Permission

user = User.objects.create_user(email='test@example.com', password='test')
perm = Permission.objects.get(codename='view_organisation')
user.user_permissions.add(perm)

client = Client()
client.force_login(user)
response = client.get('/organisations/')
assert response.status_code == 200
assert 'No organisations available' in response.content.decode()
```

**Parallel**: Can work in parallel with T025, T026 (independent views)

---

### T025: Create projects list view and template

**Goal**: Show list of projects (stub - empty list or placeholder).

**File 1**: `src/web_ui/views/projects.py`
```python
"""Project views for web_ui app."""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required, permission_required
from django.http import HttpRequest, HttpResponse


@login_required
@permission_required('projects.view_project', raise_exception=True)
def projects_list(request: HttpRequest) -> HttpResponse:
    """
    List all projects.

    Stub view - returns empty list.
    Full implementation will query Project model.
    """
    context = {
        'page_title': 'Projects',
        'projects': [],  # Stub - no actual data yet
        'columns': [
            {'field': 'name', 'label': 'Name'},
            {'field': 'organisation__name', 'label': 'Organisation'},
            {'field': 'created_at', 'label': 'Created'},
        ],
        'actions': [
            {'url_name': 'ui_projects_detail', 'label': 'View', 'url_field': 'id'},
        ],
    }
    return render(request, 'web_ui/projects/list.html', context)


@login_required
def projects_detail(request: HttpRequest, pk: int) -> HttpResponse:
    """
    Project detail view (stub).

    Args:
        pk: Project primary key
    """
    context = {
        'page_title': 'Project Detail',
        'project_id': pk,
    }
    return render(request, 'web_ui/projects/detail.html', context)
```

**File 2**: `src/web_ui/templates/web_ui/projects/list.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Projects{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Projects</h1>
    </header>

    {% if projects %}
        {% include "web_ui/components/list_table.html" with items=projects %}
    {% else %}
        <p class="ui-empty-state">No projects available. This is a stub view - project management coming soon.</p>
    {% endif %}
</article>
{% endblock %}
```

**File 3**: `src/web_ui/templates/web_ui/projects/detail.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Project Detail{% endblock %}

{% block content %}
<article class="ui-content">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Project Detail</h1>
        <p class="ui-text">Viewing project ID: {{ project_id }}</p>
    </header>

    <p class="ui-placeholder">This is a stub view. Project detail page coming soon.</p>

    <footer class="ui-content__footer">
        <a href="{% url 'ui_projects_list' %}" class="ui-link">&larr; Back to Projects</a>
    </footer>
</article>
{% endblock %}
```

**Validation**:
```python
# Test projects list
perm = Permission.objects.get(codename='view_project')
user.user_permissions.add(perm)

response = client.get('/projects/')
assert response.status_code == 200
assert 'No projects available' in response.content.decode()
```

**Parallel**: Yes (independent view)

---

### T026: Create account profile view and template

**Goal**: User profile/settings page (stub - show basic user info).

**File 1**: `src/web_ui/views/account.py`
```python
"""Account views for web_ui app."""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse


@login_required
def account_profile(request: HttpRequest) -> HttpResponse:
    """
    User profile/account settings view (stub).

    Shows basic user information.
    Full implementation will allow profile editing.
    """
    context = {
        'page_title': 'Profile',
    }
    return render(request, 'web_ui/account/profile.html', context)
```

**File 2**: `src/web_ui/templates/web_ui/account/profile.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Profile{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Your Profile</h1>
    </header>

    <section class="ui-section">
        <h2 class="ui-heading ui-heading--medium">Account Information</h2>
        <dl class="ui-description-list">
            <dt class="ui-description-term">Email:</dt>
            <dd class="ui-description-detail">{{ user.email }}</dd>

            <dt class="ui-description-term">Account Status:</dt>
            <dd class="ui-description-detail">
                {% if user.is_active %}
                    <span class="ui-badge ui-badge--success">Active</span>
                {% else %}
                    <span class="ui-badge ui-badge--error">Inactive</span>
                {% endif %}
            </dd>

            <dt class="ui-description-term">Joined:</dt>
            <dd class="ui-description-detail">{{ user.date_joined|date:"F j, Y" }}</dd>
        </dl>
    </section>

    <footer class="ui-content__footer">
        <p class="ui-placeholder">Profile editing coming soon.</p>
    </footer>
</article>
{% endblock %}
```

**CSS Class Hooks**:
- `ui-description-list`: Description list (dl)
- `ui-description-term`: Term (dt)
- `ui-description-detail`: Detail (dd)
- `ui-badge`: Badge element
- `ui-badge--success`: Success badge modifier (green)
- `ui-badge--error`: Error badge modifier (red)

**Validation**:
```python
# Test account profile
response = client.get('/account/profile/')
assert response.status_code == 200
assert user.email in response.content.decode()
assert 'Account Information' in response.content.decode()
```

**Parallel**: Yes (independent view)

---

### T027: Create views/__init__.py to export views

**Goal**: Centralize view imports for easy URL configuration.

**File**: `src/web_ui/views/__init__.py`
```python
"""Views for web_ui app."""
from .home import home
from .organisations import organisations_list, organisations_detail
from .projects import projects_list, projects_detail
from .account import account_profile

__all__ = [
    'home',
    'organisations_list',
    'organisations_detail',
    'projects_list',
    'projects_detail',
    'account_profile',
]
```

**Validation**:
```python
# Test imports
from web_ui.views import (
    home,
    organisations_list,
    organisations_detail,
    projects_list,
    projects_detail,
    account_profile,
)

assert callable(home)
assert callable(organisations_list)
```

**Parallel**: No (depends on T023-T026)

---

### T028: Configure URL routing

**Goal**: Map URLs to views with proper namespacing.

**File 1**: `src/web_ui/urls.py`
```python
"""URL configuration for web_ui app."""
from django.urls import path
from . import views

app_name = 'web_ui'

urlpatterns = [
    # Home
    path('', views.home, name='ui_home'),

    # Organisations
    path('organisations/', views.organisations_list, name='ui_organisations_list'),
    path('organisations/<int:pk>/', views.organisations_detail, name='ui_organisations_detail'),

    # Projects
    path('projects/', views.projects_list, name='ui_projects_list'),
    path('projects/<int:pk>/', views.projects_detail, name='ui_projects_detail'),

    # Account
    path('account/profile/', views.account_profile, name='ui_account_profile'),
]
```

**File 2**: `src/config/urls.py` (update to include web_ui)
```python
"""Main URL configuration."""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),  # B05 auth URLs
    path('', include('web_ui.urls')),  # Web UI URLs (catch-all, place last)
]
```

**URL Pattern Summary**:
- `/` → Home page
- `/organisations/` → Organisations list
- `/organisations/<id>/` → Organisation detail
- `/projects/` → Projects list
- `/projects/<id>/` → Project detail
- `/account/profile/` → User profile
- `/accounts/login/` → Login (B05)
- `/accounts/register/` → Register (B05)
- `/accounts/logout/` → Logout (B05)
- `/accounts/password-reset/` → Password reset (B05)

**Validation**:
```python
# Test URL resolution
from django.urls import reverse

assert reverse('ui_home') == '/'
assert reverse('ui_organisations_list') == '/organisations/'
assert reverse('ui_organisations_detail', args=[1]) == '/organisations/1/'
assert reverse('ui_projects_list') == '/projects/'
assert reverse('ui_account_profile') == '/account/profile/'
```

**Parallel**: No (depends on T027)

---

## Definition of Done

- [ ] T023: Home view and template created
- [ ] T024: Organisations list/detail views and templates created
- [ ] T025: Projects list/detail views and templates created
- [ ] T026: Account profile view and template created
- [ ] T027: views/__init__.py exports all views
- [ ] T028: URL routing configured
- [ ] All views have type hints and docstrings
- [ ] All templates extend base.html
- [ ] All views use permission decorators
- [ ] URL reverse resolution works
- [ ] Manual testing: All pages accessible and render correctly

## Dependencies

- **Requires**: WP01 (app structure), WP02 (base template), WP04 (components)
- **Blocks**: WP07 (testing depends on views existing)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Permission codenames don't match B06/B07 | Medium | Verify against actual models, adjust if needed |
| URL namespace conflicts | Low | Use unique namespace 'web_ui' |
| Missing view decorators | Medium | Review each view for @login_required/@permission_required |
| Template paths incorrect | Medium | Follow Django convention: app/templates/app/... |

## Test Strategy

**View Tests**:
- Test each view returns 200 for authorized users
- Test permission decorators work (403 for unauthorized)
- Test context variables present

**URL Tests**:
- Test URL resolution (reverse lookup)
- Test URL patterns match views

**Template Tests**:
- Test templates extend base.html
- Test placeholder content present

**Manual Tests**:
- Visit each URL as authenticated user
- Visit each URL as anonymous user (should redirect or 403)
- Verify navigation links work

## Reviewer Guidance

**What to verify**:
1. All 6 views created with type hints and docstrings
2. All views use appropriate decorators (@login_required, @permission_required)
3. All templates extend web_ui/base/base.html
4. Stub views clearly marked with comments (# Stub view)
5. URL patterns follow RESTful conventions
6. views/__init__.py exports all views
7. config/urls.py includes web_ui.urls

**Red flags**:
- Views without permission checks (security risk)
- Templates don't extend base.html
- Hardcoded URLs in templates (must use {% url %})
- Missing type hints or docstrings
- URL patterns don't follow conventions
- Stub views trying to implement full logic

**Manual verification**:
```bash
# Start server
python manage.py runserver

# Test URLs:
http://localhost:8000/  # Home
http://localhost:8000/organisations/  # Orgs list (requires login + permission)
http://localhost:8000/projects/  # Projects list (requires login + permission)
http://localhost:8000/account/profile/  # Profile (requires login)
http://localhost:8000/organisations/1/  # Org detail (404 expected - no data)

# Check permission enforcement:
# 1. Visit /organisations/ as anonymous → Redirect to login
# 2. Login as user without permission → 403
# 3. Login as superuser → 200 OK
```

**Approval criteria**:
- All views accessible via URLs
- Permission decorators enforced
- Templates render correctly
- Stub content clear (no confusion with final product)
- URL reverse resolution works
- No security vulnerabilities (missing @login_required)
