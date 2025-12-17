# Modules 059-067: Platform Quality, Integration & Operations (FINAL)

**Laatste fase: Quality Gates, Integration, Operations + Visily.ai**

---

## Fase 14: Platform Quality Gates (059-063) - Lightweight

**Principe**: Gates zijn checkpoints, geen hele sprints. Focus op kritieke checks, niet perfectie.

### 59. P01 – Constitutional Enforcement Engine

**Doel**
Lichtgewicht governance engine die constitution rules valideert tijdens development en CI.

**Waarom agnostisch**
Code quality checks zijn universeel: naming, structure, security patterns.

**Wat moet er gebeuren**
- **Rule definitions**: YAML-based rules voor code patterns, security, naming
- **CLI checks**: `constitution check` command voor CI pipeline
- **Violation reports**: Clear output met wat er mis is + hoe te fixen
- **Auto-fixes**: Eenvoudige fixes (formatting, naming) auto-apply
- **Integration**: Pre-commit hooks, CI pipeline checks

**Demo Requirements**:
- ⚠️ **GEEN demo-page** (technische module, geen UI nodig)
- **CLI output** volstaat: `constitution check` → lijst violations → fix suggestions

**Specify Prompt**

```
/spec-kitty.specify feature=P01-constitutional-enforcement-engine

[feature summary]
Lightweight governance engine for validating constitution rules in code via CLI and CI checks.

[goals and non-goals]
Goals:
- YAML-based rule definitions (easy to maintain)
- CLI tool for local + CI checks
- Clear violation reports with fix suggestions
- Auto-fixes for simple issues
- Fast execution (<30s for full codebase)

Non-goals:
- Complex AST analysis (keep simple regex/pattern matching)
- Replace linters (complement them)
- Real-time IDE integration (CLI-first)

[key user stories]
- As a developer, I run `constitution check` before commit
- As CI, I block merges that violate constitution
- As a tech lead, I define rules in YAML without code
- As a contributor, I get clear fix suggestions

[constraints and assumptions]
- Python-based CLI tool
- Rules in constitution.yaml
- Integrates with existing linters (ruff, mypy)
- Exit code 0 = pass, 1 = violations
- Violations logged to B09 for tracking

[lightweight implementation]
- Simple pattern matching (regex, file structure checks)
- No complex control flow analysis
- Fast: <30 seconds for 100k LOC
- Clear output: file, line, rule, suggestion
```

---

### 60. P02 – Security Audit & ASVS Compliance (Lightweight)

**Doel**
Lightweight security audit checklist gebaseerd op ASVS (Application Security Verification Standard).

**Waarom agnostisch**
Security best practices zijn universeel voor web applications.

**Wat moet er gebeuren**
- **ASVS checklist**: Top 20 most critical checks (niet alle 286 ASVS items)
- **Automated checks**: Scripts voor detecteerbare issues (hardcoded secrets, SQL injection risks)
- **Manual checklist**: Voor zaken die niet geautomatiseerd kunnen
- **Report**: Security scorecard (% compliant)
- **Fix guidance**: Links naar docs/examples voor elke issue

**Demo Requirements**:
- ⚠️ **GEEN demo-page** (technische module)
- **Security scorecard** in development dashboard (F10): "Security: 85% compliant (17/20 checks passed)"

**Specify Prompt**

