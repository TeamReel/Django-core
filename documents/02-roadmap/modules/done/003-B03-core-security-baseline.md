# B03: Core Security Baseline

**Phase:** 1
**Status:** ✅ Done
**Module ID:** 003
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 3. B03 – Core Security Baseline

**Doel**: Security hardening: settings, headers, brute-force protection, CI security scanning.

**Status**: ✅ Complete

**Key Features**:
- OWASP security headers
- Brute-force protection (rate limiting)
- Security settings baseline
- Dependency scanning (pip-audit)
- Static analysis (bandit)

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Core Security Baseline
*Path: kitty-specs/003-core-security-baseline/spec.md*

**Feature Branch**: `003-core-security-baseline`
**Created**: 2025-11-22
**Status**: Draft
**Category**: Platform/Critical Feature

## Overview

The Core Security Baseline establishes comprehensive security enforcement for Django Core-App through two integrated pillars:

1. **Runtime Security Enforcement**: Hardened Django defaults for sessions, CSRF, cookies, security headers, and password validation
2. **CI Security Scanning**: Automated dependency vulnerability scanning, static security analysis, and configuration auditing

This feature extends the Constitutional Enforcement Engine (Module 002) with security-specific rules and reporters, ensuring security governance is integral to the platform's constitution. It provides both strict enforcement (blocks startup on critical violations) and advisory modes (logs warnings) through configuration flags.

**Alignment with Platform Goals**:
- **Product-Agnostic**: Generic security baseline reusable across all downstream SaaS products
- **OWASP ASVS Compliant**: Follows industry-standard Application Security Verification Standard
- **CI-Driven**: Catches vulnerabilities and misconfigurations before production deployment
- **Constitution-Integrated**: Security rules enforced through existing governance framework

## Clarifications

### Session 2025-11-22

- Q: How should security rules integrate with the Constitutional Engine's runtime lifecycle? → A: Security rules execute during Django AppConfig.ready() as synchronous validators that block startup if violations found
- Q: Which dependency vulnerability scanner should be used for CI scanning? → A: pip-audit (Python Packaging Authority official tool, faster, GitHub Advisory Database)
- Q: What are the specific password validation requirements that FR-008 should enforce? → A: Enhanced (min 12 chars, complexity rules, breach database, similarity)
- Q: How should FR-010 validate that database connections use SSL/TLS in production? → A: Check Django DATABASES['OPTIONS'] contains ssl-related keys (sslmode, ssl_ca, etc.)
- Q: For CI security scanning performance (SC-002: 10-minute target), how should scans execute when repository grows large? → A: Incremental scanning (only changed files/dependencies) with periodic full scans

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure-by-Default Django Deployment (Priority: P1)

As a **DevOps Engineer**, I need the Django application to start with secure defaults enforced automatically, so that I don't accidentally deploy with insecure configurations like `DEBUG=True` or missing security headers.

**Why this priority**: This is the foundation - prevents critical production vulnerabilities that are common attack vectors (OWASP Top 10). Without this, all other security measures are undermined.

**Independent Test**: Can be fully tested by starting Django with various settings configurations (DEBUG=True in prod, missing SECRET_KEY, etc.) and verifying the application blocks startup in strict mode or logs warnings in advisory mode.

**Acceptance Scenarios**:

1. **Given** Django is configured for production with `DEBUG=True`, **When** application starts in strict mode, **Then** startup fails with clear error message indicating DEBUG must be False
2. **Given** Django settings lack `SECRET_KEY` or use default/weak value, **When** application starts, **Then** startup fails with security violation report
3. **Given** `ALLOWED_HOSTS` is set to `['*']` in production, **When** application starts, **Then** security warning is logged and startup blocked if strict mode enabled
4. **Given** Security headers (HSTS, CSP, X-Frame-Options) are not configured, **When** application starts, **Then** Constitutional Engine reports missing security controls
5. **Given** Session cookies lack `Secure` and `HttpOnly` flags in production, **When** application starts, **Then** security violation prevents startup in strict mode

---

### User Story 2 - Pre-Production Vulnerability Detection (Priority: P2)

