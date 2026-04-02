# B02: Constitutional Enforcement Engine

**Phase:** 1
**Status:** ✅ Done
**Module ID:** 002
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 2. B02 – Constitutional Enforcement Engine

**Doel**: Rule engine die repositories en workflows valideert tegen projectconstitutie en SDD-proces.

**Status**: ✅ Complete

**Key Features**:
- Manifest-based rule definitions
- CI integration for enforcement
- Spec-Driven Development workflow validation
- Violation reporting and blocking

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Constitutional Enforcement Engine Lite
*Path: [templates/spec-template.md*

**Feature Branch**: `002-constitutional-enforcement-engine`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "feature=002-constitutional-enforcement-engine-lite ... (see specify input)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core architecture validation (Priority: P1)

As a **core architect**, I can run the constitutional enforcement engine against the Django Core-App repository and see a clear report of which constitution MUST-rules, Spec Kitty artefacts, and workflow rules are satisfied or violated.

**Why this priority**: This ensures the engine delivers immediate value on the reference repo and proves that the modular architecture can express real constitution and workflow rules end-to-end.

**Independent Test**: Run the CLI in the Django Core-App repo with a minimal configuration file and verify that the engine discovers rules, loads configuration, and produces a structured pass/fail report without relying on Django-specific internals.

**Acceptance Scenarios**:

1. **Given** a Django Core-App repo with constitution and Spec Kitty artefacts, **when** the architect runs the engine with the default configuration, **then** the engine reports all constitution MUST-rule checks and Spec Kitty artefact checks with clear pass/fail status.
2. **Given** a violation of a MUST-rule (for example, a missing required Spec Kitty file), **when** the architect re-runs the engine, **then** the report highlights the failing rule, the affected file or path, and a short remediation hint.

---

### User Story 2 - Local checks for developers (Priority: P2)

As a **developer**, I can run a single CLI command locally before committing or opening a PR to ensure my current changes do not introduce new constitutional or workflow violations.

**Why this priority**: Local feedback prevents violations from reaching CI and keeps the repository aligned with the constitution and SDD workflow as changes are made.

**Independent Test**: From a working copy of the repo, run the CLI in a pre-commit-like mode and verify that it exits non‑zero on new violations and zero when all configured checks pass.

**Acceptance Scenarios**:

1. **Given** a clean working tree and a valid configuration file, **when** the developer runs the engine locally, **then** it exits with status 0 and prints a short summary of checks performed.
2. **Given** an introduced violation (for example, a missing required file or invalid workflow state), **when** the developer runs the engine, **then** it exits with status non‑zero and clearly lists the failing rules.

---

### User Story 3 - CI enforcement and reusable adapters (Priority: P3)

As a **reviewer or maintainer**, I can integrate the engine into CI (for example, GitHub Actions) so that each PR is automatically checked, and I can reuse the same engine and adapter pattern in other repositories.

**Why this priority**: CI enforcement and a reusable adapter pattern ensure that constitutional checks are consistently applied across repos and over time, not just on a single project.

**Independent Test**: Configure a minimal Git/GitHub adapter and CI workflow that invokes the engine on every push; verify that failing rules cause the CI job to fail and that the output is readable from the CI logs.

**Acceptance Scenarios**:

1. **Given** a repository with the engine configured as a GitHub Actions job, **when** a PR introduces a violation, **then** the workflow fails and the action logs list the failing checks.
2. **Given** another repository wired through the same adapter pattern, **when** the engine runs with a different constitution and configuration file, **then** it still loads rules and reports results correctly without code changes.

---

### Edge Cases

- What happens when the constitution file or Spec Kitty workflow documents cannot be found? The engine must fail fast with a clear error pointing to the missing paths.
- How does the system handle an unknown or malformed rule configuration? The engine must report configuration errors separately from rule failures and avoid partial, silent execution.
- What happens when a repository has additional, unrecognized directories or files? The engine must ignore irrelevant content unless a rule explicitly targets it.
- How are timeouts or very large repositories handled? The engine must be able to limit scope (for example, to specific directories) and surface a clear warning if execution exceeds configured limits.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The engine MUST provide a modular core that can discover and load rule modules, validators, reporters, and adapters based on configuration, without hard-coding repository or stack details.
- **FR-002**: The engine MUST load configuration from a `constitution_engine.yaml` file in the target repository (or a specified path) and use it to determine which rules and validators to run.
- **FR-003**: The engine MUST implement a constitution MUST‑rule matcher that reads the project constitution (for example, from `context/`) and reports which MUST‑rules are satisfied or violated for a given repository.
- **FR-004**: The engine MUST validate Spec Kitty artefacts (for example, `spec.md`, `plan.md`, `tasks.md`, and workflow docs under `kitty-specs/<feature>/`) against the SDD workflow to ensure required files and sections exist.
- **FR-005**: The engine MUST validate workflow state (for example, feature lanes and activity logs) against `SPEC_KITTY_WORKFLOW.md` to ensure that only allowed transitions and phases are used.
- **FR-006**: The engine MUST perform basic repository hygiene checks (for example, required top‑level files, forbidden temporary directories, and missing documentation) and report violations.
- **FR-007**: The engine MUST expose a CLI that can be invoked locally to run a configured set of checks and return a non‑zero exit code when any configured rule fails.
- **FR-008**: The engine MUST provide a minimal Git/GitHub adapter that can be used in CI pipelines (for example, GitHub Actions) to run the same checks and surface results in workflow logs.
- **FR-009**: The engine MUST include an initial Django Core-App adapter that configures the engine for the Django skeleton repository, while keeping the core and rules stack‑agnostic.
- **FR-010**: The engine MUST support pluggable modules under a directory layout such as `core/`, `rules/`, `validators/`, `reporters/`, `workflow/`, `spec-kitty-integration/`, `modules/{python,js,yaml,docker,terraform}`, and `adapters/{git,github-actions}`.

### Key Entities *(include if feature involves data)*

- **Constitution Rule**: Represents a single MUST‑rule or related constraint drawn from the project constitution, with fields such as identifier, description, severity, and mapping to concrete checks.
- **Check Result**: Represents the outcome of running a rule or validator, including rule identifier, status (pass/fail/skip), affected paths, and human‑readable message.
- **Configuration Profile**: Represents the effective configuration loaded from `constitution_engine.yaml` (and any defaults), including enabled rules, target directories, and adapter options.
- **Repository Context**: Represents high‑level information about the repository under test (for example, root path, detected workflow structure, feature directories).

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows; the Django adapter is a thin configuration layer over a generic engine.
- [x] All functionality is reusable across multiple downstream products via configuration and adapter modules.
- [x] Extension points are clearly documented for adding project‑specific adapters and rule packs in separate modules.

### Architecture & Modularity (Principle II)
- [x] Feature defines clear modules for core engine, rules, validators, reporters, workflow integration, and adapters.
- [x] No circular dependencies are introduced; adapters and rule modules depend on the core, not vice versa.
- [x] Extension points and module boundaries are documented so new stacks can integrate without modifying the core.

### Code Quality (Principle III)
- [x] Python-based parts of the engine (for example, initial reference implementation) will target Python 3.12+.
- [x] Type hints will be used in core modules and public interfaces to support static analysis.
- [x] Code will be formatted with Black and linted with Ruff in this repository.

### Testing (Principle IV)
- [x] Test plan includes unit tests for rule modules and validators, plus integration tests that run the engine against a sample repository.
- [x] Coverage targets will be defined for the core engine and adapters to ensure key paths are exercised.
- [x] Integration tests will verify end‑to‑end flows: local CLI usage and CI integration for the Django Core-App skeleton.

### Security & Privacy (Principle V)
- [x] Engine configuration avoids embedding secrets; any credentials (for example, for remote Git operations) remain external.
- [x] No secrets are stored in code; repository checks operate on local files and metadata only.
- [x] Logs avoid including sensitive data; they focus on rule identifiers, paths, and high‑level messages.

### Performance & Reliability (Principle VI)
- [x] Checks are designed to operate on repository contents without excessive resource usage; the engine can scope checks to specific directories when needed.
- [x] Where potentially expensive scans are required, they will be documented and can be toggled via configuration.
- [x] Structured outputs (for example, JSON) will be available so other tools can consume results reliably.

### Documentation (Principle XI)
- [x] Feature will include documentation describing configuration, rule categories, and adapter usage.
- [x] Extension guides will be updated or added to explain how to integrate the engine with new stacks.
- [x] If major architectural decisions are made (for example, around plugin loading or configuration formats), they will be captured as ADRs.

**Violations Requiring Justification**: None.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the Django Core-App skeleton repository, running the engine with the default configuration completes in under 30 seconds on a typical developer machine and reports constitution and workflow results for 100% of configured checks.
- **SC-002**: At least 90% of new feature branches in the Django Core-App repository pass all configured engine checks locally before opening a PR (as observed over an initial evaluation period).
- **SC-003**: At least 95% of CI runs that fail due to constitutional enforcement include clear, actionable messages that enable developers to correct violations without additional documentation.
- **SC-004**: The engine is successfully integrated into at least one additional repository (beyond Django Core-App) using the same core and adapter pattern within the first three months after introduction.
