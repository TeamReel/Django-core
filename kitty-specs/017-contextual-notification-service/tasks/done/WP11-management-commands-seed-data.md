---
work_package_id: "WP11"
subtasks: ["T078", "T079", "T080", "T081", "T082", "T083", "T084"]
title: "Management Commands & Seed Data"
phase: "Phase 3 - Admin & Developer Experience"
lane: "done"
assignee: "claude-reviewer"
agent: "claude-reviewer"
shell_pid: "13508"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
  - timestamp: "2025-12-03T13:40:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13508"
    action: "Started implementation of management commands and seed data"
  - timestamp: "2025-12-03T13:50:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13508"
    action: "Completed implementation. Created configure_routing command with --dry-run/--force, seed data migration, README.md documentation, and updated quickstart.md"
  - timestamp: "2025-12-03T14:00:00Z"
    lane: "done"
    agent: "claude-reviewer"
    shell_pid: "13508"
    action: "Code review approved. All subtasks completed correctly with comprehensive documentation."
---

# WP11 – Management Commands & Seed Data

## Objectives

Provide management commands to seed default routing rules. Easy setup for developers.

**Success**: Run `configure_routing`, default rules created in database.

## Key Subtasks

- T078: Create `management/commands/configure_routing.py`
- T079: Seed default rules (project.*, org.*, task.*)
- T080: --dry-run flag
- T081: --force flag (overwrite)
- T082 [P]: Data migration `0002_seed_default_routing_rules.py`
- T083: Document in README
- T084: Add to quickstart.md

## Implementation

- Seed rules: global scope, in_app channel, normal priority
- Event types: project.created, project.updated, project.deleted, project.member_added, org.member_invited
- Use `get_or_create()` to avoid duplicates

## Definition of Done

- [x] Command creates default rules
- [x] Dry-run shows preview
- [x] Migration seeds data

## Dependencies

- WP01 (RoutingRule model)
