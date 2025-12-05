# Transactions Module

Credits, ledgers, and financial transactions for Django Core-App.

## Overview

The `transactions` module implements a double-entry bookkeeping system with ledgers, transactions, and credit management. It ensures financial data integrity with atomic operations and audit trails.

**App location**: `src/transactions/`  
**Feature spec**: `kitty-specs/011-core-transactions-credits/`  
**ADRs**: [Transactions ADRs](../architecture/adr/index.md#transactions--billing)

## Configuration

### Required Settings

```python
INSTALLED_APPS = [
    'transactions.apps.TransactionsConfig',
    ...
]

# Default currency
TRANSACTIONS_DEFAULT_CURRENCY = 'EUR'

# Idempotency key retention (days)
TRANSACTIONS_IDEMPOTENCY_RETENTION = 30
```

## Models

### Ledger

Named account for tracking balances.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `name` | CharField | Unique ledger name |
| `currency` | CharField | ISO currency code |
| `organization` | ForeignKey | Owner organization |

### Transaction

Financial transaction header.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `reference` | CharField | Unique reference |
| `status` | CharField | pending/posted/cancelled |
| `idempotency_key` | CharField | Prevents duplicates |
| `created_at` | DateTimeField | Creation timestamp |
| `posted_at` | DateTimeField | Posting timestamp |

### TransactionLine

Double-entry line item.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `transaction` | ForeignKey | Parent transaction |
| `ledger` | ForeignKey | Target ledger |
| `amount` | DecimalField | Absolute amount |
| `direction` | CharField | debit/credit |
| `description` | TextField | Line description |

**Invariant**: Transaction lines must sum to zero (balanced).

## API Endpoints

### Ledgers

```http
# List ledgers
GET /api/v1/ledgers/

# Get ledger balance
GET /api/v1/ledgers/{id}/balance/

# Create ledger
POST /api/v1/ledgers/
{"name": "Credits", "currency": "EUR"}
```

### Transactions

```http
# List transactions
GET /api/v1/transactions/

# Create transaction
POST /api/v1/transactions/
{
  "reference": "TXN-001",
  "idempotency_key": "unique-key-123",
  "lines": [
    {"ledger_id": "uuid", "amount": "100.00", "direction": "debit"},
    {"ledger_id": "uuid", "amount": "100.00", "direction": "credit"}
  ]
}

# Post transaction
POST /api/v1/transactions/{id}/post/
```

### Credit Operations

```http
# Add credits
POST /api/v1/credits/add/
{
  "organization_id": "uuid",
  "amount": "100.00",
  "reason": "Monthly allocation"
}

# Deduct credits
POST /api/v1/credits/deduct/
{
  "organization_id": "uuid",
  "amount": "10.00",
  "reason": "API usage"
}

# Get balance
GET /api/v1/credits/balance/?organization_id=uuid
```

## Usage Examples

### Creating a Transaction

```python
from transactions.models import Ledger, Transaction, TransactionLine
from decimal import Decimal

# Create transaction atomically
with transaction.atomic():
    txn = Transaction.objects.create(
        reference='TXN-001',
        idempotency_key='unique-key',
    )
    
    # Debit line
    TransactionLine.objects.create(
        transaction=txn,
        ledger=source_ledger,
        amount=Decimal('100.00'),
        direction='debit',
    )
    
    # Credit line
    TransactionLine.objects.create(
        transaction=txn,
        ledger=target_ledger,
        amount=Decimal('100.00'),
        direction='credit',
    )
    
    # Post transaction
    txn.post()
```

### Credit Service

```python
from transactions.services import CreditService

service = CreditService()

# Add credits
service.add_credits(
    organization=org,
    amount=Decimal('100.00'),
    reason='Purchase',
    idempotency_key='purchase-123',
)

# Deduct credits
service.deduct_credits(
    organization=org,
    amount=Decimal('10.00'),
    reason='API call',
    idempotency_key='api-call-456',
)

# Get balance
balance = service.get_balance(organization=org)
```

### Idempotency

```python
# Same idempotency key = same result
result1 = service.add_credits(
    organization=org,
    amount=Decimal('100.00'),
    idempotency_key='key-123',
)

result2 = service.add_credits(
    organization=org,
    amount=Decimal('100.00'),
    idempotency_key='key-123',  # Same key
)

assert result1.id == result2.id  # Same transaction returned
```

## Double-Entry Accounting

Every transaction must balance:

```python
def validate_transaction(transaction):
    """Ensure debits equal credits."""
    lines = transaction.lines.all()
    
    debits = sum(
        line.amount for line in lines 
        if line.direction == 'debit'
    )
    credits = sum(
        line.amount for line in lines 
        if line.direction == 'credit'
    )
    
    if debits != credits:
        raise ValidationError("Transaction must balance")
```

## Balance Computation

Balances are computed on-demand (not stored):

```python
def get_ledger_balance(ledger):
    """Calculate current ledger balance."""
    result = TransactionLine.objects.filter(
        ledger=ledger,
        transaction__status='posted',
    ).aggregate(
        debits=Sum('amount', filter=Q(direction='debit')),
        credits=Sum('amount', filter=Q(direction='credit')),
    )
    
    return (result['credits'] or 0) - (result['debits'] or 0)
```

## Cache Integration

Balance caching for performance:

```python
from django.core.cache import cache

def get_cached_balance(ledger_id):
    cache_key = f'ledger_balance:{ledger_id}'
    balance = cache.get(cache_key)
    
    if balance is None:
        balance = compute_balance(ledger_id)
        cache.set(cache_key, balance, timeout=300)
    
    return balance

# Invalidate on transaction post
@receiver(post_save, sender=Transaction)
def invalidate_balance_cache(sender, instance, **kwargs):
    if instance.status == 'posted':
        for line in instance.lines.all():
            cache.delete(f'ledger_balance:{line.ledger_id}')
```

## Related Features

- [Organisations](./organisations.md) - Org-scoped ledgers
- [Audit](./audit.md) - Transaction audit trail
- [ADR-011: Ledger Design](../architecture/adr/index.md#transactions--billing)
