---
name: backend-module
description: "Build a complete backend module from spec to production — with discovery gates, constitution checks, phased implementation, and verification. Inspired by spec-kitty, optimized for Django modules."
argument-hint: "Module number (e.g. 'B62') or full name (e.g. 'activity-feed')"
---

# Backend Module Builder

Build a complete Django app from a module spec in `documents/02-roadmap/modules/backlog/`.

**Like spec-kitty, but focused:** No worktrees, no branch juggling. Same quality gates — discovery, clarify, constitution check, phased work, analysis — compressed into a single-chat flow.

### Module Lifecycle

```
backlog/  →  active/  →  done/
(folder)     (folder)     (folder)
```

- **backlog/**: Module spec as `{number}-{code}-{name}/index.md` + empty `phases/todo/` and `phases/done/`
- **active/**: When work starts (Gate 0), move the folder here. Phase specs go into `phases/todo/` and move to `phases/done/` as completed.
- **done/**: After Gate 4, move the folder here.

---

## How It Works (User Perspective)

```
User: "build module B62"

→ Agent reads spec, asks 2-3 clarifying questions
→ Agent checks conventions (constitution)
→ Agent splits into phases, shows plan
→ User confirms: "go" / "doe maar"
→ Agent builds phase by phase, running tests after each
→ Final verification + spec updated
```

---

## Gate 0: Spec Discovery

### 0.1 Load the spec
```
# 1. Find the module spec in backlog or active
Find: documents/02-roadmap/modules/backlog/*-B{number}-*/index.md
  OR: documents/02-roadmap/modules/active/*-B{number}-*/index.md
Read: .github/instructions/backend.instructions.md

# 2. Move module folder from backlog/ to active/
git mv documents/02-roadmap/modules/backlog/{folder} documents/02-roadmap/modules/active/{folder}
```

### 0.2 Ambiguity Scan

Scan the spec for gaps using this checklist:

| Category | Check | Status |
|----------|-------|--------|
| **Models** | Are all fields, types, and constraints defined? | Clear / Partial / Missing |
| **Relationships** | Are all FKs, M2M, GenericFK explicit? | Clear / Partial / Missing |
| **Endpoints** | Are all CRUD + custom actions listed? | Clear / Partial / Missing |
| **Permissions** | Who can read/write/delete what? | Clear / Partial / Missing |
| **Integrations** | Which existing apps does this connect to? | Clear / Partial / Missing |
| **Edge Cases** | What happens with empty data, duplicates, cascading deletes? | Clear / Partial / Missing |
| **Async** | Any Celery tasks needed? What triggers them? | Clear / Partial / Missing |

### 0.3 Clarify (if needed)

**Scope-proportional questioning** (same as spec-kitty):
- **Small module** (1-2 models, basic CRUD): 1-2 questions max
- **Medium module** (3-4 models, custom actions): 2-3 questions
- **Large module** (5+ models, Celery, integrations): 3-5 questions

**Rules:**
- Ask ALL questions in ONE message (batched, not one-at-a-time)
- Provide a sensible default for each question → user just confirms
- If spec is clear enough → skip straight to Gate 1
- Never ask about things you can determine from codebase context

**Output:** Updated understanding of the module. NO spec file changes at this point.

---

## Gate 1: Convention Check (Constitution)

Before writing code, validate the spec against TeamReel conventions:

### 1.1 Backend Conventions
- [ ] Every model has UUID PK, `created_at`, `updated_at`, `created_by`
- [ ] Every top-level model has `organisation` FK for scoping
- [ ] Soft delete pattern: `is_active` + `deleted_at` (not hard delete)
- [ ] No `any` types, no untyped fields
- [ ] JSON metadata field on models that benefit from flexibility

### 1.2 API Conventions
- [ ] Three-serializer pattern: List (lightweight), Detail (full), Write (create/update)
- [ ] Org-scoped queryset in every ViewSet:  `filter(organisation=request.user.organisation)`
- [ ] `select_related`/`prefetch_related` on all FK/M2M lookups
- [ ] `BaseAPIPagination` (page_size=20, max=100)
- [ ] Permission class per model (not per endpoint)

### 1.3 Safety Conventions
- [ ] New fields: nullable or with default (safe migrations)
- [ ] NEVER DROP TABLE, NEVER RemoveField without deprecation
- [ ] No raw SQL in views (use ORM or managers)
- [ ] Foreign keys: `on_delete=CASCADE` for owned data, `SET_NULL` for references

### 1.4 Test Conventions
- [ ] pytest + `@pytest.mark.django_db`
- [ ] Fixtures in `conftest.py` (user, org, member, project, authenticated_client)
- [ ] Test boundaries: success path, validation errors, permission denied, org isolation
- [ ] No test depends on another test's state

**If any convention is violated by the spec** → flag it and propose a fix before proceeding.

---

## Gate 2: Phase Plan

Split the implementation into phases. Show the plan to the user and wait for confirmation.

### Automatic Phase Detection

Based on module complexity, auto-split:

**Small module (1-2 models)**:
```
Phase 1: Models + Migration + Admin        [~5 min]
Phase 2: API (serializers + views + URLs)   [~5 min]
Phase 3: Tests + Wire-up + Verify           [~5 min]
```

**Medium module (3-4 models)**:
```
Phase 1: Core models + Migration + Admin            [~8 min]
Phase 2: Primary API (main model CRUD)               [~8 min]
Phase 3: Secondary API (related models, custom actions) [~8 min]
Phase 4: Tests + Wire-up + Verify                    [~5 min]
```

**Large module (5+ models, Celery)**:
```
Phase 1: Models + Managers + Migration + Admin       [~10 min]
Phase 2: Services + Celery tasks                     [~10 min]
Phase 3: API layer (serializers + views + URLs)      [~10 min]
Phase 4: Permissions + Signals + Integration         [~8 min]
Phase 5: Tests + Wire-up + Verify                    [~8 min]
```

### Plan Output Format

Show this to the user:

```
📋 Module B{number} — {Title}

