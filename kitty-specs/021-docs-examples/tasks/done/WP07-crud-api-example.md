---
work_package_id: "WP07"
subtasks:
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
  - "T064"
  - "T065"
  - "T066"
  - "T067"
  - "T068"
title: "CRUD API Example"
phase: "Phase 3 - Examples"
lane: "done"
assignee: ""
agent: "claude-reviewer"
shell_pid: ""
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-04T21:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP07 – CRUD API Example

## Objectives & Success Criteria

**Goal**: Create a complete CRUD API example demonstrating Core patterns.

**Success Criteria**:
- Example is runnable with Core as dependency
- Demonstrates ViewSet, serializer, model, tests
- Includes step-by-step README
- Smoke tests pass in CI

## Context & Constraints

**Reference Documents**:
- `kitty-specs/021-docs-examples/spec.md` - User Story 5, FR-044 through FR-051
- `kitty-specs/013-api-foundation-standards/spec.md` - API patterns
- `src/api/` - Core API foundation to reference

**Dependencies**: WP01 (structure), WP02 (getting started)

**Example Structure**:
```
examples/crud-api/
├── README.md
├── pyproject.toml
├── src/
│   └── notes/
│       ├── __init__.py
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       └── urls.py
└── tests/
    └── test_notes_api.py
```

## Subtasks & Detailed Guidance

### T059 – Create `examples/crud-api/` directory structure

**Purpose**: Set up example project skeleton.

**Steps**:
1. Create directory structure as shown above
2. Add `__init__.py` files where needed
3. Ensure structure matches Core patterns

**Files**: `examples/crud-api/` directory tree

### T060 – Create `examples/crud-api/pyproject.toml`

**Purpose**: Example project configuration.

**Content**:
```toml
[project]
name = "crud-api-example"
version = "0.1.0"
description = "CRUD API example using django-core"
requires-python = ">=3.12"
dependencies = [
    "django>=5.1",
    "djangorestframework>=3.14",
    # Reference Core via path or git
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-django>=4.5",
]
```

**Files**: `examples/crud-api/pyproject.toml`

### T061 – Create Notes model

**Purpose**: Simple model demonstrating Core patterns.

**Content**:
```python
# examples/crud-api/src/notes/models.py
from django.db import models
from django.conf import settings

class Note(models.Model):
    """Simple note model for CRUD demonstration."""
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
    
    def __str__(self):
        return self.title
```

**Files**: `examples/crud-api/src/notes/models.py`

### T062 – Create Notes serializer

**Purpose**: DRF serializer with validation.

**Content**:
```python
# examples/crud-api/src/notes/serializers.py
from rest_framework import serializers
from .models import Note

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

**Files**: `examples/crud-api/src/notes/serializers.py`

### T063 – Create Notes ViewSet

**Purpose**: ViewSet with permissions.

**Content**:
```python
# examples/crud-api/src/notes/views.py
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Note
from .serializers import NoteSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission to only allow owners to edit."""
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user

class NoteViewSet(viewsets.ModelViewSet):
    """ViewSet for Note CRUD operations."""
    queryset = Note.objects.all()
    serializer_class = NoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    def get_queryset(self):
        """Filter notes by current user for list action."""
        if self.action == 'list':
            return self.queryset.filter(author=self.request.user)
        return self.queryset
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get 5 most recent notes."""
        recent_notes = self.get_queryset()[:5]
        serializer = self.get_serializer(recent_notes, many=True)
        return Response(serializer.data)
```

**Files**: `examples/crud-api/src/notes/views.py`

### T064 – Create URL routing

**Purpose**: Wire up ViewSet to URLs.

**Content**:
```python
# examples/crud-api/src/notes/urls.py
from rest_framework.routers import DefaultRouter
from .views import NoteViewSet

router = DefaultRouter()
router.register(r'notes', NoteViewSet)

