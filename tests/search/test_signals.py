import pytest
from unittest.mock import patch


@pytest.mark.django_db
def test_handle_save_indexes_synchronously_on_commit():
    """Test that handle_save schedules indexing via transaction.on_commit for registered models."""
    from search import signals
    from projects.models import Project
    import os

    instance = Project(name="Test", slug="test")
    instance.pk = 123
    instance.id = 123

    # Ensure SEARCH_INDEX_DISABLE_SIGNALS is not set
    old_val = os.environ.get("SEARCH_INDEX_DISABLE_SIGNALS")
    if old_val:
        del os.environ["SEARCH_INDEX_DISABLE_SIGNALS"]

    try:
        with (
            patch("search.signals.transaction.on_commit") as mock_on_commit,
            patch("search.signals.PostgresSearchBackend") as mock_backend,
            patch("search.signals.search_registry.get_registered_models") as mock_get_models,
        ):
            # Make Project appear registered
            mock_get_models.return_value = {Project}

            # Call the signal handler
            signals.handle_save(Project, instance)

            # Verify on_commit was called
            assert (
                mock_on_commit.called
            ), "transaction.on_commit should be called for registered models"

            # Execute the callback
            callback = mock_on_commit.call_args[0][0]
            callback()

            # Verify backend.update_entry was called
            mock_backend.return_value.update_entry.assert_called_once_with(instance)
    finally:
        if old_val:
            os.environ["SEARCH_INDEX_DISABLE_SIGNALS"] = old_val


@pytest.mark.django_db
def test_handle_delete_deletes_synchronously_on_commit():
    """Test that handle_delete schedules deletion via transaction.on_commit for registered models."""
    from search import signals
    from projects.models import Project
    import os

    instance = Project(name="Test", slug="test")
    instance.pk = 123
    instance.id = 123

    # Ensure SEARCH_INDEX_DISABLE_SIGNALS is not set
    old_val = os.environ.get("SEARCH_INDEX_DISABLE_SIGNALS")
    if old_val:
        del os.environ["SEARCH_INDEX_DISABLE_SIGNALS"]

    try:
        with (
            patch("search.signals.transaction.on_commit") as mock_on_commit,
            patch("search.signals.PostgresSearchBackend") as mock_backend,
            patch("search.signals.search_registry.get_registered_models") as mock_get_models,
        ):
            # Make Project appear registered
            mock_get_models.return_value = {Project}

            # Call the signal handler
            signals.handle_delete(Project, instance)

            # Verify on_commit was called
            assert (
                mock_on_commit.called
            ), "transaction.on_commit should be called for registered models"

            # Execute the callback
            callback = mock_on_commit.call_args[0][0]
            callback()

            # Verify backend.delete_entry was called
            mock_backend.return_value.delete_entry.assert_called_once_with(instance)
    finally:
        if old_val:
            os.environ["SEARCH_INDEX_DISABLE_SIGNALS"] = old_val
