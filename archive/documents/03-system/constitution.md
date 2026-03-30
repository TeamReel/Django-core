# Engineering Constitution

**Version**: 3.0.0
**Scope**: All backend apps (`src/`) and frontend (`demo/src/`)

---

## Purpose

This constitution defines **non-negotiable engineering standards** for the platform. These rules ensure quality, security and maintainability when building with AI agents.

**How is this enforced?**
- **`.github/instructions/` files** auto-attach rules by file pattern
- **AI agents** follow these rules during implementation
- **Code Review agent** validates against these standards
- **Manual verification**: `pytest`, `npx tsc --noEmit`, `npx vite build`

---

## Section 1: Foundational Principles

### 1.1 80/20 Architecture

- **MUST**: The core provides 80% reusable infrastructure
- **MUST**: Product-specific logic (TeamReel) stays in clearly separated apps
- **MUST**: All core modules remain reusable across products

### 1.2 Spec-Driven Development (SDD)

- **MUST**: New features and modules start with a spec in `documents/02-roadmap/modules/`
- **MUST**: Quick items (≤4 hours) use the Q-item format
- **MUST**: Bug fixes include a regression test
- **MUST**: No feature merges without tests

### 1.3 Quality Through Governance

- **MUST**: AI agents build under rules defined in `.github/instructions/`
- **MUST**: Quality is structurally enforced via conventions, not individual skill

---

## Section 2: Backend Standards

### 2.1 Testing Requirements

- **MUST**: Every feature has tests (pytest)
- **MUST**: Every bugfix includes a regression test
- **MUST**: All API endpoints have integration tests

### 2.2 Security Baseline

- **MUST**: All endpoints require authentication by default (deny-by-default)
- **MUST**: All data access filtered by Organisation (org-scoped querysets)
- **MUST**: `permission_classes` on every ViewSet
- **MUST**: No secrets in code (use environment variables)
- **MUST**: Safe migrations only — never drop tables

### 2.3 Code Quality

- **MUST**: Type hints on all function signatures
- **MUST**: No `any` types
- **MUST**: `select_related`/`prefetch_related` on all ViewSets — no N+1 queries
- **MUST**: No circular imports

---

## Section 3: Frontend Standards

### 3.1 Component Design

- **MUST**: Components must be accessible (WCAG 2.1 AA)
- **MUST**: Components must be responsive (mobile-first)
- **MUST**: Use design tokens for colors/spacing — no hardcoded values
- **MUST**: `:focus-visible` on interactive elements
- **MUST**: Touch targets >= 44x44px
- **MUST**: `@media (prefers-reduced-motion: reduce)` on animations

### 3.2 State & Data

- **MUST**: Server state managed by `@tanstack/react-query`
- **MUST**: TypeScript strict mode — no `any`
- **MUST**: Interfaces for all API responses

---

## Section 4: Operational Standards

### 4.1 Deployment

- **MUST**: Backend deploys to Railway via push to `main`
- **MUST**: Frontend deploys to Vercel via push to `main`
- **MUST**: Database migrations run manually after deploy

### 4.2 Documentation

- **MUST**: Architecture Decision Records (ADRs) for major choices
- **MUST**: Specs for new features in `documents/02-roadmap/modules/`
- **MUST**: Conventional commits on `main`
