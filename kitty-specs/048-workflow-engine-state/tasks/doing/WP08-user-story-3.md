---
work_package_id: "WP08"
subtasks: ["T076", "T077", "T078", "T079", "T080", "T081", "T082", "T083", "T084", "T085", "T086", "T087", "T088"]
title: "User Story 3 – Execute State Transitions"
phase: "Phase 2 - Implementation (Partial)"
lane: "doing"
history:
  - {timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}
  - {timestamp: "2026-02-09T20:25:28Z", lane: "doing", agent: "copilot", action: "Started implementation"}
  - {timestamp: "2026-02-09T20:50:00Z", lane: "doing", agent: "copilot", action: "ViewSet actions added, integration tests created"}
  - {timestamp: "2026-02-09T21:00:00Z", lane: "for_review", agent: "copilot", action: "Implementation complete pending endpoint routing verification"}
  - {timestamp: "2026-02-09T21:15:00Z", lane: "planned", agent: "copilot", action: "Code review complete - endpoint routing issue requires investigation"}
  - {timestamp: "2026-02-09T20:42:04Z", lane: "doing", agent: "claude", action: "Starting implementation: Addressing routing feedback"}
  - {timestamp: "2026-02-09T20:55:00Z", lane: "doing", agent: "claude", action: "FIXED routing issue: get_queryset() and check_project_membership() now include project creators"}
agent: "claude"
review_status: ""
implementation_status: "85% complete"
reviewed_by: "claude"
---

## 🔧 Current Status: ROUTING FIXED - Permission Setup in Progress

**Routing Issue - RESOLVED ✅**:
- Root cause identified: `get_queryset()` and `check_project_membership()` filtered to membership only, excluding project creators
- Fix applied: Both methods now include `creator=user` check
- Result: Routes now accessible, 5/11 tests passing (up from 4/11)
- Test flow: 404 route not found → 403 permission denied (expected)

**Remaining Work**:
- Test failures are now due to permission/validation errors, NOT routing
- Need to analyze workflow engine permission checks
- May need test fixtures to set up proper workflow permissions

## Updated Test Results

**Passing Tests (5/11)** ✅:
1. `test_execute_invalid_transition` - Invalid transitions blocked correctly
2. `test_execute_unauthenticated` - 401 returned properly
3. `test_execute_instance_not_found` - 404 from get_object() when instance doesn't exist
4. `test_available_actions_unauthenticated` - 401 returned properly
5. `test_available_actions_instance_not_found` - 404 from get_object() when instance doesn't exist

**Failing Tests (6/11)** - Now permission/logic errors:
1. `test_execute_valid_transition` - 403 "User lacks permission"
2. `test_execute_permission_denied` - 403 (expected, but different reason?)
3. `test_execute_with_context_updates` - 403 "User lacks permission"
4. `test_available_actions_from_draft_state` - 403 "User lacks permission"
5. `test_available_actions_from_review_state` - 403 "User lacks permission"
6. `test_available_actions_permission_denied` - 403 "User lacks permission"

**Analysis**: Routes are working! All 6 failing tests are getting proper HTTP responses, not 404s. The issue is workflow engine permission checks, not routing.

## Code Changes Made

**File**: `src/workflows/views/instances.py`

1. **get_queryset()** - Include project creators:
```python
accessible_projects = Project.objects.filter(
    Q(memberships__user=user, memberships__deleted_at__isnull=True)
    | Q(creator=user)
).values_list("id", flat=True)
```

2. **check_project_membership()** - Include project creators:
```python
is_member = project.memberships.filter(
    user=self.request.user, deleted_at__isnull=True
).exists()

is_creator = project.creator_id == self.request.user.id

if not (is_member or is_creator):
    raise PermissionDenied("You must be a project member to perform this action")
```

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

- 2026-02-09T20:25:28Z – copilot – shell_pid= – lane=doing – Starting implementation of Execute Transitions (User Story 3)
- 2026-02-09T20:35:28Z – copilot – shell_pid= – lane=for_review – ViewSet custom actions complete, endpoint routing needs verification
- 2026-02-09T21:15:00Z – copilot – shell_pid=review – lane=planned – Code review: implementation 80% complete, custom action routing issue blocks test execution (WP07 regression tests passing 13/13)
- 2026-02-09T20:38:50Z – copilot – shell_pid= – lane=planned – Code review: 80% complete - custom action routing blocks test execution, code logic is sound
- 2026-02-09T20:42:04Z – copilot – shell_pid= – lane=doing – Starting implementation: Addressing routing feedback
- 2026-02-09T20:55:00Z – claude – shell_pid=73412 – lane=doing – ✅ ROUTING FIXED: Identified root cause (queryset filter excluded project creators), applied fix to get_queryset() and check_project_membership(). Tests now hitting endpoints and executing business logic. 5/11 passing (up from 4/11). Remaining failures are permission-related, not routing issues.
