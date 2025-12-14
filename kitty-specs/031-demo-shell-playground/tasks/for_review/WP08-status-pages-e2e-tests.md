---
work_package_id: WP08
title: Status Pages & E2E Tests
lane: for_review
assignee: github-copilot
agent: copilot
shell_pid: 32760
subtasks:
  - T046
  - T047
  - T048
  - T049
  - T050
  - T051
  - T052
  - T053
  - T054
  - T055
  - T056
  - T057
  - T058
priority: P3
dependencies:
  - WP01
  - WP02
  - WP03
  - WP04
story: "P3 Story 7 - System Status & Health"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: Health check page + comprehensive E2E test suite
  - date: 2025-12-14T17:00:00Z
    action: started
    agent: copilot
    shell_pid: 32760
    notes: Started WP08 implementation - status pages and E2E test suite
  - date: 2025-12-14T17:30:00Z
    action: completed
    agent: copilot
    shell_pid: 32760
    notes: |
      Completed status pages and E2E test suite (partial):
      - T046-T049: Status pages (Health, Permissions, routes, sidebar)
      - T050-T052: E2E test suite (Playwright config, auth-flow, context-permissions)
      - TypeScript compilation verified (0 errors)
      - README updated with Status Pages documentation
      Note: T053-T058 deferred (requires backend + CI setup)
---

# WP08: Status Pages & E2E Tests

## Objective

Implement P3 Story 7 (System Status & Health): create `/status` page showing backend health, frontend version, and package statuses. Add comprehensive E2E test suite covering 2 critical journeys (auth → context → permissions; notifications → alerts). Ensure CI smoke tests <10 minutes (S-002).

**Success Criterion**: `/status` page shows "Backend: Healthy ✅", "Frontend: v1.0.0", "Packages: 7/7 loaded". E2E suite (5 existing + 2 new = 7 tests) passes in <10 minutes.

---

## Context

**User Story**: P3 Story 7
**Priority**: P3 (Observability, CI validation)
**Dependencies**: WP01-WP04 (all features implemented)

**Why This Matters**: Status page enables quick health checks. E2E suite validates end-to-end integration. CI smoke tests ensure deployability.

**Design Documents**:
- `spec.md`: AS-7.1 through AS-7.3 (status page, E2E journeys, CI time)
- `research.md`: Playwright config (retries=0, determinism)

---

## Detailed Guidance

### T046-T048: Status Page

Create `src/pages/StatusPage.tsx`:
```typescript
export default function StatusPage() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/health/')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error' }));
  }, []);

  return (
    <div>
      <h1>System Status</h1>
      <p>Backend: {health?.status === 'healthy' ? '✅ Healthy' : '❌ Error'}</p>
      <p>Frontend: v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</p>
      <p>Packages: 7/7 loaded</p>
    </div>
  );
}
```

### T049-T056: E2E Test Suite

**Journey 1** (auth-context-permissions.spec.ts):
1. Log in as alice
2. Switch to TechCorp
3. Navigate to projects
4. Verify "Edit" button visible (admin permission)
5. Log out, log in as bob
6. Verify "Edit" button hidden (member permission)

**Journey 2** (notifications-alerts.spec.ts):
1. Log in as alice
2. Verify notification icon shows unread count
3. Click icon → inbox opens with "Welcome" message
4. Switch to DataLab org
5. Verify "Low credits" alert visible

### T057-T058: CI Smoke Test Script

Create `.github/workflows/smoke-test.yml`:
```yaml
name: Demo Shell Smoke Tests
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker compose -f docker-compose.local.yml up -d
      - run: cd examples/demo-shell && pnpm install
      - run: pnpm test:e2e
```

**Constraint**: Must complete in <10 minutes (S-002).

---

## DoD

- [x] Status pages accessible at `/status/health` and `/status/permissions` (dev mode only)
- [x] E2E test suite created with 13 tests (6 auth-flow + 7 context-permissions)
- [x] Playwright config with retries=0, trace on failure, deterministic setup
- [x] TypeScript compilation passes (0 errors)
- [x] README documentation for status pages
- [ ] E2E tests executed locally (DEFERRED - requires backend running)
- [ ] CI workflow (DEFERRED - T054-T058 for separate CI implementation phase)
- [ ] E2E test duration <10 minutes (DEFERRED - validation requires CI setup)

---

**Status**: Ready (blocked by WP01-WP04)
**Lane**: `planned` → `doing` after WP04 → `for_review` → `done`
