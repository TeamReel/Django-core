from django.db import connection
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector
from .models import MediaItem


@receiver(post_save, sender=MediaItem)
def update_search_vector(sender, instance, **kwargs):
    """Update search vector when title/description changes."""
    # Skip if not PostgreSQL (e.g. SQLite tests)
    if connection.vendor != "postgresql":
        return

    # Avoid recursion
    if kwargs.get("update_fields") and "search_vector" in kwargs["update_fields"]:
        return

    MediaItem.objects.filter(pk=instance.pk).update(
        search_vector=(SearchVector("title", weight="A") + SearchVector("description", weight="B"))
    )
