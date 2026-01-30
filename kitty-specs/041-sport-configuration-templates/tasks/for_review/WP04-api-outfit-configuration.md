---
work_package_id: "WP04"
subtasks:
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
title: "API: Outfit Configuration"
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

# Work Package Prompt: WP04 – API: Outfit Configuration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Implement DRF serializers for OutfitConfiguration
2. Create ViewSet with project filtering
3. Implement inheritance resolution endpoint
4. All endpoints scoped to project
5. API integration tests pass

**Success Test**: Can CRUD outfit configs via API. Inheritance endpoint returns resolved data.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Contract**: See `kitty-specs/041-sport-configuration-templates/contracts/sport-config-api.yaml`
- **Dependencies**: WP01 (models), WP02 (OutfitLookupService)
- **Planning Decision PL-2**: Club defaults + Team overrides pattern
- **Constraints**:
  - OutfitConfiguration always belongs to a project
  - Write access: project owner or staff
  - Read access: project members

## Subtasks & Detailed Guidance

### T022 – Create OutfitConfiguration serializer
- **Purpose**: Serialize outfit configurations for API
- **Steps**:
  1. In `src/sport_configuration/serializers.py`, add:
     ```python
     class OutfitConfigurationSerializer(serializers.ModelSerializer):
         inherited = serializers.SerializerMethodField()
         source_project_name = serializers.SerializerMethodField()

         class Meta:
             model = OutfitConfiguration
             fields = [
                 'id',
                 'project',
                 'outfit_type',
                 'colors',
                 'sponsor_config',
                 'number_font',
                 'badge_position',
                 'metadata',
                 'is_active',
                 'inherited',
                 'source_project_name',
                 'created_at',
                 'updated_at',
             ]
             read_only_fields = ['id', 'inherited', 'source_project_name', 'created_at', 'updated_at']

         def get_inherited(self, obj) -> bool:
             """Check if this config is inherited from parent."""
             request_project = self.context.get('project')
             if request_project:
                 return obj.project_id != request_project.id
             return False

         def get_source_project_name(self, obj) -> str:
             return obj.project.name if obj.project else ''


     class OutfitConfigurationCreateSerializer(serializers.ModelSerializer):
         class Meta:
             model = OutfitConfiguration
             fields = [
                 'project',
                 'outfit_type',
                 'colors',
                 'sponsor_config',
                 'number_font',
                 'badge_position',
                 'metadata',
                 'is_active',
             ]

         def validate(self, data):
             # Check unique_together constraint
             project = data.get('project')
             outfit_type = data.get('outfit_type')

             if self.instance:  # Update case
                 if OutfitConfiguration.objects.filter(
                     project=project,
                     outfit_type=outfit_type
                 ).exclude(pk=self.instance.pk).exists():
                     raise serializers.ValidationError(
                         "Outfit configuration for this type already exists"
                     )
             else:  # Create case
                 if OutfitConfiguration.objects.filter(
                     project=project,
                     outfit_type=outfit_type
                 ).exists():
                     raise serializers.ValidationError(
                         "Outfit configuration for this type already exists"
                     )

             return data
     ```
- **Files**: `src/sport_configuration/serializers.py`
- **Parallel?**: Yes

### T023 – Create OutfitConfiguration ViewSet
- **Purpose**: CRUD endpoints for outfit configurations
- **Steps**:
  1. In `src/sport_configuration/views.py`, add:
     ```python
     from .models import OutfitConfiguration
     from .serializers import (
         OutfitConfigurationSerializer,
         OutfitConfigurationCreateSerializer,
     )
     from .services import OutfitLookupService

     class OutfitConfigurationViewSet(viewsets.ModelViewSet):
         permission_classes = [permissions.IsAuthenticated]
         filter_backends = [DjangoFilterBackend]
         filterset_fields = ['project', 'outfit_type', 'is_active']

         def get_queryset(self):
             queryset = OutfitConfiguration.objects.select_related('project')

             # Filter by project if specified
             project_id = self.request.query_params.get('project')
             if project_id:
                 queryset = queryset.filter(project_id=project_id)

             return queryset.filter(is_active=True)

         def get_serializer_class(self):
             if self.action in ['create', 'update', 'partial_update']:
                 return OutfitConfigurationCreateSerializer
             return OutfitConfigurationSerializer

         @action(detail=False, methods=['get'])
         def resolved(self, request):
             """
             Get resolved outfit configurations for a project.
             Includes inherited configs from parent projects.
             """
             project_id = request.query_params.get('project')
             if not project_id:
                 return Response(
                     {'error': 'project query parameter required'},
                     status=status.HTTP_400_BAD_REQUEST
                 )

             from projects.models import Project
             try:
                 project = Project.objects.get(pk=project_id)
             except Project.DoesNotExist:
                 return Response(
                     {'error': 'Project not found'},
                     status=status.HTTP_404_NOT_FOUND
                 )

             service = OutfitLookupService()
             outfits = service.get_all_outfits(project)

             serializer = OutfitConfigurationSerializer(
                 outfits.values(),
                 many=True,
                 context={'project': project, 'request': request}
             )
             return Response(serializer.data)
     ```
