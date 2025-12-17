# SPEC_KITTY_WORKFLOW.md

## Purpose

This document defines how the Django Core-App uses Spec Kitty and AI agents for Spec-Driven Development (SDD).

---

## Core Workflow

Main lifecycle for each feature:

1. `/spec-kitty.constitution`
2. `/spec-kitty.specify`
3. `/spec-kitty.plan`
4. `/spec-kitty.tasks`
5. `/spec-kitty.implement`
6. `/spec-kitty.review`
7. `/spec-kitty.accept`
8. `/spec-kitty.merge`

Optional helpers:

- `/spec-kitty.clarify`
- `/spec-kitty.research`
- `/spec-kitty.analyze`
- `/spec-kitty.checklist`

---

## Naming and Feature IDs

- Backend features: `B01` … `B21`
- Frontend features: `F01` … `F09`

Feature naming pattern:

- `feature=<ID>-<kebab-case-slug>`

Examples:

- `feature=B05-core-accounts`
- `feature=F01-frontend-design-system`

---

## Command Guidelines

### 1. `/spec-kitty.constitution`

Used rarely, at project level.

**Purpose**

Define project-wide rules for:

- code quality and style
- testing and coverage
- security expectations
- performance guidelines
- UX and accessibility
- documentation requirements
- branching strategy and CI/CD

**Typical usage**

- At project start, and when updating the engineering rules.
- Output should be aligned with `ENGINEERING_CONSTITUTION.md`.

---

### 2. `/spec-kitty.specify`

Used **per module** (`Bxx` / `Fxx`).

**Purpose**

Clarify **WHAT** to build for a single feature, without choosing the detailed implementation yet.

**Standard structure (logical shape, not literal block)**

- Command:
  `/spec-kitty.specify feature=<ID>-<slug>`

- Sections:
  `[feature summary]`
  `[goals and non-goals]`
  `[key user stories]`
  `[constraints and assumptions]`

**Guidelines**

- Feature summary: 1–3 sentences.
- Goals: 3–7 bullets, outcome-focused.
- Non-goals: 2–5 bullets, explicitly out of scope.
- Key user stories: 3–7 stories, „As a … I want … so that …”.
- Constraints & assumptions: stack, security, performance, compatibility, dependencies.

---

### 3. `/spec-kitty.plan`

Used after a good spec exists.

**Purpose**

Define **HOW** to build the feature: architecture, data model, APIs and tests.

**Typical prompt structure (conceptual)**

- Command:
  `/spec-kitty.plan feature=<ID>-<slug>`

- Include:
  - short technical context and preferred stack
  - constraints (security, performance, compatibility)
  - explicit request for:
    - architecture overview
    - data model (models, relationships)
    - APIs and integration points
    - testing strategy

**Expected output**

- Architecture overview (layers, services, modules).
- Data model (models, fields, relationships).
- APIs (endpoints, request/response shapes).
- Integration points with existing modules.
- Testing strategy (unit, integration, edge cases).

---

### 4. `/spec-kitty.tasks`

Used to break a plan into work packages and tasks.

**Purpose**

Turn a plan into manageable, testable work items.

**Conventions**

- Work packages: `WP01`, `WP02`, `WP03`, …
- Tasks per work package: `T001`, `T002`, `T003`, …

**Typical prompt structure (conceptueel)**

- Command:
  `/spec-kitty.tasks feature=<ID>-<slug>`

- Content:
  - short recap of the feature context and plan
  - ask for:
    - work packages with IDs and clear goals
    - tasks with IDs under each WP
    - dependencies between WPs/tasks
    - acceptance criteria per WP

**Per work package, expect**

- clear goal
- list of small, testable tasks
- dependencies (other WPs or tasks)
- acceptance criteria

---

### 5. `/spec-kitty.implement`

Used with a coding agent (bijv. GitHub Copilot Agent) voor **één work package tegelijk**.

**Purpose**

Guide implementation in small, safe steps, always backed by tests.

**Conventions**

- Command pattern:
  `/spec-kitty.implement feature=<ID>-<slug> work-package=<WPxx>`

- Include in prompt:
  - identify the current work package and its goal
  - short summary of models/APIs/files affected
  - ask for step-by-step implementation, with tests and migrations where relevant
  - explicitly ask to keep CI and lint checks green

