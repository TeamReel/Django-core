---
wp: WP02
title: Serializers & API Views
priority: P0
status: planned
subtasks: T010-T020
dependencies: WP01
estimated_effort: 4-6 hours
lane: "doing"
agent: "claude"
shell_pid: "71676"
---

# WP02: Serializers & API Views

## Objective

Implement DRF serializers and ViewSets for all 8 API endpoints defined in `contracts/openapi.yaml`. Enable CRUD operations for video jobs with proper project membership permissions.

## Context

- **API Contract**: `kitty-specs/049-video-processing-pipeline/contracts/openapi.yaml`
- **Data Model**: `kitty-specs/049-video-processing-pipeline/data-model.md`
- **Depends On**: WP01 (models must exist)

## Subtasks

### T010: Create VideoJobSerializer [P]
Implement in `src/video/serializers/job.py`:
- `VideoJobListSerializer` - minimal fields for list view
- `VideoJobDetailSerializer` - all fields including nested overlays
- `VideoJobCreateSerializer` - fields for creation (source_file, job_type, preset, etc.)
- Include read-only computed fields: output_url, thumbnail_url

**Acceptance**: Serializers validate correctly, handle nested overlays

### T011: Create VideoPresetSerializer [P]
Implement in `src/video/serializers/preset.py`:
- Read-only serializer for presets
- Include all fields from model

**Acceptance**: Preset serializes correctly

### T012: Create PlatformExportSerializer [P]
Implement in `src/video/serializers/platform.py`:
- Include nested preset reference
- Include aspect_ratio formatted string

**Acceptance**: Platform export with preset info serializes

### T013: Create VideoOverlaySerializer [P]
Implement in `src/video/serializers/overlay.py`:
- Used nested in VideoJobDetailSerializer
- Include validation for position enum

**Acceptance**: Overlay serializes with all position options

### T014: Create VideoJobViewSet
Implement in `src/video/views/job.py`:
```python
class VideoJobViewSet(viewsets.ModelViewSet):
    """
    list: GET /api/v1/video/jobs/
    retrieve: GET /api/v1/video/jobs/{id}/
    create: POST /api/v1/video/jobs/
    destroy: DELETE /api/v1/video/jobs/{id}/
    retry: POST /api/v1/video/jobs/{id}/retry/
    """
```

Actions:
- `list` - Filter by project, status, job_type
- `retrieve` - Full detail with overlays
- `create` - Create job and dispatch to Celery (placeholder for now)
- `destroy` - Cancel job if pending/queued, delete if completed
- `@action retry` - Reset failed job and redispatch

**Acceptance**: All 5 actions work via Swagger

### T015: Create VideoPresetViewSet [P]
Implement in `src/video/views/preset.py`:
- Read-only ViewSet
- Filter by output_format, is_system

**Acceptance**: GET /api/v1/video/presets/ returns list

### T016: Create PlatformExportViewSet [P]
Implement in `src/video/views/platform.py`:
- Read-only ViewSet
- Filter by platform, recommended

**Acceptance**: GET /api/v1/video/platforms/ returns list

### T017: Configure URL Routing
Create `src/video/urls.py`:
```python
from rest_framework.routers import DefaultRouter
from .views import VideoJobViewSet, VideoPresetViewSet, PlatformExportViewSet

router = DefaultRouter()
router.register("jobs", VideoJobViewSet, basename="videojob")
router.register("presets", VideoPresetViewSet, basename="videopreset")
router.register("platforms", PlatformExportViewSet, basename="platformexport")

urlpatterns = router.urls
```

**Acceptance**: Router generates correct URL patterns

### T018: Register URLs in Main API Router
Update `src/core/urls.py` or `src/api/urls.py`:
```python
path("api/v1/video/", include("src.video.urls")),
```

**Acceptance**: Endpoints accessible at /api/v1/video/

### T019: Add Project Membership Permission Checks
Implement permission class or mixin:
- User must be member of job's project
- Reuse existing `ProjectMembershipMixin` from B07
- Filter queryset by user's projects

**Acceptance**: Users only see jobs from their projects

### T020: Add Pagination to Job Listing
Use PageNumberPagination with configurable page_size:
```python
class VideoJobPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
```

**Acceptance**: Jobs list is paginated, ?page=2 works

## Validation Criteria

1. All 8 endpoints appear in Swagger/OpenAPI schema
2. Create job returns 201 with job data
3. List jobs returns paginated response
4. Retry action returns 200 on failed job
5. Delete returns 204
6. Permission denied (403) for non-project members

## Files to Create/Modify

**Create**:
- `src/video/serializers/__init__.py`
- `src/video/serializers/job.py`
- `src/video/serializers/preset.py`
- `src/video/serializers/platform.py`
- `src/video/serializers/overlay.py`
- `src/video/views/__init__.py`
- `src/video/views/job.py`
- `src/video/views/preset.py`
- `src/video/views/platform.py`
- `src/video/pagination.py`

**Modify**:
- `src/video/urls.py`
- `src/core/urls.py` or `src/api/urls.py`

## Reference Implementation

See existing modules:
- `src/media/serializers/` - File serializer patterns
- `src/projects/views/` - ProjectMembershipMixin
- `src/workflow/views/` - Action decorators

## Review Checklist

- [ ] All serializers match OpenAPI contract
- [ ] ViewSet actions match spec
- [ ] Permissions enforce project membership
- [ ] Pagination configured correctly
- [ ] Filters work (status, job_type, platform)
- [ ] Nested overlays serialize correctly
- [ ] Error responses follow standard format
- [ ] Type hints on all methods

## Activity Log

- 2026-02-10T13:14:56Z – claude – shell_pid=71676 – lane=doing – Started implementation
