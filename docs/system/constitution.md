# Django Core-App Engineering Constitution

**Version**: 2.0.0
**Last Updated**: 2025-12-15
**Scope**: All 68 modules across 16 development phases

---

## Purpose

This constitution defines **non-negotiable engineering standards** for the Django Core-App platform. These rules ensure quality, security and maintainability even when built by non-programmers using AI agents.

**Who enforces this?**
- **P01 Constitutional Enforcement Engine** (Fase 14) validates compliance automatically
- **CI/CD pipelines** block merges that violate constitutional rules
- **Development Dashboard** (F10) shows real-time compliance status

---

## Section 1: Foundational Principles

### 1.1 80/20 Architecture

- **MUST**: The Core-App provides 80% reusable infrastructure
- **MUST**: Downstream products add only 20% domain-specific logic
- **MUST**: All modules remain domain-agnostic and reusable across use cases

### 1.2 Spec-Driven Development (SDD)

- **MUST**: Every feature starts with a spec, not code
- **MUST**: Specs follow `/spec-kitty.specify` format
- **MUST**: Changes reference: feature ID (Bxx/Fxx), spec document, related tasks
- **MUST**: No feature merges without spec + plan + tasks

### 1.3 Quality Without Expertise

- **MUST**: AI agents (GitHub Copilot, ChatGPT, Spec Kitty) can build safely under governance rules
- **MUST**: Constitutional violations fail CI, not merge review
- **MUST**: Quality is structurally enforced, not dependent on individual skill

---

## Section 2: Backend Standards (B01-B28)

### 2.1 Testing Requirements

- **MUST**: ≥90% test coverage for backend core modules (B01-B21)
- **MUST**: ≥85% test coverage for backend extension modules (B22-B28)
- **MUST**: Zero flaky tests in CI (tests must be deterministic)
- **MUST**: All API endpoints have integration tests
- **MUST**: Critical security paths (auth, permissions, transactions) have 100% coverage

### 2.2 Security Baseline (B03)

- **MUST**: All secrets via environment variables or secret manager, never hardcoded
- **MUST**: OWASP ASVS top 20 critical checks pass (validated in P02 Security Audit)
- **MUST**: Brute-force protection on auth endpoints (rate limiting)
- **MUST**: Audit logging (B09) for all security events (login, permission changes, transactions)
- **MUST**: HTTPS enforced in production (no plain HTTP)

### 2.3 Multi-Tenancy Isolation (B06-B08)

- **MUST**: All queries filter by organisation/project context where applicable
- **MUST**: Permission checks before any sensitive operation
- **MUST**: Cross-tenant data leakage tests in CI
- **MUST**: Hierarchical access control validated in P04 Integration Security

### 2.4 File & Media Security (B22)

- **MUST**: File uploads have size limits enforced (configurable per deployment)
- **MUST**: File type validation via MIME type checking, not extension only
- **MUST**: Optional virus scanning integration point (ClamAV adapter)
- **MUST**: Storage adapter abstraction (S3/Azure/local) - no hardcoded storage backend
- **MUST**: Temporary files cleaned up after processing

### 2.5 Real-time Infrastructure (B23)

- **MUST**: WebSocket connections authenticated via Django Channels auth
- **MUST**: Tenant isolation in WebSocket consumers (no cross-tenant broadcasts)
- **MUST**: Connection rate limiting to prevent DoS
- **MUST**: Graceful degradation if WebSocket unavailable (fallback to polling)

### 2.6 Cache Strategy (B25)

- **MUST**: Cache keys include tenant context (org/project ID) where applicable
- **MUST**: Cache invalidation on mutations (POST/PUT/DELETE)
- **MUST**: No sensitive data in cache keys (use hashed identifiers)
- **MUST**: TTL configured per cache type (short for volatile data, long for static)

### 2.7 Payment Security (B26)

- **MUST**: Payment gateway credentials via secret manager (B08 integration point)
- **MUST**: Webhook signature verification for all payment webhooks
- **MUST**: Idempotency keys for payment operations (prevent duplicate charges)
- **MUST**: Transaction logging (B11) for all payment events
- **MUST**: PCI DSS compliance patterns documented (no storing card data)

