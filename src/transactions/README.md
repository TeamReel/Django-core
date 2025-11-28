# Transactions & Credits Engine

**Django App**: `transactions/`
**Feature**: Core Transactions & Credits Engine (B11)
**Dependencies**: B05 (accounts), B06 (organisations), B07 (projects)

## Overview

Generic transaction and credits engine for tracking usage events, financial transactions, and account balances. Uses a **single-ledger approach** with signed decimal amounts (positive = credit, negative = debit). Balances are **computed on-demand** from transaction history and cached in Redis (60s TTL).

### Key Features

- **Immutable Financial Records**: UsageEvent and Transaction models are never updated or deleted
- **High Precision**: NUMERIC(14,4) for all amounts (no floating-point errors)
- **Idempotency**: Required for transactions, optional for usage events
- **Multi-Tenant Isolation**: Strict organization/project scoping
- **Flexible Policies**: Prepaid (block at zero) or postpaid (allow negative) billing

## Architecture

### Single-Ledger Design

Instead of separate Credit/Debit tables, we use one Transaction table with signed amounts:

```python
# Add credits (positive amount)
Transaction(amount=Decimal('100.0000'), ...)  # +$100

# Debit usage (negative amount)
Transaction(amount=Decimal('-25.0000'), ...)  # -$25

# Compute balance
balance = Transaction.objects.filter(organization=org).aggregate(Sum('amount'))
```

### Computed Balance

No stored balance field. Balance is calculated via `SUM(amount)` aggregation:

1. **Cache-first**: Check Redis `balance:org:{id}` (60s TTL)
2. **Cache miss**: Compute `SUM(amount)` from PostgreSQL
3. **Cache invalidation**: After every Transaction write

### Policy Enforcement

`BalancePolicy` configures prepaid vs postpaid billing:

- **Prepaid** (`allow_negative=False`, `enforcement_mode='block'`): Reject transactions if balance would go negative
- **Postpaid** (`allow_negative=True`, `enforcement_mode='allow'`): Allow negative balances
- **Warning** (`enforcement_mode='warn'`): Log warning but allow transaction

## Models

### UsageEvent

Immutable log of billable actions (API calls, compute usage, etc.).

**Fields**:
- `id` (UUID): Primary key
- `event_type` (str): Type of event (e.g., 'ai_inference', 'storage_upload')
- `user` (FK): User who triggered the event
- `organization` (FK): Organization scope
- `project` (FK, nullable): Project scope (optional)
- `metadata` (JSONB): Flexible event data
- `timestamp` (datetime): Event timestamp
- `idempotency_key` (str, nullable): Client-provided deduplication key

**Indexes**:
- B-tree: `organization` + `timestamp` (DESC)
- B-tree: `project` + `timestamp` (DESC) - partial (WHERE project IS NOT NULL)
- B-tree: `event_type` + `timestamp` (DESC)
- GIN: `metadata` (for JSONB queries)

**Constraints**:
- Unique: `idempotency_key` (partial, WHERE NOT NULL)
- Check: `project.organization_id = organization_id OR project IS NULL`

**Usage**:
```python
event = UsageEvent.objects.create(
    event_type='ai_inference',
    user=request.user,
    organization=org,
    project=project,
    metadata={'model': 'gpt-4', 'tokens': 1500},
    idempotency_key=f"inference-{request_id}"
)
```

---

### Transaction

Financial ledger entry with signed amounts. Immutable.

**Fields**:
- `id` (UUID): Primary key
- `amount` (Decimal 14,4): Signed amount (positive=credit, negative=debit)
- `organization` (FK): Organization scope
- `project` (FK, nullable): Project scope (optional)
- `source_type` (choice): 'usage_event', 'adjustment', 'external_billing'
- `usage_event` (FK, nullable): Source usage event if `source_type='usage_event'`
- `external_reference_id` (str, nullable): External system reference
- `created_by` (FK User): User who created transaction
- `idempotency_key` (str, required): Deduplication key
- `notes` (text): Human-readable description
- `timestamp` (datetime): Transaction timestamp

**Indexes**:
- B-tree: `organization` + `timestamp` (DESC)
- B-tree: `project` + `timestamp` (DESC) - partial (WHERE project IS NOT NULL)
- B-tree: `source_type` + `timestamp` (DESC)
- Unique: `idempotency_key`

**Constraints**:
- Check: `amount != 0` (zero-amount transactions rejected)
- Check: `project.organization_id = organization_id OR project IS NULL`
- Check: If `source_type='usage_event'` then `usage_event` must be set

