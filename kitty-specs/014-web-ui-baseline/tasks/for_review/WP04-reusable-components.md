# Work Package: WP04 – Reusable Components

## Metadata
- **Work Package ID**: WP04
- **Title**: Reusable Components
- **Lane**: for_review
- **Priority**: P2 (Medium)
- **Estimated Effort**: 5 hours
- **Subtasks**: T012, T013, T014, T015, T016, T017

## History
- 2025-11-30: Created from plan.md
- 2025-11-30: Started by claude (shell_pid=11588) - lane=doing
- 2025-11-30: Completed by claude (shell_pid=11588) - lane=for_review

---

## Objective

Create reusable template components (messages, form field, form layout, list table, pagination) and custom template filter (`getattribute`) for dynamic attribute access.

## Context & Constraints

- **Architecture**: Server-side only, semantic HTML5, no CSS/JS
- **Reusability**: Components must work across organisations, projects, accounts contexts
- **Accessibility**: Use semantic HTML (labels, fieldsets, etc.)
- **Integration**: Used by WP06 stub views
- **Can parallelize**: Yes, with WP05 (independent work)

## Subtasks & Detailed Guidance

### T012: Create messages.html component

**Goal**: Display Django messages framework output with semantic HTML.

**File**: `src/web_ui/templates/web_ui/components/messages.html`

**Implementation**:
```html
{% comment %}
============================================================
Messages Component
Displays Django messages (success, error, warning, info).
Uses Django messages framework: django.contrib.messages
============================================================
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
- `ui-message`: Individual message
- `ui-message--success`: Success message (modifier)
- `ui-message--error`: Error message (modifier)
- `ui-message--warning`: Warning message (modifier)
- `ui-message--info`: Info message (modifier)
- `ui-message__text`: Message text

**Message Tags** (from Django):
- `success`: Green styling (future)
- `error`: Red styling (future)
- `warning`: Yellow styling (future)
- `info`: Blue styling (future)
- `debug`: Gray styling (future)

**Usage in Views**:
```python
from django.contrib import messages

def my_view(request):
    messages.success(request, "Organisation created successfully!")
    messages.error(request, "Failed to save project.")
    return redirect('ui_home')
```

**Validation**:
```python
# Test message rendering
from django.test import Client
from django.contrib.messages import get_messages

client = Client()
response = client.post('/some-form/', {'name': 'Test'}, follow=True)
messages = list(get_messages(response.wsgi_request))
assert len(messages) == 1
assert 'successfully' in str(messages[0])

html = response.content.decode()
assert 'ui-message--success' in html
```

**Parallel**: Yes (independent component)

---

### T013: Create form_field.html component

**Goal**: Render individual form field with label, input, and errors.

**File**: `src/web_ui/templates/web_ui/components/form_field.html`

**Implementation**:
```html
{% comment %}
============================================================
Form Field Component
Renders a Django form field with label, input, and errors.

Usage: {% include "web_ui/components/form_field.html" with field=form.email %}

Parameters:
- field: Django form field object (required)
============================================================
{% endcomment %}

<div class="form-field {% if field.errors %}form-field--error{% endif %}">
    <label for="{{ field.id_for_label }}" class="form-label">
        {{ field.label }}
        {% if field.field.required %}
            <span class="form-required" aria-label="required">*</span>
        {% endif %}
    </label>

    {{ field }}

    {% if field.help_text %}
    <small class="form-help-text">{{ field.help_text }}</small>
    {% endif %}

    {% if field.errors %}
    <ul class="form-errors">
        {% for error in field.errors %}
        <li class="form-error">{{ error }}</li>
        {% endfor %}
    </ul>
    {% endif %}
</div>
```

**CSS Class Hooks**:
- `form-field`: Field container
- `form-field--error`: Error state modifier
- `form-label`: Field label
- `form-required`: Required indicator (asterisk)
- `form-help-text`: Help text below input
- `form-errors`: Error list container
- `form-error`: Individual error message

**Usage in Templates**:
```html
<form method="post" class="ui-form">
    {% csrf_token %}
    {% include "web_ui/components/form_field.html" with field=form.name %}
    {% include "web_ui/components/form_field.html" with field=form.email %}
    <button type="submit" class="ui-button">Submit</button>
</form>
```

**Validation**:
```python
# Test form field rendering
from django import forms

class TestForm(forms.Form):
    email = forms.EmailField(required=True, help_text="Enter your email")

form = TestForm()
html = render_to_string('web_ui/components/form_field.html', {'field': form['email']})

assert '<label' in html
assert 'form-required' in html  # Required field
assert 'Enter your email' in html  # Help text
```

**Parallel**: Yes (independent component)

---

### T014: Create form_layout.html component

**Goal**: Render entire Django form with fieldset and submit button.

**File**: `src/web_ui/templates/web_ui/components/form_layout.html`

**Implementation**:
```html
{% comment %}
============================================================
Form Layout Component
Renders a complete Django form with fieldset wrapper.

