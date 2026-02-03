# Implementation Plan: Hierarchical Search Navigation
*Path: [templates/plan-template.md](templates/plan-template.md)*

**Branch**: `045-hierarchical-search-navigation` | **Date**: 2026-02-03 | **Spec**: [Link](spec.md)
**Input**: Feature specification from `/kitty-specs/045-hierarchical-search-navigation/spec.md`

## Summary

Enhance the global search API to optionally return a hierarchical tree of related items (e.g., Competition -> Season -> Match) alongside standard keyword results. The implementation uses a pluggable registry pattern where `projects.Project` or other models can be configured as "anchors" with custom logic to resolve their children. This is a purely additive backend change.

## Technical Context

### Architecture
- **Resolver Pattern**: Stateful `BaseHierarchyResolver(request)` abstract base class.
- **Registry**: `SEARCH_HIERARCHY_RESOLVERS` setting mapping `app_label.Model` string to dot-path strings of Resolver classes.
- **API Integration**: Override `GlobalSearchViewSet.list()` to inject the `hierarchy` key into the response when `?hierarchy=true`.
- **Serialization**: dedicated `HierarchyNodeSerializer` to ensure OpenAPI schema compliance.

### Components
- `core.apps.search.hierarchy.base`: Contains `BaseHierarchyResolver` and strict recursion/limit logic.
- `core.apps.search.hierarchy.registry`: Utilities to load classes from the SETTINGS string paths.
- `core.apps.search.hierarchy.serializers`: New recursive serializer.
- `core.apps.search.viewsets`: Updated `list` method in `GlobalSearchViewSet`.

### Dependencies
- None external. Relies on `django.conf.settings` and standard Django imports.

### Risks & Mitigations
- **Recursion Loops**: Mitigated by strict `SEARCH_HIERARCHY_MAX_DEPTH` enforcement in the Base Resolver.
- **Performance**: N+1 queries in resolvers. Mitigation: Reviewers must check for `prefetch_related` in resolver implementations.
- **Error Handling**: Fail-safe try/except block around hierarchy generation to prevent blocking main search.

## Constitution Check

| Gate | Check | Status | Note |
|---|---|---|---|
| **1. 80/20 Rule** | Is this essential? | PASS | Roadmap item (Fase 13). Adds high value for navigation without complex UI work. |
| **2. Production Safe** | Is DB access safe? | PASS | Read-only. No schema changes. |
| **3. Modular** | Is it decoupled? | PASS | Uses Registry pattern. Core search doesn't know about specific domain hierarchies. |
| **4. Tested** | Is coverage sufficient? | PENDING | Plan includes test cases for recursion, limits, and error handling. |
| **5. Documented** | Is docs included? | PASS | API Contracts and Extension Guide created. |

---

## Phases

### Phase 0: Outline & Research
> **Status: COMPLETE**

- [x] Extract unknowns from Technical Context.
- [x] Generate and dispatch research agents (Skipped - Standard Django Pattern).
- [x] Consolidate findings in `research.md`.

### Phase 1: Design & Contracts
> **Status: COMPLETE**

- [x] Draft `data-model.md` (Defines `HierarchyNode`, `Anchor`).
- [x] Create `contracts/openapi.yaml` (API Extension Schema).
- [x] Create `quickstart.md` (Developer Guide for Resolvers).
- [x] Update agent context (Manually verified).

### Phase 2: Implementation Tasks
> **Status: PENDING** (Next Step: `spec-kitty.tasks`)

- [ ] Generate detailed `tasks.md`.
- [ ] Review and approval of task breakdown.

---

## Project Structure

### Documentation (this feature)

```
kitty-specs/045-hierarchical-search-navigation/
 plan.md              # This file
 research.md          # Arch decisions
 data-model.md        # Recursive Node structure
 quickstart.md        # How-to guide
 contracts/
    openapi.yaml     # API Schema
 tasks.md             # To be created
```

### Source Code
```
src/core/apps/search/
 hierarchy/           # NEW PACKAGE
    __init__.py
    base.py          # BaseHierarchyResolver
    registry.py      # Loading logic
    serializers.py   # HierarchyNodeSerializer
 viewsets.py          # Update existing GlobalSearchViewSet
 tests/
     test_hierarchy.py # New tests
```
