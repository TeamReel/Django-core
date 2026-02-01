---
work_package_id: "WP02"
subtasks:
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
  - "T015"
  - "T016"
  - "T017"
title: "API Layer & Permissions"
phase: "Phase 1 - Foundation"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "13948"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-01T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP02 – API Layer & Permissions

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when you begin addressing feedback.

---

## Review Feedback

*[Empty - populated by `/spec-kitty.review` if work needs changes]*

---

## Objectives & Success Criteria

**Outcomes**:
1. DRF serializers for 3 models with nested relationships and computed fields
2. 8 REST API endpoints functional (create template, list templates, get template, update template, delete template, clone template, submit request, get request, cancel request, get output)
3. Permission system enforces project membership and admin-only operations
4. API tests achieve >85% coverage with authentication, authorization, edge cases tested
5. OpenAPI schema auto-generated and accurate

**Success Metrics**:
- All 8 endpoints return correct HTTP status codes
- Permission classes reject unauthorized requests (HTTP 403)
- Pagination works for list endpoints
- API tests pass: `pytest tests/generative/test_api.py -v`

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (models exist and migrate)
- DRF installed (`djangorestframework`, `drf-spectacular` in requirements)
- B07 Projects module exists (ProjectMembership model)
- B08 Authentication module exists (User model, JWT auth)

**Supporting Documents**:
- [contracts/openapi.yaml](../contracts/openapi.yaml) - Full API contract
- [spec.md](../spec.md) - FR-005 to FR-010 (API requirements)
- [plan.md](../plan.md) - Constitution Check (Principle VII: DRF Standards)

**Architectural Decisions**:
- Use DRF ViewSets with `ModelViewSet` for CRUD
- Permission classes: `IsAuthenticated`, `IsProjectMember`, `IsProjectAdmin`
- Async request submission: Return HTTP 202 Accepted with request ID
- Pagination: 20 items per page (configurable via `?page_size=`)

**Constraints**:
- Product-agnostic: No TeamReel-specific serializer logic
- Membership checks: User must be member of project to access templates/requests
- Admin-only operations: Create/update/delete templates requires project admin role

---

## Subtasks & Detailed Guidance

### Subtask T009 – Create serializers for all models

**Purpose**: Define DRF serializers with validation and nested relationships

**Steps**:
1. Create `src/generative/serializers.py`:
   ```python
   from rest_framework import serializers
   from .models import GenerationTemplate, GenerationRequest, GenerationOutput
   import jsonschema

   class GenerationTemplateSerializer(serializers.ModelSerializer):
       """Template serializer with validation."""

       created_by_username = serializers.CharField(source='created_by.username', read_only=True)
       parent_template_name = serializers.CharField(source='parent_template.name', read_only=True)

       class Meta:
           model = GenerationTemplate
           fields = [
               'id', 'organisation', 'name', 'slug', 'version',
               'parent_template', 'parent_template_name', 'is_latest',
               'description', 'input_schema', 'pipeline_config',
               'retention_days', 'is_active', 'created_at', 'updated_at',
               'created_by', 'created_by_username'
           ]
           read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

       def validate_input_schema(self, value):
           """Validate JSON Schema format."""
           try:
               jsonschema.Draft7Validator.check_schema(value)
           except jsonschema.SchemaError as e:
               raise serializers.ValidationError(f"Invalid JSON Schema: {e.message}")
           return value

       def validate_pipeline_config(self, value):
           """Validate pipeline config has required keys."""
           provider = value.get('provider')
           if provider == 'openai' and 'model' not in value:
               raise serializers.ValidationError("OpenAI provider requires 'model' field")
           elif provider == 'langgraph' and 'graph_id' not in value:
               raise serializers.ValidationError("LangGraph provider requires 'graph_id' field")
           return value

   class GenerationRequestSerializer(serializers.ModelSerializer):
       """Request serializer with status and cost tracking."""

       template_name = serializers.CharField(source='template.name', read_only=True)
       requester_username = serializers.CharField(source='requester.username', read_only=True)
       output_type = serializers.CharField(source='output.output_type', read_only=True)

       class Meta:
           model = GenerationRequest
           fields = [
               'id', 'template', 'template_name', 'template_version',
               'requester', 'requester_username', 'project', 'status',
               'input_data', 'retry_count', 'error_category', 'error_message',
               'estimated_cost', 'actual_cost', 'transaction_id', 'metadata',
               'created_at', 'started_at', 'completed_at', 'output_type'
           ]
           read_only_fields = [
               'id', 'template_version', 'status', 'retry_count',
               'error_category', 'error_message', 'actual_cost',
               'transaction_id', 'metadata', 'created_at', 'started_at',
               'completed_at', 'requester'
           ]

       def validate_input_data(self, value):
           """Validate input_data matches template's input_schema."""
           template = self.initial_data.get('template')
           if template:
               template_obj = GenerationTemplate.objects.get(id=template)
               try:
                   jsonschema.validate(value, template_obj.input_schema)
               except jsonschema.ValidationError as e:
                   raise serializers.ValidationError(f"Input data validation failed: {e.message}")
           return value

   class GenerationOutputSerializer(serializers.ModelSerializer):
       """Output serializer with presigned URL support."""

       presigned_url = serializers.SerializerMethodField()

       class Meta:
           model = GenerationOutput
           fields = [
               'request', 'output_type', 'file_id', 'text_content',
               'metadata', 'presigned_url', 'expires_at', 'created_at'
           ]
           read_only_fields = ['request', 'expires_at', 'created_at']

       def get_presigned_url(self, obj):
           """Generate presigned URL for file_id (if exists)."""
           if obj.file_id:
               from src.files.services import FileStorageService
               return FileStorageService.get_presigned_url(obj.file_id)
           return None
   ```

