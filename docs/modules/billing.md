# Billing Integration Guide

**Feature**: Transactions & Credits Engine
**Audience**: External developers integrating billing features
**Last Updated**: 2025-11-28

## Overview

The Django Core transactions engine provides a flexible, multi-tenant billing foundation. This guide shows how to integrate it into your product features.

## Quick Start

### 1. Record Usage Events

When a user performs a billable action (API call, storage upload, compute job), record a usage event:

```python
from transactions.services import record_usage_event

# Record AI inference event
event = record_usage_event(
    event_type='ai_inference',
    user=request.user,
    organization=request.user.organization,
    project=current_project,
    metadata={
        'model': 'gpt-4',
        'tokens_used': 1500,
        'prompt_length': 100,
        'completion_length': 1400
    },
    idempotency_key=f"inference-{request_id}"  # Optional but recommended
)
```

### 2. Create Billing Transactions

Convert usage events to financial transactions (charges):

```python
from decimal import Decimal
from transactions.services import create_transaction
from transactions.models import SourceTypeChoices

# Charge for AI usage ($0.02 per 1000 tokens)
tokens = event.metadata['tokens_used']
amount = Decimal(tokens) / Decimal('1000') * Decimal('0.02')

transaction = create_transaction(
    amount=-amount,  # Negative = charge/debit
    organization=event.organization,
    project=event.project,
    source_type=SourceTypeChoices.USAGE_EVENT,
    usage_event=event,
    created_by=request.user,
    idempotency_key=f"charge-{event.id}",
    notes=f"AI inference: {tokens} tokens"
)
```

### 3. Check Balance Before Operations

For prepaid billing, check balance before allowing expensive operations:

```python
from transactions.services import get_organization_balance, check_policy_violation
from transactions.exceptions import InsufficientBalanceError

# Check if operation would overdraft account
balance_data = get_organization_balance(organization.id)
current_balance = balance_data['current_balance']

estimated_cost = Decimal('25.00')

try:
    check_policy_violation(
        organization=organization,
        proposed_amount=-estimated_cost,  # Negative = charge
        current_balance=current_balance
    )
    # OK to proceed
    perform_expensive_operation()
except InsufficientBalanceError:
    return Response(
        {"error": "Insufficient balance. Please add credits."},
        status=402  # Payment Required
    )
```

## Billing Models

### Prepaid (Block at Zero)

Users must maintain positive balance. Operations are blocked when balance would go negative.

**Setup**:
```python
from transactions.models import BalancePolicy, EnforcementModeChoices

BalancePolicy.objects.create(
    organization=org,
    allow_negative=False,
    enforcement_mode=EnforcementModeChoices.BLOCK,
    warn_threshold=Decimal('10.00')  # Warn when balance < $10
)
```

**Workflow**:
1. User purchases credits → create positive transaction
2. User performs actions → record usage events
3. Billing job converts events to negative transactions
4. Before each action, check balance → block if insufficient

### Postpaid (Allow Negative)

Users can go into debt. Bills are sent periodically.

**Setup**:
```python
BalancePolicy.objects.create(
    organization=org,
    allow_negative=True,
    enforcement_mode=EnforcementModeChoices.ALLOW
)
```

**Workflow**:
1. User performs actions → record usage events
2. Billing job converts events to negative transactions
3. Balance can go negative
4. Monthly billing job generates invoice for negative balance
5. Payment clears debt → create positive transaction

### Hybrid (Per-Project)

Different billing models for different projects within the same organization.

**Setup**:
```python
# Organization default: postpaid
BalancePolicy.objects.create(
    organization=org,
    allow_negative=True,
    enforcement_mode=EnforcementModeChoices.ALLOW
)

# Specific project: prepaid
BalancePolicy.objects.create(
    organization=org,
    project=expensive_project,
    allow_negative=False,
    enforcement_mode=EnforcementModeChoices.BLOCK
)
```

## Common Patterns

### Pattern 1: Pay-As-You-Go API

**Scenario**: Charge per API call.