Usage: {% include "web_ui/components/form_layout.html" with form=my_form submit_text="Save" %}

Parameters:
- form: Django form object (required)
- submit_text: Submit button text (default: "Submit")
- form_id: HTML form id attribute (optional)
- form_class: Additional CSS classes (optional)
============================================================
{% endcomment %}

<form method="post"
      {% if form_id %}id="{{ form_id }}"{% endif %}
      class="ui-form {% if form_class %}{{ form_class }}{% endif %}">
    {% csrf_token %}

    {% if form.non_field_errors %}
    <ul class="form-errors form-errors--global">
        {% for error in form.non_field_errors %}
        <li class="form-error">{{ error }}</li>
        {% endfor %}
    </ul>
    {% endif %}

    <fieldset class="form-fieldset">
        {% for field in form %}
            {% include "web_ui/components/form_field.html" with field=field %}
        {% endfor %}
    </fieldset>

    <div class="form-actions">
        <button type="submit" class="ui-button ui-button--primary">
            {{ submit_text|default:"Submit" }}
        </button>
    </div>
</form>
```

**CSS Class Hooks**:
- `ui-form`: Form element
- `form-errors--global`: Non-field errors (top of form)
- `form-fieldset`: Fieldset wrapper
- `form-actions`: Button container
- `ui-button`: Button element
- `ui-button--primary`: Primary button modifier

**Usage in Templates**:
```html
{% extends "web_ui/base/base.html" %}

{% block content %}
<article class="ui-content">
    <h1 class="ui-heading">Create Organisation</h1>
    {% include "web_ui/components/form_layout.html" with form=form submit_text="Create" %}
</article>
{% endblock %}
```

**Validation**:
```python
# Test form layout rendering
form = TestForm()
html = render_to_string('web_ui/components/form_layout.html', {'form': form, 'submit_text': 'Save'})

assert '<form method="post"' in html
assert '<fieldset' in html
assert 'ui-button--primary' in html
assert 'Save' in html  # Custom submit text
```

**Parallel**: Can work after T013 (depends on form_field.html)

---

### T015: Create list_table.html component

**Goal**: Render list of items as semantic HTML table with action links.

**File**: `src/web_ui/templates/web_ui/components/list_table.html`

**Implementation**:
```html
{% comment %}
============================================================
List Table Component
Renders a list of objects as an HTML table with columns and actions.

Usage: {% include "web_ui/components/list_table.html" with items=organisations columns=columns actions=actions %}

Parameters:
- items: QuerySet or list of objects (required)
- columns: List of dicts with 'field' and 'label' keys (required)
  Example: [{'field': 'name', 'label': 'Name'}, {'field': 'created_at', 'label': 'Created'}]
- actions: List of dicts with 'url_name', 'label', 'url_field' keys (optional)
  Example: [{'url_name': 'ui_organisations_detail', 'label': 'View', 'url_field': 'id'}]
- empty_message: Message when no items (default: "No items found.")
============================================================
{% endcomment %}

{% load web_ui_filters %}

{% if items %}
<table class="ui-table">
    <thead class="ui-table__head">
        <tr class="ui-table__row">
            {% for column in columns %}
            <th class="ui-table__header">{{ column.label }}</th>
            {% endfor %}
            {% if actions %}
            <th class="ui-table__header ui-table__header--actions">Actions</th>
            {% endif %}
        </tr>
    </thead>
    <tbody class="ui-table__body">
        {% for item in items %}
        <tr class="ui-table__row">
            {% for column in columns %}
            <td class="ui-table__cell">
                {{ item|getattribute:column.field|truncatechars:50 }}
            </td>
            {% endfor %}
            {% if actions %}
            <td class="ui-table__cell ui-table__cell--actions">
                {% for action in actions %}
                <a href="{% url action.url_name item|getattribute:action.url_field %}"
                   class="ui-link ui-link--action">{{ action.label }}</a>
                {% if not forloop.last %} | {% endif %}
                {% endfor %}
            </td>
            {% endif %}
        </tr>
        {% endfor %}
    </tbody>
</table>
{% else %}
<p class="ui-empty-state">{{ empty_message|default:"No items found." }}</p>
{% endif %}
```

**CSS Class Hooks**:
- `ui-table`: Table element
- `ui-table__head`: Table head
- `ui-table__body`: Table body
- `ui-table__row`: Table row
- `ui-table__header`: Header cell
- `ui-table__header--actions`: Actions column header
- `ui-table__cell`: Data cell
- `ui-table__cell--actions`: Actions column cell
- `ui-link`: Link element
- `ui-link--action`: Action link modifier

**Usage in Templates**:
```html
{% load web_ui_filters %}

