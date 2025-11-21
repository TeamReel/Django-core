# Implementation Plan: Constitutional Enforcement Engine Lite
*Path: [templates/plan-template.md](templates/plan-template.md)*


**Branch**: `002-constitutional-enforcement-engine` | **Date**: 2025-11-21 | **Spec**: `kitty-specs/002-constitutional-enforcement-engine/spec.md`
**Input**: Feature specification and planning brief for a stack-neutral constitutional enforcement engine implemented in Python 3.12+.

## Summary

Build a **technology-agnostic constitutional enforcement engine** with a modular, plugin-oriented core that reads YAML configuration, discovers rule/validator/reporting/adapter modules dynamically, and runs constitutional and workflow checks against Git repositories. The first milestone focuses on:

- A reusable Python 3.12+ core that stays independent of Django and any specific framework.
- A rule/validator abstraction capable of expressing constitution MUST-rules, Spec Kitty artefact checks, workflow-state validation, required-files checks, and basic hygiene rules.
- A reporter subsystem that produces both human-readable summaries and structured JSON suitable for CI and downstream tooling.
- Adapters for Git and GitHub Actions that wire the engine into local and CI workflows without embedding business logic.
- A thin, configuration-only adapter for the Django Core-App skeleton that proves the pattern while keeping the core and rule packs stack-agnostic.

## Technical Context

**Language/Version**: Python 3.12+
**Primary Dependencies**: Standard library (pathlib, dataclasses, typing, importlib, subprocess, logging, yaml parser such as PyYAML), no Django imports in core.
**Storage**: None; engine operates on live repository filesystem and in-memory structures.
**Testing**: pytest (unit + integration), optional pytest-django only for reference repo tests.
**Target Platform**: Local development environments and CI runners (GitHub Actions) on Linux/macOS/Windows.
**Project Type**: Single engine package within the existing Django-core repo, with clear directories: `core/`, `rules/`, `validators/`, `reporters/`, `workflow/`, `spec-kitty-integration/`, `modules/`, `adapters/`.
**Performance Goals**: Complete a full run against the Django Core-App skeleton in under 30 seconds on a typical developer machine; CI runs must be fast enough to be included in every PR.
**Constraints**: No secrets stored or logged; engine must remain stack-neutral and usable from other repos via configuration and adapters; plugin loading must be safe and deterministic.
**Scale/Scope**: Initially optimized for single-repo, single-branch checks; design must allow later extension to multi-repo or monorepo scenarios by adjusting configuration and adapters.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [ ] **Product-Agnostic**: Implementation contains NO product-specific logic, pricing, workflows, or UI flows
- [ ] **Core Focus**: Feature aligns with core concerns (accounts, organisations, projects, settings, audit, observability)
- [ ] **Downstream Extension**: Product-specific needs are handled via documented extension points

### II. Architecture and Modularity
- [ ] **Single Responsibility**: Each Django app has one clear purpose
- [ ] **Stable APIs**: Public interfaces are documented and stable
- [ ] **Minimal Dependencies**: Only necessary dependencies included
- [ ] **No Circular Deps**: Dependency graph is acyclic
- [ ] **No Downstream Imports**: Core does not import from product-specific projects

### III. Code Quality and Style
- [ ] **Python 3.12+**: Baseline version maintained
- [ ] **Type Hints**: Core modules will use type hints throughout
- [ ] **Black Formatting**: All code will be formatted with Black
- [ ] **Ruff Linting**: Ruff will be primary linter
- [ ] **No Dead Code**: Implementation removes unused code
- [ ] **Readable Code**: Functions/classes remain small and focused
- [ ] **Curated Dependencies**: New dependencies are justified and pinned

### IV. Testing Strategy
- [ ] **pytest + pytest-django**: Testing framework used
- [ ] **Test Coverage**: Tests included for all features
- [ ] **Regression Tests**: Bug fixes include tests preventing recurrence
- [ ] **Deterministic**: Tests are not flaky or environment-dependent
- [ ] **Coverage Thresholds**: Coverage targets defined and enforced
- [ ] **Integration Tests**: Key user flows have integration test coverage

