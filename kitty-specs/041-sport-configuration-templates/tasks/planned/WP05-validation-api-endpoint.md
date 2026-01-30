---
work_package_id: "WP05"
subtasks:
  - "T028"
  - "T029"
  - "T030"
  - "T031"
  - "T032"
  - "T033"
title: "Validation API Endpoint"
phase: "Phase 2 - API Layer"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Validation API Endpoint

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create validation endpoint that uses SportValidationService
2. Support multiple validation types (team_size, positions, formation)
3. Return structured ValidationResult as JSON
4. Non-blocking validation (warnings don't prevent operations)
5. API tests cover all validation scenarios

**Success Test**: POST to validation endpoint returns proper validation result with warnings.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Contract**: See `kitty-specs/041-sport-configuration-templates/contracts/sport-config-api.yaml`
- **Dependencies**: WP01 (models), WP02 (SportValidationService)
- **Planning Decision CL-1**: Validation warns but allows (non-blocking)
- **Constraints**:
  - Validation is advisory only
  - Must return all issues, not just first
  - Authenticated access required

## Subtasks & Detailed Guidance

### T028 – Create ValidationResult serializer
- **Purpose**: Serialize validation results for API response
- **Steps**:
  1. In `src/sport_configuration/serializers.py`, add:
     ```python
     class ValidationIssueSerializer(serializers.Serializer):
         code = serializers.CharField()
         message = serializers.CharField()
         level = serializers.CharField()
         field = serializers.CharField(allow_null=True)
         context = serializers.DictField(required=False)

     class ValidationResultSerializer(serializers.Serializer):
         is_valid = serializers.BooleanField()
         has_errors = serializers.BooleanField()
         has_warnings = serializers.BooleanField()
         issues = ValidationIssueSerializer(many=True)
     ```
- **Files**: `src/sport_configuration/serializers.py`
- **Parallel?**: Yes

### T029 – Create validation request serializers
- **Purpose**: Validate incoming validation requests
- **Steps**:
  1. Add request serializers:
     ```python
     class TeamSizeValidationRequestSerializer(serializers.Serializer):
         sport_slug = serializers.SlugField()
         player_count = serializers.IntegerField(min_value=0)

     class PositionsValidationRequestSerializer(serializers.Serializer):
         sport_slug = serializers.SlugField()
         positions = serializers.ListField(child=serializers.CharField())

     class FormationValidationRequestSerializer(serializers.Serializer):
         sport_slug = serializers.SlugField()
         formation = serializers.CharField()

     class ProjectValidationRequestSerializer(serializers.Serializer):
         project_id = serializers.IntegerField()
     ```
- **Files**: `src/sport_configuration/serializers.py`
- **Parallel?**: Yes

### T030 – Create ValidationViewSet
- **Purpose**: API endpoint for validation operations
- **Steps**:
  1. In `src/sport_configuration/views.py`, add:
     ```python
     from rest_framework.viewsets import ViewSet
     from .services import SportValidationService

     class ValidationViewSet(ViewSet):
         """
         Validation endpoints for sport configurations.

         All validations are advisory - warnings don't block operations.
         """
         permission_classes = [permissions.IsAuthenticated]

         def _get_sport_config(self, slug: str):
             """Helper to get sport configuration by slug."""
             try:
                 sport = Sport.objects.select_related('configuration').get(slug=slug)
                 return sport.configuration
             except Sport.DoesNotExist:
                 return None

         def _serialize_result(self, result):
             """Convert ValidationResult to dict for response."""
             return {
                 'is_valid': result.is_valid,
                 'has_errors': result.has_errors,
                 'has_warnings': result.has_warnings,
                 'issues': [
                     {
                         'code': issue.code,
                         'message': issue.message,
                         'level': issue.level.value,
                         'field': issue.field,
                         'context': issue.context,
                     }
                     for issue in result.issues
                 ]
             }

         @action(detail=False, methods=['post'])
         def team_size(self, request):
             """Validate team size against sport rules."""
             serializer = TeamSizeValidationRequestSerializer(data=request.data)
             serializer.is_valid(raise_exception=True)

             config = self._get_sport_config(serializer.validated_data['sport_slug'])
             if not config:
                 return Response(
                     {'error': 'Sport not found or has no configuration'},
                     status=status.HTTP_404_NOT_FOUND
                 )

             service = SportValidationService()
             result = service.validate_team_size(
                 config,
                 serializer.validated_data['player_count']
             )

             return Response(self._serialize_result(result))

         @action(detail=False, methods=['post'])
         def positions(self, request):
             """Validate positions against sport's allowed positions."""
             serializer = PositionsValidationRequestSerializer(data=request.data)
             serializer.is_valid(raise_exception=True)

             config = self._get_sport_config(serializer.validated_data['sport_slug'])
             if not config:
                 return Response(
                     {'error': 'Sport not found or has no configuration'},
                     status=status.HTTP_404_NOT_FOUND
                 )

             service = SportValidationService()
             result = service.validate_positions(
                 config,
                 serializer.validated_data['positions']
             )

             return Response(self._serialize_result(result))

         @action(detail=False, methods=['post'])
         def formation(self, request):
             """Validate formation exists in sport configuration."""
             serializer = FormationValidationRequestSerializer(data=request.data)
             serializer.is_valid(raise_exception=True)

             config = self._get_sport_config(serializer.validated_data['sport_slug'])
             if not config:
                 return Response(
                     {'error': 'Sport not found or has no configuration'},
                     status=status.HTTP_404_NOT_FOUND
                 )

             service = SportValidationService()
             result = service.validate_formation(
                 config,
                 serializer.validated_data['formation']
             )

             return Response(self._serialize_result(result))

         @action(detail=False, methods=['post'])
         def project(self, request):
             """Full validation of a project against its sport rules."""
             serializer = ProjectValidationRequestSerializer(data=request.data)
             serializer.is_valid(raise_exception=True)

             from projects.models import Project
             try:
                 project = Project.objects.get(pk=serializer.validated_data['project_id'])
             except Project.DoesNotExist:
                 return Response(
                     {'error': 'Project not found'},
                     status=status.HTTP_404_NOT_FOUND
                 )

             service = SportValidationService()
             result = service.validate_project(project)

             return Response(self._serialize_result(result))
     ```
- **Files**: `src/sport_configuration/views.py`
- **Parallel?**: No (after T028, T029)

### T031 – Register validation routes
- **Purpose**: Wire up validation endpoints
- **Steps**:
  1. Update `src/sport_configuration/urls.py`:
     ```python
     from .views import SportViewSet, OutfitConfigurationViewSet, ValidationViewSet

     router = DefaultRouter()
     router.register(r'sports', SportViewSet, basename='sport')
     router.register(r'outfits', OutfitConfigurationViewSet, basename='outfit')
     router.register(r'validation', ValidationViewSet, basename='validation')
     ```
  2. This creates:
     - `POST /api/v1/validation/team_size/`
     - `POST /api/v1/validation/positions/`
     - `POST /api/v1/validation/formation/`
     - `POST /api/v1/validation/project/`
- **Files**: `src/sport_configuration/urls.py`
- **Parallel?**: No (after T030)

### T032 – Write API integration tests
- **Purpose**: Verify validation endpoints
- **Steps**:
  1. Create `tests/sport_configuration/test_api_validation.py`:
     ```python
     import pytest
     from rest_framework.test import APIClient

     @pytest.fixture
     def football_sport(db):
         from sport_configuration.models import Sport, SportConfiguration
         sport = Sport.objects.create(name='Football', slug='football')
         SportConfiguration.objects.create(
             sport=sport,
             team_size_min=11,
             team_size_max=11,
             positions=['GK', 'LB', 'CB', 'RB', 'LM', 'CM', 'RM', 'LW', 'CF', 'RW', 'ST'],
             formations={'4-3-3': {}, '4-4-2': {}}
         )
         return sport

     class TestValidationAPI:
         def test_team_size_valid(self, api_client, authenticated_user, football_sport):
             api_client.force_authenticate(authenticated_user)
             response = api_client.post('/api/v1/validation/team_size/', {
                 'sport_slug': 'football',
                 'player_count': 11
             })
             assert response.status_code == 200
             data = response.json()
             assert data['is_valid'] == True
             assert len(data['issues']) == 0

         def test_team_size_too_small(self, api_client, authenticated_user, football_sport):
             api_client.force_authenticate(authenticated_user)
             response = api_client.post('/api/v1/validation/team_size/', {
                 'sport_slug': 'football',
                 'player_count': 8
             })
             assert response.status_code == 200
             data = response.json()
             # Still valid (warning only)
             assert data['is_valid'] == True
             assert data['has_warnings'] == True
             assert any(i['code'] == 'TEAM_TOO_SMALL' for i in data['issues'])

         def test_unknown_position_warning(self, api_client, authenticated_user, football_sport):
             api_client.force_authenticate(authenticated_user)
             response = api_client.post('/api/v1/validation/positions/', {
                 'sport_slug': 'football',
                 'positions': ['GK', 'UNKNOWN_POS']
             })
             assert response.status_code == 200
             data = response.json()
             assert data['has_warnings'] == True
             assert any(i['code'] == 'UNKNOWN_POSITION' for i in data['issues'])

         def test_unknown_formation_warning(self, api_client, authenticated_user, football_sport):
             api_client.force_authenticate(authenticated_user)
             response = api_client.post('/api/v1/validation/formation/', {
                 'sport_slug': 'football',
                 'formation': '5-5-0'
             })
             assert response.status_code == 200
             data = response.json()
             assert data['has_warnings'] == True

         def test_invalid_sport_slug(self, api_client, authenticated_user):
             api_client.force_authenticate(authenticated_user)
             response = api_client.post('/api/v1/validation/team_size/', {
                 'sport_slug': 'nonexistent',
                 'player_count': 11
             })
             assert response.status_code == 404
     ```
- **Files**: `tests/sport_configuration/test_api_validation.py`
- **Parallel?**: Yes (after T031)

### T033 – Add OpenAPI annotations for validation
- **Purpose**: Document validation endpoints
- **Steps**:
  1. Add `@extend_schema` decorators:
     ```python
     from drf_spectacular.utils import extend_schema, OpenApiExample

     @extend_schema_view(
         team_size=extend_schema(
             summary="Validate team size",
             description="Check if player count is within sport limits. Returns warnings only.",
             examples=[
                 OpenApiExample(
                     'Valid team',
                     value={'sport_slug': 'football', 'player_count': 11}
                 ),
             ]
         ),
         positions=extend_schema(
             summary="Validate positions",
             description="Check positions against sport's allowed positions list."
         ),
         formation=extend_schema(
             summary="Validate formation",
             description="Check if formation is defined for the sport."
         ),
         project=extend_schema(
             summary="Validate project",
             description="Full validation of project against its sport rules."
         ),
     )
     class ValidationViewSet(ViewSet):
         ...
     ```
- **Files**: `src/sport_configuration/views.py`
- **Parallel?**: Yes

## Definition of Done Checklist

- [ ] ValidationResult serializer matches service dataclass
- [ ] Request serializers validate all inputs
- [ ] ValidationViewSet with 4 endpoints
- [ ] Routes registered under `/api/v1/validation/`
- [ ] All endpoints return warnings (not errors) per CL-1
- [ ] API integration tests pass
- [ ] OpenAPI annotations with examples
- [ ] No linting errors (ruff)
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify warnings don't set is_valid=False
- Check error responses for invalid sport slug
- Test all validation types
- Ensure _serialize_result handles all ValidationIssue fields
- Verify authenticated-only access

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
