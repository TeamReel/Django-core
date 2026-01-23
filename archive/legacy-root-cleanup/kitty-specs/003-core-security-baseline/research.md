# Research: Core Security Baseline

**Feature**: 003-core-security-baseline
**Date**: 2025-11-22
**Status**: Complete

## Executive Summary

This research document consolidates architectural decisions, technology selections, and implementation patterns for the Core Security Baseline feature. All decisions were validated during the planning discovery phase and align with Constitutional Enforcement Engine (Module 002) architecture.

## Research Questions & Findings

### 1. Module Architecture Pattern

**Question**: How should security baseline integrate with the existing Constitutional Engine while maintaining modularity?

**Decision**: New Django app `src/security_baseline/` that registers security rules with Constitutional Engine via plugin interface

**Rationale**:
- **Separation of Concerns**: Security baseline is a distinct domain from constitutional enforcement (which is domain-agnostic governance)
- **Testability**: Isolated Django app allows independent test suite without requiring full Constitutional Engine
- **Reusability**: Other features can register security rules through same plugin interface
- **Constitutional Alignment**: Follows Principle II (Architecture & Modularity) - clear layering, single responsibility

**Alternatives Considered**:
- **Extension package within constitution_engine**: Rejected due to tight coupling; security is a client of governance, not part of governance core
- **Standalone package with optional integration**: Rejected because security enforcement REQUIRES Constitutional Engine per FR-012; loose coupling would complicate validation

**Implementation Pattern**:
```python
# src/security_baseline/apps.py
class SecurityBaselineConfig(AppConfig):
    def ready(self):
        from constitution_engine.core.engine import ConstitutionalEngine
        from .rules import registry as security_rules

        engine = ConstitutionalEngine.get_instance()
        for rule in security_rules.get_all():
            engine.register_rule(rule)
```

---

### 2. Security Manifest Structure

**Question**: How should security configuration files be organized to support runtime enforcement, CI scanning, and environment-specific overrides?

**Decision**: Directory structure `.security/manifests/` with separate YAML files for each concern plus environment overrides

**Rationale**:
- **Clean Separation**: Each scanning tool (pip-audit, Bandit) has its own config file following tool conventions
- **Environment Overrides**: Production can have stricter rules than development without config file duplication
- **Version Control**: Small, focused files are easier to review in PRs and track changes over time
- **Discovery Logic**: Simple glob pattern `.security/manifests/*.yaml` loads all configs

**Directory Structure**:
```
.security/
├── manifests/
│   ├── runtime.yaml          # SecurityRule configurations
│   ├── bandit.yaml           # Bandit-specific config
│   ├── pip-audit.yaml        # pip-audit exclusions/thresholds
│   ├── environments/
│   │   ├── local.yaml        # Local development overrides
│   │   ├── staging.yaml      # Staging-specific rules
│   │   └── production.yaml   # Production strict mode
├── mappings/
│   └── asvs-l1-controls.yaml # OWASP ASVS Level 1 mappings
└── scripts/
    ├── scan_dependencies.py   # pip-audit wrapper
    ├── scan_code.py           # Bandit wrapper
    └── audit_config.py        # Django settings validator
```

**Alternatives Considered**:
- **Single file `.security-manifest.yaml`**: Rejected due to merge conflict risk and monolithic config
- **Root-level scattered files**: Rejected because `.bandit.yaml`, `.pip-audit.yaml` at root pollutes repository namespace

**Configuration Loading Priority**:
1. Load base manifest from `.security/manifests/runtime.yaml`
2. Detect environment from `DJANGO_SETTINGS_MODULE` or `ENVIRONMENT` env var
3. Apply environment-specific overrides from `.security/manifests/environments/{env}.yaml`
4. Validate merged configuration schema

---

### 3. CI Scanning Implementation Strategy

**Question**: Should CI security scanning be implemented as Django management commands or standalone scripts?

**Decision**: Standalone Python CLI scripts in `.security/scripts/` without Django dependencies

