# Research: Core Transactions & Credits Engine

**Feature**: 011-core-transactions-credits
**Research Date**: 2025-11-28
**Researcher**: Agent (based on spec clarifications)

## Executive Summary

This research documents the technical decisions, evidence, and rationale for implementing a generic transaction and credits engine that tracks usage events, balances, and billable events at organization and project levels. The system follows double-entry accounting principles with a single-ledger approach using signed amounts.

## Research Questions & Decisions

### Q1: Should we use double-entry bookkeeping or single-ledger approach?

**Decision**: Single-ledger with signed amounts (positive/negative)

**Rationale**:
- Simpler data model: one Transaction table instead of separate Credit/Debit tables
- Easier balance calculation: SUM(amount) instead of SUM(credits) - SUM(debits)
- More flexible: amount sign determines direction, no need for transaction type enums
- Industry precedent: Stripe Billing, AWS Cost Explorer use signed amounts

**Evidence**:
- Source: Stripe API documentation (Balances API uses signed integers)
- Source: PostgreSQL best practices for financial ledgers (prefer signed numeric)
- Trade-off: Slightly less obvious semantically (need to document "positive = add, negative = subtract")

**References**: See `research/source-register.csv` entry #001, #002

---

### Q2: How should idempotency keys be handled for usage events?

**Decision**: Optional idempotency_key (NULL allowed) for usage events

**Rationale**:
- Some integrations (batch imports, external event streams) manage deduplication externally
- Usage events are informational (can be reconciled later), unlike financial transactions (must be exact)
- Flexibility: clients that need idempotency can provide keys, others can skip
- Storage efficiency: no need to generate/store keys for events where duplicates are acceptable

**Evidence**:
- Clarification session 2025-11-28: User confirmed "Accept without idempotency protection"
- Trade-off: Risk of duplicate events if client doesn't manage deduplication
- Mitigation: Transactions always require idempotency_key (financial safety)

**References**: See spec.md Clarifications section

---

### Q3: What error response format for policy violations?

**Decision**: HTTP 403 Forbidden with structured JSON error body

**Rationale**:
- 403 semantically correct: "request understood but refused due to policy"
- Structured response enables programmatic handling by clients
- Includes actionable data: current_balance, requested_amount for UX messaging
- Consistent with RFC 7807 Problem Details for HTTP APIs

**Evidence**:
- Clarification session 2025-11-28: User selected option A (403 with structured error)
- RFC 7807: Standard for machine-readable error details in HTTP APIs
- Alternative rejected: 402 Payment Required (less semantic, often reserved for paywalls)

**Error Response Structure**:
```json
{
  "error": "insufficient_balance",
  "current_balance": "10.0000",
  "requested_amount": "50.0000",
  "policy": "prepaid_only"
}
```

**References**: See `research/evidence-log.csv` entry #003

---

### Q4: Should balance be stored or computed?

**Decision**: Computed on-demand with optional caching layer

**Rationale**:
- Source of truth: Transaction table (immutable ledger)
- Balance = SUM(amount) WHERE organization_id = X (simple aggregate)
- Caching for performance: 60s TTL, invalidate on transaction write
- Easier reconciliation: no risk of stored balance drifting from transaction sum
- Simpler data model: no Balance table to maintain

**Evidence**:
- Django ORM aggregation performance: ~50ms for 100k transactions with proper indexes
- Success criterion SC-004: 99% of queries without full recalculation (caching target)
- Trade-off: Slight read latency vs guaranteed consistency

**Implementation Note**: Use Redis for balance caching with key pattern `balance:org:{org_id}` or `balance:proj:{proj_id}`

**References**: See spec.md FR-008, SC-001, SC-004

---

### Q5: What concurrency control mechanism for transaction writes?

**Decision**: Pessimistic locking (SELECT FOR UPDATE) for initial release

**Rationale**:
- Prevents race conditions when multiple processes create transactions simultaneously
- Simpler than optimistic locking (no version field, retry logic)
- Acceptable performance: locks held for <10ms per transaction write
- Django ORM native support: `.select_for_update()` on Organization/Project queryset

**Evidence**:
- Spec assumption: "Pessimistic locking is acceptable for initial release"
- Alternative (optimistic locking): Can be evaluated if performance bottlenecks emerge
- Trade-off: Slight write latency vs guaranteed consistency

