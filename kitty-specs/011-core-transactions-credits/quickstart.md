# Quick Start: Transactions & Credits Engine

**Feature**: 011-core-transactions-credits
**Audience**: Developers integrating usage tracking and billing

## Overview

The Transactions & Credits Engine provides a generic ledger for tracking usage events, balances, and billable activities at organization and project levels. This guide shows you how to integrate it into your product feature.

## Key Concepts

- **UsageEvent**: Immutable record of a billable action (e.g., "user ran AI analysis")
- **Transaction**: Financial ledger entry with signed amount (positive=add, negative=subtract)
- **Balance**: Computed sum of all transactions (cached for performance)
- **BalancePolicy**: Rules for prepaid vs postpaid billing enforcement
- **Credits**: Unit of account (like USD or points) - amounts are signed decimals

---

## Setup

### 1. Add App to Settings

```python
# config/settings/base.py
INSTALLED_APPS = [
    # ... existing apps
    'transactions',
]
```

### 2. Configure Redis Cache

```python
# config/settings/base.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django_core',
        'TIMEOUT': 300,  # 5 minutes default
    }
}
```

### 3. Run Migrations

```bash
python manage.py migrate transactions
```

### 4. Include API URLs

```python
# config/urls.py
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('api/v1/', include('transactions.api.urls')),
]
```

---

## Usage Examples

### Example 1: Record a Usage Event

When a user performs a billable action:

```python
from transactions.services import record_usage_event
from accounts.models import User
from organisations.models import Organisation
from projects.models import Project

# After user completes action (e.g., AI inference)
event = record_usage_event(
    event_type='ai_inference',
    user=request.user,
    organization=request.user.organization,
    project=request.project,  # Optional
    metadata={
        'model': 'gpt-4',
        'tokens': 1500,
        'duration_seconds': 2.3,
    },
    idempotency_key=f"inference-{request_id}"  # Optional, for deduplication
)
```

**API Equivalent**:
```bash
POST /api/v1/usage-events/
Content-Type: application/json

{
  "event_type": "ai_inference",
  "organization_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "660e8400-e29b-41d4-a716-446655440001",
  "metadata": {
    "model": "gpt-4",
    "tokens": 1500,
    "duration_seconds": 2.3
  },
  "idempotency_key": "inference-abc123"
}
```

---

### Example 2: Debit Credits for Usage

Convert a usage event into a charge:

```python
from transactions.services import create_transaction
from decimal import Decimal

# Calculate cost (product-specific logic)
cost_per_token = Decimal('0.0001')
tokens = event.metadata['tokens']
charge_amount = -(cost_per_token * tokens)  # Negative = debit

try:
    transaction = create_transaction(
        amount=charge_amount,
        organization=event.organization,
        project=event.project,
        source_type='usage_event',
        usage_event=event,
        created_by=request.user,
        idempotency_key=f"charge-{event.id}",
        notes=f"AI inference charge for {tokens} tokens"
    )
    print(f"Balance after charge: {transaction.new_balance}")
except InsufficientBalanceError as e:
    # Prepaid org with insufficient balance
    print(f"Insufficient balance: {e.current_balance} < {e.requested_amount}")
    # Handle: show error to user, queue for later, etc.
```

**API Equivalent**:
```bash
POST /api/v1/transactions/
Content-Type: application/json

{
  "amount": "-0.1500",
  "organization_id": "550e8400-e29b-41d4-a716-446655440000",
  "project_id": "660e8400-e29b-41d4-a716-446655440001",
  "source_type": "usage_event",
  "usage_event_id": "770e8400-e29b-41d4-a716-446655440002",
  "idempotency_key": "charge-770e8400-e29b-41d4-a716-446655440002",
  "notes": "AI inference charge for 1500 tokens"
}
```

**Response 201 Created**:
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "amount": "-0.1500",
  "organization_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_balance": "99.8500",
  "timestamp": "2025-11-28T10:30:00Z",
  ...
}
```

**Response 403 Forbidden** (policy violation):
```json
{
  "error": "insufficient_balance",
  "current_balance": "0.5000",
  "requested_amount": "0.7500",
  "policy": "prepaid_only"
}
```

---

### Example 3: Add Credits to Balance

When a customer purchases credits or receives a grant:

```python
from transactions.services import create_transaction
from decimal import Decimal

