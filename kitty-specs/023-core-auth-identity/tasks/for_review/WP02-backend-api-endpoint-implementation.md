---
work_package_id: "WP02"
subtasks:
  - "T012"
  - "T013"
  - "T014"
  - "T015"
  - "T016"
  - "T017"
  - "T018"
title: "Backend API Endpoint Implementation"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "Claude"
agent: "claude"
shell_pid: "35160"
review_status: "ready"
reviewed_by: ""
history:
  - timestamp: "2025-12-07T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-08T19:35:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "35160"
    action: "Started WP02: Backend API Endpoint Implementation"
  - timestamp: "2025-12-08T20:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "35160"
    action: "Completed T012-T017: Implemented /auth/me and /auth/profile endpoints with tests and URL routing. T018 (documentation) pending."
  - timestamp: "2025-12-08T20:15:00Z"
    lane: "planned"
    agent: "claude-reviewer"
    shell_pid: "35160"
    action: "Code review complete: NEEDS CHANGES - Critical contract violations: wrong error format (must use B13 envelope), success response format mismatch, missing password requirement in contract."
  - timestamp: "2025-12-08T20:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "35160"
    action: "Acknowledged review feedback - addressing all critical action items: B13 envelope format, contract update for password requirement, success response consistency"
  - timestamp: "2025-12-08T20:45:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "35160"
    action: "Completed all feedback fixes - B13 envelope format implemented across all error responses, contract updated, success response consistency achieved, empty request validation added, all tests updated"
---

# Work Package Prompt: WP02 – Backend API Endpoint Implementation

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

**Status**: ❌ **NEEDS CHANGES**

**Reviewed by**: Claude Code Review Agent
**Review date**: 2025-12-08T20:15:00Z
**Commit reviewed**: ded3b6f5

### Summary
WP02 implements the core backend API endpoints for `/auth/me` and `/auth/profile`, but there are **critical contract violations** that must be fixed before approval. The implementation has the right structure but deviates from the B13 API specification in error response format and required functionality.

### ❌ Critical Issues (Must Fix)

**Issue 1: Contract Violation - Wrong Error Response Format**
- **Problem**: Implementation uses custom error format instead of B13 baseline envelope
- **Current**: `{"error": "not_authenticated", "message": "..."}`
- **Required (per contract)**:
  ```json
  {
    "status": "error",
    "error": {
      "code": "not_authenticated",
      "message": "Authentication credentials were not provided.",
      "details": {}
    },
    "meta": {
      "timestamp": "2025-12-07T10:30:00Z"
    }
  }
  ```
- **Files affected**: `src/accounts/api/views.py` (both `auth_me` and `update_profile`)
- **Why critical**: F02 frontend expects B13 envelope format. Wrong format breaks error handling.

**Issue 2: Missing Password Verification Requirement**
- **Problem**: Contract `b13-profile-update.md` does **not** mention `current_password` requirement, but implementation enforces it
- **Contract says**: Only `first_name` and `last_name` are accepted fields
- **Implementation has**: Mandatory `current_password` validation
- **Why this matters**:
  - If password verification is needed, contract must be updated first
  - If not needed, remove password check from implementation
  - **Recommendation**: Keep password verification (good security practice) but **update contract** to document it

**Issue 3: Success Response Format Mismatch**
- **Problem**: `/auth/profile` success response uses B13 envelope but `/auth/me` does not
- **Current `/auth/me`**: Returns data directly `{id, email, ...}`
- **Current `/auth/profile`**: Returns `{success: true, data: {id, email, ...}}`
- **Contract expects**: Both should return data directly (no envelope for 200 OK)
- **Fix**: Remove `{success: true, data: {...}}` wrapper from `/auth/profile`, return data directly

### ⚠️ Medium Issues (Should Fix)

**Issue 4: Missing CSRF Protection Decorator**
- **Problem**: `/auth/profile` PATCH endpoint doesn't have `@ensure_csrf_cookie` or DRF CSRF enforcement
- **Risk**: CSRF attacks possible
- **Fix**: Ensure Django's CSRF middleware is enabled (check settings) OR add explicit decorator
- **Note**: DRF SessionAuthentication includes CSRF by default, but explicit declaration is clearer

**Issue 5: Test Scenarios Missing**
- **Problem**: Tests don't cover all contract scenarios
- **Missing tests**:
  - Empty request body (no fields provided) - should return 400
  - Update with whitespace-only names - covered ✓
  - Role verification after superuser login - covered ✓
