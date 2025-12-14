---
work_package_id: WP05
title: Reusable Page Template Examples
lane: planned
subtasks:
  - T033
  - T034
  - T035
  - T036
  - T037
priority: P2
dependencies:
  - WP01
  - WP02
  - WP03
story: "P2 Story 4 - Reusable Page Templates"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: F06 page templates integration (list/detail patterns)
---

# WP05: Reusable Page Template Examples

## Objective

Implement P2 Story 4 (Reusable Page Templates): refactor existing pages to use F06 `@django-core/page-templates` components (ListPageTemplate, DetailPageTemplate, EmptyState) for consistent layout and reduced code duplication.

**Success Criterion**: OrganisationListPage and ProjectListPage use `<ListPageTemplate>`, OrganisationDetailPage uses `<DetailPageTemplate>`. Empty states show when no data. LOC reduced by ~30%.

---

## Context

**User Story**: P2 Story 4
**Priority**: P2 (Polish, not MVP-blocking)
**Dependencies**: WP03 (existing pages to refactor)

**Why This Matters**: F06 templates reduce boilerplate, establish consistent patterns, improve maintainability.

**Design Documents**:
- `spec.md`: AS-4.1 through AS-4.3 (list/detail/empty state patterns)

---

## Detailed Guidance

### T033-T035: Refactor Pages

**Before** (OrganisationListPage, ~50 LOC):
```typescript
<AppShell>
  <h1>Organizations</h1>
  {isLoading && <p>Loading...</p>}
  {orgs.map(...)}
</AppShell>
```

**After** (~25 LOC using F06):
```typescript
import { ListPageTemplate } from '@django-core/page-templates';

<ListPageTemplate
  title="Organizations"
  items={orgs}
  isLoading={isLoading}
  emptyMessage="No organizations found"
  renderItem={org => <OrgCard org={org} />}
/>
```

**T036-T037**: Unit tests for template rendering.

---

## DoD

- [ ] 3 pages refactored to use F06 templates
- [ ] Empty states render when no data
- [ ] LOC reduced (verify git diff)
- [ ] Unit tests pass

---

**Status**: Ready (blocked by WP03)
**Lane**: `planned` → `doing` after WP03 → `for_review` → `done`
