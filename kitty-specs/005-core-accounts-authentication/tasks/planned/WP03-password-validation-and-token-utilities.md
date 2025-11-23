---
work_package_id: "WP03"
subtasks:
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
title: "Password Validation & Token Utilities"
phase: "Phase 0 - Infrastructure"
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

# Work Package Prompt: WP03 – Password Validation & Token Utilities

## Objectives & Success Criteria

**Goal**: Implement password strength validation (8+ chars, uppercase, lowercase, number, special) and create secure token generation utilities for email verification and password reset.

**Success Criteria**:
- [ ] Password validators reject weak passwords
- [ ] Tokens generate with cryptographic security
- [ ] Token validation checks expiry correctly (24h verification, 1h reset)
- [ ] Token reuse prevented via state binding

## Context & Constraints

**Key Requirements** (from `spec.md`):
- FR-012: Password minimum 8 chars with complexity (uppercase+lowercase+number+special)
- FR-005: Email verification tokens expire after 24 hours
- FR-011: Password reset tokens expire after 1 hour

**References**:
- **Data Model**: `data-model.md` - EmailVerificationToken, PasswordResetToken (virtual entities)
- **Research**: `research.md` - Token storage decision (signed tokens, no DB)

## Subtasks & Detailed Guidance

### T016 – Create custom password validators

Create `src/accounts/validators.py`:
```python
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class UppercaseValidator:
    def validate(self, password, user=None):
        if not re.search(r'[A-Z]', password):
            raise ValidationError(_('Password must contain at least one uppercase letter.'), code='password_no_upper')
    def get_help_text(self):
        return _('Your password must contain at least one uppercase letter.')

class LowercaseValidator:
    def validate(self, password, user=None):
        if not re.search(r'[a-z]', password):
            raise ValidationError(_('Password must contain at least one lowercase letter.'), code='password_no_lower')
    def get_help_text(self):
        return _('Your password must contain at least one lowercase letter.')

class NumberValidator:
    def validate(self, password, user=None):
        if not re.search(r'[0-9]', password):
            raise ValidationError(_('Password must contain at least one number.'), code='password_no_number')
    def get_help_text(self):
        return _('Your password must contain at least one number.')

class SpecialCharacterValidator:
    def validate(self, password, user=None):
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(_('Password must contain at least one special character.'), code='password_no_special')
    def get_help_text(self):
        return _('Your password must contain at least one special character (!@#$%^&*(),.?":{}|<>).')
```

**Files**: `src/accounts/validators.py` (CREATE)

---

### T017 – Configure password validators in settings

Edit `src/config/settings/base.py`:
```python
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
    {'NAME': 'accounts.validators.UppercaseValidator'},
    {'NAME': 'accounts.validators.LowercaseValidator'},
    {'NAME': 'accounts.validators.NumberValidator'},
    {'NAME': 'accounts.validators.SpecialCharacterValidator'},
]
```

**Files**: `src/config/settings/base.py` (MODIFY)

---

### T018-T019 – Create token generators

Create `src/accounts/tokens.py`:
```python
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
from datetime import timedelta

class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """Token generator for email verification with 24-hour expiry."""

    def _make_hash_value(self, user, timestamp):
        # Include email_verified status so token invalid after verification
        return f"{user.pk}{user.email}{user.email_verified}{timestamp}"

    def check_token(self, user, token):
        """Check token and ensure it hasn't expired (24 hours)."""
        if not super().check_token(user, token):
            return False

        # Check 24-hour expiry
        try:
            ts_b36, _ = token.split("-")
            ts = int(ts_b36, 36)
        except (ValueError, TypeError):
            return False

        token_timestamp = timezone.datetime.fromtimestamp(ts, tz=timezone.utc)
        if timezone.now() - token_timestamp > timedelta(hours=24):
            return False

        return True

email_verification_token = EmailVerificationTokenGenerator()

# Password reset uses Django's default (1-hour expiry is Django default)
```

**Files**: `src/accounts/tokens.py` (CREATE)

---

### T020 [P] – Document token security

Update `src/accounts/README.md` (add Token Security section):
```markdown
## Token Security

### Email Verification Tokens
- **Expiry**: 24 hours from generation
- **Format**: `<timestamp>-<hash>` (cryptographically signed)
- **State Binding**: Token includes email_verified status, invalid after verification
- **Storage**: Stateless (no database storage, signed with SECRET_KEY)

### Password Reset Tokens
- **Expiry**: 1 hour from generation (Django default)
- **Format**: `<timestamp>-<hash>`
- **State Binding**: Token includes password hash, invalid after password change
- **Single Use**: Automatically invalid after successful reset

Both token types use Django's PasswordResetTokenGenerator with HMAC-SHA256 signing.
```

**Files**: `src/accounts/README.md` (UPDATE)

---

## Test Strategy

**Manual Verification**:
```python
python manage.py shell
from accounts.models import User
from accounts.tokens import email_verification_token

user = User.objects.create_user(email='test@example.com', password='Test123!@#')
token = email_verification_token.make_token(user)
print(email_verification_token.check_token(user, token))  # Should be True

# Verify token invalid after email verified
user.email_verified = True
user.save()
print(email_verification_token.check_token(user, token))  # Should be False
```

## Definition of Done

- [ ] Password validators created and configured
- [ ] Weak passwords rejected
- [ ] EmailVerificationTokenGenerator implemented
- [ ] Token expiry checked correctly
- [ ] Token invalidated after state change
- [ ] Documentation updated

**Dependencies**: WP01
**Estimated Effort**: 2-3 hours
