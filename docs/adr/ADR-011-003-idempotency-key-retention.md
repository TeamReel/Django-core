# ADR-011-003: Idempotency Key Retention Policy

**Status**: Accepted
**Date**: 2025-11-28
**Decision Makers**: Engineering Team
**Feature**: 011-core-transactions-credits

## Context

Idempotency keys prevent duplicate processing of operations when clients retry requests. They are critical for financial transactions where duplicate charges are unacceptable.

Our system uses idempotency keys in two places:

1. **Transaction.idempotency_key** (REQUIRED): Prevents duplicate financial transactions
2. **UsageEvent.idempotency_key** (OPTIONAL): Prevents duplicate usage event logging

### The Problem

Idempotency keys must be stored to detect duplicates, but storing them forever has costs:

**Storage Cost**:
- Each key: ~50 bytes (UUID + index overhead)
- 1M transactions/month: 50MB/month
- 12 months: 600MB just for keys
- 10 years: 6GB of keys alone

**Index Performance**:
- Unique index on idempotency_key grows linearly
- Larger index = slower INSERT performance
- B-tree index on 100M keys = multiple GB RAM requirement

**Question**: How long should we retain idempotency keys?

### Requirements Analysis

**Idempotency Window**:
- Client retries typically happen within seconds/minutes
- Network timeouts: 30-60 seconds
- Client SDK retry logic: 3-5 attempts over 2-10 minutes
- Manual retries: Same day (< 24 hours)
- Edge case: Batch jobs might retry next day (< 48 hours)

**Financial Regulations**:
- Transaction immutability: REQUIRED (never delete transactions)
- Idempotency key retention: No specific requirement
- Audit trail: Must be able to prove no duplicates

**System Behavior**:
- After key expires: Duplicate request creates new transaction
- Risk: User retries very old request, gets charged twice

## Decision

**We will retain idempotency keys for different durations based on record type**:

### Transaction Idempotency Keys: NEVER DELETE

```python
# Transaction model
class Transaction(models.Model):
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        help_text="REQUIRED. Never deleted - enforces uniqueness forever."
    )
```

**Rationale**:
- Financial transactions must be unique forever
- Risk of duplicate charge is unacceptable
- Storage cost is acceptable for critical financial data
- Unique constraint requires key to exist

### UsageEvent Idempotency Keys: DELETE AFTER 7 DAYS

```python
# UsageEvent model
class UsageEvent(models.Model):
    idempotency_key = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="OPTIONAL. Cleaned up after 7 days."
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['idempotency_key'],
                name='unique_idempotency_key',
                condition=models.Q(idempotency_key__isnull=False)
            )
        ]
```

**Cleanup Command**:
```bash
# Run weekly via cron
python manage.py cleanup_idempotency_keys --retention-days=7
```

