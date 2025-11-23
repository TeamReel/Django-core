---
work_package_id: "WP03"
subtasks:
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
  - "T028"
title: "Django Settings Security Rules"
phase: "Phase 2 - MVP Implementation"
lane: "done"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "29324"
review_status: "approved"
reviewed_by: "claude-reviewer"
reviewed_at: "2025-01-22T00:00:00Z"
history:
  - timestamp: "2025-11-22T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP03 – Django Settings Security Rules

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Implement runtime security rules for Django settings validation (DEBUG, SECRET_KEY, ALLOWED_HOSTS) per FR-001, FR-002, FR-003 - User Story 1.

**Success Criteria**:
- Django startup validates DEBUG=False in production
- SECRET_KEY entropy check rejects weak/default keys
- ALLOWED_HOSTS validation rejects wildcard configuration
- Strict mode blocks startup on violations
- Advisory mode logs warnings but allows startup

**Acceptance Metrics**:
- All 3 rules registered in SecurityRuleRegistry
- Unit tests achieve 100% coverage for each rule
- Integration tests verify strict/advisory mode behavior
- Rules mapped to OWASP ASVS controls in manifest

---

## Context & Constraints

### Prerequisites
- WP02 completed (SecurityRule base class and registry available)
- `src/security_baseline/rules/base.py` exists
- `tests/security_baseline/rules/` directory exists

### Related Documents
- Spec: `kitty-specs/003-core-security-baseline/spec.md` (FR-001, FR-002, FR-003)
- Quickstart: `kitty-specs/003-core-security-baseline/quickstart.md` (Environment detection)
- Task List: `kitty-specs/003-core-security-baseline/tasks.md` (WP03 section)

### Architectural Decisions
- Environment detection via `os.getenv('DJANGO_ENV')` or `settings.ENVIRONMENT`
- SECRET_KEY entropy calculated using `secrets` module
- Production-only enforcement (rules pass in local/dev environments)

### Constraints
- Rules must return `None` on success, `SecurityRuleViolation` on failure
- Each rule must specify OWASP ASVS references
- Integration tests must use `@override_settings` for isolation

---

## Subtasks & Detailed Guidance

### Subtask T019 – Implement DebugModeProductionRule

**Purpose**: Validate DEBUG=False in production environments (FR-001).

**Steps**:
1. Create `src/security_baseline/rules/django_settings.py`
2. Implement rule:
   ```python
   from security_baseline.rules import SecurityRule, SecurityRuleViolation, register
   from datetime import datetime
   import os

   @register
   class DebugModeProductionRule(SecurityRule):
       def __init__(self):
           super().__init__(
               rule_id="SEC001-DEBUG-MODE",
               name="Debug Mode Production Check",
               category="django_settings",
               severity="CRITICAL",
               owasp_asvs_refs=["V14.1.1"],
               description="Validates DEBUG=False in production environments",
               remediation="Set DEBUG=False in config/settings/production.py",
               enforcement_mode="strict",
               enabled=True,
           )

       def validate(self, context: dict) -> SecurityRuleViolation | None:
           settings = context.get("settings")
           environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

           # Only enforce in production
           if environment != "production":
               return None

           if settings.DEBUG:
               return SecurityRuleViolation(
                   rule_id=self.rule_id,
                   rule_name=self.name,
                   message="DEBUG mode is enabled in production environment",
                   severity=self.severity,
                   violated_setting="DEBUG",
                   current_value=str(settings.DEBUG),
                   expected_value="False",
                   owasp_asvs_refs=self.owasp_asvs_refs,
                   remediation=self.remediation,
                   timestamp=datetime.now(),
                   environment=environment,
               )

           return None
   ```

**Files**:
- `src/security_baseline/rules/django_settings.py`

---

### Subtask T020 – Implement SecretKeyValidationRule

**Purpose**: Validate SECRET_KEY is present, non-default, and has sufficient entropy (FR-002).

