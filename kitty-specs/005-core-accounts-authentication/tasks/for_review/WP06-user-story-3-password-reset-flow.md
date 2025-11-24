---
work_package_id: "WP06"
subtasks: ["T043", "T044", "T045", "T046", "T047", "T048", "T049", "T050", "T051", "T052"]
title: "User Story 3 – Password Reset Flow"
phase: "Phase 1 - Core Auth Flows"
lane: "for_review"
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
  - timestamp: "2025-11-24T19:12:00+01:00"
    lane: "doing"
    agent: "claude"
    shell_pid: "11524"
    action: "Started implementation of User Story 3: Password Reset Flow"
  - timestamp: "2025-11-24T19:20:10+01:00"
    lane: "for_review"
    agent: "claude"
    shell_pid: "11524"
    action: "Completed implementation - all 12 verification tests passed"
---

# Work Package Prompt: WP06 – User Story 3: Password Reset Flow

## Objectives

**Goal**: Implement password reset via email with 1-hour token expiry, no email enumeration, session invalidation.

**Success Criteria**:
- [ ] Request reset sends email (no enumeration - always "check inbox" message)
- [ ] Reset email sent only to verified accounts
- [ ] Token valid for 1 hour
- [ ] Password update invalidates all sessions
- [ ] Token single-use (auto-invalidated after password change)

## Key Implementation Points

### T043-T045 – Reset Request Form/View/Email

`src/accounts/forms.py`:
```python
class PasswordResetRequestForm(forms.Form):
    email = forms.EmailField()

class PasswordResetConfirmForm(forms.Form):
    new_password = forms.CharField(widget=forms.PasswordInput, validators=[validate_password])
    new_password_confirm = forms.CharField(widget=forms.PasswordInput)
```

`src/accounts/views.py`:
```python
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

def password_reset_request(request):
    if request.method == 'POST':
        form = PasswordResetRequestForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            try:
                user = User.objects.get(email=email, email_verified=True)
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                reset_url = request.build_absolute_uri(f'/accounts/reset-password/{uidb64}/{token}/')
                # Send email (similar to verification email)
                context = {'user': user, 'reset_url': reset_url}
                html_message = render_to_string('accounts/email/password_reset.html', context)
                plain_message = strip_tags(html_message)
                send_mail('Reset your password', plain_message, settings.EMAIL_FROM,
                         [user.email], html_message=html_message)
            except User.DoesNotExist:
                pass  # No enumeration - don't reveal email existence
            messages.success(request, 'If an account with that email exists, a password reset link has been sent.')
            return redirect('login')
    else:
        form = PasswordResetRequestForm()
    return render(request, 'accounts/registration/password_reset_request.html', {'form': form})
```

Email templates (`password_reset.html` and `.txt`):
```html
<p>Click to reset your password: <a href="{{ reset_url }}">{{ reset_url }}</a></p>
<p>This link expires in 1 hour.</p>
```

---

### T046-T048 – Reset Confirm View

```python
def password_reset_confirm(request, uidb64, token):
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user and default_token_generator.check_token(user, token):
        if request.method == 'POST':
            form = PasswordResetConfirmForm(request.POST)
            if form.is_valid():
                if form.cleaned_data['new_password'] != form.cleaned_data['new_password_confirm']:
                    messages.error(request, 'Passwords do not match.')
                else:
                    user.set_password(form.cleaned_data['new_password'])
                    user.save()
                    # Invalidate all sessions
                    from django.contrib.sessions.models import Session
                    for session in Session.objects.all():
                        session_data = session.get_decoded()
                        if session_data.get('_auth_user_id') == str(user.id):
                            session.delete()
                    messages.success(request, 'Password reset successful. You can now sign in with your new password.')
                    return redirect('login')
        else:
            form = PasswordResetConfirmForm()
        return render(request, 'accounts/registration/password_reset_confirm.html',
                     {'form': form, 'uidb64': uidb64, 'token': token})
    else:
        messages.error(request, 'The password reset link is invalid or has expired.')
        return redirect('password_reset_request')
```

---

### T049-T050 – DRF API Endpoints

`src/accounts/serializers.py`:
```python
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
```

`src/accounts/api/views.py`:
```python
@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_api(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        # Same logic as view (send email if user exists)
        return Response({'message': 'If an account with that email exists, a password reset link has been sent.'})
    return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_api(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        # Same token validation and password update logic
        # Return 200 on success, 400 on invalid token
        pass
    return Response(serializer.errors, status=400)
```

---

### T051-T052 – URLs and Documentation

Add routes to `urls.py` files, update README with password reset security properties.

---

## Definition of Done

- [ ] Reset request always returns "check inbox" (no enumeration)
- [ ] Email sent only to verified accounts
- [ ] Token expires after 1 hour
- [ ] Password update invalidates all sessions
- [ ] Token single-use
- [ ] API and form-based views functional

**Dependencies**: WP01, WP03 (token utilities)
**Estimated Effort**: 5-6 hours
