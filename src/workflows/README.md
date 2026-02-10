# Workflows Module

**B37 Workflow Engine & State Machine** - Generic workflow state machine for business processes.

## Overview

The Workflows module provides a flexible, project-scoped workflow engine for managing state transitions in business processes. Key features:

- **Template-Based**: Define reusable workflow templates with states and transitions
- **Project-Scoped**: Workflows are isolated per project with membership-based access
- **Permission-Aware**: Role-based access control with override capabilities
- **Audit Trail**: Complete history of all state transitions
- **Extensible**: Register custom validators and hooks for business logic
- **Content-Agnostic**: Attach workflows to any Django model via GenericForeignKey

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Workflow Engine                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐│
│  │   Template   │────▶│   Instance   │────▶│   History   ││
│  │  Definition  │     │  (Runtime)   │     │   (Audit)   ││
│  └──────────────┘     └──────────────┘     └─────────────┘│
│         │                     │                             │
│         │                     │                             │
│  ┌──────▼─────────────────────▼─────────────────┐         │
│  │        Permission Overrides                   │         │
│  │  (Project-level permission customization)     │         │
│  └───────────────────────────────────────────────┘         │
│                                                              │
│  ┌───────────────┐           ┌────────────────┐           │
│  │   Validator   │           │      Hook      │           │
│  │   Registry    │           │    Registry    │           │
│  └───────────────┘           └────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Models

- **`WorkflowTemplate`**: Defines states, transitions, and permissions
  - Versioned (immutable once published)
  - JSON definition with schema validation
  - Project-scoped or global

- **`WorkflowInstance`**: Runtime execution context
  - Links to template + content object
  - Tracks current state + context (JSONB)
  - Optimistic locking via version field

- **`TransitionHistory`**: Immutable audit log
  - Records every state change
  - Tracks actor, timestamp, comment
  - Supports async hook execution (Celery task IDs)

- **`ProjectPermissionOverride`**: Permission customization
  - Override transition permissions per project
  - Cascading priority: Override > Template > Default

### 2. Services

- **`WorkflowEngine`**: Core state machine logic
  - Validates transitions against template
  - Executes validators (sync, fail-fast)
  - Fires hooks (on_exit, on_transition, on_enter)
  - Records transition history
  - Handles permission checks

### 3. Registries

- **`ValidatorRegistry`**: Decorator-based validator registration
  ```python
  @ValidatorRegistry.validator("budget_check")
  def validate_budget(instance, transition):
      if instance.context["amount"] > 10000:
          raise ValidationError("Budget exceeded")
  ```

- **`HookRegistry`**: Decorator-based hook registration
  ```python
  @HookRegistry.hook("on_enter", "approved")
  def notify_approval(instance, transition):
      send_notification(instance.created_by, "Approved!")
  ```

### 4. API (Django REST Framework)

- **`TemplateViewSet`**: CRUD for workflow templates
- **`InstanceViewSet`**: Create and query workflow instances
- **`TransitionViewSet`**: Execute state transitions
- **`PermissionOverrideViewSet`**: Manage permission overrides
- **`TransitionHistoryViewSet`**: Read-only audit trail

## Quick Start

### 1. Create a Workflow Template

```python
from workflows.models import WorkflowTemplate

template = WorkflowTemplate.objects.create(
    name="Content Approval",
    version="1.0.0",
    is_published=True,
    definition={
        "states": [
            {"name": "draft", "is_initial": True},
            {"name": "pending_review", "is_initial": False},
            {"name": "approved", "is_initial": False, "is_terminal": True}
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
            }
        ]
    }
)
```

### 2. Start a Workflow Instance

```python
from workflows.services import WorkflowService

instance = WorkflowService.create_instance(
    workflow=template,
    content_object=my_video,  # Any Django model
    project=project,
    user=request.user,
    context={"video_id": my_video.id, "title": "Match Highlights"}
)
```

### 3. Execute a Transition

```python
result = WorkflowService.execute_transition(
    instance=instance,
    action="submit",
    user=request.user,
    comment="Ready for review"
)

print(result["instance"]["current_state"])  # "pending_review"
```

### 4. Check Available Actions

```python
actions = WorkflowService.get_available_actions(
    instance=instance,
    user=request.user
)

# Returns list of actions with permission checks:
# [
#   {
#     "action": "approve",
#     "to_state": "approved",
#     "required_permission": "coach",
#     "user_has_permission": True
#   }
# ]
```

## Custom Validators

Validators are **synchronous** functions that block transitions if validation fails.

### Function Signature