```
/spec-kitty.specify feature=P02-security-audit-asvs-lightweight

[feature summary]
Lightweight security audit with ASVS top 20 checks and automated vulnerability detection.

[goals and non-goals]
Goals:
- Top 20 ASVS checks (critical only)
- Automated detection where possible
- Manual checklist for rest
- Security scorecard (% compliant)
- Fix guidance per issue

Non-goals:
- Full ASVS Level 2 compliance (too heavy)
- Penetration testing (use external tools)
- Real-time vulnerability scanning

[key user stories]
- As security, I get a quick security scorecard
- As a developer, I fix critical issues before deploy
- As a tech lead, I track security improvements
- As an auditor, I see compliance evidence

[constraints and assumptions]
- Top 20 checks cover 80% of common vulnerabilities
- Automated checks via scripts (secrets scanning, SQL injection patterns)
- Manual checklist for authentication, authorization, crypto
- Report integrated in development dashboard (F10)
- Runs in CI, fails if critical issues found

[top 20 checks examples]
1. No hardcoded secrets (scan code)
2. HTTPS enforced (check settings)
3. SQL injection prevention (ORM usage check)
4. XSS prevention (template auto-escaping)
5. CSRF protection enabled
6. Authentication rate limiting
7. Password complexity requirements
8. Secure session management
9. Input validation on all endpoints
10. Output encoding
... (10 more)
```

---

### 61. P03 – ML & Agent Governance Gate (Lightweight)

**Doel**
Governance checks voor ML/AI modules: evaluation gates, prompt versioning, tool-call redaction.

**Waarom agnostisch**
ML governance is universeel: quality gates, versioning, privacy.

**Wat moet er gebeuren**
- **Evaluation gates**: No prod deployment without passing D09 evaluation
- **Prompt versioning**: All production prompts must be versioned (D13)
- **Tool-call redaction**: Verify D07 logs redact secrets
- **Token budget checks**: Verify agents have budgets (D14)
- **Automated checks**: Scripts validate these rules

**Demo Requirements**:
- ⚠️ **GEEN demo-page** (technische module)
- **ML Governance scorecard** in development dashboard (F10): "ML Governance: 4/5 checks passed"

**Specify Prompt**

```
/spec-kitty.specify feature=P03-ml-agent-governance-gate

[feature summary]
Lightweight ML/AI governance gate validating evaluation, versioning, and privacy rules.

[goals and non-goals]
Goals:
- Block prod deployments without evaluation pass
- Enforce prompt versioning
- Verify tool-call redaction works
- Check token budgets configured
- Automated checks in CI

Non-goals:
- Complex ML quality analysis (D09 does that)
- Auto-fix ML issues (manual review required)
- Real-time governance during inference

[key user stories]
- As security, I ensure tool calls are redacted
- As ML lead, I block unvalidated model deployments
- As finance, I ensure token budgets are set
- As a developer, I get clear checklist before deploy

[constraints and assumptions]
- Checks D12 (model registry): prod models have evaluation results
- Checks D13 (prompts): prod templates are versioned
- Checks D07 (tool calls): sample logs to verify redaction works
- Checks D14 (agents): all agents have token budgets
- Lightweight: ~5 automated checks, <10s runtime

[checks]
1. Prod models have D09 evaluation results (query D12 API)
2. Prod prompts are versioned (query D13 API)
3. Sample D07 logs contain "***REDACTED***" for secrets
4. All agents in D14 have token_budget set
5. Vector search (D15) has tenant isolation enabled
```

---

### 62. P04 – Integration Security Audit (Lightweight)

**Doel**
Security checks voor integraties: webhook signatures, credential rotation, connector permissions.

**Waarom agnostisch**
Integration security is universeel: webhooks, API keys, third-party access.

**Wat moet er gebeuren**
- **Webhook signature checks**: Verify all webhooks use HMAC signatures
- **Credential rotation**: Check credentials have expiry dates (D08)
- **Connector permissions**: Verify connectors use least-privilege
- **Rate limiting**: Verify third-party API calls are rate-limited
- **Automated checks**: Scripts validate these rules

**Demo Requirements**:
- ⚠️ **GEEN demo-page** (technische module)
- **Integration Security scorecard** in development dashboard (F10): "Integration Security: 100% (5/5)"

**Specify Prompt**

