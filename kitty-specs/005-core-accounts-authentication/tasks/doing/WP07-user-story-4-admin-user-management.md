---
work_package_id: "WP07"
subtasks: ["T053", "T054", "T055", "T056", "T057", "T058", "T059", "T060", "T061", "T062", "T063", "T064"]
title: "User Story 4 – Admin User Management"
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
  - timestamp: "2025-11-24T19:25:19+01:00"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started implementation of User Story 4: Admin User Management"
---

# Work Package Prompt: WP07 – User Story 4: Admin User Management

## Objectives

**Goal**: Implement admin interfaces (Django Admin + REST API) for user management with pagination, permission checks, self-modification protection.

**Success Criteria**:
- [ ] Django Admin shows user list with filters
- [ ] Admin actions: activate, deactivate, send password reset
- [ ] REST API: list users (paginated), activate, deactivate, reset password
- [ ] Permission checks: superadmin can manage all, admin can manage 'user' role only
- [ ] Self-modification prevented
- [ ] Query optimization (select_related) for performance

## Key Implementation Points

### T053-T055 – Django Admin Configuration

`src/accounts/admin.py`:
```python
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'is_active', 'email_verified', 'get_role', 'date_joined']
    list_filter = ['is_active', 'email_verified', 'is_staff', 'is_superuser', 'groups']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined', 'email_verification_sent_at')}),
        ('Email Verification', {'fields': ('email_verified',)}),
    )

    def get_role(self, obj):
        if obj.is_superuser:
            return 'Superadmin'
        elif obj.is_admin:
            return 'Admin'
        return 'User'
    get_role.short_description = 'Role'

    actions = ['activate_users', 'deactivate_users', 'send_password_reset']

    def activate_users(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f'{count} users activated.')
    activate_users.short_description = 'Activate selected users'

    def deactivate_users(self, request, queryset):
        # Prevent self-deactivation
        if request.user in queryset:
            self.message_user(request, 'Cannot deactivate your own account.', level='ERROR')
            return
        count = queryset.update(is_active=False)
        self.message_user(request, f'{count} users deactivated.')
    deactivate_users.short_description = 'Deactivate selected users'

    def send_password_reset(self, request, queryset):
        for user in queryset:
            # Send password reset email logic
            pass
        self.message_user(request, f'Password reset emails sent to {queryset.count()} users.')
    send_password_reset.short_description = 'Send password reset email'
```

---

### T056-T064 – REST API Endpoints

`src/accounts/serializers.py`:
```python
class UserListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_active',
                 'email_verified', 'date_joined', 'last_login']

    def get_role(self, obj):
        return 'superadmin' if obj.is_superuser else ('admin' if obj.is_admin else 'user')

class UserDetailSerializer(UserListSerializer):
    groups = serializers.StringRelatedField(many=True)
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + ['is_staff', 'is_superuser', 'groups']
```

`src/accounts/api/views.py`:
```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from ..permissions import IsAdmin

class UserPagination(PageNumberPagination):
    page_size = 50

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_user_list(request):
    queryset = User.objects.select_related().prefetch_related('groups')
    # Apply filters
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active.lower() == 'true')

    paginator = UserPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = UserListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_user_detail(request, id):
    try:
        user = User.objects.prefetch_related('groups').get(id=id)
    except User.DoesNotExist:
        return Response({'error': 'not_found', 'message': 'User not found.'}, status=404)
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_user_activate(request, id):
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return Response({'error': 'not_found', 'message': 'User not found.'}, status=404)

    if user.is_active:
        return Response({'error': 'bad_request', 'message': 'User is already active.'}, status=400)

    user.is_active = True
    user.save()
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAdmin])
def admin_user_deactivate(request, id):
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return Response({'error': 'not_found', 'message': 'User not found.'}, status=404)

    # Prevent self-deactivation
    if user.id == request.user.id:
        return Response({'error': 'bad_request', 'message': 'You cannot deactivate your own account.'}, status=400)

    # Admins can't deactivate superadmins or other admins
    if not request.user.is_superuser:
        if user.is_superuser or user.is_admin:
            return Response({'error': 'permission_denied',
                           'message': 'You do not have permission to deactivate this user.'}, status=403)

    user.is_active = False
    user.save()
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdmin])
def admin_user_reset_password(request, id):
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return Response({'error': 'not_found', 'message': 'User not found.'}, status=404)

    if not user.is_active:
        return Response({'error': 'bad_request', 'message': 'Cannot send password reset to inactive account.'}, status=400)

    # Send password reset email (same logic as user-initiated reset)
    # ...

    return Response({'message': f'Password reset email sent to {user.email}.'})
```

Add URL routes to `accounts/api/urls.py`:
```python
path('admin/users', views.admin_user_list, name='admin_user_list'),
path('admin/users/<int:id>', views.admin_user_detail, name='admin_user_detail'),
path('admin/users/<int:id>/activate', views.admin_user_activate, name='admin_user_activate'),
path('admin/users/<int:id>/deactivate', views.admin_user_deactivate, name='admin_user_deactivate'),
path('admin/users/<int:id>/reset-password', views.admin_user_reset_password, name='admin_user_reset_password'),
```

---

## Definition of Done

- [ ] Django Admin configured with filters/actions
- [ ] Self-modification prevented
- [ ] API pagination (50 per page)
- [ ] Query optimization (select_related, prefetch_related)
- [ ] Permission checks enforce role hierarchy
- [ ] All endpoints tested manually

**Dependencies**: WP01, WP02 (User model, groups/permissions)
**Estimated Effort**: 6-8 hours
