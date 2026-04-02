# B11: Core Transactions & Credits

**Phase:** 3
**Status:** ✅ Done
**Module ID:** 011
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 11. B11 – Core Transactions & Credits

**Doel**: Generic transactions engine voor credits, usage en billable events.

**Status**: ✅ Complete

**Key Features**:
- Transaction model (double-entry bookkeeping patterns)
- Credit balance tracking per organization/project
- Usage events logging
- Transaction history and reporting
- Idempotency keys for financial operations

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Core Transactions & Credits Engine

**Feature Branch**: `011-core-transactions-credits`
**Created**: 2025-11-28
**Status**: Draft
**Input**: User description: "Introduce a generic transaction and credits engine to track usage, balances and billable events at organisation and project level"

## Clarifications

### Session 2025-11-28

- Q: When a debit transaction violates a prepaid-only policy (balance would go negative), what HTTP status code and response structure should the API return? → A: 403 Forbidden with `{"error": "insufficient_balance", "current_balance": 10, "requested_amount": 50}`
- Q: What format(s) should the bulk export API support for external billing system integration (FR-023)? → A: Both CSV and JSON (format parameter in query string)
- Q: When a usage event is recorded without an explicit idempotency_key, should the system auto-generate, reject, or accept without protection? → A: Accept without idempotency protection (client controls deduplication)
- Q: Should "credits" refer to the unit of account OR only positive transactions? → A: "Credits" is the unit name (like "USD") - transactions have positive/negative credit amounts

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Organization Credit Balance (Priority: P1)

As an organization administrator, I need to see my current credit balance so that I can monitor usage and plan capacity.

**Why this priority**: Core read operation - without this, the system provides no visibility into balances.

**Independent Test**: Can be fully tested by creating an organization with initial credits and querying the balance endpoint. Delivers immediate value: visibility into available resources.

**Acceptance Scenarios**:

1. **Given** an organization with 1000 credits balance, **When** an admin queries the balance, **Then** the system returns current balance, total positive amounts, total negative amounts, and last transaction timestamp
2. **Given** an organization with no transactions, **When** an admin queries the balance, **Then** the system returns zero balance with appropriate metadata
3. **Given** a project within an organization, **When** querying project balance, **Then** the system returns project-specific balance isolated from organization balance

---

### User Story 2 - Record Usage Events (Priority: P1)

As a product feature integration, I need to record usage events (e.g., "user ran analysis X") so that these events can be tracked for billing or reporting purposes.

**Why this priority**: Foundation for all usage tracking - must exist before any balance deductions can occur.

**Independent Test**: Can be tested by recording a usage event via API and verifying it's stored with all metadata (event type, user, timestamp, metadata). Event can be retrieved later for auditing.

**Acceptance Scenarios**:

1. **Given** an active project, **When** a usage event is recorded with event_type="analysis", metadata={"model": "gpt-4"}, **Then** the system stores the event with timestamp, user, and full metadata
2. **Given** duplicate event delivery (same idempotency_key), **When** the same event is submitted twice, **Then** only one event is recorded
3. **Given** a usage event for a non-existent project, **When** recording is attempted, **Then** the system rejects with appropriate error
4. **Given** a usage event without required metadata, **When** recording is attempted, **Then** the system validates and rejects incomplete events

---

### User Story 3 - Create Negative Transactions for Usage (Priority: P2)

As a billing engine integration, I need to create negative-amount transactions that reduce balances based on usage events.

**Why this priority**: Enables the financial layer - connects usage to credit consumption.

**Independent Test**: Can be tested by recording a usage event, creating a linked transaction with amount=-5, and verifying balance decreased by 5 credits.

**Acceptance Scenarios**:

