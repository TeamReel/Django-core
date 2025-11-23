# Data Model: Core Security Baseline

**Feature**: 003-core-security-baseline
**Date**: 2025-11-22
**Status**: Draft

## Overview

This document defines the data structures for the Core Security Baseline feature. Since this is primarily a validation and enforcement feature (not a data-centric feature), most entities are runtime objects (not Django models) that represent security state, violations, and reports.

## Core Entities

### 1. SecurityRule

**Purpose**: Represents a single security validation check (e.g., "DEBUG must be False in production")

**Type**: Python class (not Django model - no database persistence needed)

**Attributes**:
- `rule_id`: str - Unique identifier (e.g., "SEC001-DEBUG-MODE")
- `name`: str - Human-readable name (e.g., "Debug Mode Production Check")
- `category`: str - Rule category (e.g., "django_settings", "session_security", "csrf_protection")
- `severity`: str - CRITICAL | HIGH | MEDIUM | LOW
- `owasp_asvs_refs`: list[str] - OWASP ASVS control IDs (e.g., ["V1.2.2", "V14.1.1"])
- `description`: str - What the rule validates
- `remediation`: str - How to fix violations
- `enforcement_mode`: str - "strict" | "advisory"
- `enabled`: bool - Whether rule is active

**Validation Logic**:
- Each SecurityRule subclass implements `validate(context: dict) -> Optional[SecurityRuleViolation]`
- Context includes: environment, Django settings, current configuration
- Returns None if validation passes, SecurityRuleViolation if fails

**Relationships**:
- Has many `SecurityRuleViolation` (one-to-many, runtime only)
- Maps to many `ASVSControl` (many-to-many via YAML mapping file)

**Lifecycle**:
1. Instantiated from `.security/manifests/runtime.yaml` during AppConfig.ready()
2. Registered with Constitutional Engine
3. Executed once at startup
4. Results captured in SecurityReport

**Example**:
```python
@SecurityRuleRegistry.register
class DebugModeProductionRule(SecurityRule):
    rule_id = "SEC001-DEBUG-MODE"
    name = "Debug Mode Production Check"
    category = "django_settings"
    severity = "CRITICAL"
    owasp_asvs_refs = ["V1.2.2", "V14.1.1"]
    description = "Ensures DEBUG=False in production"
    remediation = "Set DEBUG=False in settings/production.py"

    def validate(self, context: dict) -> Optional[SecurityRuleViolation]:
        if context['environment'] == 'production' and settings.DEBUG:
            return SecurityRuleViolation(...)
```

---

### 2. SecurityRuleViolation

**Purpose**: Captured when a SecurityRule validation fails

**Type**: Python dataclass (not Django model - transient object)

**Attributes**:
- `rule_id`: str - Reference to SecurityRule that was violated
- `rule_name`: str - Human-readable rule name
- `message`: str - Specific violation message (e.g., "DEBUG=True detected in production environment")
- `severity`: str - CRITICAL | HIGH | MEDIUM | LOW
- `violated_setting`: str - Django setting name that caused violation (e.g., "DEBUG")
- `current_value`: Any - Current (invalid) value
- `expected_value`: Any - Expected (valid) value
- `owasp_asvs_refs`: list[str] - OWASP ASVS controls this violation impacts
- `remediation`: str - Step-by-step fix instructions
- `timestamp`: datetime - When violation was detected
- `environment`: str - Environment where violation occurred (local/staging/production)

**Relationships**:
- Belongs to one `SecurityRule` (many-to-one, runtime reference)
- Included in one `SecurityReport` (many-to-one, runtime aggregation)

**Serialization**:
```json
{
  "rule_id": "SEC001-DEBUG-MODE",
  "rule_name": "Debug Mode Production Check",
  "message": "DEBUG=True detected in production environment",
  "severity": "CRITICAL",
  "violated_setting": "DEBUG",
  "current_value": true,
  "expected_value": false,
  "owasp_asvs_refs": ["V1.2.2", "V14.1.1"],
  "remediation": "Set DEBUG=False in config/settings/production.py",
  "timestamp": "2025-11-22T10:30:45.123Z",
  "environment": "production"
}
```

---

### 3. SecurityReport

**Purpose**: Aggregated output of all security checks (runtime or CI)

**Type**: Python dataclass with JSON/YAML serialization

**Attributes**:
- `report_id`: str - Unique identifier (UUID)
- `report_type`: str - "runtime_startup" | "ci_dependency_scan" | "ci_static_analysis" | "ci_config_audit"
- `timestamp`: datetime - When report was generated
- `environment`: str - Environment context (local/staging/production)
- `enforcement_mode`: str - "strict" | "advisory"
- `violations`: list[SecurityRuleViolation] - All detected violations
- `passed_rules`: list[str] - Rule IDs that passed validation
- `overall_status`: str - "PASS" | "FAIL" | "WARNING"
- `owasp_asvs_coverage`: dict - Coverage statistics by ASVS category
- `execution_time_ms`: int - How long security checks took
- `metadata`: dict - Additional context (git commit, branch, CI job ID)

