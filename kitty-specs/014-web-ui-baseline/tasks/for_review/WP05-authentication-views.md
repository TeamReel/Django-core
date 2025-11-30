# Work Package: WP05 – Authentication Views

## Metadata
- **Work Package ID**: WP05
- **Title**: Authentication Views
- **Lane**: for_review
- **Priority**: P1 (Critical)
- **Estimated Effort**: 4 hours
- **Subtasks**: T018, T019, T020, T021, T022

## History
- 2025-11-30: Created from plan.md
- 2025-11-30: Started by claude (shell_pid=11588) - lane=doing
- 2025-11-30: Moved back to planned - WP04 dependency identified
- 2025-11-30: Resumed by claude (shell_pid=11588) - lane=doing - WP04 now complete
- 2025-11-30: Completed by claude (shell_pid=11588) - lane=for_review - commit 79680db

---

## Objective

Override B05 authentication templates (login, register, password reset) with web_ui styling. Configure Django to use web_ui templates for auth views.

## Context & Constraints

- **Integration**: B05 (accounts app) handles authentication logic
- **Override Strategy**: Place templates in `web_ui/templates/accounts/` to override B05's templates
- **Architecture**: Use WP02 base template, WP04 components (form_layout, messages)
- **URL Configuration**: Use B05's existing URL patterns (no new views)
- **Functional Requirements**: Must maintain B05's auth logic (no changes to views/forms)
- **Can parallelize**: Yes, with WP04 (independent work, though depends on WP02/WP04 templates)

## Subtasks & Detailed Guidance

### T018: Create login.html template override

**Goal**: Override B05 login template with web_ui styling.

**File**: `src/web_ui/templates/accounts/login.html`

**Implementation**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Login{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Login</h1>
        <p class="ui-text">Sign in to your account to continue.</p>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form submit_text="Login" %}

    <footer class="ui-content__footer">
        <p class="ui-text ui-text--small">
            Don't have an account? <a href="{% url 'accounts:register' %}" class="ui-link">Register here</a>
        </p>
        <p class="ui-text ui-text--small">
            <a href="{% url 'accounts:password_reset' %}" class="ui-link">Forgot your password?</a>
        </p>
    </footer>
</article>
{% endblock %}
```

**CSS Class Hooks**:
- `ui-content`: Main content container
- `ui-content--narrow`: Narrow layout modifier (for forms)
- `ui-content__header`: Content header section
- `ui-content__footer`: Content footer section
- `ui-heading`: Heading element
- `ui-heading--large`: Large heading modifier
- `ui-text`: Text element
- `ui-text--small`: Small text modifier
- `ui-link`: Link element

**Django Template Path Resolution**:
1. Django looks for `accounts/login.html` in all INSTALLED_APPS
2. Since `web_ui` comes after `accounts` in INSTALLED_APPS, we need to ensure override works
3. Solution: Place in `web_ui/templates/accounts/login.html` (accounts namespace overrides B05)

**Alternative**: If override doesn't work, adjust INSTALLED_APPS order:
```python
# src/config/settings/base.py
INSTALLED_APPS = [
    # ...
    'web_ui',  # Place BEFORE accounts to ensure template override
    'accounts',
    # ...
]
```

**Validation**:
```python
# Test login template override
from django.test import Client

client = Client()
response = client.get('/accounts/login/')
html = response.content.decode()

assert 'ui-content--narrow' in html  # web_ui classes present
assert '<h1 class="ui-heading ui-heading--large">Login</h1>' in html
assert 'Register here' in html
```

**Parallel**: Can work in parallel with T019-T022 (independent templates)

---

### T019: Create register.html template override

**Goal**: Override B05 registration template with web_ui styling.

**File**: `src/web_ui/templates/accounts/register.html`

**Implementation**:
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Register{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Create Account</h1>
        <p class="ui-text">Register for a new account to get started.</p>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form submit_text="Register" %}

    <footer class="ui-content__footer">
        <p class="ui-text ui-text--small">
            Already have an account? <a href="{% url 'accounts:login' %}" class="ui-link">Login here</a>
        </p>
    </footer>
</article>
{% endblock %}
```

