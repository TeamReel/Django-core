# Research: Workflow Engine & State Machine

**Feature**: B37 Workflow Engine & State Machine
**Date**: 2026-02-09
**Status**: Planning Complete

## Decisions Made

### Decision 1: State Machine Implementation Pattern

**Chosen**: Hybrid approach (JSON + Python)

**Rationale**:
- JSON storage enables admin-configurable workflows without deployments
- Python classes provide type safety, testability for validators/hooks
- Industry standard pattern (AWS Step Functions, Temporal, Airflow)
- Balances flexibility with code quality

**Alternatives Considered**:
- Pure JSON: Too flexible, hard to test, no type safety
- Code-first (django-fsm): Requires deployments for workflow changes, not admin-friendly
- Custom DSL: Overkill for MVP, maintenance burden

**Implementation Notes**:
- WorkflowTemplate.definition stores JSON schema
- Python `WorkflowEngine` class interprets JSON at runtime
- Validator/hook registries use decorator pattern for extension

---

### Decision 2: API Transition Pattern

**Chosen**: Action-based endpoints

**Rationale**:
- Domain-centric naming ("submit", "approve", "publish")
- Self-documenting, user-friendly
- Flexible - same action can trigger different transitions based on current state
- Standard pattern (GitHub Actions, CircleCI)

**Alternatives Considered**:
- Transition endpoints: Too technical, exposes state machine internals
- State updates (PATCH): Bypasses validation, unclear intent

**API Design**:
```
POST /api/workflows/instances/{id}/execute/
{
  "action": "submit",
  "comment": "Ready for review",
  "context_updates": {"review_notes": "..."}
}
```

---

### Decision 3: Permission Storage Strategy

**Chosen**: Separate ProjectPermissionOverride table

**Rationale**:
- Proper normalization - permissions are first-class concerns
- Indexable queries for authorization checks
- Supports permission management UI
- Audit-friendly (who changed what permissions when)

**Alternatives Considered**:
- Project metadata JSON: Slower queries, no indexing
- Instance-level: Too granular, permission explosion

**Schema**:
```
ProjectPermissionOverride:
  - project_id (FK)
  - workflow_id (FK)
  - action_name (str)
  - required_roles (JSON array)
  - created_at, updated_at

Unique constraint: (project, workflow, action)
```

---

### Decision 4: Registry Testing Strategy

**Chosen**: Registry isolation via dependency injection

**Rationale**:
- Proper test isolation (no global state pollution)
- Parallel test execution safe (pytest-xdist compatible)
- Easy to mock for edge cases
- Future-proof (can replace registry impl without test rewrites)

**Alternatives Considered**:
- Global registry + cleanup: Flaky in parallel execution
- Mock registry: Doesn't test real registration logic

**Implementation**:
```python
@pytest.fixture
def registry():
    return ValidatorRegistry()

def test_transition(registry):
    @registry.validator("budget_check")
    def validate_budget(instance, transition):
        return instance.context["amount"] < 1000

    # Test with isolated registry
```

---

### Decision 5: History Retention Policy

**Chosen**: Unlimited retention

**Rationale**:
- Compliance requirements (SOX, GDPR "right to explanation")
- Consistent with B09 Audit pattern
- Postgres table partitioning handles growth
- Video approval audit trails may be legally required

**Alternatives Considered**:
- TTL-based deletion: Irreversible, compliance risk
- Instance-based limits: Arbitrary cutoffs, loses context

**Scalability Plan**:
- Partition TransitionHistory table by month/year
- Index on (instance_id, created_at DESC)
- Cold storage strategy for data >2 years old

---

## Technology Stack

### Core
- **Framework**: Django 5.x
- **API**: Django REST Framework
- **Database**: PostgreSQL 15+ (JSONB support)
- **Task Queue**: Celery + Redis

### Data Storage
- **Workflow Definitions**: JSONB fields (states, transitions, hooks)
- **State Tracking**: Regular columns (current_state, version)
- **Context Data**: JSONB (64KB max per clarification)

### Testing
- **pytest** + **pytest-django** for unit/integration tests
- **factory_boy** for test data
- **pytest-xdist** for parallel execution
- **Coverage target**: >85%

---

## Integration Patterns

### B07 Projects (Membership)
```python
from projects.models import Membership

def check_permission(user, project, action):
    # Get override or fall back to template default
    override = ProjectPermissionOverride.objects.filter(
        project=project,
        action_name=action
    ).first()

    required_roles = override.required_roles if override else template_defaults[action]

    membership = Membership.objects.get(user=user, project=project)
    return membership.role in required_roles
```

### B09 Audit
```python
from audit.models import AuditEvent

def log_transition(instance, transition, actor):
    AuditEvent.objects.create(
        event_type="workflow.transition",
        user=actor,
        organization=instance.project.organization,
        project=instance.project,
        metadata={
            "instance_id": instance.id,
            "workflow": instance.workflow.name,
            "from_state": transition.from_state,
            "to_state": transition.to_state,
            "action": transition.action,
        }
    )
```