```python
from django.core.exceptions import ValidationError
from workflows.models import WorkflowInstance
from workflows.registry import ValidatorRegistry

@ValidatorRegistry.validator("name")
def my_validator(instance: WorkflowInstance, transition: dict) -> None:
    """
    Validate transition preconditions.

    Args:
        instance: Workflow instance being transitioned
        transition: Transition definition from template

    Raises:
        ValidationError: If validation fails (blocks transition)
    """
    if instance.context.get("amount", 0) > 10000:
        raise ValidationError("Amount exceeds limit")
```

### Built-in Examples

See `workflows.examples` for reference implementations:

- **`budget_check`**: Validate amount against threshold
- **`completeness_check`**: Ensure required fields present
- **`approval_threshold`**: Check minimum approvals received

### Usage in Templates

Reference validators by name in transition definitions:

```json
{
  "action": "approve",
  "from_state": "pending_review",
  "to_state": "approved",
  "validators": ["budget_check", "completeness_check"]
}
```

### Error Handling

- Validators run **synchronously** during `execute_transition()`
- First validation error **stops** the transition (fail-fast)
- Error message returned to API caller
- No state change persisted if validation fails

## Custom Hooks

Hooks are **side-effect functions** that execute during transitions. They can be:
- **Synchronous** (inline execution)
- **Asynchronous** (Celery tasks, stored task ID in history)

### Function Signature

```python
from workflows.models import WorkflowInstance
from workflows.registry import HookRegistry

@HookRegistry.hook("on_enter", "approved")
def on_approval(instance: WorkflowInstance, transition: dict) -> None:
    """
    Execute side effects when entering a state.

    Args:
        instance: Workflow instance after transition
        transition: Transition definition that led here

    Note:
        - No return value expected
        - Exceptions logged but don't block transition
        - For async processing, enqueue Celery task and return task ID
    """
    send_notification(instance.created_by, "Your content was approved!")
```

### Hook Types

- **`on_exit`**: Fires when leaving a state (before transition)
- **`on_transition`**: Fires during transition (action-specific)
- **`on_enter`**: Fires when entering a state (after transition)

### Built-in Examples

See `workflows.examples` for reference implementations:

- **`on_approval_enter`**: Log approval events
- **`on_draft_exit`**: Archive draft versions
- **`on_submit_transition`**: Trigger external webhooks
- **`on_rejection_enter`**: Notify submitter of rejection
- **`on_review_exit`**: Cleanup review tasks

### Usage in Templates

Reference hooks by type and state/action name:

```json
{
  "action": "approve",
  "from_state": "pending_review",
  "to_state": "approved",
  "hooks": {
    "on_exit": ["cleanup_review_tasks"],
    "on_transition": ["log_approval"],
    "on_enter": ["notify_stakeholders", "update_metrics"]
  }
}
```

### Async Hooks (Celery Integration)

For long-running operations, hooks can enqueue Celery tasks:

```python
from celery import shared_task
from workflows.registry import HookRegistry

@shared_task(bind=True)
def async_video_processing(self, instance_id, video_url):
    """Process video in background"""
    # ... long-running work ...
    return {"status": "processed", "duration": 180}

@HookRegistry.hook("on_enter", "processing")
def trigger_video_processing(instance, transition):
    """Enqueue async task when video enters processing state"""
    video = instance.content_object
    task = async_video_processing.delay(instance.id, video.url)

    # Store task ID for status tracking
    instance.context["celery_task_id"] = task.id
    instance.save()
```

Query task status via API:
```bash
GET /api/workflows/history/{id}/hook-status/?task_id=abc-123
```

### Error Handling

- Hook exceptions are **logged** but **don't block** transitions
- State change is committed even if hooks fail
- Failed hooks recorded in logs with instance/transition context
- For critical workflows, use validators instead of hooks

## Permission Model

### Default Permissions

Permissions are checked in this order:

1. **Project Membership**: User must be a member of the project
2. **Transition Permission**: From workflow template definition
3. **Permission Override**: Project-specific overrides (if any)

### Permission Levels

- `viewer`: Read-only access
- `member`: Basic content creation
- `coach`: Review and approval rights
- `admin`: Full workflow management
- `owner`: Project-level overrides

### Override Example

```python
from workflows.models import ProjectPermissionOverride

# Allow editors to publish directly (normally admin-only)
ProjectPermissionOverride.objects.create(
    project=project,
    workflow=template,
    action_name="publish",
    required_roles=["admin", "editor"]
)
```

Now editors in this project can execute "publish" action.

## Testing

### Example Integration Test

