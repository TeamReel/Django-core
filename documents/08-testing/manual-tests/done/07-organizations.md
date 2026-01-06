# Organizations Management - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Multi-tenant organization management
- **Time**: 10-12 minuten
- **Prerequisites**: Admin access, multiple test organizations
- **Test Data**: Sample organizations with different configurations

## 🚀 Quick Access
- **Organizations Page**: http://localhost:3000/organisations
- **Navigation**: Sidebar → Identity & Context → "🏢 Organisations"
- **API**: http://localhost:8000/api/v1/organisations/

## 📋 Visual Test Scenarios

### Scenario 1: Organizations List View
**Steps**:
1. Navigate to Organizations page
2. Check organization list display
3. Review organization information shown
4. Test list sorting/filtering (if available)

**Expected Results**:
- ✅ Organizations displayed in clean list/grid format
- ✅ Each org shows: name, description, member count, creation date
- ✅ Actions available: view, edit, delete (based on permissions)
- ✅ Add new organization button is visible

**Pass/Fail**:
- [ ] Pass: Clear organizations overview
- [ ] Fail: Missing information or poor layout

### Scenario 2: Create New Organization
**Steps**:
1. Click "Add/Create Organization" button
2. Fill out organization form
3. Submit and verify creation
4. Check new organization appears in list

**Expected Results**:
- ✅ Creation form with required fields (name, description)
- ✅ Form validation works (required fields, duplicates)
- ✅ Success message after creation
- ✅ New organization immediately visible in list

**Pass/Fail**:
- [ ] Pass: Organization creation works smoothly
- [ ] Fail: Form errors or creation fails

### Scenario 3: Organization Details View
**Steps**:
1. Click on an organization to view details
2. Check information completeness
3. Review member list
4. Test available actions

**Expected Results**:
- ✅ Complete organization profile information
- ✅ List of organization members with roles
- ✅ Organization settings/configuration options
- ✅ Edit/manage options (if permitted)

**Pass/Fail**:
- [ ] Pass: Comprehensive organization details
- [ ] Fail: Missing information or broken functionality

### Scenario 4: Edit Organization
**Steps**:
1. Access edit mode for an organization
2. Modify organization details
3. Save changes
4. Verify updates are reflected

**Expected Results**:
- ✅ Edit form pre-populated with current values
- ✅ All editable fields work correctly
- ✅ Changes save successfully with confirmation
- ✅ Updated information displays correctly

**Pass/Fail**:
- [ ] Pass: Editing works without issues
- [ ] Fail: Edit functionality broken or data loss

### Scenario 5: Organization Context Switching
**Steps**:
1. Test switching between different organizations
2. Check data filtering per organization
3. Verify context persistence
4. Test access to organization-specific features

**Expected Results**:
- ✅ Context switcher allows organization selection
- ✅ Data correctly filtered per selected organization
- ✅ Current organization context clearly indicated
- ✅ Organization-specific features work correctly

**Pass/Fail**:
- [ ] Pass: Context switching works seamlessly
- [ ] Fail: Context issues or data leakage between orgs

### Scenario 6: Delete Organization
**Steps**:
1. Attempt to delete an organization
2. Handle deletion confirmation/warnings
3. Verify deletion completes
4. Check data cleanup

**Expected Results**:
- ✅ Clear warning about deletion consequences
- ✅ Confirmation dialog with safety measures
- ✅ Organization removed from system
- ✅ Related data handled appropriately (cascade/preserve)

**Pass/Fail**:
- [ ] Pass: Safe deletion with proper warnings
- [ ] Fail: Unsafe deletion or data corruption

## 🐛 Troubleshooting

### Organization Not Appearing
- **Check**: User has permission to view organizations
- **Check**: Organization context/filtering is correct
- **Check**: Database has organization records
- **Check**: API endpoints return correct data

### Member Management Issues
- **Check**: User has admin permissions for organization
- **Check**: Member invitation system is working
- **Check**: Role/permission system is configured
- **Check**: Email notifications are working (if used)

### Context Switching Problems
- **Check**: Multi-tenancy middleware is configured
- **Check**: Organization context is stored in session/state
- **Check**: Data filtering queries include organization filter
- **Check**: Frontend state management handles organization changes

## ✅ Success Criteria

Organizations test succesvol als:
- Organizations can be created, viewed, and managed effectively
- Member management provides full control over organization access
- Data is properly isolated between organizations
- Context switching works without data leakage
- Deletion safeguards prevent accidental data loss
- UI provides clear feedback for all operations

**Status**: 🟡 TODO - Ready to Test
