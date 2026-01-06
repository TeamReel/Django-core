# Architecture Decision Records

This index catalogs all Architecture Decision Records (ADRs) for Django Core-App.

## What is an ADR?

An ADR captures an important architectural decision along with its context and consequences. Each ADR documents:

- **Context**: The forces at play, including technical, political, social, and project-specific
- **Decision**: The response to these forces
- **Status**: Draft, Proposed, Accepted, Deprecated, Superseded
- **Consequences**: The resulting context after applying the decision

## ADR Template

```markdown
# ADR-XXX: Title

## Status
[Draft | Proposed | Accepted | Deprecated | Superseded by ADR-YYY]

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or more difficult to do because of this change?
```

---

## Index by Category

### Security & Authentication

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](../../adr/001-password-validation-strategy.md) | Password Validation Strategy | Accepted |
| [ADR-002](../../adr/002-role-based-access-control.md) | Role-Based Access Control | Accepted |
| [ADR-003](../../adr/003-pip-audit-for-dependency-scanning.md) | pip-audit for Dependency Scanning | Accepted |
| [ADR-004](../../adr/004-security-enforcement-modes.md) | Security Enforcement Modes | Accepted |
| [ADR-013](../../adr/013-jwt-authentication-strategy.md) | JWT Authentication Strategy | Accepted |

### API & Routing

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-005](../../adr/005-routing-evaluation-order.md) | Routing Evaluation Order | Accepted |
| [ADR-006](../../adr/006-suppression-strategy.md) | Suppression Strategy | Accepted |
| [ADR-014](../../adr/014-url-based-api-versioning.md) | URL-Based API Versioning | Accepted |

### Transactions & Billing

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-011-001](../../adr/ADR-011-001-single-ledger-vs-double-entry.md) | Single Ledger vs Double Entry | Accepted |
| [ADR-011-002](../../adr/ADR-011-002-computed-vs-stored-balance.md) | Computed vs Stored Balance | Accepted |
| [ADR-011-003](../../adr/ADR-011-003-idempotency-key-retention.md) | Idempotency Key Retention | Accepted |
| [ADR-011-004](../../adr/ADR-011-004-redis-cache-invalidation.md) | Redis Cache Invalidation | Accepted |

### User Preferences & Internationalization

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-012](../../adr/012-b10-preference-storage.md) | B10 Preference Storage | Accepted |

### Notifications

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-016](../../adr/016-notification-retry-policies.md) | Notification Retry Policies | Accepted |

### Observability & Operations

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-019](../../adr/019-metric-exporter-pluggability.md) | Metric Exporter Pluggability | Accepted |
| [ADR-020](../../adr/020-deployment-automation-strategy.md) | Deployment Automation Strategy | Accepted |

### Scaffolding & Templates

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-021](../../adr/ADR-021-template-discovery-mechanism.md) | Template Discovery Mechanism | Accepted |
| [ADR-022](../../adr/ADR-022-constitutional-validation-integration.md) | Constitutional Validation Integration | Accepted |

---

## Index by Number

| # | Title | Category | Status |
|---|-------|----------|--------|
| 001 | [Password Validation Strategy](../../adr/001-password-validation-strategy.md) | Security | Accepted |
| 002 | [Role-Based Access Control](../../adr/002-role-based-access-control.md) | Security | Accepted |
| 003 | [pip-audit for Dependency Scanning](../../adr/003-pip-audit-for-dependency-scanning.md) | Security | Accepted |
| 004 | [Security Enforcement Modes](../../adr/004-security-enforcement-modes.md) | Security | Accepted |
| 005 | [Routing Evaluation Order](../../adr/005-routing-evaluation-order.md) | API | Accepted |
| 006 | [Suppression Strategy](../../adr/006-suppression-strategy.md) | API | Accepted |
| 011-001 | [Single Ledger vs Double Entry](../../adr/ADR-011-001-single-ledger-vs-double-entry.md) | Transactions | Accepted |
| 011-002 | [Computed vs Stored Balance](../../adr/ADR-011-002-computed-vs-stored-balance.md) | Transactions | Accepted |
| 011-003 | [Idempotency Key Retention](../../adr/ADR-011-003-idempotency-key-retention.md) | Transactions | Accepted |
| 011-004 | [Redis Cache Invalidation](../../adr/ADR-011-004-redis-cache-invalidation.md) | Transactions | Accepted |
| 012 | [B10 Preference Storage](../../adr/012-b10-preference-storage.md) | i18n | Accepted |
| 013 | [JWT Authentication Strategy](../../adr/013-jwt-authentication-strategy.md) | Security | Accepted |
| 014 | [URL-Based API Versioning](../../adr/014-url-based-api-versioning.md) | API | Accepted |
| 016 | [Notification Retry Policies](../../adr/016-notification-retry-policies.md) | Notifications | Accepted |
| 019 | [Metric Exporter Pluggability](../../adr/019-metric-exporter-pluggability.md) | Observability | Accepted |
| 020 | [Deployment Automation Strategy](../../adr/020-deployment-automation-strategy.md) | Operations | Accepted |
| 021 | [Template Discovery Mechanism](../../adr/ADR-021-template-discovery-mechanism.md) | Scaffolding | Accepted |
| 022 | [Constitutional Validation Integration](../../adr/ADR-022-constitutional-validation-integration.md) | Scaffolding | Accepted |

---

## Creating New ADRs

1. **Copy the template** from above
2. **Choose the next available number** (check the index)
3. **Create the file**: `docs/adr/XXX-descriptive-name.md`
4. **Update this index** with the new ADR
5. **Submit for review** via pull request

### Naming Convention

- Use lowercase with hyphens: `001-password-validation-strategy.md`
- Keep titles descriptive but concise
- Group related decisions with sub-numbers: `011-001`, `011-002`

### When to Write an ADR

- Significant architectural choices
- Technology selection decisions
- Pattern or convention adoptions
- Security policy decisions
- Breaking changes or migrations

---

## Related Documentation

- [Architecture Overview](../overview.md)
- [Security Model](../security-model.md)
- [Request Flow](../request-flow.md)
