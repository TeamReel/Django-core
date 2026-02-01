---
work_package_id: WP03
title: ViewSets & API Endpoints
priority: P1
lane: for_review
assignee: claude
agent: claude
shell_pid: "18452"
subtasks:
  - T015
  - T016
  - T017
  - T018
  - T019
  - T020
  - T021
  - T022
estimated_hours: 5
dependencies:
  - WP01
  - WP02
history:
  - date: 2026-02-01
    action: created
    by: spec-kitty.tasks
activity_log:
  - timestamp: 2026-02-01T16:00:00Z
    agent: claude
    shell_pid: "18452"
    lane: doing
    note: "Started implementation of ViewSets and token resolution API"
  - timestamp: 2026-02-01T16:30:00Z
    agent: claude
    shell_pid: "18452"
    lane: doing
    note: "Completed all 8 subtasks: BrandProfileViewSet, DesignTokenViewSet, BrandAssetViewSet, TokenResolutionView with pagination and query optimization"
---

# Work Package 03: ViewSets & API Endpoints

## Objective

Implement DRF ViewSets for CRUD operations and the special token resolution endpoint that handles merge inheritance.

## Context

**Location**: `src/branding/views.py`, `src/branding/urls.py`
**Critical Component**: Token resolution endpoint is the primary consumer interface

## Implementation Guide

### T015-T017: Standard ViewSets

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch
from .models import BrandProfile, DesignToken, BrandAsset
from .serializers import (
    BrandProfileSerializer,
    BrandProfileDetailSerializer,
    DesignTokenSerializer,
    BrandAssetSerializer
)


class BrandProfileViewSet(viewsets.ModelViewSet):
    """CRUD operations for BrandProfile."""

    queryset = BrandProfile.objects.select_related(
        'organisation', 'project', 'created_by', 'updated_by'
    ).prefetch_related('design_tokens', 'brand_assets')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BrandProfileDetailSerializer
        return BrandProfileSerializer

    def get_queryset(self):
        qs = super().get_queryset()

        # Filter by organisation
        org_id = self.request.query_params.get('organisation')
        if org_id:
            qs = qs.filter(organisation_id=org_id)

        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class DesignTokenViewSet(viewsets.ModelViewSet):
    """CRUD operations for DesignToken."""

    serializer_class = DesignTokenSerializer

    def get_queryset(self):
        profile_id = self.kwargs.get('profile_pk')
        qs = DesignToken.objects.filter(profile_id=profile_id)

        # Filter by type
        token_type = self.request.query_params.get('type')
        if token_type:
            qs = qs.filter(type=token_type)

        # Search by key
        key_search = self.request.query_params.get('key')
        if key_search:
            qs = qs.filter(key__icontains=key_search)

        return qs.select_related('profile')


class BrandAssetViewSet(viewsets.ModelViewSet):
    """CRUD operations for BrandAsset."""

    serializer_class = BrandAssetSerializer

    def get_queryset(self):
        profile_id = self.kwargs.get('profile_pk')
        qs = BrandAsset.objects.filter(profile_id=profile_id)

        # Filter by asset_type
        asset_type = self.request.query_params.get('asset_type')
        if asset_type:
            qs = qs.filter(asset_type=asset_type)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')

        return qs.select_related('profile', 'file')
```

---

### T018-T019: Token Resolution Endpoint (Critical)

This is the PRIMARY API endpoint for consuming brand data:

```python
from rest_framework.views import APIView


