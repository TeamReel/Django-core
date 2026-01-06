# Design Principles

These 9 principles guide every architectural and product decision in the Django Core-App.

## 1. 80/20 Architecture
*   **80% of modern web app needs** are covered by the Core-App foundation.
*   **20% of unique business logic** is added by downstream products.
*   Clear boundaries between platform and product.

## 2. Complete Modern Web Platform
*   **Content layer**: Rich text editing, file/media management, document generation.
*   **Real-time layer**: WebSockets, live updates, presence.
*   **Intelligence layer**: AI agents, ML operations, vector search (the enhancement, not the foundation).

## 3. Design-to-Code Workflow
*   Wireframe-to-component pipeline.
*   AI-generated designs use F01 design system tokens.
*   Designer-developer collaboration without friction.

## 4. Fully Functional Demo App
*   The Demo app is NOT a mockup - it's a **production-ready reference implementation**.
*   It validates the platform quality through real-world usage.

## 5. Security & Multi-Tenancy by Default
*   OWASP-ASVS baseline, brute-force protection, audit logging.
*   Strict vs advisory enforcement modes for different maturity stages.

## 6. Constitutional Governance for Non-Programmers
*   Constitution + Spec-Driven Development (SDD) as normative workflow.
*   Every feature traceable: spec → plan → tasks → implementation → tests.

## 7. Modern, Fast, Flexible, High-Quality
*   **Modern**: Latest patterns (WebSockets, vector search, AI agents, design-to-code).
*   **Quality**: Development dashboard with live metrics (coverage, security, performance).

## 8. Progressive Platform Layers
*   **Phase 1-5**: Backend core (security, multi-tenancy, APIs).
*   **Platform maturity 8–13**: Quality gates → data foundations → ML/AI → integration → hardening.

## 9. Developer Experience (DX)
*   Predictable project structure and scaffolding CLI.
*   Opinionated but not suffocating: “guardrails, not walls”.
