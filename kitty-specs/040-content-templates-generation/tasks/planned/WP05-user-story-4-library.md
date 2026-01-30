---
work_package_id: WP05
title: User Story 4 - Content Library
lane: planned
subtasks: [T028, T029, T030, T031, T032]
priority: P2
estimated_effort: 1 day
dependencies: [WP02]
---

# WP05: Content Library Browsing

## Objective
Implement paginated content library with filters, thumbnails, download action.

## Implementation

### T028: Pagination
```python
from rest_framework.pagination import PageNumberPagination

class ContentItemViewSet(viewsets.ModelViewSet):
    pagination_class = PageNumberPagination
    page_size = 50
```

### T029: Filters
```python
class ContentItemFilter(filters.FilterSet):
    class Meta:
        model = ContentItem
        fields = ['project', 'status', 'template', 'activity']
```

### T030: Query Optimization
```python
queryset = ContentItem.objects.active().select_related(
    'template', 'project', 'activity', 'output_file', 'created_by'
)
```

### T031: Download Action
```python
@action(detail=True, methods=['get'], url_path='download')
def download(self, request, pk=None):
    item = self.get_object()
    if not item.output_file:
        return Response({'error': 'No output file available'}, status=404)
    return redirect(item.output_file.file.url)
```

### T032: Thumbnail URL
Add to serializer:
```python
'thumbnail_url': obj.output_file.thumbnail_url if obj.output_file else None
```

## Done When
- [ ] Pagination works (50 items/page)
- [ ] Filters work (`?project=5&status=approved`)
- [ ] Download endpoint redirects to file URL
- [ ] Thumbnails visible in response
