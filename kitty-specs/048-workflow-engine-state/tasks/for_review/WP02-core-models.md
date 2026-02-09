---
work_package_id: "WP02"
subtasks: ["T008", "T009", "T010", "T011", "T012", "T013", "T014", "T015", "T016", "T017", "T018"]
title: "Core Models & Migrations"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "Claude"
agent: "claude"
shell_pid: "39876"
review_status: "pending"
reviewed_by: ""
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-09T20:35:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39876"
    action: "Started core models implementation"
  - timestamp: "2026-02-09T20:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "39876"
    action: "Completed all 11 subtasks, ready for code review"
---

# Work Package Prompt: WP02 – Core Models & Migrations

## Objectives & Success Criteria

**Goal**: Implement all database models with indexes, constraints per data-model.md.

**Success Criteria**:
- All 4 models created: WorkflowTemplate, WorkflowInstance, TransitionHistory, ProjectPermissionOverride
- Migrations apply cleanly (`python manage.py migrate workflows`)
- Models can be created/queried via Django ORM
- Type hints present on all fields and methods
- factory_boy factories created for testing
- No N+1 query potential (select_related patterns documented)

---

## Context & Constraints

**Supporting Documents**:
- **Data Model**: `kitty-specs/048-workflow-engine-state/data-model.md` (complete schemas)
- **Spec**: `kitty-specs/048-workflow-engine-state/spec.md` (functional requirements FR-001 through FR-010)

**Architectural Decisions**:
- JSON storage for workflow definitions (JSONB fields)
- Generic foreign keys for content linking
- Optimistic locking via version field
- Table partitioning for TransitionHistory (deferred to post-MVP)

**Constraints**:
- Context JSON limited to 64KB (validate in model)
- TransitionHistory is immutable (override save() to prevent updates)
- WorkflowTemplate uses soft-delete (is_active flag)

---

## Subtasks & Detailed Guidance

### T008 – Create WorkflowTemplate model

**File**: `src/workflows/models/template.py`

**Implementation**:
```python
"""Workflow template model."""
from django.db import models
from django.core.exceptions import ValidationError
from workflows.managers import ActiveWorkflowManager, AllWorkflowManager


class WorkflowTemplate(models.Model):
    """Admin-defined workflow with states and transitions."""

    name = models.CharField(max_length=200, unique=True, db_index=True)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=50)
    definition = models.JSONField(
        help_text="Workflow structure: states, transitions, hooks"
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Managers
    objects = ActiveWorkflowManager()  # Default: active only
    all_objects = AllWorkflowManager()  # All including inactive

    class Meta:
        db_table = 'workflow_templates'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', '-created_at']),
        ]

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"

    def __repr__(self) -> str:
        return f"<WorkflowTemplate: {self.name} (active={self.is_active})>"

    def clean(self):
        """Validate workflow definition."""
        self._validate_definition()

    def _validate_definition(self):
        """Ensure definition has exactly one initial state and valid transitions."""
        if not isinstance(self.definition, dict):
            raise ValidationError("Definition must be a JSON object")

        states = self.definition.get('states', [])
        transitions = self.definition.get('transitions', [])

        # Check exactly one initial state
        initial_count = sum(1 for s in states if s.get('is_initial', False))
        if initial_count != 1:
            raise ValidationError(f"Must have exactly 1 initial state, found {initial_count}")

        # Validate transition references
        state_names = {s['name'] for s in states}
        for t in transitions:
            if t['from_state'] not in state_names:
                raise ValidationError(f"Transition from_state '{t['from_state']}' not in states")
            if t['to_state'] not in state_names:
                raise ValidationError(f"Transition to_state '{t['to_state']}' not in states")

    def get_initial_state(self) -> str:
        """Return the name of the initial state."""
        states = self.definition.get('states', [])
        for state in states:
            if state.get('is_initial', False):
                return state['name']
        raise ValueError("No initial state found")

    def get_transition(self, action: str) -> dict | None:
        """Get transition definition by action name."""
        transitions = self.definition.get('transitions', [])
        for t in transitions:
            if t['action'] == action:
                return t
        return None
```

---

### T009 – Create WorkflowInstance model

**File**: `src/workflows/models/instance.py`

**Implementation**:
```python
"""Workflow instance model."""
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.conf import settings


class WorkflowInstance(models.Model):
    """Tracks object progress through workflow states."""

    workflow = models.ForeignKey(
        'workflows.WorkflowTemplate',
        on_delete=models.PROTECT,
        related_name='instances'
    )
    workflow_snapshot = models.JSONField(
        help_text="Immutable copy of workflow definition at creation"
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='workflow_instances'
    )

    # Generic foreign key to any content object
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    current_state = models.CharField(max_length=100, db_index=True)
    context = models.JSONField(
        default=dict,
        help_text="Arbitrary workflow data (max 64KB)"
    )
    version = models.IntegerField(default=0, help_text="Optimistic locking")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_workflows'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_instances'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'current_state']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['workflow', '-created_at']),
        ]

    def __str__(self) -> str:
        return f"Workflow {self.workflow.name} for {self.content_object} ({self.current_state})"

    def clean(self):
        """Validate context size and state consistency."""
        self._validate_context_size()
        self._validate_current_state()

    def _validate_context_size(self):
        """Ensure context JSON is ≤ 64KB."""
        import json
        context_bytes = len(json.dumps(self.context).encode('utf-8'))
        if context_bytes > 65536:  # 64KB
            raise ValidationError(f"Context size {context_bytes} bytes exceeds 64KB limit")

    def _validate_current_state(self):
        """Ensure current_state exists in workflow_snapshot."""
        states = self.workflow_snapshot.get('states', [])
        state_names = {s['name'] for s in states}
        if self.current_state not in state_names:
            raise ValidationError(f"Current state '{self.current_state}' not in workflow definition")
```

