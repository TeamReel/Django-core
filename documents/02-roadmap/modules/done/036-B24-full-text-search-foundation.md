# B24: Full-text Search Foundation

**Phase:** 9
**Status:** ✅ Done
**Module ID:** 036
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 36. B24 – Full-text Search Foundation

**Doel**: Full-text search via PostgreSQL + adapter pattern voor Elasticsearch (optional).

**Waarom agnostisch**: Search is universeel - users, organisations, projects, files, content.

**Wat moet er gebeuren**:
- **PostgreSQL FTS**: `tsvector` columns op searchable models
  - Add `search_vector` column to User, Organisation, Project models
  - Update trigger to auto-populate on INSERT/UPDATE
  - GIN index on `search_vector` column
- **Trigram indexes**: Voor fuzzy matching (typo tolerance)
  - `pg_trgm` extension
  - Trigram indexes on name, description fields
- **Search API**: `GET /api/search/?q=query&types=user,org,project`
  - Query parsing (quoted phrases, boolean operators: AND/OR/NOT)
  - Grouped results by type (users, orgs, projects)
  - Relevance ranking (ts_rank)
  - Highlighting (ts_headline)
- **Permissions**: Only show results user has access to (via B08)
  - Filter results by org membership
  - Filter results by project permissions
  - No leaking of private data
- **Adapter pattern**: Interface voor future Elasticsearch/Meilisearch
  - `SearchBackend` interface
  - Implementations: `PostgresSearchBackend`, `ElasticsearchBackend` (future)

**Demo Requirements**:
- 🔍 **Search Bar** (`/demo/search`):
  - Instant search input (300ms debounce)
  - Grouped results by type (Users, Organisations, Projects)
  - Highlighting (matched terms in bold)
  - "No results" state
  - Permission checks (only show accessible results)
  - Tests: search "TechCorp" → verify org + projects appear, search "Alice" → verify user appears

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B24-fulltext-search-foundation

[feature summary]
PostgreSQL full-text search with permissions-aware results and adapter pattern for future search engines.

[goals]
- PostgreSQL tsvector + trigram indexes
- Search API with query parsing
- Grouped + ranked results
- Permission filtering (B08 integration)
- Adapter interface for Elasticsearch

