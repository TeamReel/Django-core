# Data Model: Search Engine Foundation

## Entities

### SearchEntry

The central index table storing searchable content and metadata.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary Key |
| `content_type` | ForeignKey | Link to Django ContentType (Source Model) |
| `object_id` | UUID | ID of the source object |
| `content_object` | GenericForeignKey | The actual source object instance |
| `search_vector` | SearchVectorField | Postgres tsvector (indexed with GIN) |
| `body_text` | TextField | Full text content for highlighting |
| `title` | CharField | Denormalized title for display |
| `description` | TextField | Denormalized description for display |
| `image_url` | URLField | Denormalized image URL for display |
| `url` | CharField | Denormalized relative URL to the resource |
| `language` | CharField | Language used for stemming (e.g., 'english', 'dutch') |
| `last_updated` | DateTime | Timestamp of last index update |

**Indexes:**
- `GIN(search_vector)`
- `(content_type, object_id)` (Unique Constraint)

## Registry System

### SearchIndex (Base Class)

Abstract base class for defining how a model is indexed.

```python
class SearchIndex:
    model = None  # The model class

    def get_vector(self, obj):
        """Returns the SearchVector for the object."""
        pass

    def get_title(self, obj):
        pass

    def get_description(self, obj):
        pass

    def get_url(self, obj):
        pass
```

### SearchRegistry (Singleton)

Manages the mapping between Models and SearchIndexes.

- `register(model, index_class)`
- `get_index(model)`
- `get_registered_models()`
