---
work_package_id: WP04
feature_id: 002-constitutional-enforcement-engine
lane: "doing"
title: "Rule & validator systems"
subtasks:
  - T025
  - T026
  - T027
  - T028
  - T029
  - T030
  - T031
  - T032
history: []
agent: "claude"
shell_pid: "29324"
---

# WP04 – Rule & validator systems

## Goal
Implement a minimal but extensible rule and validator system, including workflow-level validation.

## Context
Rules and validators codify constitutional checks. Start with a pragmatic built-in set (mypy, Ruff, dependency pinning) and keep extension APIs stable.

## Implementation Guidance
- Define clear base classes/protocols for rules and validators, including inputs, outputs, and error handling expectations.
- Implement a small set of built-in rules and validators that can run in this repo without extra dependencies.
- Add a workflow validator that ensures required rules are present and correctly configured before execution.
- Integrate rules and validators into the engine pipeline in an easily testable manner (e.g. pure functions orchestrated by the engine).
- Provide tests that simulate rule execution and validator behavior via synthetic `CheckResult` lists.

## Definition of Done
- All subtasks T025–T032 implemented and covered by tests.
- Engine can execute configured rules and validators and produce stable `CheckResult` structures.

## Activity Log

- 2025-11-22T17:16:17Z – claude – shell_pid=29324 – lane=doing – Started implementation: Rule and validator systems
