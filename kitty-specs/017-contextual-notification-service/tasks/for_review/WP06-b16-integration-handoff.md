---
work_package_id: "WP06"
subtasks: ["T041", "T042", "T043", "T044", "T045", "T046", "T047", "T048"]
title: "B16 Integration & Notification Handoff"
phase: "Phase 1 - Core Routing"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "13508"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
  - timestamp: "2025-12-03T14:15:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation - B16 Integration & Notification Handoff"
  - timestamp: "2025-12-03T14:45:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    action: "Implementation complete - NotificationHandoffService with B16 integration"
    commit: "133a451"
---

# WP06 – B16 Integration & Notification Handoff

## Objectives

Integrate with B16 NotificationService to deliver routed notifications. B17 routes, B16 delivers.

**Success**: Given routed event, B16 receives correct notification creation calls for each (user, channel) pair.

## Key Subtasks

- T041: Create `services/notification_handoff_service.py` with `dispatch_to_b16()`
- T042: Integrate B16 NotificationService API (direct service call)
- T043: Map event payload to B16 format (title, body, url, priority)
- T044: Per-user notification creation loop
- T045: Handle B16 errors gracefully (log, don't block others)
- T046-T048: Type hints, logging, metrics

## Implementation

- Direct synchronous call to B16 service layer
- B16 handles async delivery (B17 doesn't re-queue)
- Map priority: 0=low, 1=normal, 2=high, 3=urgent
- Loop per user: create notification for each (user_id, channel)

## Definition of Done

- [ ] B16 receives correct notification calls
- [ ] Per-user errors don't block batch
- [ ] Integration tests with mocked B16

## Dependencies

- B16 NotificationService API
- WP03-WP05 (routing services)
