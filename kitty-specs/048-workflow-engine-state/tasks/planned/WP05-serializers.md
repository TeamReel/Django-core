---
work_package_id: "WP05"
subtasks: ["T042", "T043", "T044", "T045", "T046", "T047", "T048", "T049", "T050", "T051", "T052"]
title: "DRF Serializers"
phase: "Phase 1 - API"
lane: "planned"
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP05 – DRF Serializers

## Objective
Create serializers for all models with boundary validation.

## Key Serializers
1. **WorkflowTemplateSerializer** - Validates definition JSON schema
2. **WorkflowInstanceSerializer** - Validates context size (64KB), includes available_actions computed field
3. **TransitionHistorySerializer** - Read-only with actor details
4. **ProjectPermissionOverrideSerializer** - Validates action exists, roles valid
5. **TransitionExecuteSerializer** - Input for execute endpoint (action, comment, context_updates)
6. **AvailableActionsSerializer** - Output for available_actions endpoint

## Validation Rules
- Context JSON ≤ 64KB (use custom validator)
- Definition must have exactly 1 initial state
- Action names must exist in workflow
- Required roles must be valid membership roles

## Files
- `src/workflows/serializers/template.py`
- `src/workflows/serializers/instance.py`
- `src/workflows/serializers/history.py`
- `src/workflows/serializers/permissions.py`
- `src/workflows/serializers/__init__.py`

## Done Checklist
- [ ] All 6 serializers created
- [ ] Validation rules enforced
- [ ] Type hints present
- [ ] Unit tests >85% coverage

Activity Log: 2026-02-09T18:18:50Z – Created
