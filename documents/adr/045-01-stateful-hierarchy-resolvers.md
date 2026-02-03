# ADR 045-01: Stateful Hierarchy Resolvers

**Date**: 2026-02-03
**Status**: Accepted
**Context**: Feature 045 - Hierarchical Search Navigation

## Problem Statement

The hierarchy feature requires resolvers to build navigation trees from search results. We need a pattern that:
- Can enforce permission checks (tenant isolation is critical)
- Can access request context (user, headers, sessions)
- Fits with Django's ecosystem patterns
- Is testable and maintainable

## Options Considered

### Option 1: Stateless Functions
```python
# Usage: hierarchy = build_hierarchy_tree(anchor, request)
def build_hierarchy_tree(anchor, request):
    resolver = get_resolver(type(anchor).__name__)
    return resolver.get_children(anchor, request)
```

**Pros**:
- Familiar functional programming pattern
- Easy to parallelize
- No state management concerns

**Cons**:
- Must pass `request` to every method (`get_children`, recursion, etc.)
- Difficult to maintain state across calls (e.g., node counting for limits)
- Permission checks scattered throughout resolver logic
- Inconsistent with Django (Views, Serializers, ModelForms are classes)

### Option 2: Stateful Classes (✓ CHOSEN)
```python
# Usage: hierarchy = OrganisationResolver(request).resolve(anchor)
class BaseHierarchyResolver:
    def __init__(self, request):
        self.request = request

    def get_children(self, instance):
        # 'instance' and 'request' are available as self.instance, self.request
        pass
```

**Pros**:
- Request context is always available (`self.request.user` for permission checks)
- Consistent with Django ecosystem (Views, Serializers, ModelForms)
- State is managed cleanly (node count, depth) as instance variables
- Tests can inject mock request with specific user/permissions
- Flexible for future enhancements (caching, query optimization)

**Cons**:
- Slightly more boilerplate (must subclass, not just write function)
- Resolvers cannot be simple functions (not a limitation for this use case)

## Decision

**We chose Option 2: Stateful Classes**

All resolvers must:
1. Extend `BaseHierarchyResolver`
2. Receive `request` in `__init__` (provided by registry)
3. Implement `get_children(instance)` method
4. Return list of `HierarchyNode` objects

## Rationale

**Permission Context**:
- Search results must respect access control
- Permission checks typically require `request.user` and sometimes `request.session`
- Having request as `self.request` makes permission code clear and testable

**Django Consistency**:
- Views receive request in class
- Serializers can receive request via `context`
- ModelForms are classes that use request context
- Resolvers follow the same pattern

**State Management**:
- `BaseHierarchyResolver` tracks `_node_count` and `_current_depth`
- These limits must be enforced across recursive calls
- With stateless functions, this state would need to be threaded through parameters or stored globally (anti-pattern)

**Testability**:
```python
# Testing is clean and clear
request = RequestFactory().get('/')
request.user = User.objects.create_user('testuser')

resolver = OrganisationResolver(request)
nodes = resolver.get_children(organisation)
assert len(nodes) == expected_count
```

## Implementation Details

### Class Structure
```python
from search.hierarchy import BaseHierarchyResolver, HierarchyNode


class MyModelResolver(BaseHierarchyResolver):
    """Hierarchy resolver for MyModel."""

    def get_children(self, instance):
        """
        Return list of HierarchyNode for children of instance.

        Args:
            instance: The parent entity instance

        Returns:
            list[HierarchyNode]: Children to display in hierarchy
        """
        # 1. Check permissions
        if not self.request.user.has_perm('view', instance):
            return []

        # 2. Fetch children (optimized)
        children = instance.child_set.all()[: self._per_level_limit]

        # 3. Return nodes
        return [
            HierarchyNode(
                id=str(child.id),
                type=self.get_type_name(child),
                title=child.get_display_name(),
                url=child.get_absolute_url(),
                instance=child,  # Required for recursion
            )
            for child in children
        ]
```

### Registration
```python
# settings.py
SEARCH_HIERARCHY_RESOLVERS = {
    'myapp.MyModel': 'myapp.resolvers.MyModelResolver',
}
```

### Discovery & Instantiation
```python
# registry.py - Internal use only
resolver_class = get_resolver_class('myapp.MyModel')
resolver = resolver_class(request)  # Request is injected here
nodes = resolver.get_children(instance)
```

## Consequences

### Positive
✓ Permission checks are clear and always have access to `request.user`
✓ Consistent with Django's class-based design patterns
✓ State management (node counting, depth tracking) is clean
✓ Easy to test with mock requests and users
✓ Flexible for future features (caching, per-user limit overrides)
✓ Documentation and examples are straightforward

### Negative
✗ Slightly more code than a simple function (subclass + method vs just function)
✗ Developers must understand class-based pattern

## Alternatives Rejected

### Option 1: Stateless Functions
**Rejected Because:**
- Request must be passed through all method calls
- Node counting for limits would require global state or threading state through calls
- Permission checks would be harder to test

### Option 3: Functional with Closure
```python
def create_hierarchy_resolver(request):
    def get_children(instance):
        # Uses request from closure
        pass
    return get_children
```
**Rejected Because:**
- Still requires functional programming mindset (less consistent with Django)
- Harder to test (can't easily swap out request/user)
- Less readable than explicit `self.request`

## Related Decisions

- **ADR 045-02**: Fail-safe error handling for hierarchy generation
- **Feature 045**: Hierarchical Search Navigation specification

## Learning Resources

- [Django Class-Based Views](https://docs.djangoproject.com/en/stable/topics/class-based-views/)
- [Django Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [Python Design Patterns: Strategy](https://refactoring.guru/design-patterns/strategy)
