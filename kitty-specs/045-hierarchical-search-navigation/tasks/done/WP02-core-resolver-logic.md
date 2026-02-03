---
work_package_id: "WP02"
subtasks:
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T007B"
title: "Core Resolver Logic"
phase: "Phase 1 - Foundation"
lane: "done"
assignee: ""
agent: "claude"
shell_pid: "10500"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2026-02-03T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-03T18:20:00Z"
    agent: "claude"
    shell_pid: "10500"
    lane: "doing"
    action: "Started WP02 implementation"
  - timestamp: "2026-02-03T18:26:00Z"
    agent: "claude-reviewer"
    shell_pid: "10500"
    lane: "done"
    action: "Approved - All core resolver components implemented and verified"
---

# Work Package Prompt: WP02 – Core Resolver Logic

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

**Status**: ✅ **Approved Without Changes**

**Review Summary**:
All WP02 objectives successfully achieved. Core resolver architecture is complete, well-documented, and follows best practices.

**What Was Done Well**:
- ✅ **T004**: `BaseHierarchyResolver` implemented with full ABC pattern
  - Stateful design (initialized with `request`)
  - Abstract `get_children()` method
  - Comprehensive `build_tree()` with guards
  - Excellent docstrings with usage examples

- ✅ **T005**: Resolver registry implemented with robust error handling
  - `get_resolver_class()` - dynamic class loading via `import_string`
  - `get_resolver()` - ContentType-based resolver instantiation
  - Graceful degradation (logs errors, doesn't crash)

- ✅ **T006**: `HierarchyNode` dataclass properly structured
  - Matches OpenAPI schema exactly
  - Auto-converts `id` to string in `__post_init__`
  - Internal `instance` field for recursion (excluded from repr/compare)
  - Default empty children list

- ✅ **T007**: Guards and logging fully implemented
  - Depth limit guard with logging
  - Node count guard with truncation logic
  - Informative log messages when limits are triggered

- ✅ **T007B**: Per-level child limit added
  - `SEARCH_HIERARCHY_PER_LEVEL_LIMIT` setting (default: 5)
  - Documented in `BaseHierarchyResolver` docstring
  - Clear guidance for subclass implementations

- ✅ **Package exports**: `__init__.py` updated with full public API
  - Clean imports: `BaseHierarchyResolver`, `HierarchyNode`, `get_resolver`, `get_resolver_class`
  - Enhanced documentation with usage examples
  - Proper `__all__` declaration

**Code Quality**:
- Modern Python: `from __future__ import annotations`, type hints throughout
- PEP8 compliant: proper imports, clean structure
- No syntax errors or linting issues
- Follows Django conventions (uses `import_string`, `ContentType`)

**Verification Results**:
```
✓ All files created: base.py, nodes.py, registry.py, __init__.py
✓ Imports successful:
  - from search.hierarchy import BaseHierarchyResolver ✓
  - from search.hierarchy import HierarchyNode ✓
  - from search.hierarchy import get_resolver, get_resolver_class ✓
✓ HierarchyNode tested:
  - Auto-converts id to string ✓
  - Nested node structure works ✓
✓ No errors detected by Pylance/type checker
```

**Architecture Validation**:
- Stateful pattern correctly implemented (resolver stores `request`, `user`)
- Registry uses lazy loading (no circular import risk)
- Guards are strict and fail-safe
- Type hints enable excellent IDE support

**Reviewed by**: claude-reviewer
**Review date**: 2026-02-03T18:26:00Z

---

## Objectives & Success Criteria

- Implement `BaseHierarchyResolver` abstract class with stateful pattern
- Implement resolver registry with dynamic class loading
- Implement `HierarchyNode` dataclass for tree structure
- Add recursion depth and node count guards
- Can instantiate a test resolver and load via registry
- Can create and serialize node trees

## Context & Constraints

**Prerequisites**:
- WP01 must be complete (package and settings exist)

**References**:
- [spec.md](../spec.md) - Section 3.3 (Resolver Interface), 3.4 (Guardrails)
- [research.md](../research.md) - Stateful Resolver decision, Registry Pattern
- [data-model.md](../data-model.md) - HierarchyNode structure

**Architectural Constraints**:
- Resolvers must be stateful (initialized with `request` for permissions)
- Registry must use lazy loading (avoid circular imports)
- Guards must be strict (prevent infinite recursion/memory issues)
- Must support Django's `import_string` pattern

## Subtasks & Detailed Guidance

### Subtask T004 – Implement BaseHierarchyResolver

**Purpose**: Create the abstract base class that all hierarchy resolvers must extend.

**Steps**:
1. Create `src/core/apps/search/hierarchy/base.py`
2. Implement the base resolver class:
   ```python
   """Base hierarchy resolver for entity-centric navigation."""
   from abc import ABC, abstractmethod
   from typing import List, Any
   from django.http import HttpRequest
   from django.conf import settings


   class BaseHierarchyResolver(ABC):
       """
       Abstract base class for hierarchy resolvers.

       Resolvers are stateful and initialized with the current request
       to enable permission checks and context access.
       """

       def __init__(self, request: HttpRequest):
           """
           Initialize resolver with request context.

           Args:
               request: Django HttpRequest object for permission/context access
           """
           self.request = request
           self.user = request.user
           self._node_count = 0
           self._max_depth = getattr(settings, 'SEARCH_HIERARCHY_MAX_DEPTH', 3)
           self._max_nodes = getattr(settings, 'SEARCH_HIERARCHY_MAX_NODES', 100)

       @abstractmethod
       def get_children(self, instance: Any) -> List['HierarchyNode']:
           """
           Get child nodes for the given instance.

           Implementations must:
           - Filter children based on user permissions (use self.user)
           - Return HierarchyNode instances
           - Keep queries efficient (use select_related/prefetch_related)

           Args:
               instance: The parent entity instance

           Returns:
               List of HierarchyNode objects representing children
           """
           raise NotImplementedError

       def build_tree(self, instance: Any, current_depth: int = 0) -> List['HierarchyNode']:
           """
           Build hierarchy tree with depth and node count guards.

           Args:
               instance: The root entity instance
               current_depth: Current recursion depth (internal use)

           Returns:
               List of HierarchyNode objects with populated children
           """
           # Guard: Check depth limit
           if current_depth >= self._max_depth:
               return []

           # Guard: Check node count limit
           if self._node_count >= self._max_nodes:
               return []

           # Get children from implementation
           children = self.get_children(instance)
           self._node_count += len(children)

           # Guard: Recheck node count after adding children
           if self._node_count > self._max_nodes:
               # Truncate to stay within limit
               allowed_count = self._max_nodes - (self._node_count - len(children))
               children = children[:allowed_count]

           # Recursively build subtrees
           for child_node in children:
               if hasattr(child_node, 'instance'):
                   child_node.children = self.build_tree(
                       child_node.instance,
                       current_depth + 1
                   )

           return children
   ```

**Files**:
- Create: `src/core/apps/search/hierarchy/base.py`

**Parallel**: No (foundational class)

**Notes**:
- Use type hints throughout
- Guards are critical for production safety
- `build_tree` is the public method; `get_children` is overridden by subclasses
- Store instance reference in node if recursion is needed (see T006)

### Subtask T005 – Implement resolver registry

**Purpose**: Create utilities to load resolver classes from settings.

**Steps**:
1. Create `src/core/apps/search/hierarchy/registry.py`
2. Implement registry functions:
   ```python
   """Resolver registry for loading hierarchy resolvers from settings."""
   from typing import Optional, Type
   from django.conf import settings
   from django.contrib.contenttypes.models import ContentType
   from django.utils.module_loading import import_string
   from django.http import HttpRequest

   from .base import BaseHierarchyResolver


   def get_resolver_class(content_type_label: str) -> Optional[Type[BaseHierarchyResolver]]:
       """
       Get resolver class for the given ContentType label.

       Args:
           content_type_label: String like 'projects.Project'

       Returns:
           Resolver class if registered, None otherwise
       """
       resolvers = getattr(settings, 'SEARCH_HIERARCHY_RESOLVERS', {})
       resolver_path = resolvers.get(content_type_label)

       if not resolver_path:
           return None

       try:
           resolver_class = import_string(resolver_path)
           return resolver_class
       except (ImportError, AttributeError) as e:
           # Log error but don't crash
           import logging
           logger = logging.getLogger(__name__)
           logger.error(
               f"Failed to import resolver '{resolver_path}' "
               f"for '{content_type_label}': {e}"
           )
           return None


   def get_resolver(instance: Any, request: HttpRequest) -> Optional[BaseHierarchyResolver]:
       """
       Get initialized resolver for the given instance.

       Args:
           instance: Django model instance
           request: HttpRequest for resolver initialization

       Returns:
           Initialized resolver instance or None
       """
       # Get ContentType label
       content_type = ContentType.objects.get_for_model(instance)
       label = f"{content_type.app_label}.{content_type.model}"

       # Load resolver class
       resolver_class = get_resolver_class(label)
       if not resolver_class:
           return None

       # Initialize and return
       return resolver_class(request)
   ```

**Files**:
- Create: `src/core/apps/search/hierarchy/registry.py`

**Parallel**: No (depends on T004)

**Notes**:
- Error handling is critical; never crash if resolver can't load
- Use Django's `import_string` for dynamic loading
- ContentType provides the mapping from instance to label

### Subtask T006 – Implement HierarchyNode dataclass

**Purpose**: Create the data structure for hierarchy tree nodes.

**Steps**:
1. Create `src/core/apps/search/hierarchy/nodes.py`
2. Implement the node dataclass:
   ```python
   """Data structures for hierarchy nodes."""
   from dataclasses import dataclass, field
   from typing import List, Optional, Any


   @dataclass
   class HierarchyNode:
       """
       Represents a single node in the hierarchy tree.

       Matches the OpenAPI schema defined in contracts/openapi.yaml.
       """
       id: str
       type: str
       title: str
       url: Optional[str] = None
       description: Optional[str] = None
       children: List['HierarchyNode'] = field(default_factory=list)

       # Internal field: store reference to model instance for recursion
       # (not serialized to API)
       instance: Optional[Any] = field(default=None, repr=False, compare=False)

       def __post_init__(self):
           """Convert id to string if needed."""
           if not isinstance(self.id, str):
               self.id = str(self.id)
   ```

**Files**:
- Create: `src/core/apps/search/hierarchy/nodes.py`

**Parallel**: Yes (can develop independently)

**Notes**:
- Use Python's `dataclass` for clean structure
- `instance` field is internal; not exposed to API
- Auto-convert id to string for consistency
- Children default to empty list (not None)

### Subtask T007 – Add recursion and node limit guards

**Purpose**: Ensure guards are properly enforced in the base resolver.

**Steps**:
1. Review the `build_tree` method in T004
2. Verify depth guard: stops at `SEARCH_HIERARCHY_MAX_DEPTH`
3. Verify node guard: stops at `SEARCH_HIERARCHY_MAX_NODES`
4. Add logging for when guards trigger:
   ```python
   import logging

   logger = logging.getLogger(__name__)

   # In build_tree method, after guards:
   if current_depth >= self._max_depth:
       logger.info(f"Hierarchy depth limit reached: {current_depth}")
       return []

   if self._node_count >= self._max_nodes:
       logger.info(f"Hierarchy node limit reached: {self._node_count}")
       return []
   ```

**Files**:
- Edit: `src/core/apps/search/hierarchy/base.py` (if not already added in T004)

**Parallel**: Yes (can add logging independently)

**Notes**:
- Guards prevent infinite recursion and memory exhaustion
- Logging helps debug hierarchy generation issues
- Truncation should be graceful (return partial tree, not error)

### Subtask T007B – Add per-level child limit

**Purpose**: Implement configurable limit on children returned per node.

**Steps**:
1. Add setting in base resolver `__init__`:
   ```python
   self._per_level_limit = getattr(settings, 'SEARCH_HIERARCHY_PER_LEVEL_LIMIT', 5)
   ```
2. In `get_children` implementations (or base class documentation), enforce:
   ```python
   # In resolver implementations:
   children = queryset[:self._per_level_limit]
   ```
3. Document in docstring that subclasses should respect this limit

**Files**:
- Edit: `src/core/apps/search/hierarchy/base.py`

**Parallel**: Yes (documentation task)

**Notes**:
- This is a soft limit; resolver implementations must honor it
- Prevents overwhelming API responses with thousands of children
- Spec 3.4 mentions "Per-Level Limit: Default 5"

## Definition of Done Checklist

- [ ] `base.py` exists with `BaseHierarchyResolver` class
- [ ] `registry.py` exists with `get_resolver_class` and `get_resolver` functions
- [ ] `nodes.py` exists with `HierarchyNode` dataclass
- [ ] Guards are implemented and logged
- [ ] Can create a test resolver inheriting from BaseHierarchyResolver
- [ ] Can load resolver via registry using mock settings
- [ ] Can create HierarchyNode instances and nest them
- [ ] `tasks.md` updated with completion status

## Review Guidance

**Key checkpoints**:
- BaseHierarchyResolver is properly abstract (uses ABC)
- Registry uses Django's `import_string` pattern
- Guards are strict and fail-safe (don't crash, just truncate)
- Type hints are present throughout
- Error handling in registry logs but doesn't crash

**Context for reviewers**:
- This is the core engine; API integration comes in WP04
- Resolvers must be testable in isolation (stateful pattern enables this)
- Node dataclass must match OpenAPI schema exactly

## Activity Log

- 2026-02-03T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
