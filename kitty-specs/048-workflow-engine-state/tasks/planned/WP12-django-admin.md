---
work_package_id: "WP12"
title: "Django Admin Registration"
phase: "Phase 2 - Enhancement"
lane: "planned"
history: [{timestamp: "2026-02-09T18:18:50Z", lane: "planned", agent: "system", action: "Prompt generated"}]
---

# WP12 – Django Admin (Priority P2)

Register all models in Django Admin with filters, search, read-only fields.

**Models to Register**:
1. WorkflowTemplate - list_display: name, version, is_active, created_at; filters: is_active; search: name
2. WorkflowInstance - list_display: workflow, project, current_state, content_object, created_at; filters: project, workflow, current_state; inline: TransitionHistory
3. TransitionHistory (read-only) - list_display: instance, action, from_state, to_state, actor, created_at; filters: instance, actor, action
4. ProjectPermissionOverride - list_display: project, workflow, action, roles; filters: project, workflow

**Special Features**:
- Make workflow_snapshot read-only in WorkflowInstance admin
- Format JSON fields with <pre> tags for readability
- Add custom admin action: "Deactivate selected templates"

Activity Log: 2026-02-09T18:18:50Z – Created