As a **Developer**, I need CI pipelines to automatically scan for vulnerable dependencies and insecure code patterns before merge, so that security issues are caught early in the development lifecycle.

**Why this priority**: Proactive vulnerability detection in CI is more cost-effective than production incident response. Complements runtime enforcement by catching issues in code and dependencies.

**Independent Test**: Can be tested by introducing known vulnerable dependencies (e.g., Django<5.0 with CVEs) or insecure code patterns (hardcoded secrets, SQL injection risks) and verifying CI pipeline fails with detailed reports.

**Acceptance Scenarios**:

1. **Given** `requirements.txt` contains dependencies with known CVEs, **When** CI pipeline runs dependency scan, **Then** build fails with vulnerability report listing affected packages and severity
2. **Given** Python code contains insecure patterns (assert in security checks, hardcoded passwords, SQL string concatenation), **When** Bandit static analysis runs, **Then** CI fails with line-specific security findings
3. **Given** `settings/production.py` has `DEBUG=True` or `ALLOWED_HOSTS=['*']`, **When** configuration audit runs in CI, **Then** pipeline fails with configuration violation report
4. **Given** all dependencies are up-to-date and code passes Bandit checks, **When** CI security scan completes, **Then** pipeline passes and generates security audit artifact
5. **Given** security scan finds low-severity issues, **When** CI runs with advisory threshold configured, **Then** pipeline passes but logs warnings for review

---

### User Story 3 - Security Policy Configuration Flexibility (Priority: P3)

As a **Platform Maintainer**, I need to configure security enforcement modes (strict vs advisory) per environment, so that development workflows remain productive while production stays locked down.

**Why this priority**: Enables practical adoption - developers need flexibility to experiment locally, while production must enforce all rules strictly. This balance is critical for team adoption.

**Independent Test**: Can be tested by toggling `SECURITY_ENFORCEMENT_MODE` between `strict` and `advisory` and verifying behavior changes (startup blocking vs logging) for the same violations.

**Acceptance Scenarios**:

1. **Given** `SECURITY_ENFORCEMENT_MODE='advisory'` in local settings, **When** Django starts with DEBUG=True, **Then** application starts successfully but logs security warning
2. **Given** `SECURITY_ENFORCEMENT_MODE='strict'` in production settings, **When** Django starts with any security violation, **Then** startup is blocked and detailed report is generated
3. **Given** security rules are defined in YAML manifest, **When** manifest is updated with new rules, **Then** Constitutional Engine automatically loads and enforces updated rules without code changes
4. **Given** specific security checks are disabled via configuration, **When** application starts, **Then** only enabled checks are executed and reported
5. **Given** security violations occur in advisory mode, **When** violations are logged, **Then** structured logs include violation type, severity, and remediation guidance

---

### User Story 4 - Security Audit Trail and Reporting (Priority: P4)

As a **Security Reviewer**, I need comprehensive security audit reports from both runtime checks and CI scans, so that I can verify compliance with OWASP ASVS and internal security policies.

**Why this priority**: Provides visibility and compliance evidence. While not blocking functionality, it's essential for security governance and audit requirements.

**Independent Test**: Can be tested by triggering security checks and verifying that detailed JSON/YAML reports are generated with all required fields (timestamp, severity, affected components, remediation).

**Acceptance Scenarios**:

1. **Given** runtime security checks execute on startup, **When** checks complete, **Then** Constitutional Engine generates security report with all findings categorized by severity
2. **Given** CI security pipeline completes, **When** pipeline finishes, **Then** unified security artifact is published containing dependency scan, Bandit findings, and config audit results
3. **Given** security violations are detected, **When** reports are generated, **Then** each finding includes OWASP ASVS reference mapping and remediation guidance
4. **Given** security baseline checklist is executed, **When** checklist runs, **Then** pass/fail status is reported for each OWASP ASVS control with evidence links
5. **Given** multiple environments (dev/staging/prod) run security checks, **When** reports are aggregated, **Then** dashboard shows security posture across all environments

---

### Edge Cases