- **Files**: `src/sport_configuration/views.py`
- **Parallel?**: Yes (after T022)

### T024 – Add outfit routes to URL config
- **Purpose**: Register outfit endpoints
- **Steps**:
  1. Update `src/sport_configuration/urls.py`:
     ```python
     from .views import SportViewSet, OutfitConfigurationViewSet

     router = DefaultRouter()
     router.register(r'sports', SportViewSet, basename='sport')
     router.register(r'outfits', OutfitConfigurationViewSet, basename='outfit')
     ```
  2. This creates:
     - `GET /api/v1/outfits/` - List all outfits
     - `POST /api/v1/outfits/` - Create outfit
     - `GET /api/v1/outfits/{id}/` - Get outfit
     - `PATCH /api/v1/outfits/{id}/` - Update outfit
     - `DELETE /api/v1/outfits/{id}/` - Delete outfit
     - `GET /api/v1/outfits/resolved/?project={id}` - Get resolved outfits
- **Files**: `src/sport_configuration/urls.py`
- **Parallel?**: No (after T023)

### T025 – Add project-scoped endpoint
- **Purpose**: Allow listing outfits under a project route
- **Steps**:
  1. Consider adding nested route for project context:
     ```python
     # Option A: Query param filtering (already done in T023)
     # GET /api/v1/outfits/?project=123

     # Option B: Nested route (optional enhancement)
     # GET /api/v1/projects/{id}/outfits/
     ```
  2. For Option B, add to projects app views if desired
  3. Document the chosen approach
- **Files**: `src/sport_configuration/views.py` or `src/projects/views.py`
- **Parallel?**: Yes

### T026 – Write API integration tests
- **Purpose**: Verify outfit API endpoints
- **Steps**:
  1. Create `tests/sport_configuration/test_api_outfits.py`:
     ```python
     import pytest
     from rest_framework.test import APIClient
     from sport_configuration.models import OutfitConfiguration

     class TestOutfitConfigurationAPI:
         def test_list_outfits_for_project(self, api_client, authenticated_user, project):
             response = api_client.get(f'/api/v1/outfits/?project={project.id}')
             assert response.status_code == 200

         def test_create_outfit(self, api_client, authenticated_user, project):
             response = api_client.post('/api/v1/outfits/', {
                 'project': project.id,
                 'outfit_type': 'home',
                 'colors': {'primary': '#FF0000', 'secondary': '#FFFFFF'}
             })
             assert response.status_code == 201

         def test_duplicate_outfit_type_rejected(self, api_client, authenticated_user, project):
             # Create first
             api_client.post('/api/v1/outfits/', {
                 'project': project.id,
                 'outfit_type': 'home',
                 'colors': {}
             })
             # Try duplicate
             response = api_client.post('/api/v1/outfits/', {
                 'project': project.id,
                 'outfit_type': 'home',
                 'colors': {}
             })
             assert response.status_code == 400

         def test_resolved_outfits_with_inheritance(
             self, api_client, authenticated_user, club_project, team_project
         ):
             # Create club outfit
             OutfitConfiguration.objects.create(
                 project=club_project,
                 outfit_type='home',
                 colors={'primary': '#FF0000'}
             )
             # Team should inherit
             response = api_client.get(f'/api/v1/outfits/resolved/?project={team_project.id}')
             assert response.status_code == 200
             data = response.json()
             assert len(data) == 1
             assert data[0]['inherited'] == True
     ```
- **Files**: `tests/sport_configuration/test_api_outfits.py`
- **Parallel?**: Yes (after T024)

### T027 – Add OpenAPI annotations
- **Purpose**: Document outfit endpoints in schema
- **Steps**:
  1. Add `@extend_schema` decorators:
     ```python
     @extend_schema_view(
         list=extend_schema(
             summary="List outfit configurations",
             parameters=[
                 OpenApiParameter('project', int, description='Filter by project ID'),
             ]
         ),
         resolved=extend_schema(
             summary="Get resolved outfits with inheritance",
             description="Returns all outfits for a project including inherited from parent",
             parameters=[
                 OpenApiParameter('project', int, required=True, description='Project ID'),
             ]
         ),
     )
     class OutfitConfigurationViewSet(viewsets.ModelViewSet):
         ...
     ```
- **Files**: `src/sport_configuration/views.py`
- **Parallel?**: Yes

## Definition of Done Checklist

- [ ] OutfitConfigurationSerializer with inherited field
- [ ] OutfitConfigurationCreateSerializer with validation
- [ ] OutfitConfigurationViewSet with filtering
- [ ] `/resolved/` endpoint uses OutfitLookupService
- [ ] URL routes registered
- [ ] API integration tests pass
- [ ] OpenAPI annotations added
- [ ] No linting errors (ruff)
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify `inherited` field correctly identifies parent configs
- Check unique_together validation in serializer
- Test resolved endpoint with complex inheritance chain
- Ensure project filtering doesn't leak data
- Verify select_related prevents N+1

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-01-30T10:46:18Z – claude – shell_pid=28336 – lane=doing – Started implementation of Outfit Configuration API
- 2026-01-30T10:56:28Z – claude – shell_pid=28336 – lane=for_review – Implementation complete - all 144 tests passing, ready for review