1. **Given** an organization with 100 credits balance and a usage event, **When** a transaction with amount=-10 is created referencing that event, **Then** balance becomes 90 credits and transaction is linked to source event
2. **Given** a postpaid organization (negative balance allowed), **When** creating a transaction that would exceed available balance, **Then** balance goes negative without blocking
3. **Given** a prepaid-only organization, **When** attempting a negative transaction that would exceed balance, **Then** the system respects policy and either blocks or warns based on configuration
4. **Given** duplicate transaction submission (same idempotency_key), **When** the same transaction is submitted twice, **Then** only one transaction is recorded

---

### User Story 4 - Add Credits Balance (Priority: P2)

As an administrator or billing system, I need to add credits to an organization or project balance (purchase, grant, adjustment).

**Why this priority**: Enables balance increases - critical for prepaid workflows and manual adjustments.

**Independent Test**: Can be tested by adding credits (+500) to an organization and verifying balance increased, with transaction recorded showing source="purchase" or "adjustment".

**Acceptance Scenarios**:

1. **Given** an organization with 50 credits, **When** adding 100 credits with source="purchase", **Then** balance becomes 150 with transaction recorded
2. **Given** an organization with negative balance (-20 credits), **When** adding 50 credits, **Then** balance becomes 30
3. **Given** a manual adjustment scenario, **When** admin adds credits with source="adjustment" and reason="compensation", **Then** transaction is recorded with full audit metadata
4. **Given** a project, **When** adding credits at project level, **Then** project balance increases independently of organization balance

---

### User Story 5 - Query Transaction History (Priority: P3)

As an administrator or auditor, I need to view recent transaction history to understand balance changes and troubleshoot discrepancies.

**Why this priority**: Supports debugging and auditing - not critical for core functionality but important for operations.

**Independent Test**: Can be tested by creating several transactions (credits, debits) and querying history with filters (date range, transaction type).

**Acceptance Scenarios**:

1. **Given** an organization with 20 transactions, **When** querying history for last 30 days, **Then** system returns paginated list of transactions with amounts, timestamps, sources
2. **Given** a project with mixed transaction amounts, **When** filtering for negative amounts only, **Then** system returns only transactions with amount < 0
3. **Given** a transaction linked to a usage event, **When** viewing transaction details, **Then** source event metadata is included for audit trail
4. **Given** multi-tenant isolation, **When** user from Organization A queries transactions, **Then** only Organization A's transactions are visible (no cross-org leakage)

---

### User Story 6 - Balance Policy Decision Points (Priority: P3)

As a policy administrator, I need to configure whether negative balances are allowed (prepaid vs postpaid) so that business rules can be enforced.

**Why this priority**: Enables flexible billing models - can be implemented after core ledger is working.

**Independent Test**: Can be tested by configuring an organization as "prepaid-only" and verifying that debit transactions respect this policy (block or warn when balance would go negative).

**Acceptance Scenarios**:

1. **Given** an organization configured as prepaid-only, **When** attempting a transaction with negative amount that would result in negative balance, **Then** transaction is blocked with appropriate error (403 Forbidden)
2. **Given** an organization configured as postpaid, **When** creating a transaction with negative amount that exceeds available balance, **Then** transaction succeeds and balance goes negative
3. **Given** a policy configuration change (prepaid → postpaid), **When** querying current policy, **Then** system reflects updated policy without affecting historical transactions
4. **Given** a project with policy override, **When** project policy differs from organization, **Then** project-specific policy takes precedence

---

### Edge Cases

- **Concurrent transactions**: What happens when two processes try to write transactions affecting the same organization balance simultaneously? System must handle race conditions with database-level locking or optimistic concurrency control.
- **Orphaned usage events**: What happens when a usage event is recorded but never converted to a transaction? System should allow querying "unbilled" usage events.
- **Idempotency expiration**: How long are idempotency keys retained? System should define a retention policy (e.g., 7 days) after which duplicate detection is no longer guaranteed.
- **Zero-amount transactions**: Transactions with amount=0 are NOT supported and MUST be rejected at validation time (both at model CHECK constraint and API serializer level).
- **Deleted organizations/projects**: What happens to transactions when parent entity is soft-deleted? Transactions should remain accessible for audit but balance queries should handle deleted entities gracefully.
- **Very large balances**: How does system handle organizations with millions of credits? System should use appropriate numeric precision (decimal, not float) to avoid rounding errors.

