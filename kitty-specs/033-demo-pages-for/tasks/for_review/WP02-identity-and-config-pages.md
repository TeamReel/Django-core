---
work_package_id: "WP02"
subtasks:
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
  - "T014"
  - "T015"
title: "Identity & Config Pages"
phase: "Phase 1 - P1 Delivery"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "Claude Haiku 4.5"
shell_pid: "31680"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-17T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-17T19:35:00Z"
    lane: "doing"
    agent: "Claude Haiku 4.5"
    shell_pid: "31680"
    action: "Transitioned to doing lane. Beginning MVP implementation (T006-T015)."
  - timestamp: "2025-12-17T20:10:00Z"
    lane: "for_review"
    agent: "Claude Haiku 4.5"
    shell_pid: "31680"
    action: "All 10 subtasks completed. Identity pages (6): organisations, org detail, projects, project detail, permissions, profile. Config pages (4): audit, flags, credits, preferences. Routes wired in App.tsx. Ready for review."
---
*Path: [templates/task-prompt-template.md](templates/task-prompt-template.md)*

# Work Package Prompt: WP02 – Identity & Config Pages

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

- Deliver P1 pages for identity (organisations/projects/detail, permissions, profile) and config (audit, flags, credits base, preferences) using F01/F06 components only.
- Pages consume live APIs (B05-B12) and display seed data counts per [data-model.md](kitty-specs/033-demo-pages-for/research/data-model.md).
- Preferences updates persist theme/language via B12; credits shows alerts for low balance (MarketingHub) without charts yet.

## Context & Constraints

- Keep all styling through F01 components; no custom CSS. Use query params for filters/sort (see [research.md](kitty-specs/033-demo-pages-for/research/research.md)).
- Respect B08 permissions: viewer cannot see admin actions; member org-scoped; admin full.
- Use context headers from F03 for org/project scoping. Seed data expectations listed in [plan.md](kitty-specs/033-demo-pages-for/plan.md).

## Subtasks & Detailed Guidance

### Subtask T006 – Organisations list page
- **Purpose**: Show 5 orgs with counts and credit balances; supports sort/filter via query params.
- **Steps**: Use `useQueryParams` for sort/order; fetch `/api/organisations/`; render table/cards with F01 components; include context switcher integration.
- **Files**: [examples/demo-shell/src/pages/identity/OrganisationsPage.tsx](examples/demo-shell/src/pages/identity/OrganisationsPage.tsx).
- **Parallel?**: Yes.

### Subtask T007 – Organisation detail page
- **Purpose**: Display org summary, members/projects, credits snippet.
- **Steps**: Fetch `/api/organisations/:id/` and related projects; show metrics cards; link to project detail; respect permissions for actions (view-only if viewer).
- **Files**: [examples/demo-shell/src/pages/identity/OrganisationDetailPage.tsx](examples/demo-shell/src/pages/identity/OrganisationDetailPage.tsx).
- **Parallel?**: Yes.

### Subtask T008 – Projects list page
- **Purpose**: Org-scoped projects view with pagination/filters.
- **Steps**: Apply `X-Organisation-ID` header from context; use query params for filter/sort; show counts per seed data.
- **Files**: [examples/demo-shell/src/pages/identity/ProjectsPage.tsx](examples/demo-shell/src/pages/identity/ProjectsPage.tsx).
- **Parallel?**: Yes.

### Subtask T009 – Project detail page
- **Purpose**: Show project metadata, members, recent activity.
- **Steps**: Fetch `/api/projects/:id/`; render detail cards and activity feed subset (can reuse audit data filtered by project_id).
- **Files**: [examples/demo-shell/src/pages/identity/ProjectDetailPage.tsx](examples/demo-shell/src/pages/identity/ProjectDetailPage.tsx).
- **Parallel?**: Yes.

### Subtask T010 – Permissions dashboard
- **Purpose**: Visualize viewer/member/admin capabilities.
- **Steps**: Fetch `/api/permissions/`; render matrix; hide admin-only actions for non-admin; include explanatory copy for stakeholders.
- **Files**: [examples/demo-shell/src/pages/identity/PermissionsPage.tsx](examples/demo-shell/src/pages/identity/PermissionsPage.tsx).
- **Parallel?**: Yes.

### Subtask T011 – Profile page
- **Purpose**: Display current user info and roles.
- **Steps**: Use `/api/users/me/`; show name/email/role/last_login; include link to preferences.
- **Files**: [examples/demo-shell/src/pages/identity/ProfilePage.tsx](examples/demo-shell/src/pages/identity/ProfilePage.tsx).
- **Parallel?**: Yes.