transaction = create_transaction(
    amount=Decimal('100.0000'),  # Positive = credit
    organization=organization,
    project=None,  # Org-level credit
    source_type='external_billing',
    external_reference_id='stripe_charge_abc123',
    created_by=admin_user,
    idempotency_key=f"purchase-stripe_charge_abc123",
    notes="Credit purchase via Stripe"
)
```

**API Equivalent**:
```bash
POST /api/v1/transactions/
{
  "amount": "100.0000",
  "organization_id": "550e8400-e29b-41d4-a716-446655440000",
  "source_type": "external_billing",
  "external_reference_id": "stripe_charge_abc123",
  "idempotency_key": "purchase-stripe_charge_abc123",
  "notes": "Credit purchase via Stripe"
}
```

---

### Example 4: Query Organization Balance

```python
from transactions.services import get_organization_balance

balance = get_organization_balance(organization.id)
print(f"Current balance: {balance['current_balance']} credits")
print(f"Total added: {balance['total_positive_amounts']}")
print(f"Total used: {balance['total_negative_amounts']}")
print(f"Transactions: {balance['transaction_count']}")
```

**API Equivalent**:
```bash
GET /api/v1/organizations/550e8400-e29b-41d4-a716-446655440000/balance/

Response 200:
{
  "current_balance": "99.8500",
  "total_positive_amounts": "100.0000",
  "total_negative_amounts": "-0.1500",
  "transaction_count": 2,
  "last_updated": "2025-11-28T10:30:00Z"
}
```

---

### Example 5: Configure Billing Policy

Set an organization to prepaid mode (block negative balance):

```python
from transactions.models import BalancePolicy

policy, created = BalancePolicy.objects.update_or_create(
    organization=organization,
    project=None,  # Org-level policy
    defaults={
        'allow_negative': False,
        'warn_threshold': Decimal('10.0000'),
        'enforcement_mode': 'block',
    }
)
```

**API Equivalent**:
```bash
PUT /api/v1/balance-policies/org/550e8400-e29b-41d4-a716-446655440000/
{
  "allow_negative": false,
  "warn_threshold": "10.0000",
  "enforcement_mode": "block"
}
```

**Policy Modes**:
- `block`: Reject transactions that would make balance negative (403 Forbidden)
- `warn`: Allow but log warning (useful for alerting)
- `allow`: No restrictions (postpaid mode)

---

### Example 6: Query Transaction History

```python
from transactions.models import Transaction

transactions = Transaction.objects.filter(
    organization=organization,
    timestamp__gte=start_date,
    timestamp__lt=end_date
).order_by('-timestamp')[:50]

for txn in transactions:
    print(f"{txn.timestamp}: {txn.amount} credits - {txn.notes}")
```

**API Equivalent**:
```bash
GET /api/v1/transactions/?organization_id=550e8400...&start_date=2025-11-01&end_date=2025-11-30&page=1&page_size=50

Response 200:
{
  "count": 247,
  "next": "/api/v1/transactions/?page=2",
  "previous": null,
  "results": [
    {
      "id": "880e8400...",
      "amount": "-0.1500",
      "timestamp": "2025-11-28T10:30:00Z",
      "notes": "AI inference charge",
      ...
    },
    ...
  ]
}
```

---

### Example 7: Bulk Export for Reconciliation

Export all transactions for external billing system:

```bash
# JSON format
GET /api/v1/transactions/?organization_id=550e8400...&format=json&start_date=2025-11-01&end_date=2025-11-30

# CSV format (downloads file)
GET /api/v1/transactions/?organization_id=550e8400...&format=csv&start_date=2025-11-01&end_date=2025-11-30
```

**CSV Output**:
```csv
transaction_id,organization_id,project_id,amount,source_type,source_reference,timestamp,created_by_email,notes
880e8400...,550e8400...,660e8400...,-0.1500,usage_event,770e8400...,2025-11-28T10:30:00Z,user@example.com,"AI inference charge"
...
```

---

### Example 8: Query Unbilled Usage Events

Find usage events that haven't been converted to transactions yet:

```python
from transactions.models import UsageEvent, Transaction

unbilled_events = UsageEvent.objects.filter(
    organization=organization,
    timestamp__gte=start_date
).exclude(
    id__in=Transaction.objects.filter(
        source_type='usage_event'
    ).values_list('usage_event_id', flat=True)
)

