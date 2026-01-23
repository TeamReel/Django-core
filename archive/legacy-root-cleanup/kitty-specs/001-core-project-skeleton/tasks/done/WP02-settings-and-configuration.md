---
lane: "done"
agent: "copilot-reviewer"
shell_pid: "23572"
review_status: "approved without changes"
reviewed_by: "copilot-reviewer"
assignee: ""
---

## Review Feedback

**Status**: ✅ **Approved**

**Key Notes**:
- `staging.py` and `production.py` now hard-code `DEBUG = False`, so the flag cannot be flipped by environment variables.
- Shared settings structure remains clean; local overrides continue to provide developer ergonomics without weakening other environments.

**Validation**:
- `python manage.py check` with `DJANGO_SETTINGS_MODULE=config.settings.staging` (no issues).
- `python manage.py check --deploy` with `DJANGO_SETTINGS_MODULE=config.settings.production` (only expected warning about test SECRET_KEY length).

# Work Package WP02: Settings & Configuration

**Status**: Planned
**Priority**: P0 (Must Have)
**Feature**: 001-core-project-skeleton
**User Stories**: US-001 (Bootstrap Clean Skeleton)

---

## Goal

Implement environment-based Django settings with secure defaults. This work package transforms Django's single settings.py into a multi-environment settings structure (base, local, staging, production) with DRF and logging configuration.

---

## Constitutional Alignment

- **Principle V (Security & Privacy)**: Secure defaults, CSRF enabled, no secrets in code, environment variables
- **Principle VI (Performance & Reliability)**: Structured logging, system check configuration
- **Principle VII (API Design)**: DRF configuration with pagination and authentication
- **Principle VIII (Developer Experience)**: Easy environment detection

---

## Subtasks

### T008: Create settings package structure
**Description**: Convert src/config/settings.py into a package with __init__.py

**Implementation Guidance**:
- Rename settings.py to settings.py.bak (backup)
- Create directory: `New-Item -ItemType Directory -Path "src\config\settings"`
- Create __init__.py: `New-Item -ItemType File -Path "src\config\settings\__init__.py"`
- Will populate __init__.py in T015

**Definition of Done**:
- [ ] src/config/settings/ directory exists
- [ ] src/config/settings/__init__.py exists (empty for now)
- [ ] Original settings.py backed up or removed

---

### T009: Implement base.py settings
**Description**: Create base.py with secure defaults and shared configuration (80% of settings)

**Implementation Guidance**:
- Create src/config/settings/base.py
- Import django-environ at top: `import environ`
- Initialize environ: `env = environ.Env()`
- Configure secure defaults:
  - SECRET_KEY from environment: `env('SECRET_KEY')`
  - DEBUG default False: `env.bool('DEBUG', default=False)`
  - ALLOWED_HOSTS from environment: `env.list('ALLOWED_HOSTS', default=[])`
  - CSRF_COOKIE_SECURE default True
  - SESSION_COOKIE_SECURE default True
  - SECURE_SSL_REDIRECT default True
- Configure INSTALLED_APPS:
  - Django built-ins (admin, auth, contenttypes, sessions, messages, staticfiles)
  - rest_framework
  - Leave placeholder for future apps
- Configure MIDDLEWARE:
  - SecurityMiddleware, SessionMiddleware, CommonMiddleware, CsrfViewMiddleware, AuthenticationMiddleware, MessageMiddleware, ClickjackingMiddleware
- Set ROOT_URLCONF = 'config.urls'
- Set WSGI_APPLICATION = 'config.wsgi.application'
- Configure databases (will be overridden by environments)
- Configure static files (STATIC_URL, STATIC_ROOT)
- Set LANGUAGE_CODE, TIME_ZONE, USE_I18N, USE_TZ

**Definition of Done**:
- [ ] src/config/settings/base.py exists
- [ ] django-environ imported and initialized
- [ ] SECRET_KEY read from environment
- [ ] All secure defaults configured
- [ ] INSTALLED_APPS includes DRF
- [ ] MIDDLEWARE includes SecurityMiddleware
- [ ] ROOT_URLCONF and WSGI_APPLICATION set
- [ ] File runs without errors when imported

**Critical Settings**:
```python
import environ

env = environ.Env()

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

CSRF_COOKIE_SECURE = env.bool('CSRF_COOKIE_SECURE', default=True)
SESSION_COOKIE_SECURE = env.bool('SESSION_COOKIE_SECURE', default=True)
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
```

---

### T010: Configure Django REST Framework [PARALLEL]
**Description**: Add REST_FRAMEWORK configuration dict to base.py

**Implementation Guidance**:
- Add after INSTALLED_APPS
- Configure pagination: PageNumberPagination with 20 items per page
- Configure authentication: SessionAuthentication
- Configure renderers: JSONRenderer (BrowsableAPIRenderer in local only)
- Configure permissions: IsAuthenticatedOrReadOnly default

**Definition of Done**:
- [ ] REST_FRAMEWORK dict added to base.py
- [ ] Pagination class and page size configured
- [ ] Authentication classes configured
- [ ] Default renderer classes configured (JSON only)

