---
work_package_id: WP06
feature_id: 002-constitutional-enforcement-engine
lane: doing
title: "Git adapter"
subtasks:
  - T039
  - T040
  - T041
  - T042
  - T043
agent: claude
shell_pid: "29324"
history:
  - timestamp: "2025-11-22T19:30:00Z"
    agent: claude
    shell_pid: "29324"
    lane: doing
    note: "Started implementation of Git adapter"
---

# WP06 – Git adapter

## Goal
Provide a Git adapter capable of reading repository state and, optionally, writing annotations suitable for local workflows.

## Context
The adapter should be thin, reliable, and easy to mock in tests.

## Implementation Guidance
- Implement Git operations either via a small library or carefully constrained subprocess calls.
- Expose a clean interface to obtain HEAD, branch name, and changed files relevant to checks.
- Consider how (or whether) to support writing annotations (e.g. comments, notes) without overcommitting.
- Ensure tests work on all supported platforms and do not depend on global Git config.

## Definition of Done
- All subtasks T039–T043 implemented with tests against a temporary test repo.
- Git adapter usage in the engine remains optional and degrades gracefully when Git is unavailable.