**Derived Properties**:
- `critical_count`: int - Number of CRITICAL severity violations
- `high_count`: int - Number of HIGH severity violations
- `should_block_deployment`: bool - True if strict mode and critical/high violations present

**Relationships**:
- Contains many `SecurityRuleViolation` (one-to-many, aggregation)
- References many `ASVSControl` (many-to-many via owasp_asvs_coverage)

**Storage**:
- Runtime reports: Logged to structured logging, stored in observability platform
- CI reports: Saved as build artifacts (JSON/SARIF format)
- Historical reports: Optional storage in S3/blob storage for trend analysis (future enhancement)

**Serialization**:
```yaml
report_id: "550e8400-e29b-41d4-a716-446655440000"
report_type: "runtime_startup"
timestamp: "2025-11-22T10:30:45.123Z"
environment: "production"
enforcement_mode: "strict"
overall_status: "FAIL"
execution_time_ms: 187

violations:
  - rule_id: "SEC001-DEBUG-MODE"
    severity: "CRITICAL"
    message: "DEBUG=True detected in production environment"
    # ... full SecurityRuleViolation details

passed_rules:
  - "SEC002-SECRET-KEY"
  - "SEC003-ALLOWED-HOSTS"
  - "SEC004-SESSION-SECURITY"

owasp_asvs_coverage:
  V1_Authentication: 8  # 8 controls validated
  V2_Session_Management: 5
  V3_Access_Control: 3
  total_controls_checked: 26
  level_1_coverage_percent: 104  # 26/25 minimum

metadata:
  git_commit: "cd1f0dd"
  branch: "003-core-security-baseline"
  django_version: "5.0.1"
  python_version: "3.12.0"
```

---

### 4. SecurityManifest

**Purpose**: Declarative configuration for security policies (runtime and CI)

**Type**: YAML/JSON file (loaded into Python dataclass at runtime)

**File Location**: `.security/manifests/runtime.yaml`

**Schema**:
```yaml
version: "1.0"
enforcement_mode: "strict"  # strict | advisory

rules:
  - rule_id: "SEC001-DEBUG-MODE"
    enabled: true
    severity: "CRITICAL"
    environments: ["production", "staging"]  # Only check in these envs

  - rule_id: "SEC002-SECRET-KEY"
    enabled: true
    severity: "CRITICAL"
    min_entropy: 50  # Rule-specific configuration

  - rule_id: "SEC003-ALLOWED-HOSTS"
    enabled: true
    severity: "HIGH"
    exemptions:
      - host: "localhost"
        reason: "Local development exception"
        approved_by: "security-team"
        expires: "2026-01-01"

password_validation:
  min_length: 12
  require_uppercase: true
  require_lowercase: true
  require_digits: true
  require_special_chars: true
  breach_detection:
    enabled: true
    bloom_filter_path: ".security/data/breached-passwords.bloom"
    hibp_api_enabled: true
    hibp_timeout_seconds: 2

security_headers:
  hsts_seconds: 31536000  # 1 year
  content_security_policy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  x_frame_options: "DENY"
  x_content_type_options: "nosniff"

session_security:
  cookie_secure: true
  cookie_httponly: true
  cookie_samesite: "Strict"
  session_age_seconds: 3600
```

**Python Representation**:
```python
@dataclass
class SecurityManifest:
    version: str
    enforcement_mode: str
    rules: list[RuleConfig]
    password_validation: PasswordConfig
    security_headers: SecurityHeadersConfig
    session_security: SessionSecurityConfig

    @classmethod
    def load(cls, manifest_path: Path, environment: str) -> "SecurityManifest":
        """Load base manifest and apply environment-specific overrides."""
```

---

### 5. EnvironmentProfile

**Purpose**: Security configuration profile per environment

**Type**: YAML file (`.security/manifests/environments/{env}.yaml`)

**Attributes**:
- `environment`: str - Environment name (local/staging/production)
- `enforcement_mode`: str - Overrides base manifest enforcement mode
- `enabled_rules`: list[str] - Rule IDs to enable (overrides base)
- `disabled_rules`: list[str] - Rule IDs to disable
- `severity_overrides`: dict - Rule ID -> new severity level
- `custom_thresholds`: dict - Environment-specific threshold values