### 2.8 Workflow State Integrity (B27)

- **MUST**: State transitions validated via state machine (no direct state updates)
- **MUST**: State change audit trail via B09 audit logging
- **MUST**: Permissions checked before state transitions
- **MUST**: Rollback patterns documented for failed transitions

### 2.9 Document Generation Security (B28)

- **MUST**: Template injection prevention (no user-controlled template code execution)
- **MUST**: Generated documents stored via B22 file management (same security rules)
- **MUST**: Document generation rate-limited per tenant (prevent resource exhaustion)

---

## Section 3: Frontend Standards (F01-F14)

### 3.1 Testing Requirements

- **MUST**: ≥85% test coverage for frontend modules
- **MUST**: All critical user journeys have integration tests
- **MUST**: Visual regression testing via Chromatic for design system (F01)
- **MUST**: Accessibility tests (axe-core) pass with zero violations

### 3.2 Accessibility (WCAG 2.1 AA)

- **MUST**: All interactive elements keyboard-navigable
- **MUST**: Screen reader compatible (ARIA labels where needed)
- **MUST**: Color contrast ≥4.5:1 for normal text, ≥3:1 for large text/UI (enforced in F07 theme system)
- **MUST**: Focus indicators visible on all focusable elements

### 3.3 Design System Compliance (F01)

- **MUST**: All UI components use F01 design tokens (no hardcoded colors/spacing/fonts)
- **MUST**: vanilla-extract for styling (zero-runtime CSS)
- **MUST**: New components added to Storybook with visual regression tests
- **MUST**: Components responsive (mobile, tablet, desktop breakpoints)

### 3.4 Theme System (F07)

- **MUST**: Light and dark modes both meet WCAG 2.1 AA contrast requirements
- **MUST**: Theme switching <100ms (no forced reflows)
- **MUST**: Theme preference persisted (cookie → localStorage → B12 preferences)
- **MUST**: SSR boot script prevents flash of unstyled content

### 3.5 Data Visualization (F08)

- **MUST**: Chart data sanitized (no XSS via data labels)
- **MUST**: Charts accessible (keyboard navigation, screen reader descriptions)
- **MUST**: Performance: <200ms render for ≤1000 data points

### 3.6 Design-to-Code Workflow (F09)

- **MUST**: Generated components use F01 design system tokens
- **MUST**: Generated code passes linting and type checks
- **MUST**: Manual review required before merging AI-generated components

### 3.7 Rich Text Editor Security (F13)

- **MUST**: Content sanitized via DOMPurify or equivalent
- **MUST**: XSS prevention: no script tags, no event handlers in user content
- **MUST**: Image uploads via B22 file management (same security rules)
- **MUST**: Markdown support with safe renderer (no arbitrary HTML)

---

## Section 4: Data & ML Platform (D01-D16) — Optional Power-up

### 4.1 Data Governance (D01-D05)

- **MUST**: Dataset lineage tracked for reproducibility (D03)
- **MUST**: Data quality validation before processing (D06)
- **MUST**: Schema contracts versioned (D04) - breaking changes require migration path
- **MUST**: Retention policies enforced (D06) - no indefinite data storage without justification

### 4.2 Tool-Call Logging & Redaction (D07)

- **MUST**: All AI agent tool calls logged for audit trail
- **MUST**: Sensitive data redacted in logs (secrets, PII, credentials)
- **MUST**: Logs include: timestamp, agent ID, tool name, input/output (redacted), success/error
- **MUST**: Log retention policy configured (default: 90 days)

### 4.3 Prompt Versioning (D08, D13)

- **MUST**: All production prompts versioned via D13 prompt template library
- **MUST**: Prompt changes tracked in version control
- **MUST**: A/B testing via D08 prompt experiments before production rollout
- **MUST**: No production prompts without evaluation (D09)

### 4.4 Model Governance (D12, D16)

- **MUST**: Models registered in D12 model registry with metadata (version, stage, metrics)
- **MUST**: Stage transitions (dev → staging → prod) require approval
- **MUST**: Production models have D16 monitoring active (drift detection, performance metrics)
- **MUST**: No production deployment without passing D09 evaluation

