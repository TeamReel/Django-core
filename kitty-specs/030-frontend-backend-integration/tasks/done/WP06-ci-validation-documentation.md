---
work_package_id: "WP06"
subtasks:
  - "T035"
  - "T036"
  - "T037"
title: "CI Validation & Documentation"
phase: "Phase 3 - Support & Polish"
lane: "done"
assignee: ""
agent: "github-copilot-reviewer"
shell_pid: "36848"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-14T08:32:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP06 – CI Validation & Documentation

## Objectives & Success Criteria

Implement automated validation for example code (TypeScript type-check + lint + build) and integrate into CI pipeline. Ensures examples remain valid as Core-App evolves.

**Success Metrics**:
- Validation script runs in <2 minutes
- Pre-commit hook blocks invalid examples
- CI fails PRs with invalid examples
- Clear, actionable validation output

---

## Context & Constraints

**Prerequisites**: WP01 (package structure), WP02-WP04 (example code)

**Related Documents**:
- Spec: FR-032 to FR-040 (validation requirements)
- Research: D3 (validation approach)

---

## Subtasks & Detailed Guidance

### T035: Create validation script
Script: `pnpm --filter @django-core/integration-guides-examples type-check && lint && build`
Should complete in <2 minutes, provide clear error messages.

### T036: Integrate into pre-commit hooks
Add to `.pre-commit-config.yaml`, run on example file changes only.

### T037: Add CI workflow
GitHub Actions step to run validation, fail PR on errors.

---

## Definition of Done Checklist

- [ ] Validation script created and tested
- [ ] Pre-commit hook blocks invalid commits
- [ ] CI workflow added and tested
- [ ] Validation completes in <2 minutes
- [ ] `tasks.md` updated

---

## Activity Log

- 2025-12-14T08:32:00Z – system – lane=planned – Prompt created
- 2025-12-14T08:47:24Z – github-copilot – shell_pid=36848 – lane=doing – Started implementation of CI validation and documentation
- 2025-12-14T08:49:19Z – github-copilot – shell_pid=36848 – lane=for_review – Completed WP06 implementation: CI validation scripts, pre-commit hooks, and GitHub Actions workflow
- 2025-12-14T08:51:25Z – github-copilot-reviewer – shell_pid=36848 – lane=done – Code review complete: Approved without changes. Validation scripts, pre-commit hook, and CI workflow verified present and aligned with success criteria.
