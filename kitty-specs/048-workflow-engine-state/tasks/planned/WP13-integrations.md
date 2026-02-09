---
work_package_id: "WP13"
title: "Integrations (B09 Audit, B15 Tasks, B16 Notifications)"
phase: "Phase 2 - Enhancement"
lane: "planned"
history: [{timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}]
---

# WP13 – Core-App Integrations (Priority P2)

Integrate workflows with existing Core-App modules.

**B09 Audit Integration**:
- Call AuditEvent.create() on every transition
- Include workflow context: instance_id, action, from/to states, actor

**B15 Tasks Integration**:
- Create Celery tasks for async hooks
- Store task_id in TransitionHistory
- Provide hook status query endpoint

**B16 Notifications Integration**:
- Provide hook example for sending notifications
- Document integration pattern in README

**Implementation**:
```python
# B09 Audit
from audit.models import AuditEvent

AuditEvent.objects.create(
    event_type='workflow_transition',
    actor=user,
    object_type='workflow_instance',
    object_id=instance.id,
    details={
        'action': action,
        'from_state': old_state,
        'to_state': new_state
    }
)

# B15 Tasks
from celery import shared_task

@shared_task
def execute_workflow_hook(instance_id, hook_name):
    # Hook execution logic
    pass
```

Activity Log: 2026-02-09T18:18:50Z – Created