- **Minor gap**: Consider adding test for "no changes made" scenario (same values)

### ✅ What Was Done Well

1. **Comprehensive test coverage**: 15 test scenarios across both endpoints
2. **Security-first**: Generic error messages prevent password enumeration
3. **Field validation**: Proper empty string and max length checks
4. **Code quality**: Clean, readable implementation with good documentation
5. **Ruff compliance**: Proper noqa comments for test files
6. **URL routing**: Correctly registered both endpoints

### 📋 Action Items (must complete before re-review)

- [ ] **CRITICAL**: Fix error response format in `auth_me` to match B13 envelope (lines 182-185)
- [ ] **CRITICAL**: Fix error response format in `update_profile` to match B13 envelope (lines 230-233)
- [ ] **CRITICAL**: Update contract `b13-profile-update.md` to document `current_password` requirement OR remove password check from implementation
- [ ] **CRITICAL**: Remove `{success: true, data: {...}}` wrapper from `/auth/profile` success response - return data directly like `/auth/me`
- [ ] Update B13 error responses for validation errors (lines 242-250, 262-269, 283-285) to use envelope format
- [ ] Verify CSRF protection is active (check `REST_FRAMEWORK` settings for SessionAuthentication)
- [ ] Add test case for empty request body to `/auth/profile`
- [ ] Update tests to assert B13 envelope format in error responses

### 🔄 Implementation Pattern (B13 Envelope)

**For all error responses**, use this structure:

```python
from django.utils import timezone

return Response(
    {
        "status": "error",
        "error": {
            "code": "validation_error",  # or "not_authenticated", etc.
            "message": "Human-readable message",
            "details": {"field": ["error message"]}  # or {} for no details
        },
        "meta": {
            "timestamp": timezone.now().isoformat()
        }
    },
    status=status.HTTP_400_BAD_REQUEST
)
```

**For success responses (200 OK)**, return data directly:
```python
return Response({
    "id": user.id,
    "email": user.email,
    # ... other fields
}, status=status.HTTP_200_OK)
```

---

## Objectives & Success Criteria

**Goal**: Implement missing B05 backend endpoints (`/auth/me`, `/auth/profile`) required by F02, ensuring F02 has complete API surface.

**Success Criteria**:
- [ ] GET /auth/me endpoint returns 200 OK with user profile for authenticated session
- [ ] GET /auth/me endpoint returns 401 for expired/missing session
- [ ] PATCH /auth/profile endpoint accepts first_name, last_name, requires current_password
- [ ] PATCH /auth/profile endpoint returns 200 OK with updated profile on success
- [ ] PATCH /auth/profile endpoint returns 400 with B13 error envelope for validation errors
- [ ] Both endpoints tested with pytest (authenticated, unauthenticated, validation scenarios)
- [ ] B13 error envelope format enforced: `{ "success": false, "errors": {...}, "message": "..." }`
- [ ] URL patterns updated in src/accounts/urls.py
- [ ] API documentation updated (OpenAPI/Swagger if exists, or README)

**Independent Test**:
```bash
# From repo root
cd src
pytest accounts/tests/test_me_endpoint.py -v
pytest accounts/tests/test_profile_endpoint.py -v
# All tests pass
```

---

## Context & Constraints

**Prerequisites**: B05 Core Accounts infrastructure exists (models, authentication, session management)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/contracts/b13-auth-me.md` - GET /auth/me contract specification
- `kitty-specs/023-core-auth-identity/contracts/b13-profile-update.md` - PATCH /auth/profile contract
- `kitty-specs/023-core-auth-identity/research.md` - Section 1 shows 6/7 endpoints implemented, /auth/me missing
- `kitty-specs/023-core-auth-identity/data-model.md` - User profile structure
- `.kittify/memory/constitution.md` - Principles IV (Testing), V (Security), VII (API Design)

**Architectural Context**:
- B05 uses Django REST Framework (DRF) for all APIs
- B13 API baseline enforces consistent error response format
- Session authentication via HTTP-only cookies (django.contrib.sessions)
- CSRF protection required for state-changing operations (PATCH, POST, DELETE)

**Constraints**:
- Endpoints must use SessionAuthentication (no token auth yet)
- Error responses must follow B13 envelope: `{ success, errors, message }`
- PATCH /auth/profile requires current_password verification for security
- Generic error messages prevent information disclosure (Constitution Principle V)

---

## Subtasks & Detailed Guidance

### Subtask T012 – Create GET /auth/me Endpoint in B05

**Purpose**: Implement session verification endpoint that returns current user profile or 401 if expired.

**Steps**:
1. Create `src/accounts/views/me.py`:
```python
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

