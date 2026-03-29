"""Performance benchmark tests for hierarchy generation."""
import time
from unittest.mock import Mock

import pytest
from django.test import RequestFactory
from search.hierarchy.base import BaseHierarchyResolver
from search.hierarchy.nodes import HierarchyNode


class BenchmarkResolver(BaseHierarchyResolver):
    """Resolver for performance testing."""

    def get_children(self, instance):
        """Return mock children."""
        if not hasattr(instance, "children_data"):
            return []
        return [
            HierarchyNode(
                id=str(child["id"]),
                type=child["type"],
                title=child["title"],
                instance=child,
            )
            for child in instance.children_data
        ]


@pytest.fixture
def mock_request():
    """Create mock request."""
    factory = RequestFactory()
    request = factory.get("/")
    request.user = None
    return request


@pytest.mark.django_db
class TestHierarchyPerformance:
    """Performance tests for hierarchy generation."""

    def test_build_tree_with_100_nodes_under_50ms(self, mock_request):
        """Test that building a tree with 100 nodes takes < 50ms."""

        # Create a wide tree with 100 nodes
        children = [
            {"id": i, "type": "node", "title": f"Node {i}", "children_data": []} for i in range(100)
        ]
        root = type("obj", (), {"children_data": children})()

        resolver = BenchmarkResolver(mock_request)

        # Measure time
        start_time = time.time()
        tree = resolver.build_tree(root)
        elapsed_ms = (time.time() - start_time) * 1000

        # Verify results
        assert len(tree) > 0
        # Should complete in under 50ms (adjust based on actual performance)
        assert elapsed_ms < 50, f"Build tree took {elapsed_ms:.2f}ms, expected < 50ms"

    def test_deep_tree_performance(self, mock_request, settings):
        """Test performance with maximum depth tree."""
        settings.SEARCH_HIERARCHY_MAX_DEPTH = 10

        # Create deeply nested structure
        def create_nested(depth, max_depth):
            if depth >= max_depth:
                return []
            return [
                {
                    "id": depth,
                    "type": f"level{depth}",
                    "title": f"Level {depth}",
                    "children_data": create_nested(depth + 1, max_depth),
                }
            ]

        root_data = create_nested(0, 10)
        root = type("obj", (), {"children_data": root_data})()

        resolver = BenchmarkResolver(mock_request)

        # Measure time
        start_time = time.time()
        tree = resolver.build_tree(root)
        elapsed_ms = (time.time() - start_time) * 1000

        # Should complete quickly even with deep nesting
        assert elapsed_ms < 100, f"Deep tree took {elapsed_ms:.2f}ms, expected < 100ms"

    def test_serialization_performance(self, mock_request):
        """Test serialization performance."""
        from search.hierarchy.serializers import HierarchyNodeSerializer

        # Create a tree with many nodes
        def create_tree(depth, breadth):
            if depth == 0:
                return []
            return [
                HierarchyNode(
                    id=f"{depth}-{i}",
                    type=f"type{depth}",
                    title=f"Node {depth}-{i}",
                    children=create_tree(depth - 1, breadth),
                )
                for i in range(breadth)
            ]

        # Create tree: 3 levels deep, 5 nodes per level = 155 nodes total
        nodes = create_tree(3, 5)

        # Measure serialization time
        start_time = time.time()
        serializer = HierarchyNodeSerializer(nodes, many=True)
        data = serializer.data
        elapsed_ms = (time.time() - start_time) * 1000

        # Verify data
        assert len(data) > 0

        # Serialization should be fast
        assert elapsed_ms < 100, f"Serialization took {elapsed_ms:.2f}ms, expected < 100ms"

    def test_anchor_selection_performance(self):
        """Test anchor selection performance with many results."""
        from django.test import RequestFactory
        from search.api.views import SearchAPIView

        view = SearchAPIView()
        factory = RequestFactory()
        request = factory.get("/api/search/?q=test")
        request.user = None

        # Create 100 mock search entries
        entries = []
        for i in range(100):
            mock_obj = Mock()
            mock_obj.pk = i
            mock_obj.title = f"Entry {i}"

            mock_entry = Mock()
            mock_entry.content_type.app_label = "projects"
            mock_entry.content_type.model = "project"
            mock_entry.content_object = mock_obj
            mock_entry.rank = 1.0 - (i * 0.01)

            entries.append(mock_entry)

        # Configure settings
        from django.conf import settings

        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        # Measure selection time
        start_time = time.time()
        instance, anchor_data = view.select_hierarchy_anchor(entries, request)
        elapsed_ms = (time.time() - start_time) * 1000

        # Should be very fast (only processes top 3)
        assert elapsed_ms < 10, f"Anchor selection took {elapsed_ms:.2f}ms, expected < 10ms"