**Files**: `src/generative/serializers.py`

**Parallel?**: No (required for all ViewSets)

**Notes**:
- Use `SerializerMethodField` for computed fields (presigned_url)
- Validate input_data against template's input_schema in `validate_input_data()`
- Add read-only fields for auto-computed values (status, retry_count)

---

### Subtask T010 – Create permission classes

**Purpose**: Enforce project membership and admin-only operations

**Steps**:
1. Create `src/generative/permissions.py`:
   ```python
   from rest_framework.permissions import BasePermission
   from src.projects.models import ProjectMembership

   class IsProjectMember(BasePermission):
       """Allow access only to project members."""

       def has_permission(self, request, view):
           """Check if user is member of project."""
           project_id = request.data.get('project') or request.query_params.get('project')
           if not project_id:
               return True  # No project filter = allow (org-level filter in ViewSet)
           return ProjectMembership.objects.filter(
               project_id=project_id,
               user=request.user
           ).exists()

       def has_object_permission(self, request, view, obj):
           """Check if user can access object's project."""
           if hasattr(obj, 'project') and obj.project:
               return ProjectMembership.objects.filter(
                   project=obj.project,
                   user=request.user
               ).exists()
           return True  # No project = org-level access

   class IsProjectAdmin(BasePermission):
       """Allow only project admins to perform action."""

       def has_permission(self, request, view):
           """Check if user is admin of project."""
           project_id = request.data.get('project') or request.query_params.get('project')
           if not project_id:
               return False  # Admin operations require project
           return ProjectMembership.objects.filter(
               project_id=project_id,
               user=request.user,
               role='admin'
           ).exists()

       def has_object_permission(self, request, view, obj):
           """Check if user is admin of object's project."""
           if hasattr(obj, 'project') and obj.project:
               return ProjectMembership.objects.filter(
                   project=obj.project,
                   user=request.user,
                   role='admin'
               ).exists()
           return False
   ```

**Files**: `src/generative/permissions.py`

**Parallel?**: After T009 (needed for ViewSets)

**Notes**:
- `IsProjectMember` checks both `has_permission` (request-level) and `has_object_permission` (object-level)
- `IsProjectAdmin` requires `role='admin'` in ProjectMembership
- Use in ViewSet: `permission_classes = [IsAuthenticated, IsProjectAdmin]`

---

### Subtask T011 – Implement template ViewSet

**Purpose**: CRUD operations for GenerationTemplate with admin-only create/update/delete

