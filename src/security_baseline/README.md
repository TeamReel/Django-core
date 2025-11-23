# Security Baseline Django App

This Django app provides comprehensive security enforcement for Django Core-App.

## Architecture

- **rules/**: SecurityRule implementations (Django settings, sessions, CSRF, headers, passwords)
- **validators/**: Custom validators (password breach detection)
- **reporters/**: SecurityReporter for Constitutional Engine integration
- **config/**: Manifest loader and OWASP ASVS mapper

## SecurityRule Interface

All security rules inherit from `SecurityRule` abstract base class and implement the `validate()` method.

### Example Rule Implementation

```python
from security_baseline.rules import SecurityRule, SecurityRuleViolation, register
from datetime import datetime

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
        environment = context.get("environment", "unknown")

        if environment == "production" and settings.DEBUG:
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

### Registry Pattern

Rules are automatically registered using the `@register` decorator. On Django startup,
`AppConfig.ready()` imports all rule modules, triggering registration.

Retrieve rules:
```python
from security_baseline.rules.registry import SecurityRuleRegistry

registry = SecurityRuleRegistry()
all_rules = registry.get_all_rules()
django_rules = registry.get_rules_by_category("django_settings")
specific_rule = registry.get_rule("SEC001-DEBUG-MODE")
```

## Usage

See `kitty-specs/003-core-security-baseline/quickstart.md` for setup and usage guide.

## Integration

This app integrates with the Constitutional Enforcement Engine (Module 002) as a security-specific rule plugin.

## Enforcement Modes

- **Strict**: Blocks Django startup on CRITICAL/HIGH severity violations (production default)
- **Advisory**: Logs warnings but allows startup (development default)

Configure via `SECURITY_ENFORCEMENT_MODE` setting in Django settings.
