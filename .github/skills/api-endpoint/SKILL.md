---
name: api-endpoint
description: "Scaffolds a Django REST Framework API endpoint with model, serializer, viewset, URL routing, and org-scoping. Use when creating a new endpoint, adding a model with CRUD API, or wiring up a new resource in the backend."
compatibility: "Requires Django 5, DRF, PostgreSQL. Works in src/ directory."
metadata:
  author: teamreel
  argument-hint: "Resource name and purpose (e.g. 'Training sessions for a project period')"
---

# API Endpoint Scaffolding

Create production-ready Django REST Framework endpoints for TeamReel.

## When to use
- Adding a **single endpoint** or resource to an existing app
- Quick CRUD scaffolding for a new model

## When NOT to use
- Building a **complete new Django app** from a module spec → use `backend-module` instead

## Step 1: Identify the App

TeamReel apps live in `src/`. Check which app owns the resource:

| App | Domain |
|-----|--------|
| `organisations` | Org, Project, BrandProfile |
| `members` | Member, MemberProfile |
| `periods` | Period, Activity, Participation |
| `files` | FileAsset, uploads, S3 |
| `video` | VideoProject, Composition, FFmpeg |
| `generative` | AI generation, OpenAI/Gemini |
| `approvals` | Approval workflows |

## Step 2: Model

```python
from django.db import models
from common.models import BaseModel  # extends: id (UUID), created_at, updated_at, is_active

class ResourceName(BaseModel):
    """Describe the resource."""

    # Always link to organisation for scoping
    organisation = models.ForeignKey(
        'organisations.Organisation',
        on_delete=models.CASCADE,
        related_name='resource_names',
    )

    # Fields — always nullable or with defaults for new columns
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
```

## Step 3: Serializers

```python
from rest_framework import serializers

# Lightweight list serializer
class ResourceNameListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceName
        fields = ['id', 'title', 'created_at']

# Full detail serializer (read)
class ResourceNameDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceName
        fields = ['id', 'title', 'description', 'created_at', 'updated_at']

# Write serializer (create/update)
class ResourceNameWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceName
        fields = ['title', 'description']
```

## Step 4: ViewSet (org-scoped)

```python
from rest_framework import viewsets, permissions
from rest_framework.pagination import PageNumberPagination

class ResourceNamePagination(PageNumberPagination):
    page_size = 20
    max_page_size = 100

class ResourceNameViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ResourceNamePagination

    def get_queryset(self):
        """Org-scoped queryset — users only see their organisation's data."""
        return ResourceName.objects.filter(
            organisation=self.request.user.organisation,
            is_active=True,
        ).select_related('organisation')

    def get_serializer_class(self):
        if self.action == 'list':
            return ResourceNameListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return ResourceNameWriteSerializer
        return ResourceNameDetailSerializer

    def perform_create(self, serializer):
        serializer.save(organisation=self.request.user.organisation)
```

## Step 5: URL Routing

```python
# In src/<app>/urls.py
from rest_framework.routers import DefaultRouter
from .views import ResourceNameViewSet

router = DefaultRouter()
router.register(r'resource-names', ResourceNameViewSet, basename='resource-name')
urlpatterns = router.urls
```

## Step 6: Migration

```bash
cd src
python manage.py makemigrations <app> --name "add_resource_name"
# Review migration — no DeleteModel, no RemoveField
python manage.py migrate
```

## Required Checklist

- [ ] Model extends `BaseModel` (UUID pk, timestamps, `is_active`)
- [ ] `organisation` FK for scoping
- [ ] `get_queryset` filters by `request.user.organisation` and `is_active=True`
- [ ] `select_related`/`prefetch_related` on FK/M2M fields
- [ ] Separate list/detail/write serializers
- [ ] `PageNumberPagination` (default 20, max 100)
- [ ] `permission_classes` set
- [ ] Migration reviewed for safety (no drops)
- [ ] URL registered in app's router