```
/spec-kitty.specify feature=P04-integration-security-audit

[feature summary]
Lightweight integration security audit for webhooks, credentials, and third-party access.

[goals and non-goals]
Goals:
- Verify webhook signatures enforced
- Check credential expiry configured
- Validate connector least-privilege
- Confirm rate limiting active
- Automated checks in CI

Non-goals:
- Complex threat modeling
- Real-time intrusion detection
- Full API security audit (focus on integrations)

[key user stories]
- As security, I verify webhooks can't be spoofed
- As an operator, I ensure credentials rotate regularly
- As a developer, I get clear integration security checklist
- As compliance, I see evidence of controls

[constraints and assumptions]
- Checks D07 (webhooks): signature verification enabled
- Checks D08 (secrets): credentials have expiry_date set
- Checks I01 (connectors): permissions documented
- Checks B13 (API): rate limiting configured
- Lightweight: ~5 checks, <10s runtime

[checks]
1. Webhooks use HMAC-SHA256 signatures (check D07 config)
2. All credentials have expiry_date (query D08 API)
3. Connectors have documented permission scope (check I01 manifests)
4. External API calls rate-limited (check B13 throttling config)
5. OAuth tokens refreshed before expiry (check token refresh logic)
```

---

### 63. P05 – Stack & Dependency Validation

**Doel**
Validate tech stack blijft up-to-date en secure: dependency versions, CVEs, deprecations.

**Waarom agnostisch**
Dependency management is universeel voor any software project.

**Wat moet er gebeuren**
- **CVE scanning**: Check for known vulnerabilities (via `pip-audit`, `npm audit`)
- **Deprecation warnings**: Flag deprecated packages/versions
- **Version pinning**: Verify all deps have pinned versions
- **License compliance**: Check for incompatible licenses
- **Update recommendations**: Suggest safe upgrades

**Demo Requirements**:
- ⚠️ **GEEN demo-page** (technische module)
- **Dependency Health** in development dashboard (F10): "Dependencies: 3 CVEs found (2 critical)"

**Specify Prompt**

```
/spec-kitty.specify feature=P05-stack-dependency-validation

[feature summary]
Lightweight dependency validation for CVEs, deprecations, and license compliance.

[goals and non-goals]
Goals:
- CVE scanning (pip-audit, npm audit)
- Flag deprecated packages
- Verify version pinning
- License compliance checks
- Update recommendations

Non-goals:
- Auto-update dependencies (too risky)
- Complex supply chain analysis
- Real-time vulnerability alerts

[key user stories]
- As security, I get CVE alerts quickly
- As a developer, I see safe upgrade paths
- As compliance, I verify license compatibility
- As a tech lead, I track dependency health

[constraints and assumptions]
- Uses pip-audit (Python), npm audit (Node.js)
- Runs in CI weekly
- Critical CVEs fail CI build
- Low/medium CVEs create warnings
- License check via pyproject.toml, package.json

[implementation]
- Python: pip-audit --json → parse results
- Node.js: npm audit --json → parse results
- License check: pip-licenses, license-checker
- Deprecation: parse package metadata for deprecated flag
- Report: JSON file → displayed in F10 dashboard
```

---

## Fase 15: Integration Ecosystem (064-065) - Lightweight

### 64. I01 – Connector Framework & SDK (Lightweight)

**Doel**
Lightweight framework voor third-party connectors met manifest-based registration.

**Waarom agnostisch**
Connector patterns zijn universeel: authentication, rate limiting, error handling.

**Wat moet er gebeuren**
- **Connector manifest**: YAML-based connector definition (capabilities, auth, rate limits)
- **Base connector class**: Python base class voor nieuwe connectors
- **Registry**: List available connectors, health checks
- **Example connectors**: 2-3 simple examples (Slack, GitHub, generic REST API)
- **Documentation**: Connector development guide

**Demo Requirements**:
- 🔌 **Connector Marketplace** in demo-shell:
  - List installed connectors: "Slack", "GitHub", "Generic REST API"
  - Connector detail: capabilities, status, test button
  - Install new connector (upload manifest)
  - Tests: test connector → see success/failure

**Specify Prompt**

