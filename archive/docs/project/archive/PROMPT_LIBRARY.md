# PROMPT_LIBRARY.md

Purpose: reusable prompt templates for Spec Kitty and AI coding agents (e.g. GitHub Copilot Agent) in the Django Core-App project.

---

## Global Usage Pattern

Always start with the correct Spec Kitty command on the first line, then provide compact context and a clear ask.

Common placeholders:

- `<ID>` → module id, e.g. `B05` or `F01`
- `<slug>` → kebab-case slug, e.g. `core-accounts`
- `<wave>` → roadmap wave, e.g. `Wave 2 — Identity & Multi-Tenancy`
- `<WPxx>` → work package, e.g. `WP01`
- `<Txxx>` → task, e.g. `T001`

When helpful, mention:

- project files: PROJECT_VISION, PROJECT_ROADMAP, ARCHITECTURE_OVERVIEW
- governance: ENGINEERING_CONSTITUTION, SPEC_KITTY_WORKFLOWS, CHECKLISTS
- modules: CORE_MODULAR_OVERVIEW
- context: CURRENT_STEP

---

## 1. Constitution Prompts

### 1.1 Initial Constitution

/spec-kitty.constitution

The project is the „Django Core-App”: a technology-agnostic SaaS foundation on Django 5 / Python 3.12 for secure, multi-tenant, well-governed products. It follows Spec-Driven Development with Spec Kitty and AI agents.

Using PROJECT_VISION, ARCHITECTURE_OVERVIEW and ENGINEERING_CONSTITUTION as guidance, write or refine a concise engineering constitution that defines:
- code quality and style expectations,
- testing and coverage standards,
- security and privacy requirements,
- performance and scalability guidelines,
- UX and accessibility expectations,
- documentation requirements,
- branching strategy, CI/CD and merge policies.

Return a structured Markdown document that is easy for both humans and AI agents to follow.

---

### 1.2 Update Constitution for a New Concern

/spec-kitty.constitution

The existing engineering constitution is in ENGINEERING_CONSTITUTION. We want to strengthen the rules regarding `<topic>` (for example: rate limiting, observability, or AI-generated code review).

Propose an updated version of the relevant section(s) of the constitution that:
- keeps the existing structure,
- adds clear, enforceable rules for `<topic>`,
- remains realistic for day-to-day development.

Return only the updated sections plus a short changelog note.

---

## 2. Specify Prompts

### 2.1 Standard Module Specification (Bxx/Fxx)

/spec-kitty.specify feature=<ID>-<slug>

We are specifying feature `<ID>-<slug>` from CORE_MODULAR_OVERVIEW, in the context of the Django Core-App roadmap (see PROJECT_ROADMAP and PROJECT_VISION).

Please provide:
[feature summary]
- 1–3 sentences describing what this feature does and why it exists.

[goals and non-goals]
- 3–7 bullet goals (outcomes for the platform, not implementation details).
- 2–5 bullet non-goals clarifying what is explicitly out of scope.

[key user stories]
- 3–7 user stories in the format „As a … I want … so that …” that cover the main flows and stakeholders.

[constraints and assumptions]
- stack and integration constraints (Django 5, DRF, Celery, etc.),
- security, performance and i18n considerations,
- dependencies on other modules or waves.

Make sure the spec is implementation-agnostic but concrete enough to guide planning.

---

### 2.2 Narrow Specialisation of an Existing Spec

/spec-kitty.specify feature=<ID>-<slug>

We already have a specification for `<ID>-<slug>`. We now want to refine it for the first implementation slice focused on `<sub-scope>` (for example: „read-only APIs”, „admin-only flows”, „MVP path”).

Based on the original spec, write a narrowed spec for this slice that includes:
[feature summary]
[goals and non-goals] (for this slice only)
[key user stories] (prioritised for this slice)
[constraints and assumptions] (including explicit out-of-scope items from the full spec)

This slice should be small enough to implement in 1–2 waves of work packages.

---

## 3. Plan Prompts

### 3.1 Technical Plan for a Feature

/spec-kitty.plan feature=<ID>-<slug>