User = get_user_model()

@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def auth_me(request):
    """
    Get current authenticated user profile.

    Returns:
        200 OK: User profile (id, email, first_name, last_name, role, email_verified, is_active)
        401 Unauthorized: Session expired or not authenticated
    """
    user = request.user

    # Determine role based on user attributes
    if user.is_superuser:
        role = 'superadmin'
    elif user.is_staff:
        role = 'admin'
    else:
        role = 'user'

    data = {
        'id': user.id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': role,
        'email_verified': getattr(user, 'email_verified', True),  # Assume verified if field missing
        'is_active': user.is_active,
    }

    return Response(data, status=status.HTTP_200_OK)
```

2. Import and register in `src/accounts/views/__init__.py`:
```python
from .me import auth_me
```

**Files**:
- `src/accounts/views/me.py` (new)
- `src/accounts/views/__init__.py` (update)

**Parallel?**: [P] Can develop in parallel with T014-T015 (profile endpoint)

**Implementation Details**:
- **SessionAuthentication**: Validates session cookie, sets request.user
- **IsAuthenticated**: Returns 401 if user not authenticated
- **Role mapping**: is_superuser → 'superadmin', is_staff → 'admin', else 'user'
- **email_verified**: Use getattr with default True (field may not exist in all deployments)

**Notes**:
- DRF's @api_view automatically handles 401 response for unauthenticated requests
- No CSRF token required for GET requests
- Response format matches data-model.md User interface

---

### Subtask T013 – Write pytest Tests for /auth/me

**Purpose**: Comprehensive test coverage for session verification endpoint.

**Steps**:
1. Create `src/accounts/tests/test_me_endpoint.py`:
```python
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework import status

User = get_user_model()

@pytest.fixture
def authenticated_user(db):
    """Create and return authenticated user."""
    user = User.objects.create_user(
        email='test@example.com',
        password='TestPass123!',
        first_name='Test',
        last_name='User',
        is_active=True,
    )
    return user

@pytest.fixture
def authenticated_client(authenticated_user):
    """Return Django test client with authenticated session."""
    client = Client()
    client.force_login(authenticated_user)
    return client, authenticated_user

@pytest.mark.django_db
class TestAuthMeEndpoint:
    """Test suite for GET /auth/me endpoint."""

    def test_authenticated_user_returns_profile(self, authenticated_client):
        """Test: Authenticated user receives profile data."""
        client, user = authenticated_client
        response = client.get('/api/v1/auth/me')

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data['id'] == user.id
        assert data['email'] == user.email
        assert data['first_name'] == user.first_name
        assert data['last_name'] == user.last_name
        assert data['role'] == 'user'
        assert data['is_active'] is True
        assert 'email_verified' in data

    def test_unauthenticated_user_returns_401(self, db):
        """Test: Unauthenticated request returns 401."""
        client = Client()
        response = client.get('/api/v1/auth/me')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_superuser_role_mapping(self, db):
        """Test: Superuser mapped to 'superadmin' role."""
        user = User.objects.create_superuser(
            email='admin@example.com',
            password='AdminPass123!',
            first_name='Admin',
            last_name='User',
        )
        client = Client()
        client.force_login(user)

        response = client.get('/api/v1/auth/me')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['role'] == 'superadmin'

    def test_staff_role_mapping(self, db):
        """Test: Staff user mapped to 'admin' role."""
        user = User.objects.create_user(
            email='staff@example.com',
            password='StaffPass123!',
            first_name='Staff',
            last_name='User',
            is_staff=True,
        )
        client = Client()
        client.force_login(user)

        response = client.get('/api/v1/auth/me')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['role'] == 'admin'

    def test_inactive_user_returns_profile(self, db):
        """Test: Inactive user still authenticated but profile shows is_active=False."""
        user = User.objects.create_user(
            email='inactive@example.com',
            password='InactivePass123!',
            first_name='Inactive',
            last_name='User',
            is_active=False,
        )
        client = Client()
        client.force_login(user)

        response = client.get('/api/v1/auth/me')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['is_active'] is False