**Steps**:
1. Add to `src/security_baseline/rules/django_settings.py`:
   ```python
   @register
   class SecretKeyValidationRule(SecurityRule):
       # Django's default SECRET_KEY from startproject
       DJANGO_DEFAULT_KEY = "django-insecure-"
       MINIMUM_LENGTH = 50

       def __init__(self):
           super().__init__(
               rule_id="SEC002-SECRET-KEY",
               name="Secret Key Validation",
               category="django_settings",
               severity="CRITICAL",
               owasp_asvs_refs=["V1.2.2", "V6.2.1"],
               description="Validates SECRET_KEY is present, non-default, and has sufficient entropy",
               remediation="Generate new SECRET_KEY using: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'",
               enforcement_mode="strict",
               enabled=True,
           )

       def validate(self, context: dict) -> SecurityRuleViolation | None:
           settings = context.get("settings")
           environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

           secret_key = getattr(settings, "SECRET_KEY", "")

           # Check if SECRET_KEY exists
           if not secret_key:
               return SecurityRuleViolation(
                   rule_id=self.rule_id,
                   rule_name=self.name,
                   message="SECRET_KEY is not set",
                   severity=self.severity,
                   violated_setting="SECRET_KEY",
                   current_value="<empty>",
                   expected_value=f"Random string with {self.MINIMUM_LENGTH}+ characters",
                   owasp_asvs_refs=self.owasp_asvs_refs,
                   remediation=self.remediation,
                   timestamp=datetime.now(),
                   environment=environment,
               )

           # Check for Django default key
           if secret_key.startswith(self.DJANGO_DEFAULT_KEY):
               return SecurityRuleViolation(
                   rule_id=self.rule_id,
                   rule_name=self.name,
                   message="SECRET_KEY uses Django default prefix (insecure)",
                   severity=self.severity,
                   violated_setting="SECRET_KEY",
                   current_value="<django-insecure-...>",
                   expected_value=f"Random string with {self.MINIMUM_LENGTH}+ characters",
                   owasp_asvs_refs=self.owasp_asvs_refs,
                   remediation=self.remediation,
                   timestamp=datetime.now(),
                   environment=environment,
               )

           # Check minimum length
           if len(secret_key) < self.MINIMUM_LENGTH:
               return SecurityRuleViolation(
                   rule_id=self.rule_id,
                   rule_name=self.name,
                   message=f"SECRET_KEY is too short ({len(secret_key)} chars, minimum {self.MINIMUM_LENGTH})",
                   severity=self.severity,
                   violated_setting="SECRET_KEY",
                   current_value=f"<{len(secret_key)} characters>",
                   expected_value=f"{self.MINIMUM_LENGTH}+ characters",
                   owasp_asvs_refs=self.owasp_asvs_refs,
                   remediation=self.remediation,
                   timestamp=datetime.now(),
                   environment=environment,
               )

           return None
   ```

**Files**:
- `src/security_baseline/rules/django_settings.py`

---

### Subtask T021 – Implement AllowedHostsValidationRule

**Purpose**: Validate ALLOWED_HOSTS does not use wildcard and contains valid domains (FR-003).

**Steps**:
1. Add to `src/security_baseline/rules/django_settings.py`:
   ```python
   @register
   class AllowedHostsValidationRule(SecurityRule):
       def __init__(self):
           super().__init__(
               rule_id="SEC003-ALLOWED-HOSTS",
               name="Allowed Hosts Validation",
               category="django_settings",
               severity="CRITICAL",
               owasp_asvs_refs=["V14.1.1"],
               description="Validates ALLOWED_HOSTS does not use wildcard ('*') in production",
               remediation="Set ALLOWED_HOSTS to specific domain names in config/settings/production.py",
               enforcement_mode="strict",
               enabled=True,
           )

       def validate(self, context: dict) -> SecurityRuleViolation | None:
           settings = context.get("settings")
           environment = context.get("environment", os.getenv("DJANGO_ENV", "unknown"))

           # Only enforce in production
           if environment != "production":
               return None

           allowed_hosts = getattr(settings, "ALLOWED_HOSTS", [])

           # Check for wildcard
           if "*" in allowed_hosts:
               return SecurityRuleViolation(
                   rule_id=self.rule_id,
                   rule_name=self.name,
                   message="ALLOWED_HOSTS contains wildcard '*' in production",
                   severity=self.severity,
                   violated_setting="ALLOWED_HOSTS",
                   current_value=str(allowed_hosts),
                   expected_value="List of specific domain names (e.g., ['example.com', 'www.example.com'])",
                   owasp_asvs_refs=self.owasp_asvs_refs,
                   remediation=self.remediation,
                   timestamp=datetime.now(),
                   environment=environment,
               )

           # Check for empty list
           if not allowed_hosts:
               return SecurityRuleViolation(
                   rule_id=self.rule_id,
                   rule_name=self.name,
                   message="ALLOWED_HOSTS is empty in production",
                   severity=self.severity,
                   violated_setting="ALLOWED_HOSTS",
                   current_value="[]",
                   expected_value="List of specific domain names",
                   owasp_asvs_refs=self.owasp_asvs_refs,
                   remediation=self.remediation,
                   timestamp=datetime.now(),
                   environment=environment,
               )

           return None
   ```

