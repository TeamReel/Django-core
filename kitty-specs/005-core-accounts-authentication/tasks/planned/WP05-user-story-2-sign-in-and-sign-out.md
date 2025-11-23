---
work_package_id: "WP05"
subtasks: ["T031", "T032", "T033", "T034", "T035", "T036", "T037", "T038", "T039", "T040", "T041", "T042"]
title: "User Story 2 – Sign In/Sign Out"
phase: "Phase 1 - Core Auth Flows"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-23T22:25:59Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – User Story 2: Sign In/Sign Out

## Objectives

**Goal**: Implement secure login/logout with session management, email verification check, and inactive session timeout.

**Success Criteria**:
- [ ] Verified users can login with email/password
- [ ] Unverified users blocked from login
- [ ] Session created on successful login
- [ ] Logout destroys session
- [ ] Inactive timeout (24h) enforced via middleware
- [ ] Absolute timeout (7d) via SESSION_COOKIE_AGE

## Key Implementation Points

### T031-T034 – Login/Logout Forms & Views

`src/accounts/forms.py` - Add LoginForm:
```python
class LoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)
```

`src/accounts/views.py` - Add login view:
```python
from django.contrib.auth import login as auth_login, logout as auth_logout, authenticate

def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            user = authenticate(request, email=email, password=password)
            if user:
                if not user.email_verified:
                    messages.error(request, 'Please verify your email address before signing in.')
                    return redirect('register')
                if not user.is_active:
                    messages.error(request, 'Your account has been deactivated.')
                    return redirect('login')
                auth_login(request, user)
                request.session['last_activity'] = timezone.now().timestamp()
                return redirect('home')
            else:
                messages.error(request, 'Invalid email or password.')
    else:
        form = LoginForm()
    return render(request, 'accounts/registration/login.html', {'form': form})

def logout_view(request):
    auth_logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('login')
```

---

### T035-T037 – DRF Login/Logout API

`src/accounts/serializers.py` - Add:
```python
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
```

`src/accounts/api/views.py` - Add:
```python
from django.contrib.auth import login, logout, authenticate

@api_view(['POST'])
@permission_classes([AllowAny])
def login_api(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(email=serializer.validated_data['email'],
                          password=serializer.validated_data['password'])
        if user:
            if not user.email_verified:
                return Response({'error': 'email_not_verified',
                               'message': 'Please verify your email address before signing in.'},
                              status=400)
            if not user.is_active:
                return Response({'error': 'account_inactive',
                               'message': 'Your account has been deactivated.'},
                              status=400)
            login(request, user)
            request.session['last_activity'] = timezone.now().timestamp()
            return Response({
                'id': user.id, 'email': user.email, 'first_name': user.first_name,
                'last_name': user.last_name,
                'role': 'superadmin' if user.is_superuser else ('admin' if user.is_admin else 'user'),
                'message': 'Login successful.'
            })
        return Response({'error': 'invalid_credentials', 'message': 'Invalid email or password.'},
                       status=400)
    return Response(serializer.errors, status=400)

@api_view(['POST'])
def logout_api(request):
    logout(request)
    return Response(status=204)
```

---

### T040-T041 – Inactive Session Timeout Middleware

Create `src/accounts/middleware.py`:
```python
from django.utils import timezone
from django.contrib.auth import logout
from django.http import JsonResponse

class SessionInactivityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            last_activity = request.session.get('last_activity')
            if last_activity:
                inactive_seconds = timezone.now().timestamp() - last_activity
                if inactive_seconds > 86400:  # 24 hours
                    logout(request)
                    if request.path.startswith('/api/'):
                        return JsonResponse({'error': 'session_expired',
                                           'message': 'Your session has expired.'}, status=401)
            request.session['last_activity'] = timezone.now().timestamp()
        return self.get_response(request)
```

Add to `src/config/settings/base.py` MIDDLEWARE:
```python
MIDDLEWARE = [
    ...
    'django.contrib.sessions.middleware.SessionMiddleware',
    'accounts.middleware.SessionInactivityMiddleware',  # Add after SessionMiddleware
    ...
]
```

---

### T038 – Integrate brute-force protection

If Feature 003 has rate limiting decorator:
```python
from security_baseline.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', method='POST')
def login_view(request):
    # existing logic
```

Or apply via middleware/settings configuration per Feature 003 implementation.

---

### T042 – Update URLs

Add to `src/accounts/urls.py`:
```python
path('login/', views.login_view, name='login'),
path('logout/', views.logout_view, name='logout'),
```

Add to `src/accounts/api/urls.py`:
```python
path('auth/login', views.login_api, name='api_login'),
path('auth/logout', views.logout_api, name='api_logout'),
```

---

## Definition of Done

- [ ] Login checks email_verified and is_active
- [ ] Session created on successful login
- [ ] Logout clears session
- [ ] Middleware enforces 24h inactive timeout
- [ ] 7d absolute timeout via SESSION_COOKIE_AGE
- [ ] Brute-force protection integrated
- [ ] API and form-based views functional

**Dependencies**: WP01, WP04 (registration/verification)
**Estimated Effort**: 5-7 hours