**Example - Production Profile**:
```yaml
# .security/manifests/environments/production.yaml
environment: "production"
enforcement_mode: "strict"  # Override advisory mode if set in base

# Enable all rules in production
enabled_rules: "*"

severity_overrides:
  SEC005-CSRF-PROTECTION: "CRITICAL"  # Upgrade from HIGH to CRITICAL

custom_thresholds:
  max_session_age_seconds: 1800  # 30 minutes in prod (stricter than base)
  password_min_length: 16  # Require longer passwords in prod
```

**Example - Local Development Profile**:
```yaml
# .security/manifests/environments/local.yaml
environment: "local"
enforcement_mode: "advisory"  # Don't block startup in dev

disabled_rules:
  - "SEC001-DEBUG-MODE"  # Allow DEBUG=True locally
  - "SEC009-SSL-REDIRECT"  # No HTTPS in local development
  - "SEC010-DATABASE-SSL"  # Local database doesn't use SSL

custom_thresholds:
  max_session_age_seconds: 86400  # 24 hours in dev (more convenient)
```

---

### 6. ASVSControl

**Purpose**: Represents an OWASP ASVS Level 1 control

**Type**: Python dataclass (loaded from `.security/mappings/asvs-l1-controls.yaml`)

**Attributes**:
- `control_id`: str - OWASP ASVS identifier (e.g., "V1.2.2")
- `category`: str - OWASP category (e.g., "Authentication", "Session Management")
- `requirement`: str - Control requirement description
- `level`: int - ASVS level (1, 2, or 3) - this feature focuses on Level 1
- `mapped_rules`: list[str] - SecurityRule IDs that satisfy this control

**Relationships**:
- Maps to many `SecurityRule` (many-to-many via YAML configuration)
- Included in `SecurityReport.owasp_asvs_coverage` statistics

**YAML Schema**:
```yaml
# .security/mappings/asvs-l1-controls.yaml
version: "4.0.3"
level: 1

controls:
  - control_id: "V1.2.2"
    category: "Architecture, Design and Threat Modeling"
    requirement: "Verify that all authentication controls fail securely"
    mapped_rules:
      - "SEC001-DEBUG-MODE"
      - "SEC002-SECRET-KEY"
      - "SEC003-ALLOWED-HOSTS"

  - control_id: "V2.1.1"
    category: "Password Security"
    requirement: "Verify that user set passwords are at least 12 characters"
    mapped_rules:
      - "SEC008-PASSWORD-VALIDATION"

  # ... 25+ total Level 1 controls
```

---

## CI Scanning Entities

### 7. DependencyVulnerability

**Purpose**: Represents a vulnerable dependency detected by pip-audit

**Type**: Python dataclass (parsed from pip-audit JSON output)

**Attributes**:
- `package_name`: str - Vulnerable package (e.g., "django")
- `installed_version`: str - Currently installed version (e.g., "4.2.0")
- `vulnerability_id`: str - CVE or GHSA identifier (e.g., "CVE-2023-12345")
- `severity`: str - CRITICAL | HIGH | MEDIUM | LOW
- `description`: str - Vulnerability description
- `fixed_versions`: list[str] - Versions that fix the vulnerability
- `advisory_url`: str - Link to security advisory

**Source**: pip-audit scan results

---

### 8. CodeSecurityFinding

**Purpose**: Represents insecure code pattern detected by Bandit

**Type**: Python dataclass (parsed from Bandit JSON output)

**Attributes**:
- `finding_id`: str - Bandit test ID (e.g., "B105")
- `filename`: str - File containing issue
- `line_number`: int - Line number of issue
- `severity`: str - HIGH | MEDIUM | LOW
- `confidence`: str - HIGH | MEDIUM | LOW
- `issue_text`: str - Description of security issue
- `code_snippet`: str - Actual code that triggered finding
- `cwe_id`: str - Common Weakness Enumeration ID (e.g., "CWE-259")

**Source**: Bandit scan results

---

## Relationships Diagram

```
SecurityManifest (YAML)
    │
    ├──> loads configuration for ──> SecurityRule (Python class)
    │                                     │
    │                                     │ validates settings
    │                                     │
    │                                     ├──> produces ──> SecurityRuleViolation (dataclass)
    │                                     │                        │
    │                                     │                        │
    EnvironmentProfile (YAML)             │                        │
         │                                │                        │
         └──> overrides config for ───────┘                        │
                                                                   │
ASVSControl (YAML)                                                 │
    │                                                              │
    └──> maps to ──> SecurityRule                                 │
                                                                   │
                                                                   │
                                    SecurityReport (dataclass)     │
                                         │                         │
                                         └──> aggregates ──────────┘
                                         │
                                         └──> includes ──> OWASP ASVS Coverage (dict)


CI Scanning Artifacts:

pip-audit (external tool)
    │
    └──> produces ──> DependencyVulnerability (dataclass)
                             │
                             └──> included in ──> SecurityReport (CI variant)

Bandit (external tool)
    │
    └──> produces ──> CodeSecurityFinding (dataclass)
                             │
                             └──> included in ──> SecurityReport (CI variant)
```