```
/spec-kitty.specify feature=I01-connector-framework-sdk-lightweight

[feature summary]
Lightweight connector framework with YAML manifests and base classes for third-party integrations.

[goals and non-goals]
Goals:
- YAML-based connector manifests (easy to create)
- Python base class for connector logic
- Registry for discovery and health checks
- 2-3 example connectors (Slack, GitHub, REST API)
- Developer guide for creating connectors

Non-goals:
- Complex marketplace UI (keep simple list)
- Connector versioning/updates (manual for now)
- Real-time connector monitoring (basic health checks only)

[key user stories]
- As a developer, I create connectors easily via base class
- As an operator, I see available connectors and their status
- As a user, I test connectors before using in workflows
- As an integrator, I have clear examples to follow

[constraints and assumptions]
- Uses D08 for credential storage
- Integrates with B15 for async connector jobs
- Tenant-scoped connector instances
- Lightweight: manifest + base class + 3 examples

[connector manifest example]
```yaml
name: slack-connector
version: 1.0.0
capabilities:
  - send_message
  - list_channels
authentication:
  type: oauth2
  scopes: [chat:write, channels:read]
rate_limits:
  requests_per_minute: 60
health_check:
  endpoint: /api/health
  interval: 300
```

[demo requirements]
Demo page: /demo/connectors
- Connector list:
  - Slack - Status: Active - Last check: 2 min ago ✅
  - GitHub - Status: Active - Last check: 5 min ago ✅
  - Generic REST API - Status: Inactive - Not configured ⚠️
- Click Slack → detail:
  - Capabilities: send_message, list_channels
  - Authentication: OAuth2 configured ✅
  - Rate limit: 60 req/min (current: 12/min)
  - Test button → "Send test message" → Success ✅
- Install new connector:
  - Upload manifest.yaml
  - Validates manifest → creates connector instance
  - Configure credentials (via D08)
  - Test → Activate
- Tests: install example connector → configure → test → use in workflow (B27)
```

---

### 65. I02 – Compliance Exports (Lightweight)

**Doel**
Lightweight compliance export templates voor audit bundles en GDPR data exports.

**Waarom agnostisch**
Compliance exports zijn universeel: audit logs, GDPR/DSAR, evidence packs.

**Wat moet er gebeuren**
- **Export templates**: 3 predefined templates (Audit Bundle, GDPR Export, Evidence Pack)
- **Data collection**: Gather relevant data from B09 (audit), users, orgs
- **Redaction**: Apply D06 privacy policies during export
- **Format**: ZIP with JSON/CSV files + README
- **Approval workflow**: Admin approval required for exports

**Demo Requirements**:
- 📦 **Compliance Export Page** in demo-shell:
  - Template selection: Audit Bundle, GDPR Export, Evidence Pack
  - Configure: date range, entities (users/orgs)
  - Request Export button → approval workflow
  - Download when ready
  - Tests: request audit bundle → approve → download → verify contents

**Specify Prompt**

