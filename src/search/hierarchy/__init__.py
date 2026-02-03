"""
Hierarchical search navigation extension.

Provides pluggable resolvers to generate entity-centric navigation trees
from global search results.

Core Components:
- BaseHierarchyResolver: Abstract base class for hierarchy resolvers
- HierarchyNode: Data structure for tree nodes
- Registry: Dynamic resolver loading from settings
- Serializers: DRF serializers for API responses

Usage:
    # Product apps register resolvers in settings:
    SEARCH_HIERARCHY_RESOLVERS = {
        'projects.project': 'myapp.resolvers.ProjectResolver'
    }

    # Get resolver and build tree:
    from search.hierarchy import get_resolver
    resolver = get_resolver(instance, request)
    if resolver:
        tree = resolver.build_tree(instance)

    # Serialize for API response:
    from search.hierarchy import HierarchyNodeSerializer
    serializer = HierarchyNodeSerializer(tree, many=True)
    return Response(serializer.data)

See: kitty-specs/045-hierarchical-search-navigation/spec.md
"""

from .base import BaseHierarchyResolver
from .nodes import HierarchyNode
from .registry import get_resolver, get_resolver_class
from .serializers import HierarchyAnchorSerializer, HierarchyNodeSerializer

__all__ = [
    "BaseHierarchyResolver",
    "HierarchyNode",
    "get_resolver",
    "get_resolver_class",
    "HierarchyNodeSerializer",
    "HierarchyAnchorSerializer",
]
