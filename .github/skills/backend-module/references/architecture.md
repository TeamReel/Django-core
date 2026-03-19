# Backend Module Architecture Reference

## Reference Architecture

Follow `src/activities/` as the gold-standard example:

```
src/<app>/
  __init__.py          # Module docstring: "B{number}: {Title}"
  README.md            # Module documentation (REQUIRED)
  apps.py              # AppConfig with ready() for signals
  models.py            # Models: UUID PK, timestamps, org FK, soft delete
  admin.py             # Admin: list_display, filters, search, inlines
  managers.py          # Custom querysets (if needed)
  services.py          # Business logic (if needed)
  signals.py           # Signal handlers (if needed)
  tasks.py             # Celery tasks (if needed)
  api/
    __init__.py
    serializers.py     # List / Detail / Write serializers
    views.py           # ViewSet with org-scoped queryset
    urls.py            # SimpleRouter registration
    permissions.py     # Per-model permission classes
  tests/
    __init__.py
    conftest.py        # Fixtures: user, org, member, project + module-specific
    test_models.py     # Creation, __str__, constraints, soft delete
    test_api.py        # CRUD, filtering, pagination, org isolation
    test_serializers.py # Read/write, validation, nested fields
    test_permissions.py # Auth, roles, owner, non-owner boundaries
```

## File Creation Order (within each phase)

Always create files in dependency order:

```
1. __init__.py          (no deps)
2. apps.py              (no deps)
3. models.py            (depends on: Django, organisations)
4. managers.py          (depends on: models)
5. admin.py             (depends on: models)
6. services.py          (depends on: models)
7. tasks.py             (depends on: models, services)
8. signals.py           (depends on: models)
9. api/__init__.py      (no deps)
10. api/permissions.py  (depends on: models)
11. api/serializers.py  (depends on: models)
12. api/views.py        (depends on: serializers, permissions)
13. api/urls.py         (depends on: views)
14. tests/conftest.py   (depends on: models)
15. tests/test_*.py     (depends on: models, api)
```

## Wire-Up Phase

### Register app in INSTALLED_APPS

Edit `src/config/settings/base.py`:
```python
INSTALLED_APPS = [
    ...
    "{app_name}.apps.{AppName}Config",
]
```

### Register URLs

Edit `src/config/urls.py`:
```python
path("api/v1/{url_prefix}/", include("{app_name}.api.urls")),
```

### Create migration
```bash
cd src && python manage.py makemigrations {app_name} --name "initial_{app_name}"
python manage.py migrate
```

## README.md Requirements

Every module **must** include a `README.md` in the app root (`src/<app>/README.md`).

| Section | Content |
|---------|---------|
| Title + badge | `# B{number}: {Title}` + scope badge |
| Scope | 1-2 sentence description |
| Key Components | Models, services, tasks — with brief descriptions |
| API Endpoints | Table: method, path, description, auth |
| Permissions | Who can do what |
| Quick Start | 2-3 code examples (create, query, use decorator/signal) |
| Configuration | Settings, env vars, Celery queues |
| Database | Notable indexes, constraints |
| Testing | How to run tests, fixture overview |
| Extension Points | Where future modules can hook in |

## Post-Build Analysis Checklist

| Check | Pass? |
|-------|-------|
| Every model has UUID PK + timestamps + org FK | |
| Every ViewSet filters by org + is_active | |
| All serializers split (List/Detail/Write) | |
| All test classes use `@pytest.mark.django_db` | |
| Admin has list_display, list_filter, search_fields | |
| Permissions check ownership and staff status | |
| No N+1 queries (select_related/prefetch_related used) | |
| Migration is additive (no drops, no removes) | |
| README.md exists with all required sections | |

## Code Templates

All code templates in `templates/`:

| Template | Purpose |
|----------|---------|
| `__init__.py.tpl` | Module docstring |
| `apps.py.tpl` | AppConfig |
| `models.py.tpl` | Model with UUID, org FK, timestamps, soft delete |
| `admin.py.tpl` | Admin registration |
| `serializers.py.tpl` | List / Detail / Write pattern |
| `views.py.tpl` | Org-scoped ViewSet |
| `urls.py.tpl` | SimpleRouter |
| `permissions.py.tpl` | RBAC-aware permissions |
| `conftest.py.tpl` | Test fixtures |
| `test_models.py.tpl` | Model tests |
| `test_api.py.tpl` | API CRUD tests |
| `test_serializers.py.tpl` | Serializer tests |
| `test_permissions.py.tpl` | Permission boundary tests |
