---
work_package_id: "WP06"
subtasks:
  - "T042"
  - "T043"
  - "T044"
  - "T045"
  - "T046"
  - "T047"
title: "Interactive UX & Prompts"
phase: "Phase 3 - Polish"
lane: "for_review"
assignee: "GitHub Copilot (Claude Sonnet 4.5)"
agent: "claude"
shell_pid: "46272"
review_status: "pending"
reviewed_by: ""
history:
  - timestamp: "2025-12-04"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-04T21:45:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "46272"
    action: "Started WP06 implementation: Interactive UX & Prompts"
  - timestamp: "2025-12-04T22:15:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "46272"
    action: "Completed WP06 implementation (commit 559ed5e): 6 files (+1110 lines), all 6 subtasks complete"
---

# Work Package Prompt: WP06 – Interactive UX & Prompts

## Objectives & Success Criteria

**Goal**: Implement TTY detection, Click interactive prompts, auto-detection logic, progress indicators, and post-generation summary.

**Success Criteria**:
- CLI detects TTY vs non-TTY environments automatically
- Interactive prompts appear in terminal (template selection, confirmations)
- Non-interactive defaults used in CI/CD (no hanging prompts)
- Progress indicators show file creation, validation running
- Post-generation summary lists files created and suggests next steps
- Manual UX tests verify prompts work correctly

**Constitutional Alignment**:
- **Principle VII (API Design)**: Interactive prompts provide guidance, non-interactive mode enables automation
- **Principle XI (Documentation)**: CLI is self-documenting via prompts, reduces need for external docs

---

## Context & Constraints

**Prerequisites**: WP04 (Code Generation) must be complete

**Related Documents**:
- Specification: [spec.md](../../spec.md) (FR-041-046, US1-US7)
- Planning: [plan.md](../../plan.md) (WP06 description, smart hybrid UX)
- Tasks: [tasks.md](../../tasks.md) (WP06 section)

---

## Subtasks

### T042 – Implement TTY detection [PARALLEL]
- Use `sys.stdout.isatty()` to detect terminal
- Utility function: `is_interactive() -> bool`
- Respect `--no-interactive` flag override
- **Files**: CREATE `src/scaffolding/ux/detection.py`

### T043 – Implement Click interactive prompts [PARALLEL]
- Template selection from list: `click.prompt()` with `click.Choice()`
- App name confirmation: `click.confirm()`
- Variable prompts for required template variables
- **Files**: CREATE `src/scaffolding/ux/prompts.py`

### T044 – Implement auto-detection logic [PARALLEL]
- Interactive in terminal (TTY), non-interactive in CI
- Fallback to defaults when non-interactive
- **Files**: MODIFY `src/scaffolding/ux/prompts.py`

### T045 – Implement progress indicators [PARALLEL]
- Spinner for file creation: `click.progressbar()`
- Status messages: "Rendering templates...", "Running validation..."
- Only show in interactive mode
- **Files**: CREATE `src/scaffolding/ux/progress.py`

### T046 – Implement post-generation summary [PARALLEL]
- List files created with paths
- Suggest next steps: "Run tests: pytest src/{app_name}/tests/"
- Format with Click colors (green for success)
- **Files**: CREATE `src/scaffolding/ux/summary.py`

### T047 – Add manual UX tests [PARALLEL]
- Test interactive prompts in terminal
- Test non-interactive defaults in script
- Test progress indicators display correctly
- **Files**: CREATE `tests/scaffolding/test_ux.py` (manual test guide)

---

## Definition of Done

- [ ] TTY detection implemented
- [ ] Interactive prompts for template selection, confirmations
- [ ] Auto-detection logic (terminal vs CI)
- [ ] Progress indicators for long operations
- [ ] Post-generation summary with file list and next steps
- [ ] Manual UX tests documented
- [ ] tasks.md updated: WP06 complete

---

## Activity Log

- 2025-12-04 – system – lane=planned – Prompt created via /spec-kitty.tasks
