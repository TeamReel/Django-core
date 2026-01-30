---
work_package_id: "WP03"
subtasks:
  - "T015"
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
title: "API: Sports & Configuration"
phase: "Phase 2 - API Layer"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "28336"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – API: Sports & Configuration

## ⚠️ IMPORTANT: MVP Scope

**This work package is part of the MVP scope (WP01 + WP02 + WP03).**

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Implement DRF serializers for Sport and SportConfiguration
2. Create ViewSets with proper permissions
3. Register URLs under `/api/v1/sports/`
4. OpenAPI schema matches contract spec
5. API integration tests pass

**Success Test**: Can CRUD sports via API. Configuration auto-creates with sport.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Contract**: See `kitty-specs/041-sport-configuration-templates/contracts/sport-config-api.yaml`
- **Patterns**: Follow existing DRF patterns in `src/core/views.py`
- **Constraints**:
  - Staff-only write access
  - Authenticated read access
  - Use existing pagination class

## Subtasks & Detailed Guidance

### T015 – Create Sport serializer
- **Purpose**: Serialize Sport model for API responses
- **Steps**:
  1. In `src/sport_configuration/serializers.py`:
     ```python
     from rest_framework import serializers
     from .models import Sport, SportConfiguration

     class SportConfigurationSerializer(serializers.ModelSerializer):
         class Meta:
             model = SportConfiguration
             fields = [
                 'team_size_min',
                 'team_size_max',
                 'max_substitutes',
                 'positions',
                 'formations',
                 'outfit_types',
                 'has_goalkeeper',
                 'metadata',
             ]

     class SportSerializer(serializers.ModelSerializer):
         configuration = SportConfigurationSerializer(read_only=True)

         class Meta:
             model = Sport
             fields = [
                 'id',
                 'name',
                 'slug',
                 'sport_icon',
                 'federation_metadata',
                 'is_active',
                 'configuration',
                 'created_at',
                 'updated_at',
             ]
             read_only_fields = ['id', 'created_at', 'updated_at']

     class SportCreateSerializer(serializers.ModelSerializer):
         """Serializer for creating sports with nested configuration."""

         configuration = SportConfigurationSerializer(required=False)

         class Meta:
             model = Sport
             fields = [
                 'name',
                 'slug',
                 'sport_icon',
                 'federation_metadata',
                 'is_active',
                 'configuration',
             ]

         def create(self, validated_data):
             config_data = validated_data.pop('configuration', None)
             sport = Sport.objects.create(**validated_data)

             # Auto-create configuration
             if config_data:
                 SportConfiguration.objects.create(sport=sport, **config_data)
             else:
                 SportConfiguration.objects.create(sport=sport)

             return sport
     ```
- **Files**: `src/sport_configuration/serializers.py`
- **Parallel?**: Yes

### T016 – Create Sport ViewSet
- **Purpose**: CRUD endpoints for Sport
- **Steps**:
  1. In `src/sport_configuration/views.py`:
     ```python
     from rest_framework import viewsets, permissions, status
     from rest_framework.decorators import action
     from rest_framework.response import Response
     from django_filters.rest_framework import DjangoFilterBackend
     from .models import Sport, SportConfiguration
     from .serializers import (
         SportSerializer,
         SportCreateSerializer,
         SportConfigurationSerializer,
     )

     class IsStaffOrReadOnly(permissions.BasePermission):
         def has_permission(self, request, view):
             if request.method in permissions.SAFE_METHODS:
                 return request.user.is_authenticated
             return request.user.is_staff

     class SportViewSet(viewsets.ModelViewSet):
         queryset = Sport.objects.select_related('configuration').filter(is_active=True)
         permission_classes = [IsStaffOrReadOnly]
         filter_backends = [DjangoFilterBackend]
         filterset_fields = ['is_active']
         lookup_field = 'slug'

         def get_serializer_class(self):
             if self.action in ['create', 'update', 'partial_update']:
                 return SportCreateSerializer
             return SportSerializer

         @action(detail=True, methods=['get', 'patch'])
         def configuration(self, request, slug=None):
             """Get or update sport configuration."""
             sport = self.get_object()
             config, created = SportConfiguration.objects.get_or_create(sport=sport)

             if request.method == 'PATCH':
                 serializer = SportConfigurationSerializer(
                     config,
                     data=request.data,
                     partial=True
                 )
                 serializer.is_valid(raise_exception=True)
                 serializer.save()
                 return Response(serializer.data)

             serializer = SportConfigurationSerializer(config)
             return Response(serializer.data)
     ```
- **Files**: `src/sport_configuration/views.py`
- **Parallel?**: Yes (after T015)

### T017 – Create URL configuration
- **Purpose**: Wire up API routes
- **Steps**:
  1. In `src/sport_configuration/urls.py`:
     ```python
     from django.urls import path, include
     from rest_framework.routers import DefaultRouter
     from .views import SportViewSet

     router = DefaultRouter()
     router.register(r'sports', SportViewSet, basename='sport')

     app_name = 'sport_configuration'

     urlpatterns = [
         path('', include(router.urls)),
     ]
     ```
  2. In main `urls.py`, add:
     ```python
     path('api/v1/', include('sport_configuration.urls')),
     ```
