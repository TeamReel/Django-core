# Web UI Baseline

**Purpose**: Provides server-side template infrastructure with semantic HTML, permission-aware navigation, and reusable components.

## Overview

The `web_ui` app delivers a baseline template system for building server-rendered Django views. It includes:

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

Components are designed for reuse across all pages. Include them using Django's `{% include %}` tag:

```html
{# Display Django messages #}
{% include "web_ui/components/messages.html" %}

{# Render a form field #}
{% include "web_ui/components/form_field.html" with field=form.email %}

{# Display paginated list #}
{% include "web_ui/components/list_table.html" with items=organisations %}
{% include "web_ui/components/pagination.html" with page_obj=organisations %}
```

## Performance Targets

- **Context processor**: <5ms overhead per request (measured in dev/CI environment)
- **Base template rendering**: <100ms for typical pages (measured in dev/CI environment)

## Integration Points

- **B05 (accounts)**: Overrides authentication templates (`login.html`, `register.html`, etc.)
- **B06 (organisations)**: Provides navigation and stub view for organisation listing
- **B07 (projects)**: Provides navigation and stub view for project listing
- **B08 (permissions)**: Uses RBAC permissions for navigation visibility

## Development Notes

- **HTML only**: B14 provides semantic HTML with CSS class hooks. No CSS/JS assets are shipped. Styling is deferred to downstream products.
- **Template inheritance**: Use `{% extends "web_ui/base/base.html" %}` for all pages
- **Permission checks**: Precomputed flags avoid N+1 queries in templates
- **Component design**: All components accept context variables via `{% include ... with ... %}`

## Testing

Test coverage targets:
- Context processor: Unit tests for permission precomputation
- Views: Template rendering, URL routing, permission integration
- Components: Rendering with various data states (empty, paginated, etc.)
- Overall target: 80%+ coverage for B14-related Python code

See `tests/` directory for comprehensive test suite (implemented in WP07).

## Constitutional Compliance

All B14 features align with django-core constitutional principles:
- **Principle I**: No product-specific logic
- **Principle II**: Security by default (permission checks required)
- **Principle IV**: Developer experience (clear documentation, reusable components)
- **Principle VI**: Open architecture (template blocks for customization)

## Next Steps

After WP01 setup:
1. **WP02**: Implement base template and context processor
2. **WP03**: Build navigation component with permission integration
3. **WP04**: Create reusable components (forms, lists, pagination)
4. **WP05**: Override B05 authentication templates
5. **WP06**: Add stub views and URL routing
6. **WP07**: Comprehensive testing and documentation

## Support

For questions or issues:
- Review [kitty-specs/014-web-ui-baseline/spec.md](../../kitty-specs/014-web-ui-baseline/spec.md)
- Check [kitty-specs/014-web-ui-baseline/plan.md](../../kitty-specs/014-web-ui-baseline/plan.md)
- Consult task prompts in [kitty-specs/014-web-ui-baseline/tasks/](../../kitty-specs/014-web-ui-baseline/tasks/)
