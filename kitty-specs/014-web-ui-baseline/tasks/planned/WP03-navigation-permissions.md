# Work Package: WP03 – Navigation & Permissions

## Metadata
- **Work Package ID**: WP03
- **Title**: Navigation & Permissions
- **Lane**: planned
- **Priority**: P1 (Critical)
- **Estimated Effort**: 4 hours
- **Subtasks**: T009, T010, T011

## History
- 2025-11-30: Created from plan.md

---

## Objective

Build permission-aware navigation component using precomputed context flags. Handle edge cases (empty state, long names, no permissions).

## Context & Constraints

- **Architecture**: Navigation uses precomputed flags from context processor (WP02)
- **Permission Logic**: Show/hide navigation items based on `can_view_orgs`, `can_view_projects` flags
- **Edge Cases**:
  - User with no permissions → Show only public items
  - Long organization/project names → Graceful truncation
  - Empty state → "No organizations" message
- **Integration**: Links to B06 (organisations), B07 (projects), B05 (accounts)
- **URL Names** (assumed):
  - `ui_organisations_list`: Organisation listing
  - `ui_projects_list`: Project listing
  - `ui_account_profile`: User profile/settings

## Subtasks & Detailed Guidance

### T009: Create navigation.html template

**Goal**: Build navigation component with conditional visibility based on permissions.

**File**: `src/web_ui/templates/web_ui/components/navigation.html`

**Implementation**:
```html
{% comment %}
============================================================
Navigation Component
Uses precomputed permission flags from context processor:
- can_view_orgs: Show "Organisations" link
- can_view_projects: Show "Projects" link
- is_authenticated: Show user menu vs. login/register
============================================================
{% endcomment %}

<ul class="nav-list">
    {% comment %}Home link - always visible{% endcomment %}
    <li class="nav-item">
        <a href="{% url 'ui_home' %}" class="nav-link">Home</a>
    </li>

    {% if is_authenticated %}
        {% comment %}Authenticated user navigation{% endcomment %}

        {% if can_view_orgs %}
        <li class="nav-item">
            <a href="{% url 'ui_organisations_list' %}" class="nav-link">Organisations</a>
        </li>
        {% endif %}

        {% if can_view_projects %}
        <li class="nav-item">
            <a href="{% url 'ui_projects_list' %}" class="nav-link">Projects</a>
        </li>
        {% endif %}

        {% comment %}User menu{% endcomment %}
        <li class="nav-item nav-item--user">
            <span class="nav-label">{{ user.email|truncatechars:20 }}</span>
            <ul class="nav-submenu">
                <li class="nav-submenu-item">
                    <a href="{% url 'ui_account_profile' %}" class="nav-submenu-link">Profile</a>
                </li>
                <li class="nav-submenu-item">
                    <a href="{% url 'accounts:logout' %}" class="nav-submenu-link">Logout</a>
                </li>
            </ul>
        </li>

    {% else %}
        {% comment %}Anonymous user navigation{% endcomment %}
        <li class="nav-item">
            <a href="{% url 'accounts:login' %}" class="nav-link">Login</a>
        </li>
        <li class="nav-item">
            <a href="{% url 'accounts:register' %}" class="nav-link">Register</a>
        </li>
    {% endif %}

    {% comment %}
    ============================================================
    SAFE BLOCK: extra_nav_items
    Downstream apps can add navigation items here without modifying baseline.
    Example: {% block extra_nav_items %}<li>...</li>{% endblock %}
    ============================================================
    {% endcomment %}
    {% block extra_nav_items %}{% endblock %}
</ul>
```

**CSS Class Hooks**:
- `nav-list`: Main navigation list
- `nav-item`: Individual navigation item
- `nav-item--user`: User menu item (modifier)
- `nav-link`: Navigation link
- `nav-label`: Non-clickable label (user email)
- `nav-submenu`: Dropdown submenu
- `nav-submenu-item`: Submenu item
- `nav-submenu-link`: Submenu link

**Permission Logic**:
- `can_view_orgs` → Show "Organisations"
- `can_view_projects` → Show "Projects"
- No permissions → Only Home, Login, Register visible

**Email Truncation**:
- Use `truncatechars:20` to handle long emails
- Example: "verylongemail@example.com" → "verylongemail@exam..."

**Validation**:
```python
# Test with different permission scenarios
from django.test import RequestFactory, Client
from accounts.models import User

# Test 1: Anonymous user
client = Client()
response = client.get('/')
html = response.content.decode()
assert 'Login' in html
assert 'Register' in html
assert 'Organisations' not in html

# Test 2: Authenticated with permissions
user = User.objects.create_user(email='test@example.com')
# Grant permissions
client.force_login(user)
response = client.get('/')
html = response.content.decode()
assert 'Organisations' in html or 'Projects' in html  # Based on permissions
assert 'Logout' in html
```

**Parallel**: No (depends on WP02 context processor and base template)

---

### T010: Handle empty state (no permissions)

**Goal**: Show graceful empty state when user has no organizations/projects.

**File**: `src/web_ui/templates/web_ui/components/navigation.html` (already handled)

**Implementation**: Already covered in T009 - navigation shows only Home when user has no permissions.

**Additional Empty State** (in list views - will be in WP06):
```html
{% comment %}Example for organisations list view (WP06){% endcomment %}
{% if can_view_orgs %}
    {% if organisations %}
        {% for org in organisations %}
            <li>{{ org.name }}</li>
        {% endfor %}
    {% else %}
        <p class="ui-empty-state">No organisations available. <a href="{% url 'ui_organisations_create' %}">Create one</a></p>
    {% endif %}
{% else %}
    <p class="ui-error">You don't have permission to view organisations.</p>
{% endif %}
```