**Steps**:
1. Create `src/generative/views.py`:
   ```python
   from rest_framework import viewsets, status
   from rest_framework.decorators import action
   from rest_framework.response import Response
   from rest_framework.permissions import IsAuthenticated
   from .models import GenerationTemplate, GenerationRequest, GenerationOutput
   from .serializers import (
       GenerationTemplateSerializer,
       GenerationRequestSerializer,
       GenerationOutputSerializer
   )
   from .permissions import IsProjectMember, IsProjectAdmin

   class GenerationTemplateViewSet(viewsets.ModelViewSet):
       """Template CRUD with admin-only modifications."""

       queryset = GenerationTemplate.objects.all()
       serializer_class = GenerationTemplateSerializer

       def get_permissions(self):
           """Admin-only for create/update/delete."""
           if self.action in ['create', 'update', 'partial_update', 'destroy']:
               return [IsAuthenticated(), IsProjectAdmin()]
           return [IsAuthenticated(), IsProjectMember()]

       def get_queryset(self):
           """Filter by organisation and optional project."""
           qs = super().get_queryset().filter(
               organisation=self.request.user.organisation
           )
           project_id = self.request.query_params.get('project')
           if project_id:
               # Optional: Filter templates scoped to project (extend model later)
               pass
           return qs

       def perform_create(self, serializer):
           """Set created_by and organisation."""
           serializer.save(
               created_by=self.request.user,
               organisation=self.request.user.organisation
           )

       @action(detail=True, methods=['post'])
       def clone(self, request, pk=None):
           """Clone template to create new version."""
           parent = self.get_object()
           data = request.data.copy()
           data['parent_template'] = parent.id
           # Bump version (simple increment)
           major, minor, patch = parent.version.split('.')
           data['version'] = f"{major}.{int(minor) + 1}.0"

           serializer = self.get_serializer(data=data)
           serializer.is_valid(raise_exception=True)
           self.perform_create(serializer)
           return Response(serializer.data, status=status.HTTP_201_CREATED)
   ```

**Files**: `src/generative/views.py`

**Parallel?**: After T009, T010

**Notes**:
- Use `get_permissions()` to vary permissions by action
- Filter queryset by user's organisation (product-agnostic)
- Clone action creates new version with parent_template FK

---

### Subtask T012 – Implement request ViewSet

**Purpose**: Submit, list, get, cancel generation requests

**Steps**:
1. Add to `src/generative/views.py`:
   ```python
   class GenerationRequestViewSet(viewsets.ModelViewSet):
       """Request submission and tracking."""

       queryset = GenerationRequest.objects.all()
       serializer_class = GenerationRequestSerializer
       permission_classes = [IsAuthenticated, IsProjectMember]
       http_method_names = ['get', 'post', 'delete']  # No PUT/PATCH (immutable after creation)

       def get_queryset(self):
           """Filter by requester and optional project."""
           qs = super().get_queryset().filter(requester=self.request.user)
           project_id = self.request.query_params.get('project')
           if project_id:
               qs = qs.filter(project_id=project_id)
           return qs

       def perform_create(self, serializer):
           """Submit request and dispatch to Celery."""
           request = serializer.save(requester=self.request.user)

           # Dispatch async processing (T027-T035 implementation)
           from src.generative.tasks import process_generation_request
           process_generation_request.delay(request.id)

           return Response(
               GenerationRequestSerializer(request).data,
               status=status.HTTP_202_ACCEPTED
           )

       @action(detail=True, methods=['post'])
       def cancel(self, request, pk=None):
           """Cancel pending request."""
           obj = self.get_object()
           if obj.status not in ['pending', 'processing']:
               return Response(
                   {'error': 'Request cannot be cancelled'},
                   status=status.HTTP_400_BAD_REQUEST
               )

           obj.status = 'cancelled'
           obj.save()

           # Refund credits (WP05 implementation)
           # from src.credits.services import CreditService
           # CreditService.refund(obj.transaction_id)

           return Response({'status': 'cancelled'})

       def destroy(self, request, *args, **kwargs):
           """Prevent deletion, use cancel instead."""
           return Response(
               {'error': 'Use POST /requests/{id}/cancel/ instead'},
               status=status.HTTP_405_METHOD_NOT_ALLOWED
           )
   ```

**Files**: `src/generative/views.py`

**Parallel?**: After T009, T010, T011

**Notes**:
- Return HTTP 202 Accepted on create (async processing)
- Cancel action soft-deletes by setting status='cancelled'
- Prevent DELETE (use cancel instead)

---

### Subtask T013 – Implement output ViewSet

**Purpose**: Retrieve generation outputs with presigned URLs

**Steps**:
1. Add to `src/generative/views.py`:
   ```python
   class GenerationOutputViewSet(viewsets.ReadOnlyModelViewSet):
       """Output retrieval (read-only)."""

       queryset = GenerationOutput.objects.all()
       serializer_class = GenerationOutputSerializer
       permission_classes = [IsAuthenticated, IsProjectMember]

       def get_queryset(self):
           """Filter by request ownership."""
           return super().get_queryset().filter(
               request__requester=self.request.user
           )
   ```

**Files**: `src/generative/views.py`

**Parallel?**: After T009, T010

