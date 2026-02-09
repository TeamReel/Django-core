# Data Model: Workflow Engine & State Machine

**Feature**: B37 Workflow Engine & State Machine
**Date**: 2026-02-09
**Status**: Design Complete

## Entity Relationship Diagram

```
┌─────────────────────┐
│  WorkflowTemplate   │
│  (System-wide)      │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ description         │
│ version             │
│ definition (JSONB)  │◄──┐
│ is_active           │   │
│ created_at          │   │
│ updated_at          │   │
└─────────────────────┘   │
                          │
                          │ FK (snapshot)
                          │
┌─────────────────────┐   │
│  WorkflowInstance   │   │
│  (Project-scoped)   │   │
├─────────────────────┤   │
│ id (PK)             │   │
│ workflow_id (FK)    │───┘
│ workflow_snapshot   │◄───── Copy of workflow definition at creation
│   (JSONB)           │
│ project_id (FK)     │───► projects.Project
│ content_type_id (FK)│───┐
│ object_id           │   └─► ContentType framework (GenericFK)
│ current_state       │
│ context (JSONB)     │◄───── Max 64KB
│ version             │◄───── Optimistic locking
│ created_by (FK)     │───► auth.User
│ created_at          │
│ updated_at          │
└─────────────────────┘
          │
          │ 1:N
          │
          ▼
┌─────────────────────┐
│ TransitionHistory   │
│ (Audit Trail)       │
├─────────────────────┤
│ id (PK)             │
│ instance_id (FK)    │───► WorkflowInstance
│ from_state          │
│ to_state            │
│ action              │
│ actor_id (FK)       │───► auth.User
│ comment (Text)      │
│ task_id (UUID)      │◄───── Celery task ID (nullable)
│ context_snapshot    │◄───── Copy of context at transition time
│   (JSONB)           │
│ created_at          │◄───── Indexed, partitioned by month
└─────────────────────┘


┌──────────────────────────┐
│ ProjectPermissionOverride│
│ (Permission Mappings)    │
├──────────────────────────┤
│ id (PK)                  │
│ project_id (FK)          │───► projects.Project
│ workflow_id (FK)         │───► WorkflowTemplate
│ action_name              │
│ required_roles (JSONB)   │◄───── Array of role names
│ created_at               │
│ updated_at               │
└──────────────────────────┘
  UNIQUE: (project, workflow, action)
```

## Models

### WorkflowTemplate

**Purpose**: Define reusable workflow state machines

**Scope**: System-wide (one-to-many for projects)

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| name | CharField(200) | Unique, Indexed | Human-readable name |
| description | TextField | Optional | Purpose explanation |
| version | CharField(50) | | Semantic version (e.g., "1.0.0") |
| definition | JSONField | | Workflow structure (see schema below) |
| is_active | BooleanField | Default=True | Soft-delete flag |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**definition Schema**:
```json
{
  "states": [
    {
      "name": "draft",
      "is_initial": true,
      "is_terminal": false,
      "metadata": {}
    },
    {
      "name": "submitted",
      "is_initial": false,
      "is_terminal": false
    },
    {
      "name": "approved",
      "is_initial": false,
      "is_terminal": true
    }
  ],
  "transitions": [
    {
      "action": "submit",
      "from_state": "draft",
      "to_state": "submitted",
      "required_permission": "member",
      "validators": ["validate_completeness"],
      "hooks": {
        "on_exit": ["log_exit"],
        "on_transition": ["notify_reviewers"],
        "on_enter": ["start_review_timer"]
      }
    }
  ]
}
```

**Indexes**:
- `name` (unique)
- `is_active, created_at DESC`

**Validation**:
- Exactly one state with `is_initial=true`
- All `from_state` and `to_state` in transitions must exist in states array
- Action names must be unique per workflow

---

### WorkflowInstance

**Purpose**: Track a specific object's progress through a workflow

**Scope**: Project-scoped

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| workflow_id | ForeignKey | FK, Indexed | Reference to template |
| workflow_snapshot | JSONField | | Immutable copy of workflow.definition |
| project_id | ForeignKey | FK, Indexed | Scoping to project |
| content_type_id | ForeignKey | FK | GenericFK part 1 |
| object_id | PositiveIntegerField | Indexed | GenericFK part 2 |
| current_state | CharField(100) | Indexed | Current state name |
| context | JSONField | Max 64KB | Arbitrary workflow data |
| version | IntegerField | Default=0 | Optimistic locking |
| created_by | ForeignKey | FK, Indexed | User who created instance |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Indexes**:
- `(project_id, current_state)` - List instances by project and state
- `(content_type_id, object_id)` - Find workflow for specific object
- `workflow_id, created_at DESC` - List instances per template

