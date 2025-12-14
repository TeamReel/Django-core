---
work_package_id: WP07
title: Notifications & Resource Alerts
lane: doing
assignee: github-copilot
agent: copilot
shell_pid: 32760
subtasks:
  - T042
  - T043
  - T044
  - T045
priority: P3
dependencies:
  - WP01
  - WP02
  - WP03
story: "P3 Story 6 - Notifications & Alerts"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: F04 notifications hub + F05 resource alerts integration
  - date: 2025-12-14T15:40:00Z
    action: started
    agent: copilot
    shell_pid: 32760
    notes: Started WP07 implementation - notifications and resource alerts
---

# WP07: Notifications & Resource Alerts

## Objective

Implement P3 Story 6 (Notifications & Alerts): integrate F04 `@django-core/notifications-hub` (inbox icon, notification list) and F05 `@django-core/resource-display-alerts` (credit usage banners). Show low-credit alert for DataLab org (25% remaining).

**Success Criterion**: Notification icon shows unread count, clicking opens inbox. DataLab dashboard shows yellow "Low credits" banner (25% usage). Alice sees "Welcome" notification.

---

## Context

**User Story**: P3 Story 6
**Priority**: P3 (Feature demo, not MVP-critical)
**Dependencies**: WP01 (seed data: notifications/transactions), WP03 (context for org-scoped alerts)

**Why This Matters**: Demonstrates F04/F05 integration, validates notification/alert UX patterns.

**Design Documents**:
- `spec.md`: AS-6.1 through AS-6.3 (notification icon, inbox, credit alerts)
- `data-model.md`: Notification, Transaction models

---

## Detailed Guidance

### T042: Integrate NotificationHub

Add to `TopNavigation.tsx`:
```typescript
import { NotificationHub } from '@django-core/notifications-hub';

<NotificationHub />
```

### T043-T044: Fetch Notifications/Transactions

Create `src/hooks/useNotifications.ts`, `src/hooks/useCredits.ts` to fetch from B16/B11 APIs.

### T045: Show CreditAlert

Add to `DashboardPage.tsx`:
```typescript
import { CreditAlert } from '@django-core/resource-display-alerts';

{credits && credits.percentage < 30 && (
  <CreditAlert
    percentage={credits.percentage}
    limit={credits.limit}
    variant="warning"
  />
)}
```

---

## DoD

- [ ] Notification icon shows unread count (alice: 1 unread)
- [ ] Clicking icon opens inbox with "Welcome to TechCorp!" message
- [ ] DataLab dashboard shows yellow "Low credits" banner (25% usage)
- [ ] E2E test verifies notifications + alerts visible

---

**Status**: Ready (blocked by WP01, WP03)
**Lane**: `planned` → `doing` after WP03 → `for_review` → `done`