class TokenResolutionView(APIView):
    """Resolve merged brand tokens for a project or organisation."""

    def get(self, request):
        """
        GET /api/branding/tokens/resolve/?project=<uuid>

        Returns merged token set (project overrides org).
        """
        project_id = request.query_params.get('project')
        org_id = request.query_params.get('organisation')

        if not project_id and not org_id:
            return Response(
                {'error': 'Either project or organisation parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tokens = {}
        org_brand = None
        project_brand = None

        # Get project brand (if applicable)
        if project_id:
            from src.projects.models import Project
            try:
                project = Project.objects.select_related('organisation').get(id=project_id)
                project_brand = BrandProfile.objects.filter(
                    project=project,
                    is_active=True
                ).prefetch_related('design_tokens').first()

                # Fallback to org brand
                if project.organisation:
                    org_id = project.organisation.id
            except Project.DoesNotExist:
                return Response(
                    {'error': 'Project not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Get org brand
        if org_id:
            org_brand = BrandProfile.objects.filter(
                organisation_id=org_id,
                is_active=True
            ).prefetch_related('design_tokens').first()

        # Merge tokens: org first, project overrides
        if org_brand:
            for token in org_brand.design_tokens.all():
                tokens[token.key] = token.value

        if project_brand:
            for token in project_brand.design_tokens.all():
                tokens[token.key] = token.value

        # Build response
        response_data = {
            'project': project_id,
            'organisation': org_id,
            'tokens': tokens,
            'source': 'merged' if (org_brand and project_brand) else
                     'project' if project_brand else
                     'organisation' if org_brand else 'none',
            'project_brand_id': str(project_brand.id) if project_brand else None,
            'org_brand_id': str(org_brand.id) if org_brand else None,
        }

        # Optionally include assets
        include_assets = request.query_params.get('include_assets', '').lower() == 'true'
        if include_assets:
            assets = {}
            brand = project_brand or org_brand
            if brand:
                for asset in brand.brand_assets.filter(is_active=True).select_related('file'):
                    assets[asset.asset_type] = {
                        'url': asset.get_url(),
                        'alt_text': asset.alt_text,
                    }
            response_data['assets'] = assets

        return Response(response_data)
```

**Key Points**:
- Single query to fetch both brands with prefetch
- Merge logic: org tokens → project tokens override
- Graceful handling of missing brands
- Optional asset inclusion

---

### T020: Pagination

```python
from rest_framework.pagination import PageNumberPagination


class BrandPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# Apply to ViewSets
class BrandProfileViewSet(viewsets.ModelViewSet):
    pagination_class = BrandPagination
    # ... rest of implementation
```

---

### T021-T022: URL Configuration

**`src/branding/urls.py`**:

```python
from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    BrandProfileViewSet,
    DesignTokenViewSet,
    BrandAssetViewSet,
    TokenResolutionView
)

router = routers.SimpleRouter()
router.register(r'profiles', BrandProfileViewSet, basename='brandprofile')

# Nested routes for tokens and assets
profile_router = routers.NestedSimpleRouter(router, r'profiles', lookup='profile')
profile_router.register(r'tokens', DesignTokenViewSet, basename='designtoken')
profile_router.register(r'assets', BrandAssetViewSet, basename='brandasset')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(profile_router.urls)),
    path('tokens/resolve/', TokenResolutionView.as_view(), name='token-resolve'),
]
```

**`src/config/urls.py`** (add):

```python
urlpatterns = [
    # ... existing patterns
    path('api/branding/', include('src.branding.urls')),
]
```

---

## Definition of Done

- [ ] All ViewSets implemented with proper query optimization
- [ ] Token resolution endpoint functional with merge logic
- [ ] URL routing configured (nested routes for tokens/assets)
- [ ] Pagination applied
- [ ] Query params filtering works (org, project, type, active)
- [ ] select_related/prefetch_related optimized
- [ ] Manual testing via curl/Postman successful

---

## Testing Examples

```bash
# List profiles
curl http://localhost:8000/api/branding/profiles/

# Get merged tokens for project
curl "http://localhost:8000/api/branding/tokens/resolve/?project=<uuid>&include_assets=true"

# Create token
curl -X POST http://localhost:8000/api/branding/profiles/<id>/tokens/ \
  -H "Content-Type: application/json" \
  -d '{"key": "primary_color", "value": "#FF0000", "type": "color"}'
```

---

## Risks

- **Performance**: N+1 queries if select_related not used → Mitigate with query analysis
- **Merge logic bugs**: Edge cases with missing brands → Comprehensive testing
- **Pagination issues**: Token resolution returns flat dict, not paginated

## Reviewer Focus

- Token resolution merge logic correctness
- Query optimization (check Django Debug Toolbar)
- URL pattern nesting correctness
