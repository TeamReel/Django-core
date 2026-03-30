# Fase 16: Platform Quality Gates

## 77. P03 – ML & Agent Governance Gate (Lightweight)

**Doel**: Automated governance checks voor ML/AI modules (evaluation, versioning, security).

**Waarom agnostisch**: ML governance is universeel - ensure quality, safety, compliance.

**Wat moet er gebeuren**:
- Evaluation gate (block prod if D09 metrics below threshold)
- Prompt versioning (verify all production prompts versioned in D13)
- Tool-call redaction (audit D07 logs for secret leaks)
- Token budgets (verify all agents have budgets in D14)
- Vector privacy (check D15 tenant isolation)

**Demo Requirements**:
- ⚠️ **GEEN demo-page** - ML Governance scorecard shown in F10 dashboard

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=P03-ml-agent-governance-gate

[feature summary]
Automated governance checks for ML/AI modules.

[goals]
- Evaluation gate blocks deployment if metrics fail
- Prompt versioning check scans codebase
- Secret redaction test catches 10+ patterns
- Agent budget check queries D14 registry
- Vector isolation test queries D15 with cross-org data

[demo requirements]
GEEN demo-page - F10 dashboard: "ML Governance: 4/5 checks passed"
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
