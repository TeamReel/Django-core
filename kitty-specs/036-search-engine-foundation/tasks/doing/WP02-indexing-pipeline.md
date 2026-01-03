---
work_package_id: WP02
subtasks:
  - T007
  - T008
  - T009
  - T010
  - T011
  - T012
  - T013
lane: "doing"
agent: "GitHub Copilot"
shell_pid: "15772"
history:
  - date: 2026-01-03
    action: Created
    agent: GitHub Copilot
---

# Work Package: Indexing Pipeline

## Objective
Implement the asynchronous indexing pipeline using Celery, Signals, and a Management Command to populate the `SearchEntry` table.

## Context
We need to keep the search index up-to-date with the source models. We use an "Adapter" pattern (`PostgresSearchBackend`) to handle the actual DB operations, and Celery tasks to perform updates asynchronously to avoid blocking the main thread.

## Detailed Guidance

### T007: Implement `PostgresSearchBackend` class structure
- Create `src/search/backend/postgres.py`.
- Define `PostgresSearchBackend` class.
- Implement `update_entry(obj)` method:
  - Get the registered `SearchIndex` for the object's model.
  - Calculate vector, title, description, etc. using the index.
  - Update or create `SearchEntry`.
- Implement `delete_entry(obj)` method.

### T008: Implement `update_search_index` Celery task
- Create `src/search/tasks.py`.
- Define `update_search_index(content_type_id, object_id)` shared task.
- It should fetch the object and call `PostgresSearchBackend().update_entry(obj)`.
- Define `delete_search_index(content_type_id, object_id)` shared task.

### T009: Implement signal handlers
- Create `src/search/signals.py`.
- Define `handle_save(sender, instance, **kwargs)` and `handle_delete(sender, instance, **kwargs)`.
- Check if `sender` is in `search_registry`.
- If yes, trigger the appropriate Celery task (`delay()`).
- Connect signals in `src/search/apps.py` `ready()` method.

### T010: Create `rebuild_search_index` management command
- Create `src/search/management/commands/rebuild_search_index.py`.
- Iterate over all registered models in `search_registry`.
- For each object, call `update_search_index` (can be synchronous for this command or trigger tasks).
- Add a `--async` flag to optionally trigger tasks instead of running inline.

### T011: Implement `UserIndex`, `OrganisationIndex`, `ProjectIndex`
- In `src/search/indexes.py` (or inside respective apps if preferred, but keeping in search app for now is fine for the foundation, or better: create `src/search/defaults.py` or similar).
- Actually, let's put them in `src/search/apps.py` or a dedicated `src/search/indexes.py` and import them in `apps.py`.
- `UserIndex`: Index `first_name`, `last_name`, `email`.
- `OrganisationIndex`: Index `name`.
- `ProjectIndex`: Index `title`, `description`.

### T012: Register indexes
- In `src/search/apps.py` `ready()`:
  - Import models (User, Organisation, Project).
  - Import Indexes.
  - `search_registry.register(User, UserIndex)`.
  - etc.

### T013: Test indexing pipeline
- Create `tests/search/test_indexing.py`.
- Test that creating a User creates a `SearchEntry` (mocking Celery or using `CELERY_TASK_ALWAYS_EAGER`).
- Test that updating a Project updates the `SearchEntry`.
- Test that deleting an Organisation deletes the `SearchEntry`.

## Definition of Done
- `PostgresSearchBackend` can update/delete entries.
- Celery tasks are implemented.
- Signals trigger tasks for registered models.
- `rebuild_search_index` command works.
- Core models (User, Org, Project) are indexed.
- Integration tests pass.

## Activity Log

- 2026-01-03T10:51:38Z – GitHub Copilot – shell_pid=15772 – lane=doing – Started implementation