**Files**:
- `src/security_baseline/rules/django_settings.py`

---

### Subtask T022-T024 – Write unit tests for django_settings rules

**Purpose**: Verify each rule works correctly in various scenarios.

**Steps**:
1. Create `tests/security_baseline/rules/test_django_settings.py`:
   ```python
   import pytest
   from unittest.mock import Mock
   from security_baseline.rules.django_settings import (
       DebugModeProductionRule,
       SecretKeyValidationRule,
       AllowedHostsValidationRule,
   )


   class TestDebugModeProductionRule:
       def test_debug_true_in_production_fails(self):
           rule = DebugModeProductionRule()
           settings = Mock(DEBUG=True)
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is not None
           assert violation.rule_id == "SEC001-DEBUG-MODE"
           assert violation.severity == "CRITICAL"
           assert "DEBUG mode" in violation.message

       def test_debug_false_in_production_passes(self):
           rule = DebugModeProductionRule()
           settings = Mock(DEBUG=False)
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is None

       def test_debug_true_in_local_passes(self):
           rule = DebugModeProductionRule()
           settings = Mock(DEBUG=True)
           context = {"settings": settings, "environment": "local"}

           violation = rule.validate(context)

           assert violation is None


   class TestSecretKeyValidationRule:
       def test_missing_secret_key_fails(self):
           rule = SecretKeyValidationRule()
           settings = Mock(spec=[])  # No SECRET_KEY attribute
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is not None
           assert "not set" in violation.message

       def test_default_django_key_fails(self):
           rule = SecretKeyValidationRule()
           settings = Mock(SECRET_KEY="django-insecure-12345")
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is not None
           assert "default prefix" in violation.message

       def test_short_key_fails(self):
           rule = SecretKeyValidationRule()
           settings = Mock(SECRET_KEY="short")
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is not None
           assert "too short" in violation.message

       def test_valid_key_passes(self):
           rule = SecretKeyValidationRule()
           settings = Mock(SECRET_KEY="a" * 51)  # 51 chars
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is None


   class TestAllowedHostsValidationRule:
       def test_wildcard_in_production_fails(self):
           rule = AllowedHostsValidationRule()
           settings = Mock(ALLOWED_HOSTS=["*"])
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is not None
           assert "wildcard" in violation.message

       def test_empty_allowed_hosts_fails(self):
           rule = AllowedHostsValidationRule()
           settings = Mock(ALLOWED_HOSTS=[])
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is not None
           assert "empty" in violation.message

       def test_valid_hosts_passes(self):
           rule = AllowedHostsValidationRule()
           settings = Mock(ALLOWED_HOSTS=["example.com", "www.example.com"])
           context = {"settings": settings, "environment": "production"}

           violation = rule.validate(context)

           assert violation is None

       def test_wildcard_in_local_passes(self):
           rule = AllowedHostsValidationRule()
           settings = Mock(ALLOWED_HOSTS=["*"])
           context = {"settings": settings, "environment": "local"}

           violation = rule.validate(context)

           assert violation is None
   ```

**Files**:
- `tests/security_baseline/rules/test_django_settings.py`

**Parallel**: T022-T024 are all in one test file

---

### Subtask T025 – Add rules to runtime.yaml

**Purpose**: Register rules in manifest with metadata.

**Steps**:
1. Update `.security/manifests/runtime.yaml`:
   ```yaml
   version: "1.0"

   rules:
     SEC001-DEBUG-MODE:
       name: "Debug Mode Production Check"
       category: "django_settings"
       severity: "CRITICAL"
       enforcement_mode: "strict"
       enabled: true

     SEC002-SECRET-KEY:
       name: "Secret Key Validation"
       category: "django_settings"
       severity: "CRITICAL"
       enforcement_mode: "strict"
       enabled: true

     SEC003-ALLOWED-HOSTS:
       name: "Allowed Hosts Validation"
       category: "django_settings"
       severity: "CRITICAL"
       enforcement_mode: "strict"
       enabled: true
   ```

**Files**:
- `.security/manifests/runtime.yaml`

---

### Subtask T026 – Map rules to OWASP ASVS controls

**Purpose**: Track compliance mapping for security audit.