```python
import pytest
from workflows.services import WorkflowService
from workflows.registry import ValidatorRegistry
from django.core.exceptions import ValidationError

@pytest.mark.django_db
class TestCustomValidator:
    def test_budget_validator_blocks_excessive_amount(
        self, workflow_template, project, user
    ):
        """Test budget_check validator prevents large transactions"""

        # Create instance with high amount
        instance = WorkflowService.create_instance(
            workflow=workflow_template,
            project=project,
            user=user,
            context={"amount": 15000}  # Exceeds 10k limit
        )

        # Attempt transition with budget_check validator
        with pytest.raises(ValidationError, match="exceeds budget limit"):
            WorkflowService.execute_transition(
                instance=instance,
                action="submit",
                user=user
            )

        # Verify state unchanged
        instance.refresh_from_db()
        assert instance.current_state == "draft"

    def test_custom_hook_fires_on_state_entry(
        self, workflow_instance, user, mocker
    ):
        """Test custom hook executes when entering state"""

        # Mock notification service
        mock_notify = mocker.patch("notifications.services.send")

        # Execute transition (hook should fire)
        WorkflowService.execute_transition(
            instance=workflow_instance,
            action="approve",
            user=user
        )

        # Verify hook called
        mock_notify.assert_called_once()
        assert "approved" in mock_notify.call_args[1]["template"]
```

### Test Fixtures

```python
@pytest.fixture
def workflow_template(db):
    """Create test workflow template"""
    from workflows.models import WorkflowTemplate

    return WorkflowTemplate.objects.create(
        name="Test Workflow",
        version="1.0.0",
        is_published=True,
        definition={
            "states": [...],
            "transitions": [
                {
                    "action": "submit",
                    "validators": ["budget_check"],
                    "hooks": {"on_enter": ["notify_reviewers"]}
                }
            ]
        }
    )
```

## API Reference

### Endpoints

- `POST /api/workflows/templates/` - Create workflow template
- `GET /api/workflows/templates/` - List templates
- `POST /api/workflows/instances/` - Start workflow instance
- `POST /api/workflows/instances/{id}/execute/` - Execute transition
- `GET /api/workflows/instances/{id}/available-actions/` - Check permissions
- `GET /api/workflows/history/` - Query transition history
- `POST /api/workflows/permissions/` - Create permission override

Full OpenAPI spec: `kitty-specs/048-workflow-engine-state/contracts/openapi.yaml`

## Integration with Other Modules

### B07 Projects
- Workflows are scoped to projects
- Membership determines base permissions

### B08 Authentication
- User context for permission checks
- Actor tracking in history

### B09 Audit Logging
**Purpose**: Automatic audit trail for all workflow transitions

**Integration**: The workflow engine automatically logs audit events via B09 for every state transition, instance creation, and permission change.

**Event Types**:
- `workflow.workflow_created` - New instance created
- `workflow.transition_{action}` - State transition executed
- `workflow.permission_override_created` - Permission override added

**Metadata Captured**:
- `workflow_instance_id` - Unique instance ID
- `workflow_name` - Template name
- `workflow_version` - Template version
- `current_state` - Instance state
- `from_state` / `to_state` - Transition endpoints (for transitions)
- `content_type` / `object_id` - Attached content object

**Usage Example**:
```python
from workflows.services.engine import WorkflowEngine

engine = WorkflowEngine()
history = engine.execute_transition(
    instance=workflow_instance,
    action="approve",
    user=request.user,
    comment="Approved for production"
)

# Audit event automatically created:
# - event_type: "workflow.transition_approve"
# - user: request.user
# - organization: instance.project.organisation
# - project: instance.project
# - metadata: {workflow details, from/to states}
```

**Querying Audit Logs**:
```python
from audit.models import AuditEvent

# Find all workflow transitions for a project
events = AuditEvent.objects.filter(
    project=project,
    event_type__startswith="workflow."
).order_by("-created_at")

# Find all approvals by a specific user
approvals = AuditEvent.objects.filter(
    user=user,
    event_type="workflow.transition_approve"
)
```

**Graceful Degradation**: If B09 is not available, workflow transitions still execute successfully with fallback logging to standard Python logger.

### B15 Background Tasks (Celery)
**Purpose**: Async execution of workflow hooks for expensive operations

**Integration**: The workflow engine can execute hooks asynchronously via Celery tasks, ideal for operations that may take >500ms (email, API calls, file processing).

**Task Definition**: See `src/workflows/tasks.py` for the `execute_workflow_hooks` task.

**Hook Execution Flow**:
1. Sync hooks (`on_exit`, `on_transition`, `on_enter`) execute immediately during transition
2. If async hooks configured, task spawned and `task_id` stored in `TransitionHistory`
3. Task retries on transient failures (3 attempts, exponential backoff)
4. Hooks never block transition execution (fail gracefully)