- **What happens when Constitutional Engine is unavailable at startup?**: Application should fail-safe (block startup) if engine cannot load security rules, preventing deployment without security enforcement
- **How does system handle partial security compliance?**: Advisory mode allows startup with warnings; strict mode categorizes violations by severity and blocks only on critical/high severity issues
- **What happens when dependency scanner times out in CI?**: CI pipeline should fail (fail-secure) rather than silently pass, with timeout configured per tool (default: 5 minutes for dependency scan)
- **How does system handle conflicting security rules?**: Constitutional Engine applies strictest rule when conflicts detected; validation step in CI prevents rule conflicts from being merged
- **What happens when security manifest is malformed?**: Application startup fails immediately with YAML/JSON parse error and points to specific line/issue in manifest
- **How does system handle security updates to Django framework itself?**: Dependency scanner flags Django CVEs; runtime checks include Django version validation against known vulnerable versions

## Requirements *(mandatory)*

### Functional Requirements

#### Runtime Security Enforcement

- **FR-001**: System MUST validate Django `DEBUG` setting is False in production environments and block startup in strict mode if True
- **FR-002**: System MUST enforce `SECRET_KEY` is present, non-default, and meets minimum entropy requirements (>50 characters, not Django default)
- **FR-003**: System MUST validate `ALLOWED_HOSTS` is explicitly configured (not `['*']`) in production and contains only valid hostnames/domains
- **FR-004**: System MUST enforce secure session configuration: `SESSION_COOKIE_SECURE=True`, `SESSION_COOKIE_HTTPONLY=True`, `SESSION_COOKIE_SAMESITE='Strict'` in production
- **FR-005**: System MUST enforce CSRF protection is enabled: `CSRF_COOKIE_SECURE=True`, `CSRF_COOKIE_HTTPONLY=True` in production, middleware included
- **FR-006**: System MUST configure security headers: `SECURE_HSTS_SECONDS` (min 31536000), `SECURE_CONTENT_TYPE_NOSNIFF=True`, `X_FRAME_OPTIONS='DENY'`, `SECURE_BROWSER_XSS_FILTER=True`
- **FR-007**: System MUST enforce Content Security Policy (CSP) headers with restrictive defaults (no unsafe-inline, no unsafe-eval)
- **FR-008**: System MUST validate password validation is configured with enhanced requirements: minimum 12 characters, complexity rules (mixed case, numbers, symbols), breach database checking, user attribute similarity validation
- **FR-009**: System MUST enforce secure SSL/TLS configuration: `SECURE_SSL_REDIRECT=True`, `SECURE_PROXY_SSL_HEADER` configured for load balancers
- **FR-010**: System MUST validate database connection uses SSL/TLS in production environments by checking DATABASES['OPTIONS'] contains SSL-related configuration keys (sslmode, ssl_ca, ssl_cert, ssl_key, or equivalent per database backend)
- **FR-011**: System MUST support two enforcement modes via `SECURITY_ENFORCEMENT_MODE` setting: `strict` (blocks startup) and `advisory` (logs warnings)
- **FR-012**: System MUST integrate with Constitutional Enforcement Engine as security-specific rules and reporters, executing during Django AppConfig.ready() lifecycle as synchronous validators

#### CI Security Scanning

- **FR-013**: System MUST perform dependency vulnerability scanning using pip-audit to detect packages with known CVEs from GitHub Advisory Database
- **FR-014**: System MUST execute static security analysis using Bandit to detect insecure code patterns (hardcoded passwords, SQL injection risks, weak cryptography), using incremental scanning for changed files in PR builds and full scans on main branch
- **FR-015**: System MUST audit Django configuration files to validate security settings match environment requirements (no DEBUG=True in production files)
- **FR-016**: System MUST fail CI pipeline when critical or high severity vulnerabilities are detected in dependency scan
- **FR-017**: System MUST fail CI pipeline when Bandit detects high or medium severity security issues
- **FR-018**: System MUST fail CI pipeline when configuration audit finds production security violations
- **FR-019**: System MUST generate unified security report artifact containing all scan results (dependencies, static analysis, config audit)
- **FR-020**: System MUST support configurable severity thresholds for CI failures (e.g., block on high/critical, warn on medium/low)
- **FR-021**: System MUST allow security rule exemptions through declarative YAML/JSON configuration with required justification comments
- **FR-022**: System MUST execute security scans within configurable timeout limits (default: 5 minutes per scan type), using incremental scanning strategy (changed files/dependencies only) for PR builds and full scans for main branch commits

