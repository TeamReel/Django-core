# Feature Tasks: Search Engine Foundation

**Feature Branch**: `036-search-engine-foundation`
**Status**: Planned

## Work Packages

### WP01: Core Infrastructure
**Goal**: Initialize the search app, database schema, and registry system.
**Priority**: P0 (Blocker)
**Tests**: Unit tests for Registry and Model creation.

- [x] **T001**: Create `src/search` app and configure `INSTALLED_APPS`.
- [x] **T002**: Create migration to enable `pg_trgm` extension.
- [x] **T003**: Define `SearchEntry` model with `SearchVectorField` and GIN index.
- [x] **T004**: Implement `SearchIndex` abstract base class.
- [x] **T005**: Implement `SearchRegistry` singleton and discovery logic.
- [x] **T006**: Test `SearchRegistry` registration and retrieval.

**Implementation Sketch**:
1.  Run `startapp search`.
2.  Add `django.contrib.postgres` and `src.search` to settings.
3.  Create empty migration for `pg_trgm`.
4.  Define `SearchEntry` in `models.py`.
5.  Create `registry.py` for `SearchIndex` and `SearchRegistry`.

**Prompt**: [tasks/done/WP01-core-infrastructure.md](tasks/done/WP01-core-infrastructure.md)

---

### WP02: Indexing Pipeline
**Goal**: Implement the mechanism to populate and update the search index.
**Priority**: P0 (Blocker)
**Tests**: Integration tests for Signals -> Task -> DB.

- [x] **T007**: Implement `PostgresSearchBackend` class structure.
- [x] **T008**: Implement `update_search_index` Celery task.
- [x] **T009**: Implement signal handlers (`post_save`, `post_delete`) in `src/search/signals.py`.
- [x] **T010**: Create `rebuild_search_index` management command.
- [x] **T011**: Implement `UserIndex`, `OrganisationIndex`, `ProjectIndex`.
- [x] **T012**: Register indexes in `src/search/apps.py`.
- [x] **T013**: Test indexing pipeline (create object -> verify `SearchEntry`).

**Implementation Sketch**:
1.  Create `backend/postgres.py`.
2.  Create `tasks.py` with `shared_task`.
3.  Connect signals in `apps.py`.
4.  Implement management command to iterate all registered models.
5.  Define specific indexes for User, Org, Project.

**Prompt**: [tasks/done/WP02-indexing-pipeline.md](tasks/done/WP02-indexing-pipeline.md)

---

### WP03: Search Backend Logic
**Goal**: Implement secure search execution with query parsing and permission filtering.
**Priority**: P1 (Core Feature)
**Tests**: Security tests for permission enforcement.

- [ ] **T014**: Implement `PostgresSearchBackend.search()` with `ts_query`.
- [ ] **T015**: Implement query sanitization ("Smart Cleanup").
- [ ] **T016**: Implement permission filtering logic (joining source tables).
- [ ] **T017**: Test search execution and permission enforcement.

**Implementation Sketch**:
1.  Enhance `PostgresSearchBackend` with `search` method.
2.  Use `websearch_to_tsquery` and `SearchRank`.
3.  Implement `_apply_permissions` method using `get_objects_for_user`.
4.  Write tests ensuring unauthorized objects are excluded.

**Prompt**: [tasks/planned/WP03-search-backend-logic.md](tasks/planned/WP03-search-backend-logic.md)

---

### WP04: API Implementation
**Goal**: Expose search functionality via API with grouping and highlighting.
**Priority**: P1 (Core Feature)
**Tests**: API integration tests.

- [ ] **T018**: Create `SearchSerializer` with highlighting support.
- [ ] **T019**: Implement `SearchAPIView` with `q` and `types` parameters.
- [ ] **T020**: Implement result grouping (Global Search) and pagination (Filtered Search).
- [ ] **T021**: Add integration tests for API endpoints.

**Implementation Sketch**:
1.  Create `api/serializers.py`.
2.  Create `api/views.py` using `APIView` or `ViewSet`.
3.  Handle `types` query param for drill-down.
4.  Format response according to spec (grouped vs flat).

**Prompt**: [tasks/planned/WP04-api-and-ui.md](tasks/planned/WP04-api-and-ui.md)

---

### WP05: Demo & Documentation
**Goal**: Integrate search into the Demo Shell, seed data, and create the Visual Manual Test Guide.
**Priority**: P2 (Constitution Requirement)
**Tests**: Manual verification via Demo Shell.

- [ ] **T022**: Create/Update Demo Shell Search Page (Frontend/Template).
- [ ] **T023**: Seed "Football Leagues" demo data (Users, Orgs, Projects) for search testing.
- [ ] **T024**: Create `manual-tests/036-search-foundation.md` (Visual Guide).
- [ ] **T025**: Verify Performance (<200ms) with seeded data.

**Implementation Sketch**:
1.  Create a simple search page in the demo app (or update existing shell).
2.  Write a management command or script to seed the "Football Leagues" data if not already present, ensuring rich text for search.
3.  Write the manual test guide following the standard template.
4.  Run queries and record timing in the guide.

**Prompt**: [tasks/planned/WP05-demo-and-documentation.md](tasks/planned/WP05-demo-and-documentation.md)
