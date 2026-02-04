---
work_package_id: WP01
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
lane: doing
agent: copilot
shell_pid: 42868
history:
  - { date: "2026-02-04", action: "created" }
  - { date: "2026-02-04T18:30:00Z", agent: "copilot", shell_pid: "42868", lane: "doing", action: "Started implementation" }
---

# Work Package 01: Foundations & Models

## Objective
Establish the `navigation` Django app and implement the core data models (`UserRecent`, `UserFavorite`) using `GenericForeignKey` for polymorphic relationships.

## Context
This is the foundational layer for Feature B41. We need a clean schema that allows linking to *any* Django model (Projects, Players, etc.) without hard dependencies.
We will use `django.contrib.contenttypes` as agreed in the Research phase.

## Tasks

### T001: Scaffold Module
1. Create directory `src/core/navigation`.
2. Add `__init__.py`, `apps.py`, `models.py`, `admin.py`.
3. Configure `NavigationConfig` in `apps.py` (label=`navigation`).
4. Register in `config/settings/base.py` (or common).

### T002: Abstract Base Model
In `models.py`, create `NavigationBase(models.Model)`:
- `user`: ForeignKey to `settings.AUTH_USER_MODEL`.
- `content_type`: ForeignKey to `ContentType` (nullable).
- `object_id`: UUIDField or CharField (nullable).
- `content_object`: GenericForeignKey.
- `label`: CharField(max_length=255).
- `path`: CharField(max_length=500). **Constraint**: Must start with `/` (relative path) to prevent absolute URL phishing. Use validators.
- `context`: JSONField (default=dict).
- `Meta`: `abstract = True`

### T003: UserRecent Model
Refine `UserRecent(NavigationBase)`:
- `last_seen_at`: DateTimeField(auto_now=True).
- `Meta`:
    - `ordering = ['-last_seen_at']`
    - `unique_together = ('user', 'content_type', 'object_id')` (Standard constraints).
    - `indexes`: Add index on `last_seen_at`.

### T004: UserFavorite Model
Refine `UserFavorite(NavigationBase)`:
- `created_at`: DateTimeField(auto_now_add=True).
- `order`: PositiveIntegerField(default=0).
- `Meta`:
    - `ordering = ['order', '-created_at']`
    - `unique_together = ('user', 'content_type', 'object_id')`

### T005: Migrations
- Run `makemigrations navigation`.
- Inspect the file. Ensure dependencies include `contenttypes`.

### T006: Unit Tests
Create `tests/navigation/test_models.py`.
- **Test 1 Creation**: Create a `UserRecent` pointing to a User object (self-reference for test simplicity).
- **Test 2 Integrity**: Try creating duplicate `(user, object)` pair -> Expect error (or handle in service later).
- **Test 3 GFK**: Verify `recents_item.content_object` resolves correctly.

## Definition of Done
- [ ] Apps installed and migration applied.
- [ ] Models enforce schema constraints.
- [ ] Tests pass (pytest).
