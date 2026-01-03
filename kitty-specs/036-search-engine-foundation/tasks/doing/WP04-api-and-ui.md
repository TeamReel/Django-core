---
work_package_id: WP04
subtasks:
  - T018
  - T019
  - T020
  - T021
lane: "doing"
agent: "GitHub Copilot"
shell_pid: "15772"
history:
  - date: 2026-01-03
    action: Created
    agent: GitHub Copilot
---

# Work Package: API and UI

## Objective
Expose the search functionality via a REST API that supports global (grouped) search and filtered (paginated) search, with result highlighting.

## Context
The frontend needs a flexible API. The default mode is "Global Search" which returns a few top results for each category (Users, Projects, Orgs). The user can then "drill down" into a category to see all results, paginated.

## Detailed Guidance

### T018: Create `SearchSerializer`
- In `src/search/api/serializers.py`.
- `SearchEntrySerializer`:
  - Fields: `id`, `title`, `description`, `url`, `image_url`, `content_type` (as string name), `highlight`.
  - `highlight` field should contain the highlighted snippet from `body_text`.

### T019: Implement `SearchAPIView`
- In `src/search/api/views.py`.
- Create `SearchAPIView` (APIView).
- `get(request)`:
  - Get `q` and `types` from query params.
  - Call `PostgresSearchBackend().search(q, request.user, types)`.

### T020: Implement result grouping and pagination
- **Global Search (no `types`)**:
  - The backend might return a flat list. The View needs to group them.
  - OR, the backend can support a "grouped" mode.
  - *Better approach*: The View iterates over the results and groups them by `content_type`.
  - Limit each group to Top-5.
  - Return JSON: `{ "projects": [...], "users": [...], "organisations": [...] }`.
- **Filtered Search (`types=projects`)**:
  - Apply standard pagination (PageNumberPagination).
  - Return standard paginated response.

### T021: Add integration tests for API endpoints
- Create `tests/search/test_api.py`.
- Test Global Search response structure.
- Test Filtered Search pagination.
- Test that `highlight` field is present and contains `<b>` tags (or similar).

## Definition of Done
- `GET /api/search/?q=...` returns grouped results.
- `GET /api/search/?q=...&types=projects` returns paginated project results.
- Highlighting is working.
- API tests pass.

## Activity Log

- 2026-01-03T11:31:24Z – GitHub Copilot – shell_pid=15772 – lane=doing – Started implementation
