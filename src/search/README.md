# Full-text Search (B24)

**Status**: ✅ Complete
**Location**: `src/search/`

## Purpose

The Search module provides full-text search capabilities across organisations, projects, files, and other resources with relevance ranking and multi-field indexing.

## Scope

**✅ Included**:
- PostgreSQL full-text search with GIN indexes
- Unified search across multiple resource types
- SearchEntry model for denormalized search data
- Automatic indexing via signals
- Relevance ranking and highlighting
- Language-specific stemming (English default)
- Search backend abstraction (PostgreSQL or Elasticsearch)

**❌ Excluded** (Product-Agnostic Constraint):
- Faceted search (use filters in API)
- Advanced query syntax (boolean operators handled by backend)
- Search analytics (use B18 Observability)
- Saved searches (downstream responsibility)

## Key Components

### Models
- **`SearchEntry`**: Unified search index with search_vector (PostgreSQL tsvector), content_type FK, denormalized display fields (title, description, url), and language setting

### APIs/Views
- **`GET /api/search/?q=keyword`**: Global search across all resource types
- **`GET /api/search/?q=keyword&type=project`**: Filter by content type
- **`GET /api/search/?q=keyword&org={id}`**: Filter by organisation
- **`GET /api/search/suggest/?q=partial`**: Autocomplete suggestions (future)

### Services/Managers
- **`SearchBackend`**: Abstract base class for search implementations
- **`PostgresSearchBackend`**: PostgreSQL full-text search implementation
- **`ElasticsearchBackend`**: Elasticsearch implementation (optional)
- **`index_object()`**: Add/update object in search index
- **`remove_from_index()`**: Remove object from search index
- **`search_all()`**: Query across all resource types

### Utilities
- **`registry.py`**: Searchable model registration system
- **`signals.py`**: Auto-indexing on model save/delete
- **`indexes.py`**: PostgreSQL index definitions
- **`utils.py`**: Search query parsing and highlighting helpers

## Public Interface

**Safe to Import** (Stable API):
```python
from search.models import SearchEntry
from search.backend import get_search_backend
from search.registry import register_searchable_model
from search.utils import search_all, index_object, remove_from_index
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from search.backend.postgres import PostgresSearchBackend
from search.signals import update_search_index
```

## Integration Example

**Minimal Working Example**:

**Register Model for Search**:
```python
# your_module/apps.py
from django.apps import AppConfig

class YourModuleConfig(AppConfig):
    name = 'your_module'

    def ready(self):
        from search.registry import register_searchable_model
        from your_module.models import YourModel

        register_searchable_model(
            model=YourModel,
            title_field='name',
            description_field='description',
            body_fields=['content', 'notes'],
            url_template='/your-module/{slug}/'
        )
```

**Search Programmatically**:
```python
from search.utils import search_all

# Simple search
results = search_all(
    query="django project",
    user=request.user,
    organisation_id=org.id
)

for result in results:
    print(f"{result.title} - {result.content_type}")
    print(f"URL: {result.url}")
    print(f"Score: {result.rank}")

# Type-specific search
project_results = search_all(
    query="campaign",
    user=request.user,
    content_types=["projects.project"]
)
```

**API Usage**:
```python
# Client-side search
import requests

headers = {
    "Authorization": "Bearer <access_token>",
    "X-Organisation-ID": "<org-uuid>"
}

response = requests.get(
    "https://api.example.com/api/search/",
    headers=headers,
    params={
        "q": "django framework",
        "page": 1,
        "page_size": 20
    }
)

results = response.json()["data"]["results"]
for item in results:
    print(f"{item['title']} ({item['content_type']})")
    print(f"  {item['description']}")
    print(f"  {item['url']}")
```

**Manual Indexing**:
```python
from search.utils import index_object, remove_from_index
from projects.models import Project

# Index a project
project = Project.objects.get(slug="q1-campaign")
index_object(project)

# Remove from index
remove_from_index(project)

# Bulk reindex
from projects.models import Project
for project in Project.objects.all():
    index_object(project)
```

## Related Modules

**Dependencies** (This module requires):
- PostgreSQL (with pg_trgm and full-text search extensions)
- [B06 Organisations] - Organisation-scoped search
- [B07 Projects] - Project indexing
- [B22 Files] - File metadata indexing
- Django ContentTypes - Generic relations

**Used By** (Modules that depend on this):
- All modules with searchable content
- Frontend search components
- Command palettes and quick navigation

## Extension Points

**How Downstream Products Can Extend**:

1. **Register Custom Models**:
   ```python
   # your_product/models.py
   from django.db import models

   class Invoice(models.Model):
       number = models.CharField(max_length=50)
       description = models.TextField()
       amount = models.DecimalField(max_digits=10, decimal_places=2)

   # your_product/apps.py
   from search.registry import register_searchable_model

   register_searchable_model(
       model=Invoice,
       title_field='number',
       description_field='description',
       body_fields=['notes', 'line_items'],
       url_template='/invoices/{id}/',
       custom_indexer=lambda obj: {
           'amount': str(obj.amount),
           'status': obj.status
       }
   )
   ```

2. **Custom Search Filters**:
   ```python
   # your_product/search.py
   from search.utils import search_all

   def search_invoices_by_amount(query, min_amount, max_amount):
       results = search_all(
           query=query,
           content_types=["your_product.invoice"]
       )

       # Post-filter by amount
       return [
           r for r in results
           if min_amount <= r.content_object.amount <= max_amount
       ]
   ```