```python
from django.views.decorators.http import require_http_methods
from transactions.services import (
    record_usage_event,
    create_transaction,
    get_organization_balance,
    check_policy_violation
)

@require_http_methods(["POST"])
def api_endpoint(request):
    org = request.user.organization

    # Check balance (prepaid only)
    balance = get_organization_balance(org.id)['current_balance']
    cost = Decimal('0.01')  # $0.01 per call

    try:
        check_policy_violation(org, -cost, balance)
    except InsufficientBalanceError:
        return JsonResponse(
            {"error": "Insufficient balance"},
            status=402
        )

    # Record usage
    event = record_usage_event(
        event_type='api_call',
        user=request.user,
        organization=org,
        metadata={'endpoint': request.path},
        idempotency_key=f"api-{request.META['HTTP_X_REQUEST_ID']}"
    )

    # Charge immediately
    create_transaction(
        amount=-cost,
        organization=org,
        source_type=SourceTypeChoices.USAGE_EVENT,
        usage_event=event,
        created_by=request.user,
        idempotency_key=f"charge-{event.id}",
        notes=f"API call: {request.path}"
    )

    # Perform actual API logic
    result = process_api_request(request)

    return JsonResponse(result)
```

### Pattern 2: Batch Billing Job

**Scenario**: Charge for usage once per day/hour.

```python
from django.core.management.base import BaseCommand
from transactions.models import UsageEvent, SourceTypeChoices
from transactions.services import create_transaction

class Command(BaseCommand):
    help = "Convert unbilled usage events to transactions"

    def handle(self, *args, **options):
        # Find unbilled events
        unbilled = UsageEvent.objects.unbilled()

        for event in unbilled:
            # Calculate cost based on event type
            cost = self.calculate_cost(event)

            # Create transaction
            try:
                create_transaction(
                    amount=-cost,  # Charge
                    organization=event.organization,
                    project=event.project,
                    source_type=SourceTypeChoices.USAGE_EVENT,
                    usage_event=event,
                    created_by=event.user,
                    idempotency_key=f"batch-charge-{event.id}",
                    notes=f"Usage billing: {event.event_type}"
                )
                self.stdout.write(f"Billed event {event.id}: ${cost}")
            except Exception as e:
                self.stderr.write(f"Failed to bill event {event.id}: {e}")

    def calculate_cost(self, event):
        """Calculate cost based on event type and metadata."""
        rates = {
            'ai_inference': Decimal('0.02'),  # per 1k tokens
            'storage_write': Decimal('0.001'),  # per MB
            'api_call': Decimal('0.01'),  # per call
        }

        base_rate = rates.get(event.event_type, Decimal('0'))

        if event.event_type == 'ai_inference':
            tokens = event.metadata.get('tokens_used', 0)
            return base_rate * Decimal(tokens) / Decimal('1000')
        elif event.event_type == 'storage_write':
            mb = event.metadata.get('size_mb', 0)
            return base_rate * Decimal(mb)
        else:
            return base_rate
```

**Cron Schedule**:
```bash
# Run hourly
0 * * * * cd /app && python manage.py bill_usage_events
```

### Pattern 3: Credit Purchase (Stripe Integration)

**Scenario**: User buys credits via Stripe.

```python
import stripe
from transactions.services import create_transaction
from transactions.models import SourceTypeChoices

def handle_stripe_payment(charge_id: str, amount_cents: int, user):
    """Handle successful Stripe payment."""

    # Convert cents to Decimal
    amount = Decimal(amount_cents) / Decimal('100')

    # Create credit transaction
    transaction = create_transaction(
        amount=amount,  # Positive = credit
        organization=user.organization,
        source_type=SourceTypeChoices.EXTERNAL_BILLING,
        external_reference_id=f"stripe-{charge_id}",
        created_by=user,
        idempotency_key=f"stripe-charge-{charge_id}",
        notes=f"Credit purchase via Stripe: ${amount}"
    )

    return transaction

# Stripe webhook handler
@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META['HTTP_STRIPE_SIGNATURE']

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return HttpResponse(status=400)

    if event['type'] == 'charge.succeeded':
        charge = event['data']['object']
        user = User.objects.get(email=charge['receipt_email'])

        handle_stripe_payment(
            charge_id=charge['id'],
            amount_cents=charge['amount'],
            user=user
        )

    return HttpResponse(status=200)
```

