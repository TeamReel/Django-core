# Quality Standards

The Core-App's 80% foundation must meet production-grade standards so client applications inherit quality by default.

## 1. Security & Privacy
*   **OWASP ASVS baseline**: Enforced through B03 security baseline and P03 ACL refactor gate.
*   **Tenant isolation**: Validated in every quality gate (P01-P04).
*   **Privacy by design**: D06 retention policies, redaction by default in logs/traces.
*   **Secrets management**: D08 external credentials, never hardcoded.

## 2. Modern Web Capabilities
*   **Real-time updates**: Via WebSockets for live dashboards and collaboration.
*   **Rich content editing**: For CMS and content-heavy applications.
*   **File/media management**: With upload, processing and CDN-ready patterns.
*   **Workflow engine**: For approval processes and business logic.
*   **Advanced reporting**: With custom dashboards and saved queries.

## 3. Data & ML Governance (Optional Layer)
*   **Data cataloging & lineage**: (D01, D05) for data-intensive apps.
*   **Quality validation**: (D03) before data processing.
*   **Schema contracts**: (D04) prevent breaking changes.
*   **Model evaluation**: (D16) before ML model deployment.
*   **Agent monitoring**: (D16) for LLM safety and performance.

## 4. Performance & Scalability
*   **Async processing**: (B15) for heavy workloads and background jobs.
*   **Real-time infrastructure**: For WebSocket connections.
*   **Horizontal scaling**: Via containerization (B19).
*   **Caching strategies**: Documented in integration guides (F09).

## 5. Observability & Developer Experience
*   **Development dashboard**: (F10) with real-time platform health, test coverage, CI status.
*   **Health checks**: (B18) for all critical services.
*   **Audit logging**: (B09) for security events.
*   **Metrics & tracing**: For backend, tasks, real-time connections.
*   **Error tracking**: And alerting integrated in frontend (F04-F05).

## 6. Accessibility & Internationalization
*   **WCAG 2.1 AA compliance**: In frontend design system (F01).
*   **Multi-language support**: (B04, B12) for global deployment.
*   **Responsive design**: In page templates (F06).
*   **Keyboard navigation**: And screen reader compatibility.

## 7. Constitutional Compliance (Quality Without Expertise)
*   **≥90% test coverage**: For backend core (P02 testing gate).
*   **≥85% test coverage**: For frontend (P02 testing gate).
*   **Zero flaky tests**: In CI (constitution requirement).
*   **Security scans pass**: Before merge (B03 + P03).
*   **Development dashboard**: Shows compliance in real-time (F10).
