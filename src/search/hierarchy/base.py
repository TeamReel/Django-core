"""Base hierarchy resolver for entity-centric navigation."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from django.conf import settings

if TYPE_CHECKING:
    from django.http import HttpRequest

    from .nodes import HierarchyNode

logger = logging.getLogger(__name__)


class BaseHierarchyResolver(ABC):
    """
    Abstract base class for hierarchy resolvers.

    Resolvers are stateful and initialized with the current request
    to enable permission checks and context access.

    Subclasses must implement:
    - get_children(instance): Return list of HierarchyNode for the instance

    Usage:
        class ProjectResolver(BaseHierarchyResolver):
            def get_children(self, instance):
                # Return children visible to self.user
                return [...]

        resolver = ProjectResolver(request)
        tree = resolver.build_tree(project_instance)
    """

    def __init__(self, request: HttpRequest) -> None:
        """
        Initialize resolver with request context.

        Args:
            request: Django HttpRequest object for permission/context access
        """
        self.request = request
        self.user = request.user
        self._node_count = 0
        self._max_depth = getattr(settings, "SEARCH_HIERARCHY_MAX_DEPTH", 3)
        self._max_nodes = getattr(settings, "SEARCH_HIERARCHY_MAX_NODES", 100)
        self._per_level_limit = getattr(settings, "SEARCH_HIERARCHY_PER_LEVEL_LIMIT", 5)

    @abstractmethod
    def get_children(self, instance: Any) -> list[HierarchyNode]:
        """
        Get child nodes for the given instance.

        Implementations must:
        - Filter children based on user permissions (use self.user)
        - Return HierarchyNode instances
        - Keep queries efficient (use select_related/prefetch_related)
        - Respect self._per_level_limit (limit queryset results)

        Example:
            def get_children(self, instance):
                children = instance.children.filter(visible=True)[:self._per_level_limit]
                return [
                    HierarchyNode(
                        id=str(child.id),
                        type='child_type',
                        title=child.name,
                        url=child.get_absolute_url(),
                        instance=child
                    )
                    for child in children
                ]

        Args:
            instance: The parent entity instance

        Returns:
            List of HierarchyNode objects representing children
        """
        raise NotImplementedError

    def build_tree(self, instance: Any, current_depth: int = 0) -> list[HierarchyNode]:
        """
        Build hierarchy tree with depth and node count guards.

        Guards:
        - Depth limit: Stops at SEARCH_HIERARCHY_MAX_DEPTH
        - Node count: Stops at SEARCH_HIERARCHY_MAX_NODES
        - Truncates gracefully when limits are reached

        Args:
            instance: The root entity instance
            current_depth: Current recursion depth (internal use)

        Returns:
            List of HierarchyNode objects with populated children
        """
        # Guard: Check depth limit
        if current_depth >= self._max_depth:
            logger.info(f"Hierarchy depth limit reached: {current_depth}")
            return []

        # Guard: Check node count limit
        if self._node_count >= self._max_nodes:
            logger.info(f"Hierarchy node limit reached: {self._node_count}")
            return []

        # Get children from implementation
        children = self.get_children(instance)
        self._node_count += len(children)

        # Guard: Recheck node count after adding children
        if self._node_count > self._max_nodes:
            # Truncate to stay within limit
            allowed_count = self._max_nodes - (self._node_count - len(children))
            logger.info(
                f"Hierarchy node limit exceeded, truncating from {len(children)} "
                f"to {allowed_count} children"
            )
            children = children[:allowed_count]

        # Recursively build subtrees
        for child_node in children:
            if hasattr(child_node, "instance") and child_node.instance is not None:
                child_node.children = self.build_tree(child_node.instance, current_depth + 1)

        return children
