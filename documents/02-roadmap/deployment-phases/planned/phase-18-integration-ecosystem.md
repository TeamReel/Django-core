# Phase 18: Integration Ecosystem (275-276)

**Focus**: Connector framework, compliance exports

---

## [I01: Connector Framework & SDK (Lightweight)](../modules/backlog/275-I01-connector-framework-and-sdk-(lightweight)/index.md)

**Feature**: `I01-connector-framework-sdk`

**Goal**: Plugin framework voor third-party integraties (Salesforce, Slack, Stripe, etc.).

**Package**: `@django-core/connector-sdk` (backend + SDK)

**Core Features**:
- **Manifest-based Registration**: YAML connector definition (name, auth, endpoints)
- **OAuth 2.0 Support**: Built-in OAuth flow voor third-party apps
- **Webhook Handling**: Inbound webhook receiver met signature verification
- **Rate Limiting**: Per-connector rate limits (prevent API abuse)
- **Error Handling**: Retry logic, circuit breaker, DLQ

**Connector Manifest Format**:
```yaml
connector_id: salesforce
name: Salesforce CRM
version: 1.0.0
auth:
  type: oauth2
  authorize_url: https://login.salesforce.com/oauth2/authorize
  token_url: https://login.salesforce.com/oauth2/token
  scopes: [api, refresh_token]
endpoints:
  - name: list_contacts
    method: GET
    url: /services/data/v58.0/sobjects/Contact
  - name: create_lead
    method: POST
    url: /services/data/v58.0/sobjects/Lead
webhooks:
  - event: contact.created
    signature_header: X-Salesforce-Signature
    verification: hmac-sha256
```

**Built-in Connectors** (examples):
- Salesforce CRM (contacts, leads, opportunities)
- Slack (send messages, create channels)
- Stripe (payments, subscriptions)
- Google Workspace (Gmail, Calendar, Drive)
- GitHub (repos, issues, pull requests)

**Demo**: 🔌 Connector Marketplace (`/demo/connectors`) - List connectors, test, install new

**Acceptance Criteria**:
- [ ] Manifest-based registration (YAML loader)
- [ ] OAuth 2.0 flow werkt voor 3+ connectors
- [ ] Webhook receiver verifies signatures
- [ ] Rate limiting per connector (100 req/min)
- [ ] SDK documentation + example connector

---

## [I02: Compliance Exports (Lightweight)](../modules/backlog/276-I02-compliance-exports-(lightweight)/index.md)

**Feature**: `I02-compliance-exports`

**Goal**: Pre-built export templates voor compliance audits (GDPR, SOC2, ISO27001).

**Package**: `@django-core/compliance-exports` (backend)

**Core Features**:
- **Export Templates**: Pre-defined data exports voor common compliance frameworks
- **Data Portability**: GDPR Article 20 data portability (user data export)
- **Audit Bundles**: Package audit logs, access logs, security events
- **Anonymization**: Redact PII for non-compliant exports (via D07)
- **Format Options**: JSON, CSV, PDF (via B38)

**Export Templates**:

**1. GDPR Data Subject Access Request (DSAR)**
- User profile + metadata
- All audit events (B09) mentioning user
- Projects/orgs user is member of (B06/B07)
- Billing history (B11)
- Tool-call logs (D07, redacted)

**2. SOC2 Audit Bundle**
- Access logs (last 12 months)
- Security events (failed logins, permission changes)
- Backup logs (O01)
- Incident response logs
- Change management logs

**3. ISO27001 Information Security Audit**
- Security controls checklist (P02)
- Risk assessment logs
- Access control policies (B08)
- Data retention policies
- Employee training records

**Export Process**:
1. User requests export (select template)
2. Background job (B15) generates export
3. Notification (B16) when ready
4. Download link (expires after 7 days)
5. Audit log entry (B09)

**Demo**: 📦 Compliance Export (`/demo/compliance/exports`) - Template selection, request export, download

**Acceptance Criteria**:
- [ ] GDPR DSAR export includes all user data
- [ ] Export generation <5 min voor typical user
- [ ] PDF format via B38 (structured + readable)
- [ ] Anonymization redacts PII (configurable)
- [ ] Download link expires after 7 days

---

**Phase 18 Complete**: 2 modules (I01-I02)
