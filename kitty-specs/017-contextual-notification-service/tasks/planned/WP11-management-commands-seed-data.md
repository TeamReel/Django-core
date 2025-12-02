---
work_package_id: "WP11"
subtasks: ["T078", "T079", "T080", "T081", "T082", "T083", "T084"]
title: "Management Commands & Seed Data"
phase: "Phase 3 - Admin & Developer Experience"
lane: "planned"
history:
  - timestamp: "2025-12-02T19:47:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
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

- [ ] Command creates default rules
- [ ] Dry-run shows preview
- [ ] Migration seeds data

## Dependencies

- WP01 (RoutingRule model)
