---
work_package_id: "WP03"
subtasks:
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
title: "Platform Status Pages"
phase: "Phase 2 - Platform"
lane: "for_review"
assignee: ""
agent: "GitHub Copilot"
shell_pid: "31680"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-17T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-17T00:00:00Z"
    lane: "doing"
    agent: "GitHub Copilot"
    shell_pid: "31680"
    action: "Started implementation"
  - timestamp: "2025-12-17T00:00:00Z"
    lane: "for_review"
    agent: "GitHub Copilot"
    shell_pid: "31680"
    action: "Completed: All 6 platform pages implemented (T016-T021), routes wired, build passing, ready for review"
---
*Path: [templates/task-prompt-template.md](templates/task-prompt-template.md)*

# Work Package Prompt: WP03 – Platform Status Pages

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

- Platform status pages (health, constitution, security, observability base, api-docs, dashboard) implemented with live data from B01-B18.
- Observability polls every 30 seconds; no charts yet but metrics update without reload.
- Swagger UI embedded and functional for API baseline; dashboard landing links to all categories.

## Context & Constraints

- Follow navigation and routing established in WP01; use F06 layouts and F01 components.
- Polling interval fixed at 30 seconds (see [research.md](kitty-specs/033-demo-pages-for/research/research.md)); ensure cleanup on unmount.
- Security page must surface ASVS status and audit-derived events; health page must show PostgreSQL, Redis, Django, Python with statuses (per [spec.md](kitty-specs/033-demo-pages-for/spec.md)).

## Subtasks & Detailed Guidance

### Subtask T016 – Health check page
- **Purpose**: Display system health and versions.
- **Steps**: Call `/api/health/`; render cards for services, status, version, timestamp; show green indicators when healthy.
- **Files**: [examples/demo-shell/src/pages/platform/HealthCheckPage.tsx](examples/demo-shell/src/pages/platform/HealthCheckPage.tsx).
- **Parallel?**: Yes.

### Subtask T017 – Constitution page
- **Purpose**: Show rule compliance.
- **Steps**: Fetch `/api/constitution/rules/`; display categories, active count, violations; include summary of recent violations if present.
- **Files**: [examples/demo-shell/src/pages/platform/ConstitutionPage.tsx](examples/demo-shell/src/pages/platform/ConstitutionPage.tsx).
- **Parallel?**: Yes.

### Subtask T018 – Security page
- **Purpose**: Present security events and ASVS status.
- **Steps**: Fetch `/api/security/events/`; show severity badges, resolved status; include ASVS scorecard from response metadata if available.
- **Files**: [examples/demo-shell/src/pages/platform/SecurityPage.tsx](examples/demo-shell/src/pages/platform/SecurityPage.tsx).
- **Parallel?**: Yes.

### Subtask T019 – Observability page (base)
- **Purpose**: Base metrics display with polling (no charts yet).
- **Steps**: Use `usePolling(30000, fetchMetrics)` to call `/api/observability/metrics/`; **important**: backend returns precomputed metrics: `response_time_p99`, `response_time_p95`, `response_time_median` (milliseconds), `error_rate_4xx`, `error_rate_5xx` (percentages), `active_connections` (integer). Render tables/cards for these values; show last updated timestamp and manual refresh button.
- **Files**: [examples/demo-shell/src/pages/platform/ObservabilityPage.tsx](examples/demo-shell/src/pages/platform/ObservabilityPage.tsx).
- **Parallel?**: Yes, after polling hook from WP01.

### Subtask T020 – API docs page
- **Purpose**: Embed Swagger UI for API baseline.
- **Steps**: Embed `/api/docs/` (iframe or component) with fallback if CORS fails; provide link to `/api/docs/swagger.json`.
- **Files**: [examples/demo-shell/src/pages/platform/ApiDocsPage.tsx](examples/demo-shell/src/pages/platform/ApiDocsPage.tsx).
- **Parallel?**: Yes.

### Subtask T021 – Dashboard landing
- **Purpose**: Provide high-level summary linking to categories.
- **Steps**: Create cards linking to identity/config/platform/frontend/docs; include small stats (org count, tasks, notifications) using existing API calls if cheap.
- **Files**: [examples/demo-shell/src/pages/platform/DashboardPage.tsx](examples/demo-shell/src/pages/platform/DashboardPage.tsx).
- **Parallel?**: Yes.

## Risks & Mitigations

- **Polling leaks**: Ensure interval cleared on unmount; debounce manual refresh.
- **Swagger embed**: If iframe blocked, use dynamic fetch of swagger JSON with fallback link.

## Definition of Done Checklist

- [ ] All platform pages render live data without console errors
- [ ] Observability polls every 30s and shows last updated timestamp
- [ ] API docs page usable (embed or link fallback)
- [ ] Dashboard links reach all categories

## Review Guidance

- Confirm interval is 30000 ms; verify observability still functional without charts.
- Check accessibility of embeds and status indicators.

## Activity Log

- 2025-12-17T00:00:00Z – system – lane=planned – Prompt created.
- 2025-12-17T19:17:49Z – GitHub Copilot – shell_pid=31680 – lane=doing – Started implementation