```
/spec-kitty.specify feature=I02-compliance-exports-lightweight

[feature summary]
Lightweight compliance export templates for audit bundles and GDPR data with approval workflows.

[goals and non-goals]
Goals:
- 3 export templates (Audit, GDPR, Evidence)
- Automated data collection from relevant modules
- Redaction via D06 policies
- Approval workflow (admin approval required)
- ZIP format with JSON/CSV + README

Non-goals:
- Replace legal compliance software
- Complex custom export builders
- Real-time exports (async via B15)

[key user stories]
- As compliance, I generate audit bundles for regulators
- As a user, I request my GDPR data export
- As an admin, I approve/reject export requests
- As security, I ensure exports are redacted properly

[constraints and assumptions]
- Uses B09 for audit logs
- Uses D06 for redaction rules
- Approval via B27 workflow (admin approval required)
- Async generation via B15 tasks
- Tenant-scoped exports

[export templates]
1. Audit Bundle:
   - All B09 audit events (date range)
   - User activity logs
   - Permission changes
   - System configuration snapshots
2. GDPR Export (DSAR):
   - User profile data
   - User-created content (files, comments, etc.)
   - Audit logs for user
   - Redacted per D06 policies
3. Evidence Pack:
   - System configuration
   - Security settings
   - Access control policies
   - Compliance checkpoints (P01-P05 results)

[demo requirements]
Demo page: /demo/compliance/exports
- Template selection: radio buttons (Audit Bundle, GDPR Export, Evidence Pack)
- Configuration:
  - Date range: 2025-01-01 to 2025-12-15
  - Entities: select users/orgs (for GDPR: specific user)
  - Redaction level: Standard (default) or Full (admin only)
- Request Export button → creates export job
  - Status: "Pending approval"
  - Notifies admin (B16)
- Admin approval:
  - Admin sees pending export request
  - Review → Approve/Reject
  - If approved → export job runs (B15)
- Download:
  - Export ready → notification sent
  - Download button → downloads audit-bundle-2025-12-15.zip
  - ZIP contents:
    - README.md (export metadata)
    - audit_events.json (redacted)
    - users.csv
    - configuration.json
- Tests: request GDPR export → admin approves → download → verify user data present + redacted
```

---

## Fase 16: Operations & Visily.ai (066-067)

### 66. O01 – Resilience Testing & Health Validation (Lightweight)

**Doel**
Lightweight resilience checks: retry logic, circuit breakers, graceful degradation tests.

**Waarom agnostisch**
Resilience patterns zijn universeel: retries, timeouts, fallbacks.

**Wat moet er gebeuren**
- **Resilience patterns**: Document + validate retry logic, circuit breakers, timeouts
- **Health checks**: Validate all services have health endpoints
- **Degradation tests**: Test fallback behavior (e.g., cache fails → still works)
- **Automated tests**: Scripts simulate failures → verify graceful handling
- **Chaos experiments** (optional): Simple chaos tests (kill Redis → verify app survives)

**Demo Requirements**:
- ⚠️ **GEEN demo-page** (technische module)
- **Resilience scorecard** in development dashboard (F10): "Resilience: 8/10 patterns validated"

**Specify Prompt**

```
/spec-kitty.specify feature=O01-resilience-testing-health-validation

[feature summary]
Lightweight resilience testing validating retry logic, circuit breakers, and graceful degradation.

[goals and non-goals]
Goals:
- Validate retry logic configured (B15, API clients)
- Check circuit breakers present (Redis, external APIs)
- Test graceful degradation (cache fails → app works)
- Health endpoints validated (B18)
- Simple chaos tests (optional: kill Redis → verify recovery)

Non-goals:
- Full chaos engineering platform (Chaos Monkey scale)
- Complex distributed system testing
- Real-time resilience monitoring

[key user stories]
- As an operator, I verify app survives common failures
- As a developer, I see which resilience patterns are missing
- As a tech lead, I validate fallback behavior works
- As an SRE, I run simple chaos tests safely

[constraints and assumptions]
- Test in staging only (not production)
- Automated tests via pytest
- Chaos tests optional (flag to enable)
- Resilience patterns documented in constitution
- Lightweight: ~10 validation checks, <2 min runtime

[validation checks]
1. B15 tasks have retry configured (max_retries, backoff)
2. External API clients have timeouts set
3. Redis cache has circuit breaker (fallback to no-cache)
4. Database queries have timeouts
5. Health endpoints return 200 (B18 /health)
6. Graceful degradation: disable cache → app still works (slower)
7. Graceful degradation: B23 WebSocket fails → fallback to polling
8. Error handling: trigger 500 error → verify logged + user sees friendly message
9. Rate limiting: exceed limit → verify 429 response
10. Chaos test (optional): kill Redis → verify app recovers

[implementation]
- pytest tests for each check
- Chaos tests use Docker: docker stop redis → run tests → docker start redis
- Scorecard: X/10 checks passed → shown in F10 dashboard
```