**Validation**:
- `context` JSON must be ≤64KB (65,536 bytes)
- `current_state` must exist in `workflow_snapshot.states`
- Generic FK `content_object` must exist

**Relations**:
- `workflow`: ForeignKey(WorkflowTemplate, on_delete=PROTECT)
- `project`: ForeignKey(Project, on_delete=CASCADE)
- `content_object`: GenericForeignKey()
- `created_by`: ForeignKey(User, on_delete=SET_NULL, null=True)

---

### TransitionHistory

**Purpose**: Immutable audit trail of all state transitions

**Scope**: Per workflow instance

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| instance_id | ForeignKey | FK, Indexed | WorkflowInstance |
| from_state | CharField(100) | Indexed | Previous state |
| to_state | CharField(100) | Indexed | New state |
| action | CharField(100) | Indexed | Action name triggered |
| actor_id | ForeignKey | FK, Indexed | User who executed transition |
| comment | TextField | Optional | User-provided reason |
| task_id | UUIDField | Optional, Indexed | Celery task ID for async hooks |
| context_snapshot | JSONField | | Copy of instance.context at transition |
| created_at | DateTimeField | auto_now_add, Indexed | Timestamp |

**Indexes**:
- `(instance_id, created_at DESC)` - Get history for instance
- `created_at DESC` - Partitioning key
- `task_id` - Query hook execution status
- `(from_state, to_state)` - Analytics queries

**Partitioning Strategy**:
```sql
-- Partition by month for scalability
CREATE TABLE transition_history (
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE transition_history_2026_02 PARTITION OF transition_history
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

**Relations**:
- `instance`: ForeignKey(WorkflowInstance, on_delete=CASCADE)
- `actor`: ForeignKey(User, on_delete=SET_NULL, null=True)

**Immutability**:
- No updates or deletes allowed after creation
- Enforced at model level (no `save()` after creation)

---

### ProjectPermissionOverride

**Purpose**: Customize transition permissions per project

**Scope**: Per project + workflow combination

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK | Primary key |
| project_id | ForeignKey | FK, Indexed | Project scope |
| workflow_id | ForeignKey | FK, Indexed | Workflow template |
| action_name | CharField(100) | Indexed | Action to override |
| required_roles | JSONField | | Array of role names |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**required_roles Schema**:
```json
["admin", "coach"]  // Either role can execute this action
```

**Indexes**:
- Unique constraint: `(project_id, workflow_id, action_name)`
- `project_id, workflow_id` - List overrides for project

**Validation**:
- `action_name` must exist in `workflow.definition.transitions`
- `required_roles` must be valid membership role names

**Relations**:
- `project`: ForeignKey(Project, on_delete=CASCADE)
- `workflow`: ForeignKey(WorkflowTemplate, on_delete=CASCADE)

**Permission Resolution**:
```python
def get_required_roles(project, workflow, action):
    # Try override first
    override = ProjectPermissionOverride.objects.filter(
        project=project,
        workflow=workflow,
        action_name=action
    ).first()

    if override:
        return override.required_roles

    # Fall back to template default
    transition = workflow.get_transition(action)
    return [transition.required_permission] if transition else []
```

---

## Registry Patterns (Non-Model)

### ValidatorRegistry

**Purpose**: Register custom validation functions

**Storage**: In-memory dict loaded at Django app ready

**Interface**:
```python
from workflows.registry import ValidatorRegistry

@ValidatorRegistry.validator("budget_check")
def validate_budget(instance: WorkflowInstance, transition: dict) -> None:
    if instance.context.get("amount", 0) > 10000:
        raise ValidationError("Amount exceeds budget limit")

# Usage
validator = ValidatorRegistry.get("budget_check")
validator(instance, transition)
```

**Registry Structure**:
```python
{
  "budget_check": <function validate_budget>,
  "completeness_check": <function validate_completeness>,
  ...
}
```

---

### HookRegistry

**Purpose**: Register lifecycle hooks for state transitions

**Storage**: In-memory dicts (one per hook type)

**Interface**:
```python
from workflows.registry import HookRegistry

@HookRegistry.hook("on_enter", "approved")
def on_approval_enter(instance: WorkflowInstance, transition: dict):
    # Send notification
    notify_stakeholders(instance)

@HookRegistry.hook("on_exit", "draft")
def on_draft_exit(instance: WorkflowInstance, transition: dict):
    # Log audit event
    log_submission(instance, transition)