### Subtask T012 – Audit log page
- **Purpose**: Present audit events with filters.
- **Steps**: Use `useQueryParams` for type/user/date; fetch `/api/audit/`; show table (200+ events) with pagination; filter by authentication events per acceptance.
- **Files**: [examples/demo-shell/src/pages/config/AuditLogPage.tsx](examples/demo-shell/src/pages/config/AuditLogPage.tsx).
- **Parallel?**: Yes.

### Subtask T013 – Feature flags page
- **Purpose**: Show org-scoped flags with toggles.
- **Steps**: Fetch `/api/features/`; display rollout percentages and overrides; toggles reflect enabled/disabled; actions respect permissions (viewer read-only).
- **Files**: [examples/demo-shell/src/pages/config/FeatureFlagsPage.tsx](examples/demo-shell/src/pages/config/FeatureFlagsPage.tsx).
- **Parallel?**: Yes.

### Subtask T014 – Credits page (base)
- **Purpose**: Show balances/alerts and transactions without charts.
- **Steps**: Fetch `/api/credits/` and `/api/credits/transactions/`; render alert for MarketingHub low balance; table for last 30 days; leave chart placeholder for WP06.
- **Files**: [examples/demo-shell/src/pages/config/CreditsPage.tsx](examples/demo-shell/src/pages/config/CreditsPage.tsx).
- **Parallel?**: Yes.

### Subtask T015 – Preferences page
- **Purpose**: Persist theme/language/timezone via B12.
- **Steps**: Fetch `/api/preferences/`; form with theme toggle and language dropdown; POST updates; ensure immediate UI update using F07 hook; persist across navigation.
- **Files**: [examples/demo-shell/src/pages/config/PreferencesPage.tsx](examples/demo-shell/src/pages/config/PreferencesPage.tsx).
- **Parallel?**: Yes.

## Test Strategy

- Manual smoke: navigate to each P1 route as admin and viewer; confirm data counts match [data-model.md](kitty-specs/033-demo-pages-for/research/data-model.md) expectations.
- Automated: Covered later in WP07 Playwright; ensure pages expose stable `data-testid` hooks for tables, cards, and alerts.

## Risks & Mitigations

- **Permission leaks**: Gate admin-only buttons; add conditional rendering based on role data.
- **Seed data mismatches**: Use constants from data-model to assert counts in Playwright.

## Definition of Done Checklist

- [x] Identity and config pages render live data with no console errors
- [x] Viewer vs admin visibility confirmed for actions
- [x] Preferences update theme/language immediately and persist
- [x] Credits page shows low-balance alert; chart placeholder ready for WP06

## Review Guidance

- Validate routes and breadcrumbs align with [spec.md](kitty-specs/033-demo-pages-for/spec.md) user stories 1-2.
- Check that query params drive filters (URLs shareable) and that context headers are applied.

## Activity Log

- 2025-12-17T00:00:00Z – system – lane=planned – Prompt created.
- 2025-12-17T19:35:00Z – Claude Haiku 4.5 – lane=doing – Started implementation of T006-T015.
- 2025-12-17T20:10:00Z – Claude Haiku 4.5 – lane=for_review – **WP02 COMPLETE** - All 10 subtasks implemented:
  - ✅ T006: OrganisationsPage (list with sort/filter via useQueryParams)
  - ✅ T007: OrganisationDetailPage (members, projects, credits)
  - ✅ T008: ProjectsPage (org-scoped with X-Organisation-ID header)
  - ✅ T009: ProjectDetailPage (members, recent audit events)
  - ✅ T010: PermissionsPage (role matrix, stakeholder-friendly)
  - ✅ T011: ProfilePage (user info with link to preferences)
  - ✅ T012: AuditLogPage (200+ events, pagination, filters)
  - ✅ T013: FeatureFlagsPage (toggles, rollout %, permission-aware)
  - ✅ T014: CreditsPage (balance, usage, low-balance alerts, chart placeholder)
  - ✅ T015: PreferencesPage (theme/language/timezone persistence via B12)
  - Routes wired in App.tsx (10 new routes: /organisations, /projects, /permissions, /profile, /audit, /flags, /credits, /preferences)
  - All pages use F01 components exclusively, F06 templates, real API integration (B05-B15)
  - Permission-aware UI, data-testid attributes for E2E tests
