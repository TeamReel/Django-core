# Permissions & Access Control - Visual Test Guide

## 🎯 Test Overview
- **Feature**: Role-based permissions and access control
- **Time**: 12-15 minuten
- **Prerequisites**: Multiple user accounts with different roles
- **Test Data**: Admin user, regular user, different permission sets

## � Test Accounts
| Role | Email | Password | Context |
|------|-------|----------|---------|
| **Super Admin** | `admin@example.com` | `Basis123.` | Full System Access |
| **Org Admin (Bondscoach)** | `ronald.koeman@nederland.nl` | `Basis123.` | Admin of Eredivisie |
| **Org Member (Coach)** | `tuchel@bayern.de` | `Basis123.` | Coach of Bayern München (Bundesliga) |
| **Org Member (Player)** | `kimmich@bayern.de` | `Basis123.` | Player of Bayern München (Bundesliga) |
| **Org Viewer (Legend)** | `beckenbauer@bayern.de` | `Basis123.` | Legend of Bayern München (Bundesliga) |
| **No Org** | `alice@example.com` | `Basis123.` | No organization membership |

## 🚀 Quick Access
- **Admin Panel**: http://localhost:8000/admin
- **Demo Shell**: http://localhost:3000
- **Permissions API**: http://localhost:8000/api/permissions/

## 📋 Visual Test Scenarios

### Scenario 1: Admin Access
**Steps**:
1. Login as **Super Admin** (`admin@example.com`)
2. Navigate to admin-only sections (http://localhost:8000/admin)
3. Check access to user management
4. Test organization management permissions

**Expected Results**:
- ✅ Admin panel access granted
- ✅ User management interface available
- ✅ Organization CRUD operations allowed
- ✅ System configuration access

**Pass/Fail**:
- [x] Pass: Full admin access works
- [ ] Fail: Missing admin permissions or access denied

### Scenario 2: Regular User Limitations
**Steps**:
1. Login as **Org Member (Coach)** (`tuchel@bayern.de`)
2. Try accessing admin-only features (http://localhost:8000/admin)
3. Check limited permission feedback
4. Test allowed vs denied operations

**Expected Results**:
- ✅ Admin sections are hidden or access denied (403)
- ✅ Clear "Permission denied" messages
- ✅ User can access their own data
- ✅ Appropriate feature limitations

**Pass/Fail**:
- [x] Pass: Permissions properly restrict access
- [ ] Fail: Unauthorized access or unclear restrictions

### Scenario 3: Organization-Level Permissions
**Steps**:
1. Login as **Org Admin** (`ronald.koeman@nederland.nl`)
2. Verify access to **Eredivisie**
3. Try accessing **Bundesliga** data (should be denied/invisible)
4. Check organization switching permissions (if multiple orgs exist)

**Expected Results**:
- ✅ Access granted to assigned organizations only
- ✅ Organization data properly filtered
- ✅ Context switching respects permissions
- ✅ Project access follows organization membership

**Pass/Fail**:
- [x] Pass: Organization permissions work correctly (Returns 404 for non-member orgs, which is secure)
- [ ] Fail: Cross-organization access or data leaks

### Scenario 4: Feature-Level Permissions
**Steps**:
1. Login as **Org Viewer** (`beckenbauer@bayern.de`)
2. Check file management permissions (Try to upload/delete)
3. Test API endpoint access (POST/DELETE requests)
4. Verify UI elements show/hide based on permissions (Edit buttons hidden)

**Expected Results**:
- ✅ Restricted features are hidden from UI
- ✅ API endpoints return 403 for denied access
- ✅ Upload/download permissions work correctly
- ✅ Menu items adapt to user permissions

**Pass/Fail**:
- [x] Pass: Feature permissions consistently enforced
- [ ] Fail: Feature access bypasses permissions

### Scenario 5: Permission Changes
**Steps**:
1. Login as **Super Admin** (`admin@example.com`)
2. Change permissions for `alice@example.com` (e.g., make Staff)
3. Login as `alice@example.com`
4. Verify new permissions work correctly

**Expected Results**:
- ✅ Permission changes take effect appropriately
- ✅ Clear feedback about permission updates
- ✅ UI updates to reflect new permissions
- ✅ No unauthorized access during transition

**Pass/Fail**:
- [x] Pass: Permission changes work smoothly
- [ ] Fail: Permission changes don't take effect or cause issues

### Scenario 6: Organization Member Management
**Steps**:
1. Login as **Org Admin** (`ronald.koeman@nederland.nl`)
2. Access organization member management
3. Add `alice@example.com` to **Eredivisie** as 'Member'
4. Verify Alice can now access Eredivisie
5. Remove Alice from organization

**Expected Results**:
- ✅ Member list shows current members with roles
- ✅ Add member functionality works
- ✅ Role assignment is persisted
- ✅ Member removal works with confirmation

**Pass/Fail**:
- [x] Pass: Member management works correctly
- [ ] Fail: Cannot add/remove members or assign roles

### Scenario 7: Error Handling
**Steps**:
1. Login as **Org Member** (`tuchel@bayern.de`)
2. Try accessing forbidden resources directly via URL (e.g., `/admin/auth/user/`)
3. Test API calls without proper permissions
4. Check error page quality

**Expected Results**:
- ✅ Clean 403/Access Denied pages
- ✅ User-friendly error messages
- ✅ No technical details exposed to users
- ✅ Option to return to allowed areas

**Pass/Fail**:
- [x] Pass: Graceful permission error handling
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

**Status**: 🟢 PASSED