```

**Registry Structure**:
```python
{
  "on_enter": {
    "approved": [<function on_approval_enter>],
    "submitted": [<function on_submission_enter>]
  },
  "on_exit": {
    "draft": [<function on_draft_exit>]
  },
  "on_transition": {
    "submit": [<function on_submit_transition>]
  }
}
```

---

## Constraints & Business Rules

### WorkflowTemplate
1. **Unique initial state**: Exactly one state must have `is_initial=true`
2. **State consistency**: All transition `from_state` and `to_state` must reference valid state names
3. **Action uniqueness**: Action names must be unique within a workflow
4. **Soft-delete protection**: Cannot delete template with active instances (must use `is_active=False`)

### WorkflowInstance
1. **Snapshot immutability**: `workflow_snapshot` never changes after creation
2. **Context size limit**: `context` JSON ≤ 64KB
3. **State validity**: `current_state` must exist in `workflow_snapshot.states`
4. **Version increment**: `version` increments on every transition (optimistic locking)
5. **Project scoping**: Instance must belong to exactly one project

### TransitionHistory
1. **Immutability**: Records cannot be updated or deleted after creation
2. **State consistency**: `from_state` and `to_state` must match instance states at transition time
3. **Actor requirement**: `actor_id` is nullable (for system-triggered transitions)
4. **Task tracking**: `task_id` populated only for async hooks

### ProjectPermissionOverride
1. **Unique mapping**: Only one override per (project, workflow, action) tuple
2. **Action validation**: `action_name` must exist in workflow definition
3. **Role validation**: `required_roles` must contain valid membership role names
4. **Cascade delete**: Deleting project or workflow removes associated overrides

---

## Migration Strategy

### Initial Migration (001_initial)
```python
operations = [
    migrations.CreateModel(
        name='WorkflowTemplate',
        fields=[...],
    ),
    migrations.CreateModel(
        name='WorkflowInstance',
        fields=[...],
    ),
    migrations.CreateModel(
        name='TransitionHistory',
        fields=[...],
    ),
    migrations.CreateModel(
        name='ProjectPermissionOverride',
        fields=[...],
    ),
    # Indexes
    migrations.AddIndex(
        model_name='workflowinstance',
        index=models.Index(fields=['project', 'current_state'], name='wi_proj_state_idx'),
    ),
    # ... more indexes
]
```

### Partitioning Migration (002_partition_history)
```python
operations = [
    migrations.RunSQL(
        sql="""
        -- Convert to partitioned table
        ALTER TABLE transition_history
        SET (partitioned by range (created_at));

        -- Create initial partitions
        CREATE TABLE transition_history_2026_02 PARTITION OF transition_history
          FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
        """,
        reverse_sql="-- Rollback not supported for partitioning"
    ),
]
```

---

## Example Queries

### Create workflow instance
```python
instance = WorkflowInstance.objects.create(
    workflow=template,
    workflow_snapshot=template.definition,
    project=project,
    content_object=video,  # Generic FK
    current_state="draft",
    context={"video_id": video.id, "priority": "high"},
    created_by=user
)
```

### Execute transition
```python
from django.db import transaction

with transaction.atomic():
    # Optimistic locking
    instance = WorkflowInstance.objects.select_for_update().get(
        id=instance_id,
        version=expected_version
    )

    # Validate transition
    if not instance.can_transition_to("submitted"):
        raise ValidationError("Invalid transition")

    # Record history
    history = TransitionHistory.objects.create(
        instance=instance,
        from_state=instance.current_state,
        to_state="submitted",
        action="submit",
        actor=user,
        comment="Ready for review",
        context_snapshot=instance.context
    )

    # Update state
    instance.current_state = "submitted"
    instance.version += 1
    instance.save()
```

### Query history
```python
# Get full history for instance
history = TransitionHistory.objects.filter(
    instance=instance
).select_related('actor').order_by('-created_at')

# Get transitions by specific user
user_transitions = TransitionHistory.objects.filter(
    instance__project=project,
    actor=user
).count()
```

### Check permissions
```python
from projects.models import Membership

def can_execute_action(user, instance, action):
    # Get required roles (override or default)
    override = ProjectPermissionOverride.objects.filter(
        project=instance.project,
        workflow=instance.workflow,
        action_name=action
    ).first()

    required_roles = override.required_roles if override else [
        t["required_permission"]
        for t in instance.workflow_snapshot["transitions"]
        if t["action"] == action
    ][0]

    # Check membership
    membership = Membership.objects.get(
        user=user,
        project=instance.project
    )

    return membership.role in required_roles
```

---

## Future Enhancements

### Deferred to Post-MVP

1. **Workflow Versioning**: Create new template versions while keeping old instances stable
2. **Conditional Transitions**: Support complex transition rules (e.g., "can only approve if review_count >= 2")
3. **Parallel States**: Support multiple concurrent states (e.g., "pending_legal AND pending_finance")
4. **Workflow Composition**: Nest workflows within workflows
5. **Visual Designer**: UI to build workflows graphically
6. **Workflow Analytics**: Dashboards for bottleneck detection, average time per state
