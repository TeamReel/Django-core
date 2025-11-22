---
work_package_id: WP07
feature_id: 002-constitutional-enforcement-engine
lane: done
title: "GitHub Actions adapter & CI wiring"
subtasks:
  - T044
  - T045
  - T046
  - T047
  - T048
agent: claude-reviewer
shell_pid: "29324"
reviewed_by: claude-reviewer
review_status: approved without changes
history:
  - timestamp: "2025-11-22T20:30:00Z"
    agent: claude
    shell_pid: "29324"
    lane: doing
    note: "Started implementation of CLI and GitHub Actions integration"
  - timestamp: "2025-11-22T21:15:00Z"
    agent: claude
    shell_pid: "29324"
    lane: for_review
    note: "Completed all 5 subtasks (T044-T048): CLI, workflow, annotations, docs, tests. 226 tests passing."
  - timestamp: "2025-11-22T21:45:00Z"
    agent: claude-reviewer
    shell_pid: "29324"
    lane: done
    note: "Code review approved: All 5 subtasks implemented correctly, 226 tests passing, comprehensive CLI with GitHub Actions integration"
---

# WP07 – GitHub Actions adapter & CI wiring

## Goal
Deliver a minimal but robust GitHub Actions integration for running the engine in CI.

## Context
Focus on a simple, copy-pastable workflow that teams can adapt.

## Implementation Guidance
- Provide a CLI entry point that takes standard flags (config path, output format, fail-on-severity, etc.).
- Author a reference `.github/workflows/` file that shows how to run the engine in CI, including caching and Python setup.
- Map engine results to process exit codes and, optionally, GitHub annotations (e.g. step summary or warning annotations).
- Clearly document environment variables and configuration expectations.

## Definition of Done
- All subtasks T044–T048 implemented.
- Reference workflow runs successfully against a sample repo and fails on intentional violations.