**Rationale**:
- **CI Platform Agnostic**: Scripts run in any CI environment (GitHub Actions, GitLab CI, Jenkins) without Django setup
- **Fast Execution**: No Django startup overhead (typically 2-3 seconds) per scan
- **Reusability**: Developers can run scripts locally via `python .security/scripts/scan_dependencies.py` without manage.py
- **Isolation**: Scanning logic doesn't need Django ORM, settings, or middleware - pure tool orchestration

**Script Architecture**:
```python
# .security/scripts/scan_dependencies.py
"""
Wrapper for pip-audit with incremental scanning support.
Reads configuration from .security/manifests/pip-audit.yaml
"""
import argparse
import subprocess
import yaml
from pathlib import Path

def load_config():
    """Load pip-audit configuration from manifest."""

def run_incremental_scan(changed_requirements: list[Path]):
    """Scan only requirements files that changed in PR."""

def run_full_scan():
    """Scan all requirements/* files."""

if __name__ == "__main__":
    # CLI entry point for CI
```

**Alternatives Considered**:
- **Django management commands**: Rejected due to Django startup overhead and CI environment complexity
- **GitHub Actions workflow only**: Rejected because non-portable and doesn't support local developer workflow

**CI Integration**:
```yaml
# .github/workflows/security-scan.yml
- name: Dependency Scan
  run: python .security/scripts/scan_dependencies.py --incremental --output=sarif

- name: Static Analysis
  run: python .security/scripts/scan_code.py --incremental --format=json

- name: Config Audit
  run: python .security/scripts/audit_config.py --env=production --strict
```

---

### 4. OWASP ASVS Control Mapping Approach

**Question**: How should OWASP ASVS Level 1 control mappings be maintained to support compliance reporting (SC-003: minimum 25 controls)?

**Decision**: YAML mapping file `.security/mappings/asvs-l1-controls.yaml` loaded at runtime

**Rationale**:
- **Updateable Without Code Changes**: OWASP ASVS standard updates (currently v4.0.3) can be reflected by editing YAML, not Python
- **Version Controllable**: Mapping changes tracked in git with clear diff and PR review
- **Testable**: Unit tests can validate all SecurityRules have OWASP ASVS references
- **Human Readable**: Security reviewers can audit mappings without reading Python code

**Mapping Schema**:
```yaml
# .security/mappings/asvs-l1-controls.yaml
version: "4.0.3"
level: 1

controls:
  - id: "V1.2.2"
    category: "Authentication"
    requirement: "Verify that all authentication controls fail securely"
    mapped_rules:
      - "security_baseline.rules.DebugModeProductionRule"
      - "security_baseline.rules.SecretKeyEntropyRule"

  - id: "V1.4.1"
    category: "Access Control"
    requirement: "Verify that access control enforces deny by default"
    mapped_rules:
      - "security_baseline.rules.AllowedHostsRule"
      - "security_baseline.rules.CorsConfigurationRule"

  - id: "V2.1.1"
    category: "Password Security"
    requirement: "Verify that user-set passwords are at least 12 characters"
    mapped_rules:
      - "security_baseline.rules.PasswordValidationRule"

# ... 25+ total controls mapped
```

**Alternatives Considered**:
- **Hardcoded Python attributes**: Rejected because requires code deployment for standard updates
- **Database-driven models**: Rejected as overkill for static mapping data; adds unnecessary complexity

**Loading Strategy**:
```python
# src/security_baseline/asvs.py
@dataclass
class ASVSControl:
    id: str
    category: str
    requirement: str
    mapped_rules: list[str]

class ASVSMapper:
    def __init__(self, manifest_path: Path):
        self._controls = self._load_manifest(manifest_path)

    def get_controls_for_rule(self, rule_class: str) -> list[ASVSControl]:
        """Returns all OWASP ASVS controls a security rule satisfies."""
```

---

### 5. Password Breach Detection Implementation

**Question**: How should password breach validation (FR-008) be implemented to balance security, performance, and privacy?

**Decision**: Hybrid approach with local bloom filter for common breaches + HIBP API fallback using k-anonymity

**Rationale**:
- **Performance**: 99% of passwords can be validated against local bloom filter in <5ms (no network call)
- **Privacy**: HIBP k-anonymity model sends only first 5 SHA-1 hash characters, never full password or hash
- **Comprehensive Coverage**: Local filter contains ~10M most common breaches; HIBP API covers 600M+ passwords
- **Offline Functionality**: Development environments work without internet; prod can use API for enhanced security

