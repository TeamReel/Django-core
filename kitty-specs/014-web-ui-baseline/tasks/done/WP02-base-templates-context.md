---
lane: "done"
agent: "claude-reviewer"
shell_pid: "11588"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---
# Work Package: WP02 – Base Templates & Context Processor

## Metadata
- **Work Package ID**: WP02
- **Title**: Base Templates & Context Processor
- **Lane**: for_review
- **Priority**: P0 (Foundational)
- **Estimated Effort**: 6 hours
- **Subtasks**: T005, T006, T007, T008

## History
- 2025-11-30: Created from plan.md

## Activity Log
- 2025-11-30T13:00:00Z – claude – shell_pid=11588 – lane=doing – Started WP02 implementation
- 2025-11-30T14:00:00Z – claude – shell_pid=11588 – lane=doing – Completed all 4 subtasks (T005-T008): context processor with permission precomputation, settings registration, base.html with semantic HTML5, SITE_NAME configuration, placeholder components

---

## Objective

Create the foundational `base.html` template with semantic HTML5 structure and two-tier block system. Implement context processor that exposes user state and precomputed permission flags to all templates.

## Context & Constraints

- **Architecture Decisions** (from clarifications):
  - No CSS/JS files - pure HTML with class hooks
  - Hybrid permission approach: precompute flags for navigation, provide helper for edge cases
  - Two-tier block system: safe blocks (content, title, extra_head, extra_nav_items) vs. internal blocks (navigation_inner, header_structure)
- **Performance Target**: Context processor must execute in < 5ms (SC-010)
- **Integration**: Context processor will use B08 permission system

## Subtasks & Detailed Guidance

### T005: Create context processor with permission flags

**Goal**: Build context processor that precomputes permission booleans for navigation rendering.

**File**: `src/web_ui/context_processors/navigation.py`

**Implementation**:
```python
"""Context processor for navigation and user state."""
from typing import Any, Dict
from django.http import HttpRequest


def navigation_context(request: HttpRequest) -> Dict[str, Any]:
    """
    Provide navigation context for all templates.

    Precomputes permission flags to avoid N+1 queries during navigation rendering.
    Execution target: < 5ms per request (SC-010).

    Exposes:
    - user: Current user (from request.user)
    - is_authenticated: Boolean auth state
    - can_view_orgs: Boolean permission flag
    - can_manage_orgs: Boolean permission flag
    - can_view_projects: Boolean permission flag
    - has_perm: Permission helper function for edge cases

    Returns:
        Dict with context variables for templates
    """
    user = request.user
    context = {
        'user': user,
        'is_authenticated': user.is_authenticated,
    }

    # Precompute permission flags for navigation (avoids per-item checks)
    if user.is_authenticated:
        # Use B08 permission system
        # Note: Adjust permission codenames based on actual B08 implementation
        context['can_view_orgs'] = user.has_perm('organisations.view_organisation')
        context['can_manage_orgs'] = user.has_perm('organisations.manage_organisation')
        context['can_view_projects'] = user.has_perm('projects.view_project')
    else:
        # Anonymous user - no permissions
        context['can_view_orgs'] = False
        context['can_manage_orgs'] = False
        context['can_view_projects'] = False

    # Provide helper function for edge case permission checks
    def has_perm(perm: str) -> bool:
        """Check if user has a specific permission (for edge cases)."""
        return user.has_perm(perm) if user.is_authenticated else False

    context['has_perm'] = has_perm

    return context
```

**Key Design Points**:
1. **Precomputed flags**: The three flags (`can_view_orgs`, `can_manage_orgs`, `can_view_projects`) are computed once per request
2. **Edge case helper**: `has_perm()` function provided for permissions not covered by precomputed flags
3. **Type hints**: Full typing for IDE support and clarity
4. **Performance**: Single query execution, no N+1 risk

**Permission Codenames** (verify against B08):
- `organisations.view_organisation`
- `organisations.manage_organisation` (or `organisations.add_organisation`, `organisations.change_organisation`)
- `projects.view_project`

If B08 uses different codenames, update accordingly.

**Validation**:
```python
# Test in Django shell
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from accounts.models import User
from web_ui.context_processors.navigation import navigation_context

rf = RequestFactory()
request = rf.get('/')

# Test anonymous user
request.user = AnonymousUser()
context = navigation_context(request)
assert context['is_authenticated'] is False
assert context['can_view_orgs'] is False

# Test authenticated user
user = User.objects.first()
request.user = user
context = navigation_context(request)
assert context['is_authenticated'] is True
assert 'can_view_orgs' in context
```

