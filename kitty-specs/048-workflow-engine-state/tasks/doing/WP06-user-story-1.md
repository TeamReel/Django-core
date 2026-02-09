---
work_package_id: "WP06"
subtasks: ["T053", "T054", "T055", "T056", "T057", "T058", "T059", "T060", "T061", "T062", "T063", "T064"]
title: "User Story 1 – Define Workflow Templates"
phase: "Phase 1 - API"
lane: "doing"
agent: "claude-sonnet-4.5"
shell_pid: "73412"
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP06 – User Story 1: Template CRUD API 🎯 MVP

## Objective
Admin can create, list, update, delete workflow templates via API.

## API Endpoints
- `GET /api/workflows/templates/` - List templates (paginated, filter by is_active)
- `POST /api/workflows/templates/` - Create template (admin only)
- `GET /api/workflows/templates/{id}/` - Get template details
- `PATCH /api/workflows/templates/{id}/` - Update (force_update logic)
- `DELETE /api/workflows/templates/{id}/` - Soft-delete (set is_active=False)

## Key Implementation
**File**: `src/workflows/views/templates.py`

```python
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from workflows.models import WorkflowTemplate, WorkflowInstance
from workflows.serializers import WorkflowTemplateSerializer


class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    queryset = WorkflowTemplate.objects.all()
    serializer_class = WorkflowTemplateSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        # Check for active instances
        force_update = self.request.query_params.get('force_update', 'false') == 'true'
        instance_count = WorkflowInstance.objects.filter(
            workflow=self.get_object()
        ).count()

        if instance_count > 0 and not force_update:
            raise ValidationError(
                f"{instance_count} active instances exist. Use force_update=true to proceed."
            )

        serializer.save()

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save()
```

## Test Scenarios (from spec.md)
1. Admin can create template
2. Non-admin gets 403
3. Update without force_update fails if active instances
4. Update with force_update=true succeeds
5. Soft-delete sets is_active=False

## Done Checklist
- [ ] ViewSet implemented
- [ ] All actions working (CRUD)
- [ ] force_update logic correct
- [ ] Permissions enforced (IsAdminUser)
- [ ] Integration tests pass
- [ ] Swagger annotations added

Activity Log: 2026-02-09T18:18:50Z – Created

## Activity Log

- 2026-02-09T19:27:38Z – claude-sonnet-4.5 – shell_pid=73412 – lane=doing – Started implementation of User Story 1 - Template CRUD API
