---
name: backend-module
description: "Builds a complete Django backend module from spec to production with discovery gates, convention checks, phased implementation, and verification. Use when building a module, implementing a B-number spec, or creating a new Django app from a roadmap module."
compatibility: "Requires Django 5, DRF, pytest, PostgreSQL. Works in src/ directory."
metadata:
  author: teamreel
  argument-hint: "Module number (e.g. 'B62') or full name (e.g. 'activity-feed')"
---

# Backend Module Builder

Build a complete Django app from a module spec in `docs/roadmap/backlog/{fase}/todo/`.

## When to use
- Building a **complete new Django app** from a B-number module spec (multiple models, API, tests, admin)
- Full lifecycle: discovery → convention check → phased build → verification

## When NOT to use
- Adding a **single endpoint** to an existing app → use `api-endpoint` instead

**Like spec-kitty, but focused:** No worktrees, no branch juggling. Same quality gates compressed into a single-chat flow.

### Module Lifecycle

```
todo/  →  review/  →  done/
(build)   (review)    (complete)
```

All items live in `docs/roadmap/backlog/{fase}/`:
- **todo/**: Items ready to be built — pick from here
- **review/**: After implementation, move item here for code review
- **done/**: After review approval, item moves here

Fases: `01-content-pipeline`, `02-infra-tooling`, `03-admin-analytics`, `04-club-experience`, `05-social-publishing`, `06-automation`, `07-commerce`, `08-platform-scaling`.

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
# 1. Find the module spec in the backlog
Find: docs/roadmap/backlog/{fase}/todo/{PREFIX}-{name}.md
  OR: docs/roadmap/backlog/{fase}/todo/{PREFIX}-{name}/index.md
Read: .github/instructions/backend.instructions.md
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

### Architecture & File Order

**Full reference**: See [references/architecture.md](references/architecture.md) for file creation order, wire-up steps, README requirements, and code templates listing.

Quick reference — create files in dependency order: `__init__.py` → `apps.py` → `models.py` → `managers.py` → `admin.py` → `services.py` → `tasks.py` → `signals.py` → `api/` layer → `tests/`

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

Every module **must** include a `README.md`. See [references/architecture.md](references/architecture.md#readmemd-requirements) for full template.

### Post-Build Analysis

See [references/architecture.md](references/architecture.md#post-build-analysis-checklist) for the complete self-review checklist.

---

## Gate 4: Update Spec

1. Update the spec `index.md`: Status `📋 ROADMAP` → `✅ IMPLEMENTED`
2. Check all delivery checklist items
3. Add implementation notes (files created, test count, decisions made)
4. Move the item from `todo/` to `review/`:
```bash
Move-Item docs/roadmap/backlog/{fase}/todo/{item} docs/roadmap/backlog/{fase}/review/
```

---

## Quick Reference

**Templates**: All code templates in `templates/` — see [references/architecture.md](references/architecture.md#code-templates) for the full listing.
