# Test 31: Notification Routing Logs

**Status:** ✅ DONE
**Spec Reference:** Notifications baseline, contextual notifications
**Page:** `/routing-logs`

## Test Overview

This test validates that the Notification Routing Logs page correctly displays routing decisions for contextual notifications, showing which channels were selected for delivery based on user preferences and system rules.

## Quick Access

**Direct URL:** `/routing-logs`
**Navigation:** Sidebar → Documentation → Routing Logs

## Test Scenarios

### Scenario 1: View Routing Logs (Admin)

**Test as:** Admin
**Expected behaviour:**
- Page loads with routing logs table
- Displays timestamp, notification type, routing decision, recipients, channels
- Context filter works (shows logs for selected org)
- Mock data appears if backend not implemented (404 → demo mode)

**Success criteria:**
- ✅ Routing logs visible with all columns
- ✅ Badge colors match decision type
- ✅ Context filtering applies correctly
- ✅ Mock data fallback works

### Scenario 2: View Routing Logs (Org Admin)

**Test as:** Org Admin
**Expected behaviour:**
- Page loads with routing logs scoped to own organization
- Cannot see logs from other organizations
- All routing decisions visible within org scope

**Success criteria:**
- ✅ Only own org logs visible
- ✅ No permission errors
- ✅ Logs filtered by organization_id

### Scenario 3: View Routing Logs (Coach)

**Test as:** Coach
**Expected behaviour:**
- Page loads (read-only access)
- Can view routing logs for own organization
- No edit/delete actions available

**Success criteria:**
- ✅ Read-only access granted
- ✅ Logs visible for own org
- ✅ No mutation actions present

### Scenario 4: View Routing Logs (Player)

**Test as:** Player
**Expected behaviour:**
- **May not have access** (check permission model)
- If granted, sees only logs related to own user_id

**Success criteria:**
- ✅ Permission model enforced correctly
- ✅ No leak of other users' routing decisions

### Scenario 5: Verify Routing Decision Details

**Test as:** Admin
**Expected behaviour:**
- Routing logs show decision: "delivered", "filtered", "failed"
- Channels array shows selected delivery methods
- Recipients count matches expected value
- Notification type is readable and accurate

**Success criteria:**
- ✅ Decision badges colored correctly
- ✅ Channels displayed as comma-separated list
- ✅ Recipient count accurate
- ✅ Notification type clear

### Scenario 6: Demo Mode Fallback

**Test as:** Any role
**Pre-condition:** Backend `/api/v1/contextual-notifications/routing-logs/` returns 404
**Expected behaviour:**
- Page displays 3 mock routing log entries
- Demo alert shown: "Demo Mode: Using mock data"
- Table functional with demo data

**Success criteria:**
- ✅ Mock data loads on 404
- ✅ Demo alert visible
- ✅ UI remains functional

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| No logs visible | Check organization context (select valid org) |
| Empty table | Verify backend API `/api/v1/contextual-notifications/routing-logs/` |
| Permission denied | Check user role (Player may not have access) |
| Demo mode always active | Backend endpoint not implemented or returning 404 |

## Success Criteria

- [x] Routing logs page loads without errors
- [x] Table displays routing decisions with correct columns
- [x] Context filtering works correctly
- [x] Permission model enforced (Org Admin sees only own org, Player access controlled)
- [x] Mock data fallback functional
- [x] Badge colors match decision type
- [x] No XSS or data leaks in log display

---

**Test Coverage:**
- Contextual notifications routing system
- Audit/observability of notification delivery
- Permission-based access control
