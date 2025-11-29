# ADR-011-001: Single-Ledger vs Double-Entry Accounting

**Status**: Accepted
**Date**: 2025-11-28
**Decision Makers**: Engineering Team
**Feature**: 011-core-transactions-credits

## Context

Financial accounting systems traditionally use one of two approaches:

1. **Double-Entry Bookkeeping**: Every transaction has equal and opposite entries in two accounts (debit and credit). This is the standard for full accounting systems.

2. **Single-Ledger**: All transactions in one table with signed amounts (positive = credit, negative = debit).

For the Django Core transactions engine, we need to choose an approach that:
- Tracks account balances accurately
- Supports multiple billing models (prepaid, postpaid)
- Is simple to implement and maintain
- Performs well for balance queries
- Handles multi-tenant isolation cleanly

### Requirements Analysis

**Our Use Case**:
- Track usage-based billing and credits
- Support prepaid (block at zero) and postpaid (allow negative) models
- Query balances frequently (< 500ms SLA)
- Multi-tenant isolation by organization
- Not a full accounting system (no general ledger, no double-entry compliance)

**Double-Entry Considerations**:
- Pros: Audit trail, accounting standards compliance, built-in balance verification
- Cons: Complex schema (multiple tables), complex queries, overkill for our needs

**Single-Ledger Considerations**:
- Pros: Simple schema, fast queries, easy to understand
- Cons: No built-in verification, requires careful constraint design

## Decision

**We will use a single-ledger approach** with signed decimal amounts in one `Transaction` table.

### Implementation Details

```python
class Transaction(models.Model):
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        help_text="Signed amount: positive=credit, negative=debit"
    )
    # ... other fields
```

**Conventions**:
- **Positive amounts** (+100.00): Credits, deposits, purchases, refunds
- **Negative amounts** (-25.00): Debits, usage charges, fees
- **Balance calculation**: `SUM(amount)` across all transactions for an organization/project

**Example**:
```python
# Add $100 credit
Transaction.objects.create(amount=Decimal('100.0000'), ...)

# Charge $25 for usage
Transaction.objects.create(amount=Decimal('-25.0000'), ...)

# Balance = 100 + (-25) = 75
```

### Why Not Double-Entry?

We explicitly rejected double-entry bookkeeping because:

1. **Scope**: This is a usage tracking and credits system, not a full accounting platform
2. **Simplicity**: Single table queries are easier to write and optimize
3. **Performance**: No JOIN overhead for balance calculations
4. **Multi-tenancy**: Simpler to filter by organization/project
5. **Audit**: We achieve audit compliance through immutability and timestamps, not double-entry structure

## Consequences

### Positive

- **Simplicity**: One `Transaction` model, straightforward queries
- **Performance**: Fast balance queries with `SUM()` aggregation
- **Multi-tenant**: Easy to filter `WHERE organization_id = ?`
- **Developer Experience**: Easy to understand for all team members
- **Migration**: Simple schema with minimal tables

### Negative

- **No Built-in Verification**: Double-entry systems automatically detect errors (debits must equal credits). We lose this safety net.
  - *Mitigation*: Immutable records + CHECK constraints + comprehensive tests
- **Accounting Standards**: Not compliant with GAAP/IFRS for double-entry bookkeeping
  - *Mitigation*: Out of scope - this is usage billing, not financial accounting
- **Complex Transactions**: Can't easily model complex financial scenarios (e.g., multi-party splits)
  - *Mitigation*: Use multiple Transaction records if needed

### Neutral

- **Audit Trail**: Both approaches support audit logging equally well
- **Reporting**: Balance sheets and ledger reports require custom queries (true for either approach)
- **Immutability**: Transaction records are never updated or deleted (same for both approaches)

## Alternatives Considered

### 1. Double-Entry with Separate Credit/Debit Tables

**Schema**:
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    account_type VARCHAR(20) NOT NULL,  -- 'credit' or 'debit'
    amount NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    CONSTRAINT lines_per_txn CHECK (
        -- Each transaction must have equal credit and debit amounts
    )
);
```

**Rejected Because**:
- 2x tables to manage
- Complex queries: `SELECT ... FROM transactions JOIN transaction_lines ...`
- Harder to express "organization balance" query
- Over-engineered for our use case

### 2. Separate Credits and Debits Tables

**Schema**:
```sql
CREATE TABLE credits (
    id UUID PRIMARY KEY,
    amount NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    ...
);

CREATE TABLE debits (
    id UUID PRIMARY KEY,
    amount NUMERIC(14,4) NOT NULL CHECK (amount > 0),
    ...
);
```

**Rejected Because**:
- Balance query requires UNION: `SELECT SUM(amount) FROM credits UNION SELECT -SUM(amount) FROM debits`
- Schema duplication (same fields in both tables)
- Confusing: "Where do I query transactions?"

### 3. Signed Amounts with Type Flag

**Schema**:
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    amount NUMERIC(14,4) NOT NULL CHECK (amount > 0),  -- Always positive
    transaction_type VARCHAR(10) NOT NULL,  -- 'credit' or 'debit'
    ...
);
```

**Rejected Because**:
- Balance query: `SUM(CASE WHEN type='credit' THEN amount ELSE -amount END)`
- More complex than signed amounts
- Risk of bugs (positive amount + wrong type = incorrect balance)

## Related Decisions

- **ADR-011-002**: Computed Balance vs Stored Balance (depends on single-ledger simplicity)
- **ADR-011-003**: Idempotency Key Retention (immutability assumption)
- **ADR-011-004**: Redis Cache Strategy (optimized for `SUM()` queries)

## References

- Feature Spec: `kitty-specs/011-core-transactions-credits/spec.md`
- Data Model: `kitty-specs/011-core-transactions-credits/data-model.md`
- Django Decimal Field: https://docs.djangoproject.com/en/5.1/ref/models/fields/#decimalfield
- PostgreSQL NUMERIC: https://www.postgresql.org/docs/current/datatype-numeric.html

## Review History

- 2025-11-28: Initial decision (claude-assistant)
