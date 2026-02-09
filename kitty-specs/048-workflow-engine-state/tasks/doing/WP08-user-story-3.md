---
work_package_id: "WP08"
subtasks: ["T076", "T077", "T078", "T079", "T080", "T081", "T082", "T083", "T084", "T085", "T086", "T087", "T088"]
title: "User Story 3 – Execute State Transitions"
phase: "Phase 1 - API"
lane: "doing"
history: [{timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}]
agent: "system"
---

# WP08 – User Story 3: Execute Transitions 🎯 MVP

## Objective
User can execute allowed transitions, blocked on invalid transitions/permissions.

## API Endpoints
- `POST /api/workflows/instances/{id}/execute/` - Execute transition
  - Body: `{"action": "submit", "comment": "Ready", "context_updates": {}}`
- `GET /api/workflows/instances/{id}/available_actions/` - Get available actions

## Implementation (ViewSet custom actions)
```python
@action(detail=True, methods=['post'])
def execute(self, request, pk=None):
    instance = self.get_object()
    serializer = TransitionExecuteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    engine = WorkflowEngine()
    history = engine.execute_transition(
        instance=instance,
        action=serializer.validated_data['action'],
        user=request.user,
        comment=serializer.validated_data.get('comment', ''),
        context_updates=serializer.validated_data.get('context_updates')
    )

    return Response(TransitionHistorySerializer(history).data)

@action(detail=True, methods=['get'])
def available_actions(self, request, pk=None):
    instance = self.get_object()
    engine = WorkflowEngine()
    actions = engine.get_available_actions(instance, request.user)
    return Response({'actions': actions})
```

## Error Handling
- 400: Invalid transition (not allowed from current state)
- 403: Permission denied (user lacks required role)
- 400: Validator failure (with validator error message)
- 409: Optimistic locking conflict (version mismatch)

## Test Scenarios
1. Valid transition succeeds
2. Invalid transition returns 400
3. Permission denial returns 403
4. Validator failure blocks transition

## Done Checklist
- [ ] execute action implemented
- [ ] available_actions action implemented
- [ ] All error cases handled
- [ ] Validators execute
- [ ] Hooks fire in correct order
- [ ] Integration tests pass

Activity Log: 2026-02-09T18:18:50Z – Created

## Activity Log

- 2026-02-09T20:25:28Z – system – shell_pid= – lane=doing – Starting implementation of Execute Transitions (User Story 3)
