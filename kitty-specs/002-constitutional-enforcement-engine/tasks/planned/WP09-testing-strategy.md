---
work_package_id: WP09
feature_id: 002-constitutional-enforcement-engine
lane: planned
title: "Test suite (unit, integration, e2e)"
subtasks:
  - T054
  - T055
  - T056
  - T057
  - T058
history: []
---

# WP09 – Test suite (unit, integration, e2e)

## Goal
Ensure the engine has a solid automated test suite across layers.

## Context
This package stitches together testing gaps and defines coverage expectations.

## Implementation Guidance
- Review existing tests and backfill coverage for missing core paths.
- Add integration tests that run the engine end-to-end against small synthetic repos.
- Add at least one e2e-style test that exercises the CLI in a temporary directory with a small config.
- Configure coverage tooling and thresholds, and ensure these run in CI.
- Document testing conventions (directory layout, fixture patterns, how to run subsets).

## Definition of Done
- All subtasks T054–T058 implemented.
- CI enforces basic coverage thresholds and all tests pass reliably.
