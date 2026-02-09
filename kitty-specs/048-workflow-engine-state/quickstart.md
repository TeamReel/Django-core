# Quickstart: Workflow Engine & State Machine

**Feature**: B37 Workflow Engine & State Machine
**Audience**: Developers integrating workflows into products
**Time**: 15 minutes

## Prerequisites

- Django Core-App deployed
- Admin access to create workflow templates
- Project membership (any role) for testing

## 1. Create a Workflow Template

**Via Django Admin** (`/admin/workflows/workflowtemplate/`):

1. Navigate to **Workflows > Workflow Templates**
2. Click **Add Workflow Template**
3. Fill in:
   - **Name**: "Video Approval Workflow"
   - **Version**: "1.0.0"
   - **Definition** (JSON):

```json
{
  "states": [
    {
      "name": "draft",
      "is_initial": true,
      "is_terminal": false
    },
    {
      "name": "pending_review",
      "is_initial": false,
      "is_terminal": false
    },
    {
      "name": "approved",
      "is_initial": false,
      "is_terminal": false
    },
    {
      "name": "published",
      "is_initial": false,
      "is_terminal": true
    }
  ],
  "transitions": [
    {
      "action": "submit",
      "from_state": "draft",
      "to_state": "pending_review",
      "required_permission": "member"
    },
    {
      "action": "approve",
      "from_state": "pending_review",
      "to_state": "approved",
      "required_permission": "coach"
    },
    {
      "action": "publish",
      "from_state": "approved",
      "to_state": "published",
      "required_permission": "admin"
    },
    {
      "action": "reject",
      "from_state": "pending_review",
      "to_state": "draft",
      "required_permission": "coach"
    }
  ]
}
```

4. Click **Save**

**Via API**:

```bash
curl -X POST https://api.example.com/api/workflows/templates/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Video Approval Workflow",
    "version": "1.0.0",
    "definition": { ... }
  }'
```

---

## 2. Start a Workflow Instance

Attach a workflow to a content object (e.g., a Video):

```bash
curl -X POST https://api.example.com/api/workflows/instances/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": 1,
    "project_id": 5,
    "content_type_id": 42,
    "object_id": 123,
    "context": {
      "video_id": 123,
      "title": "Match Highlights: Team A vs Team B",
      "duration": 180
    }
  }'
```

**Response**:
```json
{
  "id": 10,
  "workflow_id": 1,
  "current_state": "draft",
  "context": {
    "video_id": 123,
    "title": "Match Highlights: Team A vs Team B",
    "duration": 180
  },
  "version": 0,
  "created_at": "2026-02-09T10:30:00Z"
}
```

---

## 3. Execute a State Transition

Trigger the "submit" action:

```bash
curl -X POST https://api.example.com/api/workflows/instances/10/execute/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "comment": "Ready for coach review"
  }'
```

**Response**:
```json
{
  "instance": {
    "id": 10,
    "current_state": "pending_review",
    "version": 1,
    "updated_at": "2026-02-09T10:35:00Z"
  },
  "transition_history": {
    "id": 42,
    "from_state": "draft",
    "to_state": "pending_review",
    "action": "submit",
    "actor": {
      "id": 7,
      "email": "user@example.com"
    },
    "comment": "Ready for coach review",
    "created_at": "2026-02-09T10:35:00Z"
  }
}
```

---

## 4. Check Available Actions

See what actions the current user can execute:

```bash
curl https://api.example.com/api/workflows/instances/10/available-actions/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (for a coach):
```json
{
  "actions": [
    {
      "action": "approve",
      "to_state": "approved",
      "required_permission": "coach",
      "user_has_permission": true
    },
    {
      "action": "reject",
      "to_state": "draft",
      "required_permission": "coach",
      "user_has_permission": true
    },
    {
      "action": "publish",
      "to_state": "published",
      "required_permission": "admin",
      "user_has_permission": false
    }
  ]
}
```

---

## 5. View Transition History

Get full audit trail:

```bash
curl https://api.example.com/api/workflows/instances/10/history/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "count": 2,
  "results": [
    {
      "id": 43,
      "from_state": "pending_review",
      "to_state": "approved",
      "action": "approve",
      "actor": {"id": 8, "email": "coach@example.com"},
      "comment": "Video quality is excellent",
      "created_at": "2026-02-09T11:00:00Z"
    },
    {
      "id": 42,
      "from_state": "draft",
      "to_state": "pending_review",
      "action": "submit",
      "actor": {"id": 7, "email": "user@example.com"},
      "comment": "Ready for coach review",
      "created_at": "2026-02-09T10:35:00Z"
    }
  ]
}
```

---

## 6. (Optional) Override Permissions

Allow editors to publish directly (project admin only):

```bash
curl -X POST https://api.example.com/api/workflows/permissions/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 5,
    "workflow_id": 1,
    "action_name": "publish",
    "required_roles": ["admin", "editor"]
  }'
```

Now editors in project 5 can execute the "publish" action.

---

## 7. Django Integration Example

### In Your Models

```python
from django.db import models
from workflows.models import WorkflowInstance