#### Configuration & Reporting

- **FR-023**: System MUST load security policies from declarative YAML/JSON manifests for CI scanning tools (Bandit rules, dependency exclusions)
- **FR-024**: System MUST distribute runtime security settings across Django settings files (base/local/production) following environment-specific patterns
- **FR-025**: System MUST generate structured security reports (JSON/YAML) including violation type, severity, affected component, OWASP ASVS mapping, remediation guidance
- **FR-026**: System MUST provide security baseline checklist mapped to OWASP ASVS Level 1 controls with pass/fail status
- **FR-027**: System MUST log security violations using structured logging with severity levels (CRITICAL, ERROR, WARNING, INFO)
- **FR-028**: System MUST include timestamp, environment context, and correlation IDs in all security logs and reports

### Key Entities *(include if feature involves data)*

- **SecurityRule**: Represents individual security check (e.g., "DEBUG must be False in production") with severity, enforcement mode, OWASP ASVS reference, validation function
- **SecurityViolation**: Captured when rule check fails, contains rule reference, violated setting, current value, expected value, severity, remediation guidance
- **SecurityReport**: Aggregated output of all security checks (runtime or CI), contains timestamp, environment, list of violations, overall pass/fail status, OWASP ASVS coverage
- **SecurityManifest**: Declarative configuration for CI scanning tools, defines enabled rules, exemptions with justifications, severity thresholds, timeout settings
- **EnvironmentProfile**: Security configuration profile per environment (local/staging/production) defining enforcement mode, enabled rules, strictness levels

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Verification**: Core Security Baseline provides generic security enforcement applicable to any Django-based SaaS product. Security rules (DEBUG=False, secure cookies, CSRF, headers) are framework-level concerns with no business domain coupling. Security manifest allows product-specific rule adjustments through configuration, not code changes.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Verification**: Security rules integrate with Constitutional Engine (Module 002) as rule plugins, maintaining separation of concerns. CI scanning tools operate independently via CLI scripts. Runtime enforcement hooks into Django startup lifecycle through AppConfig.ready() as synchronous validators that block startup on violations in strict mode. No new dependencies on domain logic.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Verification**: All security rule implementations will use type hints (SecurityRule, SecurityViolation, SecurityReport dataclasses). CI scanning scripts follow Python 3.12+ syntax. Black/Ruff already configured in Module 001 will apply to all new code.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Verification**: Security rules will have unit tests (test_security_rules.py) validating each check independently. Integration tests will verify startup behavior in strict/advisory modes. CI scanning tests will use fixture projects with known vulnerabilities. Target: 80%+ coverage matching Module 002 standards.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Verification**: THIS IS THE SECURITY MODULE - enforces secure defaults as its primary function. Security reports will sanitize sensitive values (e.g., showing "SECRET_KEY present: True" not actual key value). Bandit scans will detect hardcoded secrets. All configuration via environment variables or encrypted config stores.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Verification**: Security checks execute once at startup (O(1) per request impact). CI scans use incremental strategy (only changed files/dependencies in PR builds) with periodic full scans on main branch, running in parallel with configurable timeouts. No database queries in security rule evaluation (setting validation only). Fail-safe behavior: if Constitutional Engine unavailable, strict mode blocks startup (prevents deployment without security).

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Verification**: No external APIs exposed by this module. Security reports follow consistent JSON schema (SecurityReport model). Internal CLI commands follow Django management command conventions. Constitutional Engine integration uses existing rule/reporter interfaces from Module 002.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Verification**: Documentation deliverables include: security-baseline.md (overview), howto/configuring-security-policies.md, security-checklist.md (OWASP ASVS mapping), CI integration guide. ADR will document pip-audit selection rationale (PyPA official tool, GitHub Advisory Database integration), strict vs advisory enforcement architecture.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Django application with all P1 security rules enabled can complete startup validation in under 2 seconds in strict mode with passing configuration
- **SC-002**: CI security pipeline (dependency scan + Bandit + config audit) completes in under 10 minutes for typical Django Core-App codebase
- **SC-003**: Security baseline achieves 100% coverage of OWASP ASVS Level 1 controls relevant to Django framework (minimum 25 controls mapped)
- **SC-004**: 90% of security violations detected by CI scanning are resolved before merge (measured by security findings trend over 30 days)
- **SC-005**: Zero production incidents related to insecure defaults (DEBUG=True, missing security headers, weak session config) after feature deployment
- **SC-006**: Security reports generated by Constitutional Engine include remediation guidance with average resolution time under 1 hour for high-severity findings
- **SC-007**: Developers can toggle between strict and advisory mode with single environment variable change, verified by integration tests covering both modes
- **SC-008**: All security rules implemented have corresponding tests with 80%+ coverage matching Module 002 quality standards
- **SC-009**: Security baseline documentation receives "clear and actionable" rating from 80% of internal developer survey respondents
- **SC-010**: CI security scanning produces zero false positives for high/critical severity findings (validated through manual security review of 100 scan runs)