### V. Security and Privacy
- [ ] **Secure Defaults**: CSRF, secure cookies, ALLOWED_HOSTS configured
- [ ] **DEBUG Off**: DEBUG disabled in non-dev environments
- [ ] **No Secrets**: No secrets committed; env vars/secret managers used
- [ ] **Dependency Scanning**: CI will scan dependencies for vulnerabilities
- [ ] **Centralized Auth**: Authentication/authorization uses core mechanisms
- [ ] **No Sensitive Logging**: Sensitive data not logged

### VI. Performance and Reliability
- [ ] **No N+1 Queries**: Query optimization plan documented
- [ ] **Pagination**: APIs use pagination for unbounded data
- [ ] **Explicit Caching**: Caching strategy documented if used
- [ ] **Structured Logging**: Logging infrastructure in place
- [ ] **Health Checks**: Health check endpoints defined
- [ ] **Metrics Hooks**: Observability metrics captured
- [ ] **Graceful Degradation**: Failure handling strategy defined

### VII. UX and API Design
- [ ] **DRF Required**: Django REST Framework used for APIs
- [ ] **Consistent Responses**: API response format standardized
- [ ] **Versioning Strategy**: Breaking changes handled via versioning or deprecation
- [ ] **Clear Errors**: Error messages clear and safe (no data leaks)
- [ ] **Boundary Validation**: Validation in serializers/forms

### VIII. Developer Experience and Tooling
- [ ] **Easy Setup**: Local environment setup documented and simple
- [ ] **Mandatory Tools**: Black, Ruff, mypy, pytest configured
- [ ] **Pre-commit Hooks**: Hooks match CI checks
- [ ] **Type Checking**: mypy runs cleanly on core modules
- [ ] **Task Scripts**: Common operations scripted
- [ ] **Developer Docs**: Setup and development docs exist

### IX. Branching and Git Workflow
- [ ] **Feature Branch**: Work occurs on `feature/NNN-name` branch
- [ ] **Linked to Spec**: PR will reference spec document
- [ ] **Focused PRs**: Changes remain small and focused
- [ ] **main Stable**: No direct commits to main

# Project Structure

### Documentation (this feature)

```
kitty-specs/002-constitutional-enforcement-engine/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md          # Created by /spec-kitty.tasks
```

### Source Code (repository root)

Within this repo, engine-related code will live under a dedicated directory tree, for example:

```
src/constitution_engine/
├── core/                  # Engine initialization, configuration loading, pipeline orchestration
├── rules/                 # Generic rule definitions (file presence, pattern checks, etc.)
├── validators/            # Higher-level validators (constitution matcher, workflow validator)
├── reporters/             # Human-readable and JSON reporters
├── workflow/              # Spec Kitty / SDD workflow-specific utilities
├── spec_kitty_integration/# Integration helpers for Spec Kitty artefacts
├── modules/
│   ├── python/            # Python rule packs (initial focus)
│   ├── js/
│   ├── yaml/
│   ├── docker/
│   └── terraform/
└── adapters/
    ├── git/               # Local Git adapter (repository detection, paths)
    └── github_actions/    # CI adapter (inputs/outputs for workflows)

tests/
├── unit/
│   ├── test_core_engine.py
│   ├── test_configuration_loading.py
│   ├── test_rule_execution.py
│   ├── test_validators.py
│   └── test_reporters.py
└── integration/
    ├── test_engine_against_sample_repo.py
    └── test_engine_against_django_core_app.py
```

**Structure Decision**: Use a single `constitution_engine` package under `src/`, organized into `core/`, `rules/`, `validators/`, `reporters/`, `workflow/`, `spec_kitty_integration/`, `modules/`, and `adapters/`, plus dedicated unit and integration test packages under `tests/`.

## Complexity Tracking

No constitution violations or unusual structural complexity expected for this feature. If new complexity arises (for example, additional adapter types or cross-repo orchestration), it will be documented in future iterations.
