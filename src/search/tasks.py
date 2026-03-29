import logging

from celery import shared_task
from django.contrib.contenttypes.models import ContentType
from search.backend.postgres import PostgresSearchBackend

logger = logging.getLogger(__name__)


@shared_task
def update_search_index(content_type_id, object_id):
    """
    Celery task to update the search index for a specific object.
    """
    try:
        content_type = ContentType.objects.get(pk=content_type_id)
        model = content_type.model_class()
        if not model:
            return

        obj = model.objects.get(pk=object_id)
        backend = PostgresSearchBackend()
        backend.update_entry(obj)
    except (ContentType.DoesNotExist, model.DoesNotExist):
        # Object or ContentType might have been deleted before task ran
        pass
    except Exception as e:
        logger.error("Error updating search index: %s", e)


@shared_task
def delete_search_index(content_type_id, object_id):
    """
    Celery task to delete the search index for a specific object.
    Note: We can't fetch the object because it's already deleted.
    We need to delete by ID.
    """
    # We can't use PostgresSearchBackend.delete_entry(obj) because obj doesn't exist.
    # We should probably add a method to backend to delete by ID or handle it here.
    # Let's handle it here for now or extend backend.
    # Extending backend is cleaner.

    # But wait, PostgresSearchBackend.delete_entry takes an obj.
    # Let's modify backend to allow deleting by ID/ContentType?
    # Or just do it here since it's simple.

    from search.models import SearchEntry

    SearchEntry.objects.filter(content_type_id=content_type_id, object_id=object_id).delete()
