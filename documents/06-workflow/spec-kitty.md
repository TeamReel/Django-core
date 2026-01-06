# Spec-Kitty Workflow

## Purpose

This document defines how the Django Core-App uses Spec Kitty and AI agents for **Spec-Driven Development (SDD)**.

---

## Core Workflow

The lifecycle for each feature follows this strict sequence:

1.  `/spec-kitty.constitution` (Project setup)
2.  `/spec-kitty.specify` (Define WHAT)
3.  `/spec-kitty.plan` (Define HOW)
4.  `/spec-kitty.tasks` (Breakdown)
5.  `/spec-kitty.implement` (Code)
6.  `/spec-kitty.review` (Verify)
7.  `/spec-kitty.accept` (Validate)
8.  `/spec-kitty.merge` (Integrate)

---

## Command Reference

### 1. `/spec-kitty.specify`
**Purpose**: Clarify **WHAT** to build.
**Scope**: Single module (`Bxx` / `Fxx`).
**Output**: Summary, Goals, Non-goals, User Stories, Constraints.

### 2. `/spec-kitty.plan`
**Purpose**: Define **HOW** to build it.
**Input**: Approved Spec.
**Output**: Architecture, Data Model, API Endpoints, Testing Strategy.

### 3. `/spec-kitty.tasks`
**Purpose**: Break plan into testable work items.
**Output**: Work Packages (WP01, WP02...) and Tasks (T001, T002...).

### 4. `/spec-kitty.implement`
**Purpose**: Guide coding agent.
**Constraint**: One Work Package at a time.
**Focus**: TDD, Green CI, Small commits.

### 5. `/spec-kitty.review`
**Purpose**: Validate implementation against Spec/Plan.
**Checks**: Correctness, Readability, Security, Performance.

### 6. `/spec-kitty.accept`
**Purpose**: Final verification before merge.
**Checks**: All WPs done, CI green, Docs updated.

---

## Feature Naming

*   **Backend**: `B01` … `B29`
*   **Frontend**: `F01` … `F15`
*   **Data**: `D01` … `D16`
*   **Platform**: `P01` … `P05`
*   **Integration**: `I01` … `I02`
*   **Operations**: `O01`

**Pattern**: `feature=<ID>-<kebab-case-slug>`
**Example**: `feature=B05-core-accounts`

---

## AI Interaction Guidelines

*   **Language**: English.
*   **Context**: Always reference Feature ID and Work Package ID.
*   **Goal**: One main goal per prompt.
*   **References**:
    *   `documents/01-vision/principles.md`
    *   `documents/02-roadmap/index.md`
    *   `documents/03-system/constitution.md`
