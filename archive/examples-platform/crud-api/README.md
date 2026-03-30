# CRUD API Example

A complete CRUD (Create, Read, Update, Delete) API example demonstrating Django Core-App patterns with Django REST Framework.

## Overview

This example demonstrates:

- **Model Design**: Django model with proper field definitions, relationships, and timestamps
- **Serializers**: DRF serializers with validation and nested fields
- **ViewSets**: Full CRUD with custom actions and permission classes
- **Permissions**: Owner-only write access with public read
- **Testing**: pytest-django patterns with fixtures and comprehensive coverage

## Prerequisites

- Python 3.12+
- Familiarity with Django basics
- Understanding of REST APIs

## Project Structure

```
examples/crud-api/
├── README.md               # This file
├── pyproject.toml          # Project configuration
├── src/
│   └── notes/
│       ├── __init__.py
│       ├── models.py       # Note model
│       ├── serializers.py  # DRF serializers
│       ├── views.py        # ViewSet with permissions
│       └── urls.py         # URL routing
└── tests/
    ├── __init__.py
    ├── conftest.py         # Pytest fixtures
    └── test_notes_api.py   # API tests
```

## Setup

### 1. Ensure Core is Available

This example runs as part of the Django Core-App project. From the project root:

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# Install dependencies
pip install -r requirements/local.txt
```

### 2. Run Migrations

The example uses the Core database:

```bash
cd src
python manage.py migrate
```

### 3. Create a Test User

```bash
python manage.py createsuperuser
```

## Code Walkthrough

### Model (`src/notes/models.py`)

The `Note` model demonstrates:

```python
class Note(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
```

**Key Patterns**:
- Use `settings.AUTH_USER_MODEL` for user FK (supports custom user models)
- `related_name` enables `user.notes.all()` queries
- `auto_now_add` / `auto_now` for automatic timestamps
- Default ordering in `Meta` class

### Serializer (`src/notes/serializers.py`)

```python
class NoteSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.email')

    class Meta:
        model = Note
        fields = ['id', 'title', 'content', 'author', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']

    def validate_title(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value
```

**Key Patterns**:
- `ReadOnlyField` with `source` for nested data
- Explicit `read_only_fields` for safety
- `validate_<field>` for custom validation

### ViewSet (`src/notes/views.py`)

```python
class NoteViewSet(viewsets.ModelViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        if self.action == 'list':
            return self.queryset.filter(author=self.request.user)
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_notes = self.get_queryset()[:5]
        serializer = self.get_serializer(recent_notes, many=True)
        return Response(serializer.data)
```

**Key Patterns**:
- `ModelViewSet` provides all CRUD operations
- Override `get_queryset` for user-specific filtering
- `perform_create` for setting author from request
- `@action` decorator for custom endpoints

### Custom Permission

```python
class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user
```

**Key Patterns**:
- Check `SAFE_METHODS` for read-only access
- Object-level permission checking

## API Usage Examples

### Authentication

First, obtain a JWT token:

```bash
# Login to get tokens
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# Response:
# {"access": "eyJ...", "refresh": "eyJ..."}
```

Use the access token in subsequent requests:

```bash
export TOKEN="your_access_token"
```

### Create a Note

```bash
curl -X POST http://localhost:8000/api/notes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Note", "content": "Hello, World!"}'

# Response:
# {
#   "id": 1,
#   "title": "My First Note",
#   "content": "Hello, World!",
#   "author": "your@email.com",
#   "created_at": "2025-12-05T10:00:00Z",
#   "updated_at": "2025-12-05T10:00:00Z"
# }
```

### List Notes

```bash
curl http://localhost:8000/api/notes/ \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "count": 1,
#   "results": [
#     {"id": 1, "title": "My First Note", ...}
#   ]
# }
```

### Get a Specific Note

```bash
curl http://localhost:8000/api/notes/1/ \
  -H "Authorization: Bearer $TOKEN"
```

### Update a Note

```bash
curl -X PATCH http://localhost:8000/api/notes/1/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'
```

### Delete a Note

```bash
curl -X DELETE http://localhost:8000/api/notes/1/ \
  -H "Authorization: Bearer $TOKEN"
```

### Get Recent Notes

```bash
curl http://localhost:8000/api/notes/recent/ \
  -H "Authorization: Bearer $TOKEN"
```

### Duplicate a Note

```bash
curl -X POST http://localhost:8000/api/notes/1/duplicate/ \
  -H "Authorization: Bearer $TOKEN"
```

## Running Tests

### Run All Tests

```bash
# From project root
pytest examples/crud-api/tests/ -v

# With coverage
pytest examples/crud-api/tests/ --cov=examples/crud-api/src/notes
```

### Run Specific Tests

```bash
# Run only create tests
pytest examples/crud-api/tests/ -k "create"

# Run only permission tests
pytest examples/crud-api/tests/ -k "forbidden"
```

## Key Patterns to Learn

### 1. Owner-Only Permissions

The `IsOwnerOrReadOnly` permission class is a common pattern for user-generated content. Extend it for your use cases:

```python
class IsTeamMemberOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user in obj.team.members.all()
```

### 2. Filtered QuerySets

Filter querysets based on the current user to prevent data leakage:

```python
def get_queryset(self):
    return self.queryset.filter(
        Q(author=self.request.user) | Q(is_public=True)
    )
```

### 3. Custom Actions

Use `@action` for operations that don't fit standard CRUD:

```python
@action(detail=True, methods=['post'])
def archive(self, request, pk=None):
    note = self.get_object()
    note.is_archived = True
    note.save()
    return Response({'status': 'archived'})
```

### 4. Different Serializers per Action

Use lightweight serializers for list views:

```python
def get_serializer_class(self):
    if self.action == 'list':
        return NoteListSerializer  # Fewer fields
    return NoteSerializer  # Full detail
```

## Extending This Example

### Add Categories

```python
class Category(models.Model):
    name = models.CharField(max_length=100)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, ...)

class Note(models.Model):
    # ... existing fields
    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
```

### Add Sharing

```python
class Note(models.Model):
    # ... existing fields
    shared_with = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='shared_notes',
        blank=True
    )
```

### Add Search

```python
from rest_framework import filters

class NoteViewSet(viewsets.ModelViewSet):
    # ... existing config
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content']
```

## Troubleshooting

### "Authentication credentials were not provided"

Make sure to include the Authorization header:
```bash
-H "Authorization: Bearer $TOKEN"
```

### "You do not have permission to perform this action"

You're trying to modify a note you don't own. Check the note's author matches your user.

### Tests failing with "relation does not exist"

Run migrations first:
```bash
python manage.py migrate
```

## See Also

- [Django REST Framework Documentation](https://www.django-rest-framework.org/)
- [Authentication Guide](../../docs/guides/authentication.md)
- [Permissions Guide](../../docs/guides/permissions.md)
- [Background Tasks Example](../background-tasks/)