**Parallel**: No (blocks WP03, WP04, WP06)

---

### T006: Register context processor in settings

**Goal**: Add context processor to TEMPLATES configuration so it runs on every request.

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

**Important**: Add after Django's built-in context processors, before any app-specific ones.

**Validation**:
```python
# Test in view
def test_view(request):
    # Context processor variables should be available in template context
    return render(request, 'test.html')

# In template test.html:
# {{ user }}
# {{ is_authenticated }}
# {{ can_view_orgs }}
```

**Parallel**: No (depends on T005)

---

### T007: Create base.html template with block structure

**Goal**: Implement root template with semantic HTML5 and documented two-tier block system.

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
    ============================================================
    SAFE BLOCK: extra_head
    Downstream templates can override to add custom meta tags, CSS links, etc.
    ============================================================
    {% endcomment %}
    {% block extra_head %}{% endblock %}
</head>
<body class="ui-layout">
    <header class="ui-header">
        {% comment %}
        ============================================================
        INTERNAL BLOCK: header_structure
        RESERVED for baseline layout - DO NOT override in downstream templates.
        This ensures consistent header structure across all pages.
        ============================================================
        {% endcomment %}
        {% block header_structure %}
        <div class="ui-header__inner">
            <div class="ui-header__brand">
                <a href="{% url 'ui_home' %}" class="ui-brand-link">{{ site_name|default:"Django Core" }}</a>
            </div>
            <nav class="ui-nav">
                {% comment %}
                ============================================================
                INTERNAL BLOCK: navigation_inner
                RESERVED for baseline navigation structure - DO NOT override.
                Use extra_nav_items in navigation.html for additions.
                ============================================================
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
        ============================================================
        SAFE BLOCK: messages
        Override to customize message display (but default should work for most cases).
        ============================================================
        {% endcomment %}
        {% block messages %}
        {% include "web_ui/components/messages.html" %}
        {% endblock %}

        {% comment %}
        ============================================================
        SAFE BLOCK: content
        PRIMARY block for page content - ALWAYS override in child templates.
        ============================================================
        {% endcomment %}
        {% block content %}
        <article class="ui-content">
            <p class="ui-placeholder">Base template content block - override in child templates</p>
        </article>
        {% endblock %}
    </main>

    <footer class="ui-footer">
        {% comment %}
        ============================================================
        SAFE BLOCK: footer
        Override to customize footer content.
        ============================================================
        {% endcomment %}
        {% block footer %}
        <div class="ui-footer__inner">
            <p class="ui-footer__text">&copy; 2025 {{ site_name|default:"Django Core" }}. All rights reserved.</p>
        </div>
        {% endblock %}
    </footer>

    {% comment %}
    ============================================================
    SAFE BLOCK: extra_scripts
    Override to add page-specific JavaScript (if needed in future).
    ============================================================
    {% endcomment %}
    {% block extra_scripts %}{% endblock %}
</body>
</html>
```

**Block Documentation**:

**SAFE BLOCKS** (override encouraged):
1. **`title`**: Page title (appears in browser tab)
   - Example: `{% block title %}My Page{% endblock %}`

2. **`extra_head`**: Additional head content (meta tags, CSS links)
   - Example: `{% block extra_head %}<meta name="description" content="...">{% endblock %}`

3. **`content`**: Main page content (must override in every page)
   - Example: `{% block content %}<article>...</article>{% endblock %}`

4. **`messages`**: Message display area (usually keep default)

5. **`footer`**: Footer content
   - Example: `{% block footer %}<div>Custom footer</div>{% endblock %}`

6. **`extra_scripts`**: Page-specific scripts
   - Example: `{% block extra_scripts %}<script src="..."></script>{% endblock %}`

**INTERNAL BLOCKS** (reserved - do not override):
1. **`header_structure`**: Header layout and structure
2. **`navigation_inner`**: Navigation component rendering

**CSS Class Hooks** (no styles provided):
- `ui-layout`: Body layout wrapper
- `ui-header`, `ui-header__inner`, `ui-header__brand`: Header structure
- `ui-nav`: Navigation container
- `ui-main`: Main content area
- `ui-content`: Article/content wrapper
- `ui-footer`, `ui-footer__inner`, `ui-footer__text`: Footer structure
- `ui-brand-link`: Site name link
- `ui-placeholder`: Placeholder text styling

**Semantic HTML5 Elements**:
- `<header>`: Site header
- `<nav>`: Navigation container
- `<main>`: Main content area
- `<article>`: Content wrapper (in child templates)
- `<footer>`: Site footer

**Validation**:
```python
# Test rendering
from django.template.loader import render_to_string
from django.test import RequestFactory