**Usage Example**:
```python
from workflows.registry import HookRegistry
from celery import shared_task

# Define async-capable hook
@HookRegistry.hook("on_enter", "processing")
def start_video_generation(instance, transition):
    """Trigger expensive async operation"""
    # This executes synchronously, so keep it fast
    # For long-running work, call a Celery task:
    from tasks import generate_video_task
    generate_video_task.delay(
        content_id=instance.object_id,
        workflow_id=instance.id
    )
```

**Query Task Status**:
```python
from workflows.models import TransitionHistory
from celery.result import AsyncResult

# Get transition history with task_id
history = TransitionHistory.objects.get(id=history_id)

if history.task_id:
    result = AsyncResult(str(history.task_id))
    print(f"Status: {result.state}")  # PENDING, SUCCESS, FAILURE
    if result.ready():
        print(f"Result: {result.get()}")
```

**Best Practices**:
- Keep sync hooks fast (<100ms)
- Use Celery tasks for: email, API calls, file processing, video generation
- Store task_id in custom metadata for status tracking
- Handle transient failures (network, rate limits) with retries
- Handle permanent failures (invalid data) without retries

### B16 Notifications (Optional)
**Purpose**: Send notifications to users on workflow events

**Integration**: Use hooks to integrate with B16 notification service when workflow states change.

**Example Hook**: See `src/workflows/examples.py` for `send_submission_notification` which demonstrates B16 integration.

**Usage Pattern**:
```python
from workflows.registry import HookRegistry

@HookRegistry.hook("on_enter", "approved")
def notify_approval(instance, transition):
    """Send notification when workflow approved"""
    try:
        from notifications.api import notification_service

        notification_service.send_notification(
            recipient_ids=[instance.created_by_id],
            notification_type="workflow_approved",
            title=f"Workflow Approved: {instance.workflow.name}",
            message=f"Your submission has been approved.",
            metadata={
                "workflow_id": str(instance.workflow_id),
                "instance_id": str(instance.id),
            },
            link=f"/workflows/{instance.id}",
        )
    except ImportError:
        logger.info("B16 not available - notification skipped")
    except Exception as e:
        logger.error(f"Notification failed: {e}")
        # Never fail workflow due to notification failure
```

**Notification Types**:
- `workflow_submitted` - New workflow submitted for review
- `workflow_approved` - Workflow approved
- `workflow_rejected` - Workflow rejected
- `workflow_state_changed` - Generic state change notification

**Graceful Degradation**: Always wrap B16 calls in try/except to prevent notification failures from blocking workflow execution.

### B22 File Storage
- Store large context data as files
- Reference by ID in instance context

### B23 WebSocket (Optional)
- Real-time workflow state updates
- Broadcast transitions to project members

## Performance Considerations

- **Query Optimization**: Use `select_related()` for instance queries
- **Context Size**: Keep context < 64KB (PostgreSQL JSONB limit)
- **History Retention**: Archive old history records periodically
- **Async Hooks**: Use Celery for expensive operations (email, video processing)
- **Indexing**: Composite indexes on (project, current_state) for filtering

## Security

- **Input Validation**: JSON schema validation on template definitions
- **Membership Checks**: All API operations verify project access
- **Audit Trail**: Complete immutable history
- **Version Control**: Optimistic locking prevents concurrent modifications
- **XSS Protection**: Context fields sanitized on render

## Migration Guide

### From Custom State Machines

If migrating from product-specific state implementations:

1. **Map States**: Extract current state logic into template definition
2. **Identify Transitions**: List all valid state changes
3. **Extract Validators**: Move business logic to custom validators
4. **Extract Side Effects**: Move notifications/webhooks to hooks
5. **Update Models**: Add `workflow_instance` property
6. **Test Thoroughly**: Integration tests for all paths

## Resources

- **Quickstart Guide**: `kitty-specs/048-workflow-engine-state/quickstart.md`
- **API Contract**: `kitty-specs/048-workflow-engine-state/contracts/openapi.yaml`
- **Data Model**: `kitty-specs/048-workflow-engine-state/data-model.md`
- **Example Code**: `src/workflows/examples.py`
- **Integration Tests**: `tests/workflows/integration/`

## Support

For questions or issues:
- Review existing examples in `workflows.examples`
- Check integration tests for usage patterns
- See quickstart guide for common scenarios
- Consult OpenAPI spec for API details

---

**Module Status**: Production-ready (10/15 work packages complete)
**Last Updated**: 2026-02-10
**Version**: 1.0.0
