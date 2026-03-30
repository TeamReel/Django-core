# Feature Flags - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Feature flag management and toggling
- **Time**: 5-7 minuten
- **Prerequisites**: Demo shell running, admin or org admin access
- **Test Data**: Seed feature flags from backend

## 🚀 Quick Access
- **Feature Flags Page**: http://localhost:3000/flags
- **Navigation**: Sidebar → Configuration → "🚩 Feature Flags"
- **API**: http://localhost:8000/api/v1/settings/feature-flags/

## 📋 Visual Test Scenarios

### Scenario 1: Feature Flags List Display
**Steps**:
1. Navigate to Feature Flags page
2. Check that feature flags table loads
3. Review flag information displayed
4. Verify flag status indicators

**Expected Results**:
- ✅ Feature flags display in table format
- ✅ Each flag shows: name, key, description, enabled status
- ✅ Enabled flags have green/active indicator
- ✅ Disabled flags have gray/inactive indicator
- ✅ Rollout percentage displays (if applicable)

**Pass/Fail**:
- [ ] Pass: Feature flags list displays correctly
- [ ] Fail: Empty list or display errors

### Scenario 2: Toggle Feature Flag (Admin)
**Steps**:
1. Login as Admin user
2. Navigate to Feature Flags page
3. Locate a disabled feature flag
4. Click toggle/enable button
5. Verify flag status changes to enabled
6. Verify success confirmation appears

**Expected Results**:
- ✅ Toggle button is clickable for admins
- ✅ Flag status updates immediately
- ✅ Success message confirms change
- ✅ UI reflects new state (color/badge change)
- ✅ Flag remains enabled on page refresh

**Pass/Fail**:
- [ ] Pass: Admin can toggle flags successfully
- [ ] Fail: Toggle doesn't work or state doesn't persist

### Scenario 3: Feature Flag Permissions (Viewer/Player)
**Steps**:
1. Login as Player or non-admin user
2. Navigate to Feature Flags page
3. Attempt to toggle a feature flag
4. Verify action is blocked

**Expected Results**:
- ✅ Feature flags list is visible (read-only)
- ✅ Toggle buttons are disabled OR show warning
- ✅ If clicked: "Permission denied" or similar message
- ✅ Flag state does not change
- ✅ No API call made (or API returns 403)

**Pass/Fail**:
- [ ] Pass: Non-admins cannot modify flags
- [ ] Fail: Non-admins can toggle flags

### Scenario 4: Feature Flag Detail Information
**Steps**:
1. Navigate to Feature Flags page
2. Click on a feature flag to view details (if supported)
3. Review flag metadata
4. Check creation/update timestamps

**Expected Results**:
- ✅ Flag name and key displayed
- ✅ Full description shown
- ✅ Rollout percentage visible (if gradual rollout)
- ✅ Created/updated timestamps present
- ✅ Flag scope indicated (global/org/project)

**Pass/Fail**:
- [ ] Pass: Flag details are comprehensive
- [ ] Fail: Missing information or broken detail view
- [ ] N/A: Detail view not implemented (list-only)

### Scenario 5: Feature Flag Affects Application Behavior
**Steps**:
1. Identify a feature controlled by a flag (e.g., "new_dashboard_ui")
2. Note current flag state (enabled/disabled)
3. Navigate to affected feature page
4. Verify behavior matches flag state
5. Toggle flag (if admin)
6. Revisit feature page
7. Verify behavior changed

**Expected Results**:
- ✅ When flag disabled: feature not visible/accessible
- ✅ When flag enabled: feature visible/accessible
- ✅ Flag change takes effect immediately (or after refresh)
- ✅ No errors or broken UI when toggling
- ✅ Flag state controls intended behavior

**Pass/Fail**:
- [ ] Pass: Feature flags control app behavior correctly
- [ ] Fail: Flags don't affect behavior
- [ ] N/A: No feature-controlled behavior in demo yet

## 🐛 Troubleshooting

### Flags Not Loading
- **Check**: API endpoint `/api/v1/settings/feature-flags/` returns 200
- **Check**: User is authenticated
- **Check**: Backend feature flags app is installed
- **Check**: Database has feature flag records

### Toggle Not Working
- **Check**: User has admin permissions
- **Check**: CSRF token is valid
- **Check**: API returns 200/204 on toggle request
- **Check**: No JavaScript errors in console

### Flag Changes Not Reflecting
- **Check**: Flag resolution logic includes database check
- **Check**: Cache is not stale (if caching enabled)
- **Check**: Feature code checks flag correctly
- **Check**: Page refresh loads new flag state

## ✅ Success Criteria

Feature flags test succesvol als:
- Feature flags list displays correctly for all users
- Admins can toggle flags on/off successfully
- Non-admins have read-only access
- Flag state persists across sessions
- Flag changes affect application behavior (if demo features exist)
- Clear visual feedback for enabled/disabled states
- No permission bypass vulnerabilities

**Status**: 🟡 TODO - Ready to Test
