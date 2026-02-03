# Specification: Hierarchical Search Navigation

**Feature**: Hierarchical Search Navigation
**Status**: DRAFT
**Feature ID**: 045

## Clarifications

### Session 2026-02-03
- Q: Resolver Implementation Pattern? → A: Stateful Instance (`Resolver(request)`) to allow easy access to user permissions and context.
- Q: Error Handling Strategy? → A: Fail Safe (Log & Suppress). Return `hierarchy: null` on failure to preserve main search results.

## 1. Introduction

### Purpose
Enhance global search to provide "entity-centric" navigation by optionally returning a hierarchical tree of related items under a matched "anchor" entity. This allows users to navigate natural data structures (e.g., Organisation -> Projects -> Tasks) directly from search results.

### Goals
- **Product-Agnostic Extensibility**: Provide a pluggable mechanism for defining hierarchies that downstream products can override without modifying core code.
- **Additive API**: Ensure valid existing search clients continue to work without modification.
- **Deterministic Experience**: Define clear tie-breaking rules for selecting the primary "anchor" when multiple results match.
- **Safe & Performant**: Enforce strict safeguards on recursion depth, node limits, and tenant data isolation.

### Out of Scope
- Frontend implementation or UI components (TeamReel/Demo specific).
- Searching *within* the hierarchy content (filtering children by keyword is a future enhancement).
- Modification of the existing `results` list in the search response.

---

## 2. User Scenarios

### Scenario 1: Navigating a Tournament Structure
**Actor**: League Manager
**Context**: Allows quick access to a specific match deep in the hierarchy without multiple clicks.
**Flow**:
1. User searches for "Premier League".
2. System identifies "Premier League" (Competition) as the best anchor.
3. System returns the standard search hits AND a `hierarchy` object.
4. The hierarchy object contains the active Season, its rounds, and upcoming matches as nested nodes.

### Scenario 2: Project Drill-down
**Actor**: Project Admin
**Context**: Needs to see the breakdown of a specific project.
**Flow**:
1. User searches for "Redesign 2025".
2. System matches "Redesign 2025" (Project).
3. System uses the configured `ProjectHierarchyResolver` to fetch children (Sprints -> Tasks).
4. Response includes the project as the root, with sprints and tasks nested up to the configured depth.

---

## 3. Functional Requirements

### 3.1. API Extensions
- **Endpoint**: `GET /api/search/`
- **Parameter**: `hierarchy=true` (boolean, default: false).
- **Response Structure**:
  - `results`: [Existing List]
  - `hierarchy`: { ... } (Optional, null if disabled or no anchor found)
    - `anchor`: { `id`, `type`, `title`, `url` }
    - `tree`: [ List of Child Nodes ]

### 3.2. Anchor Resolution
- The system MUST select exactly one "anchor" entity from the search results to build the hierarchy around.
- **Selection Logic**:
  1. Filter results to "Anchor Types" defined in configuration.
  2. Prioritize **Exact Title Match** over partial matches.
  3. Prioritize by **Type Order** defined in settings (e.g., `projects.Project` > `organisations.Organisation`).
  4. Select the first match from the top 3 ranked keyword results.

### 3.3. Resolver Registry (Settings Pattern)
- The system MUST support a registry defined in `settings.py` mapping Model Content Types to Resolver classes.
- **Configuration Pattern**:
  ```python
  SEARCH_HIERARCHY_RESOLVERS = {
      'projects.Project': 'core.apps.projects.resolvers.ProjectResolver',
      # TeamReel overrides this in its own settings
  }
  ```
- **Resolver Interface (Stateful)**:
  - `__init__(self, request)`: Initialized with the active request object (for permissions/context).
  - `get_children(self, instance) -> List[Node]`: Returns child nodes for the instance.

### 3.4. Guardrails & Limits
- **Max Depth**: Configurable safeguard (Default: 3 levels).
- **Max Nodes**: Hard limit on total nodes in the tree (Default: 100).
- **Per-Level Limit**: Configurable limit of children per node (Default: 5).
- **Permissions**: Resolvers MUST filter children using `index.get_visible_ids(user)` or equivalent standard permission checks.

### 3.5. Feature Flags
- `search_hierarchy_enabled`: Master switch to toggle the entire feature.
- `search_hierarchy_max_depth`: integer.
- `search_hierarchy_max_nodes`: integer.

### 3.6. Error Handling strategy
- **Strategy**: Fail-Safe.
- If a resolver raises an exception during hierarchy construction, the system MUST:
  1. Log the exception trace to the application logs (e.g., Sentry).
  2. Suppress the error to the user.
  3. Return the standard search results with `hierarchy: null`.
- **Rationale**: Search is a critical function; auxiliary hierarchy data failures must not block the primary user goal.

---

## 4. Technical Constraints & Data Model

### Data Entities
- **HierarchyNode**:
  - `id`: string/integer
  - `type`: string (model label or logical type)
  - `title`: string
  - `url`: string (optional)
  - `description`: string (optional)
  - `children`: List[HierarchyNode] (optional)

### Security
- **Tenant Isolation**: The resolver MUST NOT return data belonging to other organizations, even if they share the same structure.
- **Access Control**: Reuse existing `get_visible_ids` or ViewSet permission logic.

---

## 5. Success Criteria

### Quantitative
- **Performance**: Hierarchy generation adds < 50ms overhead to search response time (up to 100 nodes).
- **Efficiency**: Database query count for hierarchy is O(1) or O(Depth) using `prefetch_related`, not O(N) nodes.

### Qualitative
- **Extensibility**: A developer can add a new hierarchy resolver for a custom model in < 15 minutes by adding a class and 1 setting line.
- **Stability**: Existing search tests pass without modification.
