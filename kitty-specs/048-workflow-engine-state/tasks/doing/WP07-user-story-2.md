---
work_package_id: "WP07"
subtasks: ["T065", "T066", "T067", "T068", "T069", "T070", "T071", "T072", "T073", "T074", "T075"]
title: "User Story 2 – Create Workflow Instances"
phase: "Phase 1 - API"
lane: "doing"
history: [{timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}]
agent: "claude-sonnet-4.5"
shell_pid: "73412"
---

# WP07 – User Story 2: Workflow Instances 🎯 MVP

## Objective
Project member can create workflow instance for content object, verify snapshot.

## API Endpoints
- `GET /api/workflows/instances/` - List instances (project filtered)
- `POST /api/workflows/instances/` - Create instance (snapshot workflow, set initial state)
- `GET /api/workflows/instances/{id}/` - Get instance details

## Implementation Notes
- Use WorkflowEngine.create_instance() service method
- Verify project membership before allowing creation
- Add select_related('workflow', 'project', 'content_type') to avoid N+1
- Filter queryset by user's accessible projects

## Test Scenarios
1. Member creates instance (snapshot is immutable copy)
2. Template update doesn't affect existing instances
3. Non-member gets 403

## Done Checklist
- [ ] ViewSet with list/create/retrieve
- [ ] Project membership permission
- [ ] Query optimization (no N+1)
- [ ] Integration tests pass

Activity Log: 2026-02-09T18:18:50Z – Created

## Activity Log

- 2026-02-09T19:49:35Z – claude-sonnet-4.5 – shell_pid=73412 – lane=doing – Starting WP07: Workflow Instances API