**Password Requirements** (if displayed by B05 form):
B05 form should include password validation help text. The form_field component (WP04) will render it automatically.

**Validation**:
```python
# Test register template override
response = client.get('/accounts/register/')
html = response.content.decode()

assert 'Create Account' in html
assert 'Register' in html  # Submit button
assert 'Login here' in html  # Link to login
```

**Parallel**: Yes (independent template)

---

### T020: Create password reset templates

**Goal**: Override B05 password reset flow templates (request, sent, confirm, complete).

**Files**:
1. `src/web_ui/templates/accounts/password_reset_form.html` (request reset)
2. `src/web_ui/templates/accounts/password_reset_done.html` (email sent)
3. `src/web_ui/templates/accounts/password_reset_confirm.html` (enter new password)
4. `src/web_ui/templates/accounts/password_reset_complete.html` (success)

**Implementation 1**: `password_reset_form.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Reset Password{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Reset Password</h1>
        <p class="ui-text">Enter your email address and we'll send you a link to reset your password.</p>
    </header>

    {% include "web_ui/components/form_layout.html" with form=form submit_text="Send Reset Link" %}

    <footer class="ui-content__footer">
        <p class="ui-text ui-text--small">
            <a href="{% url 'accounts:login' %}" class="ui-link">Back to Login</a>
        </p>
    </footer>
</article>
{% endblock %}
```

**Implementation 2**: `password_reset_done.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Password Reset Sent{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Check Your Email</h1>
        <p class="ui-text">We've sent you instructions to reset your password. Please check your email.</p>
    </header>

    <footer class="ui-content__footer">
        <p class="ui-text ui-text--small">
            <a href="{% url 'accounts:login' %}" class="ui-link">Back to Login</a>
        </p>
    </footer>
</article>
{% endblock %}
```

**Implementation 3**: `password_reset_confirm.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Set New Password{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Set New Password</h1>
        <p class="ui-text">Enter your new password below.</p>
    </header>

    {% if validlink %}
        {% include "web_ui/components/form_layout.html" with form=form submit_text="Change Password" %}
    {% else %}
        <p class="ui-error">This password reset link is invalid or has expired. Please request a new one.</p>
        <p class="ui-text ui-text--small">
            <a href="{% url 'accounts:password_reset' %}" class="ui-link">Request new reset link</a>
        </p>
    {% endif %}

    <footer class="ui-content__footer">
        <p class="ui-text ui-text--small">
            <a href="{% url 'accounts:login' %}" class="ui-link">Back to Login</a>
        </p>
    </footer>
</article>
{% endblock %}
```

**Implementation 4**: `password_reset_complete.html`
```html
{% extends "web_ui/base/base.html" %}

{% block title %}Password Reset Complete{% endblock %}

{% block content %}
<article class="ui-content ui-content--narrow">
    <header class="ui-content__header">
        <h1 class="ui-heading ui-heading--large">Password Reset Complete</h1>
        <p class="ui-text">Your password has been successfully changed. You can now login with your new password.</p>
    </header>

    <footer class="ui-content__footer">
        <p class="ui-text">
            <a href="{% url 'accounts:login' %}" class="ui-link ui-link--primary">Go to Login</a>
        </p>
    </footer>
</article>
{% endblock %}
```

**CSS Class Additions**:
- `ui-error`: Error message styling
- `ui-link--primary`: Primary link modifier (call-to-action)

**Password Reset Flow**:
1. User visits `/accounts/password-reset/` → `password_reset_form.html`
2. User submits email → Redirect to `/accounts/password-reset/done/` → `password_reset_done.html`
3. User clicks email link → `/accounts/password-reset/confirm/<uidb64>/<token>/` → `password_reset_confirm.html`
4. User submits new password → Redirect to `/accounts/password-reset/complete/` → `password_reset_complete.html`

