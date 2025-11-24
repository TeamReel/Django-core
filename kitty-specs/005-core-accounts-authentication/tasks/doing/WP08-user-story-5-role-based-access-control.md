---
work_package_id: "WP08"
subtasks: ["T065", "T066", "T067", "T068", "T069", "T070", "T071", "T072"]
title: "User Story 5 – Role-Based Access Control"
phase: "Phase 2 - Admin & Roles"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "11524"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-23T22:25:59Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-11-24T20:13:53+01:00"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started implementation of User Story 5: Role-Based Access Control"
---

# Work Package Prompt: WP08 – User Story 5: Role-Based Access Control

## Objectives

**Goal**: Implement role change functionality with privilege escalation prevention and enforce permissions across all endpoints.

**Success Criteria**:
- [ ] Superadmin can assign any role (superadmin/admin/user)
- [ ] Admin can assign 'user' role only
- [ ] Users cannot change their own role
- [ ] Permission checks applied to all existing endpoints
- [ ] Role hierarchy enforced (superadmin > admin > user)

## Key Implementation Points

### T065-T068 – Role Change Endpoint

`src/accounts/serializers.py`:
```python
class ChangeRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['superadmin', 'admin', 'user'])
```

`src/accounts/api/views.py`:
```python
@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_change_role(request, id):
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return Response({'error': 'not_found', 'message': 'User not found.'}, status=404)

    # Prevent self-role-change
    if user.id == request.user.id:
        return Response({'error': 'bad_request', 'message': 'You cannot change your own role.'}, status=400)

    serializer = ChangeRoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    new_role = serializer.validated_data['role']

    # Permission check: admins can only assign 'user' role
    if not request.user.is_superuser and new_role in ['superadmin', 'admin']:
        return Response({'error': 'permission_denied',
                       'message': 'You do not have permission to assign this role.'}, status=403)

    # Remove from all groups
    user.groups.clear()

    # Assign new role
    if new_role == 'superadmin':
        user.is_superuser = True
        user.is_staff = True
    elif new_role == 'admin':
        user.is_superuser = False
        admin_group = Group.objects.get(name='admin')
        user.groups.add(admin_group)
        user.is_staff = True
    else:  # user
        user.is_superuser = False
        user.is_staff = False
        user_group = Group.objects.get(name='user')
        user.groups.add(user_group)

    user.save()
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)
```

Add route:
```python
path('admin/users/<int:id>/role', views.admin_change_role, name='admin_change_role'),
```

---

### T069-T070 – Apply Permission Checks

Review all existing endpoints and add appropriate permission classes:

**Public endpoints** (AllowAny):
- Registration
- Email verification
- Login
- Password reset request/confirm

**Authenticated endpoints** (IsAuthenticated):
- Logout

**Admin endpoints** (IsAdmin):
- User list
- User detail
- Activate/deactivate
- Password reset (admin-triggered)
- Role change

Ensure permission classes are applied:
```python
@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_user_list(request):
    # ...
```

Create decorator for view-based permissions:
```python
# src/accounts/decorators.py
from django.http import HttpResponseForbidden
from functools import wraps

def admin_required(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not (request.user.is_superuser or request.user.is_admin):
            return HttpResponseForbidden('Permission denied.')
        return view_func(request, *args, **kwargs)
    return wrapper
```

---

### T071 – Documentation

Update `src/accounts/README.md` with Role-Based Access Control section:
```markdown
## Role-Based Access Control

### Role Hierarchy
1. **Superadmin** (is_superuser=True): Platform administrators, full access
2. **Admin** (member of 'admin' group): Tenant administrators, can manage regular users
3. **User** (member of 'user' group): Regular users, basic access

### Permission Matrix
| Action | Superadmin | Admin | User |
|--------|------------|-------|------|
| View all users | ✓ | ✓ | ✗ |
| Activate/deactivate users | ✓ | ✓ (users only) | ✗ |
| Assign any role | ✓ | ✗ | ✗ |
| Assign 'user' role | ✓ | ✓ | ✗ |
| Change own role | ✗ | ✗ | ✗ |
| Deactivate own account | ✗ | ✗ | ✗ |

### API Endpoints
- PATCH /api/v1/admin/users/{id}/role - Change user role (superadmin: all roles, admin: user role only)
```

---

## Definition of Done

- [ ] Role change endpoint functional
- [ ] Privilege escalation prevented
- [ ] Self-modification blocked
- [ ] Permission checks on all endpoints
- [ ] Documentation updated
- [ ] Role hierarchy enforced

**Dependencies**: WP02, WP07 (Groups, admin endpoints)
**Estimated Effort**: 4-5 hours
