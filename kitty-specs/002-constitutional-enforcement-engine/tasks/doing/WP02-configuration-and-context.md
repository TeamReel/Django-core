---
work_package_id: WP02
feature_id: 002-constitutional-enforcement-engine
lane: "doing"
title: "Configuration loader & RepositoryContext builder"
subtasks:
  - T010
  - T011
  - T012
  - T013
  - T014
  - T015
  - T016
  - T017
history: []
agent: "claude"
shell_pid: "29324"
---

# WP02 – Configuration loader & RepositoryContext builder

## Goal
Load engine configuration from files/env and construct a `RepositoryContext` the engine can consume.

## Context
This package builds on WP01’s core entities and engine skeleton. Configuration should be explicit, typed, and constitution-aware.

## Implementation Guidance
- Define a configuration schema (e.g. dataclasses or Pydantic models) in `core/config.py` that captures rules, modules, reporters, and adapters.
- Implement loaders that can read configuration from disk (YAML/TOML) with environment variable overrides for CI use.
- Introduce a `RepositoryContextBuilder` responsible for inspecting the filesystem (and optionally Git) to build a `RepositoryContext` instance.
- Validate configuration aggressively and fail fast with helpful messages when misconfigured, especially for security- or constitution-related settings.
- Provide small, realistic fixtures to test parsing and context building.

## Definition of Done
- All subtasks T010–T017 implemented and covered by tests.
- `Engine` can be invoked via a `run_with_config(path)`-style helper that wires config + context.
- Misconfigurations produce clear error messages and non-zero exits in CLI use.

## Activity Log

- 2025-11-22T11:17:55Z – claude – shell_pid=29324 – lane=doing – Started implementation
