from django.contrib.contenttypes.models import ContentType

from search.registry import search_registry
from search.tasks import update_search_index, delete_search_index


def handle_save(sender, instance, **kwargs):
    """
    Signal handler to trigger search index update on save.
    """
    if sender in search_registry.get_registered_models():
        content_type = ContentType.objects.get_for_model(sender)
        # Use on_commit to ensure DB transaction is complete before task runs
        # But we need to import transaction
        from django.db import transaction

        transaction.on_commit(lambda: update_search_index.delay(content_type.id, instance.pk))


def handle_delete(sender, instance, **kwargs):
    """
    Signal handler to trigger search index deletion on delete.
    """
    if sender in search_registry.get_registered_models():
        content_type = ContentType.objects.get_for_model(sender)
        # No need for on_commit for delete usually, but safer to be consistent
        # Actually for delete, the record is gone, so we just need the ID.
        delete_search_index.delay(content_type.id, instance.pk)
