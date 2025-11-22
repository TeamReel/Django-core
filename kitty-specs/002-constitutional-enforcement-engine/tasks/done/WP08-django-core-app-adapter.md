---
work_package_id: WP08
feature_id: 002-constitutional-enforcement-engine
lane: done
title: "Django Core-App adapter"
subtasks:
  - T049
  - T050
  - T051
  - T052
  - T053
agent: claude
shell_pid: "$PID"
reviewed_by: claude-reviewer
review_status: approved without changes
history:
  - timestamp: 2025-11-22T23:00:00Z
    agent: claude
    shell_pid: "$PID"
    lane: doing
    note: "Started implementation of Django Core-App adapter"
  - timestamp: 2025-11-22T23:30:00Z
    agent: claude
    shell_pid: "$PID"
    lane: for_review
    note: "Completed all 5 subtasks: config format, adapter logic, fixtures, tests (18 tests, 17 passed), and documentation (400+ lines)"
  - timestamp: 2025-11-22T23:45:00Z
    agent: claude-reviewer
    shell_pid: "$PID"
    lane: done
    note: "Code review approved: All 5 subtasks validated. 243 tests passing. Type annotations fixed for mypy compliance."
---

# WP08 – Django Core-App adapter

## Goal
Provide a thin, configuration-only adapter so the engine can reason about Django Core-App style projects.

## Context
Adapter must not import the Django project; it should rely on filesystem structure and configuration only.

## Implementation Guidance
- Define an adapter configuration format for Django projects (e.g. app paths, test paths, settings module name) that works for the Core-App skeleton.
- Implement logic to derive a useful `RepositoryContext` view from the Django skeleton (apps, tests, settings, management commands, etc.).
- Provide sample configs and fixtures pointing at the existing Django Core-App repo in this workspace (or a reduced copy).
- Add tests to assert that the adapter detects expected structure without side effects.

## Definition of Done
- All subtasks T049–T053 implemented and tested.
- Docs describe how to point the engine at a Django Core-App style project.