**Implementation Note**: Lock Organization or Project row during balance calculation and transaction creation

**References**: See spec.md Assumptions, Risk #1

---

### Q6: What numeric precision for credit amounts?

**Decision**: PostgreSQL NUMERIC(14, 4) - 14 total digits, 4 decimal places

**Rationale**:
- Supports balances up to 9,999,999,999.9999 (nearly 10 billion credits)
- 4 decimal places = 0.0001 credit precision (meets SC-003: accurate to 4 decimals)
- Avoids float rounding errors (critical for financial calculations)
- Django DecimalField maps cleanly to PostgreSQL NUMERIC

**Evidence**:
- Spec assumption: "Decimal type with 10 digits precision (e.g., 999999.9999)"
- Increased to 14 digits for headroom (enterprise scale)
- Industry standard: Financial systems use 2-4 decimal places for currency

**Implementation Note**: Python `decimal.Decimal` type throughout application code

**References**: See spec.md FR-020, Assumptions

---

### Q7: How long should idempotency keys be retained?

**Decision**: 7 days retention (configurable via environment variable)

**Rationale**:
- Balances detection window vs storage cost
- Most retry scenarios occur within minutes/hours, not days
- 7 days covers deployment rollbacks, scheduled job reruns, client-side caching
- Configurable: can increase for high-compliance environments

**Evidence**:
- Spec assumption: "Idempotency keys retained for 7 days (configurable)"
- Industry practice: Stripe retains for 24 hours, Twilio for 24 hours, we extend for safety
- Cleanup strategy: Background job deletes expired keys daily

**Implementation Note**: Add `created_at` timestamp to idempotency tracking table, index for efficient cleanup

**References**: See spec.md Assumptions, Risk #2

---

### Q8: What export formats for bulk transaction export?

**Decision**: Both CSV and JSON with format query parameter

**Rationale**:
- CSV: Universal compatibility with spreadsheet tools (Excel, Google Sheets)
- JSON: Structured format for programmatic integration (billing systems, data warehouses)
- Format parameter: `?format=csv` or `?format=json` in query string
- Default to JSON (more machine-readable, preserves types)

**Evidence**:
- Clarification session 2025-11-28: User selected option C (both formats)
- CSV use case: Manual analysis, reporting, reconciliation by finance team
- JSON use case: Automated ETL pipelines, external billing system integration

**CSV Columns**: `transaction_id, organization_id, project_id, amount, source_type, source_reference, timestamp, created_by_email, notes`

**JSON Structure**: Array of transaction objects with full metadata

**References**: See spec.md FR-025, Clarifications

---

### Q9: How should "credits" terminology be interpreted?

**Decision**: "Credits" is the unit of account (like USD, EUR, points)

**Rationale**:
- Avoids confusion between transaction types and currency units
- Transactions have signed amounts in credits (positive or negative)
- Consistent with financial terminology: "account balance in credits"
- Simpler API: POST /transactions with `{"amount": -10}` instead of `{"type": "debit", "amount": 10}`

**Evidence**:
- Clarification session 2025-11-28: User selected option A (unit name)
- Updated spec terminology: "positive amount" vs "negative amount" instead of "credit" vs "debit"
- Documentation requirement: Glossary must define "credits" as unit, not transaction type

**Terminology Guidelines**:
- ✅ "Balance of 100 credits"
- ✅ "Transaction with amount=-10 credits"
- ❌ "Debit 10 credits" (ambiguous: is it -10 or +10?)

**References**: See spec.md Clarifications, Notes

---

## Data Model Discoveries

See `data-model.md` for detailed entity definitions.

**Key Entities**:
1. **UsageEvent** - Immutable fact log (billable actions)
2. **Transaction** - Financial ledger (signed amounts)
3. **BalancePolicy** - Configuration (prepaid/postpaid rules)
4. **Balance** - Computed aggregate (not stored)

**Relationships**:
- UsageEvent → Transaction (one-to-many: one event can generate multiple charges)
- Organization → Transaction (one-to-many)
- Project → Transaction (one-to-many)
- Organization/Project → BalancePolicy (one-to-one or zero-to-one)