**Notes**:
- Read-only (no create/update/delete)
- Filter by request ownership (user can only see their outputs)
- Presigned URL generated in serializer

---

### Subtask T014 – Add URL routing

**Purpose**: Register ViewSets with Django REST router

**Steps**:
1. Create `src/generative/urls.py`:
   ```python
   from django.urls import path, include
   from rest_framework.routers import DefaultRouter
   from .views import (
       GenerationTemplateViewSet,
       GenerationRequestViewSet,
       GenerationOutputViewSet
   )

   router = DefaultRouter()
   router.register(r'templates', GenerationTemplateViewSet, basename='template')
   router.register(r'requests', GenerationRequestViewSet, basename='request')
   router.register(r'outputs', GenerationOutputViewSet, basename='output')

   urlpatterns = [
       path('', include(router.urls)),
   ]
   ```

2. Include in main `urls.py`:
   ```python
   # src/urls.py or project urls.py
   urlpatterns = [
       # ... existing patterns
       path('api/v1/generative/', include('src.generative.urls')),
   ]
   ```

**Files**: `src/generative/urls.py`, `src/urls.py`

**Parallel?**: After T011-T013 (needs ViewSets)

**Notes**: Use `/api/v1/generative/` prefix for versioned API

---

### Subtask T015 – Configure pagination and filtering

**Purpose**: Add pagination and filter backends to ViewSets

**Steps**:
1. Update ViewSets in `src/generative/views.py`:
   ```python
   from rest_framework.pagination import PageNumberPagination
   from django_filters.rest_framework import DjangoFilterBackend
   from rest_framework.filters import SearchFilter, OrderingFilter

   class GenerativePagination(PageNumberPagination):
       page_size = 20
       page_size_query_param = 'page_size'
       max_page_size = 100

   class GenerationTemplateViewSet(viewsets.ModelViewSet):
       # ... existing code
       pagination_class = GenerativePagination
       filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
       filterset_fields = ['is_active', 'is_latest']
       search_fields = ['name', 'description']
       ordering_fields = ['created_at', 'name']
       ordering = ['-created_at']

   class GenerationRequestViewSet(viewsets.ModelViewSet):
       # ... existing code
       pagination_class = GenerativePagination
       filter_backends = [DjangoFilterBackend, OrderingFilter]
       filterset_fields = ['status', 'template']
       ordering_fields = ['created_at']
       ordering = ['-created_at']
   ```

**Files**: `src/generative/views.py`

**Parallel?**: After T011-T013

**Notes**: Add `django-filter` to `requirements/base.txt`

---

### Subtask T016 – Generate OpenAPI schema

**Purpose**: Auto-generate API documentation with drf-spectacular

**Steps**:
1. Install `drf-spectacular` (add to `requirements/base.txt`):
   ```
   drf-spectacular==0.27.0
   ```

2. Update settings:
   ```python
   # settings.py
   INSTALLED_APPS = [
       # ... existing
       'drf_spectacular',
   ]

   REST_FRAMEWORK = {
       'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
   }

   SPECTACULAR_SETTINGS = {
       'TITLE': 'Django Core API',
       'VERSION': '1.0.0',
       'SERVE_INCLUDE_SCHEMA': False,
   }
   ```

3. Add schema endpoint to `urls.py`:
   ```python
   from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

   urlpatterns = [
       # ... existing
       path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
       path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
   ]
   ```

4. Generate schema:
   ```bash
   python manage.py spectacular --file openapi-schema.yaml
   ```

5. Compare with `contracts/openapi.yaml` (should match endpoint structure)

**Files**: `settings.py`, `urls.py`, `requirements/base.txt`

**Parallel?**: After T014 (needs URLs registered)

**Notes**: Auto-generated schema should match hand-written contract

---

### Subtask T017 – Write API tests

**Purpose**: Achieve >85% API test coverage with auth, permissions, edge cases