---

### 67. F15 – Design-to-Code Pipeline (Visily.ai Integration)

**Doel**
Pipeline om Visily.ai design exports te converteren naar werkende React components met F01 design system.

**Waarom agnostisch**
Design-to-code workflow is universeel: designers create UI → developers implement faster.

**Wat moet er gebeuren**
- **Visily parser**: Parse Visily export (JSON/Figma format)
- **Component mapper**: Map Visily elements → F01 components (Button, Input, Card, etc.)
- **Code generator**: Generate React component code met F01 imports
- **Preview mode**: Live preview van gegenereerde component
- **Manual refinement**: Developers can tweak generated code
- **Integration**: CLI tool + web UI in demo-shell

**Demo Requirements**:
- 🎨 **Design-to-Code Page** in demo-shell:
  - Upload Visily export (JSON)
  - Preview original design
  - Generate code button → shows React component
  - Preview component (live render)
  - Download code or copy to clipboard
  - Tests: upload design → generate → preview → matches design

**Specify Prompt**

```
/spec-kitty.specify feature=F15-design-to-code-pipeline-visily

[feature summary]
Design-to-code pipeline converting Visily.ai exports to React components using F01 design system.

[goals and non-goals]
Goals:
- Parse Visily export format (JSON/Figma)
- Map design elements to F01 components
- Generate clean React/TypeScript code
- Live preview of generated components
- CLI tool + web UI
- Save generated components to repo

Non-goals:
- 100% automated (expect manual refinement)
- Complex interactions/state (generate structure only)
- Support all design tools (Visily first, others later)

[key user stories]
- As a designer, I export from Visily and see it as code
- As a developer, I generate 80% of component structure automatically
- As a product owner, I validate designs quickly via live preview
- As a team, we iterate faster from design to production

[constraints and assumptions]
- Visily export format: JSON with element tree (id, type, props, children)
- F01 components used for all UI elements
- Generated code follows F01 patterns
- Manual refinement expected (interactions, business logic)
- Web UI in demo-shell + CLI tool for CI integration

[pipeline steps]
1. Parse Visily export (JSON)
2. Build element tree (hierarchy)
3. Map elements to F01 components:
   - Rectangle → Box/Card
   - Text → Text/Heading
   - Button → Button
   - Input → Input/TextInput
   - Image → Image
   - Container → Stack/Flex/Grid
4. Generate React/TypeScript code
5. Apply F01 design tokens (colors, spacing, typography)
6. Generate props (from Visily props: text, onClick, etc.)
7. Output: .tsx file with imports + component code

[demo requirements]
Demo page: /demo/design-to-code
- Upload section:
  - Drag-drop Visily export.json
  - Or paste JSON in textarea
  - Upload button
- Original design preview:
  - Shows visual representation of design (canvas)
  - Element tree view (hierarchical list)
- Generate button → runs pipeline
- Generated code view:
  - Syntax-highlighted React/TypeScript code
  - Shows imports (F01 components)
  - Clean, readable code
- Live preview:
  - Renders component using generated code
  - Interactive (buttons clickable, forms work)
  - Side-by-side: original design vs generated component
- Actions:
  - Copy to clipboard
  - Download as .tsx file
  - Save to project (creates file in components/)
- Example:
  - Input: Visily design for "User Profile Card"
  - Output: UserProfileCard.tsx using F01 Card, Avatar, Text, Button
  - Preview: Rendered card matches design
- Tests:
  - Upload simple design (login form) → generate → verify code structure
  - Preview generated form → verify inputs work
  - Complex design (dashboard) → generate → verify layout matches

[Visily export format example]
```json
{
  "name": "UserProfileCard",
  "elements": [
    {
      "id": "1",
      "type": "container",
      "layout": "vertical",
      "spacing": 16,
      "children": ["2", "3", "4"]
    },
    {
      "id": "2",
      "type": "image",
      "src": "avatar.jpg",
      "width": 64,
      "height": 64,
      "borderRadius": "50%"
    },
    {
      "id": "3",
      "type": "text",
      "content": "John Doe",
      "fontSize": 18,
      "fontWeight": "bold"
    },
    {
      "id": "4",
      "type": "button",
      "label": "View Profile",
      "variant": "primary"
    }
  ]
}
```

[Generated code example]
```tsx
import { Card, Avatar, Text, Button, Stack } from '@django-core/design-system';

