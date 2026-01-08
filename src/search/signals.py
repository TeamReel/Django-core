from django.contrib.contenttypes.models import ContentType
import logging

from search.registry import search_registry
from search.tasks import update_search_index, delete_search_index

logger = logging.getLogger(__name__)


def handle_save(sender, instance, **kwargs):
    """
    Signal handler to trigger search index update on save.

    Gracefully handles Redis/Celery connection errors during bulk operations.
    """
    try:
        if sender not in search_registry.get_registered_models():
            return

        content_type = ContentType.objects.get_for_model(sender)
        from django.db import transaction

        def schedule_update():
            """Schedule search index update, ignoring connection errors."""
            try:
                update_search_index.delay(content_type.id, instance.pk)
            except (ConnectionError, ConnectionRefusedError) as e:
                # Redis unavailable during seeding - log warning but don't crash
                logger.warning(
                    f"Redis unavailable, skipping search index for {sender.__name__} {instance.pk}: {e}"
                )
            except Exception as e:
                # Other unexpected errors
                logger.error(
                    f"Failed to schedule search index update for {sender.__name__} {instance.pk}: {e}"
                )

        transaction.on_commit(schedule_update)

    except Exception as e:
        logger.error(f"Error in search handle_save signal: {e}")
        logger.error(f"Error in search handle_save signal: {e}")


def handle_delete(sender, instance, **kwargs):
    """
    Signal handler to trigger search index deletion on delete.
    """
    try:
        if sender in search_registry.get_registered_models():
            content_type = ContentType.objects.get_for_model(sender)
            # No need for on_commit for delete usually, but safer to be consistent
            # Actually for delete, the record is gone, so we just need the ID.
            delete_search_index.delay(content_type.id, instance.pk)
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Error in search handle_delete signal: {e}")