**Validation**:
```python
# Test password reset templates
response = client.get('/accounts/password-reset/')
assert 'Reset Password' in response.content.decode()

response = client.post('/accounts/password-reset/', {'email': 'test@example.com'}, follow=True)
assert 'Check Your Email' in response.content.decode()

# Test invalid link
response = client.get('/accounts/password-reset/confirm/invalid-uid/invalid-token/')
assert 'invalid or has expired' in response.content.decode()
```

**Parallel**: Yes (4 independent templates)

---

### T021: Configure Django to use web_ui auth templates

**Goal**: Ensure Django auth views use web_ui template overrides.

**File**: `src/config/settings/base.py`

**Change**: Verify INSTALLED_APPS order:
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Local apps
    'web_ui',  # MUST come before 'accounts' to override templates
    'accounts',
    'organisations',
    'projects',
    'permissions',
    # ... other apps
]
```

**Template Lookup Order**:
1. Django checks `web_ui/templates/accounts/` first (because web_ui listed before accounts)
2. Falls back to `accounts/templates/accounts/` if not found
3. Result: web_ui templates used for all auth views

**Alternative Approach** (if ordering doesn't work):
```python
# In web_ui/apps.py
from django.apps import AppConfig

class WebUiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'web_ui'

    def ready(self):
        # Force template override by adjusting DIRS
        from django.conf import settings
        web_ui_templates = str(Path(__file__).parent / 'templates')
        if web_ui_templates not in settings.TEMPLATES[0]['DIRS']:
            settings.TEMPLATES[0]['DIRS'].insert(0, web_ui_templates)
```

**Validation**:
```python
# Test template resolution
from django.template.loader import select_template

template = select_template(['accounts/login.html'])
print(template.origin.name)  # Should show web_ui/templates/accounts/login.html
```

**Parallel**: No (configuration change affects all templates)

---

### T022: Test authentication flow end-to-end

**Goal**: Verify all auth templates render correctly and maintain B05 functionality.

**Test Script**: `tests/web_ui/test_auth_templates.py`
```python
"""Test authentication template overrides."""
import pytest
from django.test import Client
from django.urls import reverse
from accounts.models import User


@pytest.mark.django_db
class TestAuthTemplates:
    """Test web_ui authentication template overrides."""

    def test_login_template_override(self, client: Client):
        """Test login page uses web_ui template."""
        response = client.get(reverse('accounts:login'))

        assert response.status_code == 200
        html = response.content.decode()
        assert 'ui-content--narrow' in html  # web_ui class
        assert '<h1 class="ui-heading ui-heading--large">Login</h1>' in html
        assert 'Register here' in html

    def test_register_template_override(self, client: Client):
        """Test registration page uses web_ui template."""
        response = client.get(reverse('accounts:register'))

        assert response.status_code == 200
        html = response.content.decode()
        assert 'Create Account' in html
        assert 'ui-content--narrow' in html

    def test_password_reset_template_override(self, client: Client):
        """Test password reset page uses web_ui template."""
        response = client.get(reverse('accounts:password_reset'))

        assert response.status_code == 200
        html = response.content.decode()
        assert 'Reset Password' in html
        assert 'Send Reset Link' in html

    def test_password_reset_done_template(self, client: Client):
        """Test password reset done page."""
        response = client.get(reverse('accounts:password_reset_done'))

        assert response.status_code == 200
        html = response.content.decode()
        assert 'Check Your Email' in html

    def test_password_reset_complete_template(self, client: Client):
        """Test password reset complete page."""
        response = client.get(reverse('accounts:password_reset_complete'))

        assert response.status_code == 200
        html = response.content.decode()
        assert 'Password Reset Complete' in html

    def test_login_functionality_preserved(self, client: Client):
        """Test login still works (B05 logic preserved)."""
        user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )

        response = client.post(reverse('accounts:login'), {
            'email': 'test@example.com',
            'password': 'testpass123',
        }, follow=True)

        assert response.status_code == 200
        assert response.wsgi_request.user.is_authenticated
        assert response.wsgi_request.user.email == 'test@example.com'
