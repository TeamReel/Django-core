"""Tests for anchor selection logic."""
from unittest.mock import Mock

import pytest
from django.test import RequestFactory
from search.api.views import SearchAPIView


@pytest.fixture
def search_view():
    """Create SearchAPIView instance."""
    return SearchAPIView()


@pytest.fixture
def mock_request():
    """Create mock request."""
    factory = RequestFactory()
    request = factory.get("/api/search/?q=test")
    request.user = None
    return request


class TestAnchorSelection:
    """Tests for anchor selection logic."""

    def test_anchor_selection_no_anchor_types_configured(self, search_view, mock_request, settings):
        """Test anchor selection returns None when no types configured."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = []

        entries = [Mock()]  # Mock search entries
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        assert instance is None
        assert anchor_data is None

    def test_anchor_selection_no_matching_entries(self, search_view, mock_request, settings):
        """Test anchor selection returns None when no entries match anchor types."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        # Create mock entry with different type
        mock_entry = Mock()
        mock_entry.content_type.app_label = "accounts"
        mock_entry.content_type.model = "user"

        entries = [mock_entry]
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        assert instance is None
        assert anchor_data is None

    def test_anchor_selection_exact_match_priority(self, search_view, mock_request, settings):
        """Test exact title match is prioritized."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        # Create mock entries
        mock_obj1 = Mock()
        mock_obj1.pk = 1
        mock_obj1.title = "Different Title"

        mock_obj2 = Mock()
        mock_obj2.pk = 2
        mock_obj2.title = "test"  # Exact match with query

        mock_entry1 = Mock()
        mock_entry1.content_type.app_label = "projects"
        mock_entry1.content_type.model = "project"
        mock_entry1.content_object = mock_obj1
        mock_entry1.rank = 0.9

        mock_entry2 = Mock()
        mock_entry2.content_type.app_label = "projects"
        mock_entry2.content_type.model = "project"
        mock_entry2.content_object = mock_obj2
        mock_entry2.rank = 0.7

        entries = [mock_entry1, mock_entry2]
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        # Should select entry2 due to exact match despite lower rank
        assert instance == mock_obj2
        assert anchor_data["id"] == "2"
        assert anchor_data["title"] == "test"

    def test_anchor_selection_type_priority(self, search_view, mock_request, settings):
        """Test type order in settings determines priority."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = [
            "projects.project",  # Higher priority
            "activities.activity",  # Lower priority
        ]

        # Create mock entries - activity appears first but project has higher type priority
        mock_activity = Mock()
        mock_activity.pk = 1
        mock_activity.title = "Activity"

        mock_project = Mock()
        mock_project.pk = 2
        mock_project.title = "Project"

        mock_entry1 = Mock()
        mock_entry1.content_type.app_label = "activities"
        mock_entry1.content_type.model = "activity"
        mock_entry1.content_object = mock_activity
        mock_entry1.rank = 0.9

        mock_entry2 = Mock()
        mock_entry2.content_type.app_label = "projects"
        mock_entry2.content_type.model = "project"
        mock_entry2.content_object = mock_project
        mock_entry2.rank = 0.8

        entries = [mock_entry1, mock_entry2]
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        # Should select project due to higher type priority
        assert instance == mock_project
        assert anchor_data["type"] == "projects.project"

    def test_anchor_selection_rank_order_fallback(self, search_view, mock_request, settings):
        """Test rank order is used when no exact match and same type."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        # Create mock entries with same type
        mock_obj1 = Mock()
        mock_obj1.pk = 1
        mock_obj1.title = "First Project"

        mock_obj2 = Mock()
        mock_obj2.pk = 2
        mock_obj2.title = "Second Project"

        mock_entry1 = Mock()
        mock_entry1.content_type.app_label = "projects"
        mock_entry1.content_type.model = "project"
        mock_entry1.content_object = mock_obj1
        mock_entry1.rank = 0.9

        mock_entry2 = Mock()
        mock_entry2.content_type.app_label = "projects"
        mock_entry2.content_type.model = "project"
        mock_entry2.content_object = mock_obj2
        mock_entry2.rank = 0.7

        entries = [mock_entry1, mock_entry2]
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        # Should select first entry (higher rank)
        assert instance == mock_obj1

    def test_anchor_selection_top_3_only(self, search_view, mock_request, settings):
        """Test only top 3 results are considered."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        # Create 5 mock entries, with perfect match at position 4
        entries = []
        for i in range(5):
            mock_obj = Mock()
            mock_obj.pk = i
            mock_obj.title = "test" if i == 3 else f"Project {i}"

            mock_entry = Mock()
            mock_entry.content_type.app_label = "projects"
            mock_entry.content_type.model = "project"
            mock_entry.content_object = mock_obj

            entries.append(mock_entry)

        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        # Should select from first 3 only, not the exact match at position 4
        assert instance.pk in [0, 1, 2]

    def test_anchor_selection_handles_missing_title(self, search_view, mock_request, settings):
        """Test anchor selection handles objects without title attribute."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        mock_obj = Mock(spec=[])  # No title attribute
        mock_obj.pk = 1
        mock_obj.name = "Has name instead"

        mock_entry = Mock()
        mock_entry.content_type.app_label = "projects"
        mock_entry.content_type.model = "project"
        mock_entry.content_object = mock_obj

        entries = [mock_entry]
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        # Should still work, using name or str()
        assert instance is not None
        assert anchor_data is not None

    def test_anchor_selection_handles_null_content_object(
        self, search_view, mock_request, settings
    ):
        """Test anchor selection skips entries with null content_object."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = ["projects.project"]

        mock_entry = Mock()
        mock_entry.content_type.app_label = "projects"
        mock_entry.content_type.model = "project"
        mock_entry.content_object = None

        entries = [mock_entry]
        instance, anchor_data = search_view.select_hierarchy_anchor(entries, mock_request)

        assert instance is None
        assert anchor_data is None
