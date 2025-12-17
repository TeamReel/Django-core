---
work_package_id: "WP06"
subtasks:
  - "T034"
  - "T035"
  - "T036"
title: "Charting Integration"
phase: "Phase 4 - Charts"
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

# Work Package Prompt: WP06 – Charting Integration

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

- Chart.js and react-chartjs-2 added with lazy loading; initial bundle increase under 100KB gzipped.
- Credits page renders 30-day usage line chart; observability page renders response time line, error rate bar, and connections gauge with 30-second polling updates.
- Charts honor light/dark themes and load within 500ms when routes are visited.

## Context & Constraints

- Charts only on credits and observability pages; keep Chart.js out of initial bundle via dynamic import (per [plan.md](kitty-specs/033-demo-pages-for/plan.md)).
- Use theme-aware colors from F07; ensure accessible contrast.
- Data volumes small (30 points) per [data-model.md](kitty-specs/033-demo-pages-for/research/data-model.md); no heavy optimization needed.

## Subtasks & Detailed Guidance

### Subtask T034 – Add Chart.js deps + lazy-load infra
- **Purpose**: Introduce chart dependencies and ensure code-splitting.
- **Steps**: Add chart.js@^4 and react-chartjs-2@^5 to [examples/demo-shell/package.json](examples/demo-shell/package.json); configure Vite chunking if needed; create shared `LazyChartBoundary` component with Suspense fallback.
- **Files**: package.json in examples/demo-shell; shared components folder.
- **Parallel?**: No, must precede chart integration.

### Subtask T035 – Credits chart integration
- **Purpose**: Visualize credits usage over 30 days.
- **Steps**: Create lazy-loaded chart component (e.g., `CreditsChart.tsx`) that fetches transactions and renders line chart; integrate into CreditsPage replacing placeholder; ensure loading state and error fallback.
- **Files**: [examples/demo-shell/src/pages/config/CreditsPage.tsx](examples/demo-shell/src/pages/config/CreditsPage.tsx), [examples/demo-shell/src/components/CreditsChart.tsx](examples/demo-shell/src/components/CreditsChart.tsx).
- **Parallel?**: After T034.

### Subtask T036 – Observability charts integration
- **Purpose**: Visualize response times, error rates, active connections with polling.
- **Steps**: Add lazy chart components (line for P99/P95/median, bar for error rates, gauge-style for connections). Wire to observability polling data; ensure updates without remounting; respect theme colors.
- **Files**: [examples/demo-shell/src/pages/platform/ObservabilityPage.tsx](examples/demo-shell/src/pages/platform/ObservabilityPage.tsx), [examples/demo-shell/src/components/ObservabilityCharts.tsx](examples/demo-shell/src/components/ObservabilityCharts.tsx).
- **Parallel?**: After T034; can proceed alongside T035.

## Test Strategy

- Manual: Verify Chart.js chunk appears as separate bundle via `pnpm build` and analyzer; confirm charts render and update after 30s.
- Automated: Add data-testid hooks for chart containers so WP07 tests can assert lazy-load and rendering.

## Risks & Mitigations

- **Bundle bloat**: Use tree-shaking and `registerables` import; confirm chunk size <100KB gzipped.
- **Theme mismatch**: Derive colors from F07 variables; test in light/dark.

## Definition of Done Checklist

- [ ] Chart deps installed and code-split
- [ ] Credits chart renders and updates with live data
- [ ] Observability charts render and update with polling
- [ ] Build analysis confirms size/time targets

## Review Guidance

- Check that Chart.js is absent from main bundle and only loaded on chart pages.
- Validate polling still respects 30-second interval after chart integration.

## Activity Log

- 2025-12-17T00:00:00Z – system – lane=planned – Prompt created.