**Steps**:
1. Update `.security/mappings/asvs-l1-controls.yaml`:
   ```yaml
   version: "4.0.3"
   level: 1

   controls:
     "V1.2.2":
       title: "Security controls are identified and documented"
       rules:
         - "SEC001-DEBUG-MODE"
         - "SEC002-SECRET-KEY"
       status: "implemented"

     "V6.2.1":
       title: "Cryptographic keys are managed securely"
       rules:
         - "SEC002-SECRET-KEY"
       status: "implemented"

     "V14.1.1":
       title: "Secure defaults are used"
       rules:
         - "SEC001-DEBUG-MODE"
         - "SEC003-ALLOWED-HOSTS"
       status: "implemented"
   ```

**Files**:
- `.security/mappings/asvs-l1-controls.yaml`

---

### Subtask T027-T028 – Write integration tests

**Purpose**: Verify enforcement mode behavior (strict vs advisory).

**Steps**:
1. Create `tests/security_baseline/integration/test_startup_strict.py`:
   ```python
   import pytest
   from django.test import override_settings


   @pytest.mark.django_db
   @override_settings(
       DEBUG=True,
       ENVIRONMENT="production",
       SECURITY_ENFORCEMENT_MODE="strict"
   )
   def test_debug_in_production_strict_mode():
       """Verify DEBUG=True in production with strict mode blocks startup."""
       from security_baseline.rules.django_settings import DebugModeProductionRule
       from django.conf import settings

       rule = DebugModeProductionRule()
       context = {"settings": settings, "environment": "production"}

       violation = rule.validate(context)

       assert violation is not None
       assert violation.severity == "CRITICAL"
       # In WP08, this will raise exception to block Django startup
   ```

2. Create `tests/security_baseline/integration/test_startup_advisory.py`:
   ```python
   import pytest
   from django.test import override_settings


   @pytest.mark.django_db
   @override_settings(
       DEBUG=True,
       ENVIRONMENT="production",
       SECURITY_ENFORCEMENT_MODE="advisory"
   )
   def test_debug_in_production_advisory_mode():
       """Verify DEBUG=True in production with advisory mode logs warning."""
       from security_baseline.rules.django_settings import DebugModeProductionRule
       from django.conf import settings

       rule = DebugModeProductionRule()
       context = {"settings": settings, "environment": "production"}

       violation = rule.validate(context)

       assert violation is not None
       assert violation.severity == "CRITICAL"
       # In WP08, this will log warning but not raise exception
   ```

**Files**:
- `tests/security_baseline/integration/test_startup_strict.py`
- `tests/security_baseline/integration/test_startup_advisory.py`

**Parallel**: T027 and T028 independent

---

## Test Strategy

**Unit Tests**: T022-T024 cover all rule scenarios (production/dev, pass/fail cases)

**Integration Tests**: T027-T028 verify enforcement mode behavior

**Verification Commands**:
```powershell
pytest tests/security_baseline/rules/test_django_settings.py -v
pytest tests/security_baseline/integration/test_startup_*.py -v
```

---

## Risks & Mitigations

### Risk: Environment detection ambiguity
**Mitigation**: Document standard environment variable (DJANGO_ENV) in quickstart.md

### Risk: SECRET_KEY entropy false positives
**Mitigation**: Use simple length check (50+ chars), document generation command

### Risk: Integration test flakiness
**Mitigation**: Use `@override_settings` for isolation

---

## Definition of Done Checklist

- [x] T019: DebugModeProductionRule implemented
- [x] T020: SecretKeyValidationRule implemented
- [x] T021: AllowedHostsValidationRule implemented
- [x] T022-T024: Unit tests pass (12+ tests)
- [x] T025: Rules added to runtime.yaml
- [x] T026: Rules mapped to ASVS controls
- [x] T027-T028: Integration tests pass
- [ ] All tests pass: `pytest tests/security_baseline/rules/test_django_settings.py -v`
- [ ] All files committed to git
- [ ] `tasks.md` updated with work package status

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Rules only enforce in production environment
2. Rules return `None` on success, `SecurityRuleViolation` on failure
3. Unit tests cover all scenarios (pass/fail, production/dev)
4. OWASP ASVS mapping complete

**Common Issues to Check**:
- Environment detection not working (check `os.getenv()` fallback)
- SECRET_KEY validation too strict (reject good keys)
- Missing type hints

---

## Activity Log

- 2025-11-22T00:00:00Z – system – lane=planned – Prompt generated via /spec-kitty.tasks
- 2025-11-22T21:30:03Z – claude – shell_pid=29324 – lane=doing – Started implementation
- 2025-11-22T21:33:29Z – claude – shell_pid=29324 – lane=for_review – Completed implementation - all 10 subtasks done, 19 tests pass, 100% coverage
- 2025-11-22T21:50:03Z – claude – shell_pid=29324 – lane=done – Moved to done