3. **Custom Ranking**:
   ```python
   # your_product/search_backend.py
   from search.backend.postgres import PostgresSearchBackend

   class CustomSearchBackend(PostgresSearchBackend):
       def search(self, query, **kwargs):
           results = super().search(query, **kwargs)

           # Boost recent items
           for result in results:
               age_days = (timezone.now() - result.content_object.created_at).days
               result.rank *= (1 + (1 / (age_days + 1)))

           return sorted(results, key=lambda r: r.rank, reverse=True)
   ```

4. **Elasticsearch Backend**:
   ```python
   # your_product/settings.py
   SEARCH_BACKEND = "search.backend.elasticsearch.ElasticsearchBackend"
   ELASTICSEARCH_URL = os.environ.get("ELASTICSEARCH_URL")

   # your_product/search_backend.py
   from elasticsearch import Elasticsearch
   from search.backend.base import BaseSearchBackend

   class ElasticsearchBackend(BaseSearchBackend):
       def __init__(self):
           self.client = Elasticsearch([settings.ELASTICSEARCH_URL])

       def index(self, obj):
           self.client.index(
               index="search",
               id=f"{obj._meta.label}:{obj.id}",
               document={
                   "title": obj.title,
                   "body": obj.body_text,
                   "type": obj._meta.label
               }
           )

       def search(self, query, **kwargs):
           response = self.client.search(
               index="search",
               body={"query": {"multi_match": {"query": query}}}
           )
           return response["hits"]["hits"]
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    ...
    'django.contrib.postgres',  # For PostgreSQL full-text search
    'search',
]

# Search backend
SEARCH_BACKEND = "search.backend.postgres.PostgresSearchBackend"
```

**PostgreSQL Setup**:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Full-text search already included in PostgreSQL
```

**Environment Variables**:
```bash
# PostgreSQL (default)
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Elasticsearch (optional)
ELASTICSEARCH_URL=http://localhost:9200
SEARCH_BACKEND=search.backend.elasticsearch.ElasticsearchBackend
```

**Optional Settings**:
```python
# settings.py (optional)
SEARCH_DEFAULT_LANGUAGE = "english"  # PostgreSQL text search config
SEARCH_MIN_QUERY_LENGTH = 3  # Minimum search term length
SEARCH_MAX_RESULTS = 100  # Maximum results per query
SEARCH_HIGHLIGHT_LENGTH = 200  # Characters in highlighted snippet
SEARCH_BOOST_RECENT = True  # Boost recently updated items
```

## Testing

**Run Module Tests**:
```bash
pytest tests/search/ -v
```

**Key Test Coverage**:
- ✅ Model registration and auto-indexing
- ✅ Full-text search with ranking
- ✅ Multi-field search (title, body, description)
- ✅ Content type filtering
- ✅ Organisation scoping
- ✅ Signal-based index updates
- ✅ Manual index operations
- ✅ Search highlighting

**Example Test**:
```python
import pytest
from search.utils import index_object, search_all
from projects.models import Project

@pytest.mark.django_db
def test_search_projects(organisation, user):
    # Create test projects
    project1 = Project.objects.create(
        organisation=organisation,
        name="Django REST API",
        description="Building scalable APIs with Django"
    )
    project2 = Project.objects.create(
        organisation=organisation,
        name="React Frontend",
        description="Modern web UI with React"
    )

    # Index projects
    index_object(project1)
    index_object(project2)

    # Search
    results = search_all(
        query="django",
        user=user,
        organisation_id=organisation.id
    )

    assert len(results) == 1
    assert results[0].content_object == project1
```

## References

- **Spec**: [documents/02-roadmap/modules/done/036-B24-full-text-search-foundation.md](../../documents/02-roadmap/modules/done/036-B24-full-text-search-foundation.md)
- **Module Doc**: [documents/04-modules/backend/B24-search.md](../../documents/04-modules/backend/B24-search.md)
- **API Docs**: Auto-generated via drf-spectacular at `/api/schema/`
- **PostgreSQL FTS**: https://www.postgresql.org/docs/current/textsearch.html

## Troubleshooting

**Common Issues**:

1. **Issue**: Search returns no results for known content
   - **Cause**: Object not indexed or search_vector not updated
   - **Solution**: Manually reindex: `python manage.py rebuild_search_index`

2. **Issue**: Slow search queries
   - **Cause**: Missing GIN index on search_vector field
   - **Solution**: Run migrations to create index: `python manage.py migrate search`

3. **Issue**: Special characters break search
   - **Cause**: PostgreSQL full-text search requires proper escaping
   - **Solution**: Search backend automatically escapes special characters, ensure using `search_all()` helper

4. **Issue**: Search results not scoped to user's organisation
   - **Cause**: Missing organisation_id filter
   - **Solution**: Always pass `organisation_id` parameter: `search_all(query, organisation_id=org.id)`

5. **Issue**: New content not appearing in search
   - **Cause**: Signal-based indexing disabled or delayed
   - **Solution**: Verify signals connected: check `search/signals.py` and `apps.py` ready() method

## Migration Notes

**Breaking Changes**:
- **v1.1.0**: Changed search_vector field from TEXT to SearchVectorField (requires PostgreSQL 9.6+)
- **v1.0.0**: Initial release with PostgreSQL full-text search

**Deprecations**:
- `search.query()` (deprecated v1.1): Use `search_all()` for better typing and filters
