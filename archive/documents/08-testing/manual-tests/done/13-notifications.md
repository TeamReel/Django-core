# Notifications System - Visual Test Guide

## 🎯 Test Overview
- **Feature**: In-app notifications and alerts system
- **Time**: 8-10 minuten
- **Prerequisites**: Notification system implemented, demo shell running
- **Test Data**: Various notification types and states

## 🚀 Quick Access
- **Notifications Page**: http://localhost:3000/notifications
- **Navigation**: Sidebar → Documentation → "🔔 Notifications"
- **Notification API**: http://localhost:8000/api/notifications/

## 📋 Visual Test Scenarios

### Scenario 1: Notification Display
**Steps**:
1. Navigate to notifications page
2. Check notification list/feed
3. Review notification types and styling
4. Test notification interaction

**Expected Results**:
- ✅ Notifications display in chronological order
- ✅ Different notification types have distinct styling
- ✅ Unread notifications are clearly indicated
- ✅ Notification content is clear and actionable

**Pass/Fail**:
- [x] Pass: Clear notification display and organization
- [ ] Fail: Poor notification layout or unclear content
- [ ] N/A: Notifications not yet implemented

### Scenario 2: Event-Triggered Notifications
**Steps**:
1. **Trigger Event A (Project Created)**:
   - Navigate to Projects page
   - Create a new project in any organisation
   - Navigate to /notifications
   - Verify new "Project Created" notification appears
   - Check notification badge count increases

2. **Trigger Event B (Member Role Changed)**:
   - Navigate to Organisation members page
   - Change a member's role (e.g., member → admin or vice versa)
   - Navigate to /notifications
   - Verify new "Role Changed" or "Member Role Updated" notification appears
   - Check notification badge count increases

3. **Verify Multi-Tenant Safety**:
   - Logout and login as different user in same organisation
   - Check they received org-wide notifications (if admin)
   - Logout and login as user in different organisation
   - Verify they do NOT see notifications from other org

**Expected Results**:
- ✅ Project creation triggers "Project Created" notification for creator
- ✅ Project creation triggers "New Project Created" for org admins
- ✅ Role change triggers "Role Changed" for affected user
- ✅ Role change triggers "Member Role Updated" for changer
- ✅ Notification badge updates immediately after action
- ✅ Notifications only visible to recipients in same organisation
- ✅ Unread count reflects new notifications

**Pass/Fail**:
- [x] Pass: Event-triggered notifications work correctly
- [ ] Fail: Missing notifications or incorrect recipients
- [ ] N/A: Event-triggered notifications not implemented

**Implementation Notes**:
- Event A: POST `/api/organisations/{slug}/projects/`
- Event B: PATCH `/api/organisations/{slug}/members/{id}/` with `{"role": "admin"}`
- Notifications created via `notifications.services` module
- Recipients: creator + org admins (Event A), affected user + changer (Event B)

### Scenario 3: Notification Actions
**Steps**:
1. Test marking notifications as read/unread
2. Test notification dismissal/deletion
3. Check bulk notification actions
4. Test notification action buttons (approve, reject, etc.)

**Expected Results**:
- ✅ Read/unread state changes work instantly
- ✅ Dismissed notifications are properly removed
- ✅ Bulk actions work for multiple notifications
- ✅ Action buttons trigger correct backend operations

**Pass/Fail**:
- [x] Pass: All notification actions work correctly
- [ ] Fail: Action failures or state inconsistencies

**Status**: 🟢 DONE