## Requirements *(mandatory)*

### Functional Requirements

#### Usage Events
- **FR-001**: System MUST record usage events with event_type, timestamp, user, organization, project (optional), and arbitrary metadata (JSON)
- **FR-002**: System MUST support optional idempotent event recording via idempotency_key to prevent duplicate events from being stored (if client provides key)
- **FR-003**: System MUST accept usage events without idempotency_key and allow duplicates (client controls deduplication strategy)
- **FR-004**: System MUST link usage events to a source organization and optionally to a project for multi-tenant isolation
- **FR-005**: System MUST validate that referenced organizations and projects exist before accepting usage events
- **FR-006**: System MUST retain usage events indefinitely for audit purposes, independent of billing model changes

#### Transactions & Ledger
- **FR-007**: System MUST maintain a transaction ledger where "credits" is the unit of account (like USD or points) and transactions have signed amounts (positive=increase, negative=decrease)
- **FR-008**: System MUST link each transaction to a source: usage event, manual adjustment, external billing system, or other traceable origin
- **FR-009**: System MUST calculate current balance as sum of all transaction amounts for a given organization or project
- **FR-010**: System MUST support idempotent transaction writes via idempotency_key to prevent duplicate charges
- **FR-011**: System MUST record transaction metadata including timestamp, created_by user, source reference, and optional notes

#### Balance Queries
- **FR-012**: System MUST provide API to query current balance for an organization, returning: current balance, total positive amounts, total negative amounts, transaction count, last updated timestamp
- **FR-013**: System MUST provide API to query current balance for a project, isolated from organization balance
- **FR-014**: System MUST support querying transaction history with filters: date range, transaction amount sign (positive/negative), source type, pagination
- **FR-015**: System MUST ensure multi-tenant isolation: users can only query balances and transactions for organizations they have access to

#### Policy & Business Rules
- **FR-016**: System MUST define policy decision points: "can organization/project go negative?" and "warn threshold for low balance"
- **FR-017**: System MUST allow configuring per-organization policy: prepaid-only (block negative), postpaid (allow negative), or hybrid (warn but allow)
- **FR-018**: System MUST respect policy when processing debit transactions: block with 403 Forbidden response (including current_balance and requested_amount), warn, or allow based on configuration
- **FR-019**: System MUST return structured error responses for policy violations: `{"error": "insufficient_balance", "current_balance": <decimal>, "requested_amount": <decimal>}`
- **FR-020**: System MUST support project-level policy override (e.g., project is prepaid even if organization is postpaid)

#### Data Integrity & Performance
- **FR-021**: System MUST use database transactions to ensure balance updates are atomic (no partial updates)
- **FR-022**: System MUST use appropriate numeric precision (Decimal, not float) to avoid rounding errors in financial calculations
- **FR-023**: System MUST support concurrent transaction writes with appropriate locking or optimistic concurrency control
- **FR-024**: System MUST index key query paths: balance by organization, balance by project, transactions by date range
- **FR-025**: System MUST provide bulk export capability for external billing/ERP system integration with the following requirements:
  - Support both JSON and CSV output formats
  - Format selectable via query parameter `?format=json` or `?format=csv` (default: json)
  - Set appropriate Content-Type headers: `application/json` for JSON responses, `text/csv` for CSV responses
  - CSV format MUST include columns: transaction_id, organization_id, project_id, amount, source_type, timestamp, created_by_email, notes
  - JSON format MUST mirror Transaction serializer schema
  - Use streaming response for datasets larger than 10,000 rows to avoid memory issues

### Key Entities

