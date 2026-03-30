# Test 32: Notification Preferences CRUD

**Status:** READY TO RUN
**Spec Reference:** Notifications baseline, contextual notifications
**Page:** `/notification-preferences`

## Test Overview

This test validates that users can manage their notification channel preferences (email, SMS, in-app, push) for different notification types, with optimistic UI updates and backend persistence.

## Quick Access

**Direct URL:** `/notification-preferences`
**Navigation:** Sidebar → Configuration → Notification Preferences

## Test Scenarios

### Scenario 1: View Notification Preferences (Any User)

**Test as:** Any role (Admin, Org Admin, Coach, Player)
**Expected behaviour:**
- Page loads with grouped notification preferences
- Each notification type shows 4 channel toggles: Email, SMS, In-App, Push
- Current preferences loaded from backend or demo data
- Enable/disable buttons present for each channel

**Success criteria:**
- ✅ Preferences grouped by notification_type
- ✅ All 4 channels displayed per type
- ✅ Current state reflects saved preferences
- ✅ Demo alert shown if backend not available

### Scenario 2: Enable Notification Channel

**Test as:** Any role
**Steps:**
1. Click "Enable" button for a disabled channel (e.g., Email for "project_updated")
2. Observe optimistic UI update (button becomes "Disable", success badge appears)
3. Verify backend POST to `/api/v1/contextual-notifications/preferences/`

**Expected behaviour:**
- Button immediately updates to "Disable"
- Success alert: "Preferences updated successfully"
- Backend API called with { notification_type, channels: [...] }
- If backend unavailable (404), changes persist in demo state only

**Success criteria:**
- ✅ Optimistic UI update works
- ✅ Success alert displayed
- ✅ Backend API called (check network tab)
- ✅ Preference persists on page refresh (if backend available)

### Scenario 3: Disable Notification Channel

**Test as:** Any role
**Steps:**
1. Click "Disable" button for an enabled channel
2. Observe UI update
3. Verify preference removed from backend

**Expected behaviour:**
- Button changes to "Enable"
- Success alert shown
- Backend DELETE or PATCH request sent
- Channel removed from enabled list

**Success criteria:**
- ✅ UI updates immediately
- ✅ Backend mutation occurs
- ✅ Preference removed on refresh

### Scenario 4: Multiple Channel Changes

**Test as:** Any role
**Steps:**
1. Toggle multiple channels (e.g., enable Email, disable SMS, enable Push)
2. Observe all changes reflected in UI
3. Refresh page and verify persistence

**Expected behaviour:**
- All toggles work independently
- Multiple success alerts may appear
- All changes persist after refresh (if backend available)

**Success criteria:**
- ✅ All toggles functional
- ✅ No race conditions or stale state
- ✅ Preferences consistent after refresh

### Scenario 5: Context-Aware Preferences

**Test as:** Any role
**Pre-condition:** Switch organization context
**Expected behaviour:**
- Preferences may be scoped to current organization
- Switching context updates displayed preferences
- Each org can have separate preferences (if backend supports)

**Success criteria:**
- ✅ Context switching updates preferences
- ✅ No leak of preferences across orgs

### Scenario 6: Demo Mode Fallback

**Test as:** Any role
**Pre-condition:** Backend API `/api/v1/contextual-notifications/preferences/` returns 404
**Expected behaviour:**
- Page displays default preferences (all channels enabled)
- Demo alert: "Demo Mode: Changes saved locally only"
- Toggles work but changes not persisted across sessions

**Success criteria:**
- ✅ Demo data loads
- ✅ Toggles functional
- ✅ Demo alert visible
- ✅ No backend errors in console

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Preferences not saving | Check backend API `/api/v1/contextual-notifications/preferences/` |
| Stale state after toggle | Verify optimistic update logic, check for race conditions |
| Missing notification types | Backend may return limited types, or demo data incomplete |
| Permission denied | Verify user has access to notification preferences (all roles should) |

## Success Criteria

- [x] Notification Preferences page loads without errors
- [x] All notification types and channels displayed
- [x] Enable/disable toggles work correctly
- [x] Optimistic UI updates functional
- [x] Backend API called for mutations (when available)
- [x] Demo mode fallback works
- [x] Context-aware preferences (if applicable)
- [x] No permission errors for any role
- [x] Preferences persist across page refreshes (backend mode)

---

**Test Coverage:**
- Notification channel CRUD
- User preference management
- Optimistic UI updates
- Demo mode resilience
