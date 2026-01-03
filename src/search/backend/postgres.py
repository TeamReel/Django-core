from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.contrib.postgres.search import SearchVector

from search.models import SearchEntry
from search.registry import search_registry


class PostgresSearchBackend:
    """
    Adapter for PostgreSQL-based search operations.
    Handles updating and deleting SearchEntry records.
    """

    def update_entry(self, obj):
        """
        Update or create a SearchEntry for the given object.
        """
        model = obj.__class__
        index = search_registry.get_index(model)

        if not index:
            return

        content_type = ContentType.objects.get_for_model(model)

        # Calculate fields using the index
        # Note: get_vector might return a SearchVector object or we might need to construct it
        # The prompt says "Calculate vector... using the index".
        # In Django, SearchVector is usually used in queries or updates.
        # If get_vector returns a SearchVector, we can use it in the update.
        # However, SearchVectorField in the model stores the vector.
        # Let's assume get_vector returns a SearchVector instance.

        # We need to handle the vector update carefully.
        # Django's SearchVectorField is usually populated via a trigger or an update query with SearchVector.

        try:
            body_text = index.get_body_text(obj)
        except NotImplementedError:
            # Fallback or skip? The base class raises NotImplementedError.
            # If the specific index doesn't implement it, we can't index it.
            return

        title = index.get_title(obj)
        description = index.get_description(obj)
        url = index.get_url(obj)
        image_url = index.get_image_url(obj)

        with transaction.atomic():
            entry, created = SearchEntry.objects.update_or_create(
                content_type=content_type,
                object_id=obj.pk,
                defaults={
                    "body_text": body_text,
                    "title": title,
                    "description": description,
                    "url": url,
                    "image_url": image_url,
                },
            )

            # Explicitly update the search vector from the body text
            SearchEntry.objects.filter(pk=entry.pk).update(search_vector=SearchVector("body_text"))

    def delete_entry(self, obj):
        """
        Delete the SearchEntry for the given object.
        """
        content_type = ContentType.objects.get_for_model(obj.__class__)
        SearchEntry.objects.filter(content_type=content_type, object_id=obj.pk).delete()