### 4.5 Agent Safety (D14, D16)

- **MUST**: Agent token budgets enforced (no runaway LLM costs)
- **MUST**: Agent tool calls have permissions checks (no privilege escalation)
- **MUST**: Agent runs monitored via D16 (timeout, error rate, token usage)
- **MUST**: Agent feedback loop active (human review of agent outputs)

### 4.6 Vector Search Privacy (D15)

- **MUST**: Vector embeddings respect tenant isolation (no cross-tenant similarity search)
- **MUST**: Embedding models documented (version, provider, update policy)
- **MUST**: RAG retrieval results filtered by user permissions (no unauthorized document access)

---

## Section 5: Platform Quality Gates (P01-P05) — Lightweight

### 5.1 Constitutional Compliance (P01)

- **MUST**: P01 engine validates all constitution rules automatically
- **MUST**: CI fails if constitutional violations detected
- **MUST**: F10 Development Dashboard shows real-time compliance scorecard
- **MUST**: Constitution violations treated as critical bugs

### 5.2 Security Audit (P02)

- **MUST**: OWASP ASVS top 20 critical checks pass (20/20)
- **MUST**: Dependency scanning (pip-audit) runs in CI (zero critical CVEs)
- **MUST**: Static analysis (bandit) passes with zero high-severity issues
- **MUST**: Security scorecard visible in F10 dashboard

### 5.3 ML Governance (P03)

- **MUST**: Evaluation gates enforced (no prod deployment without D09 evaluation)
- **MUST**: Prompt versioning validated (all prod prompts in D13)
- **MUST**: Tool-call redaction verified (D07 logs pass redaction tests)
- **MUST**: ML governance scorecard visible in F10 dashboard

### 5.4 Integration Security (P04)

- **MUST**: Webhook signatures verified (all integrations)
- **MUST**: Credential rotation policy documented (I01 connectors)
- **MUST**: Connector permissions validated (no over-privileged integrations)
- **MUST**: Integration security scorecard visible in F10 dashboard

### 5.5 Dependency Health (P05)

- **MUST**: Dependencies updated quarterly (security patches applied immediately)
- **MUST**: Deprecated dependencies replaced before EOL
- **MUST**: Zero critical CVEs in production dependencies
- **MUST**: Dependency health scorecard visible in F10 dashboard

---

## Section 6: Integration & Operations (I01-I02, O01)

### 6.1 Connector Framework (I01)

- **MUST**: Connectors manifest-based (no arbitrary code execution without review)
- **MUST**: Connector permissions scoped (least privilege)
- **MUST**: Connector health checks active (periodic validation)
- **MUST**: Connector errors logged via B09 audit logging

### 6.2 Compliance Exports (I02)

- **MUST**: GDPR data export templates include all user data
- **MUST**: Audit bundles include all B09 audit events for timeframe
- **MUST**: Export generation rate-limited per tenant
- **MUST**: Exported data encrypted at rest (storage via B22)

### 6.3 Resilience Testing (O01)

- **MUST**: Retry logic validated (exponential backoff patterns)
- **MUST**: Circuit breakers functional (fail fast on downstream errors)
- **MUST**: Graceful degradation tested (core features work when optional services down)
- **MUST**: Resilience scorecard visible in F10 dashboard

---

## Section 7: Demo Discipline (F10 Demo Shell)

### 7.1 Demo App is Fully Functional

- **MUST**: Demo app is NOT just UI mockups - it's a **fully working application**
- **MUST**: Demo app uses real database (PostgreSQL via Docker Compose, SQLite fallback optional)
- **MUST**: All features (B01-B68) work end-to-end in demo app
- **MUST**: Demo app has realistic seed data for client demos
- **MUST**: Demo app includes pre-seeded accounts + working signup/login flows

### 7.2 Demo-First Development

- **MUST**: Every user-facing module has a demo page in `examples/demo-shell/`
- **MUST**: Technical modules (storage adapters, quality gates) show scorecards in F10 dashboard only
- **MUST**: Demo pages validate core contracts (auth flows, context switching, CRUD operations)
- **MUST**: New modules (Fase 8+) add demo functionality immediately, not as afterthought