[demo requirements]
Demo page: /demo/search
- Search input (debounced)
- Grouped results (users, orgs, projects)
- Highlighting + relevance ranking
- Permission checks
- Tests: search → results → verify access
```

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Search Engine Foundation

**Feature Branch**: `036-search-engine-foundation`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "PostgreSQL full-text search with permissions-aware results and adapter pattern for future search engines."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global Search (Priority: P1)

As a platform user, I want to search for keywords across the entire platform so that I can quickly find Users, Organisations, and Projects relevant to me.

**Why this priority**: This is the core functionality of the feature. Without this, there is no search.

**Independent Test**: Can be fully tested by seeding data and performing search queries via the API or Demo Page.

**Acceptance Scenarios**:

1. **Given** I am logged in and on the search page, **When** I type "TechCorp", **Then** I see a grouped list of results containing "TechCorp" under "Organisations" and "Projects".
2. **Given** I search for a user "Alice", **Then** I see her profile in the "Users" result group.
3. **Given** I search for a partial term "Tech", **Then** I see results for "TechCorp" (fuzzy matching).

---

### User Story 2 - Permission Enforcement (Priority: P1)

As a security-conscious user, I want search results to only include items I am allowed to view, so that private information remains secure.

**Why this priority**: Critical security requirement. Leaking private data via search is a major vulnerability.

**Independent Test**: Can be tested by creating two users with different access levels and verifying their search results differ for the same query.

**Acceptance Scenarios**:

1. **Given** "Project Secret" exists in "Org A" and I am NOT a member of "Org A", **When** I search for "Secret", **Then** "Project Secret" does NOT appear in the results.
2. **Given** "Project Public" exists in "Org B" and I am a member of "Org B", **When** I search for "Public", **Then** "Project Public" appears in the results.

---

### User Story 3 - Search Experience (Priority: P2)

As a user, I want search results to highlight the matching terms and be sorted by relevance, so that I can easily identify why a result was returned.

**Why this priority**: Improves usability and efficiency but is not strictly blocking for the MVP.

**Independent Test**: Can be tested by inspecting the API response structure for highlighting tags and verifying order.

**Acceptance Scenarios**:

1. **Given** a project with description "The quick brown fox", **When** I search for "brown", **Then** the result description displays "The quick **brown** fox" (or similar highlighting).
2. **Given** two results, one with the search term in the title and one in the description, **Then** the result with the term in the title appears first (higher relevance).

## Functional Requirements *(mandatory)*

### Core Search Infrastructure
1.  **PostgreSQL Full-Text Search**: Use PostgreSQL `tsvector` for indexing and `ts_query` for searching.
2.  **Trigram Support**: Enable `pg_trgm` extension for fuzzy matching and typo tolerance.
3.  **Unified Search Table**: Create a single `SearchEntry` model containing:
    *   `search_vector` (Postgres tsvector)
    *   `body_text` (TextField for highlighting)
    *   `title`, `description`, `url`, `image_url` (Denormalized fields for display)
    *   `content_type` & `object_id` (GenericForeignKey to source)
    *   `language` (CharField to store the language used for stemming)
4.  **Async Auto-Update**: Use Django Signals to trigger Celery tasks (`update_search_index`) that update the `SearchEntry` table asynchronously.
    *   **Language Awareness**: The task must check the source object's Organisation language setting (from B12) to configure the correct Postgres stemming configuration (e.g., 'dutch', 'english').

### Architecture & Registry
5.  **Adapter Pattern**: Implement a `SearchBackend` interface to decouple the search implementation from the API.
    *   Create a `PostgresSearchBackend` implementation.
    *   Design for future `ElasticsearchBackend` support.
6.  **Central Registry**: Implement a `SearchIndex` registry system (Option B) to define searchable fields and weights outside of the models.
    *   Example: `ProjectIndex` defines that `title` (A-weight) and `description` (B-weight) are indexed.

### Search API
7.  **Endpoint**: `GET /api/search/` accepting `q` (query) and optional `types` (filter by entity type).
8.  **Query Parsing**: Support basic boolean operators (AND, OR) and quoted phrases via `websearch_to_tsquery`.
    *   **Error Handling**: Implement "Smart Cleanup" (Option C) to sanitize invalid queries (e.g., stripping trailing "OR", balancing quotes) before execution, rather than returning 400 errors.
9.  **Response Format**:
    *   **Default (Global Search)**: Return results grouped by type (`users`, `organisations`, `projects`) with a hard limit of Top-5 results per group.
    *   **Filtered (Drill-down)**: When `types` parameter is provided (e.g., `types=projects`), return standard paginated results for that specific type.
10. **Highlighting**: Include snippets with highlighted matching terms in the response.

### Security
11. **Scope Filtering**: The `SearchBackend` must accept a `user` object and filter all queries using the existing B08 permission logic (`get_objects_for_user` or similar).
    *   **Implementation**: Use a "Pre-Filter" strategy by joining the `SearchEntry` table with the source models (User, Organisation, Project) and applying the standard Django permission filters in the same query. This ensures that pagination and result counts are accurate and secure.

## Clarifications

### Session 2026-01-03
- Q: Result Limits & Pagination Strategy? → A: Hybrid Approach (Option D): Top-5 per group for global search; standard pagination when filtering by specific type.
- Q: Query Syntax Error Handling? → A: Smart Cleanup (Option C): Sanitize invalid boolean syntax (e.g., "foo OR") instead of throwing errors, aligning with a high-quality UX vision.
- Q: Search Vector Storage Strategy? → A: Unified Table (Option B): Single `SearchEntry` model with GenericForeignKey, enabling cleaner architecture and future vector search support.
- Q: Index Update Mechanism? → A: Asynchronous (Option B): Offload index updates to Celery background tasks to ensure fast write performance and scalability.
- Q: Permission Filtering Strategy? → A: Pre-Filter / Join (Option B): Apply permission filters (e.g., `get_objects_for_user`) directly in the search query by joining with source tables, ensuring security and correct pagination.
- Q: Result Hydration Strategy? → A: Denormalized Snapshot (Option B): Store `title`, `description`, `url`, and `image_url` directly in the `SearchEntry` table to avoid N+1 query issues and simplify the frontend contract.
- Q: Language & Stemming Configuration? → A: Configurable per Tenant (Option C): Leverage existing B12 Organisation preferences to determine the stemming language during async indexing, ensuring superior UX for international users.

## Success Criteria *(mandatory)*

1.  **Performance**: Search queries return results in under 200ms for a dataset of 10,000 items.
2.  **Security**: 100% of search results pass the "can view" permission check for the requesting user.
3.  **Extensibility**: Adding a new searchable model requires creating a single `SearchIndex` class and registering it, with zero changes to the model itself.
4.  **Usability**: Search handles minor typos (1-2 characters) and still returns relevant results.

## Key Entities *(optional)*

*   **SearchIndex**: Base class for defining how a model is indexed.
*   **SearchBackend**: Interface for executing searches.
*   **PostgresSearchBackend**: Concrete implementation using Django ORM and Postgres features.
*   **SearchRegistry**: Singleton that holds all registered `SearchIndex` classes.

## Assumptions *(optional)*

*   PostgreSQL version is 13 or higher.
*   The `unaccent` extension is available for accent-insensitive search.
*   We are indexing standard text fields (`CharField`, `TextField`).
*   Frontend will handle the debouncing (300ms) as per the demo requirements.