- **Files**: `src/sport_configuration/urls.py`, project `urls.py`
- **Parallel?**: No (after T016)

### T018 – Create SportConfiguration update endpoint
- **Purpose**: Allow updating configuration separately
- **Steps**:
  1. Verify the `@action` decorator in T016 handles PATCH
  2. Add validation for JSON fields:
     ```python
     def validate_positions(self, value):
         if not isinstance(value, list):
             raise serializers.ValidationError("Positions must be a list")
         return value

     def validate_formations(self, value):
         if not isinstance(value, dict):
             raise serializers.ValidationError("Formations must be a dict")
         return value
     ```
- **Files**: `src/sport_configuration/serializers.py`, `src/sport_configuration/views.py`
- **Parallel?**: Yes (after T016)

### T019 – Write API integration tests
- **Purpose**: Verify API endpoints work correctly
- **Steps**:
  1. Create `tests/sport_configuration/test_api_sports.py`:
     ```python
     import pytest
     from rest_framework.test import APIClient
     from django.contrib.auth import get_user_model

     User = get_user_model()

     @pytest.fixture
     def api_client():
         return APIClient()

     @pytest.fixture
     def staff_user(db):
         return User.objects.create_user(
             username='staff',
             password='testpass',
             is_staff=True
         )

     @pytest.fixture
     def regular_user(db):
         return User.objects.create_user(
             username='user',
             password='testpass'
         )

     class TestSportAPI:
         def test_list_sports_authenticated(self, api_client, regular_user):
             api_client.force_authenticate(regular_user)
             response = api_client.get('/api/v1/sports/')
             assert response.status_code == 200

         def test_create_sport_staff_only(self, api_client, staff_user):
             api_client.force_authenticate(staff_user)
             response = api_client.post('/api/v1/sports/', {
                 'name': 'Football',
                 'slug': 'football'
             })
             assert response.status_code == 201

         def test_create_sport_forbidden_regular_user(self, api_client, regular_user):
             api_client.force_authenticate(regular_user)
             response = api_client.post('/api/v1/sports/', {
                 'name': 'Football',
                 'slug': 'football'
             })
             assert response.status_code == 403

         def test_get_sport_by_slug(self, api_client, regular_user):
             # Create sport first, then retrieve by slug
             pass

         def test_configuration_endpoint(self, api_client, staff_user):
             # Test /sports/{slug}/configuration/
             pass
     ```
- **Files**: `tests/sport_configuration/test_api_sports.py`
- **Parallel?**: Yes (after T017)

### T020 – Add OpenAPI schema annotations
- **Purpose**: Ensure API matches contract spec
- **Steps**:
  1. Add `@extend_schema` decorators from `drf-spectacular`:
     ```python
     from drf_spectacular.utils import extend_schema, extend_schema_view

     @extend_schema_view(
         list=extend_schema(
             summary="List all sports",
             description="Returns paginated list of active sports with configurations"
         ),
         retrieve=extend_schema(
             summary="Get sport by slug",
             description="Returns single sport with full configuration"
         ),
         create=extend_schema(
             summary="Create new sport",
             description="Creates sport with optional initial configuration"
         ),
     )
     class SportViewSet(viewsets.ModelViewSet):
         ...
     ```
  2. Verify schema at `/api/v1/schema/` matches contract
- **Files**: `src/sport_configuration/views.py`
- **Parallel?**: Yes

### T021 – Manual API verification
- **Purpose**: Ensure API works in real environment
- **Steps**:
  1. Start development server
  2. Use curl/httpie to test:
     - `GET /api/v1/sports/` (list)
     - `POST /api/v1/sports/` (create)
     - `GET /api/v1/sports/football/` (retrieve by slug)
     - `PATCH /api/v1/sports/football/configuration/` (update config)
  3. Verify responses match expected format
  4. Check error responses for invalid data
- **Files**: N/A (manual testing)
- **Parallel?**: No (after all other tasks)

## Definition of Done Checklist

- [ ] SportSerializer with nested configuration
- [ ] SportCreateSerializer with auto-config creation
- [ ] SportViewSet with proper permissions
- [ ] URL routes registered under `/api/v1/sports/`
- [ ] Configuration sub-endpoint works
- [ ] API integration tests pass
- [ ] OpenAPI annotations added
- [ ] Manual verification complete
- [ ] No linting errors (ruff)
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify `select_related` prevents N+1 queries
- Check permission class allows staff write, authenticated read
- Ensure slug lookup works (not just pk)
- Test configuration auto-creation on sport create
- Verify PATCH to configuration works

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-01-30T10:06:38Z – claude – shell_pid=28336 – lane=doing – Started implementation
- 2026-01-30T10:22:25Z – claude – shell_pid=28336 – lane=for_review – Implementation complete - 116 tests passing