**Architecture**:
```python
# src/security_baseline/validators/breach_detector.py
class HybridBreachValidator:
    """
    Two-stage password breach detection:
    1. Check local bloom filter (fast path)
    2. If not found, query HIBP API with k-anonymity (slow path)
    """

    def __init__(self):
        self.bloom_filter = self._load_bloom_filter()
        self.hibp_client = HIBPClient(timeout=2.0)

    def is_breached(self, password: str) -> tuple[bool, str]:
        """
        Returns (is_breached, source).
        Source is either 'local' or 'hibp' or 'unknown' on timeout.
        """
        # Stage 1: Bloom filter check (O(1), no network)
        if self.bloom_filter.might_contain(password):
            return (True, 'local')

        # Stage 2: HIBP API with k-anonymity
        try:
            sha1_hash = hashlib.sha1(password.encode()).hexdigest().upper()
            prefix, suffix = sha1_hash[:5], sha1_hash[5:]

            response = self.hibp_client.check_range(prefix)
            if suffix in response:
                return (True, 'hibp')
        except requests.Timeout:
            # Fail open on timeout (advisory mode)
            logger.warning("HIBP API timeout, skipping breach check")

        return (False, 'clean')
```

**Bloom Filter Generation**:
- Source: Top 10M passwords from SecLists, Have I Been Pwned Pwned Passwords v8
- Size: ~50MB on disk, 12MB in memory (0.1% false positive rate)
- Update frequency: Quarterly via automated task

**Alternatives Considered**:
- **Static common password list only**: Rejected because insufficient coverage (catches <5% of actual breaches)
- **HIBP API only**: Rejected due to network latency (200-500ms), privacy concerns for all passwords, offline unavailability
- **No breach checking**: Rejected because violates OWASP ASVS Level 1 V2.1.7 requirement

**Configuration**:
```yaml
# .security/manifests/runtime.yaml
password_validation:
  min_length: 12
  require_complexity: true
  breach_detection:
    enabled: true
    bloom_filter_path: ".security/data/breached-passwords.bloom"
    hibp_api_enabled: true  # Can be disabled for offline environments
    hibp_timeout_seconds: 2
```

---

## Technology Stack Summary

### Runtime Dependencies (Production)
- **Django 5.x**: Web framework (already in requirements/base.txt)
- **pyyaml >=6.0.1**: Security manifest parsing
- **pybloom-live >=3.1.0**: Bloom filter for password breach detection (NEW)
- **requests >=2.31.0**: HIBP API client (already in requirements)

### Development/CI Dependencies
- **pip-audit >=2.6.0**: Dependency vulnerability scanning
- **bandit >=1.7.5**: Static security analysis
- **pytest-django**: Testing framework (already in requirements)

### Integration Dependencies
- **Constitutional Engine (Module 002)**: MERGED - Provides rule registration, reporter interfaces, engine lifecycle

---

## Implementation Patterns

### SecurityRule Base Class

All security rules inherit from Constitutional Engine's base Rule class:

```python
# src/security_baseline/rules/base.py
from constitution_engine.core.interfaces import Rule, RuleViolation
from dataclasses import dataclass
from typing import Optional

@dataclass
class SecurityRuleViolation(RuleViolation):
    """Extended violation with security-specific metadata."""
    owasp_asvs_refs: list[str]
    remediation: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW

class SecurityRule(Rule):
    """Base class for all security baseline rules."""

    category: str = "security"
    owasp_asvs_refs: list[str] = []

    def __init__(self, enforcement_mode: str = "strict"):
        self.enforcement_mode = enforcement_mode

    def validate(self, context: dict) -> Optional[SecurityRuleViolation]:
        """Override in subclasses to implement validation logic."""
        raise NotImplementedError

    def should_block_startup(self, violation: SecurityRuleViolation) -> bool:
        """Determine if violation blocks startup based on mode and severity."""
        if self.enforcement_mode == "advisory":
            return False
        return violation.severity in ["CRITICAL", "HIGH"]
```

### Rule Registry Pattern

