# Quickstart: Core Security Baseline

**Feature**: 003-core-security-baseline
**Audience**: Developers, DevOps Engineers, Security Reviewers
**Time to Complete**: 10 minutes

## Overview

The Core Security Baseline provides automated security enforcement for Django Core-App through:
- **Runtime validation**: Checks Django settings at startup (DEBUG, sessions, CSRF, headers, passwords, SSL)
- **CI scanning**: Automated dependency vulnerability scanning, static analysis, and configuration auditing
- **OWASP ASVS compliance**: Maps security controls to OWASP Application Security Verification Standard Level 1

This guide shows you how to enable security baseline and interpret security reports.

---

## Prerequisites

- Django Core-App repository cloned
- Python 3.12+ installed
- Virtual environment activated
- Dependencies installed: `pip install -r requirements/local.txt`

---

## Quick Start (5 Minutes)

### 1. Verify Installation

The security baseline app is automatically installed as part of Django Core-App:

```bash
# Check that security_baseline app is in INSTALLED_APPS
python manage.py shell
>>> from django.conf import settings
>>> 'security_baseline' in settings.INSTALLED_APPS
True
```

### 2. Run Security Check

```bash
# Run Django with security checks (automatic on startup)
python manage.py runserver

# Security baseline executes during AppConfig.ready()
# Output:
# [SecurityBaseline] Running security checks (enforcement_mode=advisory)...
# [SecurityBaseline] ✓ All 10 security rules passed
# [SecurityBaseline] OWASP ASVS Level 1 coverage: 26/25 controls (104%)
# [SecurityBaseline] Report: /path/to/security-report-2025-11-22.json
```

### 3. View Security Report

```bash
# Security report is auto-generated in JSON format
cat /tmp/security-reports/runtime-startup-*.json
```

Example output (PASS):
```json
{
  "overall_status": "PASS",
  "violations": [],
  "passed_rules": [
    "SEC001-DEBUG-MODE",
    "SEC002-SECRET-KEY",
    "SEC003-ALLOWED-HOSTS",
    ...
  ],
  "owasp_asvs_coverage": {
    "total_controls_checked": 26,
    "level_1_coverage_percent": 104
  }
}
```

---

## Configuration

### Environment-Specific Security Policies

Security policies are controlled via YAML manifests in `.security/manifests/`:

```yaml
# .security/manifests/environments/local.yaml (Development)
environment: "local"
enforcement_mode: "advisory"  # Warnings only, don't block startup

disabled_rules:
  - "SEC001-DEBUG-MODE"  # Allow DEBUG=True in development
  - "SEC009-SSL-REDIRECT"  # No HTTPS required locally
```

```yaml
# .security/manifests/environments/production.yaml (Production)
environment: "production"
enforcement_mode: "strict"  # Block startup on violations

enabled_rules: "*"  # All rules enforced

severity_overrides:
  SEC005-CSRF-PROTECTION: "CRITICAL"  # Upgrade severity
```

### Switching Enforcement Modes

```python
# config/settings/production.py
SECURITY_ENFORCEMENT_MODE = "strict"  # Block startup on violations

# config/settings/local.py
SECURITY_ENFORCEMENT_MODE = "advisory"  # Log warnings only
```

---

## CI Security Scanning

### Run Dependency Scan (pip-audit)

```bash
# Scan for vulnerable dependencies
python .security/scripts/scan_dependencies.py --output=json

# Example output:
# Found 2 vulnerabilities:
# - requests 2.28.0 → CVE-2023-32681 (HIGH)
# - django 4.2.0 → CVE-2023-12345 (CRITICAL)
```

### Run Static Security Analysis (Bandit)

```bash
# Scan Python code for security issues
python .security/scripts/scan_code.py --format=json

# Example output:
# Found 1 issue:
# - tests/test_auth.py:42: Hardcoded password (B105, MEDIUM)
```

### Run Configuration Audit

```bash
# Validate Django settings files
python .security/scripts/audit_config.py --env=production

# Example output:
# ✓ DEBUG=False
# ✓ SECRET_KEY configured
# ✗ ALLOWED_HOSTS=['*'] (insecure)
```

