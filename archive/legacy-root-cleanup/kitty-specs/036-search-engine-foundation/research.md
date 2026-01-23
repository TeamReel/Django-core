# Research: Search Engine Foundation

**Feature**: `036-search-engine-foundation`
**Status**: Completed

## Decisions

### 1. Search Vector Storage
- **Decision**: Unified `SearchEntry` table with `GenericForeignKey`.
- **Rationale**: Decouples search logic from domain models, enabling a "Registry" pattern where new models can be made searchable without schema migrations. Simplifies global search queries (no UNIONs).
- **Alternatives Considered**:
    - *Direct Column*: Adding `search_vector` to every model. Rejected due to migration overhead and complex global search queries.

### 2. Index Update Mechanism
- **Decision**: Asynchronous updates via Celery.
- **Rationale**: Ensures fast write performance for the main application. "Eventual consistency" is acceptable for search.
- **Alternatives Considered**:
    - *Synchronous (Signals)*: Rejected because it slows down every save operation, especially with heavy text processing.

### 3. Permission Filtering
- **Decision**: Pre-Filter / Join Strategy.
- **Rationale**: Joins `SearchEntry` with source tables to apply standard Django permission filters (`get_objects_for_user`) *before* pagination. Ensures security and correct result counts.
- **Alternatives Considered**:
    - *Post-Filter*: Rejected due to pagination issues (empty pages).
    - *Denormalized Permissions*: Rejected due to cache invalidation complexity (updating thousands of records when an Org permission changes).

### 4. Result Hydration
- **Decision**: Denormalized Snapshot (`title`, `description`, `url`, `image`).
- **Rationale**: Eliminates N+1 query problems during display. The search result object has everything needed for the UI.
- **Alternatives Considered**:
    - *Live Hydration*: Rejected because fetching 20 different source objects for every search page is too slow.

### 5. Language Configuration
- **Decision**: Configurable per Tenant (via B12).
- **Rationale**: Leverages existing Organisation settings to provide superior UX for international users. Handled during the async update task.
- **Alternatives Considered**:
    - *Hardcoded English*: Rejected as it violates the multi-lingual vision.

### 6. Initial Population
- **Decision**: Management Command (`rebuild_search_index`).
- **Rationale**: Safe, controllable, and standard practice for Django search apps.
- **Alternatives Considered**:
    - *Migration Script*: Rejected due to deployment timeout risks.
