# Permissions & Access Control - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Role-based permissions and access control
- **Time**: 12-15 minuten
- **Prerequisites**: Multiple user accounts with different roles
- **Test Data**: Admin user, regular user, different permission sets

## 🚀 Quick Access
- **Admin Panel**: http://localhost:8000/admin
- **Demo Shell**: Test different user accounts
- **Permissions API**: http://localhost:8000/api/permissions/

## 📋 Visual Test Scenarios

### Scenario 1: Admin Access
**Steps**:
1. Login as admin user
2. Navigate to admin-only sections
3. Check access to user management
4. Test organization management permissions

**Expected Results**:
- ✅ Admin panel access granted
- ✅ User management interface available
- ✅ Organization CRUD operations allowed
- ✅ System configuration access

**Pass/Fail**:
- [ ] Pass: Full admin access works
- [ ] Fail: Missing admin permissions or access denied

### Scenario 2: Regular User Limitations
**Steps**:
1. Login as regular (non-admin) user
2. Try accessing admin-only features
3. Check limited permission feedback
4. Test allowed vs denied operations

**Expected Results**:
- ✅ Admin sections are hidden or access denied
- ✅ Clear "Permission denied" messages
- ✅ User can access their own data
- ✅ Appropriate feature limitations

**Pass/Fail**:
- [ ] Pass: Permissions properly restrict access
- [ ] Fail: Unauthorized access or unclear restrictions

### Scenario 3: Organization-Level Permissions
**Steps**:
1. Test user with access to specific organization
2. Try accessing different organization data
3. Check organization switching permissions
4. Test project-level access within org

**Expected Results**:
- ✅ Access granted to assigned organizations only
- ✅ Organization data properly filtered
- ✅ Context switching respects permissions
- ✅ Project access follows organization membership

**Pass/Fail**:
- [ ] Pass: Organization permissions work correctly
- [ ] Fail: Cross-organization access or data leaks

### Scenario 4: Feature-Level Permissions
**Steps**:
1. Test user with limited feature access
2. Check file management permissions
3. Test API endpoint access
4. Verify UI elements show/hide based on permissions

**Expected Results**:
- ✅ Restricted features are hidden from UI
- ✅ API endpoints return 403 for denied access
- ✅ Upload/download permissions work correctly
- ✅ Menu items adapt to user permissions

**Pass/Fail**:
- [ ] Pass: Feature permissions consistently enforced
- [ ] Fail: Feature access bypasses permissions

### Scenario 5: Permission Changes
**Steps**:
1. Admin changes user permissions
2. Test immediate effect of changes
3. Check if user needs to re-login
4. Verify new permissions work correctly

**Expected Results**:
- ✅ Permission changes take effect appropriately
- ✅ Clear feedback about permission updates
- ✅ UI updates to reflect new permissions
- ✅ No unauthorized access during transition

**Pass/Fail**:
- [ ] Pass: Permission changes work smoothly
- [ ] Fail: Permission changes don't take effect or cause issues

### Scenario 6: Error Handling
**Steps**:
1. Try accessing forbidden resources directly via URL
2. Test API calls without proper permissions
3. Check error page quality
4. Verify no sensitive info leaks in error messages

**Expected Results**:
- ✅ Clean 403/Access Denied pages
- ✅ User-friendly error messages
- ✅ No technical details exposed to users
- ✅ Option to return to allowed areas

**Pass/Fail**:
- [ ] Pass: Graceful permission error handling
- [ ] Fail: Poor error pages or information leakage

## 🐛 Troubleshooting

### Permission Denied Issues
- **Check**: User has correct role assignments
- **Check**: Group permissions are configured
- **Check**: Django permission system is working
- **Check**: Custom permission decorators are applied

### Organization Access Issues
- **Check**: User is member of organization
- **Check**: Organization context is set correctly
- **Check**: Multi-tenancy filtering is working
- **Check**: Foreign key relationships are correct

### API Permission Issues
- **Check**: DRF permission classes are configured
- **Check**: Authentication is working
- **Check**: Permission decorators on viewsets
- **Check**: Object-level permissions (if used)

## ✅ Success Criteria

Permissions test succesvol als:
- Admin users have appropriate elevated access
- Regular users cannot access restricted features
- Organization-level isolation works correctly
- Feature permissions consistently enforced in UI and API
- Permission changes take effect properly
- Error handling is user-friendly and secure

**Status**: 🟡 TODO - Ready to Test
