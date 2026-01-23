---
work_package_id: WP05
feature_id: 002-constitutional-enforcement-engine
lane: "done"
title: "Reporter subsystem"
subtasks:
  - T033
  - T034
  - T035
  - T036
  - T037
  - T038
history:
  - timestamp: "2025-11-22T18:50:00Z"
    event: "started"
    agent: "claude"
    shell_pid: "29324"
  - timestamp: "2025-11-22T19:15:00Z"
    event: "reviewed"
    agent: "claude-reviewer"
    shell_pid: "current"
    review_status: "approved without changes"
agent: "claude-reviewer"
shell_pid: "current"
reviewed_by: "claude-reviewer"
review_status: "approved without changes"
---

# WP05 – Reporter subsystem

## Goal
Provide human-readable and machine-readable reporters for engine results.

## Context
Reporters are the primary UX for both developers and CI systems.

## Implementation Guidance
- Define a reporter interface that accepts `CheckResult` collections and optional context (e.g. repository/CI info).
- Implement a console reporter with concise, readable output suitable for local runs.
- Implement a JSON reporter that emits a stable, documented schema for downstream tooling.
- Allow configuration to select one or more reporters per run.
- Add tests verifying output structure and key fields; avoid brittle tests tied to exact formatting where unnecessary.

## Definition of Done
- All subtasks T033–T038 implemented and tested.
- Engine can emit console and JSON output controlled by configuration.