**Example**:
```python
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
}
```

---

### T011: Configure structured logging [PARALLEL]
**Description**: Add LOGGING configuration dict to base.py

**Implementation Guidance**:
- Configure JSON formatter using python-json-logger
- Create console handler
- Set root logger to INFO level
- Include Django and DRF loggers

**Definition of Done**:
- [ ] LOGGING dict added to base.py
- [ ] JSON formatter configured
- [ ] Console handler configured
- [ ] Root logger set to INFO

**Example**:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

---

### T012: Implement local.py settings [PARALLEL]
**Description**: Create local.py for development environment (DEBUG=True, SQLite, human-readable logging)

**Implementation Guidance**:
- Create src/config/settings/local.py
- Import from base: `from .base import *`
- Override DEBUG = True
- Override ALLOWED_HOSTS = ['localhost', '127.0.0.1']
- Override DATABASES to use SQLite: `env.db('DATABASE_URL', default='sqlite:///db.sqlite3')`
- Override LOGGING formatter to use simple format (not JSON)
- Add BrowsableAPIRenderer to REST_FRAMEWORK renderers
- Disable CSRF_COOKIE_SECURE, SESSION_COOKIE_SECURE, SECURE_SSL_REDIRECT

**Definition of Done**:
- [ ] src/config/settings/local.py exists
- [ ] Imports from base
- [ ] DEBUG = True
- [ ] SQLite database configured
- [ ] Human-readable logging formatter
- [ ] Security settings relaxed for development
- [ ] BrowsableAPIRenderer enabled

**Example**:
```python
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': env.db('DATABASE_URL', default='sqlite:///db.sqlite3')
}

CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False

LOGGING['formatters']['simple'] = {
    'format': '[%(levelname)s] %(name)s: %(message)s'
}
LOGGING['handlers']['console']['formatter'] = 'simple'

REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]
```

---

### T013: Implement staging.py settings [PARALLEL]
**Description**: Create staging.py for staging environment (secure defaults, PostgreSQL support)

**Implementation Guidance**:
- Create src/config/settings/staging.py
- Import from base: `from .base import *`
- Keep DEBUG = False (inherited from base)
- Override ALLOWED_HOSTS from environment
- Override DATABASES to use PostgreSQL: `env.db('DATABASE_URL')`
- Keep JSON logging (inherited from base)
- Keep secure cookie settings (inherited from base)

**Definition of Done**:
- [ ] src/config/settings/staging.py exists
- [ ] Imports from base
- [ ] DEBUG = False (inherited)
- [ ] PostgreSQL database from DATABASE_URL
- [ ] JSON logging (inherited)
- [ ] Secure settings (inherited)

**Example**:
```python
from .base import *

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

DATABASES = {
    'default': env.db('DATABASE_URL')
}
```

---

### T014: Implement production.py settings [PARALLEL]
**Description**: Create production.py for production environment (strictest security)

**Implementation Guidance**:
- Create src/config/settings/production.py
- Import from base: `from .base import *`
- Keep all secure defaults from base
- Override ALLOWED_HOSTS from environment (required, no default)
- Override DATABASES to use PostgreSQL: `env.db('DATABASE_URL')`
- Add additional security headers: SECURE_HSTS_SECONDS, SECURE_HSTS_INCLUDE_SUBDOMAINS, SECURE_CONTENT_TYPE_NOSNIFF
- Consider adding SECURE_BROWSER_XSS_FILTER

**Definition of Done**:
- [ ] src/config/settings/production.py exists
- [ ] Imports from base
- [ ] ALLOWED_HOSTS required from environment
- [ ] PostgreSQL database required
- [ ] Additional security headers configured
- [ ] No DEBUG override (stays False)

**Example**:
```python
from .base import *

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

DATABASES = {
    'default': env.db('DATABASE_URL')
}

SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
```

---

### T015: Update settings __init__.py
**Description**: Implement auto-detection of environment or use DJANGO_SETTINGS_MODULE

**Implementation Guidance**:
- Edit src/config/settings/__init__.py
- Check for DJANGO_SETTINGS_MODULE environment variable
- If set, use it (explicit configuration)
- If not set, auto-detect based on DEBUG environment variable or default to local
- Import the selected settings module

**Definition of Done**:
- [ ] __init__.py implements environment detection
- [ ] DJANGO_SETTINGS_MODULE respected if set
- [ ] Falls back to local.py for development
- [ ] Clear error message if environment detection fails

**Example**:
```python
import os

settings_module = os.environ.get('DJANGO_SETTINGS_MODULE')

if settings_module:
    # Explicit setting via DJANGO_SETTINGS_MODULE
    module_name = settings_module.split('.')[-1]
    if module_name == 'local':
        from .local import *
    elif module_name == 'staging':
        from .staging import *
    elif module_name == 'production':
        from .production import *
    else:
        raise ValueError(f"Unknown settings module: {settings_module}")
else:
    # Auto-detect: default to local
    from .local import *
```

---

## Independent Test

**Test Name**: Verify settings load correctly in each environment

