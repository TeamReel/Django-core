---
work_package_id: "WP03"
subtasks: ["T017", "T018", "T019", "T020", "T021", "T022", "T023", "T024", "T025"]
title: "Routing Service & Rule Evaluation"
phase: "Phase 1 - Core Routing"
lane: "done"
assignee: "GitHub Copilot"
agent: "claude-reviewer"
shell_pid: "13508"
review_status: "approved"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-03T11:15:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation - Routing Service & Rule Evaluation"
  - timestamp: "2025-12-03T11:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Completed implementation - All subtasks (T017-T025) complete. RoutingService with rule matching, B08 integration, query optimization, logging, and metrics implemented."
  - timestamp: "2025-12-03T11:31:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    action: "Ready for review - Routing service with rule evaluation complete"
  - timestamp: "2025-12-03T11:45:00Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: "13508"
    action: "Code review approved - All subtasks completed correctly. RoutingService implements rule matching with scope filtering, priority ordering, B08 integration, query optimization, comprehensive logging and metrics. Excellent implementation quality."
---

# WP03 – Routing Service & Rule Evaluation

## Objectives

Implement core routing logic that evaluates routing rules to determine target users and channels. Given event + routing rules, return list of (user_id, channel) tuples.

**Success**: RoutingService.route_event() queries RoutingRule model, applies scope matching (global/org/project), resolves target users via B08, returns accurate target list.

## Key Subtasks

- T017: Create `services/routing_service.py` with `route_event(event_dict)` method
- T018: Query RoutingRule filtering by event_type, scope, org, project
- T019: Evaluate rules (scope matching, priority ordering)
- T020: Resolve target users from B08 (query users in target_role)
- T021: Optimize with `select_related('organisation', 'project')`
- T022: Implement priority-based ordering (highest first)
- T023: Add type hints
- T024-T025 [P]: Logging + metrics

## Implementation Notes

- Rule evaluation order: project rules override org rules override global rules
- AND-only conditions: all criteria must match
- Use Django ORM, no raw SQL
- Return: `List[Tuple[int, str]]` (user_id, channel)

## Definition of Done

- [ ] RoutingService.route_event() returns correct target users for test events
- [ ] Rules evaluated in correct priority order
- [ ] Queries optimized (no N+1)
- [ ] Type hints, logging, metrics complete

## Dependencies

- WP01 (RoutingRule model)
- B08 (user role queries)
