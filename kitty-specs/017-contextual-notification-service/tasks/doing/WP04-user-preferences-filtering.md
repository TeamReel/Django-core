---
work_package_id: "WP04"
subtasks: ["T026", "T027", "T028", "T029", "T030", "T031", "T032"]
title: "User Preferences & Filtering"
phase: "Phase 1 - Core Routing"
lane: "doing"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "13508"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
  - timestamp: "2025-12-03T12:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation - User Preferences & Filtering"
---

# WP04 – User Preferences & Filtering

## Objectives

Filter target users based on notification preferences (opt-outs). Remove users who have disabled (event_type, channel) preference.

**Success**: Given target users, PreferenceService.check_preferences() returns filtered list excluding users with enabled=False.

## Key Subtasks

- T026: Create `services/preference_service.py` with `check_preferences(user_ids, event_type, channel)`
- T027: Bulk preference lookup (avoid N+1)
- T028: Filter users with enabled=False
- T029: Handle missing preferences (default enabled=True)
- T030-T032: Type hints, logging, metrics

## Implementation

- Query: `NotificationPreference.objects.filter(user__in=user_ids, event_type=event_type, channel=channel)`
- Return: `List[int]` (filtered user IDs)
- Default: if no preference exists, user receives notification

## Definition of Done

- [ ] Preference filtering works correctly (opt-outs excluded)
- [ ] Bulk queries used (no N+1)
- [ ] Missing preferences handled correctly

## Dependencies

- WP01 (NotificationPreference model)
- WP03 (routing service)