Models: {list}
Endpoints: {count} endpoints across {count} viewsets
Tests: ~{count} test cases
Phases: {count}

Phase 1: {description}  →  {files created}
Phase 2: {description}  →  {files created}
Phase 3: {description}  →  {files created}

Doorgaan? (ja / aanpassen)
```

**Wait for user confirmation before proceeding.**

---

## Phase Execution

### For each phase:

1. **Create files** using templates from `.github/skills/backend-module/templates/`
2. **Adapt templates** — fill in model names, fields, relationships from spec
3. **Validate** — no import errors, no syntax errors
4. **Test** (on final phase) — `pytest src/<app>/tests/ -v`
5. **Report** — list files created, any issues found

### File Creation Order (within each phase)

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

---

## Reference Architecture

Follow `src/activities/` as the gold-standard example:
```
src/<app>/
  __init__.py          # Module docstring: "B{number}: {Title}"
  README.md            # Module documentation (REQUIRED — see below)
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

---

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

---

## Gate 3: Verification

All must pass before marking the module as done:

```bash
# 1. Django system check
python manage.py check

# 2. No pending migrations
python manage.py makemigrations --check --dry-run

# 3. All tests pass
pytest src/{app_name}/tests/ -v --tb=short

# 4. Import check
python -c "import {app_name}; print(f'{app_name} OK')"
```

### README.md (Required)

Every module **must** include a `README.md` in the app root (`src/<app>/README.md`).

Follow the pattern from `src/activities/README.md` or `src/audit/README.md`:

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

### Post-Build Analysis

After all tests pass, do a quick self-review:

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

---

## Gate 4: Update Spec

1. Update the spec `index.md`: Status `📋 ROADMAP` → `✅ IMPLEMENTED`
2. Check all delivery checklist items
3. Add implementation notes (files created, test count, decisions made)
4. Move the module folder from `active/` to `done/`:
```bash
git mv documents/02-roadmap/modules/active/{folder} documents/02-roadmap/modules/done/{folder}
```

---

## Quick Reference: Templates

All code templates in `.github/skills/backend-module/templates/`:

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
