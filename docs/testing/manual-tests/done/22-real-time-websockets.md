# Manual Test Guide: Real-time WebSockets (Feature 035)

## Overview
Test the real-time WebSocket functionality by verifying that audit events appear live on the Audit Log page without refreshing.

## Prerequisites
- Django server running with WebSocket support (`daphne` or `runserver` with channels)
- Redis server running (for channels layer)
- Demo Shell running (`pnpm dev`)
- Two different browsers or one browser and an incognito window (to simulate two sessions)

## Test Scenarios

### 1. Real-time Audit Log Updates
**Objective**: Verify that actions performed in one session appear immediately in the Audit Log of another session.

**Steps**:
1. **Session A (Observer)**:
   - Log in to the Demo Shell.
   - Navigate to **Configuration** -> **Audit Log** (`/audit`).
   - Keep this window open and visible.

2. **Session B (Actor)**:
   - Open a new private/incognito window (or use a different browser).
   - Log in with a valid account (this triggers an `auth.login` event).
   - Navigate to **Identity** -> **Projects**.
   - Create a new project (triggers `resource.created`).
   - Log out (triggers `auth.logout`).

3. **Verify in Session A**:
   - Watch the Audit Log table.
   - Confirm that new rows appear for:
     - `auth.login` (from Session B)
     - `resource.created` (from Session B)
     - `auth.logout` (from Session B)
   - Verify the rows appear **without** refreshing the page.

**Expected Results**:
- [ ] WebSocket connection is established on the Audit Log page (check console for "[AuditLog] Connected...").
- [ ] New events appear at the top of the list automatically.
- [ ] Event details (User, Event Type) match the actions performed in Session B.

### 2. Filtering Verification
**Objective**: Verify that client-side filtering respects the active filters.

**Steps**:
1. **Session A**:
   - On the Audit Log page, set the **Event Type** filter to `auth.login`.
2. **Session B**:
   - Log in (should appear).
   - Create a project (should **NOT** appear).
   - Log out (should **NOT** appear).

**Expected Results**:
- [ ] Only `auth.login` events appear in the list.
- [ ] Other events are ignored by the real-time listener.

## Troubleshooting
- If events don't appear, check the browser console in Session A for WebSocket errors.
- Ensure Redis is running.
- Verify that `daphne` or the dev server is handling WebSocket connections correctly (look for `WebSocket HANDSHAKING` and `CONNECT` logs in the terminal).