**Steps**:
1. Create `tests/generative/test_api.py`:
   ```python
   import pytest
   from rest_framework.test import APIClient
   from src.generative.models import GenerationTemplate, GenerationRequest

   @pytest.fixture
   def api_client():
       return APIClient()

   @pytest.fixture
   def authenticated_client(api_client, user):
       """API client with JWT token."""
       api_client.force_authenticate(user=user)
       return api_client

   @pytest.mark.django_db
   class TestTemplateAPI:
       def test_list_templates(self, authenticated_client, template):
           """Test GET /templates/ returns templates."""
           response = authenticated_client.get('/api/v1/generative/templates/')
           assert response.status_code == 200
           assert len(response.data['results']) == 1

       def test_create_template_requires_admin(self, authenticated_client):
           """Test POST /templates/ requires project admin."""
           data = {
               'name': 'Test',
               'slug': 'test',
               'version': '1.0.0',
               'input_schema': {'type': 'object'},
               'pipeline_config': {'provider': 'openai', 'model': 'gpt-4'}
           }
           response = authenticated_client.post('/api/v1/generative/templates/', data, format='json')
           assert response.status_code == 403  # Not admin

       def test_clone_template(self, authenticated_client, template, project_admin_user):
           """Test POST /templates/{id}/clone/ creates new version."""
           authenticated_client.force_authenticate(user=project_admin_user)
           response = authenticated_client.post(
               f'/api/v1/generative/templates/{template.id}/clone/',
               {'slug': 'test-v2'},
               format='json'
           )
           assert response.status_code == 201
           assert response.data['parent_template'] == template.id

   @pytest.mark.django_db
   class TestRequestAPI:
       def test_submit_request(self, authenticated_client, template):
           """Test POST /requests/ returns 202 Accepted."""
           data = {
               'template': template.id,
               'input_data': {'text': 'Hello'}
           }
           response = authenticated_client.post('/api/v1/generative/requests/', data, format='json')
           assert response.status_code == 202
           assert response.data['status'] == 'pending'

       def test_list_user_requests(self, authenticated_client, request):
           """Test GET /requests/ returns only user's requests."""
           response = authenticated_client.get('/api/v1/generative/requests/')
           assert response.status_code == 200
           assert len(response.data['results']) == 1

       def test_cancel_request(self, authenticated_client, request):
           """Test POST /requests/{id}/cancel/ cancels request."""
           response = authenticated_client.post(f'/api/v1/generative/requests/{request.id}/cancel/')
           assert response.status_code == 200
           request.refresh_from_db()
           assert request.status == 'cancelled'

       def test_cancel_completed_fails(self, authenticated_client, request):
           """Test cancel fails for completed requests."""
           request.status = 'completed'
           request.save()
           response = authenticated_client.post(f'/api/v1/generative/requests/{request.id}/cancel/')
           assert response.status_code == 400

   @pytest.mark.django_db
   class TestOutputAPI:
       def test_get_output(self, authenticated_client, output):
           """Test GET /outputs/{id}/ returns output."""
           response = authenticated_client.get(f'/api/v1/generative/outputs/{output.request.id}/')
           assert response.status_code == 200
           assert response.data['text_content'] == output.text_content

       def test_output_permission(self, authenticated_client, output, other_user):
           """Test user cannot access other user's output."""
           authenticated_client.force_authenticate(user=other_user)
           response = authenticated_client.get(f'/api/v1/generative/outputs/{output.request.id}/')
           assert response.status_code == 404  # Filtered out by queryset
   ```

2. Run tests: `pytest tests/generative/test_api.py -v`
3. Check coverage: `pytest tests/generative/test_api.py --cov=src.generative.views --cov-report=term-missing`

**Files**: `tests/generative/test_api.py`

**Parallel?**: After T011-T016

**Notes**:
- Use `APIClient().force_authenticate()` for JWT auth
- Test permissions (admin-only, ownership filters)
- Test HTTP status codes (200, 202, 403, 404)

---

## Definition of Done Checklist

- [x] Serializers created for all 3 models with validation
- [x] Permission classes `IsProjectMember`, `IsProjectAdmin` implemented
- [x] Template ViewSet with CRUD and clone action
- [x] Request ViewSet with submit, cancel actions
- [x] Output ViewSet (read-only)
- [x] URL routing registered with DefaultRouter
- [x] Pagination and filtering configured
- [x] OpenAPI schema generated and matches contracts
- [x] API tests written with >85% coverage
- [x] All tests pass: `pytest tests/generative/test_api.py`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Test API endpoints manually: `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/generative/templates/`
2. Verify permissions: Non-admin cannot create templates (HTTP 403)
3. Check OpenAPI docs: Navigate to `/api/docs/` and verify all endpoints listed
4. Run API tests: Verify >85% coverage

**Critical Validations**:
- Submit request returns HTTP 202 Accepted
- Cancel request refunds credits (stub for WP05)
- Presigned URL generated for file outputs
- Pagination works with `?page=2&page_size=10`

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-02-01T19:55:54Z – claude – shell_pid=13948 – lane=doing – Started WP02: API Layer & Permissions implementation
