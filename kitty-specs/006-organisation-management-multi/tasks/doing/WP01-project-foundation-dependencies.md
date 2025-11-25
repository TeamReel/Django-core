---
work_package_id: WP01
title: Project Foundation & Dependencies
lane: "doing"
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
priority: Critical
user_story: Setup
agent: "claude"
shell_pid: "11524"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP01: Project Foundation & Dependencies

## Objective

Establish the Django app structure, install required dependencies (django-redis, django-prometheus), and configure core settings for organisation management. This work package creates the foundation that all subsequent work depends on.

## Context

This is a new Django app being added to the django-core project. The app will provide multi-tenant organisation management with:
- Redis-backed rate limiting
- Prometheus metrics for observability
- RESTful API via Django REST Framework
- Soft-delete support for organisations

The project follows the Django Core-App Constitution principles: product-agnostic, modular, tested, and well-documented.

## Detailed Implementation Guidance

### T001: Create Django App Structure

**Goal**: Create the base `organisations` Django app with standard files.

**Steps**:
1. Navigate to `src/` directory
2. Create `organisations/` directory
3. Create required files:
   - `__init__.py` (empty)
   - `apps.py` with OrganisationsConfig class
   - `models.py` (placeholder, will be populated in WP02)
   - `admin.py` (placeholder, will be populated in WP08)
   - `views.py` (can remain empty, using viewsets instead)
   - `urls.py` (placeholder)
4. In `apps.py`, define:
   ```python
   from django.apps import AppConfig

   class OrganisationsConfig(AppConfig):
       default_auto_field = 'django.db.models.BigAutoField'
       name = 'organisations'
       verbose_name = 'Organisations'
   ```

**Validation**: App directory exists with all required files, apps.py is properly configured.

---

### T002: Create Sub-Packages

**Goal**: Organize code with sub-packages for API, managers, and permissions.

**Steps**:
1. Create `organisations/api/` directory with `__init__.py`
2. Create `organisations/managers/` directory with `__init__.py`
3. Create `organisations/permissions/` directory with `__init__.py`
4. Create placeholder files (will be populated in later WPs):
   - `api/serializers.py`
   - `api/views.py`
   - `api/urls.py`
   - `managers/__init__.py` (can import custom managers here)
   - `permissions/__init__.py` (can import permission classes here)

**Validation**: Sub-package directories exist with `__init__.py`, can be imported without errors.

---

### T003: Add Dependencies to Requirements

**Goal**: Install django-redis and django-prometheus packages.

**Steps**:
1. Open `requirements/base.txt`
2. Add these lines (maintaining alphabetical or logical grouping):
   ```
   django-redis==5.4.0
   django-prometheus==2.3.1
   prometheus-client==0.19.0
   ```
3. Run `pip install -r requirements/base.txt` in your virtual environment
4. Verify installation: `pip list | grep -E '(django-redis|django-prometheus|prometheus-client)'`

**Note**: These versions are locked based on research. Update if newer compatible versions are available and tested.

**Validation**: Packages appear in `pip list`, can be imported in Python shell.

---

### T004: Add App to INSTALLED_APPS

**Goal**: Register the organisations app in Django settings.

**Steps**:
1. Open `src/config/settings/base.py`
2. Locate `INSTALLED_APPS` list
3. Add `'organisations.apps.OrganisationsConfig',` after existing core apps but before third-party apps
4. Also add `'django_prometheus',` near the top of INSTALLED_APPS (must be early for middleware instrumentation)
5. Suggested order:
   ```python
   INSTALLED_APPS = [
       'django_prometheus',  # Must be first
       'django.contrib.admin',
       'django.contrib.auth',
       'django.contrib.contenttypes',
       'django.contrib.sessions',
       'django.contrib.messages',
       'django.contrib.staticfiles',
       'rest_framework',
       'organisations.apps.OrganisationsConfig',
       # ... other apps
   ]
   ```

**Validation**: Run `python manage.py check`, no errors about missing apps.

---

### T005: Configure Redis Cache Backend

**Goal**: Set up django-redis as the cache backend for rate limiting.

**Steps**:
1. Open `src/config/settings/base.py`
2. Add or update the `CACHES` configuration:
   ```python
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': 'redis://127.0.0.1:6379/1',
           'OPTIONS': {
               'CLIENT_CLASS': 'django_redis.client.DefaultClient',
           },
           'KEY_PREFIX': 'django_core',
           'TIMEOUT': 300,  # 5 minutes default
       }
   }
   ```
3. For local development, you can use environment variables:
   ```python
   import os
   REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1')
   CACHES = {
       'default': {
           'BACKEND': 'django_redis.cache.RedisCache',
           'LOCATION': REDIS_URL,
           # ... rest of config
       }
   }
   ```
