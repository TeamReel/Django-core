"""Tests for hierarchy serializers."""
from search.hierarchy.nodes import HierarchyNode
from search.hierarchy.serializers import HierarchyAnchorSerializer, HierarchyNodeSerializer


class TestHierarchyNodeSerializer:
    """Tests for HierarchyNodeSerializer."""

    def test_node_serializer_basic(self):
        """Test serializing a simple node."""
        node = HierarchyNode(id="123", type="TestType", title="Test Title")

        serializer = HierarchyNodeSerializer(node)
        data = serializer.data

        assert data["id"] == "123"
        assert data["type"] == "TestType"
        assert data["title"] == "Test Title"
        assert "url" not in data  # Optional field omitted when None

    def test_node_serializer_with_optional_fields(self):
        """Test serializing node with all fields."""
        node = HierarchyNode(
            id="123",
            type="TestType",
            title="Test Title",
            url="/test/123/",
            description="Test Description",
        )

        serializer = HierarchyNodeSerializer(node)
        data = serializer.data

        assert data["id"] == "123"
        assert data["type"] == "TestType"
        assert data["title"] == "Test Title"
        assert data["url"] == "/test/123/"
        assert data["description"] == "Test Description"

    def test_node_serializer_recursive(self):
        """Test serializing node with children."""
        child1 = HierarchyNode(id="2", type="Child", title="Child 1")
        child2 = HierarchyNode(id="3", type="Child", title="Child 2")
        parent = HierarchyNode(id="1", type="Parent", title="Parent", children=[child1, child2])

        serializer = HierarchyNodeSerializer(parent)
        data = serializer.data

        assert data["id"] == "1"
        assert len(data["children"]) == 2
        assert data["children"][0]["id"] == "2"
        assert data["children"][1]["id"] == "3"

    def test_node_serializer_deep_nesting(self):
        """Test serializing deeply nested nodes."""
        level3 = HierarchyNode(id="3", type="Level3", title="L3")
        level2 = HierarchyNode(id="2", type="Level2", title="L2", children=[level3])
        level1 = HierarchyNode(id="1", type="Level1", title="L1", children=[level2])

        serializer = HierarchyNodeSerializer(level1)
        data = serializer.data

        assert data["id"] == "1"
        assert data["children"][0]["id"] == "2"
        assert data["children"][0]["children"][0]["id"] == "3"

    def test_node_serializer_many(self):
        """Test serializing multiple nodes."""
        nodes = [
            HierarchyNode(id="1", type="Type1", title="Node 1"),
            HierarchyNode(id="2", type="Type2", title="Node 2"),
        ]

        serializer = HierarchyNodeSerializer(nodes, many=True)
        data = serializer.data

        assert len(data) == 2
        assert data[0]["id"] == "1"
        assert data[1]["id"] == "2"


class TestHierarchyAnchorSerializer:
    """Tests for HierarchyAnchorSerializer."""

    def test_anchor_serializer_dict_input(self):
        """Test serializing anchor from dict."""
        anchor_data = {
            "id": "123",
            "type": "projects.Project",
            "title": "Test Project",
            "url": "/projects/123/",
            "score": 0.95,
        }

        serializer = HierarchyAnchorSerializer(anchor_data)
        data = serializer.data

        assert data["id"] == "123"
        assert data["type"] == "projects.Project"
        assert data["title"] == "Test Project"
        assert data["url"] == "/projects/123/"
        assert data["score"] == 0.95

    def test_anchor_serializer_required_fields_only(self):
        """Test anchor with only required fields."""
        anchor_data = {
            "id": "123",
            "type": "projects.Project",
            "title": "Test Project",
        }

        serializer = HierarchyAnchorSerializer(anchor_data)
        data = serializer.data

        assert data["id"] == "123"
        assert data["type"] == "projects.Project"
        assert data["title"] == "Test Project"
        assert "url" not in data  # Optional
        assert "score" not in data  # Optional

    def test_anchor_serializer_object_input(self):
        """Test serializing anchor from object."""

        class MockAnchor:
            id = "456"
            type = "activities.Activity"
            title = "Test Activity"
            url = "/activities/456/"
            score = 0.88

        anchor = MockAnchor()
        serializer = HierarchyAnchorSerializer(anchor)
        data = serializer.data

        assert data["id"] == "456"
        assert data["type"] == "activities.Activity"
        assert data["title"] == "Test Activity"
        assert data["url"] == "/activities/456/"
        assert data["score"] == 0.88

    def test_anchor_serializer_validation_missing_id(self):
        """Test validation fails when id is missing."""
        anchor_data = {
            "type": "projects.Project",
            "title": "Test Project",
        }

        serializer = HierarchyAnchorSerializer(data=anchor_data)
        assert not serializer.is_valid()
        assert "id" in serializer.errors

    def test_anchor_serializer_validation_missing_type(self):
        """Test validation fails when type is missing."""
        anchor_data = {
            "id": "123",
            "title": "Test Project",
        }

        serializer = HierarchyAnchorSerializer(data=anchor_data)
        assert not serializer.is_valid()
        assert "type" in serializer.errors

    def test_anchor_serializer_validation_missing_title(self):
        """Test validation fails when title is missing."""
        anchor_data = {
            "id": "123",
            "type": "projects.Project",
        }

        serializer = HierarchyAnchorSerializer(data=anchor_data)
        assert not serializer.is_valid()
        assert "title" in serializer.errors
