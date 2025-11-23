---
work_package_id: "WP04"
subtasks:
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
  - "T029"
  - "T030"
title: "User Story 1 – Registration & Email Verification"
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

# Work Package Prompt: WP04 – User Story 1: Registration & Email Verification

## Objectives & Success Criteria

**Goal**: Implement complete user registration with email verification flow per User Story 1.

**Acceptance Scenarios** (from `spec.md`):
- [ ] User submits valid email/password → inactive account created, verification email sent
- [ ] User clicks verification link → account activated (email_verified=True, is_active=True)
- [ ] Unverified user tries to login → blocked with "verify your email" message
- [ ] Expired verification link → clear error message

## Context & Constraints

**Prerequisites**: WP01-WP03 (User model, tokens, validators)

**API Endpoints** (from `contracts/auth.yaml`):
- POST /api/v1/auth/register (201 Created)
- POST /api/v1/auth/verify-email/{user_id}/{token} (200 OK)

**Email Templates**: Multipart HTML+text (FR-004a)

## Subtasks & Detailed Guidance

### T021-T022 – Registration form and view

Create `src/accounts/forms.py`:
```python
from django import forms
from django.contrib.auth.password_validation import validate_password
from .models import User

class RegistrationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, validators=[validate_password])
    password_confirm = forms.CharField(widget=forms.PasswordInput, label='Confirm Password')

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password']

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        password_confirm = cleaned_data.get('password_confirm')
        if password and password_confirm and password != password_confirm:
            raise forms.ValidationError('Passwords do not match.')
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user
```

Create `src/accounts/views.py`:
```python
from django.shortcuts import render, redirect
from django.contrib import messages
from .forms import RegistrationForm
from .tokens import email_verification_token
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def register(request):
    if request.method == 'POST':
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Send verification email
            token = email_verification_token.make_token(user)
            verification_url = request.build_absolute_uri(f'/accounts/verify-email/{user.id}/{token}/')
            context = {'user': user, 'verification_url': verification_url}
            html_message = render_to_string('accounts/email/verification.html', context)
            plain_message = strip_tags(html_message)
            send_mail(
                subject='Verify your email address',
                message=plain_message,
                from_email=settings.EMAIL_FROM,
                recipient_list=[user.email],
                html_message=html_message,
            )
            user.email_verification_sent_at = timezone.now()
            user.save()
            messages.success(request, 'Registration successful. Please check your email to verify your account.')
            return redirect('login')
    else:
        form = RegistrationForm()
    return render(request, 'accounts/registration/register.html', {'form': form})
```

**Files**: `src/accounts/forms.py`, `src/accounts/views.py`

---

### T024 – Email templates

Create `src/accounts/templates/accounts/email/verification.html`:
```html
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Verify your email address</h2>
<p>Hi {{ user.get_short_name }},</p>
<p>Thank you for registering. Please click the link below to verify your email address:</p>
<p><a href="{{ verification_url }}">{{ verification_url }}</a></p>
<p>This link expires in 24 hours.</p>
<p>If you did not create this account, please ignore this email.</p>
</body>
</html>
```

Create `src/accounts/templates/accounts/email/verification.txt`:
```
Verify your email address

Hi {{ user.get_short_name }},

Thank you for registering. Please click the link below to verify your email address:
{{ verification_url }}

This link expires in 24 hours.
If you did not create this account, please ignore this email.
```

**Files**: Create template files

---

### T025 – Email verification view

Add to `src/accounts/views.py`:
```python
def verify_email(request, user_id, token):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        messages.error(request, 'Invalid verification link.')
        return redirect('login')

    if user.email_verified:
        messages.info(request, 'Email already verified. You can sign in.')
        return redirect('login')

    if email_verification_token.check_token(user, token):
        user.email_verified = True
        user.is_active = True
        user.save()
        messages.success(request, 'Email verified successfully. You can now sign in.')
        return redirect('login')
    else:
        messages.error(request, 'The verification link is invalid or has expired.')
        return redirect('register')
```

**Files**: `src/accounts/views.py` (UPDATE)

---

### T026-T028 – DRF API endpoints

Create `src/accounts/serializers.py`:
```python
from rest_framework import serializers
from .models import User
from django.contrib.auth.password_validation import validate_password

class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['email', 'password', 'first_name', 'last_name']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user
```

Create `src/accounts/api/views.py`:
```python
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from ..serializers import RegistrationSerializer
from ..models import User
from ..tokens import email_verification_token
from django.core.mail import send_mail

@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):
    serializer = RegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Send verification email (same logic as views.register)
        return Response({
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email_verified': user.email_verified,
            'is_active': user.is_active,
            'message': 'Registration successful. Please check your email to verify your account.'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_api(request, user_id, token):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'not_found', 'message': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if user.email_verified:
        return Response({'error': 'already_verified', 'message': 'This email address has already been verified.'}, status=status.HTTP_400_BAD_REQUEST)

    if email_verification_token.check_token(user, token):
        user.email_verified = True
        user.is_active = True
        user.save()
        return Response({'message': 'Email verified successfully. You can now sign in.'})

    return Response({'error': 'invalid_token', 'message': 'The verification link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)
```

**Files**: `src/accounts/serializers.py`, `src/accounts/api/views.py`

---

### T029-T030 – URL routing

Create `src/accounts/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('verify-email/<int:user_id>/<str:token>/', views.verify_email, name='verify_email'),
]
```

Create `src/accounts/api/urls.py`:
```python
from django.urls import path
from . import views

urlpatterns = [
    path('auth/register', views.register_api, name='api_register'),
    path('auth/verify-email/<int:user_id>/<str:token>', views.verify_email_api, name='api_verify_email'),
]
```

Update `src/config/urls.py`:
```python
urlpatterns = [
    path('accounts/', include('accounts.urls')),
    path('api/v1/', include('accounts.api.urls')),
    ...
]
```

**Files**: Create/update URL configurations

---

## Definition of Done

- [ ] Registration form validates email/password
- [ ] Inactive user created on registration
- [ ] Verification email sent (multipart HTML+text)
- [ ] Verification link activates account
- [ ] DRF API endpoints functional
- [ ] Email templates render correctly
- [ ] URL routing configured

**Dependencies**: WP01, WP02, WP03
**Estimated Effort**: 6-8 hours