export const UserProfileCard = () => {
  return (
    <Card>
      <Stack spacing={16} direction="vertical">
        <Avatar src="avatar.jpg" size={64} />
        <Text size="lg" weight="bold">John Doe</Text>
        <Button variant="primary">View Profile</Button>
      </Stack>
    </Card>
  );
};
```
```

---

## 🎯 Complete Module Overzicht (001-067)

**Fase 1-7 (001-030)**: ✅ Backend Core + Frontend Core (GEREED)

**Fase 8 (031-034)**: Demo Foundation + Files + Cache + Rich Text
**Fase 9 (035-038)**: Real-time + Search + Workflows + Payments
**Fase 10 (039-042)**: Documents + Admin + Ops Console + Billing UI

**Fase 11 (043-047)**: Data Storage + ETL + Datasets + Streaming + Versioning
**Fase 12 (048-052)**: Validation + Tool Logging + Prompt Experiments + Evaluations + Annotations

**Fase 13 (053-058)**: Features + Model Registry + Prompts + Agents + Vector Search + Monitoring

**Fase 14 (059-063)**: Quality Gates (Constitution, Security, ML Governance, Integration Security, Dependencies)

**Fase 15 (064-065)**: Integration (Connectors, Compliance Exports)

**Fase 16 (066-067)**: Operations (Resilience Testing) + Visily.ai Design-to-Code

**Totaal: 67 modules over 16 fases**

---

## 📊 Demo Requirements Samenvatting (User-Facing Only)

**Demo-shell heeft pagina's voor:**
- F10: Development Dashboard (module status, CI, coverage, security/ML scorecards)
- B22: Files (upload/download)
- F13: Rich Text Editor
- B25: Performance (cache metrics)
- B23: Real-time (activity feed, WebSocket status)
- B24: Search (search bar, results)
- B27: Workflows (approval flow)
- B26: Payments (payment form, test mode)
- B28: Documents (PDF export buttons everywhere)
- F14: Admin Panel (users/orgs/projects management)
- F11: Ops Console (jobs/workflows/payments monitoring)
- F12: Billing (usage charts, buy credits)
- D03: Datasets (catalog, lineage)
- D04: Streams (streaming dashboard)
- D05: Data Versions (version timeline, diff viewer)
- D06: Validation (schema validation test)
- D07: Tool Calls (log viewer)
- D08: Prompt Experiments (experiment runner, variant comparison)
- D09: Evaluations (run evaluations, metrics)
- D10: Labeling (annotation interface)
- D11: Features (feature library, drift monitor)
- D12: Model Registry (model versions, promote/rollback)
- D13: Prompts (template editor, test interface)
- D14: Agents (agent console, run agents)
- D15: Vector Search (semantic search, RAG demo)
- D16: Model Monitoring (health dashboard, feedback collection)
- I01: Connectors (connector marketplace, test connectors)
- I02: Compliance (export request page)
- F15: Design-to-Code (Visily upload, generate, preview)

**GEEN demo-pagina's voor** (technische modules):
- D01: Storage Adapters (gebruikt door B22)
- D02: ETL Pipelines (gebruikt door andere modules)
- P01-P05: Quality Gates (scorecards in F10 dashboard)
- O01: Resilience Testing (scorecard in F10)

**Totaal demo-pagina's: ~30 user-facing features**

---

**Status: COMPLEET - Alle 67 modules gespecificeerd! 🎉**