---

### T010 – Create TransitionHistory model

**File**: `src/workflows/models/history.py`

**Implementation**:
```python
"""Transition history model."""
from django.db import models
from django.conf import settings
import uuid


class TransitionHistory(models.Model):
    """Immutable audit trail of state transitions."""

    instance = models.ForeignKey(
        'workflows.WorkflowInstance',
        on_delete=models.CASCADE,
        related_name='history'
    )
    from_state = models.CharField(max_length=100, db_index=True)
    to_state = models.CharField(max_length=100, db_index=True)
    action = models.CharField(max_length=100, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='transitions'
    )
    comment = models.TextField(blank=True)
    task_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Celery task ID for async hooks"
    )
    context_snapshot = models.JSONField(
        default=dict,
        help_text="Copy of instance.context at transition time"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'transition_history'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['instance', '-created_at']),
            models.Index(fields=['from_state', 'to_state']),
            models.Index(fields=['-created_at']),  # For partitioning
        ]

    def __str__(self) -> str:
        return f"{self.from_state} → {self.to_state} ({self.action})"

    def save(self, *args, **kwargs):
        """Enforce immutability after creation."""
        if self.pk is not None:
            raise ValueError("TransitionHistory records cannot be modified after creation")
        super().save(*args, **kwargs)
```

---

### T011 – Create ProjectPermissionOverride model

**File**: `src/workflows/models/permissions.py`

**Implementation**:
```python
"""Project permission override model."""
from django.db import models
from django.core.exceptions import ValidationError


class ProjectPermissionOverride(models.Model):
    """Customize transition permissions per project."""

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='workflow_permissions'
    )
    workflow = models.ForeignKey(
        'workflows.WorkflowTemplate',
        on_delete=models.CASCADE,
        related_name='permission_overrides'
    )
    action_name = models.CharField(max_length=100, db_index=True)
    required_roles = models.JSONField(
        default=list,
        help_text="Array of membership role names (e.g., ['admin', 'coach'])"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'project_permission_overrides'
        unique_together = [['project', 'workflow', 'action_name']]
        indexes = [
            models.Index(fields=['project', 'workflow']),
        ]

    def __str__(self) -> str:
        return f"{self.workflow.name}.{self.action_name} in {self.project.name}: {self.required_roles}"

    def clean(self):
        """Validate action exists in workflow and roles are valid."""
        # Validate action exists
        transition = self.workflow.get_transition(self.action_name)
        if not transition:
            raise ValidationError(f"Action '{self.action_name}' not found in workflow")

        # Validate roles (placeholder - actual validation depends on B07 Projects)
        if not isinstance(self.required_roles, list):
            raise ValidationError("required_roles must be an array")
```

---

### T012-T017 – Migrations and validation

**T012**: Create `src/workflows/models/__init__.py`:
```python
from .template import WorkflowTemplate
from .instance import WorkflowInstance
from .history import TransitionHistory
from .permissions import ProjectPermissionOverride

__all__ = [
    'WorkflowTemplate',
    'WorkflowInstance',
    'TransitionHistory',
    'ProjectPermissionOverride',
]
```

**T013**: Model validators are included in clean() methods above

**T014**: Run `python manage.py makemigrations workflows`

**T015-T016**: Indexes and constraints already in model Meta

**T017**: Run `python manage.py migrate --dry-run` to verify

---

### T018 – Create factory_boy factories

**File**: `tests/workflows/factories.py`

```python
"""Factory fixtures for workflows tests."""
import factory
from factory.django import DjangoModelFactory
from workflows.models import (
    WorkflowTemplate,
    WorkflowInstance,
    TransitionHistory,
    ProjectPermissionOverride
)


class WorkflowTemplateFactory(DjangoModelFactory):
    class Meta:
        model = WorkflowTemplate

    name = factory.Sequence(lambda n: f"Workflow {n}")
    version = "1.0.0"
    definition = {
        "states": [
            {"name": "draft", "is_initial": True, "is_terminal": False},
            {"name": "submitted", "is_initial": False, "is_terminal": False},
            {"name": "approved", "is_initial": False, "is_terminal": True}
        ],
        "transitions": [
            {
                "action": "submit",
                "from_state": "draft",
                "to_state": "submitted",
                "required_permission": "member",
                "validators": [],
                "hooks": {}
            },
            {
                "action": "approve",
                "from_state": "submitted",
                "to_state": "approved",
                "required_permission": "admin",
                "validators": [],
                "hooks": {}
            }
        ]
    }
    is_active = True


class WorkflowInstanceFactory(DjangoModelFactory):
    class Meta:
        model = WorkflowInstance

    workflow = factory.SubFactory(WorkflowTemplateFactory)
    workflow_snapshot = factory.LazyAttribute(lambda o: o.workflow.definition)
    project = factory.SubFactory('projects.factories.ProjectFactory')
    current_state = "draft"
    context = {}
    version = 0


# Additional factories for TransitionHistory and ProjectPermissionOverride...
```

---

## Definition of Done Checklist

- [ ] All 4 models created with type hints
- [ ] All models have __str__ and __repr__ methods
- [ ] Migrations created and apply cleanly
- [ ] Model validation tests pass (clean() methods)
- [ ] factory_boy factories created
- [ ] Models exported in __init__.py
- [ ] No linting/type errors

---

## Review Guidance

**Critical to Verify**:
- Context size validation (64KB limit)
- TransitionHistory immutability enforcement
- Generic FK setup correct
- Unique constraints on ProjectPermissionOverride
- Initial state validation in WorkflowTemplate

---

## Activity Log

- 2026-02-09T18:18:50Z – system – lane=planned – Prompt created