rf = RequestFactory()
request = rf.get('/')
html = render_to_string('web_ui/base/base.html', request=request)

# Verify HTML structure
assert '<!DOCTYPE html>' in html
assert '<header class="ui-header">' in html
assert '<nav class="ui-nav">' in html
assert '<main class="ui-main">' in html
assert '<footer class="ui-footer">' in html
```

**Parallel**: Can work in parallel with T005 (different files)

---

### T008: Create site configuration in settings

**Goal**: Add `SITE_NAME` setting for use in page titles and branding.

**File**: `src/config/settings/base.py`

**Change** (add near end of file):
```python
# ==============================================================================
# Web UI Configuration
# ==============================================================================

SITE_NAME = "Django Core"  # Used in page titles (<title> tag) and branding (header)
```

**Usage in Templates**:
```html
<title>{{ page_title }} | {{ site_name }}</title>
<a href="/">{{ site_name }}</a>
```

**Override in Production**:
```python
# src/config/settings/production.py
SITE_NAME = "Your Product Name"
```

**Validation**:
```python
from django.conf import settings
assert hasattr(settings, 'SITE_NAME')
assert settings.SITE_NAME == "Django Core"
```

**Parallel**: Yes (independent configuration)

---

## Definition of Done

- [ ] T005: Context processor created with type hints and docstring
- [ ] T006: Context processor registered in TEMPLATES
- [ ] T007: base.html template created with all blocks documented
- [ ] T008: SITE_NAME setting added
- [ ] Context processor returns all required keys (user, is_authenticated, permission flags, has_perm)
- [ ] base.html uses semantic HTML5 elements
- [ ] base.html includes CSS class hooks on all major elements
- [ ] All blocks have inline comments documenting safe vs. internal
- [ ] Template renders without errors
- [ ] `python manage.py check` passes

## Dependencies

- **Requires**: WP01 (app structure must exist)
- **Blocks**: WP03 (navigation depends on context), WP04 (components included in base), WP06 (views use base template)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Context processor performance > 5ms | High | Use precomputed flags, avoid queries in processor |
| Permission codenames don't match B08 | Medium | Verify against B08 models, adjust if needed |
| Template block conflicts | Medium | Clear documentation, separate safe vs. internal blocks |
| Missing context variables in templates | Medium | Test with authenticated and anonymous users |

## Test Strategy

**Context Processor Tests** (T005):
- Test with anonymous user (all flags False)
- Test with authenticated user (flags based on permissions)
- Test `has_perm()` helper function
- Performance test (measure execution time < 5ms)

**Template Rendering Tests** (T007):
- Test base.html renders without errors
- Test all semantic HTML5 elements present
- Test block overrides work correctly
- Test with missing context variables (graceful degradation)

**Integration Tests**:
- Full page render with context processor
- Verify permission flags available in template context

## Reviewer Guidance

**What to verify**:
1. Context processor has correct type hints
2. Permission flags use actual B08 permission codenames
3. base.html block structure matches spec (safe vs. internal clearly marked)
4. All semantic HTML5 elements present (<header>, <nav>, <main>, <footer>)
5. CSS class hooks on all major elements
6. Site name configurable via settings
7. Template renders without errors (both anonymous and authenticated)

**Red flags**:
- Context processor makes database queries inside loop
- Missing type hints or docstrings
- Block documentation unclear or missing
- Non-semantic HTML (div soup)
- Inline styles or scripts (must be class hooks only)
- Hardcoded site name (should use `site_name` variable)

**Performance check**:
```python
# Measure context processor execution time
import time
from django.test import RequestFactory
from web_ui.context_processors.navigation import navigation_context

rf = RequestFactory()
request = rf.get('/')
request.user = authenticated_user

iterations = 100
start = time.perf_counter()
for _ in range(iterations):
    navigation_context(request)
end = time.perf_counter()

avg_ms = ((end - start) / iterations) * 1000
print(f"Avg: {avg_ms:.2f}ms (target: < 5ms)")
assert avg_ms < 5.0
```

**Approval criteria**:
- Context processor returns correct data structure
- Performance < 5ms verified
- base.html validates as HTML5
- All blocks documented
- Template renders in multiple scenarios (auth states)