### Pattern 4: Balance Warnings

**Scenario**: Notify users when balance is low.

```python
from django.core.management.base import BaseCommand
from transactions.services import get_organization_balance
from transactions.models import BalancePolicy
from django.core.mail import send_mail

class Command(BaseCommand):
    help = "Send low balance warnings"

    def handle(self, *args, **options):
        policies = BalancePolicy.objects.filter(
            warn_threshold__isnull=False
        )

        for policy in policies:
            balance = get_organization_balance(
                policy.organization.id
            )['current_balance']

            if balance < policy.warn_threshold:
                self.send_warning_email(
                    organization=policy.organization,
                    balance=balance,
                    threshold=policy.warn_threshold
                )

    def send_warning_email(self, organization, balance, threshold):
        send_mail(
            subject=f"Low Balance Warning - {organization.name}",
            message=f"Your balance (${balance}) is below ${threshold}.",
            from_email='billing@example.com',
            recipient_list=[org.owner.email]
        )
```

## API Endpoints

All endpoints require authentication and respect multi-tenant isolation.

### Create Usage Event

```http
POST /api/v1/transactions/usage-events/
Content-Type: application/json
Authorization: Token <your-token>

{
  "event_type": "ai_inference",
  "organization": "uuid-here",
  "project": "uuid-here",  // Optional
  "metadata": {
    "model": "gpt-4",
    "tokens": 1500
  },
  "idempotency_key": "unique-key-123"  // Optional
}
```

### Create Transaction

```http
POST /api/v1/transactions/transactions/
Content-Type: application/json
Authorization: Token <your-token>

{
  "amount": "-25.50",  // Negative = charge, positive = credit
  "organization": "uuid-here",
  "project": "uuid-here",  // Optional
  "source_type": "usage_event",
  "usage_event": "event-uuid",  // Required if source_type=usage_event
  "idempotency_key": "unique-key-456",
  "notes": "AI inference charge"
}
```

### Get Balance

```http
GET /api/v1/transactions/balance/organization/<org-id>/
Authorization: Token <your-token>

Response:
{
  "current_balance": "75.50",
  "total_positive_amounts": "100.00",
  "total_negative_amounts": "-24.50",
  "transaction_count": 12
}
```

### List Transactions

```http
GET /api/v1/transactions/transactions/?organization=<org-id>&limit=50
Authorization: Token <your-token>

Response:
{
  "count": 150,
  "next": "...",
  "previous": null,
  "results": [
    {
      "id": "uuid",
      "amount": "-25.50",
      "organization": "uuid",
      "source_type": "usage_event",
      "timestamp": "2025-11-28T12:00:00Z",
      "notes": "AI inference charge"
    },
    ...
  ]
}
```

## Best Practices

### 1. Always Use Idempotency Keys

```python
# Good: Retries are safe
create_transaction(
    amount=Decimal('-10.00'),
    idempotency_key=f"charge-{unique_id}",  # ✓ Prevents duplicates
    ...
)

# Bad: Retries create duplicate charges
create_transaction(
    amount=Decimal('-10.00'),
    idempotency_key=None,  # ✗ Risky!
    ...
)
```

### 2. Handle Policy Violations Gracefully

```python
from transactions.exceptions import InsufficientBalanceError

try:
    create_transaction(amount=Decimal('-100.00'), ...)
except InsufficientBalanceError as e:
    # Show user-friendly error
    return Response({
        "error": "Insufficient balance",
        "current_balance": str(e.current_balance),
        "required_balance": str(e.required_balance),
        "action": "Please add credits to continue"
    }, status=402)
```

### 3. Record Rich Metadata

```python
# Good: Detailed metadata for debugging/reporting
record_usage_event(
    event_type='ai_inference',
    metadata={
        'model': 'gpt-4',
        'tokens_used': 1500,
        'prompt_length': 100,
        'completion_length': 1400,
        'request_id': 'req_123',
        'duration_ms': 1250,
        'cache_hit': False
    },
    ...
)

# Bad: Minimal metadata
record_usage_event(
    event_type='ai_inference',
    metadata={},  # ✗ Missing context
    ...
)
```