```

**Manual Test Checklist**:
1. Visit `/accounts/login/` → Should show web_ui styled login form
2. Login with valid credentials → Should redirect to home
3. Visit `/accounts/register/` → Should show web_ui styled registration form
4. Register new account → Should create user and login
5. Visit `/accounts/password-reset/` → Should show web_ui styled form
6. Submit email → Should show "Check Your Email" page
7. (With email backend) Click reset link → Should show "Set New Password" form
8. Submit new password → Should show "Password Reset Complete" page

**Validation Commands**:
```bash
# Run auth template tests
cd src
pytest tests/web_ui/test_auth_templates.py -v

# Manual browser testing
python manage.py runserver
# Visit http://localhost:8000/accounts/login/
```

**Parallel**: No (integration test, requires all templates complete)

---

## Definition of Done

- [ ] T018: login.html template created and overrides B05
- [ ] T019: register.html template created and overrides B05
- [ ] T020: All 4 password reset templates created
- [ ] T021: INSTALLED_APPS configured for template override
- [ ] T022: End-to-end tests pass
- [ ] All auth pages use web_ui base template and components
- [ ] B05 authentication logic preserved (forms, views work unchanged)
- [ ] Manual testing confirms templates render correctly
- [ ] Template resolution verified (web_ui templates used, not B05)

## Dependencies

- **Requires**: WP02 (base template), WP04 (form components)
- **Blocks**: None (auth templates independent)
- **Can parallelize**: WP04 (if WP02 complete)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template override doesn't work | High | Verify INSTALLED_APPS order, test template resolution |
| B05 forms incompatible with form_layout | Medium | Test with actual B05 forms, adjust if needed |
| Password reset emails not sent | Low | Configure email backend, test locally |
| CSRF issues in form submission | Medium | Ensure form_layout includes {% csrf_token %} |

## Test Strategy

**Template Override Tests**:
- Verify web_ui templates used (not B05)
- Test template resolution with select_template

**Rendering Tests**:
- Test all 6 templates render without errors
- Test with valid and invalid data
- Test with authenticated and anonymous users

**Functionality Tests**:
- Test login flow (form submission, redirect)
- Test registration flow
- Test password reset flow (all 4 steps)

**Integration Tests**:
- Full auth flow from registration → login → logout
- Password reset flow with token validation

## Reviewer Guidance

**What to verify**:
1. All 6 auth templates present in `web_ui/templates/accounts/`
2. Templates extend `web_ui/base/base.html`
3. Templates use `form_layout.html` component
4. INSTALLED_APPS has web_ui before accounts
5. Template resolution test passes (web_ui templates used)
6. Manual testing: All auth flows work (login, register, password reset)
7. B05 functionality preserved (no changes to views/forms)

**Red flags**:
- Templates don't extend web_ui base
- Templates have inline forms (should use form_layout component)
- B05 templates still being used (override failed)
- Auth functionality broken (forms don't submit, validation errors)
- Missing CSRF tokens
- Broken links between auth pages

**Template resolution verification**:
```python
# Verify override
from django.template.loader import select_template

for template_name in [
    'accounts/login.html',
    'accounts/register.html',
    'accounts/password_reset_form.html',
    'accounts/password_reset_done.html',
    'accounts/password_reset_confirm.html',
    'accounts/password_reset_complete.html',
]:
    template = select_template([template_name])
    print(f"{template_name}: {template.origin.name}")
    assert 'web_ui' in template.origin.name  # Must be web_ui template
```

**Approval criteria**:
- All auth templates use web_ui styling
- Authentication functionality works (login, register, password reset)
- Template override verified (web_ui templates used)
- Tests pass (template rendering, functionality)
- Manual testing confirms UX is consistent