```

2. Run tests:
```bash
cd src
pytest accounts/tests/test_me_endpoint.py -v
```

**Files**:
- `src/accounts/tests/test_me_endpoint.py` (new)

**Parallel?**: [P] Can write in parallel with T012 implementation

**Implementation Details**:
- Use pytest fixtures for test data (authenticated_user, authenticated_client)
- Test all scenarios: authenticated, unauthenticated, superuser, staff, inactive
- Use `client.force_login()` for authentication (bypasses password check)
- Assert response structure matches data-model.md User type

**Notes**:
- Tests should be deterministic (no network calls, mock if needed)
- Coverage target: 100% of /auth/me endpoint code
- Run with `--cov=accounts.views.me` to verify coverage

---

### Subtask T014 – Create PATCH /auth/profile Endpoint in B05

**Purpose**: Implement profile update endpoint allowing users to change first_name, last_name with password verification.

**Steps**:
1. Create `src/accounts/views/profile.py`:
```python
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import ensure_csrf_cookie

User = get_user_model()

@api_view(['PATCH'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
@ensure_csrf_cookie
def update_profile(request):
    """
    Update authenticated user's profile (first_name, last_name).

    Request Body:
        {
            "first_name": str (optional),
            "last_name": str (optional),
            "current_password": str (required for verification)
        }

    Returns:
        200 OK: Updated user profile
        400 Bad Request: Validation errors (B13 envelope)
        401 Unauthorized: Session expired
    """
    user = request.user
    data = request.data

    # Validate current_password (required for security)
    current_password = data.get('current_password')
    if not current_password:
        return Response({
            'success': False,
            'message': 'Current password is required',
            'errors': {
                'current_password': ['This field is required']
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        # Generic error to prevent password guessing
        return Response({
            'success': False,
            'message': 'Unable to update profile',
            'errors': {
                'non_field_errors': ['Unable to verify credentials']
            }
        }, status=status.HTTP_400_BAD_REQUEST)

    # Update fields if provided
    errors = {}

    first_name = data.get('first_name')
    if first_name is not None:
        if not first_name.strip():
            errors['first_name'] = ['First name cannot be empty']
        elif len(first_name) > 150:
            errors['first_name'] = ['First name must be 150 characters or fewer']
        else:
            user.first_name = first_name.strip()

    last_name = data.get('last_name')
    if last_name is not None:
        if not last_name.strip():
            errors['last_name'] = ['Last name cannot be empty']
        elif len(last_name) > 150:
            errors['last_name'] = ['Last name must be 150 characters or fewer']
        else:
            user.last_name = last_name.strip()

    if errors:
        return Response({
            'success': False,
            'message': 'Validation failed',
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # Save updates
    user.save()

    # Return updated profile (same format as /auth/me)
    role = 'superadmin' if user.is_superuser else 'admin' if user.is_staff else 'user'

    return Response({
        'success': True,
        'data': {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': role,
            'email_verified': getattr(user, 'email_verified', True),
            'is_active': user.is_active,
        }
    }, status=status.HTTP_200_OK)
```

2. Import and register in `src/accounts/views/__init__.py`:
```python
from .profile import update_profile
```

**Files**:
- `src/accounts/views/profile.py` (new)
- `src/accounts/views/__init__.py` (update)

**Parallel?**: [P] Can develop in parallel with T012-T013 (/auth/me endpoint)

**Implementation Details**:
- **CSRF protection**: @ensure_csrf_cookie decorator ensures CSRF token sent
- **Password verification**: Required for all profile updates (Constitution Principle V)
- **Generic errors**: "Unable to verify credentials" doesn't reveal if password wrong (security)
- **B13 envelope**: All errors follow `{ success, errors, message }` format
- **Partial updates**: Only update fields present in request body
- **Validation**: Check empty strings, max length (150 chars for Django User model)

**Notes**:
- CSRF token must be sent in X-CSRFToken header (frontend responsibility)
- Response format matches /auth/me for consistency
- Email changes deferred to future (requires verification flow)

---

### Subtask T015 – Write pytest Tests for /auth/profile

**Purpose**: Comprehensive test coverage for profile update endpoint.

**Steps**:
1. Create `src/accounts/tests/test_profile_endpoint.py`:
```python
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework import status

User = get_user_model()

@pytest.fixture
def authenticated_user(db):
    """Create and return authenticated user."""
    user = User.objects.create_user(
        email='test@example.com',
        password='TestPass123!',
        first_name='Original',
        last_name='Name',
        is_active=True,
    )
    return user

@pytest.fixture
def authenticated_client(authenticated_user):
    """Return Django test client with authenticated session."""
    client = Client()
    client.force_login(authenticated_user)
    return client, authenticated_user

@pytest.mark.django_db
class TestProfileUpdateEndpoint:
    """Test suite for PATCH /auth/profile endpoint."""

    def test_update_first_name_with_valid_password(self, authenticated_client):
        """Test: Update first_name with correct current_password."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'first_name': 'Updated',
                'current_password': 'TestPass123!',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['success'] is True
        assert data['data']['first_name'] == 'Updated'
        assert data['data']['last_name'] == 'Name'  # Unchanged

        # Verify database updated
        user.refresh_from_db()
        assert user.first_name == 'Updated'

    def test_update_both_names(self, authenticated_client):
        """Test: Update both first_name and last_name."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'first_name': 'New First',
                'last_name': 'New Last',
                'current_password': 'TestPass123!',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == 'New First'
        assert user.last_name == 'New Last'

    def test_missing_current_password_returns_400(self, authenticated_client):
        """Test: Request without current_password fails."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={'first_name': 'Updated'},
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data['success'] is False
        assert 'current_password' in data['errors']

    def test_incorrect_current_password_returns_400(self, authenticated_client):
        """Test: Wrong current_password fails with generic error."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'first_name': 'Updated',
                'current_password': 'WrongPassword',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert data['success'] is False
        assert 'Unable to verify credentials' in str(data['errors'])

        # Verify no changes persisted
        user.refresh_from_db()
        assert user.first_name == 'Original'

    def test_empty_first_name_returns_400(self, authenticated_client):
        """Test: Empty first_name fails validation."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'first_name': '   ',  # Whitespace only
                'current_password': 'TestPass123!',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'first_name' in data['errors']

    def test_too_long_name_returns_400(self, authenticated_client):
        """Test: Name exceeding 150 chars fails validation."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'first_name': 'A' * 151,
                'current_password': 'TestPass123!',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert 'first_name' in data['errors']

    def test_unauthenticated_request_returns_401(self, db):
        """Test: Unauthenticated request returns 401."""
        client = Client()
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'first_name': 'Updated',
                'current_password': 'TestPass123!',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_partial_update_only_last_name(self, authenticated_client):
        """Test: Update only last_name, first_name unchanged."""
        client, user = authenticated_client
        response = client.patch(
            '/api/v1/auth/profile',
            data={
                'last_name': 'NewLastName',
                'current_password': 'TestPass123!',
            },
            content_type='application/json',
        )

        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == 'Original'  # Unchanged
        assert user.last_name == 'NewLastName'
```

2. Run tests:
```bash
cd src
pytest accounts/tests/test_profile_endpoint.py -v
```

**Files**:
- `src/accounts/tests/test_profile_endpoint.py` (new)

**Parallel?**: [P] Can write in parallel with T014 implementation

**Implementation Details**:
- Test all scenarios: valid update, missing password, wrong password, validation errors, partial updates
- Use `content_type='application/json'` for PATCH requests
- Verify database changes with `user.refresh_from_db()`
- Assert B13 error envelope format in all error responses

**Notes**:
- CSRF token not needed in tests (Django test client bypasses CSRF for authenticated requests)
- Coverage target: 100% of /auth/profile endpoint code
- Test both success and error paths

---

### Subtask T016 – Add B13 Error Envelope Handling for Both Endpoints

**Purpose**: Ensure consistent error response format across /auth/me and /auth/profile.

**Steps**:
1. Verify /auth/me returns B13 format for 401 errors (DRF handles automatically)
2. Verify /auth/profile returns B13 format for all errors (implemented in T014)
3. Create shared error formatter utility if needed:

Create `src/accounts/utils/error_formatter.py`:
```python
from rest_framework.response import Response

def format_b13_error(message: str, errors: dict, status_code: int) -> Response:
    """
    Format error response following B13 API baseline standard.

    Args:
        message: Human-readable error message
        errors: Dictionary of field-level errors {field: [error_messages]}
        status_code: HTTP status code

    Returns:
        Response object with B13 error envelope
    """
    return Response({
        'success': False,
        'message': message,
        'errors': errors,
    }, status=status_code)

def format_b13_success(data: dict, status_code: int = 200) -> Response:
    """
    Format success response following B13 API baseline standard.

    Args:
        data: Response data dictionary
        status_code: HTTP status code (default 200)

    Returns:
        Response object with B13 success envelope
    """
    return Response({
        'success': True,
        'data': data,
    }, status=status_code)
```

4. Refactor /auth/profile to use utility (optional optimization):
```python
from accounts.utils.error_formatter import format_b13_error, format_b13_success

# Replace manual Response() calls with:
return format_b13_error('Validation failed', errors, status.HTTP_400_BAD_REQUEST)
return format_b13_success(profile_data, status.HTTP_200_OK)
```

**Files**:
- `src/accounts/utils/error_formatter.py` (new, optional)
- `src/accounts/views/profile.py` (update if using utility)

**Parallel?**: No (depends on T012, T014)

**Implementation Details**:
- B13 envelope: `{ success: bool, message: str, errors: dict, data: dict }`
- Errors should be field-specific where possible: `{ 'field_name': ['error message'] }`
- Non-field errors use key 'non_field_errors'
- Success responses include `success: true` and `data` key

**Notes**:
- Error formatter utility is optional but improves consistency
- All B05 endpoints should eventually use this format
- Document error format in API reference

---

### Subtask T017 – Update B05 URL Patterns to Include New Endpoints

**Purpose**: Register /auth/me and /auth/profile in Django URL configuration.

**Steps**:
1. Open `src/accounts/urls.py` (or create if doesn't exist)
2. Add URL patterns:
```python
from django.urls import path
from accounts.views import auth_me, update_profile

app_name = 'accounts'

urlpatterns = [
    # ... existing patterns ...

    # Session verification
    path('auth/me', auth_me, name='auth-me'),

    # Profile management
    path('auth/profile', update_profile, name='profile-update'),
]
```

3. Verify main `src/urls.py` includes accounts URLs:
```python
from django.urls import path, include

urlpatterns = [
    # ... other patterns ...
    path('api/v1/', include('accounts.urls')),
]
```

4. Test URL resolution:
```bash
cd src
python manage.py show_urls | grep auth/me
python manage.py show_urls | grep auth/profile
```

**Files**:
- `src/accounts/urls.py` (update or create)
- `src/urls.py` (verify includes accounts.urls)

**Parallel?**: No (depends on T012, T014)

**Implementation Details**:
- URL paths match contracts: `/api/v1/auth/me`, `/api/v1/auth/profile`
- Use `app_name` for URL namespacing (accounts:auth-me, accounts:profile-update)
- No trailing slash (REST API convention)

**Notes**:
- If show_urls management command doesn't exist, use `python manage.py check` to validate
- URL patterns should match exactly what F02 will call (check contracts/)

---

### Subtask T018 – Document Endpoints in B05 API Reference

**Purpose**: Update API documentation so frontend developers can integrate /auth/me and /auth/profile.

**Steps**:
1. If OpenAPI/Swagger exists, add endpoint schemas:
   - Open `src/openapi.yaml` or equivalent
   - Add /auth/me GET endpoint with 200/401 responses
   - Add /auth/profile PATCH endpoint with 200/400/401 responses

2. If using drf-spectacular or similar:
   - Add docstrings to views (already done in T012, T014)
   - Run `python manage.py spectacular --file schema.yml` to regenerate

3. Update `src/accounts/README.md` or `docs/api/accounts.md`:
```markdown
## GET /api/v1/auth/me

**Description**: Get current authenticated user profile.

**Authentication**: Session (HTTP-only cookie)

**Response 200 OK**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "email_verified": true,
  "is_active": true
}
```

**Response 401 Unauthorized**: Session expired or not authenticated.

---

## PATCH /api/v1/auth/profile

**Description**: Update authenticated user's profile.

**Authentication**: Session (HTTP-only cookie) + CSRF token

**Request Body**:
```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "current_password": "CurrentPassword123!"
}
```

**Response 200 OK**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "Updated",
    "last_name": "Name",
    "role": "user",
    "email_verified": true,
    "is_active": true
  }
}
```

**Response 400 Bad Request** (B13 error envelope):
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "first_name": ["First name cannot be empty"],
    "current_password": ["This field is required"]
  }
}
```
```

4. Commit documentation updates with code changes

**Files**:
- `src/accounts/README.md` or `docs/api/accounts.md` (update)
- `src/openapi.yaml` (update if exists)

**Parallel?**: No (depends on T012, T014, T017)

**Implementation Details**:
- Document request/response formats exactly as implemented
- Include authentication requirements (session + CSRF for PATCH)
- Show B13 error envelope examples
- Link to contracts/ directory for full specification

**Notes**:
- Documentation should be developer-friendly with copy-paste examples
- Include curl commands for manual testing if helpful
- Cross-reference F02 contracts/ directory

---

## Risks & Mitigations

**Risk**: Session cookie handling in tests
**Mitigation**: Use Django test client with `force_login()`, test with real auth in integration tests

**Risk**: CSRF token validation
**Mitigation**: Use `@ensure_csrf_cookie` decorator, test with `@csrf_exempt` in tests, document frontend integration

**Risk**: Password verification for profile updates
**Mitigation**: Use Django's `check_password()`, generic error on failure prevents password guessing

**Risk**: Information disclosure via error messages
**Mitigation**: Use generic messages ("Unable to verify credentials" instead of "Wrong password")

**Risk**: B13 envelope format inconsistency
**Mitigation**: Create shared error formatter utility, use in all endpoints

---

## Definition of Done Checklist

- [ ] All subtasks T012-T018 completed
- [ ] GET /auth/me returns 200 OK with user profile for authenticated requests
- [ ] GET /auth/me returns 401 for unauthenticated requests
- [ ] PATCH /auth/profile accepts first_name, last_name, current_password
- [ ] PATCH /auth/profile validates password and returns 400 if incorrect (generic error)
- [ ] PATCH /auth/profile validates name fields (not empty, max 150 chars)
- [ ] Both endpoints follow B13 error envelope format
- [ ] pytest tests pass with 100% coverage of new code:
  ```bash
  cd src
  pytest accounts/tests/test_me_endpoint.py -v --cov=accounts.views.me
  pytest accounts/tests/test_profile_endpoint.py -v --cov=accounts.views.profile
  ```
- [ ] URL patterns registered and accessible at `/api/v1/auth/me`, `/api/v1/auth/profile`
- [ ] API documentation updated (README or OpenAPI schema)
- [ ] Constitutional compliance verified:
  - [ ] Principle IV: Comprehensive pytest tests for both endpoints
  - [ ] Principle V: Password verification required, generic errors, no sensitive data logged
  - [ ] Principle VII: B13 error envelope, safe error messages, boundary validation
- [ ] `tasks.md` updated with WP02 status change

---

## Review Guidance

**Acceptance Checkpoints**:
1. **Endpoint Functionality**: Test with curl or Postman:
   ```bash
   # Test /auth/me (authenticated)
   curl -X GET http://localhost:8000/api/v1/auth/me -b cookies.txt

   # Test /auth/profile (update name)
   curl -X PATCH http://localhost:8000/api/v1/auth/profile \
     -H "Content-Type: application/json" \
     -H "X-CSRFToken: <token>" \
     -b cookies.txt \
     -d '{"first_name":"Updated","current_password":"TestPass123!"}'
   ```

2. **Test Coverage**: Verify 100% coverage:
   ```bash
   pytest accounts/tests/ -v --cov=accounts.views.me --cov=accounts.views.profile --cov-report=html
   # Open htmlcov/index.html, verify green
   ```

3. **B13 Envelope**: Verify all error responses follow format:
   - Check 400 responses have `{ success: false, errors: {...}, message: "..." }`
   - Check 200 success has `{ success: true, data: {...} }` (profile endpoint)

4. **Security**: Verify password verification:
   - Wrong password returns generic "Unable to verify credentials"
   - Empty password returns field error
   - No password enumeration possible

5. **Documentation**: Check API docs include both endpoints with examples

**Constitutional Compliance**:
- Principle IV (Testing): All tests pass, 100% coverage, deterministic
- Principle V (Security): Password verification, generic errors, CSRF protection
- Principle VII (API Design): B13 envelope, boundary validation, safe errors

**Context to Revisit**:
- Compare error format with existing B05 endpoints (consistency check)
- Verify session authentication matches B05 patterns
- Check Django User model has expected fields (first_name, last_name, email)

---

## Activity Log

- 2025-12-07T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