### 7.3 Demo Page Requirements

- **MUST**: Demo pages use F01 design system components
- **MUST**: Demo pages show realistic data from seed database (not Lorem Ipsum)
- **MUST**: Demo pages include error states and loading states
- **MUST**: Demo pages responsive (mobile, tablet, desktop)
- **MUST**: Demo pages have real backend integration (API calls, database queries)

### 7.4 Seed Data Management

- **MUST**: `python manage.py seed_demo_data` creates realistic demo scenario
  - 5 organizations (diverse: startup, SMB, enterprise profiles)
  - 20 users (various roles: admin, member, viewer across orgs)
  - 10-15 projects per organization
  - Realistic transactions, credits, audit events, notifications
- **MUST**: `python manage.py reset_demo_data` resets to clean demo state
- **MUST**: Demo accounts documented in README:
  - admin@demo.djangocore.app / Demo2024! (superuser)
  - user@demo.djangocore.app / Demo2024! (regular user)
- **MUST**: Seed data script idempotent (can run multiple times safely)

### 7.5 Demo Deployment

- **MUST**: `docker-compose up demo` starts complete demo stack (PostgreSQL + Redis + Django + Frontend)
- **MUST**: Demo environment isolated from dev/test/prod
- **SHOULD**: Hosted demo at demo.djangocore.app for client presentations (optional, future)
- **MUST**: Demo app startup time <60 seconds (including migrations + seed data)

---

## Section 8: Constitution Updates

### 8.1 Amendment Process

- **MUST**: Constitution updates follow semver (major = breaking change)
- **MUST**: Constitutional changes documented in CHANGELOG.md
- **MUST**: P01 engine updated to validate new rules
- **MUST**: Grace period for existing violations (30 days to fix after rule added)

### 8.2 Constitution Gates (Distributed)

- **Gate 1**: After Fase 8 (Post Demo Foundation) - Validate demo shell + visual development workflow
- **Gate 2**: After Fase 13 (Post ML & Agent Governance) - Validate data/ML/agent infrastructure
- **Gate 3**: After Fase 16 (Final Platform Validation) - Full 68-module compliance check

### 8.3 Living Document

- **MUST**: Constitution reviewed quarterly by technical leads
- **MUST**: AI agents provided with latest constitution version in context
- **MUST**: Constitution violations tracked in F10 Development Dashboard
- **MUST**: No "constitution exceptions" - fix the code or amend the constitution

---

## Section 9: Enforcement

### 9.1 Automated Enforcement

- **CI Pipeline**: Blocks merges on constitutional violations
- **P01 Engine**: Validates all rules programmatically
- **F10 Dashboard**: Real-time compliance visibility

### 9.2 Manual Review Triggers

- **Security changes**: Two-person review required (auth, permissions, encryption)
- **Constitution amendments**: Requires technical lead approval
- **AI-generated code**: Manual review before merge (design-to-code, agent outputs)

### 9.3 Severity Levels

- **CRITICAL**: Security violation, data loss risk, cross-tenant leakage → Block merge immediately
- **HIGH**: Test coverage below threshold, accessibility failure → Block merge
- **MEDIUM**: Documentation missing, linting errors → Warning, block after grace period
- **LOW**: Code style, optimization suggestions → Advisory only

---

## Glossary

- **Constitutional Enforcement Engine (P01)**: Automated rule validation system
- **Development Dashboard (F10)**: Real-time platform health and compliance UI
- **Quality Gates (P01-P05)**: Lightweight validation checkpoints in Fase 14
- **Constitution Gates**: Major validation milestones (after Fases 8, 13, 16)
- **Demo Discipline**: Requirement that all user-facing features have visual demos
- **Spec-Driven Development (SDD)**: Feature specification before implementation
- **80/20 Architecture**: Core-App provides 80% foundation, products add 20% domain logic

---

**End of Constitution v2.0.0**

This document is the **normative standard** for all Django Core-App development. Violations are bugs, not suggestions.
