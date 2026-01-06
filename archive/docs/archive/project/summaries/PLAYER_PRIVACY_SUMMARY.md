# Player Role Privacy Implementation Summary

## Overview
Implemented strict privacy enforcement for the Player role (kimmich@bayern.de) to ensure Players can ONLY view their own user record and cannot access other users' data.

## Changes Made

### 1. Frontend Permission Helper Updates
**File**: `examples/demo-shell/src/utils/permissions.ts`

**Added**:
- `currentUserId` to `PermissionContext` interface
- `canViewUser(targetUserId, context)` - Checks if user can view a specific user
  - Super admins: Can view all users
  - Org admins: Can view all users in their org
  - Players/members: Can ONLY view themselves
- `canAccessUsersPage()` - All authenticated users can access, filtering happens server-side

### 2. Backend User List Endpoint
**File**: `src/accounts/api/views.py` - `admin_user_list` function

**Added Player Privacy Logic**:
```python
# After org access check, before queryset filtering:
# Check if user is a non-admin member (Player/Coach/Viewer)
user_membership = Membership.objects.filter(
    user=request.user,
    organisation=org,
    is_active=True
).first()

is_org_admin = user_membership and user_membership.role == 'admin'

if not is_org_admin:
    # Non-admin members (player/coach/member) can only see themselves
    queryset = User.objects.filter(id=request.user.id)
    # Return paginated response with only self
```

**Behavior**:
- Super admin: See all users
- Org admin: See all users in their org
- Player/member: See ONLY themselves in the list

### 3. Backend User Detail Endpoint
**File**: `src/accounts/api/views.py` - `admin_user_detail` function

**Added Player Privacy Check**:
```python
# After global admin check:
# Check if requesting user is a non-admin member
requestor_memberships = Membership.objects.filter(
    user=request.user,
    is_active=True
)

is_admin_anywhere = requestor_memberships.filter(role='admin').exists()

if not is_admin_anywhere:
    if user_id != request.user.id:
        # Return 404 to prevent information leakage
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
```

**Behavior**:
- Super admin: Can view any user detail
- Org admin: Can view users in their org
- Player/member: Can ONLY view their own detail, get 404 for others

### 4. Backend Tests
**File**: `tests/accounts/test_player_privacy.py`

**Test Coverage**:
- ✅ `test_player_can_view_self_in_list` - Player sees only themselves in users list
- ✅ `test_player_can_view_self_detail` - Player can view their own detail
- ✅ `test_player_cannot_view_other_user_detail` - Player gets 404 for other users
- ✅ `test_player_cannot_edit_other_user` - Player cannot edit other users
- ✅ `test_player_cannot_delete_other_user` - Player cannot delete other users
- ✅ `test_admin_can_view_all_users` - Admins see all users
- ✅ `test_admin_can_view_player_detail` - Admins can view player details
- ✅ `test_player_cannot_create_user` - Players cannot create users

## Testing Instructions

### Automated Testing
```bash
cd C:\Users\brian\Documents\django-core
$env:PYTHONPATH="src"
python -m pytest tests/accounts/test_player_privacy.py -v
```

### Manual Verification Steps

1. **Login as Player (kimmich@bayern.de)**
   ```
   Email: kimmich@bayern.de
   Password: testpass123
   ```

2. **Navigate to /users page**
   - Should see ONLY Kimmich's own user record
   - No edit/delete buttons visible (already gated by canManageUsers)

3. **Try to access another user's detail**
   - Method 1: Direct URL `http://localhost:3000/users/[other_user_id]`
   - Method 2: API call `GET /api/v1/admin/users/[other_user_id]/`
   - Expected: 404 error "User not found"

4. **View Organisations page**
   - Should see Bundesliga organisation (read-only)
   - No Create/Edit/Delete buttons (already implemented)

5. **View Projects page**
   - Should see projects in Bundesliga (read-only)
   - No New Project/Edit/Delete buttons (already implemented)

6. **Login as Admin (lionel@email.com)**
   ```
   Email: lionel@email.com
   Password: testpass123
   ```

7. **Navigate to /users page**
   - Should see ALL users in Bundesliga
   - Edit/Delete buttons visible for admin users

## Role Mapping Summary

| Role       | Users List | User Detail | Create | Edit | Delete |
|------------|-----------|-------------|--------|------|--------|
| Super Admin | All users | Any user | ✅ | ✅ | ✅ |
| Org Admin | Org users | Org users | ✅ | ✅ | ✅ |
| Player/Member | Self only | Self only | ❌ | ❌ | ❌ |
| Coach | Self only | Self only | ❌ | ❌ | ❌ |

## Security Principles Applied

1. **Privacy by Default**: Non-admin members cannot see other users' data
2. **404 vs 403**: Returns 404 (not 403) to prevent information leakage
3. **Centralized Logic**: Single permission helper on frontend, single enforcement point on backend
4. **Defense in Depth**: Both frontend UI gating AND backend API enforcement
5. **Fail-Safe**: Default deny - if not admin, restrict to self

## Files Modified

### Frontend
- `examples/demo-shell/src/utils/permissions.ts`

### Backend
- `src/accounts/api/views.py`
- `tests/accounts/test_player_privacy.py` (new)

### Documentation
- `check_kimmich.py` (new utility script)
- `PLAYER_PRIVACY_SUMMARY.md` (this file)

## API Behavior Examples

### Player - List Users
```bash
# Request (as kimmich@bayern.de)
GET /api/v1/admin/users/?organisation_id=bundesliga

# Response
{
  "count": 1,
  "results": [
    {
      "id": 47,
      "email": "kimmich@bayern.de",
      "first_name": "Joshua",
      "last_name": "Kimmich",
      "role": "member"
    }
  ]
}
```

### Player - View Other User Detail
```bash
# Request (as kimmich@bayern.de, trying to view Tuchel)
GET /api/v1/admin/users/43/

# Response
{
  "error": "not_found",
  "message": "User not found."
}
```

### Admin - List Users
```bash
# Request (as lionel@email.com)
GET /api/v1/admin/users/?organisation_id=bundesliga

# Response
{
  "count": 7,
  "results": [
    { "id": 47, "email": "kimmich@bayern.de", ... },
    { "id": 43, "email": "tuchel@bayern.de", ... },
    { "id": 42, "email": "lionel@email.com", ... },
    ...
  ]
}
```

## Next Steps

1. ✅ Backend enforcement implemented
2. ✅ Frontend permission helper updated
3. ✅ Backend tests created
4. ⏳ Manual verification in running UI
5. ⏳ Frontend tests (deferred - can be added later if needed)

## Verification Checklist

- [ ] Login as kimmich@bayern.de
- [ ] /users shows only Kimmich (1 row)
- [ ] Cannot navigate to other user detail (404)
- [ ] Cannot edit/delete from UI (no buttons)
- [ ] Cannot mutate via API (403/404)
- [ ] Organisations page is read-only
- [ ] Projects page is read-only
- [ ] Login as admin shows all users
- [ ] Admin can view/edit other users
