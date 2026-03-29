"""Tests for BaseHierarchyResolver."""
import pytest
from django.conf import settings as django_settings
from django.test import RequestFactory
from search.hierarchy.base import BaseHierarchyResolver
from search.hierarchy.nodes import HierarchyNode


class DummyResolver(BaseHierarchyResolver):
    """Test resolver implementation."""

    def get_children(self, instance):
        """Return mock children."""
        if not hasattr(instance, "children_data"):
            return []

        # Respect per-level limit
        children_data = instance.children_data[: self._per_level_limit]

        return [
            HierarchyNode(
                id=str(child["id"]),
                type=child["type"],
                title=child["title"],
                instance=child,
            )
            for child in children_data
        ]


@pytest.fixture
def mock_request():
    """Create mock request."""
    factory = RequestFactory()
    request = factory.get("/")
    request.user = None  # Or create a mock user
    return request


@pytest.mark.django_db
class TestBaseHierarchyResolver:
    """Tests for BaseHierarchyResolver."""

    def test_resolver_initialization(self, mock_request):
        """Test resolver can be initialized with request."""
        resolver = DummyResolver(mock_request)
        assert resolver.request == mock_request
        assert resolver._max_depth == django_settings.SEARCH_HIERARCHY_MAX_DEPTH
        assert resolver._max_nodes == django_settings.SEARCH_HIERARCHY_MAX_NODES

    def test_depth_limit(self, mock_request):
        """Test recursion stops at max depth."""
        # Create deeply nested structure - each level must have children_data attribute
        # Level 4 (deepest - will be truncated)
        level4 = type("obj", (), {"children_data": [{"id": 5, "type": "level5", "title": "L5"}]})()

        # Level 3 (max depth - children should be empty due to depth limit)
        level3 = type("obj", (), {"children_data": [{"id": 4, "type": "level4", "title": "L4"}]})()

        # Level 2 (should have level 3 children)
        level2 = type("obj", (), {"children_data": [{"id": 3, "type": "level3", "title": "L3"}]})()

        # Level 1 (should have level 2 children)
        level1 = type("obj", (), {"children_data": [{"id": 2, "type": "level2", "title": "L2"}]})()

        # Root (depth 0)
        root = type("obj", (), {"children_data": [{"id": 1, "type": "level1", "title": "L1"}]})()

        # Override get_children to return instances for recursion
        _original_get_children = DummyResolver.get_children
        instances = {1: level1, 2: level2, 3: level3, 4: level4}

        def mock_get_children(self, instance):
            # Call original to get HierarchyNode list
            nodes = _original_get_children(self, instance)
            # Inject proper instance objects for recursion
            for node in nodes:
                if int(node.id) in instances:
                    node.instance = instances[int(node.id)]
            return nodes

        resolver = DummyResolver(mock_request)
        resolver.get_children = lambda inst: mock_get_children(resolver, inst)
        tree = resolver.build_tree(root)

        # build_tree returns children of root (depth 0)
        # Should have 1 child at level 1
        assert len(tree) == 1
        # Should have 1 grandchild at level 2
        assert len(tree[0].children) == 1
        # Should have 1 great-grandchild at level 3 (max depth reached)
        assert len(tree[0].children[0].children) == 1
        # Should NOT have children at level 4 (beyond max depth of 3)
        assert len(tree[0].children[0].children[0].children) == 0

    def test_node_count_limit(self, mock_request, settings):
        """Test tree stops at max node count."""
        settings.SEARCH_HIERARCHY_MAX_NODES = 5

        # Create wide tree with many children
        root = type(
            "obj",
            (),
            {
                "children_data": [
                    {"id": i, "type": "child", "title": f"Child {i}", "children_data": []}
                    for i in range(10)
                ]
            },
        )()

        resolver = DummyResolver(mock_request)
        tree = resolver.build_tree(root)

        # Should truncate to 5 nodes
        assert len(tree) <= 5

    def test_per_level_limit(self, mock_request, settings):
        """Test children are limited per level."""
        settings.SEARCH_HIERARCHY_PER_LEVEL_LIMIT = 3

        # Create node with many children
        root = type(
            "obj",
            (),
            {
                "children_data": [
                    {"id": i, "type": "child", "title": f"Child {i}", "children_data": []}
                    for i in range(10)
                ]
            },
        )()

        resolver = DummyResolver(mock_request)
        tree = resolver.build_tree(root)

        # Should limit to 3 children per level
        assert len(tree) == 3

    def test_empty_children(self, mock_request):
        """Test resolver handles nodes with no children."""
        root = type("obj", (), {"children_data": []})()

        resolver = DummyResolver(mock_request)
        tree = resolver.build_tree(root)

        assert len(tree) == 0

    def test_abstract_method_must_be_implemented(self, mock_request):
        """Test that get_children must be implemented."""
        # Attempting to instantiate without implementing get_children should fail
        with pytest.raises(TypeError, match="Can't instantiate abstract class"):

            class IncompleteResolver(BaseHierarchyResolver):
                pass

            IncompleteResolver(mock_request)
