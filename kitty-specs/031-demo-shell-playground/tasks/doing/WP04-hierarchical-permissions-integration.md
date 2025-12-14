---
work_package_id: WP04
title: Hierarchical Permissions Integration
lane: "doing"
subtasks:
  - T027
  - T028
  - T029
  - T030
  - T031
  - T032
priority: P1
dependencies:
  - WP01
  - WP02
  - WP03
story: "P1 Story 3 - Permissions & Access Control"
agent: "claude"
shell_pid: "32760"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: Permission-based UI showing/hiding using hierarchical roles
---

# WP04: Hierarchical Permissions Integration

## Objective

Implement P1 Story 3 (Permissions & Access Control): integrate hierarchical permission checks using B08 APIs or create shim if `@django-core/permissions` not available. Show/hide UI elements based on user permissions (admin sees "Edit Project" button, member doesn't).

**Success Criterion**: Alice (admin) sees edit buttons on TechCorp projects, Bob (member) doesn't. E2E test `permissions-flow.spec.ts` passes.

---

## Context

**User Story**: P1 Story 3 - Permissions & Access Control
**Priority**: P1 (Last MVP feature, completes P1 scope)
**Dependencies**: WP01 (seed data with alice=admin, bob=member), WP02 (auth), WP03 (context)

**Why This Matters**: Permission checks are critical for multi-tenant apps. This validates B08 permission APIs and establishes pattern for future features.

**Design Documents**:
- `spec.md`: AS-3.1 through AS-3.5 (admin/member scenarios)
- `research.md`: Unknown 1 (may need shim if @django-core/permissions unavailable)
- `data-model.md`: Permission model (B08), alice=admin/bob=member memberships

---

## Detailed Guidance

### T027-T029: Permission Hook/Shim

**If @django-core/permissions exists**: Use package hook.
**If not**: Create `src/hooks/usePermissions.ts`:

```typescript
import { useContext } from '@django-core/context-switcher';
import { useAuth } from '@django-core/auth';

export function usePermissions() {
  const { user } = useAuth();
  const { currentOrg } = useContext();

  const hasPermission = (permission: string): boolean => {
    // Shim: Check org membership role
    const membership = user?.organisationMemberships?.find(
      m => m.organisation.id === currentOrg?.id
    );

    if (!membership) return false;

    if (permission === 'organisation.projects.edit') {
      return membership.role === 'admin';
    }

    // Default deny
    return false;
  };

  return { hasPermission };
}
```

**T030**: Add edit button to `ProjectListPage`:
```typescript
const { hasPermission } = usePermissions();

{hasPermission('organisation.projects.edit') && (
  <Button variant="primary">Edit Project</Button>
)}
```

**T031-T032**: E2E tests for alice (sees button) vs bob (doesn't).

---

## DoD

- [ ] Permission check hook/shim created
- [ ] Edit button shown for admin (alice), hidden for member (bob)
- [ ] E2E tests pass: alice logs in → sees edit button, bob logs in → doesn't

---

**Status**: Ready (blocked by WP01-WP03)
**Lane**: `planned` → `doing` after WP03 → `for_review` → `done`

## Activity Log

- 2025-12-14T14:02:14Z – claude – shell_pid=32760 – lane=doing – Started WP04: Hierarchical Permissions Integration implementation
