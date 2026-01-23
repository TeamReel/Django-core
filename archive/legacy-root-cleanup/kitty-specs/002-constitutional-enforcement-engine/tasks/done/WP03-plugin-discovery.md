---
work_package_id: WP03
feature_id: 002-constitutional-enforcement-engine
lane: "done"
title: "Plugin/module discovery system"
subtasks:
  - T018
  - T019
  - T020
  - T021
  - T022
  - T023
  - T024
history: []
agent: "claude-reviewer"
shell_pid: "29324"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
---

# WP03 – Plugin/module discovery system

## Goal
Discover and load rule/validator/reporter modules based on configuration and entry-point conventions.

## Context
Discovery builds on WP01–WP02. Start with simple built-in discovery; design extensibility points for later plugin ecosystems.

## Implementation Guidance
- Implement a registry for built-in plugins under `modules/python/` and expose a lookup API in `core/plugins.py`.
- Support configuration-driven selection of which plugins to enable, with safe defaults.
- Consider (but do not over-engineer) support for Python entry points or a pluggable registry for out-of-repo extensions.
- Enforce constitution-aligned safety: avoid loading arbitrary modules from untrusted paths by default.
- Provide tests that verify discovery behavior for built-ins and a small fake external plugin.

## Definition of Done
- All subtasks T018–T024 implemented and tested.
- Engine can resolve configured rule/validator/reporter IDs into concrete implementations via the discovery system.

## Activity Log

- 2025-11-22T11:46:52Z – claude – shell_pid=29324 – lane=doing – Started implementation
- 2025-11-22T12:18:16Z – claude – shell_pid=29324 – lane=for_review – Plugin discovery system complete: Built-in and entry point discovery, safety whitelist, 17 passing tests, engine integration, and full documentation
- 2025-11-22T12:21:02Z – claude-reviewer – shell_pid=29324 – lane=done – Code review complete: All 17 tests pass, comprehensive implementation of plugin discovery with built-in and entry point support, safety whitelist, engine integration, and excellent documentation. Approved without changes.