{% block content %}
<article class="ui-content">
    <h1 class="ui-heading">Organisations</h1>

    {% with columns=columns actions=actions %}
        {% include "web_ui/components/list_table.html" with items=organisations %}
    {% endwith %}
</article>
{% endblock %}

{# In view context: #}
{# columns = [ #}
{#     {'field': 'name', 'label': 'Name'}, #}
{#     {'field': 'created_at', 'label': 'Created'}, #}
{# ] #}
{# actions = [ #}
{#     {'url_name': 'ui_organisations_detail', 'label': 'View', 'url_field': 'id'}, #}
{# ] #}
```

**Validation**:
```python
# Test list table rendering
from organisations.models import Organisation

org1 = Organisation.objects.create(name="Test Org 1")
org2 = Organisation.objects.create(name="Test Org 2")

context = {
    'items': [org1, org2],
    'columns': [{'field': 'name', 'label': 'Name'}],
    'actions': [{'url_name': 'ui_organisations_detail', 'label': 'View', 'url_field': 'id'}]
}

html = render_to_string('web_ui/components/list_table.html', context)
assert '<table' in html
assert 'Test Org 1' in html
assert 'Test Org 2' in html
assert 'View' in html  # Action link
```

**Parallel**: Depends on T017 (requires getattribute filter)

---

### T016: Create pagination.html component

**Goal**: Render pagination controls for paginated lists.

**File**: `src/web_ui/templates/web_ui/components/pagination.html`

**Implementation**:
```html
{% comment %}
============================================================
Pagination Component
Renders pagination controls for Django Paginator.

Usage: {% include "web_ui/components/pagination.html" with page_obj=page_obj %}

Parameters:
- page_obj: Django Page object from Paginator (required)
============================================================
{% endcomment %}

{% if page_obj.has_other_pages %}
<nav class="ui-pagination" aria-label="Pagination">
    <ul class="pagination-list">
        {% if page_obj.has_previous %}
        <li class="pagination-item">
            <a href="?page=1" class="pagination-link" aria-label="First page">First</a>
        </li>
        <li class="pagination-item">
            <a href="?page={{ page_obj.previous_page_number }}" class="pagination-link" aria-label="Previous page">Previous</a>
        </li>
        {% else %}
        <li class="pagination-item pagination-item--disabled">
            <span class="pagination-link">First</span>
        </li>
        <li class="pagination-item pagination-item--disabled">
            <span class="pagination-link">Previous</span>
        </li>
        {% endif %}

        <li class="pagination-item pagination-item--current">
            <span class="pagination-link" aria-current="page">
                Page {{ page_obj.number }} of {{ page_obj.paginator.num_pages }}
            </span>
        </li>

        {% if page_obj.has_next %}
        <li class="pagination-item">
            <a href="?page={{ page_obj.next_page_number }}" class="pagination-link" aria-label="Next page">Next</a>
        </li>
        <li class="pagination-item">
            <a href="?page={{ page_obj.paginator.num_pages }}" class="pagination-link" aria-label="Last page">Last</a>
        </li>
        {% else %}
        <li class="pagination-item pagination-item--disabled">
            <span class="pagination-link">Next</span>
        </li>
        <li class="pagination-item pagination-item--disabled">
            <span class="pagination-link">Last</span>
        </li>
        {% endif %}
    </ul>
</nav>
{% endif %}
```

**CSS Class Hooks**:
- `ui-pagination`: Pagination nav element
- `pagination-list`: List of pagination items
- `pagination-item`: Individual pagination item
- `pagination-item--disabled`: Disabled item (no link)
- `pagination-item--current`: Current page indicator
- `pagination-link`: Pagination link/span

**Usage in Views**:
```python
from django.core.paginator import Paginator

def organisations_list(request):
    orgs = Organisation.objects.all()
    paginator = Paginator(orgs, 20)  # 20 items per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    return render(request, 'web_ui/organisations/list.html', {
        'page_obj': page_obj,
        'organisations': page_obj.object_list,  # For list_table
    })
```

**Usage in Templates**:
```html
{% block content %}
<article class="ui-content">
    <h1>Organisations</h1>

    {% include "web_ui/components/list_table.html" with items=organisations %}
    {% include "web_ui/components/pagination.html" with page_obj=page_obj %}
</article>
{% endblock %}
```

**Validation**:
```python
# Test pagination rendering
from django.core.paginator import Paginator

items = list(range(1, 51))  # 50 items
paginator = Paginator(items, 10)
page_obj = paginator.get_page(1)

html = render_to_string('web_ui/components/pagination.html', {'page_obj': page_obj})
assert 'Page 1 of 5' in html
assert 'Next' in html
assert 'pagination-item--disabled' in html  # First/Previous disabled on page 1
```

**Parallel**: Yes (independent component)

---

### T017: Create getattribute custom template filter

**Goal**: Enable dynamic attribute access in templates (for list_table columns).

**File**: `src/web_ui/templatetags/web_ui_filters.py`

**Implementation**:
```python
"""Custom template filters for web_ui app."""
from django import template

register = template.Library()


@register.filter
def getattribute(obj, attr):
    """
    Get attribute from object dynamically.

    Usage: {{ item|getattribute:"field_name" }}

    This enables the list_table component to access arbitrary attributes
    specified in the columns configuration.

    Example:
        columns = [{'field': 'name', 'label': 'Name'}]
        {{ item|getattribute:column.field }}  # Accesses item.name

    Args:
        obj: Object to get attribute from
        attr: String attribute name

    Returns:
        Attribute value or empty string if not found
    """
    try:
        # Try direct attribute access
        return getattr(obj, attr, '')
    except (AttributeError, TypeError):
        # Fallback for dict-like objects
        try:
            return obj[attr]
        except (KeyError, TypeError):
            return ''
```

**File**: `src/web_ui/templatetags/__init__.py`
```python
"""Template tags and filters for web_ui app."""
```

**Usage in Templates**:
```html
{% load web_ui_filters %}

{# Direct usage #}
{{ organisation|getattribute:"name" }}

{# In list_table component #}
{% for column in columns %}
    <td>{{ item|getattribute:column.field }}</td>
{% endfor %}
```

**Validation**:
```python
# Test getattribute filter
from web_ui.templatetags.web_ui_filters import getattribute
from organisations.models import Organisation

org = Organisation.objects.create(name="Test Org")

# Test direct attribute
assert getattribute(org, 'name') == "Test Org"

# Test missing attribute
assert getattribute(org, 'nonexistent') == ''

# Test dict-like object
data = {'name': 'Test'}
assert getattribute(data, 'name') == 'Test'
```

**Parallel**: Yes (independent filter)

---

## Definition of Done

- [ ] T012: messages.html created with semantic HTML
- [ ] T013: form_field.html created with label, input, errors
- [ ] T014: form_layout.html created with fieldset wrapper
- [ ] T015: list_table.html created with dynamic columns
- [ ] T016: pagination.html created with First/Previous/Next/Last
- [ ] T017: getattribute filter created and registered
- [ ] All components have CSS class hooks
- [ ] All components documented with usage examples
- [ ] Components render without errors
- [ ] getattribute filter handles missing attributes gracefully

## Dependencies

- **Requires**: WP02 (base template for component inclusion)
- **Blocks**: WP06 (stub views use these components)
- **Can parallelize**: WP05 (authentication views independent)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Component parameters unclear | Medium | Document all parameters in {% comment %} blocks |
| getattribute filter security risk | Low | Only used for display, not mutation |
| Pagination query string conflicts | Low | Standard ?page= parameter, unlikely conflict |
| Form component inflexibility | Medium | Provide granular components (form_field) for custom layouts |

## Test Strategy

**Component Rendering Tests**:
- Test each component in isolation
- Test with valid data
- Test with missing/None data
- Test empty states

**Integration Tests**:
- Test form_layout with actual Django form
- Test list_table with real queryset
- Test pagination with Paginator object
- Test messages with Django messages framework

**Filter Tests**:
- Test getattribute with model objects
- Test getattribute with dicts
- Test getattribute with missing attributes

## Reviewer Guidance

**What to verify**:
1. All components use semantic HTML (table, nav, fieldset, etc.)
2. CSS class hooks on all major elements
3. Usage examples in {% comment %} blocks
4. getattribute filter handles errors gracefully
5. Pagination has proper aria labels
6. Form components support required/optional fields
7. Empty states handled (no items, no pages)

**Red flags**:
- Inline styles or scripts
- Missing CSS class hooks
- No parameter documentation
- getattribute filter doesn't handle missing attributes
- Pagination missing accessibility attributes
- Form components don't show errors
- No empty state handling

**Manual verification**:
```bash
# Test components
python manage.py shell

from django.template import Template, Context
from organisations.models import Organisation

# Test list_table
template = Template("""
{% load web_ui_filters %}
{% include "web_ui/components/list_table.html" with items=orgs columns=columns %}
""")

orgs = Organisation.objects.all()[:5]
columns = [{'field': 'name', 'label': 'Name'}]
html = template.render(Context({'orgs': orgs, 'columns': columns}))
print(html)
```

**Approval criteria**:
- All 6 components render correctly
- getattribute filter works with models and dicts
- Documentation clear and complete
- No errors in console or logs
- Components reusable across different contexts