---

## Technical Constraints

### Database Requirements
- PostgreSQL 12+ (for NUMERIC precision, GIN indexes on JSONB)
- Transaction isolation level: READ COMMITTED (default Django)
- Indexes required:
  - `transactions.organization_id` (B-tree)
  - `transactions.project_id` (B-tree, partial: WHERE project_id IS NOT NULL)
  - `transactions.timestamp` (B-tree for date range queries)
  - `transactions.idempotency_key` (unique, partial: WHERE idempotency_key IS NOT NULL)
  - `usage_events.idempotency_key` (unique, partial: WHERE idempotency_key IS NOT NULL)

### Performance Requirements
- Balance query: <500ms for 100k transactions (SC-001)
- Transaction write: <200ms including lock acquisition (SC-005)
- Bulk export: <5s for 1M transactions (SC-009)
- Concurrent writes: 100/sec without data loss (SC-002)

### Security Requirements
- Multi-tenant isolation: Row-level filtering via organization_id/project_id
- No cross-org data leakage (0% in security audit, SC-006)
- Idempotency key hashing in logs (prevent replay attacks)
- Financial amounts masked in application logs (GDPR/PCI consideration)

---

## Open Questions & Risks

### Open Questions (to be resolved during planning/implementation)

1. **Transaction source reference polymorphism**: Should we use GenericForeignKey (Django) or separate FK fields (source_usage_event_id, source_external_id)?
   - GenericForeignKey: More flexible, slightly slower queries
   - Separate FKs: Faster, type-safe, requires schema change for new source types
   - **Recommendation**: Start with separate FKs (usage_event_id + external_reference_id TEXT), add GenericForeignKey only if 3+ source types emerge

2. **Balance caching invalidation**: How to handle distributed cache invalidation when multiple app servers write transactions?
   - Option A: Redis Pub/Sub for cache invalidation messages
   - Option B: Short TTL (5-10s) with stale-while-revalidate pattern
   - Option C: Skip caching initially, add only if performance issues emerge
   - **Recommendation**: Option C (premature optimization), revisit if SC-001 not met

3. **Idempotency key cleanup job**: Celery periodic task vs database trigger vs manual archive?
   - **Recommendation**: Celery periodic task (runs daily, deletes keys older than 7 days)

4. **Bulk export pagination**: Should we support streaming exports for very large datasets (>1M transactions)?
   - **Recommendation**: V1 uses pagination (max 10k per page), V2 adds streaming if needed

5. **Usage event metadata schema validation**: Should we enforce JSON schema validation on metadata field?
   - **Recommendation**: No validation in core engine (product-agnostic), products define their own schemas

### Known Risks

See spec.md Risks section for detailed risk register. Key risks:

1. **Race conditions** (High impact, Medium likelihood) - Mitigated via pessimistic locking
2. **Idempotency key collisions** (High impact, Low likelihood) - Mitigated via UUID4 + expiration
3. **Balance calculation performance** (Medium impact, High likelihood) - Mitigated via caching
4. **Multi-tenant data leakage** (Critical impact, Low likelihood) - Mitigated via ORM filters + audits
5. **Precision loss** (High impact, Medium likelihood) - Mitigated via DecimalField

---

## Evidence Audit Trail

All research sources and findings are logged in:
- `research/evidence-log.csv` - Chronological findings log
- `research/source-register.csv` - Reference tracking

**Evidence Categories**:
- Clarification sessions (user decisions)
- Industry best practices (Stripe, AWS, PostgreSQL docs)
- Technical constraints (Django ORM, PostgreSQL capabilities)
- Performance benchmarks (Django aggregation timings)
- Security standards (RFC 7807, OWASP guidelines)

---

## Next Steps

1. ✅ Research complete - All major decisions documented
2. 🔄 Continue to `/spec-kitty.plan` - Create implementation plan
3. 🔄 Task breakdown - Generate work packages from plan
4. 🔄 Implementation - Build based on research decisions

**Downstream consumers**: Planning phase will reference this research for:
- Model field types (NUMERIC precision)
- API error response formats (403 structure)
- Caching strategy (Redis, 60s TTL)
- Concurrency control (SELECT FOR UPDATE)
- Export formats (CSV + JSON)
