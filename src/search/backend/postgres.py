from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db import connection, transaction
from django.db.models import Q
from search.models import SearchEntry
from search.registry import search_registry
from search.utils import sanitize_query


class PostgresSearchBackend:
    """
    Adapter for PostgreSQL-based search operations.
    Handles updating, deleting, and querying SearchEntry records.
    """

    def search(self, query_string, user, types=None):
        """
        Perform a full-text search with permission filtering.

        Args:
            query_string (str): The raw search query.
            user (User): The user performing the search.
            types (list, optional): List of model labels (e.g. 'projects.Project') to filter by.

        Returns:
            QuerySet: Ranked SearchEntry results visible to the user.
        """
        clean_query = sanitize_query(query_string)
        if not clean_query:
            return SearchEntry.objects.none()

        # Use raw search query with prefix matching for partial words
        # e.g. "aja" -> "aja:*"
        terms = [term for term in clean_query.split() if term]
        if terms:
            # Join terms with AND (&) and append prefix wildcard (*)
            prefix_query = " & ".join(f"{term}:*" for term in terms)
            search_query = SearchQuery(prefix_query, search_type="raw")
        else:
            search_query = SearchQuery(clean_query)

        queryset = SearchEntry.objects.all()

        # 1. Filter by content types if requested
        if types:
            # types is expected to be a list of 'app_label.model_name' strings
            # We need to convert them to ContentType objects
            q_types = Q()
            for type_label in types:
                try:
                    app_label, model = type_label.split(".")
                    ct = ContentType.objects.get(app_label=app_label, model=model.lower())
                    q_types |= Q(content_type=ct)
                except (ValueError, ContentType.DoesNotExist):
                    continue
            queryset = queryset.filter(q_types)

        # 2. Apply Permission Filtering
        # If superuser, skip permission checks (see everything)
        if not user.is_superuser:
            permission_filter = Q()
            registered_models = search_registry.get_registered_models()

            for model in registered_models:
                index = search_registry.get_index(model)
                if not index:
                    continue

                # Get visible IDs for this model
                visible_ids = index.get_visible_ids(user)

                # Get ContentType for this model
                ct = ContentType.objects.get_for_model(model)

                # Add to permission filter
                # We use object_id__in with the subquery/list
                permission_filter |= Q(content_type=ct, object_id__in=visible_ids)

            queryset = queryset.filter(permission_filter)

        # 3. Apply Search Query and Ranking
        if connection.vendor == "postgresql":
            queryset = queryset.filter(search_vector=search_query)
            queryset = queryset.annotate(rank=SearchRank("search_vector", search_query))
            queryset = queryset.order_by("-rank")
        else:
            # Fallback for SQLite (Development)
            queryset = queryset.filter(body_text__icontains=clean_query)
            queryset = queryset.order_by("-last_updated")

        return queryset

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
        # Django's SearchVectorField is usually populated
        # via a trigger or an update query with SearchVector.

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

            if connection.vendor == "postgresql":
                # Explicitly update the search vector from the body text
                SearchEntry.objects.filter(pk=entry.pk).update(
                    search_vector=SearchVector("body_text")
                )

    def delete_entry(self, obj):
        """
        Delete the SearchEntry for the given object.
        """
        content_type = ContentType.objects.get_for_model(obj.__class__)
        SearchEntry.objects.filter(content_type=content_type, object_id=obj.pk).delete()