**Usage**:
```python
# Credit account
Transaction.objects.create(
    amount=Decimal('100.0000'),
    organization=org,
    source_type=SourceTypeChoices.EXTERNAL_BILLING,
    external_reference_id='stripe_ch_12345',
    created_by=request.user,
    idempotency_key=f"stripe-{charge_id}",
    notes="Stripe payment"
)

# Debit usage
Transaction.objects.create(
    amount=Decimal('-25.0000'),
    organization=org,
    project=project,
    source_type=SourceTypeChoices.USAGE_EVENT,
    usage_event=event,
    created_by=request.user,
    idempotency_key=f"usage-{event.id}",
    notes="AI inference usage"
)
```

---

### BalancePolicy

Configuration for billing enforcement (prepaid vs postpaid).

**Fields**:
- `id` (UUID): Primary key
- `organization` (FK): Organization scope
- `project` (FK, nullable): Project scope (optional)
- `allow_negative` (bool): Can balance go negative? (False=prepaid, True=postpaid)
- `warn_threshold` (Decimal, nullable): Balance level to trigger warnings
- `enforcement_mode` (choice): 'block', 'warn', 'allow'

**Indexes**:
- B-tree: `organization` (partial, WHERE project IS NULL)
- B-tree: `project` (partial, WHERE project IS NOT NULL)

**Constraints**:
- Unique: (`organization`, `project`)
- Check: `project.organization_id = organization_id OR project IS NULL`

**Usage**:
```python
# Prepaid (block at zero)
BalancePolicy.objects.create(
    organization=org,
    allow_negative=False,
    enforcement_mode=EnforcementModeChoices.BLOCK,
    warn_threshold=Decimal('10.0000')
)

# Postpaid (allow negative)
BalancePolicy.objects.create(
    organization=org,
    allow_negative=True,
    enforcement_mode=EnforcementModeChoices.ALLOW
)
```

## Relationships

```
Organisation (1) ─┬→ UsageEvent (N)
                  ├→ Transaction (N)
                  └→ BalancePolicy (1)

Project (1) ──┬→ UsageEvent (N)
              ├→ Transaction (N)
              └→ BalancePolicy (1)

UsageEvent (1) ──→ Transaction (N) [via source_type='usage_event']
```

## Custom Managers

### UsageEventManager

```python
# Filter by organization
UsageEvent.objects.for_organization(org_id)

# Filter by project
UsageEvent.objects.for_project(project_id)

# Get unbilled events (no linked transactions)
UsageEvent.objects.unbilled()

# Filter by event type
UsageEvent.objects.by_event_type('ai_inference')
```

### TransactionManager

```python
# Filter by organization
Transaction.objects.for_organization(org_id)

# Filter by project
Transaction.objects.for_project(project_id)

# Compute balance
balance_data = Transaction.objects.for_organization(org_id).compute_balance()
# Returns: {
#   'current_balance': Decimal('75.0000'),
#   'total_positive_amounts': Decimal('100.0000'),
#   'total_negative_amounts': Decimal('-25.0000'),
#   'transaction_count': 2
# }
```

## Database Schema

### Migrations

- `0001_initial.py`: Create UsageEvent, Transaction, BalancePolicy tables with all indexes and constraints
- `0002_add_gin_index.py`: Add GIN index on UsageEvent.metadata (runs with `atomic=False` for `CREATE INDEX CONCURRENTLY`)

### Applying Migrations

```bash
# Apply migrations
python manage.py migrate transactions

# Check migration status
python manage.py showmigrations transactions
```

## Testing

### Running Tests

```bash
# All tests
pytest src/transactions/tests/ -v

# Model tests only
pytest src/transactions/tests/test_models.py -v

# With coverage
pytest src/transactions/tests/ --cov=transactions --cov-report=term-missing
```

### Test Fixtures

Located in `src/transactions/tests/conftest.py`:

- `user`: Test user fixture
- `organization`: Test organization fixture
- `project`: Test project fixture
- `usage_event`: Test usage event fixture

## Django Admin

All models are registered in Django admin:

- **UsageEvent**: Read-only (immutable records)
- **Transaction**: Read-only (immutable records)
- **BalancePolicy**: Editable

Access at: http://localhost:8000/admin/transactions/

## See Also

- **Feature Spec**: `kitty-specs/011-core-transactions-credits/spec.md`
- **Implementation Plan**: `kitty-specs/011-core-transactions-credits/plan.md`
- **Quickstart Guide**: `kitty-specs/011-core-transactions-credits/quickstart.md`
- **API Reference**: `kitty-specs/011-core-transactions-credits/contracts/transactions-api.yaml`
