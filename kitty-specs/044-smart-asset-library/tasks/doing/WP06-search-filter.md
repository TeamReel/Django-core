---
work_package_id: WP06
work_package_name: Search & Filter
priority: P1
estimated_hours: 4
dependencies:
  - WP01
  - WP03
  - B24 Search
subtasks:
  - id: T024
    title: Add SearchVector to MediaItem
    priority: P1
    status: not-started
  - id: T025
    title: Implement search endpoint with B24 integration
    priority: P1
    status: not-started
  - id: T026
    title: Implement filters
    priority: P1
    status: not-started
  - id: T027
    title: Add cursor-based pagination
    priority: P1
    status: not-started
lane: "doing"
agent: "copilot"
---

# WP06: Search & Filter

## Goal
Implement full-text search and multi-faceted filtering for media items with efficient pagination.

## Context

### Design Documents
- **Spec**: FR-031 through FR-040
- **B24 Search**: Existing search infrastructure using PostgreSQL full-text search

### Technical Approach
- PostgreSQL `SearchVector` on title + description
- B24 SearchService integration for consistent behavior
- `django-filter` for declarative filtering
- Cursor-based pagination for performance

## Implementation Details

### T024: SearchVector Configuration
Add search vector to MediaItem model:

```python
# src/assets/models.py
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex

class MediaItem(TimeStampedModel):
    # ... existing fields ...

    # Full-text search
    search_vector = SearchVectorField(null=True)

    class Meta:
        indexes = [
            # ... existing indexes ...
            GinIndex(fields=["search_vector"]),
        ]
```

Add signal to update search vector:

```python
# src/assets/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.search import SearchVector
from .models import MediaItem

@receiver(post_save, sender=MediaItem)
def update_search_vector(sender, instance, **kwargs):
    """Update search vector when title/description changes."""
    # Avoid recursion
    if kwargs.get("update_fields") and "search_vector" in kwargs["update_fields"]:
        return

    MediaItem.objects.filter(pk=instance.pk).update(
        search_vector=(
            SearchVector("title", weight="A") +
            SearchVector("description", weight="B")
        )
    )
```

### T025: Search Endpoint
Create search service at `src/assets/services/search.py`:

```python
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.db.models import F
from ..models import MediaItem

class MediaSearchService:
    @staticmethod
    def search(
        query: str,
        project_ids: list[str] = None,
        user=None,
        limit: int = 50
    ) -> QuerySet:
        """Full-text search for media items."""

        # Build base queryset with access control
        qs = MediaItem.objects.all()

        if user:
            # Filter to user's accessible projects
            accessible_projects = user.project_memberships.values_list(
                "project_id", flat=True
            )
            qs = qs.filter(project_id__in=accessible_projects)

        if project_ids:
            qs = qs.filter(project_id__in=project_ids)

        if query:
            search_query = SearchQuery(query, config="english")
            qs = qs.annotate(
                rank=SearchRank(F("search_vector"), search_query)
            ).filter(
                search_vector=search_query
            ).order_by("-rank", "-created")
        else:
            qs = qs.order_by("-created")

        return qs[:limit]

    @staticmethod
    def search_by_tags(tag_slugs: list[str], project_id: str = None) -> QuerySet:
        """Find media items with all specified tags."""
        qs = MediaItem.objects.filter(tags__slug__in=tag_slugs)

        if project_id:
            qs = qs.filter(project_id=project_id)

        # Ensure item has ALL tags (not just any)
        qs = qs.annotate(
            tag_count=models.Count("tags", filter=models.Q(tags__slug__in=tag_slugs))
        ).filter(tag_count=len(tag_slugs))

        return qs.distinct()
```

### T026: Filter Implementation
Create FilterSet with django-filter:

