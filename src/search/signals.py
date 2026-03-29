import logging
import os

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from search.backend.postgres import PostgresSearchBackend
from search.registry import search_registry
from search.tasks import delete_search_index, update_search_index

logger = logging.getLogger(__name__)


def handle_save(sender, instance, **_kwargs):
    """
    Signal handler to trigger search index update on save.

    Gracefully handles Redis/Celery connection errors during bulk operations.
    """
    if str(os.environ.get("SEARCH_INDEX_DISABLE_SIGNALS", "")).lower() in {"1", "true", "yes"}:
        return

    if sender not in search_registry.get_registered_models():
        return

    # Default to synchronous indexing so newly created objects show up in search
    # immediately, even when Celery workers are not running.
    #
    # If you want async-only behavior, set SEARCH_INDEX_ASYNC=True.
    async_mode = bool(getattr(settings, "SEARCH_INDEX_ASYNC", False))

    content_type = ContentType.objects.get_for_model(sender)

    def on_commit_index():
        backend = PostgresSearchBackend()
        backend.update_entry(instance)

        if async_mode:
            try:
                update_search_index.delay(content_type.id, instance.pk)
            except (ConnectionError, ConnectionRefusedError) as e:
                logger.warning(
                    "Redis unavailable, skipping async search indexing for %s %s: %s",
                    sender.__name__,
                    instance.pk,
                    e,
                )
            except (OSError, RuntimeError, TimeoutError, ValueError, TypeError) as e:
                logger.error(
                    "Failed to schedule async search index update for %s %s: %s",
                    sender.__name__,
                    instance.pk,
                    e,
                )

    transaction.on_commit(on_commit_index)


def handle_delete(sender, instance, **_kwargs):
    """
    Signal handler to trigger search index deletion on delete.
    """
    if str(os.environ.get("SEARCH_INDEX_DISABLE_SIGNALS", "")).lower() in {"1", "true", "yes"}:
        return

    if sender not in search_registry.get_registered_models():
        return

    async_mode = bool(getattr(settings, "SEARCH_INDEX_ASYNC", False))
    content_type = ContentType.objects.get_for_model(sender)

    def on_commit_delete():
        backend = PostgresSearchBackend()
        backend.delete_entry(instance)

        if async_mode:
            try:
                delete_search_index.delay(content_type.id, instance.pk)
            except (ConnectionError, ConnectionRefusedError) as e:
                logger.warning(
                    "Redis unavailable, skipping async search delete for %s %s: %s",
                    sender.__name__,
                    instance.pk,
                    e,
                )
            except (OSError, RuntimeError, TimeoutError, ValueError, TypeError) as e:
                logger.error(
                    "Failed to schedule async search index delete for %s %s: %s",
                    sender.__name__,
                    instance.pk,
                    e,
                )

    transaction.on_commit(on_commit_delete)