---

## State Transitions

### SecurityRule Lifecycle

```
[Defined in code]
       │
       ├──> [Loaded from manifest] (AppConfig.ready())
       │
       ├──> [Registered with Constitutional Engine]
       │
       ├──> [Executed once at startup]
       │
       ├──> [Validation Result]
       │         │
       │         ├──> PASS: No violations
       │         │
       │         └──> FAIL: SecurityRuleViolation created
       │                      │
       │                      ├──> Advisory Mode: Log warning, allow startup
       │                      │
       │                      └──> Strict Mode: Block startup if CRITICAL/HIGH
       │
       └──> [Included in SecurityReport]
```

### SecurityReport Lifecycle

```
[Security checks execute]
       │
       ├──> [Collect all SecurityRuleViolation instances]
       │
       ├──> [Calculate OWASP ASVS coverage statistics]
       │
       ├──> [Generate SecurityReport dataclass]
       │
       ├──> [Serialize to JSON/YAML]
       │
       ├──> [Output Destinations]
       │         │
       │         ├──> Structured logs (stdout)
       │         ├──> CI artifact storage
       │         ├──> Observability platform (Datadog, New Relic)
       │         └──> Optional: S3/blob storage (historical trends)
       │
       └──> [Determine deployment decision]
                 │
                 ├──> PASS: Allow deployment
                 └──> FAIL: Block deployment (if strict mode)
```

---

## Data Validation Rules

### SecurityRule Validation
- `rule_id` must be unique across all rules
- `severity` must be one of: CRITICAL, HIGH, MEDIUM, LOW
- `enforcement_mode` must be one of: strict, advisory
- `owasp_asvs_refs` must reference valid ASVS controls from mapping file
- `validate()` method must be implemented (abstract method enforcement)

### SecurityManifest Validation
- `version` must follow semver format (e.g., "1.0.0")
- All `rule_id` references must correspond to actual SecurityRule classes
- Environment overrides must not create conflicting configurations
- `enforcement_mode` must be valid (strict/advisory)

### SecurityReport Validation
- `overall_status` is derived: FAIL if any critical/high violations in strict mode, WARNING if violations in advisory mode, PASS otherwise
- `owasp_asvs_coverage` must map to controls defined in ASVS mapping file
- `should_block_deployment` derived from enforcement_mode + violation severities

---

## Storage & Persistence

### No Database Models Required

This feature does NOT use Django database models because:
- Security validation is stateless (no historical tracking needed in MVP)
- All configuration is file-based (YAML manifests)
- Reports are exported to external systems (structured logging, CI artifacts)
- No UI for managing security rules (file-based configuration preferred for security auditability)

### File-Based Storage

```
.security/
├── manifests/
│   ├── runtime.yaml              # SecurityManifest (base configuration)
│   ├── environments/
│   │   ├── local.yaml            # EnvironmentProfile (dev overrides)
│   │   ├── staging.yaml          # EnvironmentProfile (staging)
│   │   └── production.yaml       # EnvironmentProfile (prod strict mode)
├── mappings/
│   └── asvs-l1-controls.yaml     # ASVSControl definitions
└── data/
    └── breached-passwords.bloom   # Bloom filter (binary file, ~50MB)
```

### External Storage (CI Artifacts)

```
# GitHub Actions artifact structure
security-reports/
├── dependency-scan-{date}.json
├── static-analysis-{date}.sarif
├── config-audit-{date}.yaml
└── unified-security-report-{date}.json
```

---

## Indexing & Query Patterns

Since this feature is file-based, traditional database indexing doesn't apply. However, efficient lookup patterns are needed:

### Rule Lookup by ID
```python
# O(1) lookup via dictionary
rule_registry: dict[str, SecurityRule] = {
    rule.rule_id: rule for rule in all_rules
}
```

### ASVS Control Lookup
```python
# O(1) lookup via dictionary built from YAML
asvs_controls: dict[str, ASVSControl] = {
    control.control_id: control for control in load_asvs_controls()
}
```

### Violations by Severity
```python
# Filter violations in memory (negligible performance impact, <100 rules)
critical_violations = [v for v in violations if v.severity == "CRITICAL"]
```

---

## Future Enhancements (Out of Scope for MVP)

- **Historical Trend Analysis**: Store SecurityReports in time-series database for trend tracking
- **Django Admin UI**: Web interface for managing SecurityManifest (currently file-based only)
- **Real-time Monitoring**: Continuous security validation post-startup (currently startup-only)
- **Custom Rule DSL**: Domain-specific language for defining security rules without Python code

---

**Data Model Status**: ✅ Complete - All entities defined with attributes, relationships, and validation rules
