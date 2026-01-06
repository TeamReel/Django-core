# Django Core-App Engineering Constitution

**Version**: 2.1.0
**Last Updated**: 2026-01-05
**Scope**: All 72 modules across 18 development phases

---

## Purpose

This constitution defines **non-negotiable engineering standards** for the Django Core-App platform. These rules ensure quality, security and maintainability even when built by non-programmers using AI agents.

**Who enforces this?**
- **P01 Constitutional Enforcement Engine** (Phase 16) validates compliance automatically
- **CI/CD pipelines** block merges that violate constitutional rules
- **Development Dashboard** (Phase 10) shows real-time compliance status

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

## Section 2: Backend Standards (B01-B29)

### 2.1 Testing Requirements

- **MUST**: ≥90% test coverage for backend core modules (B01-B21)
- **MUST**: ≥85% test coverage for backend extension modules (B22-B29)
- **MUST**: Zero flaky tests in CI (tests must be deterministic)
- **MUST**: All API endpoints have integration tests

### 2.2 Security Baseline

- **MUST**: All endpoints require authentication by default (deny-by-default)
- **MUST**: All data access filtered by Organization/Tenant ID
- **MUST**: No secrets in code (use environment variables)
- **MUST**: Dependencies scanned for vulnerabilities (Phase 16)

### 2.3 Code Quality

- **MUST**: Type hints on all function signatures (Python)
- **MUST**: Docstrings for all public classes and methods
- **MUST**: No circular imports
- **MUST**: Max cyclomatic complexity < 10

---

## Section 3: Frontend Standards (F01-F15)

### 3.1 Component Design

- **MUST**: Components must be accessible (WCAG 2.1 AA)
- **MUST**: Components must be responsive (Mobile-first)
- **MUST**: No hardcoded strings (use i18n keys)
- **MUST**: Use Design System tokens for colors/spacing (no magic numbers)

### 3.2 State Management

- **MUST**: Server state managed by React Query
- **MUST**: Client state minimized (Zustand/Context)
- **MUST**: No prop drilling > 2 levels (use Composition or Context)

---

## Section 4: Data & AI Standards (D01-D16)

### 4.1 Data Governance

- **MUST**: All PII data fields explicitly tagged
- **MUST**: Data retention policies defined for all datasets
- **MUST**: Schema changes must be backward compatible

### 4.2 AI Safety

- **MUST**: All AI outputs must be traceable to source/prompt
- **MUST**: Human-in-the-loop capability for critical actions
- **MUST**: Model versioning for reproducibility

---

## Section 5: Operational Standards (O01)

### 5.1 Observability

- **MUST**: Structured logging for all errors and warnings
- **MUST**: Health checks for all services
- **MUST**: Zero-downtime deployment capability

### 5.2 Documentation

- **MUST**: README for every module
- **MUST**: API documentation (OpenAPI/Swagger) auto-generated
- **MUST**: Architecture Decision Records (ADRs) for major choices
