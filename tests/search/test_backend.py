from unittest.mock import MagicMock, patch
from django.db import connection
from search.backend.postgres import PostgresSearchBackend
from search.utils import sanitize_query


# Pure unit tests for utility function
def test_sanitize_query():
    assert sanitize_query("hello world") == "hello world"
    assert sanitize_query('hello "world"') == 'hello "world"'
    assert sanitize_query('hello "world') == 'hello "world"'  # Unbalanced
    assert sanitize_query("hello OR") == "hello"  # Trailing OR
    assert sanitize_query("AND hello") == "hello"  # Leading AND
    assert sanitize_query("   ") == ""
    assert sanitize_query(None) == ""
    assert sanitize_query("OR") == ""


class TestSearchBackend:
    def setup_method(self):
        self.backend = PostgresSearchBackend()
        self.user = MagicMock()
        self.user.is_superuser = False

    @patch("search.backend.postgres.SearchEntry")
    @patch("search.backend.postgres.SearchQuery")
    @patch("search.backend.postgres.SearchRank")
    @patch("search.backend.postgres.search_registry")
    @patch("search.backend.postgres.ContentType")
    def test_search_basic(self, mock_ct, mock_registry, mock_rank, mock_query, mock_entry_model):
        # Setup mocks
        mock_qs = MagicMock()
        mock_entry_model.objects.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.annotate.return_value = mock_qs
        mock_qs.order_by.return_value = mock_qs

        # Mock registry to return no models (simplest case)
        mock_registry.get_registered_models.return_value = []

        # Execute
        results = self.backend.search("test query", self.user)

        # Verify
        mock_entry_model.objects.all.assert_called_once()
        # Backend builds a prefix query and uses raw search_type for partial matching
        mock_query.assert_called_with("test:* & query:*", search_type="raw")
        # Should filter by search vector
        assert mock_qs.filter.call_count >= 1
        if connection.vendor == "postgresql":
            # Should annotate rank
            mock_qs.annotate.assert_called_once()
            # Should order by rank
            mock_qs.order_by.assert_called_with("-rank")
        else:
            # SQLite fallback does not annotate rank
            mock_qs.annotate.assert_not_called()
            mock_qs.order_by.assert_called_with("-last_updated")

    @patch("search.backend.postgres.SearchEntry")
    @patch("search.backend.postgres.SearchQuery")
    @patch("search.backend.postgres.SearchRank")
    @patch("search.backend.postgres.search_registry")
    @patch("search.backend.postgres.ContentType")
    def test_permission_filtering(
        self, mock_ct, mock_registry, mock_rank, mock_query, mock_entry_model
    ):
        # Setup mocks
        mock_qs = MagicMock()
        mock_entry_model.objects.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.annotate.return_value = mock_qs
        mock_qs.order_by.return_value = mock_qs

        # Mock a registered model
        mock_model = MagicMock()
        mock_registry.get_registered_models.return_value = [mock_model]

        # Mock index
        mock_index = MagicMock()
        mock_registry.get_index.return_value = mock_index
        mock_index.get_visible_ids.return_value = [1, 2, 3]

        # Mock ContentType
        mock_ct_obj = MagicMock()
        mock_ct.objects.get_for_model.return_value = mock_ct_obj

        # Execute
        self.backend.search("test", self.user)

        # Verify permission filter was constructed
        # We can't easily check the exact Q object structure with mocks,
        # but we can check that get_visible_ids was called
        mock_index.get_visible_ids.assert_called_with(self.user)
        mock_ct.objects.get_for_model.assert_called_with(mock_model)

        # Verify filter was called (at least twice: once for permissions, once for vector)
        assert mock_qs.filter.call_count >= 2

    @patch("search.backend.postgres.SearchEntry")
    @patch("search.backend.postgres.SearchQuery")
    @patch("search.backend.postgres.SearchRank")
    @patch("search.backend.postgres.search_registry")
    @patch("search.backend.postgres.ContentType")
    def test_superuser_permissions(
        self, mock_ct, mock_registry, mock_rank, mock_query, mock_entry_model
    ):
        # Setup mocks
        mock_qs = MagicMock()
        mock_entry_model.objects.all.return_value = mock_qs
        mock_qs.filter.return_value = mock_qs
        mock_qs.annotate.return_value = mock_qs
        mock_qs.order_by.return_value = mock_qs

        self.user.is_superuser = True

        # Execute
        self.backend.search("test", self.user)

        # Verify registry was NOT queried for permissions
        mock_registry.get_registered_models.assert_not_called()

    @patch("search.backend.postgres.SearchEntry")
    @patch("search.backend.postgres.SearchQuery")
    @patch("search.backend.postgres.SearchRank")
    @patch("search.backend.postgres.search_registry")
    @patch("search.backend.postgres.ContentType")
    def test_invalid_query(self, mock_ct, mock_registry, mock_rank, mock_query, mock_entry_model):
        # Execute with empty query
        results = self.backend.search("   ", self.user)

        # Verify returns none
        mock_entry_model.objects.none.assert_called_once()