**Test Steps**:
1. Test local settings:
   - Set: `$env:DJANGO_SETTINGS_MODULE = "config.settings.local"`
   - Set: `$env:SECRET_KEY = "test-secret-key-for-local-development-only"`
   - Run: `python manage.py check`
   - Expected: No errors, DEBUG=True reported

2. Test staging settings:
   - Set: `$env:DJANGO_SETTINGS_MODULE = "config.settings.staging"`
   - Set: `$env:SECRET_KEY = "test-secret-key"`
   - Set: `$env:ALLOWED_HOSTS = "staging.example.com"`
   - Set: `$env:DATABASE_URL = "sqlite:///staging.db"`
   - Run: `python manage.py check`
   - Expected: No errors, DEBUG=False reported

3. Test production settings:
   - Set: `$env:DJANGO_SETTINGS_MODULE = "config.settings.production"`
   - Set: `$env:SECRET_KEY = "test-secret-key"`
   - Set: `$env:ALLOWED_HOSTS = "example.com"`
   - Set: `$env:DATABASE_URL = "sqlite:///prod.db"`
   - Run: `python manage.py check --deploy`
   - Expected: No critical warnings

4. Test DRF configuration:
   - Run: `python manage.py shell`
   - Import: `from django.conf import settings`
   - Check: `settings.REST_FRAMEWORK['PAGE_SIZE']` == 20

**Expected Results**:
- All environments load without errors
- Environment detection works correctly
- DRF configuration present
- Logging configuration present

---

## Implementation Notes

### Settings Inheritance Pattern
- base.py: 80% of settings (shared across environments)
- Environment files: 20% of settings (environment-specific overrides)
- Use `from .base import *` pattern
- Override specific settings after import

### Environment Variables Required
- SECRET_KEY (all environments)
- DEBUG (optional, defaults to False)
- ALLOWED_HOSTS (staging/production)
- DATABASE_URL (optional in local, required in staging/production)

### Logging Strategy
- base.py: JSON logging (production-ready)
- local.py: Override with simple human-readable format
- staging/production: Inherit JSON logging

### DRF Configuration Highlights
- PageNumberPagination: Standard pagination pattern
- SessionAuthentication: Simple auth for skeleton (extend later)
- JSONRenderer only in base (BrowsableAPIRenderer added in local)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Missing SECRET_KEY causes startup failure | High | Document in .env.example, fail fast with clear error |
| Settings import errors | High | Test each environment file individually |
| Database URL misconfiguration | Medium | Provide examples in .env.example |
| ALLOWED_HOSTS empty in production | High | Fail deployment check if not set |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] base.py has secure defaults (CSRF enabled, secure cookies)
- [ ] All environment files import from base
- [ ] local.py relaxes security appropriately
- [ ] production.py has strictest security
- [ ] DRF configuration complete (pagination, auth, renderers)
- [ ] Logging configuration complete (JSON formatter)
- [ ] No hardcoded secrets
- [ ] Environment variable usage consistent

### Testing Checklist
- [ ] `python manage.py check` passes for local.py
- [ ] `python manage.py check` passes for staging.py
- [ ] `python manage.py check --deploy` passes for production.py
- [ ] DRF settings accessible via `settings.REST_FRAMEWORK`
- [ ] Logging configuration accessible via `settings.LOGGING`

---

## Success Criteria Mapping

- **SC-002**: DRF preconfigured → REST_FRAMEWORK settings complete
- **SC-003**: No secrets in code → All secrets via environment variables
- **SC-005**: Environment-based settings → local, staging, production files
- **SC-009**: Secure defaults → CSRF, secure cookies, HSTS in production

---

## Dependencies

**Prerequisites**: WP01 (project structure must exist)

**Enables**:
- WP03 (Health Check) requires settings to configure URLs
- WP04 (Testing) requires settings for pytest-django

---

> This work package implements the settings foundation with security-first defaults and environment flexibility.

## Activity Log

- 2025-11-20T22:14:48Z – copilot – shell_pid=31544 – lane=doing – Start implementation
- 2025-11-20T23:45:00Z – copilot – shell_pid=31544 – lane=doing – Completed implementation
- 2025-11-20T22:27:54Z – copilot – shell_pid=31544 – lane=for_review – Ready for review
- 2025-11-21T00:40:00Z – copilot-reviewer – shell_pid=23572 – lane=planned – Returned with feedback: enforce DEBUG=False in staging/production
- 2025-11-21T18:20:20Z – copilot-reviewer – shell_pid=23572 – lane=planned – Code review complete: enforce DEBUG False
- 2025-11-21T18:33:00Z – copilot – shell_pid=23572 – lane=doing – Addressed DEBUG lock feedback
- 2025-11-21T18:23:41Z – copilot – shell_pid=23572 – lane=doing – Address DEBUG feedback
- 2025-11-21T18:27:53Z – copilot – shell_pid=23572 – lane=for_review – Ready for re-review
- 2025-11-21T18:33:47Z – copilot-reviewer – shell_pid=23572 – lane=done – Code review approved: DEBUG enforcement confirmed
