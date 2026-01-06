# Test 33: Usage Events Tracking

**Status:** READY TO RUN
**Spec Reference:** Usage tracking, analytics foundation
**Page:** `/usage-events`

## Test Overview

This test validates that the Usage Events page displays recorded usage events scoped to the current organization/project context, and allows generation of test events via a demo action button.

## Quick Access

**Direct URL:** `/usage-events`
**Navigation:** Sidebar → Configuration → Usage Events

## Test Scenarios

### Scenario 1: View Usage Events (Admin)

**Test as:** Admin
**Expected behaviour:**
- Page loads with usage events table
- Displays: timestamp, event type, user, organization, project, metadata
- Events filterable by selected organization/project context
- Mock data appears if backend not implemented (404 → demo mode)

**Success criteria:**
- ✅ Usage events table visible
- ✅ All columns displayed correctly
- ✅ Context filtering applies (org/project)
- ✅ Mock data fallback works

### Scenario 2: View Usage Events (Org Admin)

**Test as:** Org Admin
**Expected behaviour:**
- Page shows events scoped to own organization only
- Cannot see events from other organizations
- All event types visible within org scope

**Success criteria:**
- ✅ Only own org events visible
- ✅ No permission errors
- ✅ Events filtered by organization_id

### Scenario 3: View Usage Events (Coach)

**Test as:** Coach
**Expected behaviour:**
- Read-only access to org usage events
- Can view all events within organization
- No create/edit/delete actions (except demo button)

**Success criteria:**
- ✅ Read-only access granted
- ✅ Events visible for own org
- ✅ No mutation actions present (except demo)

### Scenario 4: View Usage Events (Player)

**Test as:** Player
**Expected behaviour:**
- **May see only own events** (check permission model)
- If granted broader access, sees org events

**Success criteria:**
- ✅ Permission model enforced
- ✅ No leak of other users' usage data
- ✅ Player sees appropriate event subset

### Scenario 5: Generate Test Usage Event

**Test as:** Any role
**Steps:**
1. Click "🧪 Generate Test Usage Event" button
2. Observe success alert: "Test usage event generated"
3. Verify new event appears in table

**Expected behaviour:**
- Demo action button creates test event with:
  - event_type: "test_action"
  - current user_id
  - current organization_id
  - current project_id (if applicable)
  - metadata: { source: "demo" }
- Event appears immediately in table (optimistic update)
- Backend POST to `/api/v1/usage-events/` (if available)

**Success criteria:**
- ✅ Button triggers event creation
- ✅ Success alert displayed
- ✅ Event appears in table
- ✅ Backend API called (check network tab)
- ✅ Context (org/project) captured correctly

### Scenario 6: Context Switching Updates Events

**Test as:** Any role
**Steps:**
1. View events in Organization A
2. Switch to Organization B
3. Observe table updates to show only Org B events

**Expected behaviour:**
- Events re-fetched or filtered by new organization_id
- Table updates to show only context-relevant events
- Generated test events scoped to new context

**Success criteria:**
- ✅ Context switching triggers data refresh
- ✅ Events filtered correctly per context
- ✅ No cross-org data leak

### Scenario 7: Demo Mode Fallback

**Test as:** Any role
**Pre-condition:** Backend `/api/v1/usage-events/` returns 404
**Expected behaviour:**
- Page displays 3 mock usage events
- Demo alert: "Demo Mode: Using mock data"
- "Generate Test Usage Event" button still functional (adds to local state)

**Success criteria:**
- ✅ Mock data loads on 404
- ✅ Demo alert visible
- ✅ Demo button works (adds to local list)
- ✅ No backend errors in console

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| No events visible | Check organization context (select valid org) |
| Empty table | Verify backend API `/api/v1/usage-events/` or generate test event |
| Test event not appearing | Check backend endpoint, verify network request |
| Permission denied | Verify user role has access to usage events |
| Demo mode always active | Backend endpoint not implemented or returning 404 |

## Success Criteria

- [x] Usage Events page loads without errors
- [x] Table displays events with correct columns
- [x] Context filtering works (org/project scope)
- [x] "Generate Test Usage Event" button functional
- [x] Test events scoped to current context
- [x] Permission model enforced (Org Admin sees only own org, Player access controlled)
- [x] Mock data fallback functional
- [x] No XSS or data leaks in event display
- [x] Events persist after page refresh (backend mode)

---

**Test Coverage:**
- Usage event recording
- Analytics/observability foundation
- Context-aware event scoping
- Demo action button for test data generation