### Definition of Done

**Minimum Viable Product (MVP)** - User Story 1 (P1) Complete:
- Runtime security checks for Django settings (DEBUG, SECRET_KEY, ALLOWED_HOSTS, sessions, CSRF, headers, passwords)
- Integration with Constitutional Engine (security rules + reporters)
- Strict and advisory enforcement modes functional
- Startup blocking on critical violations in strict mode
- Structured security report generation
- Unit tests with 80%+ coverage
- Basic documentation (security-baseline.md overview)

**Full Feature Complete** - All User Stories (P1-P4) Delivered:
- MVP + CI security scanning (pip-audit, Bandit, config audit)
- Declarative security manifest (YAML/JSON) support
- CI pipeline integration scripts and documentation
- Security baseline checklist with OWASP ASVS mapping
- Comprehensive audit reporting
- Complete documentation package (overview, HOWTO guides, checklist, ADR)
- Integration tests covering all enforcement scenarios
- Performance benchmarks validated (SC-001, SC-002)

### Dependencies

**Required (Blocking)**:
- Module 002 (Constitutional Enforcement Engine): MERGED - Security rules will extend engine's rule/reporter interfaces
- Django 5.x: Already in requirements/base.txt
- Python 3.12+: Already configured in pyproject.toml

**New Dependencies to Add**:
- `pip-audit>=2.6.0`: Dependency vulnerability scanning using GitHub Advisory Database (development, CI)
- `bandit>=1.7.5`: Python security static analysis (development, CI)
- `pyyaml>=6.0.1`: Security manifest parsing (production)

**Optional (Non-Blocking)**:
- Secret scanning tool integration (future enhancement, noted in non-goals)
- Security dashboard UI (future enhancement, out of scope for baseline)

### Assumptions

- **Django Settings Structure**: Assumes Django Core-App follows environment-specific settings pattern (base/local/production) established in Module 001
- **CI/CD Environment**: Assumes GitHub Actions or equivalent CI with ability to run Python CLI tools and publish artifacts
- **Load Balancer Configuration**: Assumes production deployment behind load balancer/reverse proxy supporting SSL termination (SECURE_PROXY_SSL_HEADER validation)
- **OWASP ASVS Scope**: Focuses on ASVS Level 1 controls relevant to Django framework; application-specific ASVS Level 2/3 controls are product responsibility
- **Secret Management**: Assumes environment variables or external secret manager (AWS Secrets Manager, HashiCorp Vault) for SECRET_KEY and credentials, not file-based storage
- **Developer Workflow**: Assumes developers can run security checks locally via management command before pushing to CI
- **Enforcement Mode Default**: Production environments default to strict mode unless explicitly configured otherwise
- **Scan Frequency**: CI security scans run on every pull request and main branch commit; scheduled scans (daily/weekly) are CI configuration concern, not feature requirement