### B15 Tasks (Async Hooks)
```python
from celery import shared_task

@shared_task
def execute_hook(hook_name, instance_id, transition_data):
    hook = HookRegistry.get(hook_name)
    instance = WorkflowInstance.objects.get(id=instance_id)
    return hook(instance, transition_data)

# Trigger:
task = execute_hook.delay("on_approve", instance.id, transition_data)
TransitionHistory.objects.create(..., task_id=task.id)
```

### B16 Notifications
```python
from notifications.services import NotificationService

def trigger_notification(instance, transition):
    if "notify_on" in transition.config:
        NotificationService.send(
            recipients=transition.config["notify_on"]["recipients"],
            template="workflow_transition",
            context={
                "workflow": instance.workflow.name,
                "state": instance.current_state,
                "action": transition.action,
            }
        )
```

---

## Data Model Summary

### Core Models

**WorkflowTemplate**
- Purpose: Reusable workflow definitions
- Scope: System-wide (created by admins)
- Key fields: name, version, definition (JSONB), is_active

**WorkflowInstance**
- Purpose: Track object progress through workflow
- Scope: Project-scoped
- Key fields: workflow_snapshot (JSONB), current_state, context (JSONB, 64KB max), version (optimistic locking)
- Relations: Generic FK to any model, FK to Project

**TransitionHistory**
- Purpose: Immutable audit trail
- Scope: Per instance
- Key fields: from_state, to_state, action, actor, comment, task_id (for async hooks)
- Relations: FK to WorkflowInstance

**ProjectPermissionOverride**
- Purpose: Project-specific permission mappings
- Scope: Per project + workflow
- Key fields: action_name, required_roles (JSON array)
- Relations: FK to Project, FK to WorkflowTemplate

### Registries (In-Memory)

**ValidatorRegistry**
- Stores validator functions keyed by name
- Loaded at Django app ready time
- Accessed via `ValidatorRegistry.get("validator_name")`

**HookRegistry**
- Stores hook functions keyed by name
- Separate registries for on_enter, on_exit, on_transition
- Accessed via `HookRegistry.get("hook_type", "hook_name")`

---

## Performance Considerations

### Indexes
```sql
-- WorkflowInstance
CREATE INDEX idx_wi_project_state ON workflow_instances(project_id, current_state);
CREATE INDEX idx_wi_content ON workflow_instances(content_type_id, object_id);

-- TransitionHistory (partitioned table)
CREATE INDEX idx_th_instance_created ON transition_history(instance_id, created_at DESC);
CREATE INDEX idx_th_created ON transition_history(created_at DESC);

-- ProjectPermissionOverride
CREATE UNIQUE INDEX idx_ppo_unique ON project_permission_overrides(project_id, workflow_id, action_name);
```

### Query Optimization
- Use `select_related('workflow', 'project')` when loading instances
- Paginate history lists (default 50 per page)
- Cache workflow definitions in Redis for hot paths

---

## Extension Points

### For Downstream Products (e.g., TeamReel)

**Custom Validators**
```python
from workflows.registry import ValidatorRegistry

@ValidatorRegistry.validator("video_quality_check")
def validate_video_quality(instance, transition):
    video = instance.content_object
    if not video.thumbnail_url:
        raise ValidationError("Video must have thumbnail before approval")
    return True
```

**Custom Hooks**
```python
from workflows.registry import HookRegistry

@HookRegistry.hook("on_enter", "published")
def on_video_published(instance, transition):
    video = instance.content_object
    # Trigger encoding pipeline
    encode_video.delay(video.id)
```

**Product-Specific Workflows**
```json
{
  "name": "Video Approval Workflow",
  "states": [
    {"name": "draft", "is_initial": true},
    {"name": "pending_review", "is_terminal": false},
    {"name": "approved", "is_terminal": false},
    {"name": "published", "is_terminal": true}
  ],
  "transitions": [
    {
      "action": "submit_for_review",
      "from_state": "draft",
      "to_state": "pending_review",
      "validators": ["video_quality_check"],
      "hooks": {"on_enter": ["notify_reviewers"]}
    }
  ]
}
```

---

## Security Considerations

### Permission Checks
- All transition requests check user membership in project
- Permission overrides validated against known membership roles
- Default deny - if no permission mapping, transition forbidden

### Input Validation
- Context JSON limited to 64KB (enforced in serializer)
- State machine validates all transitions against workflow definition
- Optimistic locking prevents concurrent transition conflicts

### Audit Trail
- All transitions logged to B09 Audit immutably
- Actor, timestamp, before/after states recorded
- Task IDs stored for async hook traceability

---

## Testing Strategy

### Unit Tests
- Model validation (state machine logic)
- Serializer validation (context size limits)
- Permission checking logic
- Registry isolation

### Integration Tests
- Full transition workflow (create → execute → verify)
- Hook execution (sync + async)
- Audit logging integration
- Concurrent transition handling

### Test Data
```python
@pytest.fixture
def workflow_template(db):
    return WorkflowTemplateFactory(
        name="Test Approval",
        definition={
            "states": [
                {"name": "draft", "is_initial": True},
                {"name": "approved", "is_terminal": True}
            ],
            "transitions": [
                {
                    "action": "approve",
                    "from_state": "draft",
                    "to_state": "approved"
                }
            ]
        }
    )
```

---

## Open Questions (Deferred to Implementation)

None - all critical architectural decisions resolved during planning phase.