4. Add rate limit settings (used in WP07):
   ```python
   ORGANISATION_RATE_LIMITS = {
       'create_org_per_user_per_day': 5,
       'invite_member_per_org_per_hour': 20,
   }
   ```

**Validation**:
- Run `python manage.py shell`
- Execute: `from django.core.cache import cache; cache.set('test', 'value', 10); print(cache.get('test'))`
- Should print `value`
- Verify Redis is running: `redis-cli ping` should return `PONG`

**Troubleshooting**:
- If Redis not installed, use Docker: `docker run -d -p 6379:6379 redis:7-alpine`
- Or install locally (see quickstart.md)

---

### T006: Add Prometheus Middleware and Metrics Endpoint

**Goal**: Configure django-prometheus for metrics collection.

**Steps**:
1. Open `src/config/settings/base.py`
2. Update `MIDDLEWARE` to add Prometheus middleware:
   ```python
   MIDDLEWARE = [
       'django_prometheus.middleware.PrometheusBeforeMiddleware',  # Must be first
       'django.middleware.security.SecurityMiddleware',
       # ... other middleware
       'django_prometheus.middleware.PrometheusAfterMiddleware',  # Must be last
   ]
   ```
3. Open `src/config/urls.py`
4. Add metrics endpoint:
   ```python
   from django.urls import path, include

   urlpatterns = [
       # ... existing patterns
       path('', include('django_prometheus.urls')),  # Exposes /metrics
   ]
   ```
5. The /metrics endpoint will be accessible at `http://localhost:8000/metrics`

**Note**: For production, you may want to restrict /metrics to internal networks or add authentication.

**Validation**:
- Run `python manage.py runserver`
- Visit `http://localhost:8000/metrics`
- Should see Prometheus-format metrics (text/plain)

---

## Definition of Done

- [ ] Django `organisations` app created in `src/organisations/`
- [ ] Sub-packages created: `api/`, `managers/`, `permissions/`
- [ ] Dependencies installed: django-redis, django-prometheus, prometheus-client
- [ ] App added to `INSTALLED_APPS`
- [ ] Redis cache backend configured and tested
- [ ] Prometheus middleware added to MIDDLEWARE
- [ ] /metrics endpoint accessible
- [ ] `python manage.py check` passes with no errors
- [ ] Can import `organisations` and sub-packages in Python shell

## Testing Strategy

**Manual Tests**:
1. Run `python manage.py check` - should pass
2. Run `python manage.py runserver` - should start without errors
3. Visit `http://localhost:8000/admin` - should load (even if org models not registered yet)
4. Test Redis: `from django.core.cache import cache; cache.set('foo', 'bar'); assert cache.get('foo') == 'bar'`
5. Visit `http://localhost:8000/metrics` - should return prometheus metrics

**No automated tests required for this WP** - it's infrastructure setup.

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Redis not available locally | Medium | High | Provide Docker one-liner, link to quickstart.md |
| Version conflicts with dependencies | Low | Medium | Lock versions, test in clean virtualenv |
| Prometheus middleware breaks existing app | Low | High | Add middleware last, test existing endpoints still work |

## Dependencies

**Prerequisites**: None (this is the foundation)

**Blocks**: WP02, WP03, WP04, WP05, WP06, WP07, WP08 (all other work packages)

## Reviewer Guidance

**What to check**:
- [ ] All files created in correct locations
- [ ] Dependencies versions match specification (5.4.0, 2.3.1, 0.19.0)
- [ ] Redis connection works (manual test)
- [ ] Metrics endpoint returns valid Prometheus format
- [ ] No warnings or errors from `python manage.py check`
- [ ] Existing functionality not broken by new middleware

**Common issues**:
- Forgetting to activate virtual environment before pip install
- Redis not running (check with `redis-cli ping`)
- Middleware order wrong (Prometheus must be first/last)

## Related Documentation

- Research: [research.md](../research.md) - Q1 (app structure), Q2 (Redis), Q3 (Prometheus)
- Quickstart: [quickstart.md](../quickstart.md) - Redis setup, configuration examples
- Plan: [plan.md](../plan.md) - Technical context, dependencies

## Activity Log

- 2025-11-25T07:41:42Z – claude – shell_pid=11524 – lane=doing – Started implementation of foundation and dependencies
- 2025-11-25T07:50:00Z – claude – shell_pid=11524 – lane=doing – Completed all 6 subtasks (T001-T006): Created app structure, sub-packages, added dependencies, configured Redis/Prometheus. Commit: ca3c8c8
