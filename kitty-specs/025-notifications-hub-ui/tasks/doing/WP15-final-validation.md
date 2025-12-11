---
work_package_id: "WP15"
subtasks: ["T086", "T087", "T088", "T089", "T090"]
title: "Final Validation & Browser Testing"
phase: "Phase 6 - Documentation & Polish"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "26596"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP15 – Final Validation & Browser Testing

## Objectives & Success Criteria

Run full test suite, verify coverage, fix linting/type errors, and test in all supported browsers.

**Success Criteria**:
- All tests pass (unit + integration)
- Code coverage ≥ 85%
- Zero ESLint warnings
- Zero TypeScript errors
- Works in Chrome, Firefox, Safari, Edge (last 2 versions)
- Performance metrics met: toast < 1s, mark-as-read < 500ms, no lag with 1000+ notifications

## Key Validation Steps

### T086 – Full Test Suite & Coverage
Run `pnpm test -- --coverage`. Verify 85%+ coverage. Add tests for gaps.

### T087 – ESLint
Run `pnpm run lint`. Fix all warnings. Use `--fix` for auto-fixable issues.

### T088 – Type Checking
Run `tsc --noEmit`. Fix all TypeScript errors.

### T089 – Browser Testing
Test in Chrome, Firefox, Safari, Edge (last 2 versions). Use BrowserStack or local VMs.

### T090 – Performance Audit
Use React DevTools Profiler. Verify: toast < 1s, mark-as-read < 500ms, 60fps with 1000+ notifications.

## Files
- Fix any issues discovered in existing files
- Update `.eslintignore`, `tsconfig.json` if needed

## References
- [spec.md](../spec.md) - Success criteria
- [plan.md](../plan.md) - Browser support targets

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
- 2025-12-11T21:30:49Z – claude – shell_pid=26596 – lane=doing – Started final validation
