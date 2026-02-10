---
wp: WP05
title: B37 Workflow Integration
priority: P2
status: planned
subtasks: T041-T046
dependencies: WP02, WP04
estimated_effort: 3-4 hours
lane: "for_review"
agent: "system"
---

# WP05: B37 Workflow Integration

## Objective

Integrate optional B37 Workflow Engine for video approval flows. When a workflow template is specified, create a workflow instance attached to the video job and update workflow state on job completion.

## Context

- **B37 Workflow Engine**: Provides approval workflows with states, transitions, and assignees
- **Integration Point**: VideoJob.workflow_instance FK (nullable)
- **Use Case**: Marketing team approval before publishing video to social platforms

## Architecture

```
VideoJob Creation:
├── workflow_template specified?
│   ├── Yes → Create WorkflowInstance, attach to job
│   └── No → job.workflow_instance = None

Job Completion:
├── Has workflow_instance?
│   ├── Yes → Transition workflow to "ready_for_review"
│   └── No → No workflow action

Workflow Approved:
├── VideoJob.publishable = True
└── Enable platform export actions
```

## Subtasks

### T041: Add workflow_instance FK Handling in Serializer
Update `VideoJobCreateSerializer`:
```python
class VideoJobCreateSerializer(serializers.ModelSerializer):
    workflow_template_id = serializers.UUIDField(required=False, write_only=True)
    workflow_instance = WorkflowInstanceSerializer(read_only=True)

    def validate_workflow_template_id(self, value):
        if value and not WorkflowTemplate.objects.filter(id=value).exists():
            raise ValidationError("Workflow template not found")
        return value
```

Update `VideoJobDetailSerializer`:
```python
class VideoJobDetailSerializer(serializers.ModelSerializer):
    workflow_instance = WorkflowInstanceSerializer(read_only=True)
    workflow_status = serializers.CharField(source="workflow_instance.current_state.name", read_only=True)
```

**Acceptance**: Workflow template accepted on create, instance shown on detail

### T042: Create Workflow on Job Creation
In `VideoService.create_job()`:
```python
from src.workflow.services import WorkflowService

def create_job(self, ..., workflow_template: WorkflowTemplate = None) -> VideoJob:
    job = VideoJob.objects.create(...)

    if workflow_template:
        workflow_service = WorkflowService()
        workflow_instance = workflow_service.create_instance(
            template=workflow_template,
            content_object=job,  # GenericFK
            created_by=user,
        )
        job.workflow_instance = workflow_instance
        job.save(update_fields=["workflow_instance"])

    return job
```

**Acceptance**: Job with workflow template has attached workflow instance

### T043: Update Workflow State on Job Completion
In Celery task completion:
```python
def on_job_completed(job: VideoJob):
    if job.workflow_instance:
        workflow_service = WorkflowService()
        workflow_service.transition(
            instance=job.workflow_instance,
            action="processing_complete",  # Trigger auto-transition
            user=job.created_by,
        )
```

Define workflow transition in template:
```yaml
states:
  - name: processing
    initial: true
  - name: ready_for_review
  - name: approved
  - name: rejected

transitions:
  - from: processing
    to: ready_for_review
    action: processing_complete
    auto: true  # Triggered by system
```

**Acceptance**: Workflow transitions to "ready_for_review" on completion

### T044: Add Workflow Status to Job Detail Response
Extend `VideoJobDetailSerializer`:
```python
class VideoJobDetailSerializer(serializers.ModelSerializer):
    workflow_status = serializers.SerializerMethodField()
    workflow_assignees = serializers.SerializerMethodField()

    def get_workflow_status(self, obj):
        if obj.workflow_instance:
            return {
                "state": obj.workflow_instance.current_state.name,
                "can_transition": obj.workflow_instance.available_transitions,
            }
        return None

    def get_workflow_assignees(self, obj):
        if obj.workflow_instance:
            return [
                {"id": str(a.user.id), "name": a.user.get_full_name()}
                for a in obj.workflow_instance.assignees.all()
            ]
        return []
```

**Acceptance**: API response includes workflow state and assignees

### T045: Prevent Downstream Use of Unapproved Videos
Add `publishable` computed property:
```python
class VideoJob(models.Model):
    @property
    def publishable(self) -> bool:
        """Video can be published to platforms only if:
        1. Job completed successfully
        2. No workflow OR workflow approved
        """
        if self.status != "completed":
            return False
        if self.workflow_instance:
            return self.workflow_instance.current_state.name == "approved"
        return True
```

Add validation in platform export:
```python
class PlatformExportViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        job = serializer.validated_data["video_job"]
        if not job.publishable:
            raise PermissionDenied("Video not approved for publishing")
        serializer.save()
```

**Acceptance**: Cannot export to platform if workflow not approved

### T046: Add Workflow Transition History to API Response
Extend `VideoJobDetailSerializer`:
```python
class VideoJobDetailSerializer(serializers.ModelSerializer):
    workflow_history = serializers.SerializerMethodField()

    def get_workflow_history(self, obj):
        if obj.workflow_instance:
            return [
                {
                    "from_state": t.from_state.name,
                    "to_state": t.to_state.name,
                    "action": t.action,
                    "user": t.user.get_full_name() if t.user else "System",
                    "timestamp": t.created_at.isoformat(),
                    "comment": t.comment,
                }
                for t in obj.workflow_instance.transitions.order_by("created_at")
            ]
        return []
```

**Acceptance**: API returns full transition history

## Validation Criteria

1. Job created with workflow template has workflow instance
2. Workflow transitions on job completion
3. API shows workflow status and history
4. Cannot export unapproved videos
5. Graceful fallback when B37 not available

## Files to Modify

- `src/video/serializers/job.py`
- `src/video/services/video_service.py`
- `src/video/tasks/transcode.py` (and other tasks)
- `src/video/models/job.py` (publishable property)

## Graceful Degradation

If B37 Workflow module not installed:
```python
try:
    from src.workflow.services import WorkflowService
    WORKFLOW_AVAILABLE = True
except ImportError:
    WORKFLOW_AVAILABLE = False

def create_job(self, ..., workflow_template=None):
    if workflow_template and not WORKFLOW_AVAILABLE:
        logger.warning("Workflow requested but B37 not available")
        workflow_template = None
    # Continue without workflow
```

## Review Checklist

- [ ] FK properly configured with SET_NULL
- [ ] Workflow creation atomic with job creation
- [ ] Transition happens in task completion handler
- [ ] publishable property correctly evaluates all conditions
- [ ] History ordered by timestamp
- [ ] Graceful fallback when B37 unavailable
- [ ] No circular imports with B37 module
- [ ] Type hints on all methods

## Activity Log

- 2026-02-10T16:27:08Z – system – shell_pid= – lane=doing – Started implementation
- 2026-02-10T16:31:44Z – system – shell_pid= – lane=for_review – Workflow integration complete