### GitHub Actions Integration

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [pull_request, push]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install -r requirements/base.txt
          pip install pip-audit bandit

      - name: Dependency Scan
        run: python .security/scripts/scan_dependencies.py --incremental

      - name: Static Analysis
        run: python .security/scripts/scan_code.py --incremental

      - name: Config Audit
        run: python .security/scripts/audit_config.py --env=production

      - name: Upload Security Report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: .security/reports/*.json
```

---

## Common Scenarios

### Scenario 1: Development - Allow DEBUG=True

**Problem**: Startup blocked with "DEBUG=True detected in production"

**Solution**: Use local environment profile or set advisory mode

```bash
# Option 1: Use local environment automatically
export DJANGO_SETTINGS_MODULE=config.settings.local
python manage.py runserver

# Option 2: Override enforcement mode
export SECURITY_ENFORCEMENT_MODE=advisory
python manage.py runserver
```

### Scenario 2: Production Deploy Failed

**Problem**: Deployment blocked with security violations

**Solution**: Review security report and fix violations

```bash
# 1. Check security report in deployment logs
cat /var/log/django/security-report.json

# Example violation:
{
  "rule_id": "SEC002-SECRET-KEY",
  "message": "SECRET_KEY entropy too low (30 characters, requires 50+)",
  "severity": "CRITICAL",
  "remediation": "Generate new SECRET_KEY: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
}

# 2. Fix the violation
export SECRET_KEY="$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')"

# 3. Redeploy
```

### Scenario 3: CI Failing on Vulnerable Dependency

**Problem**: PR blocked by pip-audit finding CVE in dependency

**Solution**: Update vulnerable package

```bash
# 1. Check pip-audit report
cat .security/reports/dependency-scan-*.json

# Example:
{
  "package_name": "requests",
  "installed_version": "2.28.0",
  "vulnerability_id": "CVE-2023-32681",
  "fixed_versions": [">=2.31.0"]
}

# 2. Update requirements
sed -i 's/requests==2.28.0/requests>=2.31.0/' requirements/base.txt

# 3. Reinstall and rerun scan
pip install -r requirements/base.txt
python .security/scripts/scan_dependencies.py
```

### Scenario 4: Exempt False Positive from Bandit

**Problem**: Bandit flagging safe code as security issue

**Solution**: Add exemption to security manifest

```yaml
# .security/manifests/bandit.yaml
skips:
  - id: "B105"  # Hardcoded password check
    files: ["tests/fixtures/test_data.py"]
    reason: "Test fixtures contain mock credentials, not production secrets"
    approved_by: "security-team"
    approved_date: "2025-11-22"
```

### Scenario 5: Rule Exemptions with Justification (WP13)

**Problem**: Need to temporarily bypass a security rule for valid business reasons

**Solution**: Add time-limited exemption with justification and approval tracking

#### When to Use Exemptions

Exemptions should ONLY be used when:
- Technical constraints prevent immediate compliance (e.g., legacy system integration)
- Business requirements conflict with security policy (documented risk acceptance)
- Development/staging environments need relaxed checks (never in production)
- Time-limited migration periods (with clear remediation plan)

#### Exemption Workflow

1. **Identify the Rule**: Note the rule ID from security report (e.g., `SEC010-HSTS-HEADER`)

2. **Document Justification**: Explain WHY the exemption is necessary

3. **Get Approval**: Security team review required (production) or team lead (dev/staging)

4. **Set Expiration**: Maximum validity period:
   - **Production**: 90 days maximum, requires security review
   - **Staging**: 6 months, requires team lead approval
   - **Local**: 1 year, automatic approval for development

5. **Add to Manifest**: Update environment-specific manifest file

#### Exemption Format

```yaml
# .security/manifests/environments/staging.yaml
exemptions:
  - rule_id: "SEC010-HSTS-HEADER"
    justification: "Staging environment testing HTTPS configuration, HSTS may cause browser issues during cert updates"
    expires: "2026-06-30"  # YYYY-MM-DD format
    environments: ["staging"]  # Only applies to staging
    approved_by: "security-team"
    approved_date: "2025-01-15"
    notes: "Review before production deployment"

  - rule_id: "SEC016-DATABASE-SSL"
    justification: "RDS staging instance configured without SSL for cost optimization"
    expires: "2025-12-31"
    environments: ["staging"]
    approved_by: "infrastructure-team"
    approved_date: "2025-01-20"
    notes: "Must be enabled in production environment"
```

#### Required Fields

- **`rule_id`**: Security rule ID (e.g., `SEC001-DEBUG-MODE`)
- **`justification`**: Business reason for exemption (minimum 20 characters)
- **`expires`**: Expiration date in YYYY-MM-DD format
- **`environments`**: List of environments where exemption applies
- **`approved_by`**: Person/team who approved the exemption
- **`approved_date`**: Date exemption was approved

#### Optional Fields

- **`notes`**: Additional context or remediation plan
- **`risk_acceptance`**: Link to risk register or decision document

#### Expiration Tracking

The system automatically:
- **Rejects** expired exemptions (won't load at startup)
- **Warns** when exemptions expire within 30 days
- **Logs** all exemption applications for audit trail

```bash
# Example warning in logs
[WARNING] Exemption for SEC010-HSTS-HEADER expires in 15 days (on 2026-06-30)

# Example audit log
[INFO] Loaded exemption for SEC001-DEBUG-MODE in local environment:
       Development environment requires DEBUG=True (expires: 2026-12-31)
```

#### Production Exemption Policy

**Production exemptions are STRONGLY DISCOURAGED**. The production manifest should have:

```yaml
# .security/manifests/environments/production.yaml
exemptions: []  # MUST remain empty
```

If a production exemption is absolutely necessary:
1. Document in security risk register
2. Get executive sponsor approval
3. Set maximum 90-day expiration
4. Include remediation plan
5. Schedule security review before expiration

#### Enforcement Mode Interaction

Exemptions interact with enforcement modes:

| Mode | Exempt Rule Behavior |
|------|---------------------|
| **strict** | Exemption bypasses rule completely |
| **mixed** | Exemption bypasses rule completely |
| **advisory** | Exemption logged but rule already non-blocking |

#### Auditing Exemptions

View all active exemptions:

```python
from security_baseline.rules.registry import _registry

# Get all active exemptions
exemptions = _registry.get_all_exemptions()
for rule_id, exemption in exemptions.items():
    print(f"{rule_id}: {exemption['justification']}")
    print(f"  Expires: {exemption['expires']}")
    print(f"  Approved by: {exemption['approved_by']}")
```

Security reports automatically include exemption information:

```json
{
  "exemptions_applied": [
    {
      "rule_id": "SEC010-HSTS-HEADER",
      "justification": "Staging HTTPS configuration testing",
      "expires": "2026-06-30",
      "days_until_expiry": 220
    }
  ]
}
```

---

## Understanding Security Reports

### Report Structure

```json
{
  "overall_status": "PASS|FAIL|WARNING",
  "violations": [...],  // SecurityRuleViolation objects
  "passed_rules": [...],  // Rule IDs that passed
  "owasp_asvs_coverage": {
    "total_controls_checked": 26,
    "level_1_coverage_percent": 104
  }
}
```

### Status Meanings

- **PASS**: No violations detected, safe to deploy
- **FAIL**: Critical/High violations in strict mode, deployment blocked
- **WARNING**: Violations detected in advisory mode, review recommended

### Violation Severity Levels

- **CRITICAL**: Immediate security risk (e.g., DEBUG=True in prod)
- **HIGH**: Significant vulnerability (e.g., ALLOWED_HOSTS=['*'])
- **MEDIUM**: Moderate risk (e.g., session timeout too long)
- **LOW**: Minor improvement (e.g., verbose error messages)

---

## OWASP ASVS Compliance

The security baseline validates 26 OWASP ASVS Level 1 controls:

| Category | Controls | Examples |
|----------|----------|----------|
| V1: Architecture | 8 | DEBUG=False, ALLOWED_HOSTS configured |
| V2: Authentication | 5 | Password validation (12+ chars, breach check) |
| V3: Session Management | 4 | Secure cookies, HttpOnly, SameSite |
| V5: Input Validation | 3 | CSP headers, no unsafe-inline |
| V8: Data Protection | 3 | Database SSL, SECRET_KEY entropy |
| V9: Communication | 2 | HTTPS redirect, HSTS headers |
| V14: Configuration | 1 | No secrets in code |

View full mapping: `.security/mappings/asvs-l1-controls.yaml`

---

## Troubleshooting

### Security Checks Not Running

```bash
# Verify security_baseline app is installed
python manage.py shell
>>> from django.apps import apps
>>> apps.is_installed('security_baseline')
True

# Check for errors in Django startup
python manage.py check --deploy
```

### Enforcement Mode Not Respected

```bash
# Check environment variable
echo $SECURITY_ENFORCEMENT_MODE

# Check Django settings
python manage.py shell
>>> from django.conf import settings
>>> getattr(settings, 'SECURITY_ENFORCEMENT_MODE', 'not set')
```

### CI Scans Timing Out

```bash
# Increase timeout in manifest
# .security/manifests/pip-audit.yaml
timeout_seconds: 600  # 10 minutes instead of default 300

# Or run incremental scan only
python .security/scripts/scan_dependencies.py --incremental
```

---

## Next Steps

- **Review Security Policies**: Customize `.security/manifests/runtime.yaml` for your requirements
- **Integrate with CI**: Add security scan steps to `.github/workflows/`
- **Monitor Reports**: Set up log aggregation for security report analysis
- **Update OWASP Mapping**: Review `.security/mappings/asvs-l1-controls.yaml` for completeness

## Documentation

- **Full Documentation**: `kitty-specs/003-core-security-baseline/README.md` (once created)
- **HOWTO Guides**: `kitty-specs/003-core-security-baseline/howto/`
- **Specification**: `kitty-specs/003-core-security-baseline/spec.md`
- **Data Model**: `kitty-specs/003-core-security-baseline/data-model.md`

---

**Quickstart Status**: ✅ Complete - Covers installation, configuration, CI integration, common scenarios
