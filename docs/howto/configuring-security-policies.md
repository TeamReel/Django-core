# How-To: Configuring Security Policies

**WP15-T137**: Step-by-step guide for customizing security baseline configuration.

## Overview

The Security Baseline uses a YAML manifest file (`.security/manifest.yaml`) to configure security rules, enforcement modes, and exemptions per environment.

---

## Table of Contents

1. [Manifest Structure](#manifest-structure)
2. [Customizing Security Rules](#customizing-security-rules)
3. [Rule Exemptions](#rule-exemptions)
4. [Environment Profiles](#environment-profiles)
5. [Enforcement Modes](#enforcement-modes)
6. [Examples](#examples)

---

## Manifest Structure

Basic manifest structure:

```yaml
version: "1.0"
environment: "local"  # or "staging", "production"
enforcement_mode: "advisory"  # or "strict"

rules:
  SEC001-DEBUG-MODE:
    enabled: true
    enforcement_mode: "strict"
  SEC002-SECRET-KEY:
    enabled: true
    enforcement_mode: "strict"

exemptions: []

environments:
  local:
    enforcement_mode: "advisory"
  production:
    enforcement_mode: "strict"
```

---

## Customizing Security Rules

### Enable/Disable Rules

Disable specific rules per environment:

```yaml
rules:
  SEC001-DEBUG-MODE:
    enabled: false  # Disable DEBUG check in local
```

### Per-Rule Enforcement Modes

Override enforcement mode for individual rules:

```yaml
rules:
  SEC010-HSTS-HEADER:
    enabled: true
    enforcement_mode: "advisory"  # Warn but don't block
```

### Rule Configuration Options

Available options per rule:

- `enabled` (boolean): Enable/disable the rule
- `enforcement_mode` (string): `"strict"` or `"advisory"`
- Custom parameters (rule-specific)

---

## Rule Exemptions

### Temporary Exemptions

Exempt specific violations with justification and expiration:

```yaml
exemptions:
  - rule_id: "SEC003-ALLOWED-HOSTS"
    reason: "Wildcard required for internal load balancer health checks"
    expires: "2025-12-31"
    approved_by: "security-team@company.com"
    environments: ["staging"]
```

### Permanent Exemptions

Omit `expires` field for permanent exemptions (requires strong justification):

```yaml
exemptions:
  - rule_id: "SEC016-DATABASE-SSL"
    reason: "Cloud SQL Proxy provides encrypted tunnel"
    approved_by: "security-team@company.com"
    environments: ["production"]
```

### Exemption Fields

Required fields:
- `rule_id`: Rule identifier (e.g., `SEC001-DEBUG-MODE`)
- `reason`: Detailed justification
- `approved_by`: Approver email or team

Optional fields:
- `expires`: ISO 8601 date (e.g., `2025-12-31`)
- `environments`: List of environments (default: all)

---

## Environment Profiles

### Environment Detection

The app auto-detects environment from:

1. `DJANGO_ENV` environment variable
2. Django settings file name (e.g., `settings/production.py`)
3. Defaults to `"local"`

### Environment-Specific Configuration

Override settings per environment:

```yaml
environment: "local"  # Base environment

environments:
  local:
    enforcement_mode: "advisory"
    rules:
      SEC001-DEBUG-MODE:
        enabled: false  # Allow DEBUG in local
      
  staging:
    enforcement_mode: "advisory"
    rules:
      SEC010-HSTS-HEADER:
        enabled: false  # No HSTS in staging
      
  production:
    enforcement_mode: "strict"
    rules:
      SEC001-DEBUG-MODE:
        enabled: true
        enforcement_mode: "strict"
```

### Deep Merge Behavior

Environment-specific configs deep-merge with base config:

- Base `rules` preserved
- Environment `rules` override/extend base
- Environment `enforcement_mode` overrides base
- Environment `exemptions` append to base

---

## Enforcement Modes

### Strict Mode (Production Default)

Blocks Django startup on violations:

```yaml
enforcement_mode: "strict"
```

**Behavior**:
- CRITICAL/HIGH severity → Blocks startup
- MEDIUM/LOW severity → Logs warnings
- Exits with non-zero status code
- Generates security report

**Use Cases**:
- Production environments
- Staging environments (pre-production validation)
- CI/CD pipelines (security gate)

### Advisory Mode (Development Default)

Logs warnings without blocking:

```yaml
enforcement_mode: "advisory"
```

**Behavior**:
- All severities → Logs warnings
- Allows startup
- Generates security report
- Continues with warnings

**Use Cases**:
- Local development
- Debugging environments
- Gradual rollout of new rules

---

## Examples

### Example 1: Local Development

Allow DEBUG and disable strict checks:

```yaml
version: "1.0"
environment: "local"
enforcement_mode: "advisory"

rules:
  SEC001-DEBUG-MODE:
    enabled: false
  SEC003-ALLOWED-HOSTS:
    enabled: false
```

### Example 2: Production with Exemptions

Strict enforcement with temporary wildcard exemption:

```yaml
version: "1.0"
environment: "production"
enforcement_mode: "strict"

exemptions:
  - rule_id: "SEC003-ALLOWED-HOSTS"
    reason: "Migration period for legacy clients"
    expires: "2025-12-31"
    approved_by: "cto@company.com"
    environments: ["production"]
```

### Example 3: Multi-Environment

Different configs per environment:

```yaml
version: "1.0"
environment: "local"

environments:
  local:
    enforcement_mode: "advisory"
    rules:
      SEC001-DEBUG-MODE:
        enabled: false
      SEC010-HSTS-HEADER:
        enabled: false
      
  staging:
    enforcement_mode: "advisory"
    rules:
      SEC010-HSTS-HEADER:
        enabled: false
      
  production:
    enforcement_mode: "strict"
    # All rules enabled by default
```

### Example 4: Progressive Rollout

Start with advisory, move to strict:

**Phase 1 - Monitoring (Week 1-2)**:
```yaml
enforcement_mode: "advisory"
```

**Phase 2 - Soft Enforcement (Week 3-4)**:
```yaml
enforcement_mode: "strict"

exemptions:
  - rule_id: "SEC010-HSTS-HEADER"
    reason: "Progressive rollout - monitoring impact"
    expires: "2025-12-15"
    approved_by: "devops@company.com"
```

**Phase 3 - Full Enforcement (Week 5+)**:
```yaml
enforcement_mode: "strict"
# All exemptions expired or removed
```

---

## Best Practices

1. **Version Control**: Commit `.security/manifest.yaml` to git
2. **Code Review**: Require approval for exemption changes
3. **Expiration Dates**: Always set `expires` for temporary exemptions
4. **Documentation**: Document reason field thoroughly
5. **Monitoring**: Review security reports regularly
6. **Audit Trail**: Track exemption changes in git history
7. **CI Integration**: Validate manifest in CI pipeline
8. **Testing**: Test manifest changes in staging before production

---

## Troubleshooting

### Issue: Rules Not Loading

**Symptom**: Security checks not running

**Solution**:
1. Verify `.security/manifest.yaml` exists
2. Check YAML syntax: `python -c "import yaml; yaml.safe_load(open('.security/manifest.yaml'))"`
3. Check file permissions
4. Review Django logs for parsing errors

### Issue: Unexpected Enforcement

**Symptom**: Startup blocked unexpectedly

**Solution**:
1. Check `enforcement_mode` in manifest
2. Verify environment detection: `python manage.py shell -c "from django.conf import settings; print(settings.SECURITY_BASELINE_ENVIRONMENT)"`
3. Review security report in `.security/reports/`
4. Check for active exemptions

### Issue: Exemptions Not Working

**Symptom**: Exempted rules still failing

**Solution**:
1. Verify `rule_id` matches exactly (case-sensitive)
2. Check `expires` date hasn't passed
3. Verify `environments` list includes current environment
4. Check exemption syntax in YAML

---

## Related Documentation

- [Testing Guide](../TESTING_GUIDE.md)
- [Security Checklist](../security-checklist.md)
- [Quickstart Guide](../../kitty-specs/003-core-security-baseline/quickstart.md)
- [ADR-004: Security Enforcement Modes](../adr/004-security-enforcement-modes.md)
