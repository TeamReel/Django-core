# Phase 17: Platform Quality Gates (274, 278-281)

**Focus**: Constitutional enforcement, security audit, ML governance, integration security, dependency validation

**Principe**: Gates zijn checkpoints, geen hele sprints. Focus op kritieke checks.

---

## [P01: Constitutional Enforcement Engine](../modules/backlog/278-P01-constitutional-enforcement-engine/index.md)

**Feature**: `P01-constitutional-enforcement-engine`

**Goal**: Automated governance engine dat constitution rules valideert tijdens development + CI.

**Package**: `@django-core/constitution-checker` (CLI tool)

**Core Features**:
- **Rule Engine**: Parse constitution.yaml + execute validation checks
- **CLI Interface**: `constitution check --module B05 --report json`
- **CI Integration**: GitHub Actions / GitLab CI pre-commit hooks
- **Violation Reporting**: Detailed reports met fix suggestions
- **Policy as Code**: Codify governance rules in YAML

**Constitution Checks**:
- **Authentication**: All endpoints require authentication (B05)
- **Authorization**: Permission checks present (B08)
- **Multi-tenancy**: Organisation context propagated (B06)
- **Audit**: Critical actions logged (B09)
- **Rate Limiting**: Public endpoints rate-limited (B06)
- **Evaluation Gates**: ML models pass D09 before prod (D12)
- **Prompt Versioning**: Production prompts versioned (D13)

**Demo**: ⚠️ GEEN demo-page (technische module) - CLI output volstaat: `constitution check`

**Dashboard**: Constitutional Compliance scorecard in F10 development dashboard

**Acceptance Criteria**:
- [ ] CLI checks 10+ constitution rules
- [ ] CI integration blocks merge if violations found
- [ ] Reports show violation + fix suggestion
- [ ] Scorecard in F10 dashboard (X/Y checks passed)
- [ ] <5s execution time for full check

---

## [P02: Security Audit & ASVS Compliance (Lightweight)](../modules/backlog/279-P02-security-audit-and-asvs-compliance-(lightweight)/index.md)

**Feature**: `P02-security-audit-asvs-compliance`

**Goal**: Automated security audit based op OWASP ASVS top 20 critical controls.

**Package**: `@django-core/security-audit` (CLI tool + CI integration)

**Core Features**:
- **ASVS Checklist**: Top 20 OWASP ASVS controls (authentication, crypto, access control)
- **Automated Scans**: Bandit (Python), ESLint security rules (TypeScript), npm audit
- **Manual Checklist**: Non-automatable checks (architecture review)
- **Vulnerability DB**: CVE database integration (check dependencies)
- **Compliance Reports**: PDF export voor audits

**Top 20 ASVS Checks**:
1. Strong authentication (MFA, password policy) - B05
2. Session management (secure cookies, timeout) - B05
3. Access control (RBAC, least privilege) - B08
4. Input validation (prevent injection) - All modules
5. Cryptography (TLS 1.3, strong ciphers) - Infrastructure
6. Error handling (no stack traces in prod) - B15
7. Logging & monitoring (security events) - B09
8. Data protection (encryption at rest) - B22
9. Communications security (HTTPS only) - Infrastructure
10. Malicious code detection (dependency scanning) - P05
11. Business logic (authorization checks) - B08
12. File/resource handling (path traversal) - B22
13. API security (rate limiting, auth) - B13
14. Configuration (secure defaults) - All modules
15. Secrets management (no hardcoded keys) - Infrastructure
16. Multi-tenancy isolation (org boundaries) - B06
17. Audit trail (immutable logs) - B09
18. CORS policy (restrict origins) - B13
19. CSRF protection (tokens) - B13
20. Dependency updates (CVEs patched) - P05

**Demo**: ⚠️ GEEN demo-page

**Dashboard**: Security scorecard in F10: "Security: 85% compliant (17/20 checks passed)"

**Acceptance Criteria**:
- [ ] 15/20 checks automated (Bandit, ESLint, npm audit)
- [ ] Manual checklist voor 5 remaining checks
- [ ] CI fails if critical vulnerabilities found
- [ ] Compliance report PDF export
- [ ] F10 dashboard shows security score

---

## [P03: ML & Agent Governance Gate (Lightweight)](../modules/backlog/280-P03-ml-and-agent-governance-gate-(lightweight)/index.md)

**Feature**: `P03-ml-agent-governance-gate`

**Goal**: Automated governance checks voor ML/AI modules (evaluation, versioning, security).

**Package**: `@django-core/ml-governance` (CLI tool)

**Core Features**:
- **Evaluation Gate**: Block prod deployment if D09 metrics below threshold
- **Prompt Versioning**: Verify all production prompts versioned (D13)
- **Tool-Call Redaction**: Audit D07 logs voor secret leaks
- **Token Budgets**: Verify all agents have budgets (D14)
- **Vector Privacy**: Check D15 tenant isolation

