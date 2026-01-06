# System Architecture

## 1. The 5-Layer Model

The Core-App is organized into **5 major layers** spanning **72 modules** across **18 development phases**. This layered approach ensures a clean separation of concerns, where higher layers build upon the stable foundation of lower layers.

### Layer 1: Backend Core (Foundation)
**Phases 1–5** | *The Invisible Foundation*

This layer provides the non-negotiable infrastructure required by every SaaS application. It is "invisible" to the end-user but critical for security, scalability, and operations.

*   **Phase 1: Foundation & Governance**: Project skeleton, CI/CD, Docker.
*   **Phase 2: Identity & Multi-Tenancy**: Users, Organizations, RBAC.
*   **Phase 3: Configuration & Audit**: Settings, Audit Logging, Transactions.
*   **Phase 4: Interfaces & Communication**: API standards, Notifications, Tasks.
*   **Phase 5: Operationalisation**: Observability, Deployment, Documentation.

### Layer 2: Frontend Core (UX)
**Phases 6–7** | *The Visible Interface*

This layer provides the visual components and design system that consume Layer 1 APIs. It ensures a consistent, accessible, and brandable user experience.

*   **Phase 6: Frontend Foundations**: Design System, Auth UI, Navigation.
*   **Phase 7: Frontend Resources**: Usage meters, Alerts, Integration guides.

### Layer 3: Extended Capabilities (Application)
**Phases 8–12** | *The Application Features*

This layer adds the rich features expected in modern applications, moving beyond basic CRUD to complex interactions and workflows.

*   **Phase 8: Demo Foundation**: The "Demo Shell" proving the system works.
*   **Phase 9: Backend Infrastructure**: Files, Real-time, Search, Caching.
*   **Phase 10: Frontend & Visual Dev**: Design-to-code pipeline.
*   **Phase 11: Workflows & Payments**: State machines, Payment adapters.
*   **Phase 12: Advanced UI**: Admin panels, Reporting, Forms.

### Layer 4: Data & Intelligence (AI Platform)
**Phases 13–15** | *The Intelligent Core*

This layer transforms the application from a data-entry system into an intelligent platform capable of processing data, running AI agents, and managing models.

*   **Phase 13: Data Foundations I**: Storage, ETL, Lineage.
*   **Phase 14: Data Foundations II**: Validation, Logging, Experiments.
*   **Phase 15: ML/AI Platform**: Feature engineering, Model registry, Agents.

### Layer 5: Quality & Operations (Governance)
**Phases 16–18** | *The Guardrails*

This layer provides the automated governance, security gates, and integration frameworks that ensure the platform remains stable and secure at scale.

*   **Phase 16: Platform Quality Gates**: Security audits, Governance.
*   **Phase 17: Integration Ecosystem**: Connectors, Compliance exports.
*   **Phase 18: Operations & Resilience**: Health validation, Resilience testing.

---

## 2. Module Design Principles

Each module within these layers is designed according to the **Product-Agnostic Principle**:

1.  **Self-Contained**: Modules manage their own data models and logic.
2.  **Loosely Coupled**: Communication between modules happens via defined public interfaces (Service Layer).
3.  **Extensible**: Behavior can be customized via Settings (B10) or Feature Flags without forking the code.
4.  **Replaceable**: Interfaces allow swapping implementations (e.g., changing the Email Provider or Storage Backend).

## 3. Data Flow Architecture

The system follows a strict unidirectional data flow:

1.  **Client (Frontend/API)**: Initiates a request.
2.  **Interface Layer (Views/Serializers)**: Validates input and permissions.
3.  **Service Layer (Business Logic)**: Orchestrates the operation.
4.  **Data Layer (Models/ORM)**: Persists state to the database.
5.  **Event Layer (Signals/Bus)**: Emits side-effects (Audit Logs, Notifications) asynchronously.

See [Stack](stack.md) for the specific technologies implementing this architecture.