**Guidelines**

- Never ask to implement an entire feature at once.
- Always reference:
  - feature ID,
  - work package ID,
  - any relevant spec/plan sections.
- Prefer small commits/changes that are easy to review and revert.

---

### 6. `/spec-kitty.review`

Used for code review (AI review agent en/of human).

**Purpose**

Validate that implementation matches the spec, is correct, readable, secure en performant.

**Conventions**

- Command pattern:
  `/spec-kitty.review feature=<ID>-<slug> work-package=<WPxx>`

- Prompt content:
  - short description of what was implemented in this work package
  - ask to review against spec, plan and tasks
  - ask for concise, actionable feedback on:
    - correctness
    - readability
    - tests
    - security
    - performance
  - ask for a short summary of issues and suggested fixes

**What to check**

- Alignment with spec and plan.
- Completeness of tasks in this WP.
- Tests present and meaningful.
- Security (auth, access control, data handling).
- Performance in obvious hotspots.
- Readability and maintainability.

---

### 7. `/spec-kitty.accept`

Used when a **feature (Bxx/Fxx)** is believed to be complete.

**Purpose**

Final verification before merging to `main` (of een andere target branch).

**Conventions**

- Command pattern:
  `/spec-kitty.accept feature=<ID>-<slug>`

- Prompt content:
  - describe what should be completed for this feature
  - ask to verify that:
    - all work packages are done
    - all tasks are done or explicitly dropped (met motivatie)
    - tests pass
    - quality gates (linting, coverage, performance, security) are met
    - documentation is updated

**Checks**

- All WPs complete.
- All tasks done or consciously dropped.
- CI green (tests, linting, type checks, security scans).
- Docs updated where relevant.
- Geen open critical/high issues.

---

### 8. `/spec-kitty.merge`

Used to finish the feature and integrate it.

**Purpose**

Execute the configured merge workflow in a controlled way.

**Conventions**

- Command pattern:
  `/spec-kitty.merge feature=<ID>-<slug>`

- Prompt content:
  - confirm the feature is ready to be merged
  - ask to:
    - check branch freshness vs `main`
    - apply the configured merge strategy (e.g. squash merge)
    - update tags and changelog if defined for this project

**Typical steps**

- Reconfirm readiness (based on `/spec-kitty.accept`).
- Check branch is up to date.
- Apply merge strategy (bij voorkeur squash).
- Update tags/changelog indien geconfigureerd.

---

## Optional Commands

### `/spec-kitty.clarify`

**Purpose**

Resolve unclear requirements or conflicting constraints.

**Use**

- Before or during `/spec-kitty.specify` or `/spec-kitty.plan`.

**Typical content**

- describe ambiguities or open questions
- ask for a list of concrete clarification questions and possible options

---

### `/spec-kitty.research`

**Purpose**

Explore options, best practices or trade-offs for a given topic.

**Use**

- When making architectural or tooling decisions.
- Before finalising specs or plans.

**Typical content**

- describe the decision/topic
- ask for short summary of trade-offs, best practices and a recommended approach for this project

---

### `/spec-kitty.analyze`

**Purpose**

Check for inconsistencies, gaps or risks across specs, plans and tasks.

**Use**

- Before starting large implementation waves.
- When multiple modules interact in complex ways.

**Typical content**

- high-level description of current specs/plans/tasks
- ask to identify inconsistencies, gaps, risks and suggest mitigation

---

### `/spec-kitty.checklist`

**Purpose**

Generate focused checklists for implementation, review or acceptance.

**Use**

- To guide human and AI behaviour during intensive work sessions.
- To keep quality high and predictable.

**Typical content**

- describe current phase (implementation, review, accept)
- ask for a concise checklist tailored to that phase and the feature

---

## AI Interaction Style

- Specs, plans, tasks and prompts in **English**.
- Always include:
  - current phase,
  - feature ID (Bxx/Fxx),
  - work package ID (if applicable).
- One main goal per prompt.
- Prefer small, incremental steps with rapid feedback from CI and review.
- Refer to:
  - `PROJECT_VISION.md`
  - `core-modules-overview.md`
  - `ENGINEERING_CONSTITUTION.md`
  - `PROJECT_ROADMAP.md`
  - `CURRENT_STEP.md`
whenever additional context is helpful.

---
