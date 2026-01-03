---
work_package_id: WP05
subtasks:
  - T022
  - T023
  - T024
  - T025
lane: planned
history:
  - date: 2026-01-03
    action: Created
    agent: GitHub Copilot
---

# Work Package: Demo & Documentation

## Objective
Integrate the search functionality into the Demo Shell, ensure the "Football Leagues" demo data is sufficient for testing, and create the mandatory Visual Manual Test Guide.

## Context
Per Constitution Principle XIV (Demo-First Development), every feature must be verifiable in the production Demo Shell. We need a UI to demonstrate the search, and a guide for humans to verify it.

## Detailed Guidance

### T022: Create/Update Demo Shell Search Page
- Locate the Demo Shell app (likely `src/demo` or similar, check `INSTALLED_APPS`).
- Create a simple template `search.html` that:
  - Has a search input form.
  - Displays results grouped by type (Users, Orgs, Projects).
  - Shows highlighting (using `safe` filter if backend returns HTML, or handling it in JS).
  - Allows filtering by type (links to `?q=...&types=projects`).
- Wire up a view in the demo app to render this template and call the Search API (or use HTMX/JS to fetch results).

### T023: Seed "Football Leagues" demo data
- Check existing demo data scripts (e.g., `scripts/seed_demo_data.py` or management commands).
- Ensure we have:
  - **Organisations**: "Premier League", "La Liga", "Bundesliga".
  - **Projects**: "VAR Implementation", "Stadium Renovation", "Youth Academy".
  - **Users**: "Alice Referee", "Bob Manager", "Charlie Fan".
- Ensure descriptions contain searchable terms (e.g., "The quick brown fox" for highlighting tests).
- Run the seeding script and ensure the search index is updated (via the signals/tasks from WP02).

### T024: Create `manual-tests/036-search-foundation.md`
- Create the file `manual-tests/036-search-foundation.md`.
- Follow the standard format:
  - **Feature**: Search Engine Foundation
  - **Scenario**: Football Leagues
  - **Test Steps**:
    1.  Login as Alice.
    2.  Search for "Premier".
    3.  Expect: Organisation "Premier League" appears.
    4.  Search for "VAR".
    5.  Expect: Project "VAR Implementation" appears.
    6.  Search for "Secret" (if applicable).
    7.  Expect: No results (if she doesn't have access).
- Include screenshots placeholders (or instructions to take them).

### T025: Verify Performance
- Run a script or manual test to measure search response time.
- Ensure it is under 200ms.
- Document the result in the manual test guide or a comment.

## Definition of Done
- Demo Shell has a working search page.
- "Football Leagues" data is searchable.
- `manual-tests/036-search-foundation.md` exists and covers the user stories.
- Performance is verified.
