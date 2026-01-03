---
work_package_id: WP01
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
lane: "doing"
agent: "GitHub Copilot"
shell_pid: "15772"
history:
  - date: 2026-01-03
    action: Created
    agent: GitHub Copilot
---

# Work Package: Core Infrastructure

## Objective
Initialize the `src/search` app, set up the database schema with `SearchEntry` and `pg_trgm`, and implement the `SearchRegistry` system.

## Context
This is the foundation for the search engine. We need a unified table (`SearchEntry`) to store searchable content from various models (Users, Orgs, Projects). We also need a registry pattern to allow other apps to register their models for indexing without modifying the models themselves.

## Detailed Guidance

### T001: Create `src/search` app and configure `INSTALLED_APPS`
- Run `python manage.py startapp search src/search`.
- Move the app to `src/search` if it's not created there directly.
- Add `src.search` to `INSTALLED_APPS` in `config/settings/base.py` (or `common.py`).
- Add `django.contrib.postgres` to `INSTALLED_APPS` if missing.

### T002: Create migration to enable `pg_trgm` extension
- Create an empty migration: `python manage.py makemigrations search --empty --name enable_pg_trgm`.
- Add `TrigramExtension()` to the `operations` list.
- Import `TrigramExtension` from `django.contrib.postgres.operations`.

### T003: Define `SearchEntry` model
- In `src/search/models.py`:
  - Import `SearchVectorField` from `django.contrib.postgres.search`.
  - Import `GenericForeignKey` and `ContentType`.
  - Define `SearchEntry` model with:
    - `id` (UUID, primary key)
    - `content_type` (ForeignKey to ContentType)
    - `object_id` (UUID)
    - `content_object` (GenericForeignKey)
    - `search_vector` (SearchVectorField)
    - `body_text` (TextField)
    - `title` (CharField)
    - `description` (TextField)
    - `image_url` (URLField, nullable)
    - `url` (CharField)
    - `language` (CharField, default='english')
    - `last_updated` (DateTime, auto_now=True)
  - Add `GinIndex` on `search_vector`.
  - Add unique constraint on `(content_type, object_id)`.

### T004: Implement `SearchIndex` abstract base class
- Create `src/search/registry.py`.
- Define `SearchIndex` class.
- It should have methods `get_vector(obj)`, `get_title(obj)`, `get_description(obj)`, `get_url(obj)`, `get_image_url(obj)`.
- These methods should raise `NotImplementedError` or return defaults.

### T005: Implement `SearchRegistry` singleton
- In `src/search/registry.py`:
  - Create `SearchRegistry` class.
  - Methods: `register(model, index_class)`, `get_index(model)`, `get_registered_models()`.
  - Create a singleton instance `search_registry`.
  - Ensure it handles duplicate registration gracefully (or raises error).

### T006: Test `SearchRegistry` registration and retrieval
- Create `tests/search/test_registry.py`.
- Test registering a dummy model and index.
- Test retrieving the index.
- Test behavior when model is not registered.

## Definition of Done
- `src/search` app exists and is installed.
- `SearchEntry` table exists in DB (migrations applied).
- `pg_trgm` extension is enabled.
- `SearchRegistry` is implemented and tested.
- `pytest tests/search/test_registry.py` passes.

## Activity Log

- 2026-01-03T10:34:28Z – GitHub Copilot – shell_pid=15772 – lane=doing – Started implementation
