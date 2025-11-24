# ADR-001: Password Validation Strategy

**Status**: Accepted
**Date**: 2025-11-24
**Decision Makers**: Core Development Team
**Related**: Feature 005 (Core Accounts & Authentication)

## Context

Django Core-App requires a robust password validation system that balances security requirements with usability. The application must protect against weak passwords while providing clear feedback to users about password requirements.

## Decision

We will implement a custom password validation system using Django's password validator framework with four distinct validators:

1. **UppercaseValidator**: Requires at least one uppercase letter (A-Z)
2. **LowercaseValidator**: Requires at least one lowercase letter (a-z)
3. **NumberValidator**: Requires at least one digit (0-9)
4. **SpecialCharacterValidator**: Requires at least one special character from: `!@#$%^&*()_+-=[]{}|;:,.<>?`

### Implementation Details

**Validator Architecture**:
- Each validator is a standalone class implementing Django's password validator protocol
- Validators raise `ValidationError` with specific, actionable error messages
- Each validator provides a `get_help_text()` method for form rendering
- Validators are composable - all must pass for a password to be valid

**Minimum Password Requirements**:
- Minimum length: 8 characters (Django's `MinimumLengthValidator`)
- Must contain at least one character from each of the four categories above
- Example valid password: `SecurePass123!`

**Integration Points**:
- `AUTH_PASSWORD_VALIDATORS` setting in `config/settings/base.py`
- Applied at registration, password change, and password reset
- Enforced in both form-based views and REST API endpoints
- Validated in serializers before reaching the database layer

### Code Example

```python
# config/settings/base.py
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'accounts.validators.UppercaseValidator',
    },
    {
        'NAME': 'accounts.validators.LowercaseValidator',
    },
    {
        'NAME': 'accounts.validators.NumberValidator',
    },
    {
        'NAME': 'accounts.validators.SpecialCharacterValidator',
    },
]
```

## Consequences

### Positive

- **Clear Security Baseline**: Enforces minimum complexity requirements across the entire application
- **Consistent User Experience**: Same validation rules apply to all password entry points
- **Maintainable**: Each validator is independent and can be modified without affecting others
- **Testable**: Each validator can be tested in isolation (11 unit tests, 100% coverage)
- **Extensible**: Additional validators can be added without modifying existing ones
- **Django-Native**: Uses Django's built-in validation framework (no external dependencies)
- **User-Friendly**: Error messages clearly indicate which requirement is not met

### Negative

- **User Friction**: More complex passwords may be harder to remember
- **No Password Strength Scoring**: Binary pass/fail validation (not graduated strength meter)
- **Limited Character Set**: Special character requirement limited to specific ASCII characters
- **No Dictionary Checking**: Does not check against common password lists (could add Django's CommonPasswordValidator)

### Mitigated Risks

- **Brute Force Attacks**: Mitigated by Feature 003 (rate limiting, account lockout)
- **Password Reuse**: Mitigated by password history (future enhancement)
- **Social Engineering**: Mitigated by user education (password tips in UI)

## Alternatives Considered

### 1. NIST 800-63B Guidelines (Length-Only)
**Description**: NIST recommends minimum 8 characters with no composition rules, just check against breach databases.

**Rejected Because**:
- Requires external API calls for breach checking (complexity, performance)
- Users might choose very simple 8-character passwords without composition rules
- Delayed security (breach checking happens after breaches occur)

### 2. Entropy-Based Validation
**Description**: Calculate password entropy and require minimum bits of entropy (e.g., 50 bits).

**Rejected Because**:
- More complex to implement and explain to users
- Harder to provide actionable feedback ("increase entropy" is not user-friendly)
- May accept weak passwords with repetition (e.g., "aaaaaaaaA1!")

### 3. Third-Party Library (django-passwords)
**Description**: Use existing library like `django-passwords` for comprehensive validation.

**Rejected Because**:
- Adds external dependency with maintenance burden
- May include validators we don't need (code bloat)
- Custom validators give us full control over error messages and behavior

### 4. Passwordless Authentication
**Description**: Eliminate passwords entirely using magic links, WebAuthn, or OAuth only.

**Rejected Because**:
- Too radical for initial implementation (users expect password option)
- Requires email infrastructure for magic links
- OAuth adds external dependencies (Google, Microsoft, etc.)
- Can be added later as supplementary option

## Related Decisions

- **ADR-002**: Role-Based Access Control Architecture (user permissions after authentication)
- **Feature 003**: Security Baseline (brute-force protection, session security)

## References

- Django Password Validation: https://docs.djangoproject.com/en/5.1/topics/auth/passwords/
- NIST 800-63B Digital Identity Guidelines: https://pages.nist.gov/800-63-3/sp800-63b.html
- OWASP Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Implementation

- **Specification**: `kitty-specs/005-core-accounts-authentication/spec.md` (SC-004)
- **Code**: `src/accounts/validators.py`
- **Tests**: `tests/accounts/test_validators.py` (11 tests, 100% passing)
- **Configuration**: `src/config/settings/base.py` (AUTH_PASSWORD_VALIDATORS)

## Acceptance Criteria

- [x] All four custom validators implemented
- [x] Integration with Django's password validation framework
- [x] Applied at registration, password change, password reset
- [x] Enforced in both form views and REST API endpoints
- [x] 100% test coverage for all validators
- [x] Clear error messages for each validation failure
- [x] Help text available for form rendering
- [x] Documentation in README.md

## Review and Approval

**Proposed**: 2025-11-20
**Reviewed**: 2025-11-22
**Approved**: 2025-11-24
**Approved By**: Core Development Team