**Governance Checks**:
1. **Evaluation Gate**: All prod models pass D09 evaluation (accuracy > 85%)
2. **Prompt Versioning**: Production prompts in D13 library (no ad-hoc)
3. **Secret Redaction**: D07 logs redact API keys (test with known patterns)
4. **Agent Budgets**: All agents have daily token limits (D14)
5. **Vector Isolation**: D15 vector search respects org boundaries
6. **Model Lineage**: All prod models have training dataset (D12)
7. **Drift Monitoring**: D16 monitoring active for prod models

**Demo**: ⚠️ GEEN demo-page

**Dashboard**: ML Governance scorecard in F10: "ML Governance: 4/5 checks passed"

**Acceptance Criteria**:
- [ ] Evaluation gate blocks deployment if metrics fail
- [ ] Prompt versioning check scans codebase
- [ ] Secret redaction test catches 10+ patterns
- [ ] Agent budget check queries D14 registry
- [ ] Vector isolation test queries D15 with cross-org data

---

## [P04: Integration Security Audit (Lightweight)](../modules/backlog/281-P04-integration-security-audit-(lightweight)/index.md)

**Feature**: `P04-integration-security-audit`

**Goal**: Security audit voor third-party integraties (webhooks, connectors, API keys).

**Package**: `@django-core/integration-security` (CLI tool)

**Core Features**:
- **Webhook Signature Verification**: Check all webhooks verify signatures
- **Credential Rotation**: Audit credential age, alert if >90 days
- **Connector Permissions**: Verify I01 connectors have least-privilege
- **TLS Verification**: Check all external API calls use TLS 1.2+
- **Secret Storage**: Verify no secrets in code (all in env/vault)

**Security Checks**:
1. **Webhook Signatures**: I01 webhooks verify HMAC signatures
2. **Credential Rotation**: API keys <90 days old (scan B11, I02)
3. **Connector Permissions**: I01 connectors use scoped tokens (not admin)
4. **TLS 1.2+**: All external API calls use modern TLS
5. **Secret Storage**: No hardcoded secrets (grep codebase for patterns)
6. **Rate Limiting**: Outbound API calls rate-limited (prevent abuse)
7. **Timeout Policies**: All external calls have <30s timeout

**Demo**: ⚠️ GEEN demo-page

**Dashboard**: Integration Security scorecard in F10: "Integration Security: 100% (5/5)"

**Acceptance Criteria**:
- [ ] Webhook signature check scans I01 handlers
- [ ] Credential age audit via B11 API
- [ ] Connector permission check via I01 registry
- [ ] TLS version check via network inspection
- [ ] Secret grep scans codebase (0 matches = pass)

---

## [P05: Stack & Dependency Validation](../modules/backlog/274-P05-stack-and-dependency-validation/index.md)

**Feature**: `P05-stack-dependency-validation`

**Goal**: Continuous monitoring van dependencies voor CVEs, deprecations, outdated versions.

**Package**: `@django-core/dependency-checker` (CLI tool + CI)

**Core Features**:
- **CVE Scanning**: Check npm/pip dependencies voor known vulnerabilities
- **Deprecation Alerts**: Detect deprecated packages (EOL warnings)
- **Update Recommendations**: Suggest safe version upgrades
- **License Compliance**: Check licenses (no GPL in proprietary code)
- **Dependency Tree**: Visualize transitive dependencies

**Validation Checks**:
1. **CVE Scanning**: npm audit, safety (Python), snyk
2. **Outdated Packages**: packages >12 months old flagged
3. **Deprecation Warnings**: Check npm/PyPI deprecation notices
4. **License Compliance**: Scan licenses (MIT/Apache/BSD allowed)
5. **Peer Dependency Issues**: Check npm peer dependency warnings
6. **Transitive CVEs**: Scan indirect dependencies
7. **Dependency Staleness**: Alert if 50%+ dependencies outdated

**Severity Levels**:
- **Critical**: CVE with known exploit (CVSS 9.0+)
- **High**: CVE without exploit (CVSS 7.0-8.9)
- **Medium**: Deprecated package with replacement
- **Low**: Outdated but secure package

**Demo**: ⚠️ GEEN demo-page

**Dashboard**: Dependency Health in F10: "Dependencies: 3 CVEs found (2 critical)"

**Acceptance Criteria**:
- [ ] CVE scan detects known vulnerabilities
- [ ] Deprecation alerts voor EOL packages
- [ ] License compliance check blocks GPL
- [ ] CI fails if critical CVEs found
- [ ] F10 dashboard shows CVE count + severity

---

**Phase 17 Complete**: 5 modules (P01-P05) - All lightweight, all results shown in F10 dashboard