### 4. Scope Policies Appropriately

```python
# Org-level policy (default for all projects)
BalancePolicy.objects.create(
    organization=org,
    project=None,
    ...
)

# Project-level policy (overrides org default)
BalancePolicy.objects.create(
    organization=org,
    project=high_priority_project,
    allow_negative=True,  # Allow this project to overdraft
    ...
)
```

### 5. Monitor Balance Trends

```python
from datetime import timedelta
from django.utils import timezone

def get_balance_trend(organization_id, days=30):
    """Get daily balances for the last N days."""
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)

    daily_balances = []
    current_date = start_date

    while current_date <= end_date:
        # Compute balance up to this date
        balance = Transaction.objects.filter(
            organization_id=organization_id,
            timestamp__lte=current_date
        ).aggregate(Sum('amount'))['amount__sum'] or Decimal('0')

        daily_balances.append({
            'date': current_date.date(),
            'balance': balance
        })

        current_date += timedelta(days=1)

    return daily_balances
```

## Testing

### Unit Test Example

```python
import pytest
from decimal import Decimal
from transactions.services import create_transaction, get_organization_balance
from transactions.models import SourceTypeChoices

@pytest.mark.django_db
def test_balance_after_credit_and_debit(user, organization):
    # Add credit
    create_transaction(
        amount=Decimal('100.00'),
        organization=organization,
        source_type=SourceTypeChoices.EXTERNAL_BILLING,
        created_by=user,
        idempotency_key='credit-1',
        notes='Initial credit'
    )

    # Check balance
    balance = get_organization_balance(organization.id)
    assert balance['current_balance'] == Decimal('100.00')

    # Charge
    create_transaction(
        amount=Decimal('-25.00'),
        organization=organization,
        source_type=SourceTypeChoices.ADJUSTMENT,
        created_by=user,
        idempotency_key='debit-1',
        notes='Usage charge'
    )

    # Check final balance
    balance = get_organization_balance(organization.id)
    assert balance['current_balance'] == Decimal('75.00')
```

## Troubleshooting

### Problem: Balance query slow (> 500ms)

**Cause**: Missing database index or large transaction count.

**Solution**:
```sql
-- Verify index exists
EXPLAIN SELECT SUM(amount) FROM transactions WHERE organization_id = 'uuid';

-- Should use index: transactions_organization_timestamp_idx
-- If not, recreate index:
CREATE INDEX CONCURRENTLY transactions_organization_timestamp_idx
ON transactions(organization_id, timestamp DESC);
```

### Problem: Duplicate charges despite idempotency key

**Cause**: Idempotency key expired (UsageEvent keys are cleaned up after 7 days).

**Solution**:
- For Transactions: Keys never expire
- For UsageEvents: Query existing events before creating new ones

```python
# Check if event exists before creating
existing = UsageEvent.objects.filter(
    idempotency_key=key
).first()

if existing:
    return existing
else:
    return record_usage_event(..., idempotency_key=key)
```

### Problem: Cache shows wrong balance

**Cause**: Redis cache not invalidated after transaction write.

**Solution**:
- Check Django signals are enabled
- Verify Redis connection is working
- Clear cache manually: `python manage.py shell` → `from django.core.cache import cache; cache.clear()`

## Performance Considerations

- **Balance queries**: Cached in Redis (60s TTL), <10ms typical latency
- **Transaction writes**: ~50ms (includes DB write + cache invalidation)
- **Concurrent writes**: Fully supported (no locking required)
- **Scale**: Tested to 100k transactions per organization with <50ms balance query

## See Also

- [Architecture Decision Records](../adr/)
- [API Reference](../../kitty-specs/011-core-transactions-credits/contracts/transactions-api.yaml)
- [Quickstart Guide](../../kitty-specs/011-core-transactions-credits/quickstart.md)
- [src/transactions/README.md](../../src/transactions/README.md)