```python
# src/assets/filters.py
import django_filters
from django.db.models import Q
from .models import MediaItem, MediaItemState

class MediaItemFilterSet(django_filters.FilterSet):
    # Text search
    q = django_filters.CharFilter(method="filter_search")

    # Project filter
    project = django_filters.UUIDFilter(field_name="project_id")

    # State filter
    state = django_filters.ChoiceFilter(
        choices=MediaItemState.choices,
        field_name="state"
    )

    # Tags filter (comma-separated slugs)
    tags = django_filters.CharFilter(method="filter_tags")

    # Activity filter
    activity = django_filters.UUIDFilter(field_name="activity_id")

    # MIME type filter
    mime_type = django_filters.CharFilter(lookup_expr="istartswith")

    # Date range filters
    created_after = django_filters.DateTimeFilter(
        field_name="created", lookup_expr="gte"
    )
    created_before = django_filters.DateTimeFilter(
        field_name="created", lookup_expr="lte"
    )

    # File size filters (bytes)
    min_size = django_filters.NumberFilter(
        field_name="file_size_bytes", lookup_expr="gte"
    )
    max_size = django_filters.NumberFilter(
        field_name="file_size_bytes", lookup_expr="lte"
    )

    class Meta:
        model = MediaItem
        fields = []

    def filter_search(self, queryset, name, value):
        """Full-text search filter."""
        if not value:
            return queryset

        from django.contrib.postgres.search import SearchQuery, SearchRank
        from django.db.models import F

        search_query = SearchQuery(value, config="english")
        return queryset.annotate(
            rank=SearchRank(F("search_vector"), search_query)
        ).filter(search_vector=search_query).order_by("-rank")

    def filter_tags(self, queryset, name, value):
        """Filter by multiple tags (AND logic)."""
        if not value:
            return queryset

        tag_slugs = [s.strip() for s in value.split(",")]
        for slug in tag_slugs:
            queryset = queryset.filter(tags__slug=slug)

        return queryset.distinct()
```

### T027: Cursor-Based Pagination
Implement cursor pagination:

```python
# src/assets/pagination.py
from rest_framework.pagination import CursorPagination

class MediaItemCursorPagination(CursorPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-created"
    cursor_query_param = "cursor"

    def get_paginated_response(self, data):
        return Response({
            "next": self.get_next_link(),
            "previous": self.get_previous_link(),
            "results": data,
        })
```

Update ViewSet:

```python
# src/assets/views.py
from django_filters.rest_framework import DjangoFilterBackend
from .filters import MediaItemFilterSet
from .pagination import MediaItemCursorPagination

class MediaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemSerializer
    permission_classes = [IsAuthenticated, HasProjectAccess]
    filterset_class = MediaItemFilterSet
    filter_backends = [DjangoFilterBackend]
    pagination_class = MediaItemCursorPagination

    def get_queryset(self):
        return MediaItem.objects.filter(
            project__memberships__user=self.request.user
        ).select_related("file").prefetch_related("tags")
```

### Search Endpoint (Dedicated)
Add dedicated search endpoint for complex queries:

```python
class MediaSearchView(APIView):
    """Advanced search endpoint."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/v1/assets/search/
        ?q=keyword&project=uuid&tags=tag1,tag2&state=ready&created_after=2024-01-01
        """
        filterset = MediaItemFilterSet(
            request.query_params,
            queryset=MediaItem.objects.filter(
                project__memberships__user=request.user
            )
        )

        if not filterset.is_valid():
            return Response(filterset.errors, status=400)

        qs = filterset.qs.select_related("file").prefetch_related("tags")

        # Apply pagination
        paginator = MediaItemCursorPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = MediaItemSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)
```

## Acceptance Criteria

- [ ] Search "Ajax" → returns items with "Ajax" in title/description
- [ ] Filter by tag → returns items with that tag
- [ ] Filter by state=ready → returns only ready items
- [ ] Filter by date range → returns items in range
- [ ] Combine filters → works correctly (AND logic)
- [ ] Pagination → cursor-based, works for large result sets
- [ ] Search ranking → more relevant results first

## Testing Notes

- Test search relevance (title match > description match)
- Test empty search (returns all accessible)
- Test tag combination (AND logic, not OR)
- Test pagination with large datasets
- Test filter edge cases (invalid dates, etc.)

## Activity Log

- 2026-02-02T20:40:59Z – copilot – shell_pid= – lane=doing – Started implementation
