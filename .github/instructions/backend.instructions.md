---
applyTo: "src/**"
---

# Backend Development — TeamReel

## Domain Context
For data model, features, and architecture docs → read `docs/ai-context-index.md`

## Stack
Django 5 + Django REST Framework. PostgreSQL. Celery (Redis broker, 4 queues). S3 storage.

## Model Conventions
- All models use `UUIDField` primary keys: `id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`
- Soft-delete pattern: `is_active` + `deleted_at` fields, override `delete()` for soft-delete
- Timestamps: `created_at = auto_now_add`, `updated_at = auto_now`
- Module docstrings at top of every `models.py`, `views.py`, `serializers.py`
- Business rules documented in model class docstrings
- Flexible metadata: `metadata = models.JSONField(default=dict, blank=True)`
- Custom managers for common query patterns (`OrganisationManager`, etc.)

## Serializer Patterns
- **Read serializer** (default): computed fields, nested representations
- **Create serializer**: write-only validation, minimal fields
- **List serializer**: lightweight subset for list endpoints (avoid N+1)
- **Basic serializer**: minimal fields for nested contexts
- Use `select_related` / `prefetch_related` in viewsets (never lazy-load in serializers)

## ViewSet Patterns
```python
class MyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MyModel.

    Endpoints:
    - POST /api/v1/my-resource/ - Create
    - GET /api/v1/my-resource/ - List (org-scoped)
    - GET /api/v1/my-resource/{id}/ - Retrieve
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    lookup_field = "slug"  # or "pk"

    def get_queryset(self):
        # Always org-scoped
        return MyModel.objects.filter(
            organisation=self.request.user.current_org
        ).select_related('related_model')

    def get_serializer_class(self):
        if self.action == 'create':
            return MyCreateSerializer
        if self.action == 'list':
            return MyListSerializer
        return MySerializer
```

## Database Rules
- **NEVER DROP TABLES** — use safe migrations only
- Use `update_or_create` for data migrations
- Leverage PostgreSQL: `SearchVector`, `JSONField`, CTEs, `distinct()`
- Add `db_index=True` on frequently filtered fields
- Validate at model level (`clean()`, validators)

## Multi-tenancy
- All data org-scoped: `organisation = FK(Organisation)`
- Querysets filter by org in `get_queryset()`
- Projects nest via `parent_project` (club → team hierarchy)
- Periods nest via `parent_period` (season → competition)

## API Conventions
- REST: standard DRF ViewSets, router registration
- Pagination: `PageNumberPagination`, default page_size=20, max=100
- URL pattern: `/api/v1/<app>/<resource>/`
- Rate limiting for sensitive endpoints
- Audit logging via `audit_log()` for write operations

## App Structure
```
src/<app_name>/
  __init__.py
  README.md          # Module documentation (required)
  apps.py
  models.py
  admin.py
  api/
    __init__.py
    serializers.py
    views.py
    urls.py
  managers.py        # Custom QuerySet managers
  services.py        # Business logic (optional)
  signals.py         # Signal handlers (optional)
  tasks.py           # Celery tasks (optional)
  tests/             # pytest test files
```

## Key Apps Reference
| App | Models | Purpose |
|-----|--------|---------|
| `organisations/` | Organisation, Membership | Multi-tenancy |
| `projects/` | Project, ProjectMembership | Club/Team hierarchy |
| `activities/` | Period, Activity, ActivityParticipation | Seasons, matches, events |
| `branding/` | BrandProfile, BrandAsset | Club identity |
| `content_generation/` | ContentTemplate, ContentField | Content type definitions |
| `generative/` | GenerationRequest, GenerationResult | AI pipeline |
| `video/` | VideoJob, VideoPreset, VideoOverlay | FFmpeg processing |
| `medialib/` | MediaItem, MediaTag | Rich media library |
| `files/` | FileAsset | S3 storage layer |
| `permissions/` | Permission, Role, RoleAssignment | RBAC |
| `workflows/` | WorkflowState, Transition | State machine |
| `credits/` | CreditBalance, CreditTransaction | AI credit system |
| `accounts/` | User, Profile | Auth (JWT) |

## Code Style
- PEP8 + type hints
- Clean imports (group: stdlib → django → third-party → local)
- Docstrings on all public classes and methods
- `help_text` on model fields for admin & API docs
- Tests: pytest, factory_boy fixtures

## Documentation
- Architecture: `docs/architecture/overview.md`
- RBAC: `docs/features/rbac-permissions.md`
- Media architecture: `docs/media/media-architecture.md`
- Video pipeline: `docs/features/video-processing.md`
- Generative: `docs/features/generative-pipeline.md`
- Workflow engine: `docs/features/workflow-engine.md`
- API reference: `docs/features/api-reference.md`
- Celery tasks: `docs/features/celery-tasks.md`