urlpatterns = router.urls
```

**Files**: `examples/crud-api/src/notes/urls.py`

### T065 – Create pytest tests

**Purpose**: Test coverage for CRUD operations.

**Content**:
```python
# examples/crud-api/tests/test_notes_api.py
import pytest
from rest_framework.test import APIClient
from notes.models import Note

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

@pytest.mark.django_db
class TestNotesCRUD:
    def test_create_note(self, authenticated_client):
        response = authenticated_client.post('/api/notes/', {
            'title': 'Test Note',
            'content': 'Test content'
        })
        assert response.status_code == 201
        assert response.data['title'] == 'Test Note'
    
    def test_list_notes_filtered_by_user(self, authenticated_client, user):
        Note.objects.create(title='My Note', content='...', author=user)
        response = authenticated_client.get('/api/notes/')
        assert response.status_code == 200
        assert len(response.data['results']) == 1
    
    def test_update_own_note(self, authenticated_client, user):
        note = Note.objects.create(title='Old', content='...', author=user)
        response = authenticated_client.patch(f'/api/notes/{note.id}/', {
            'title': 'Updated'
        })
        assert response.status_code == 200
        assert response.data['title'] == 'Updated'
    
    def test_cannot_update_others_note(self, authenticated_client, other_user):
        note = Note.objects.create(title='Other', content='...', author=other_user)
        response = authenticated_client.patch(f'/api/notes/{note.id}/', {
            'title': 'Hacked'
        })
        assert response.status_code == 403
```

**Files**: `examples/crud-api/tests/test_notes_api.py`

### T066 – Create conftest.py with fixtures

**Purpose**: Shared pytest fixtures.

**Content**:
```python
# examples/crud-api/tests/conftest.py
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='other@example.com',
        password='testpass123'
    )
```

**Files**: `examples/crud-api/tests/conftest.py`

### T067 – Write `examples/crud-api/README.md`

**Purpose**: Step-by-step walkthrough.

**Content Structure**:
1. **Overview**: What this example demonstrates
2. **Prerequisites**: Django, DRF knowledge
3. **Setup**:
   ```bash
   cd examples/crud-api
   pip install -e .
   python manage.py migrate
   ```
4. **Code Walkthrough**: Explain each file
5. **API Usage Examples**: curl commands
6. **Running Tests**: `pytest`
7. **Key Patterns**: What to learn from this

**Files**: `examples/crud-api/README.md`

### T068 – Create smoke test for CI

**Purpose**: Lightweight test for CI integration.

**Content**:
```python
# tests/examples/test_crud_api_smoke.py
"""Smoke tests for crud-api example."""
import subprocess
import sys

def test_crud_api_example_tests_pass():
    """Verify the crud-api example tests pass."""
    result = subprocess.run(
        [sys.executable, '-m', 'pytest', 'examples/crud-api/tests/', '-v'],
        capture_output=True,
        text=True
    )
    assert result.returncode == 0, f"Tests failed:\n{result.stdout}\n{result.stderr}"
```

**Files**: `tests/examples/test_crud_api_smoke.py`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Core API changes break example | Pin Core version; include in CI |
| Example too complex | Keep to essential CRUD patterns |

## Definition of Done Checklist

- [x] T059: Directory structure created
- [x] T060: pyproject.toml configured
- [x] T061: Note model with Core patterns
- [x] T062: Serializer with validation
- [x] T063: ViewSet with permissions
- [x] T064: URL routing configured
- [x] T065: Pytest tests for CRUD
- [x] T066: conftest.py with fixtures
- [x] T067: README with walkthrough
- [x] T068: Smoke test for CI
- [x] Example runs successfully
- [x] `tasks.md` updated with completion status

## Review Guidance

- Run example end-to-end
- Verify tests pass
- Check README is clear for beginners

## Activity Log

- 2025-12-04T21:30:00Z – system – lane=planned – Prompt created.
- 2025-12-05T08:46:31Z – system – shell_pid= – lane=doing – Started implementation of CRUD API example
- 2025-12-05T09:09:05Z – system – shell_pid= – lane=done – Approved without changes: all subtasks complete, smoke tests pass