print(f"Unbilled events: {unbilled_events.count()}")
```

**API Equivalent**:
```bash
GET /api/v1/usage-events/?organization_id=550e8400...&unbilled=true
```

---

## Error Handling

### Common Error Responses

**403 Forbidden - Insufficient Balance** (prepaid mode):
```json
{
  "error": "insufficient_balance",
  "current_balance": "5.0000",
  "requested_amount": "10.0000",
  "policy": "prepaid_only"
}
```

**409 Conflict - Duplicate Idempotency Key**:
```json
{
  "error": "duplicate_idempotency_key",
  "existing_transaction_id": "880e8400...",
  "message": "Transaction with this idempotency key already exists"
}
```

**400 Bad Request - Validation Error**:
```json
{
  "amount": ["Ensure this value has at most 4 decimal places."],
  "idempotency_key": ["This field is required."]
}
```

**404 Not Found - Organization/Project Doesn't Exist**:
```json
{
  "detail": "Organization not found"
}
```

---

## Best Practices

### 1. Always Use Idempotency Keys for Transactions

Financial safety requires idempotency:
```python
# ✅ Good: Use unique, deterministic key
idempotency_key = f"charge-{usage_event.id}"

# ❌ Bad: No idempotency key (duplicate charges possible)
idempotency_key = None
```

### 2. Handle Policy Violations Gracefully

```python
try:
    transaction = create_transaction(...)
except InsufficientBalanceError as e:
    # Show user-friendly error
    messages.error(request, f"Insufficient balance. Current: {e.current_balance}, Required: {abs(e.requested_amount)}")
    # Or: Queue for later billing
    # Or: Redirect to purchase credits page
```

### 3. Use Negative Amounts for Charges

```python
# ✅ Good: Negative amount = debit
amount = Decimal('-10.0000')

# ❌ Bad: Positive amount for charge (would add credits)
amount = Decimal('10.0000')
```

### 4. Store Useful Metadata in Usage Events

```python
# ✅ Good: Rich metadata for audit trail
metadata = {
    'model': 'gpt-4',
    'tokens': 1500,
    'duration_seconds': 2.3,
    'user_id': str(user.id),
    'request_id': 'req-abc123',
}

# ❌ Bad: Minimal metadata (hard to debug later)
metadata = {}
```

### 5. Use Project-Level Balances for Fine-Grained Control

```python
# Org-level balance (shared across all projects)
transaction = create_transaction(
    amount=amount,
    organization=org,
    project=None,  # Org-level
    ...
)

# Project-level balance (isolated per project)
transaction = create_transaction(
    amount=amount,
    organization=org,
    project=project,  # Project-specific
    ...
)
```

---

## Monitoring & Observability

### Metrics Available

Query Prometheus metrics at `/metrics`:

- `transaction_writes_total` - Total transaction writes
- `transaction_write_latency_seconds` - Transaction write latency histogram
- `balance_queries_total` - Total balance queries
- `balance_query_latency_seconds` - Balance query latency histogram
- `policy_violations_total{enforcement_mode}` - Policy violation counter
- `cache_hits_total` / `cache_misses_total` - Cache effectiveness

### Logging

All transaction operations are logged with structured context:

```python
import logging

logger = logging.getLogger('transactions')

# Automatic logging by service layer:
# INFO: transaction.created transaction_id=880e8400... org_id=550e8400... amount=-0.1500
# WARNING: policy.violation org_id=550e8400... enforcement_mode=block balance=5.0000
# DEBUG: cache.invalidated cache_key=balance:org:550e8400...
```

---

## Troubleshooting

### Balance Doesn't Update Immediately

**Symptom**: Created transaction but balance query returns stale value

**Solution**: Cache is invalidated on transaction write, but Redis might be down. Check Redis connection:
```python
from django.core.cache import cache
cache.set('test', 'value')
assert cache.get('test') == 'value'
```

### Idempotency Key Collision

**Symptom**: Getting 409 Conflict when creating new transaction

**Solution**: Ensure idempotency keys are unique. Include entity IDs:
```python
# ✅ Good: Unique per entity
idempotency_key = f"charge-{usage_event.id}"

# ❌ Bad: Not unique enough
idempotency_key = "charge"
```

### Transactions Not Linked to Usage Events

**Symptom**: Can't trace transaction back to original usage event

**Solution**: Always set source_type and usage_event_id when creating transaction from event:
```python
transaction = create_transaction(
    source_type='usage_event',
    usage_event=event,  # Link to source
    ...
)
```

---

## Next Steps

- **API Reference**: See full OpenAPI spec at `contracts/transactions-api.yaml`
- **Data Model**: See entity relationships at `data-model.md`
- **Architecture Decisions**: See ADRs in `docs/adr/`
- **Implementation Plan**: See `plan.md` for technical details

---

## Support

For questions or issues:
1. Check API docs: `/api/schema/` (drf-spectacular)
2. Review integration tests: `transactions/tests/test_integration.py`
3. Consult implementation plan: `plan.md`
