# Fase 16: Platform Quality Gates

## 76. P02 – Security Audit & ASVS Compliance (Lightweight)

**Doel**: Automated security audit based op OWASP ASVS top 20 critical controls.

**Waarom agnostisch**: Security audits zijn universeel - verify authentication, crypto, access control.

**Wat moet er gebeuren**:
- ASVS checklist (Top 20 OWASP ASVS controls)
- Automated scans (Bandit for Python, ESLint security, npm audit)
- Manual checklist (non-automatable checks like architecture review)
- Vulnerability DB (CVE database integration for dependencies)
- Compliance reports (PDF export for audits)

**Demo Requirements**:
- ⚠️ **GEEN demo-page** - Security scorecard shown in F10 dashboard

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=P02-security-audit-asvs-compliance

[feature summary]
Automated security audit based on OWASP ASVS top 20 controls.

[goals]
- 15/20 checks automated (Bandit, ESLint, npm audit)
- Manual checklist for 5 remaining checks
- CI fails if critical vulnerabilities found
- Compliance report PDF export
- F10 dashboard shows security score

[demo requirements]
GEEN demo-page - F10 dashboard: "Security: 85% compliant (17/20)"
```

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