**CSS Class Hooks**:
- `ui-empty-state`: Empty state message styling
- `ui-error`: Error/permission denied message

**Test Scenarios**:
1. User with permissions but empty list → "No organisations available"
2. User without permissions → "You don't have permission"
3. Anonymous user → Redirect to login (handled by view)

**Validation**:
```python
# Test empty state rendering
response = client.get('/organisations/')
html = response.content.decode()
assert 'No organisations' in html or 'Create one' in html
```

**Parallel**: No (depends on T009)

---

### T011: Handle long organization/project names

**Goal**: Prevent UI breaking with extremely long names using truncation.

**File**: Navigation template uses `truncatechars` (already handled in T009 for email)

**Additional Truncation Strategy** (for list views in WP06):
```html
{% comment %}Example for organisations list{% endcomment %}
<li class="list-item">
    <a href="{% url 'ui_organisations_detail' org.id %}" class="list-link" title="{{ org.name }}">
        {{ org.name|truncatechars:50 }}
    </a>
</li>
```

**Truncation Rules**:
- **Navigation items**: 30 chars max
- **List item names**: 50 chars max
- **Page titles**: No truncation (full name in browser tab)
- Always use `title` attribute with full name for tooltip

**CSS Approach** (alternative for future):
```html
<style>
/* When CSS is added later, use text-overflow instead of truncatechars */
.list-link {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
}
</style>
```

**Test Scenarios**:
1. Name = 100 chars → Truncated to 50 chars + "..."
2. Name = 30 chars → No truncation
3. Special characters (emoji, unicode) → Handle gracefully

**Test Data**:
```python
# Create test organisation with long name
from organisations.models import Organisation

long_name = "A" * 100
org = Organisation.objects.create(
    name=long_name,
    owner=user
)

# Verify truncation in template
response = client.get('/organisations/')
html = response.content.decode()
assert long_name not in html  # Full name not rendered
assert f"{long_name[:47]}..." in html  # Truncated version
```

**Validation**:
```python
# Test navigation with long email
user = User.objects.create_user(email='verylongemail@example.com')
client.force_login(user)
response = client.get('/')
html = response.content.decode()
assert 'verylongemail@exam...' in html  # Truncated
```

**Parallel**: No (depends on T009)

---

## Definition of Done

- [ ] T009: navigation.html created with permission-based visibility
- [ ] T010: Empty state handled (no permissions → show only public items)
- [ ] T011: Long names truncated with `truncatechars`
- [ ] Navigation shows correct items based on permission flags
- [ ] Anonymous users see Login/Register only
- [ ] Authenticated users see org/project links based on permissions
- [ ] User email truncated to 20 chars
- [ ] Navigation renders without errors
- [ ] Manual testing with multiple permission scenarios
- [ ] `extra_nav_items` block documented and available

## Dependencies

- **Requires**: WP02 (context processor must provide permission flags)
- **Blocks**: None (navigation is standalone component)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| URL names don't match B06/B07 | Medium | Verify URL patterns, adjust if needed |
| Permission flags not available | High | Ensure WP02 context processor complete |
| Long names break layout | Low | Use truncatechars, test with extreme cases |
| Dropdown menu requires JS | Low | Defer to CSS-only approach or future enhancement |

## Test Strategy

**Permission-based Visibility** (T009):
- Test anonymous user → Only public navigation
- Test authenticated with no permissions → Home + Logout only
- Test authenticated with permissions → Org/Project links visible

**Empty State** (T010):
- Test empty organisation list → "No organisations" message
- Test no permissions → Permission denied message

**Long Names** (T011):
- Test 100-char organisation name → Truncated to 50 chars
- Test 100-char user email → Truncated to 20 chars
- Test special characters/emoji → Renders correctly

**Manual Test Checklist**:
1. Login as user with all permissions → All nav items visible
2. Login as user with no permissions → Only Home + Logout
3. Anonymous user → Only Home, Login, Register
4. Create org with 100-char name → Navigation doesn't break
5. User with 50-char email → Email truncated in nav

## Reviewer Guidance

**What to verify**:
1. Navigation uses precomputed permission flags (not inline queries)
2. Conditional logic correct (if is_authenticated, if can_view_orgs)
3. All URL names match actual URL patterns
4. CSS class hooks on all elements
5. `extra_nav_items` block available and documented
6. Truncation applied to user email and long names
7. Empty state messages clear and helpful

**Red flags**:
- Inline permission checks (`user.has_perm()`) in template (should use precomputed flags)
- Missing truncation on long text
- Hardcoded URLs (must use `{% url %}` tags)
- Missing CSS class hooks
- No empty state handling
- Navigation breaks with anonymous user

**Manual verification**:
```bash
# Start dev server
python manage.py runserver

# Test scenarios:
# 1. Visit http://localhost:8000/ as anonymous → Check nav items
# 2. Login as superuser → Check all nav items visible
# 3. Login as restricted user → Check limited nav items
# 4. Create org with 100-char name → Check nav doesn't break
```

**Approval criteria**:
- Navigation renders correctly for all permission scenarios
- Empty states clear and actionable
- Long names handled gracefully
- No inline permission queries in template
- All CSS class hooks present