class Video(models.Model):
    title = models.CharField(max_length=200)
    url = models.URLField()
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)

    @property
    def workflow_instance(self):
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(Video)
        return WorkflowInstance.objects.filter(
            content_type=ct,
            object_id=self.id
        ).first()

    @property
    def approval_state(self):
        instance = self.workflow_instance
        return instance.current_state if instance else "no_workflow"
```

### In Your Views

```python
from rest_framework.decorators import action
from rest_framework.response import Response
from workflows.services import WorkflowService

class VideoViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        video = self.get_object()

        # Get or create workflow instance
        instance = video.workflow_instance
        if not instance:
            instance = WorkflowService.create_instance(
                workflow_id=1,  # Video Approval Workflow
                content_object=video,
                project=video.project,
                user=request.user
            )

        # Execute transition
        try:
            result = WorkflowService.execute_transition(
                instance=instance,
                action="submit",
                user=request.user,
                comment=request.data.get("comment", "")
            )
            return Response(result)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)
```

---

## 8. Custom Validators & Hooks

### Register a Validator

```python
# teamreel/workflows/validators.py
from workflows.registry import ValidatorRegistry
from django.core.exceptions import ValidationError

@ValidatorRegistry.validator("video_quality_check")
def validate_video_quality(instance, transition):
    """Ensure video has thumbnail before approval"""
    video = instance.content_object

    if not video.thumbnail_url:
        raise ValidationError(
            "Video must have a thumbnail before submission"
        )

    if video.duration < 10:
        raise ValidationError(
            "Video must be at least 10 seconds long"
        )
```

### Register a Hook

```python
# teamreel/workflows/hooks.py
from workflows.registry import HookRegistry
from notifications.services import NotificationService

@HookRegistry.hook("on_enter", "pending_review")
def notify_reviewers(instance, transition):
    """Notify coaches when video needs review"""
    video = instance.content_object
    project = instance.project

    # Get all coaches in project
    coaches = project.memberships.filter(role="coach")

    for membership in coaches:
        NotificationService.send(
            recipient=membership.user,
            template="video_review_requested",
            context={
                "video_title": video.title,
                "submitter": instance.created_by.email,
                "project": project.name
            }
        )
```

### Use in Workflow Definition

Update your template definition to reference these:

```json
{
  "transitions": [
    {
      "action": "submit",
      "from_state": "draft",
      "to_state": "pending_review",
      "validators": ["video_quality_check"],
      "hooks": {
        "on_enter": ["notify_reviewers"]
      }
    }
  ]
}
```

---

## Testing

### Unit Test Example

```python
# tests/test_workflows.py
import pytest
from workflows.models import WorkflowInstance
from workflows.services import WorkflowService

@pytest.mark.django_db
def test_video_approval_flow(
    workflow_template,
    video,
    user,
    coach,
    project
):
    # Create instance
    instance = WorkflowService.create_instance(
        workflow=workflow_template,
        content_object=video,
        project=project,
        user=user
    )

    assert instance.current_state == "draft"

    # Submit for review
    WorkflowService.execute_transition(
        instance=instance,
        action="submit",
        user=user
    )
    instance.refresh_from_db()
    assert instance.current_state == "pending_review"

    # Coach approves
    WorkflowService.execute_transition(
        instance=instance,
        action="approve",
        user=coach,
        comment="Looks good!"
    )
    instance.refresh_from_db()
    assert instance.current_state == "approved"

    # Check history
    history = instance.transition_history.all()
    assert len(history) == 2
    assert history[1].action == "approve"
    assert history[1].actor == coach
```

---

## Common Patterns

### Check if Transition Allowed

```python
from workflows.services import WorkflowService

can_approve = WorkflowService.can_execute_action(
    instance=instance,
    action="approve",
    user=request.user
)

if not can_approve:
    return Response(
        {"error": "You don't have permission to approve"},
        status=403
    )
```

### Update Context Without Transition

```python
instance.context["review_count"] = instance.context.get("review_count", 0) + 1
instance.save()
```

### Query Instances by State

```python
pending_videos = WorkflowInstance.objects.filter(
    project=project,
    current_state="pending_review",
    content_type=ContentType.objects.get_for_model(Video)
).select_related('workflow', 'created_by')
```

---

## Troubleshooting

### "Invalid transition" Error
- Check workflow definition - does transition exist from current state?
- Verify state name spelling matches exactly

### "Permission denied" Error
- Check user's membership role in project
- Verify permission overrides (if any)
- Check `required_permission` in workflow definition

### "Context exceeds 64KB" Error
- Reduce context data size
- Store large data (files, transcripts) in B22 Files, reference by ID

### Concurrent Modification Error (409)
- Optimistic locking triggered
- Reload instance and retry transition

---

## Next Steps

- **Production Deployment**: See [deployment guide](../deployment.md)
- **Custom Workflows**: Create product-specific templates
- **Advanced Hooks**: Integrate with B15 Tasks for async processing
- **Analytics**: Query `TransitionHistory` for workflow metrics
- **Visual Builder**: (Future) Design workflows via UI

## Resources

- [API Reference](./contracts/openapi.yaml)
- [Data Model](./data-model.md)
- [Research & Decisions](./research.md)
- [Implementation Plan](./plan.md)