We have a clear spec for `<ID>-<slug>` in SPEC_KITTY_WORKFLOWS and CORE_MODULAR_OVERVIEW. Stack: Django 5, DRF, PostgreSQL, Celery/Redis and Docker as per STACK_AND_TOOLS.

Please propose a technical plan that includes:

- Architecture overview:
  - how this feature fits into the layered architecture from ARCHITECTURE_OVERVIEW,
  - modules, services and boundaries involved.

- Data model and APIs:
  - Django models and relationships,
  - DRF serializers and viewsets/endpoints,
  - how this feature reuses existing modules (Bxx/Fxx) where applicable.

- Integration points:
  - dependencies on other modules (e.g. accounts, organisations, notifications),
  - async tasks, settings/flags and audit logging.

- Testing strategy:
  - key unit tests and integration tests,
  - edge cases and failure modes,
  - how to use the existing test tooling.

Return the plan in a clear, sectioned Markdown format that can be consumed for /spec-kitty.tasks.

---

### 3.2 Minimal Plan for a Spike

/spec-kitty.plan feature=<ID>-<slug>

We want a minimal „spike” plan for `<ID>-<slug>` focusing on exploring `<uncertainty>` (for example: performance constraints, data model risk, external integration).

Design a lightweight plan that:
- defines 1–3 small experiment implementations,
- minimises irreversible decisions,
- highlights what data we should collect,
- states clear success/failure criteria.

Output should be short and targeted at informing a later, full plan.

---

## 4. Tasks Prompts

### 4.1 Full Work Package Breakdown

/spec-kitty.tasks feature=<ID>-<slug>

Using the latest plan for `<ID>-<slug>`, break the implementation into work packages and tasks.

Return:

- Work packages:
  - IDs: `WP01`, `WP02`, …,
  - short goal per WP,
  - dependencies between WPs.

- Tasks per work package:
  - IDs: `T001`, `T002`, …,
  - each small, testable and ideally doable in a few hours,
  - explicit test and documentation tasks where needed.

- Acceptance criteria:
  - per WP, linked to the spec and plan,
  - include checks for tests, linting and security where relevant.

Format the output as a Markdown table or clear lists suitable for a kanban board.

---

### 4.2 Tasks for a Focused Refactor

/spec-kitty.tasks feature=<ID>-<slug>

We are doing a targeted refactor of `<area>` within `<ID>-<slug>`. The goal is to improve `<goal>` (for example: performance, readability, testability) without changing external behaviour.

Please:
- define 1–2 small work packages,
- list concrete refactor tasks per WP,
- specify acceptance criteria ensuring no behaviour regressions,
- highlight any risks and rollback strategies.

Keep the breakdown small and safe for AI-assisted implementation.

---

## 5. Implement Prompts

### 5.1 Implement a Work Package

/spec-kitty.implement feature=<ID>-<slug> work-package=<WPxx>

You are a coding agent working in the Django Core-App repository. Implement `<WPxx>` for `<ID>-<slug>` using the existing spec, plan and tasks.

Context:
- Stack: as defined in STACK_AND_TOOLS.
- Architecture and patterns: see ARCHITECTURE_OVERVIEW and ENGINEERING_CONSTITUTION.
- This work package goal: `<short goal of WPxx>`.

Please:
- work in small, incremental steps,
- for each step:
  - explain what you will do,
  - apply changes,
  - add or update tests,
  - run tests and checks where possible.
- respect all security, performance and style rules from the constitution.
- avoid large, sweeping changes; keep changes focused on this WP.

Stop after the work package acceptance criteria are met and summarise the changes.

---

### 5.2 Implement a Single Task in an Existing WP

/spec-kitty.implement feature=<ID>-<slug> work-package=<WPxx>

Focus only on task `<Txxx>` in `<WPxx>` for feature `<ID>-<slug>`. The goal of this task is: `<short task description>`.

Please:
- identify the relevant files and code locations,
- propose a tiny plan for this one task,
- implement the change,
- add or update tests specific to this task,
- run tests/checks for the affected area if available.

Do not touch unrelated modules or tasks.

---

## 6. Review Prompts

### 6.1 Work Package Review

/spec-kitty.review feature=<ID>-<slug> work-package=<WPxx>

