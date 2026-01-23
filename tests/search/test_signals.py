import pytest
from unittest.mock import MagicMock, patch


@pytest.mark.unit
def test_handle_save_indexes_synchronously_on_commit():
    from search import signals

    sender = MagicMock(__name__="Project")
    instance = MagicMock(pk="123")

    with (
        patch("search.signals.search_registry") as mock_registry,
        patch("search.signals.ContentType") as mock_ct,
        patch("search.signals.transaction") as mock_tx,
        patch("search.signals.PostgresSearchBackend") as mock_backend,
    ):
        mock_registry.get_registered_models.return_value = {sender}
        mock_ct.objects.get_for_model.return_value = MagicMock(id=1)

        # Execute on_commit callbacks immediately
        mock_tx.on_commit.side_effect = lambda fn: fn()

        signals.handle_save(sender, instance)

        mock_backend.return_value.update_entry.assert_called_once_with(instance)


@pytest.mark.unit
def test_handle_delete_deletes_synchronously_on_commit():
    from search import signals

    sender = MagicMock(__name__="Project")
    instance = MagicMock(pk="123")

    with (
        patch("search.signals.search_registry") as mock_registry,
        patch("search.signals.ContentType") as mock_ct,
        patch("search.signals.transaction") as mock_tx,
        patch("search.signals.PostgresSearchBackend") as mock_backend,
    ):
        mock_registry.get_registered_models.return_value = {sender}
        mock_ct.objects.get_for_model.return_value = MagicMock(id=1)
        mock_tx.on_commit.side_effect = lambda fn: fn()

        signals.handle_delete(sender, instance)

        mock_backend.return_value.delete_entry.assert_called_once_with(instance)