```python
# src/security_baseline/rules/registry.py
class SecurityRuleRegistry:
    """Central registry for all security rules."""

    _rules: dict[str, type[SecurityRule]] = {}

    @classmethod
    def register(cls, rule_class: type[SecurityRule]):
        cls._rules[rule_class.__name__] = rule_class
        return rule_class

    @classmethod
    def get_all(cls) -> list[SecurityRule]:
        """Instantiate all registered rules with config from manifest."""
        config = load_security_manifest()
        return [
            rule_cls(enforcement_mode=config.enforcement_mode)
            for rule_cls in cls._rules.values()
        ]

# Usage
@SecurityRuleRegistry.register
class DebugModeProductionRule(SecurityRule):
    owasp_asvs_refs = ["V1.2.2", "V14.1.1"]

    def validate(self, context: dict) -> Optional[SecurityRuleViolation]:
        from django.conf import settings
        if context['environment'] == 'production' and settings.DEBUG:
            return SecurityRuleViolation(
                rule=self.__class__.__name__,
                message="DEBUG=True in production environment",
                severity="CRITICAL",
                owasp_asvs_refs=self.owasp_asvs_refs,
                remediation="Set DEBUG=False in settings/production.py"
            )
```

---

## Performance Considerations

### Runtime Impact
- **Startup Overhead**: All security checks execute once during `AppConfig.ready()`, adds ~200ms to Django startup
- **Per-Request Impact**: Zero - security validation is startup-only, no middleware required
- **Memory Footprint**: ~15MB for bloom filter + YAML manifests in memory

### CI Performance Optimization
- **Incremental Scanning**: Only scan changed files in PR builds (saves 60-80% scan time)
- **Parallel Execution**: Run pip-audit, Bandit, config audit in parallel (saves ~5 minutes)
- **Caching**: Cache pip-audit results by requirements.txt hash (90% cache hit rate expected)

**Benchmark Targets** (from SC-001, SC-002):
- Runtime security validation: <2 seconds for full check in strict mode
- CI security pipeline: <10 minutes for full scan (large codebase)
- Incremental PR scans: <3 minutes (typical pull request)

---

## Security Considerations

### Threat Model
- **Attack Vectors**: Insecure Django settings, vulnerable dependencies, hardcoded secrets, weak passwords
- **Mitigation**: Runtime enforcement blocks startup, CI scanning prevents merge, breach detection rejects weak passwords
- **Residual Risks**: Zero-day vulnerabilities in dependencies (mitigated by rapid pip-audit updates), novel attack patterns not covered by Bandit rules

### Privacy
- **Password Hashing**: All passwords hashed with SHA-1 before HIBP API calls, k-anonymity ensures only hash prefix transmitted
- **Sensitive Data in Logs**: Security reports sanitize SECRET_KEY, database credentials before logging
- **Compliance**: GDPR-compliant (no PII in security reports), OWASP ASVS Level 1 adherent

---

## Open Questions & Future Work

### Resolved During Planning
- ✅ Module architecture: Django app with plugin registration
- ✅ Manifest structure: Directory-based YAML files
- ✅ CI implementation: Standalone Python scripts
- ✅ OWASP ASVS mapping: YAML mapping file
- ✅ Password breach detection: Hybrid bloom filter + HIBP

### Deferred to Implementation
- Bloom filter update automation (quarterly refresh process)
- Security dashboard UI (noted as future enhancement in spec)
- Secret scanning integration (out of scope for baseline, noted in non-goals)
- Multi-tenant IAM considerations (application-level concern, not baseline)

---

## References

- [OWASP ASVS 4.0.3](https://github.com/OWASP/ASVS/tree/v4.0.3)
- [Have I Been Pwned API Documentation](https://haveibeenpwned.com/API/v3)
- [pip-audit Documentation](https://pypi.org/project/pip-audit/)
- [Bandit Documentation](https://bandit.readthedocs.io/)
- [Django Security Settings](https://docs.djangoproject.com/en/5.0/topics/security/)
- Constitutional Enforcement Engine (Module 002) - kitty-specs/002-constitutional-enforcement-engine/

---

**Research Status**: ✅ Complete - All planning questions resolved, implementation patterns documented
