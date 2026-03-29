import django_filters

from .models import MediaItem, MediaItemState


class UUIDInFilter(django_filters.BaseInFilter, django_filters.UUIDFilter):
    """Comma-separated UUID filter: ?activity__in=uuid1,uuid2,uuid3"""


class MediaItemFilterSet(django_filters.FilterSet):
    # Text search (uses Postgres SearchVector via Service)
    q = django_filters.CharFilter(method="filter_search")

    # Project filter (integer ID, not UUID - Project model uses default Django ID)
    project = django_filters.NumberFilter(field_name="project_id")

    # State filter
    state = django_filters.ChoiceFilter(choices=MediaItemState.choices, field_name="state")

    # Tags filter (comma-separated slugs)
    tags = django_filters.CharFilter(method="filter_tags")

    # Activity filter (single)
    activity = django_filters.UUIDFilter(field_name="activity_id")

    # Activity batch filter (comma-separated UUIDs)
    activity__in = UUIDInFilter(field_name="activity_id", lookup_expr="in")

    # MIME type filter
    mime_type = django_filters.CharFilter(lookup_expr="istartswith")

    # Date range filters
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    # File size filters (bytes)
    min_size = django_filters.NumberFilter(field_name="file_size_bytes", lookup_expr="gte")
    max_size = django_filters.NumberFilter(field_name="file_size_bytes", lookup_expr="lte")

    class Meta:
        model = MediaItem
        fields = ["state", "project", "mime_type", "activity"]

    def filter_search(self, queryset, name, value):
        """Use MediaSearchService for full-text ranked search"""
        if not value:
            return queryset

        # We can reuse the service logic, but we need to stay within the queryset.
        # The service returns a queryset.
        # MediaSearchService.search logic:
        # qs.annotate(rank=...).filter(search_vector=query).order_by("-rank")

        # Since we are already inside a FilterSet on a queryset that might have other filters,
        # we can apply the search logic to `queryset`.

        # However, MediaSearchService assumes it builds the QuerySet.
        # Let's extract the search logic or call it carefully.

        # Better: Re-implement the specific search logic here or refactor Service to accept QS.
        # Let's refactor the logic slightly to apply to current QS.

        from django.contrib.postgres.search import SearchQuery, SearchRank
        from django.db.models import F

        search_query = SearchQuery(value, config="english")
        return (
            queryset.annotate(rank=SearchRank(F("search_vector"), search_query))
            .filter(search_vector=search_query)
            .order_by("-rank", "-created_at")
        )

    def filter_tags(self, queryset, name, value):
        """Filter by list of tag slugs (comma-separated) - AND logic"""
        if not value:
            return queryset

        slugs = [s.strip() for s in value.split(",") if s.strip()]
        if not slugs:
            return queryset

        # Use existing logic from view/service: AND logic
        # For each slug, filter? Or Count aggregation?
        # Count aggregation is cleaner for "has ALL these tags"

        from django.db.models import Count, Q

        queryset = queryset.filter(tags__slug__in=slugs)
        queryset = queryset.annotate(
            matched_tag_count=Count("tags", filter=Q(tags__slug__in=slugs))
        ).filter(matched_tag_count=len(slugs))

        return queryset
