# CHECKLISTS.md

## Purpose

This document provides short checklists for different phases of the SDD workflow.
They are meant to be used by humans and AI agents.

---

## 1. Implementation Checklist

Use when finishing a work package (`/spec-kitty.implement`).

- [ ] All related tasks (Txxx) are implemented.
- [ ] New/changed code is covered by tests.
- [ ] Linting and type checks pass locally.
- [ ] Security-sensitive changes follow the security baseline.
- [ ] Public interfaces (APIs, models) are documented where relevant.
- [ ] No obvious duplication or dead code introduced.

---

## 2. Review Checklist

Use during `/spec-kitty.review`.

- [ ] Implementation matches the spec and plan for this feature.
- [ ] Tests are present, meaningful and passing.
- [ ] Error handling is clear and safe.
- [ ] No obvious security issues (auth, access control, injections, secrets).
- [ ] Performance is reasonable (no obvious N+1 or heavy loops in hot paths).
- [ ] Code is readable and follows naming conventions.
- [ ] Docs and changelog entries are updated if needed.

---

## 3. Accept Checklist

Use during `/spec-kitty.accept`.

- [ ] All work packages for this feature are complete.
- [ ] All tasks are marked as done or explicitly dropped (with reasoning).
- [ ] CI is green (tests, linting, type checks, security scans).
- [ ] Observability added where necessary (logs, metrics, health checks).
- [ ] Documentation updated:
  - [ ] feature-level docs (if any)
  - [ ] module overview (if applicable)
- [ ] No open critical or high-severity issues remain for this feature.

---

## 4. Merge Checklist

Use during `/spec-kitty.merge`.

- [ ] Branch is up to date with `main` (or target branch).
- [ ] Merge conflicts resolved cleanly.
- [ ] Commit history is acceptable (squash or tidy as per policy).
- [ ] Tags and changelog entries updated if required.
- [ ] Any necessary follow-up tickets created for non-blocking items.

---
