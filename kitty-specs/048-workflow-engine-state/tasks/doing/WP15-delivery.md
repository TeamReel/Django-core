---
work_package_id: "WP15"
subtasks: ["T157", "T158", "T159", "T160", "T161", "T162", "T163", "T164", "T165", "T166", "T167", "T168"]
title: "Delivery & Production Integration"
phase: "Phase 3 - Delivery"
lane: "doing"
history: [{timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}]
agent: "GitHub Copilot"
shell_pid: "73412"
---

# WP15 – Delivery & Production Integration 🚀 REQUIRED

## Objective
Feature MUST be live and functional in Railway deployment per Constitution Principle XIII.

## Critical Tasks

### T157 – Apply migrations to Railway
- Test on staging first
- Use safe patterns (no DROP TABLE)
- Verify with `python manage.py showmigrations workflows`

### T158-T159 – Seed data
Create idempotent seed script:
```python
# seed_workflows.py
from workflows.models import WorkflowTemplate

template, created = WorkflowTemplate.objects.update_or_create(
    name="Content Approval",
    defaults={
        "version": "1.0.0",
        "definition": {
            "states": [
                {"name": "draft", "is_initial": True, "is_terminal": False},
                {"name": "submitted", "is_initial": False, "is_terminal": False},
                {"name": "approved", "is_initial": False, "is_terminal": True}
            ],
            "transitions": [...]
        }
    }
)
```

### T163 – Demo app integration
Add workflow UI to demo:
- Create instance button
- Execute transition button
- View history tab

### T164 – Manual test file
Create `documents/08-testing/manual-tests/B37-workflow-engine.md`:
```markdown
# Manual Test: Workflow Engine

## Test Case 1: Create Template
1. Login as admin
2. Go to /admin/workflows/workflowtemplate/
3. Click "Add workflow template"
4. Fill form, save
5. Verify template appears in list

## Test Case 2: Create Instance
1. Go to demo app
2. Select content object
3. Click "Start workflow"
4. Select template
5. Verify instance created

## Test Case 3: Execute Transition
1. Open workflow instance
2. Click "Submit" button
3. Verify state changes to "submitted"
4. Check history shows transition
```

### T165 – End-to-end smoke test in Railway
1. Create template via Swagger
2. Create instance via API
3. Execute transition
4. View history
5. Verify in Django Admin
6. Check Railway logs for errors

## Definition of Done
- [ ] Migrations applied to Railway
- [ ] Seed data works (idempotent)
- [ ] All models in Django Admin
- [ ] All endpoints in Swagger
- [ ] Demo app integration complete
- [ ] Manual test file created
- [ ] End-to-end test passes in Railway
- [ ] No errors in Railway logs
- [ ] Delivery Checklist in spec.md updated

## Critical Success Criteria
**Feature is NOT "done" until:**
1. Live in Railway production
2. Demo app integration works
3. Manual tests pass
4. Swagger docs complete

Activity Log: 2026-02-09T18:18:50Z – Created

## Activity Log

- 2026-02-10T08:51:35Z – GitHub Copilot – shell_pid=73412 – lane=doing – Starting delivery & production integration (REQUIRED)
