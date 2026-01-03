import pytest
from unittest.mock import patch, MagicMock

from search.backend.postgres import PostgresSearchBackend
from search.tasks import update_search_index, delete_search_index
from search.registry import SearchIndex


# Mock models for testing
class MockModel:
    pk = 1
    _meta = MagicMock()
    _meta.label = "app.MockModel"


class MockIndex(SearchIndex):
    model = MockModel

    def get_body_text(self, obj):
        return "Mock Body Text"

    def get_title(self, obj):
        return "Mock Title"


@pytest.mark.unit
def test_backend_update_entry():
    # Mock dependencies
    with (
        patch("search.backend.postgres.search_registry") as mock_registry,
        patch("search.backend.postgres.ContentType") as mock_ct,
        patch("search.backend.postgres.SearchEntry") as mock_entry,
        patch("search.backend.postgres.transaction"),
        patch("search.backend.postgres.connection") as mock_connection,
    ):
        mock_registry.get_index.return_value = MockIndex()
        mock_ct.objects.get_for_model.return_value = MagicMock(id=1)
        mock_entry_instance = MagicMock()
        mock_entry.objects.update_or_create.return_value = (mock_entry_instance, True)
        mock_connection.vendor = "postgresql"  # Enable vector update path

        backend = PostgresSearchBackend()
        obj = MockModel()

        backend.update_entry(obj)

        mock_entry.objects.update_or_create.assert_called_once()
        mock_entry.objects.filter.assert_called_with(pk=mock_entry_instance.pk)
        mock_entry.objects.filter.return_value.update.assert_called_once()


@pytest.mark.unit
def test_backend_delete_entry():
    with (
        patch("search.backend.postgres.ContentType") as mock_ct,
        patch("search.backend.postgres.SearchEntry") as mock_entry,
    ):
        mock_ct.objects.get_for_model.return_value = MagicMock(id=1)

        backend = PostgresSearchBackend()
        obj = MockModel()

        backend.delete_entry(obj)

        mock_entry.objects.filter.assert_called_once()
        mock_entry.objects.filter.return_value.delete.assert_called_once()


@pytest.mark.unit
def test_task_update_search_index():
    with (
        patch("search.tasks.ContentType") as mock_ct,
        patch("search.tasks.PostgresSearchBackend") as mock_backend,
    ):
        mock_model_class = MagicMock()
        mock_ct.objects.get.return_value.model_class.return_value = mock_model_class
        mock_model_class.objects.get.return_value = MockModel()

        update_search_index(1, 1)

        mock_backend.return_value.update_entry.assert_called_once()


@pytest.mark.unit
def test_task_delete_search_index():
    with patch("search.models.SearchEntry") as mock_entry:
        delete_search_index(1, 1)
        mock_entry.objects.filter.assert_called_once()
        mock_entry.objects.filter.return_value.delete.assert_called_once()
