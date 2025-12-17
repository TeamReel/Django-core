---
work_package_id: "WP07"
subtasks:
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
  - "T044"
title: "E2E, Performance, Docs"
phase: "Phase 5 - Quality"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-17T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---
*Path: [templates/task-prompt-template.md](templates/task-prompt-template.md)*

# Work Package Prompt: WP07 – E2E, Performance, Docs

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

- Full Playwright coverage for all pages (admin/member/viewer) with stable fixtures and `data-testid` hooks; suites run under 5 minutes.
- Performance gates met: <2s page load for 95% of pages; Chart.js chunk loads <500ms; bundle increase <100KB gzipped.
- Documentation updated with page inventory and test commands; quickstart reflects final routes.

## Context & Constraints

- Tests rely on seed data counts from [data-model.md](kitty-specs/033-demo-pages-for/research/data-model.md) and acceptance scenarios in [spec.md](kitty-specs/033-demo-pages-for/spec.md).
- Use Playwright auto-wait; avoid sleeps. Provide fixtures for admin, member, viewer, and context headers.
- Performance measurement should use `pnpm build` and analyzer; record results for review.

## Subtasks & Detailed Guidance

### Subtask T037 – Playwright fixtures (roles/context)
- **Purpose**: Shared auth/context setup for tests.
- **Steps**: Create fixtures for admin@demo, viewer@demo (and member if needed); fixtures MUST use session cookies from B05 (already wired in module 031 auth wrapper; NOT token-based). Include login helper that posts to `/api/auth/login/`, captures session cookie, and propagates context headers (X-Organisation-ID, X-Project-ID) from F03 context. Expose `test` wrapper extending Playwright base.
- **Files**: [examples/demo-shell/tests/e2e/fixtures/](examples/demo-shell/tests/e2e/fixtures/).
- **Parallel?**: Yes.

### Subtask T038 – E2E tests for P1 pages
- **Purpose**: Cover identity/config flows.
- **Steps**: Add specs under [examples/demo-shell/tests/e2e/identity](examples/demo-shell/tests/e2e/identity) and [examples/demo-shell/tests/e2e/config](examples/demo-shell/tests/e2e/config); assert seed counts, permissions, theme persistence.
- **Parallel?**: Yes, after fixtures.

### Subtask T039 – E2E tests for platform pages
- **Purpose**: Cover health/constitution/security/observability/api-docs/dashboard.
- **Steps**: Add specs under [examples/demo-shell/tests/e2e/platform](examples/demo-shell/tests/e2e/platform); assert polling updates (observability), Swagger loads, status cards visible.
- **Parallel?**: Yes.

### Subtask T040 – E2E tests for frontend showcase
- **Purpose**: Validate design-system, auth, context, resources, templates, theme, integration pages render.
- **Steps**: Add specs under [examples/demo-shell/tests/e2e/frontend](examples/demo-shell/tests/e2e/frontend); check interactions and theme toggle.
- **Parallel?**: Yes.

### Subtask T041 – E2E tests for ops/docs/i18n
- **Purpose**: Cover tasks, notifications, deployment, docs, i18n.
- **Steps**: Add specs under [examples/demo-shell/tests/e2e/docs](examples/demo-shell/tests/e2e/docs); verify retry/mark-read actions, status matrix, language persistence across navigation.
- **Parallel?**: Yes.

### Subtask T042 – E2E tests for charts
- **Purpose**: Validate Chart.js lazy load and rendering.
- **Steps**: Add specs targeting credits and observability pages; assert chunk loads on demand (network requests), charts render data, polling updates charts without reload.
- **Files**: Add under relevant category (config/platform) or shared charts folder.
- **Parallel?**: Yes, after WP06.

### Subtask T043 – Performance + bundle verification
- **Purpose**: Enforce performance targets.
- **Steps**: Run `pnpm build` and analyzer; capture chunk sizes and TTI metrics; ensure Chart.js chunk <100KB gzipped and page load <2s (document method).
- **Files**: Build artifacts; update summary in docs or PR notes.
- **Parallel?**: No, depends on feature completion.

### Subtask T044 – README/quickstart doc updates
- **Purpose**: Keep documentation aligned with final routes/tests.
- **Steps**: Update [examples/demo-shell/README.md](examples/demo-shell/README.md) with page inventory table; adjust [kitty-specs/033-demo-pages-for/quickstart.md](kitty-specs/033-demo-pages-for/quickstart.md) commands and routes.
- **Parallel?**: Yes, after routes stable.

## Test Strategy

- Commands: `pnpm test:e2e` (all), category-specific paths for targeted runs; enable headed mode for debugging.
- Ensure tests assert no console errors and correct HTTP status for each page; use `data-testid` selectors added in earlier WPs.

## Risks & Mitigations

- **Flaky tests**: Use auto-wait, avoid timeouts, rely on seed data values; add retry logic in Playwright config if needed.
- **Performance noise**: Document machine specs and run build/analyze twice to confirm consistency.

## Definition of Done Checklist

- [ ] Fixtures created and reused across suites
- [ ] All Playwright suites passing (<5 minutes) in CI
- [ ] Performance metrics captured and within targets
- [ ] README and quickstart updated
- [ ] Code review approved by F10 Demo Foundation team

## Review Guidance

- Verify tests cover viewer/member/admin role expectations.
- Check performance evidence (screenshots or logs) included in PR description.

## Activity Log

- 2025-12-17T00:00:00Z – system – lane=planned – Prompt created.
