---
work_package_id: WP02
title: JWT Authentication Implementation
lane: "for_review"
subtasks: [T010, T011, T012, T013, T014, T015, T016, T017]
agent: "copilot"
shell_pid: "11588"
history:
  - date: 2025-11-29
    action: created
    author: spec-kitty
---

# WP02: JWT Authentication Implementation

## Objective
Implement JWT token obtain/refresh/verify/logout endpoints with dual authentication support (JWT + Session) and inactive user handling.

## Context
**Priority**: P1 (User Story 1)
**Dependencies**: WP01 (simplejwt installed, migrations applied)

## Subtasks

### T010: Configure REST_FRAMEWORK Authentication Classes
Add to `settings/base.py`:
```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # First = precedence
        "rest_framework.authentication.SessionAuthentication",  # Fallback
    ],
    # ... other settings ...
}
```

### T011-T014: Create Auth Endpoints
Use simplejwt's built-in views in `api/v1/urls.py`:
```python
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # T014: Custom logout view below
]
```

### T014: Create Logout Endpoint
Create `api/views.py`:
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

class LogoutView(APIView):
    def post(self, request):
        try:
            refresh = request.data.get("refresh")
            token = RefreshToken(refresh)
            token.blacklist()  # Adds to blacklist table
            return Response({"status": "success", "data": null})
        except Exception:
            return Response({"status": "error", "error": {"code": "invalid_token"}}, status=400)
```

### T016: Inactive User Check
Override JWTAuthentication in `api/authentication.py`:
```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied

class CustomJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not user.is_active:
            raise PermissionDenied({"code": "user_inactive", "message": "Account is inactive"})
        return user
```

Update settings to use CustomJWTAuthentication instead.

## Definition of Done
- [ ] POST /api/v1/auth/token/ returns {access, refresh} tokens
- [ ] POST /api/v1/auth/token/refresh/ generates new tokens
- [ ] POST /api/v1/auth/logout/ blacklists refresh token
- [ ] Valid token + inactive user returns 403
- [ ] JWT takes precedence over session when both present

**Estimated Effort**: 6-8 hours

## Activity Log

- 2025-11-29T18:01:28Z – copilot – shell_pid=11588 – lane=doing – Started WP02: JWT Authentication implementation
- 2025-11-29T19:15:00Z – copilot – shell_pid=11588 – lane=doing – Completed all 8 subtasks: CustomJWTAuthentication with is_active check, LogoutView with token blacklisting, token obtain/refresh/verify endpoints, URL routing at /api/v1/auth/*, authentication precedence configured. Django check passes with 0 issues. Commit 73595cb.
- 2025-11-29T18:09:41Z – copilot – shell_pid=11588 – lane=for_review – Ready for review: JWT authentication with CustomJWTAuthentication, token blacklisting, 4 endpoints operational
