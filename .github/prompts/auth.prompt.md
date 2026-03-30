---
mode: agent
description: "Debug and implement JWT authentication flows, permission classes, token refresh, 401/403 errors"
tools:
  - semantic_search
  - grep_search
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
  - manage_todo_list
---

# Auth / JWT — TeamReel

Debug and implement authentication and authorization flows.

## Auth Architecture

TeamReel uses **JWT (JSON Web Tokens)** via `djangorestframework-simplejwt`:

```
Login (POST /api/v1/auth/login/)
  → Returns: { access: <token>, refresh: <token> }
  → Access token: short-lived (5 min default)
  → Refresh token: long-lived (24h default)

Frontend stores tokens in memory (not localStorage for security)
  → Access token in Authorization header: `Bearer <access_token>`
  → Refresh token used to get new access tokens via POST /api/v1/auth/token/refresh/
```

## Common Auth Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/login/` | POST | Login, get tokens |
| `/api/v1/auth/token/refresh/` | POST | Refresh access token |
| `/api/v1/auth/me/` | GET | Current user profile |
| `/api/v1/auth/active-context/` | GET | Current org/project context |
| `/api/v1/auth/register/` | POST | Create account |
| `/api/v1/auth/password/reset/` | POST | Password reset |

## Debugging Auth Issues

### 401 Unauthorized

| Cause | Check | Fix |
|-------|-------|-----|
| Token expired | Decode JWT, check `exp` claim | Frontend should auto-refresh |
| Token missing | Check `Authorization` header | Ensure adapter includes `Bearer <token>` |
| Token malformed | Check token format | Must be `Bearer <token>` (with space) |
| User inactive | Check `user.is_active` | Reactivate in admin |
| Wrong secret | Token signed with different key | Check `SIGNING_KEY` in settings |

### 403 Forbidden

| Cause | Check | Fix |
|-------|-------|-----|
| Missing permission class | ViewSet `permission_classes` | Add appropriate permission |
| Wrong org scope | User not in this org | Check `Membership.objects.filter(user=user, organisation=org)` |
| Role insufficient | User role lacks permission | Check `RoleAssignment` for user |
| Object-level denied | `has_object_permission()` fails | Check the specific permission class |

### Debugging Steps

```powershell
# 1. Check the user exists and is active
python manage.py shell -c "
from accounts.models import User
u = User.objects.get(email='user@example.com')
print(f'Active: {u.is_active}, Staff: {u.is_staff}')
"

# 2. Check user's org memberships
python manage.py shell -c "
from organisations.models import Membership
from accounts.models import User
u = User.objects.get(email='user@example.com')
for m in Membership.objects.filter(user=u):
    print(f'  Org: {m.organisation.name}, Role: {m.role}')
"

# 3. Decode a JWT token (without verification)
python manage.py shell -c "
import jwt
token = '<paste-token-here>'
print(jwt.decode(token, options={'verify_signature': False}))
"

# 4. Check permission classes on a ViewSet
Select-String -Path "src/**/*.py" -Pattern "permission_classes" -Recurse | Select-Object -First 20
```

## Frontend Auth Flow

```typescript
// Adapter pattern — all API calls go through the adapter
// The adapter handles token injection and refresh automatically

// In demo/src/adapters/api.ts:
const api = createApiClient({
  baseURL: import.meta.env.VITE_API_URL,
  // Interceptor adds Authorization header
  // Interceptor catches 401 → tries refresh → retries original request
});
```

### Frontend Auth Checklist
- [ ] Token stored in memory (not localStorage)
- [ ] `Authorization: Bearer <token>` header on all API calls
- [ ] 401 interceptor triggers token refresh
- [ ] After refresh failure → redirect to `/login`
- [ ] `active-context` endpoint called on app init to set org/project
- [ ] Protected routes check auth state before rendering

## Permission Classes

### Pattern
```python
from rest_framework import permissions

class IsOrganisationMember(permissions.BasePermission):
    """User must be a member of the organisation."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        org = get_current_organisation(request)
        return Membership.objects.filter(
            user=request.user,
            organisation=org,
            is_active=True,
        ).exists()

    def has_object_permission(self, request, view, obj):
        return obj.organisation_id == get_current_organisation(request).id
```

### Common Permission Stack
```python
# Read-only for members, write for editors+
permission_classes = [IsAuthenticated, IsOrganisationMember]

# Admin-only actions
permission_classes = [IsAuthenticated, IsOrganisationAdmin]

# Object-level (e.g. own content only)
permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
```

## Reference
- User model: `src/accounts/models.py`
- Auth views: `src/accounts/api/views.py`
- Permission classes: `src/permissions/`
- JWT settings: `config/settings/base.py` → `SIMPLE_JWT`
- Frontend adapter: `demo/src/adapters/api.ts`
- RBAC docs: `docs/features/rbac-permissions.md`