**Rationale**:
- Usage events are NOT financial records (they inform transactions, but aren't transactions themselves)
- 7 days covers all reasonable retry scenarios
- After 7 days, client should query existing events rather than retry creation
- Storage savings: 85% reduction (assuming 1 week active, 6 weeks cleanup)

## Consequences

### Positive

- **Transaction Safety**: Impossible to create duplicate financial transactions (keys retained forever)
- **Storage Efficient**: UsageEvent table doesn't grow unbounded with old keys
- **Index Performance**: UsageEvent unique index stays small and fast
- **Clear Policy**: Documented retention period for non-financial data
- **Audit Compliant**: Transaction immutability preserved

### Negative

- **UsageEvent Duplicates Possible After 7 Days**: If client retries after 7 days, duplicate event created
  - *Mitigation*: 7 days is far beyond any reasonable retry window
  - *Mitigation*: Clients should query existing events before creating new ones
  - *Impact*: Low - usage events inform billing but aren't the billing itself

- **Operational Overhead**: Requires periodic cleanup job
  - *Mitigation*: Automated via cron, simple command
  - *Cost*: ~1 minute/week of execution time

- **Different Behavior**: Transaction and UsageEvent have different idempotency semantics
  - *Mitigation*: Documented clearly in API docs and model docstrings
  - *Benefit*: Right tool for the job (strict for finance, pragmatic for events)

### Neutral

- **Transaction Storage**: Grows linearly with transaction count (same as before)
- **Compliance**: Both approaches meet financial audit requirements

## Alternatives Considered

### 1. Delete All Idempotency Keys After 30 Days

**Proposal**: Clean up both Transaction and UsageEvent keys after 30 days.

**Rejected Because**:
- Risk of duplicate financial transactions is unacceptable
- 30 days is arbitrary - why not 60? 90?
- Cost savings minimal for Transaction keys (already a small % of total row size)
- Violates principle: "Financial data is immutable"

### 2. Keep All Idempotency Keys Forever

**Proposal**: Never delete any idempotency keys.

**Rejected Because**:
- UsageEvent table will grow very large (10x-100x more events than transactions)
- Index size becomes a performance problem at scale
- Storage cost for non-critical data
- No benefit after reasonable retry window

### 3. Separate Idempotency Table

**Proposal**: Store keys in separate table, reference from transactions/events.

```sql
CREATE TABLE idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    record_type VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    idempotency_key_id VARCHAR(255) REFERENCES idempotency_keys(key),
    ...
);
```

**Rejected Because**:
- Adds JOIN overhead to every transaction query
- More complex schema (separate table to manage)
- Doesn't solve retention problem (still need to decide when to delete)
- Breaks referential integrity if key is deleted but transaction exists

### 4. Time-To-Live (TTL) on Unique Constraint

**Proposal**: PostgreSQL extension to expire unique constraints.

```sql
CREATE UNIQUE INDEX idx_temp_unique
    ON usage_events(idempotency_key)
    WHERE created_at > NOW() - INTERVAL '7 days';
```

**Rejected Because**:
- Partial unique indexes don't enforce uniqueness for old records
- Complex to implement correctly
- Harder to reason about (is this key unique or not?)
- Simpler to delete the key value itself

## Implementation Details

### Cleanup Command

```python
# management/commands/cleanup_idempotency_keys.py

class Command(BaseCommand):
    def handle(self, *args, **options):
        retention_days = options['retention_days']
        dry_run = options['dry_run']

        cutoff_date = timezone.now() - timedelta(days=retention_days)

        # Only clean UsageEvent keys (Transaction keys are never cleaned)
        old_keys = UsageEvent.objects.filter(
            idempotency_key__isnull=False,
            timestamp__lt=cutoff_date
        )

        count = old_keys.count()

        if dry_run:
            self.stdout.write(f"Would clean {count} keys (dry-run mode)")
        else:
            old_keys.update(idempotency_key=None)
            self.stdout.write(f"Cleaned {count} idempotency keys")
```

### Cron Schedule

```bash
# Run weekly on Sunday at 3 AM
0 3 * * 0 cd /app && python manage.py cleanup_idempotency_keys --retention-days=7
```

### Monitoring

```python
# Metrics to track
usage_event_keys_cleaned_total  # Counter
usage_event_keys_remaining  # Gauge
transaction_keys_total  # Gauge (should grow monotonically)
```

## Edge Cases

### Case 1: Client Retries After 8 Days

**Scenario**: Client creates usage event with key `abc123`, fails, retries 8 days later.

**Behavior**:
1. Day 1: Event created with key `abc123`
2. Day 8: Cleanup runs, removes key from event (event record remains)
3. Day 9: Client retries with key `abc123`
4. Result: New event created (duplicate)

**Mitigation**:
- Client should query existing events before creating new ones
- 8 days is far beyond any reasonable retry window
- UsageEvents are informational (not financial), duplicates are annoying but not catastrophic

### Case 2: Transaction Retry After Years

**Scenario**: Client creates transaction with key `xyz789`, retries 5 years later.

**Behavior**:
1. Year 1: Transaction created with key `xyz789`
2. Year 5: Client retries with key `xyz789`
3. Result: Duplicate rejection (key still exists)

**Outcome**: Correct behavior - no duplicate charge

### Case 3: Cleanup Runs During Event Creation

**Scenario**: Client creates event at Day 7, cleanup runs concurrently.

**Behavior**:
- Django transaction isolation prevents race conditions
- Either: Event is created first, then cleaned (wrong!)
- Or: Event is created after cleanup (correct)

**Mitigation**: Use correct timestamp comparison:
```python
# Cleanup uses timestamp__lt (strictly less than)
cutoff_date = timezone.now() - timedelta(days=7)
old_keys = UsageEvent.objects.filter(timestamp__lt=cutoff_date)

# Events created at exactly cutoff_date are NOT cleaned
```

## Related Decisions

- **ADR-011-001**: Single-Ledger Design (transaction immutability assumption)
- **Data Model**: Transaction and UsageEvent schemas
- **API Spec**: Idempotency key requirements in API documentation

## References

- Stripe Idempotency: https://stripe.com/docs/api/idempotent_requests
- AWS Idempotency: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- Django Unique Constraints: https://docs.djangoproject.com/en/5.1/ref/models/constraints/
- PostgreSQL Partial Indexes: https://www.postgresql.org/docs/current/indexes-partial.html

## Review History

- 2025-11-28: Initial decision (claude-assistant)