- **UsageEvent**: Represents a billable or trackable action (e.g., "user ran analysis"). Attributes: event_type, user, organization, project (optional), metadata (JSON), timestamp, idempotency_key (optional - NULL if client doesn't provide). Immutable once created. **Audit note**: Links to source for traceability. **Idempotency note**: If idempotency_key is NULL, duplicate detection is disabled for that event.

- **Transaction**: Represents an amount change in the ledger where "credits" is the unit of account. Attributes: amount (signed decimal: positive=increase balance, negative=decrease balance), organization, project (optional), source_type (usage_event, adjustment, external_billing), source_reference (FK or external ID), timestamp, created_by, idempotency_key, notes. Immutable once created. **Audit note**: Each transaction must have traceable source. **Terminology note**: "Credits" is the currency unit; amount sign indicates direction.

- **Balance**: Calculated aggregate (not stored) representing sum of all transaction amounts for an organization or project. Attributes: current_balance, total_positive_amounts, total_negative_amounts, transaction_count, last_updated. Computed on-demand or cached.

- **BalancePolicy**: Configuration for billing rules. Attributes: organization, project (optional), allow_negative (boolean), warn_threshold (decimal), enforcement_mode (block, warn, allow). Mutable by administrators. **Scope note**: Balances exist at both organization AND project level with complete isolation. **Error response**: When enforcement_mode=block and balance insufficient, return 403 with structured error.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Analysis**: This is a generic transaction and usage engine with no product-specific pricing, features, or workflows. Any product can integrate by recording usage events and configuring policies. Extension points: event_type taxonomy (defined per product), metadata schema (arbitrary JSON), policy rules (configurable).

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Analysis**: New app `transactions/` or `billing_core/` with models for UsageEvent, Transaction, BalancePolicy. Depends on `organisations/` and `projects/` but introduces no reverse dependencies. API endpoints in `transactions/api/`, business logic in `transactions/services/`.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Analysis**: Standard Python 3.12+ type hints (e.g., `def record_usage_event(event_type: str, user: User, organization: Organisation, metadata: dict[str, Any]) -> UsageEvent`). Black and Ruff compliance enforced by pre-commit.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Analysis**: Unit tests for models (transaction calculations, idempotency), service layer tests (concurrent writes, policy enforcement), API tests (balance queries, transaction creation), integration tests (usage event → debit transaction flow). Target: 90% coverage.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Analysis**: Multi-tenant isolation enforced via organization/project FKs and permission checks (user must have access to organization to query balance). No financial amounts logged in plain text (use masked logging for sensitive data). Idempotency keys should be hashed or truncated in logs to prevent replay attacks.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Analysis**: Balance queries use aggregation (SUM) with single query. Transaction history uses pagination (default 50 items). Metrics: transaction write latency, balance query latency, usage event ingestion rate. Graceful degradation: if balance calculation fails, return cached value with warning flag. Idempotency prevents duplicate charges even under retries.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Analysis**: RESTful endpoints: `POST /api/usage-events/` (idempotency_key optional), `POST /api/transactions/`, `GET /api/organizations/{id}/balance/`, `GET /api/projects/{id}/balance/`, `GET /api/transactions/?organization_id=X&format=json|csv`. Serializers validate: required fields, FK references exist, numeric precision. Error responses follow RFC 7807 structure. OpenAPI schema generated via drf-spectacular. Policy violations return 403 with `{"error": "insufficient_balance", "current_balance": <decimal>, "requested_amount": <decimal>}`.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Analysis**: Documentation includes: API reference (usage event recording, transaction creation, balance queries), integration guide (how products hook into engine), policy configuration guide (prepaid vs postpaid). ADR needed for: idempotency key retention policy, numeric precision choice (Decimal vs BigInteger), balance calculation strategy (real-time vs cached).

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can query organization balance in under 500ms for organizations with up to 100,000 transactions
- **SC-002**: System handles 100 concurrent usage event writes without data loss or duplicate recording (idempotency verified)
- **SC-003**: Balance calculations are accurate to at least 4 decimal places (no rounding errors for financial precision)
- **SC-004**: Balance queries return data that is at most 60 seconds stale under normal operation (Redis cache with 60s TTL). On cache miss, the system MUST recompute balance from the transaction ledger before responding. 99% of queries should hit cache.
- **SC-005**: Transaction history API supports pagination and returns first page in under 200ms
- **SC-006**: System enforces multi-tenant isolation: users cannot access balances or transactions for organizations they don't belong to (0% cross-org leakage in security audit)
- **SC-007**: Idempotency mechanism prevents duplicate charges in at least 99.9% of retry scenarios (tested under simulated network failures)
- **SC-008**: Policy decision points (allow negative balance) are configurable per organization and respected in 100% of debit transactions
- **SC-009**: External billing system can export all transactions for a given date range in under 5 seconds for datasets up to 1 million transactions

## Assumptions *(mandatory)*

- **Initial scope**: Focus on core ledger (usage events, transactions, balances). Advanced features like currency conversion, tax calculation, invoicing are explicitly out of scope.
- **Billing integration**: Transactions can be exported to external billing systems (Stripe, Chargebee, custom ERP) but this feature does NOT implement payment processing or invoice generation.
- **Policy enforcement**: System provides policy decision points but does NOT implement complex pricing models (per-unit pricing, tiered pricing, proration). Products define their own pricing logic and use this engine to record debits.
- **Retention**: Usage events and transactions are retained indefinitely (no automatic deletion). Archival strategy is out of scope for initial release.
- **Idempotency retention**: Idempotency keys are retained for 7 days (configurable). After expiration, duplicate detection is no longer guaranteed. Usage events may omit idempotency_key (NULL) if client manages deduplication externally.
- **Numeric precision**: Decimal type with 10 digits precision (e.g., 999999.9999 max value) is sufficient for credit balances. \"Credits\" is the unit name (like USD or points), not a transaction type - amounts are signed.
- **Concurrency model**: Pessimistic locking (SELECT FOR UPDATE) is acceptable for balance updates during initial release. Optimistic locking can be evaluated if performance bottlenecks emerge.
- **Audit requirements**: Transaction source references (usage event ID, external billing ID) are sufficient for audit trail. Detailed change logs (who modified what) are handled by existing audit system (B09).

## Dependencies *(mandatory)*

### Upstream Dependencies
- **B06-organisation-management-multi**: Requires `Organisation` model with multi-tenant isolation. Transactions and balances are scoped to organizations.
- **B07-projects-workspaces-management**: Requires `Project` model. Transactions and balances can be scoped to projects within organizations.
- **B05-core-accounts-authentication**: Requires `User` model for recording who created transactions and usage events.

### Downstream Consumers
- Future billing/invoicing features will consume transaction data for generating invoices.
- Product features (AI model usage, storage quotas, API calls) will record usage events via this engine.
- Reporting/analytics features will aggregate usage and transaction data for dashboards.

### External Integrations
- External billing systems (Stripe, Chargebee, ERP) can import transaction data via bulk export API.
- Monitoring systems can scrape metrics endpoints for transaction volume, balance query latency.

## Out of Scope *(mandatory)*

- **Pricing models**: Per-unit pricing, tiered pricing, volume discounts, proration logic. Products define their own pricing and use this engine to record debits.
- **Payment processing**: Credit card charging, refunds, payment gateway integration. This is handled by external billing systems.
- **Invoicing**: Invoice generation, PDF creation, tax calculation, legal invoicing requirements. External billing systems handle this.
- **Currency conversion**: Multi-currency support, exchange rates. Assume single currency (credits or USD) for initial release.
- **Taxation**: VAT, sales tax calculation. External billing systems handle this.
- **Budgeting**: Spending limits, budget alerts, approval workflows. These are product-specific features that can be built on top of this engine.
- **Forecasting**: Usage prediction, capacity planning. Out of scope for core engine.
- **Disputes**: Chargeback handling, dispute resolution. External billing systems handle this.

## Risks & Mitigations *(optional)*

### Risk 1: Concurrent Transaction Race Conditions
**Impact**: High - Could lead to incorrect balances or duplicate charges.
**Likelihood**: Medium - Concurrent writes are common in multi-user systems.
**Mitigation**: Use database row-level locking (SELECT FOR UPDATE) when calculating and updating balances. Alternatively, use optimistic locking with version fields. Test thoroughly under simulated high concurrency.

### Risk 2: Idempotency Key Collision
**Impact**: High - Could prevent legitimate transactions or allow duplicate charges.
**Likelihood**: Low - UUIDs have very low collision probability, but malicious actors could replay keys.
**Mitigation**: Use cryptographically secure UUIDs (uuid4) for idempotency keys. Implement expiration policy (7 days) to prevent indefinite storage. Hash keys before logging to prevent replay attacks.

### Risk 3: Balance Calculation Performance Degradation
**Impact**: Medium - Slow balance queries degrade user experience.
**Likelihood**: High - As transaction count grows, SUM aggregation becomes slower.
**Mitigation**: Implement balance caching with invalidation on transaction write. Use materialized views or pre-computed balance snapshots for organizations with high transaction volume. Index transaction table by organization_id and timestamp.

### Risk 4: Multi-Tenant Data Leakage
**Impact**: Critical - Exposing one organization's balance to another violates privacy and trust.
**Likelihood**: Low - If permissions are implemented correctly.
**Mitigation**: Enforce organization/project scoping at ORM query level (never use raw SQL without filtering). Add automated tests for cross-org access attempts. Regular security audits and penetration testing.

### Risk 5: Precision Loss in Financial Calculations
**Impact**: High - Rounding errors accumulate over time, leading to incorrect balances.
**Likelihood**: Medium - Using float instead of Decimal causes precision issues.
**Mitigation**: Use Django DecimalField for all monetary amounts. Test edge cases (very small amounts, very large balances, many transactions). Periodically reconcile computed balance with raw transaction sum.

## Notes *(optional)*

- **Usage event taxonomy**: Event types (e.g., "ai_inference", "storage_gb_hour") should be documented but are NOT enforced at database level. Products define their own event types and metadata schemas.
- **Source reference polymorphism**: Transaction.source_reference can point to UsageEvent (internal) or external billing system ID (string). Consider using GenericForeignKey or separate FK fields based on implementation complexity.
- **Balance caching strategy**: For high-traffic organizations, consider caching balance with TTL=60s and invalidating on transaction write. Trade-off: slightly stale balance for better read performance.
- **Audit integration**: Leverage existing B09-audit-logging-system to record transaction creation, policy changes, and balance queries for compliance.
- **Metrics to track**: transaction_writes_total, transaction_write_latency_seconds, balance_queries_total, balance_query_latency_seconds, idempotency_key_collisions_total, policy_violations_total.
- **Extension point for prepaid enforcement**: Future feature could add real-time balance checks before allowing product usage (e.g., "block API call if balance < 0"). This requires product-level integration, not core engine responsibility.
- **Multi-tenant isolation explicit**: Balances exist at BOTH organization AND project level with complete isolation. No cross-org or cross-project visibility.
- **Ledger-to-source traceability**: Every transaction links to its source (usage event ID, adjustment reason, external billing reference) for debugging and audit.
- **Policy decision points**: For B11 core, we define the hooks ("what happens when balance < 0?"), but concrete product rules can be implemented in future features.
- **Terminology clarification**: "Credits" is the unit of account (like USD, EUR, or loyalty points). Transaction amounts are signed decimals where positive increases balance and negative decreases it. Avoid referring to "credit transactions" vs "debit transactions" - use "positive amount" vs "negative amount" instead.
- **Bulk export formats**: Export API supports both CSV (for spreadsheet tools) and JSON (for programmatic integration) via `?format=csv` or `?format=json` query parameter.
- **Idempotency key optionality**: Usage events accept NULL idempotency_key, allowing clients to manage deduplication externally if needed. Transactions always require idempotency_key for financial safety.
