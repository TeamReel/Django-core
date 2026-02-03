# Work Packages: Hierarchical Search Navigation

**Branch**: `045-hierarchical-search-navigation` | **Date**: 2026-02-03 | **Plan**: [Link](plan.md)

**Inputs**: Design documents from `/kitty-specs/045-hierarchical-search-navigation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently deliverable and testable.

**Prompt Files**: Each work package references a matching prompt file in `tasks/planned/` for detailed implementation guidance.

---

## Work Package WP01: Setup & Configuration (Priority: P0)

**Goal**: Initialize the hierarchy subsystem package and configure Django settings.
**Independent Test**: Package is importable; settings can be read from Django shell.
**Prompt**: `tasks/planned/WP01-setup-and-configuration.md`

### Included Subtasks
- [ ] T001 Create `src/core/apps/search/hierarchy/` package directory
- [ ] T002 [P] Add `__init__.py` to make hierarchy package importable
- [ ] T003 [P] Add hierarchy settings to `src/core/settings/base.py`

### Implementation Notes
- Package structure: `src/core/apps/search/hierarchy/`
- Settings to add: `SEARCH_HIERARCHY_RESOLVERS`, `SEARCH_HIERARCHY_ANCHOR_TYPES`, `SEARCH_HIERARCHY_MAX_DEPTH`, `SEARCH_HIERARCHY_MAX_NODES`
- Default values: Empty dict/list, depth=3, nodes=100

### Parallel Opportunities
- Settings addition (T003) can proceed independently of package creation (T001-T002)

### Dependencies
- None (starting package).

### Risks & Mitigations
- Import conflicts → Use absolute imports from `core.apps.search.hierarchy`

---

## Work Package WP02: Core Resolver Logic (Priority: P0)

**Goal**: Implement the base resolver interface, registry, and node data structure.
**Independent Test**: Can instantiate a dummy resolver and load it via registry; can create node trees.
**Prompt**: `tasks/planned/WP02-core-resolver-logic.md`

### Included Subtasks
- [ ] T004 Implement `BaseHierarchyResolver` in `hierarchy/base.py`
- [ ] T005 Implement resolver registry in `hierarchy/registry.py`
- [ ] T006 [P] Implement `HierarchyNode` dataclass in `hierarchy/nodes.py`
- [ ] T007 [P] Add recursion depth and node limit guards to base resolver
- [ ] T007B [P] Add per-level child limit guard (default: 5 children per node)

### Implementation Notes
- `BaseHierarchyResolver`: Stateful class with `__init__(self, request)` and abstract `get_children(instance)`
- Registry: Use `django.utils.module_loading.import_string` to load resolver classes from settings
- Node structure: Simple dataclass matching the OpenAPI schema
- Guards: Enforce `SEARCH_HIERARCHY_MAX_DEPTH` and `SEARCH_HIERARCHY_MAX_NODES` in traversal logic

### Parallel Opportunities
- Node dataclass (T006) can develop independently of resolver/registry
- Guard logic (T007) can be added in parallel with registry implementation

### Dependencies
- Depends on WP01 (settings must exist).

### Risks & Mitigations
- Circular imports → Use lazy loading in registry; avoid importing resolvers at module level
- Infinite recursion → Guards must check depth before making recursive calls

---

## Work Package WP03: Serialization Layer (Priority: P1)

**Goal**: Implement DRF serializers for hierarchy nodes with recursive structure.
**Independent Test**: Can serialize a mock node tree to JSON matching OpenAPI contract.
**Prompt**: `tasks/planned/WP03-serialization-layer.md`

### Included Subtasks
- [ ] T008 Implement `HierarchyNodeSerializer` in `hierarchy/serializers.py`
- [ ] T009 Implement `HierarchyAnchorSerializer` in `hierarchy/serializers.py`
- [ ] T010 [P] Add validation for required fields (id, type, title)
- [ ] T011 [P] Add recursive serialization for `children` field

### Implementation Notes
- Use DRF's `Serializer` class (not ModelSerializer, since nodes are virtual)
- Fields: `id`, `type`, `title`, `url`, `description`, `children`
- Recursive pattern: `children = HierarchyNodeSerializer(many=True, required=False)`
- Validation: Ensure `id`, `type`, `title` are always present

### Parallel Opportunities
- Anchor serializer (T009) can develop independently of node serializer (T008)
- Validation (T010) and recursion (T011) can proceed in parallel once base serializer exists

### Dependencies
- Depends on WP02 (needs `HierarchyNode` dataclass).

### Risks & Mitigations
- Deep nesting → Serializer handles this naturally, but guards in resolver prevent excessive depth

---

## Work Package WP04: API Integration (Priority: P1) 🎯 MVP

**Goal**: Extend GlobalSearchViewSet to support `?hierarchy=true` parameter and return hierarchy data.
**Independent Test**: `GET /api/search/?q=test&hierarchy=true` returns proper response structure with `hierarchy` key (may be null).
**Prompt**: `tasks/planned/WP04-api-integration.md`

### Included Subtasks
- [ ] T012 Locate and review existing `GlobalSearchViewSet` in `src/core/apps/search/viewsets.py`
- [ ] T013 Implement anchor selection logic (find best anchor from search results)
- [ ] T014 Implement hierarchy resolution logic (call resolver, handle errors)
- [ ] T015 Update `list()` method to inject `hierarchy` key into response
- [ ] T016 Add fail-safe error handling (log errors, return hierarchy=null on failure)
- [ ] T017 [P] Add structured logging for hierarchy generation (success/failure, timing)

### Implementation Notes
- Anchor selection order: Exact title match → Type priority → Top 3 results
- Error handling: Wrap hierarchy resolution in try/except, log to Sentry/logger, never crash search
- Response format: `{"results": [...], "hierarchy": {"anchor": {...}, "tree": [...]}}`
- Feature flag check: Respect `SEARCH_HIERARCHY_ENABLED` setting if present

### Parallel Opportunities
- Logging (T017) can be added independently once core logic works

### Dependencies
- Depends on WP02 (resolver/registry) and WP03 (serializers).

### Risks & Mitigations
- Breaking existing clients → Ensure `results` list is unchanged; `hierarchy` is additive
- Performance impact → Add timing logs; consider caching in future iterations
- Error leakage → Never expose internal errors to users; log verbosely internally

---

## Work Package WP05: Testing & Validation (Priority: P2)

**Goal**: Comprehensive test coverage for resolvers, serializers, and API integration.
**Independent Test**: Full test suite passes with >85% coverage on hierarchy code.
**Prompt**: `tasks/planned/WP05-testing-and-validation.md`

### Included Subtasks
- [ ] T018 Create `tests/test_hierarchy_base.py` for BaseHierarchyResolver tests
- [ ] T019 Create `tests/test_hierarchy_registry.py` for registry loading tests
- [ ] T020 [P] Create `tests/test_hierarchy_serializers.py` for serializer tests
- [ ] T021 Create `tests/test_search_hierarchy_integration.py` for end-to-end API tests
- [ ] T022 [P] Add test for recursion depth limits
- [ ] T023 [P] Add test for node count limits
- [ ] T024 [P] Add test for error handling (resolver crash doesn't break search)
- [ ] T025 [P] Add test for tenant isolation (users only see their org's data)
- [ ] T026 Add test for anchor selection logic (exact match, type priority, ranking)
- [ ] T027 [P] Add performance benchmark test (verify <50ms overhead with 100 nodes)

### Implementation Notes
- Use pytest fixtures for mock resolvers and test data
- Test error scenarios: resolver raises exception, missing settings, invalid node structure
- Integration tests: Create real search index entries, verify hierarchy appears correctly
- Performance tests: Verify hierarchy adds <50ms overhead (use `django-debug-toolbar` query counting)

### Parallel Opportunities
- Unit tests (T018-T020) can be written in parallel
- Integration tests (T021-T026) can proceed independently once API code exists

### Dependencies
- Depends on WP04 (need working API to test).

### Risks & Mitigations
- Flaky tests → Use deterministic test data; avoid time-based dependencies
- Test isolation → Each test should create/clean up its own data
- Coverage gaps → Review coverage report; add tests for edge cases

---

## Work Package WP06: Documentation & Polish (Priority: P3)

**Goal**: Update documentation, add ADRs, and validate quickstart guide.
**Independent Test**: Quickstart guide successfully creates a working resolver; docs are current.
**Prompt**: `tasks/planned/WP06-documentation-and-polish.md`

### Included Subtasks
- [ ] T028 [P] Move `quickstart.md` to `documents/04-modules/search/hierarchy.md`
- [ ] T029 [P] Update `documents/index.md` to reference hierarchy feature
- [ ] T030 [P] Verify ADR template exists at `.github/templates/ADR.md` (create if missing)
- [ ] T031 [P] Create ADR for resolver pattern decision (stateful vs stateless)
- [ ] T032 [P] Create ADR for fail-safe error handling strategy
- [ ] T033 Validate quickstart guide end-to-end (create test resolver following guide)
- [ ] T034 Add code comments and docstrings to public APIs
- [ ] T035 Update CHANGELOG.md with feature addition

### Implementation Notes
- ADRs should capture: Context, Decision, Consequences (use ADR template)
- Quickstart validation: Follow the guide exactly as a new developer would
- Docstrings: Use Google style; include parameter types and return values
- CHANGELOG: Follow keep-a-changelog format; add under "Unreleased" section

### Parallel Opportunities
- All documentation tasks can proceed in parallel

### Dependencies
- Depends on WP05 (all code must be tested and working).

### Risks & Mitigations
- Doc drift → Treat docs as code; review in PR
- Quickstart doesn't work → Test it in a clean environment before finalizing

---

## Dependency & Execution Summary

**Sequence**: WP01 → WP02 → WP03 → WP04 (MVP) → WP05 → WP06

**Parallelization**:
- WP01 and WP02 have some internal parallel opportunities
- WP03 can overlap with late stages of WP02
- WP05 test writing can start as soon as WP04 APIs are defined
- WP06 docs can be drafted in parallel with WP05

**MVP Scope**: WP01-WP04 constitute the minimal viable release. This provides a working hierarchy extension that can be demonstrated and used, even without comprehensive tests or documentation.

**Full Release**: All six work packages must complete for production deployment.

---

## Subtask Index (Reference)

| Subtask | Summary | Work Package | Priority | Parallel |
|---------|---------|--------------|----------|----------|
| T001 | Create hierarchy package directory | WP01 | P0 | No |
| T002 | Add __init__.py | WP01 | P0 | Yes |
| T003 | Add settings configuration | WP01 | P0 | Yes |
| T004 | Implement BaseHierarchyResolver | WP02 | P0 | No |
| T005 | Implement registry | WP02 | P0 | No |
| T006 | Implement HierarchyNode dataclass | WP02 | P0 | Yes |
| T007 | Add recursion/limit guards | WP02 | P0 | Yes |
| T008 | Implement HierarchyNodeSerializer | WP03 | P1 | No |
| T009 | Implement HierarchyAnchorSerializer | WP03 | P1 | Yes |
| T010 | Add field validation | WP03 | P1 | Yes |
| T011 | Add recursive serialization | WP03 | P1 | Yes |
| T012 | Review GlobalSearchViewSet | WP04 | P1 | No |
| T013 | Implement anchor selection | WP04 | P1 | No |
| T014 | Implement hierarchy resolution | WP04 | P1 | No |
| T015 | Update list() method | WP04 | P1 | No |
| T016 | Add error handling | WP04 | P1 | No |
| T017 | Add logging | WP04 | P1 | Yes |
| T018 | Test BaseHierarchyResolver | WP05 | P2 | Yes |
| T019 | Test registry | WP05 | P2 | Yes |
| T020 | Test serializers | WP05 | P2 | Yes |
| T021 | Integration tests | WP05 | P2 | No |
| T022 | Test depth limits | WP05 | P2 | Yes |
| T023 | Test node limits | WP05 | P2 | Yes |
| T024 | Test error handling | WP05 | P2 | Yes |
| T025 | Test tenant isolation | WP05 | P2 | Yes |
| T026 | Test anchor selection | WP05 | P2 | No |
| T027 | Performance benchmark | WP05 | P2 | Yes |
| T028 | Move quickstart to docs | WP06 | P3 | Yes |
| T029 | Update docs index | WP06 | P3 | Yes |
| T030 | Verify ADR template | WP06 | P3 | Yes |
| T031 | ADR: Resolver pattern | WP06 | P3 | Yes |
| T032 | ADR: Error handling | WP06 | P3 | Yes |
| T033 | Validate quickstart | WP06 | P3 | No |
| T034 | Add docstrings | WP06 | P3 | Yes |
| T035 | Update CHANGELOG | WP06 | P3 | Yes |