Review the changes for `<WPxx>` of `<ID>-<slug>`.

Check against:
- the feature spec (/spec-kitty.specify),
- the technical plan (/spec-kitty.plan),
- the task list (/spec-kitty.tasks).

Provide:
- correctness review (does it do the right thing),
- readability and maintainability feedback,
- tests and coverage review,
- security and performance notes,
- a short list of concrete issues and suggested fixes, ordered by severity.

Assume ENGINEERING_CONSTITUTION and CHECKLISTS as the quality bar.

---

### 6.2 Focused Security Review

/spec-kitty.review feature=<ID>-<slug> work-package=<WPxx>

Perform a focused security review of the implementation in `<WPxx>` for `<ID>-<slug>`.

Please:
- identify any authentication or authorization concerns,
- check for data leakage or logging of sensitive data,
- review external calls and error handling for security issues,
- highlight missing tests for security-relevant paths.

Return a short list of findings with concrete remediation suggestions.

---

## 7. Accept Prompts

### 7.1 Feature Acceptance Check

/spec-kitty.accept feature=<ID>-<slug>

We believe `<ID>-<slug>` is complete. All work packages `WPxx` have been implemented and reviewed.

Using CHECKLISTS and ENGINEERING_CONSTITUTION:
- verify that all WPs and tasks are either done or explicitly dropped (with rationale),
- confirm that tests, linting, type checks and security scans are passing,
- check that documentation is updated where appropriate,
- list any remaining non-blocking issues or follow-up items.

Respond with:
- „Ready to merge” or „Not ready to merge” plus reasoning,
- a short checklist showing which criteria passed or failed.

---

## 8. Merge Prompts

### 8.1 Merge Workflow

/spec-kitty.merge feature=<ID>-<slug>

Assume `<ID>-<slug>` has passed `/spec-kitty.accept`. We now want to merge this feature into `main` following the project’s merge policy.

Please:
- confirm again that the accept criteria are satisfied,
- describe the expected merge process (branch checks, squash, tags, changelog),
- list any pre-merge sanity checks we should manually verify,
- specify post-merge actions (e.g. docs update, follow-up tickets).

Keep the output as a short procedure checklist.

---

## 9. Clarify, Research, Analyze, Checklist Prompts

### 9.1 Clarify Ambiguous Requirements

/spec-kitty.clarify feature=<ID>-<slug>

We want to clarify requirements for `<ID>-<slug>`. There are ambiguities or tensions in:
`<short description of ambiguities or open questions>`.

Please:
- list concrete clarification questions we should answer,
- for each question, suggest 2–3 plausible options with pros/cons,
- highlight which answers affect architecture, data model, timelines or security most.

---

### 9.2 Research Technical Options

/spec-kitty.research feature=<ID>-<slug>

We need to choose an approach for `<topic>` within `<ID>-<slug>` (for example: task scheduling strategy, caching layer, API versioning approach).

Please:
- outline 2–4 viable options for this project’s stack,
- summarise trade-offs, risks and long-term implications per option,
- recommend one option for the Django Core-App context,
- explain how the recommendation aligns with PROJECT_VISION and ENGINEERING_CONSTITUTION.

Keep the output concise and actionable.

---

### 9.3 Analyze Specs, Plan and Tasks for Gaps

/spec-kitty.analyze feature=<ID>-<slug>

We already have a spec, plan and tasks for `<ID>-<slug>`. Before implementation, we want to check for gaps or inconsistencies.

Please:
- identify missing pieces or contradictions between spec, plan and tasks,
- highlight risks (technical, security, UX, performance),
- propose concrete changes (to spec, plan or tasks) to address these issues.

Return your findings as a short, prioritised list.

---

### 9.4 Phase-Specific Checklist

/spec-kitty.checklist feature=<ID>-<slug>

We are currently in phase `<phase>` for `<ID>-<slug>` (for example: „implementation”, „review”, „accept”).

Using CHECKLISTS and ENGINEERING_CONSTITUTION:
- generate a concise checklist (5–10 items) tailored to this phase,
- include both technical and process checks,
- make it suitable to quickly validate quality during a vibecoding session.

Return only the checklist items with short explanations.

---
